import type { Env } from './types';
import { assertUserNotBanned, ensureTonBalanceColumn, getUserControls } from './user-controls';
import { getFinanceLimits } from './admin-finance-controls';
import { getStarsGramRate } from './stars-deposits';
import { ensureTonTransactionsTable } from './ton-transactions';
import { publishLiveActivity } from './live-activity';
import { createPublicClient, encodeFunctionData, getAddress, http, isAddress, keccak256, parseAbi } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';

const TON_NANO = 1_000_000_000;
const DEFAULT_TON_WITHDRAW_WALLET_ADDRESS = 'UQBM3omem7qMV3hoELAxiFEBRlldbRfRoHGKHobgdq0yUxvs';
const TONCENTER_BASE = 'https://toncenter.com/api/v2';
const BSC_CHAIN_ID = 56;
const BSC_USDT_CONTRACT = '0x55d398326f99059ff775485246999027b3197955' as const;
const BSC_USDT_DECIMALS = 18;
const BSC_USDT_MICRO_SCALE = 1_000_000;
const BSC_USDT_MICRO_TO_UNITS = 10n ** BigInt(BSC_USDT_DECIMALS - 6);
const EXPECTED_BSC_WITHDRAW_WALLET = '0x7D53be6a6C16e2C2C93e0bEd57596a3FB4f72c82';
const BSC_USDT_ABI = parseAbi([
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
]);

export type WithdrawalPayoutMethod = 'gram' | 'usdt-bep20';

type WithdrawRow = {
  id: string;
  user_id: string;
  wallet_address: string;
  amount_nano: number;
  payout_asset?: string | null;
  payout_network?: string | null;
  payout_amount_units?: string | null;
  payout_rate_usd?: number | null;
  status: string;
  tx_hash?: string | null;
  submission_ref?: string | null;
  error_message?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  rejected_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type TonWithdrawal = {
  id: string;
  userId: string;
  walletAddress: string;
  amountNano: number;
  amountTon: number;
  amountGram: number;
  payoutAsset?: 'GRAM' | 'USDT';
  payoutNetwork?: 'TON' | 'BEP20';
  payoutAmountUsdt?: string | null;
  payoutRateUsd?: number | null;
  status: string;
  txHash: string | null;
  submissionRef: string | null;
  errorMessage: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type PreparedPayout = {
  submissionRef: string;
  sourceWallet: string;
  sequence: number;
  txHash: string | null;
  sendOnce(): Promise<void>;
};

type OpenedWithdrawalWallet = {
  getSeqno(): Promise<number>;
  sendTransfer(args: {
    secretKey: Uint8Array;
    seqno: number;
    sendMode: number;
    messages: unknown[];
  }): Promise<void>;
};

type PayoutSnapshot = {
  asset: 'GRAM' | 'USDT';
  network: 'TON' | 'BEP20';
  amountUnits: string | null;
  rateUsd: number | null;
  amountUsdt: string | null;
};

export async function createTonWithdrawal(
  env: Env,
  userIdInput: unknown,
  amountTonInput: unknown,
  walletInput: unknown,
  payoutMethodInput?: unknown,
): Promise<TonWithdrawal> {
  const userId = cleanUserId(userIdInput);
  const payoutMethod = cleanPayoutMethod(payoutMethodInput, walletInput);
  const wallet = cleanWithdrawalWallet(walletInput, payoutMethod);
  const amountNano = tonToNano(amountTonInput);
  await assertUserNotBanned(env, userId);
  const limits = await getFinanceLimits(env);
  const minWithdrawNano = limits.minWithdrawNano;
  const maxWithdrawNano = limits.maxWithdrawNano;
  const dailyWithdrawLimitNano = limits.maxWithdrawNano;
  if (amountNano < minWithdrawNano) throw new Error(`Minimum withdrawal is ${formatGramAmount(minWithdrawNano)} Gram`);
  if (amountNano > maxWithdrawNano) throw new Error(`Maximum withdrawal is ${formatGramAmount(maxWithdrawNano)} Gram`);

  const controls = await getUserControls(env, userId);
  if (controls.tonBalanceNano < amountNano) throw new Error('Not enough Gram balance');

  await Promise.all([
    ensureTonWithdrawalsTable(env),
    ensureTonBalanceColumn(env),
    ensureTonTransactionsTable(env),
  ]);
  const payout = await buildPayoutSnapshot(amountNano, payoutMethod);

  const id = 'wd_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
  const transactionId = `finance_withdraw:${id}`;
  const description = payout.asset === 'USDT'
    ? `${payout.amountUsdt} USDT (BEP20) to ${shortWallet(wallet)}`
    : 'Withdrawal request to ' + shortWallet(wallet);
  const metadataJson = JSON.stringify({
    walletAddress: wallet,
    displayCurrency: 'Gram',
    payoutAsset: payout.asset,
    payoutNetwork: payout.network,
    payoutAmountUsdt: payout.amountUsdt,
    payoutRateUsd: payout.rateUsd,
  });
  const title = payout.asset === 'USDT' ? 'USDT withdrawal' : 'Gram withdrawal';

  const results = await env.DB.batch([
    env.DB.prepare(`INSERT INTO app_users (telegram_user_id, current_section, ton_balance_nano, last_seen_at, updated_at)
      VALUES (?, 'home', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(telegram_user_id) DO NOTHING`).bind(userId),
    env.DB.prepare(`UPDATE app_users
      SET ton_balance_nano = ton_balance_nano - ?, updated_at = CURRENT_TIMESTAMP
      WHERE telegram_user_id = ?
        AND ton_balance_nano >= ?
        AND (
          SELECT COALESCE(SUM(amount_nano), 0)
          FROM ton_withdrawals
          WHERE user_id = ?
            AND status != 'rejected'
            AND date(created_at) = date('now')
        ) + ? <= ?`)
      .bind(amountNano, userId, amountNano, userId, amountNano, dailyWithdrawLimitNano),
    env.DB.prepare(`INSERT INTO ton_withdrawals
      (id, user_id, wallet_address, amount_nano, payout_asset, payout_network, payout_amount_units, payout_rate_usd, status, created_at, updated_at)
      SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE changes() = 1`)
      .bind(id, userId, wallet, amountNano, payout.asset, payout.network, payout.amountUnits, payout.rateUsd),
    env.DB.prepare(`INSERT INTO ton_transactions
      (id, user_id, kind, title, description, amount_nano, balance_after_nano, status, reference_id, reference_type, metadata_json, created_at)
      SELECT ?, ?, 'withdraw', ?, ?, ?, a.ton_balance_nano, 'pending', ?, 'ton_withdrawal', ?, CURRENT_TIMESTAMP
      FROM app_users a
      JOIN ton_withdrawals w ON w.id = ? AND w.user_id = a.telegram_user_id
      WHERE a.telegram_user_id = ? AND w.status = 'pending'`)
      .bind(transactionId, userId, title, description, -amountNano, id, metadataJson, id, userId),
  ]);

  const reserved = Number(results[1]?.meta?.changes ?? 0) === 1;
  if (!reserved) {
    const [current, usedTodayNano] = await Promise.all([
      getUserControls(env, userId),
      getDailyWithdrawalUsedNano(env, userId),
    ]);
    if (current.tonBalanceNano < amountNano) throw new Error('Not enough Gram balance');
    const remainingNano = Math.max(0, dailyWithdrawLimitNano - usedTodayNano);
    throw new Error(`Daily withdrawal limit is ${formatGramAmount(dailyWithdrawLimitNano)} Gram. Remaining today: ${formatGramAmount(remainingNano)} Gram`);
  }

  const row = await env.DB.prepare('SELECT * FROM ton_withdrawals WHERE id = ?').bind(id).first<WithdrawRow>();
  if (!row) throw new Error('Withdrawal reservation failed');
  await publishLiveActivity(env, {
    kind: 'withdraw',
    userId,
    amountNano,
    key: id,
    createdAt: row.created_at,
  }).catch((error) => console.warn('withdrawal live activity failed', error));
  return rowToWithdrawal(row);
}

export async function listUserTonWithdrawals(env: Env, userIdInput: unknown): Promise<{ withdrawals: TonWithdrawal[] }> {
  await ensureTonWithdrawalsTable(env);
  const userId = cleanUserId(userIdInput);
  const rows = await env.DB.prepare('SELECT * FROM ton_withdrawals WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 30')
    .bind(userId)
    .all<WithdrawRow>();
  return { withdrawals: (rows.results ?? []).map(rowToWithdrawal) };
}

export async function listAdminTonWithdrawals(env: Env, statusInput: unknown = 'pending'): Promise<{ withdrawals: TonWithdrawal[] }> {
  await ensureTonWithdrawalsTable(env);
  const status = String(statusInput || 'pending').toLowerCase();
  const where = status === 'all' ? '' : 'WHERE status = ?';
  const sql = `SELECT * FROM ton_withdrawals ${where} ORDER BY datetime(created_at) DESC LIMIT 100`;
  const rows = where ? await env.DB.prepare(sql).bind(status).all<WithdrawRow>() : await env.DB.prepare(sql).all<WithdrawRow>();
  return { withdrawals: (rows.results ?? []).map(rowToWithdrawal) };
}

export async function approveTonWithdrawal(env: Env, withdrawalIdInput: unknown): Promise<TonWithdrawal> {
  await Promise.all([ensureTonWithdrawalsTable(env), ensureTonTransactionsTable(env)]);
  const id = cleanWithdrawalId(withdrawalIdInput);
  const row = await env.DB.prepare('SELECT * FROM ton_withdrawals WHERE id = ?').bind(id).first<WithdrawRow>();
  if (!row) throw new Error('Withdrawal not found');
  if (row.status === 'paid' || row.status === 'processing') return rowToWithdrawal(row);
  if (!['pending', 'failed'].includes(row.status)) throw new Error('Withdrawal cannot be approved from status ' + row.status);

  let prepared: PreparedPayout;
  try {
    prepared = await prepareWithdrawalPayout(env, row);
  } catch (error) {
    const message = cleanError(error);
    const metadataJson = withdrawalMetadata(row, { errorMessage: message });
    await env.DB.batch([
      env.DB.prepare(`UPDATE ton_withdrawals
        SET status='failed', error_message=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND status IN ('pending','failed')`).bind(message, id),
      env.DB.prepare(`UPDATE ton_transactions
        SET status='failed', title=?, description=?, metadata_json=?
        WHERE reference_type='ton_withdrawal' AND reference_id=? AND kind='withdraw' AND amount_nano<0
          AND EXISTS (SELECT 1 FROM ton_withdrawals WHERE id=? AND status='failed')`)
        .bind(withdrawalTitle(row), 'Payout preparation failed: ' + message, metadataJson, id, id),
    ]);
    throw new Error(message);
  }

  const processingMetadata = withdrawalMetadata(row, {
    sourceWallet: prepared.sourceWallet,
    submissionRef: prepared.submissionRef,
    sequence: prepared.sequence,
    txHash: prepared.txHash,
  });
  const locked = await env.DB.batch([
    env.DB.prepare(`UPDATE ton_withdrawals
      SET status='processing', submission_ref=?, tx_hash=COALESCE(tx_hash, ?), error_message=NULL,
          approved_at=COALESCE(approved_at,CURRENT_TIMESTAMP), updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND status IN ('pending','failed')`).bind(prepared.submissionRef, prepared.txHash, id),
    env.DB.prepare(`UPDATE ton_transactions
      SET status='processing', title=?, description='Single payout submission started', metadata_json=?
      WHERE reference_type='ton_withdrawal' AND reference_id=? AND kind='withdraw' AND amount_nano<0
        AND EXISTS (SELECT 1 FROM ton_withdrawals WHERE id=? AND status='processing' AND submission_ref=?)`)
      .bind(withdrawalTitle(row, 'submitting'), processingMetadata, id, id, prepared.submissionRef),
  ]);
  if ((locked[0]?.meta?.changes ?? 0) !== 1) {
    const current = await env.DB.prepare('SELECT * FROM ton_withdrawals WHERE id = ?').bind(id).first<WithdrawRow>();
    if (current) return rowToWithdrawal(current);
    throw new Error('Withdrawal is already being processed');
  }

  try {
    await prepared.sendOnce();
    const submittedMetadata = withdrawalMetadata(row, {
      sourceWallet: prepared.sourceWallet,
      submissionRef: prepared.submissionRef,
      sequence: prepared.sequence,
      txHash: prepared.txHash,
      sourceStatus: 'processing',
    });
    await env.DB.batch([
      env.DB.prepare(`UPDATE ton_withdrawals
        SET error_message=NULL, updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND status='processing' AND submission_ref=?`).bind(id, prepared.submissionRef),
      env.DB.prepare(`UPDATE ton_transactions
        SET status='processing', title=?, description='Submitted once; no automatic resend or polling', metadata_json=?
        WHERE reference_type='ton_withdrawal' AND reference_id=? AND kind='withdraw' AND amount_nano<0
          AND EXISTS (SELECT 1 FROM ton_withdrawals WHERE id=? AND status='processing' AND submission_ref=?)`)
        .bind(withdrawalTitle(row, 'submitted'), submittedMetadata, id, id, prepared.submissionRef),
    ]);
  } catch (error) {
    const message = cleanError(error);
    const safeMessage = `Submission state uncertain. Do not resend or refund automatically. ${message}`;
    const uncertainMetadata = withdrawalMetadata(row, {
      sourceWallet: prepared.sourceWallet,
      submissionRef: prepared.submissionRef,
      sequence: prepared.sequence,
      txHash: prepared.txHash,
      errorMessage: message,
      sourceStatus: 'processing',
    });
    await env.DB.batch([
      env.DB.prepare(`UPDATE ton_withdrawals
        SET error_message=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND status='processing' AND submission_ref=?`)
        .bind(cleanText(safeMessage, 240), id, prepared.submissionRef),
      env.DB.prepare(`UPDATE ton_transactions
        SET status='processing', title=?, description=?, metadata_json=?
        WHERE reference_type='ton_withdrawal' AND reference_id=? AND kind='withdraw' AND amount_nano<0
          AND EXISTS (SELECT 1 FROM ton_withdrawals WHERE id=? AND status='processing' AND submission_ref=?)`)
        .bind(withdrawalTitle(row, 'submission uncertain'), safeMessage, uncertainMetadata, id, id, prepared.submissionRef),
    ]);
    throw new Error(safeMessage);
  }

  const processing = await env.DB.prepare('SELECT * FROM ton_withdrawals WHERE id = ?').bind(id).first<WithdrawRow>();
  return rowToWithdrawal(processing ?? { ...row, status: 'processing', submission_ref: prepared.submissionRef, tx_hash: prepared.txHash });
}

export async function markTonWithdrawalPaid(env: Env, withdrawalIdInput: unknown): Promise<TonWithdrawal> {
  await Promise.all([ensureTonWithdrawalsTable(env), ensureTonTransactionsTable(env)]);
  const id = cleanWithdrawalId(withdrawalIdInput);
  const row = await env.DB.prepare('SELECT * FROM ton_withdrawals WHERE id = ?').bind(id).first<WithdrawRow>();
  if (!row) throw new Error('Withdrawal not found');
  if (row.status === 'paid') return rowToWithdrawal(row);
  if (row.status !== 'processing') throw new Error('Only a processing withdrawal can be marked paid');
  if (!row.submission_ref) throw new Error('Processing withdrawal has no submission reference');

  const metadataJson = withdrawalMetadata(row, {
    submissionRef: row.submission_ref,
    txHash: row.tx_hash || null,
    sourceStatus: 'paid',
  });
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE ton_withdrawals
      SET status='paid', paid_at=CURRENT_TIMESTAMP, error_message=NULL, updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND status='processing' AND submission_ref IS NOT NULL`).bind(id),
    env.DB.prepare(`UPDATE ton_transactions
      SET status='completed', title=?, description='Withdrawal completed', metadata_json=?
      WHERE reference_type='ton_withdrawal' AND reference_id=? AND kind='withdraw' AND amount_nano<0
        AND EXISTS (SELECT 1 FROM ton_withdrawals WHERE id=? AND status='paid')`)
      .bind(withdrawalTitle(row, 'paid'), metadataJson, id, id),
  ]);
  if ((results[0]?.meta?.changes ?? 0) !== 1) throw new Error('Withdrawal status changed before finalization');

  const paid = await env.DB.prepare('SELECT * FROM ton_withdrawals WHERE id = ?').bind(id).first<WithdrawRow>();
  return rowToWithdrawal(paid ?? { ...row, status: 'paid', paid_at: new Date().toISOString(), error_message: null });
}

export async function rejectTonWithdrawal(env: Env, withdrawalIdInput: unknown, reasonInput: unknown = ''): Promise<TonWithdrawal> {
  await Promise.all([ensureTonWithdrawalsTable(env), ensureTonTransactionsTable(env), ensureTonBalanceColumn(env)]);
  const id = cleanWithdrawalId(withdrawalIdInput);
  const row = await env.DB.prepare('SELECT * FROM ton_withdrawals WHERE id = ?').bind(id).first<WithdrawRow>();
  if (!row) throw new Error('Withdrawal not found');
  if (row.status === 'paid') throw new Error('Paid withdrawal cannot be rejected');
  if (row.status === 'rejected') return rowToWithdrawal(row);
  if (row.status === 'processing') throw new Error('Processing withdrawal cannot be rejected or refunded because submission may already have happened');

  const reason = cleanText(reasonInput, 180) || 'Rejected by admin';
  const amountNano = Math.abs(Number(row.amount_nano || 0));
  const refundTransactionId = `finance_withdraw_refund:${id}`;
  const originalMetadata = withdrawalMetadata(row, { reason, sourceStatus: 'rejected' });
  const refundMetadata = withdrawalMetadata(row, { reason, sourceStatus: 'rejected', refund: true });
  const titleBase = isUsdtBep20Row(row) ? 'USDT withdrawal' : 'Gram withdrawal';
  const results = await env.DB.batch([
    env.DB.prepare(`UPDATE ton_withdrawals
      SET status='rejecting', error_message=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND status IN ('pending','failed')`).bind(reason, id),
    env.DB.prepare(`INSERT INTO app_users (telegram_user_id,current_section,ton_balance_nano,last_seen_at,updated_at)
      VALUES (?,'home',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT(telegram_user_id) DO NOTHING`).bind(row.user_id),
    env.DB.prepare(`UPDATE app_users
      SET ton_balance_nano=ton_balance_nano+?, updated_at=CURRENT_TIMESTAMP
      WHERE telegram_user_id=? AND EXISTS (SELECT 1 FROM ton_withdrawals WHERE id=? AND user_id=? AND status='rejecting')`)
      .bind(amountNano, row.user_id, id, row.user_id),
    env.DB.prepare(`UPDATE ton_transactions
      SET status='rejected', title=?, description=?, metadata_json=?
      WHERE reference_type='ton_withdrawal' AND reference_id=? AND kind='withdraw' AND amount_nano<0
        AND EXISTS (SELECT 1 FROM ton_withdrawals WHERE id=? AND user_id=? AND status='rejecting')`)
      .bind(`${titleBase} rejected`, reason, originalMetadata, id, id, row.user_id),
    env.DB.prepare(`INSERT INTO ton_transactions
      (id,user_id,kind,title,description,amount_nano,balance_after_nano,status,reference_id,reference_type,metadata_json,created_at)
      SELECT ?,?,'withdraw',?,'Rejected withdrawal refunded',?,u.ton_balance_nano,'completed',?,'ton_withdrawal_refund',?,CURRENT_TIMESTAMP
      FROM app_users u
      WHERE u.telegram_user_id=?
        AND EXISTS (SELECT 1 FROM ton_withdrawals WHERE id=? AND user_id=? AND status='rejecting')
        AND NOT EXISTS (SELECT 1 FROM ton_transactions WHERE id=?)`)
      .bind(refundTransactionId, row.user_id, `${titleBase} refunded`, amountNano, id, refundMetadata, row.user_id, id, row.user_id, refundTransactionId),
    env.DB.prepare(`UPDATE ton_withdrawals
      SET status='rejected', rejected_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND user_id=? AND status='rejecting'`).bind(id, row.user_id),
  ]);
  if ((results[0]?.meta?.changes ?? 0) !== 1) {
    const current = await env.DB.prepare('SELECT * FROM ton_withdrawals WHERE id=?').bind(id).first<WithdrawRow>();
    if (current?.status === 'rejected') return rowToWithdrawal(current);
    throw new Error('Withdrawal cannot be rejected');
  }

  const updated = await env.DB.prepare('SELECT * FROM ton_withdrawals WHERE id = ?').bind(id).first<WithdrawRow>();
  return rowToWithdrawal(updated ?? { ...row, status: 'rejected' });
}

async function getDailyWithdrawalUsedNano(env: Env, userId: string): Promise<number> {
  const row = await env.DB.prepare(`SELECT COALESCE(SUM(amount_nano), 0) AS totalNano
    FROM ton_withdrawals
    WHERE user_id = ?
      AND status != 'rejected'
      AND date(created_at) = date('now')`)
    .bind(userId)
    .first<{ totalNano: number | string | null }>();
  return Math.max(0, Number(row?.totalNano || 0));
}

function formatGramAmount(nano: number): string {
  const amount = nano / TON_NANO;
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

async function buildPayoutSnapshot(amountNano: number, payoutMethod: WithdrawalPayoutMethod): Promise<PayoutSnapshot> {
  if (payoutMethod === 'gram') {
    return { asset: 'GRAM', network: 'TON', amountUnits: null, rateUsd: null, amountUsdt: null };
  }
  const rate = await getStarsGramRate();
  const gramUsd = Number(rate.gramUsd);
  if (!Number.isFinite(gramUsd) || gramUsd <= 0) throw new Error('GRAM/USD rate is unavailable');
  const amountGram = amountNano / TON_NANO;
  const payoutMicros = Math.floor((amountGram * gramUsd + Number.EPSILON) * BSC_USDT_MICRO_SCALE);
  if (!Number.isSafeInteger(payoutMicros) || payoutMicros <= 0) throw new Error('USDT payout amount is too small');
  const amountUnits = (BigInt(payoutMicros) * BSC_USDT_MICRO_TO_UNITS).toString();
  return {
    asset: 'USDT',
    network: 'BEP20',
    amountUnits,
    rateUsd: gramUsd,
    amountUsdt: formatUsdtMicros(payoutMicros),
  };
}

async function prepareWithdrawalPayout(env: Env, row: WithdrawRow): Promise<PreparedPayout> {
  return isUsdtBep20Row(row) ? prepareBscUsdtWithdrawalPayout(env, row) : prepareGramWithdrawalPayout(env, row);
}

async function prepareGramWithdrawalPayout(env: Env, row: WithdrawRow): Promise<PreparedPayout> {
  const mnemonic = withdrawalMnemonic(env);
  const configuredAddress = envValue(env, 'TON_WITHDRAW_WALLET_ADDRESS') || DEFAULT_TON_WITHDRAW_WALLET_ADDRESS;
  const { mnemonicToPrivateKey, internal, SendMode, TonClient } = await loadTonSdk();
  const client = new TonClient({
    endpoint: `${TONCENTER_BASE}/jsonRPC`,
    apiKey: envValue(env, 'TONCENTER_API_KEY') || undefined,
  });
  const keyPair = await mnemonicToPrivateKey(mnemonic);
  const wallet = await createWithdrawalWalletForAddress(configuredAddress, keyPair.publicKey);
  const openedWallet = client.open(wallet as never) as unknown as OpenedWithdrawalWallet;
  const seqno = await openedWallet.getSeqno();
  const amountNano = Math.floor(Number(row.amount_nano || 0));
  if (!Number.isSafeInteger(amountNano) || amountNano <= 0) throw new Error('Invalid withdrawal amount');
  const sourceWallet = wallet.address.toString({ bounceable: false });
  const submissionRef = await makeSubmissionRef(row, sourceWallet, seqno, 'gram');
  const message = internal({
    to: row.wallet_address,
    value: BigInt(amountNano),
    body: 'Vexa Gram withdrawal ' + row.id,
    bounce: false,
  });

  return {
    submissionRef,
    sourceWallet,
    sequence: seqno,
    txHash: null,
    sendOnce: () => openedWallet.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      sendMode: SendMode.PAY_GAS_SEPARATELY,
      messages: [message],
    }),
  };
}

async function prepareBscUsdtWithdrawalPayout(env: Env, row: WithdrawRow): Promise<PreparedPayout> {
  const mnemonic = bscWithdrawalMnemonic(env);
  const rpcUrl = envValue(env, 'GETBLOCK_BSC_RPC_URL');
  if (!rpcUrl) throw new Error('GETBLOCK_BSC_RPC_URL is not configured');
  const amountUnits = cleanPositiveBigInt(row.payout_amount_units, 'USDT payout amount');
  const recipient = cleanEvmAddress(row.wallet_address);
  const account = mnemonicToAccount(mnemonic);
  if (account.address.toLowerCase() !== EXPECTED_BSC_WITHDRAW_WALLET.toLowerCase()) {
    throw new Error('USDT_BSC_WITHDRAW_MNEMONIC does not match the configured withdrawal wallet');
  }
  const client = createPublicClient({ chain: bsc, transport: http(rpcUrl, { timeout: 10_000 }) });
  const chainId = await client.getChainId();
  if (chainId !== BSC_CHAIN_ID) throw new Error(`BSC RPC returned chain ${chainId}, expected ${BSC_CHAIN_ID}`);

  const [tokenBalance, nativeBalance, nonce, gasPrice] = await Promise.all([
    client.readContract({
      address: BSC_USDT_CONTRACT,
      abi: BSC_USDT_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    }),
    client.getBalance({ address: account.address }),
    client.getTransactionCount({ address: account.address, blockTag: 'pending' }),
    client.getGasPrice(),
  ]);
  if (tokenBalance < amountUnits) throw new Error('USDT withdrawal wallet does not have enough USDT');

  const data = encodeFunctionData({
    abi: BSC_USDT_ABI,
    functionName: 'transfer',
    args: [recipient, amountUnits],
  });
  const estimatedGas = await client.estimateGas({ account: account.address, to: BSC_USDT_CONTRACT, data, value: 0n });
  const gas = (estimatedGas * 120n + 99n) / 100n;
  const requiredGasWei = gas * gasPrice;
  if (nativeBalance < requiredGasWei) throw new Error('USDT withdrawal wallet does not have enough BNB for gas');

  const signedTransaction = await account.signTransaction({
    chainId: BSC_CHAIN_ID,
    type: 'legacy',
    to: BSC_USDT_CONTRACT,
    data,
    value: 0n,
    gas,
    gasPrice,
    nonce,
  });
  const txHash = keccak256(signedTransaction);
  const submissionRef = `usdt-bep20:${txHash}`;

  return {
    submissionRef,
    sourceWallet: account.address,
    sequence: nonce,
    txHash,
    sendOnce: async () => {
      const sentHash = await client.sendRawTransaction({ serializedTransaction: signedTransaction });
      if (sentHash.toLowerCase() !== txHash.toLowerCase()) throw new Error('BSC RPC returned an unexpected transaction hash');
    },
  };
}

async function makeSubmissionRef(row: WithdrawRow, sourceWallet: string, sequence: number, method: string): Promise<string> {
  const input = `${method}|${row.id}|${row.user_id}|${row.wallet_address}|${row.amount_nano}|${sourceWallet}|${sequence}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const hash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `gram-submit:${hash}`;
}

type TonWalletContract = {
  address: { toString(options?: { bounceable?: boolean }): string };
};

async function createWithdrawalWalletForAddress(configuredAddress: string, publicKey: unknown): Promise<TonWalletContract> {
  const tonSdk = await loadTonSdk();
  const candidates = [
    createWalletCandidate(tonSdk.WalletContractV5R1, 'v5r1', publicKey),
    createWalletCandidate(tonSdk.WalletContractV4, 'v4r2', publicKey),
    createWalletCandidate(tonSdk.WalletContractV3R2, 'v3r2', publicKey),
    createWalletCandidate(tonSdk.WalletContractV3R1, 'v3r1', publicKey),
    createWalletCandidate(tonSdk.WalletContractV2R2, 'v2r2', publicKey),
    createWalletCandidate(tonSdk.WalletContractV2R1, 'v2r1', publicKey),
  ].filter((candidate): candidate is { version: string; wallet: TonWalletContract } => Boolean(candidate));

  for (const candidate of candidates) {
    if (await walletMatchesAddress(configuredAddress, candidate.wallet)) return candidate.wallet;
  }

  const derivedAddresses = candidates.map((candidate) => `${candidate.version}: ${candidate.wallet.address.toString({ bounceable: false })}`).join('; ');
  throw new Error(`TON_WITHDRAW_WALLET_ADDRESS does not match TON_WITHDRAW_MNEMONIC wallet. Derived wallets: ${derivedAddresses}`);
}

function createWalletCandidate(contract: unknown, version: string, publicKey: unknown): { version: string; wallet: TonWalletContract } | null {
  if (!contract || typeof (contract as { create?: unknown }).create !== 'function') return null;
  const wallet = (contract as { create(options: { workchain: number; publicKey: unknown }): TonWalletContract }).create({ workchain: 0, publicKey });
  return { version, wallet };
}

async function walletMatchesAddress(configuredAddress: string, wallet: TonWalletContract): Promise<boolean> {
  return (await sameTonAddress(configuredAddress, wallet.address.toString())) || (await sameTonAddress(configuredAddress, wallet.address.toString({ bounceable: false })));
}

async function ensureTonWithdrawalsTable(env: Env): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS ton_withdrawals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    amount_nano INTEGER NOT NULL,
    payout_asset TEXT NOT NULL DEFAULT 'GRAM',
    payout_network TEXT NOT NULL DEFAULT 'TON',
    payout_amount_units TEXT,
    payout_rate_usd REAL,
    status TEXT NOT NULL DEFAULT 'pending',
    tx_hash TEXT,
    submission_ref TEXT,
    error_message TEXT,
    approved_at TEXT,
    paid_at TEXT,
    rejected_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare("ALTER TABLE ton_withdrawals ADD COLUMN payout_asset TEXT NOT NULL DEFAULT 'GRAM'").run().catch(() => undefined);
  await env.DB.prepare("ALTER TABLE ton_withdrawals ADD COLUMN payout_network TEXT NOT NULL DEFAULT 'TON'").run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE ton_withdrawals ADD COLUMN payout_amount_units TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE ton_withdrawals ADD COLUMN payout_rate_usd REAL').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE ton_withdrawals ADD COLUMN tx_hash TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE ton_withdrawals ADD COLUMN submission_ref TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE ton_withdrawals ADD COLUMN error_message TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE ton_withdrawals ADD COLUMN approved_at TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE ton_withdrawals ADD COLUMN paid_at TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE ton_withdrawals ADD COLUMN rejected_at TEXT').run().catch(() => undefined);
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_ton_withdrawals_user ON ton_withdrawals(user_id, created_at)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_ton_withdrawals_status ON ton_withdrawals(status, created_at)').run();
  await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_ton_withdrawals_tx_hash ON ton_withdrawals(tx_hash) WHERE tx_hash IS NOT NULL').run();
  await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_ton_withdrawals_submission_ref ON ton_withdrawals(submission_ref) WHERE submission_ref IS NOT NULL').run();
}

function rowToWithdrawal(row: WithdrawRow): TonWithdrawal {
  const amount = Number(row.amount_nano || 0) / TON_NANO;
  const usdt = isUsdtBep20Row(row);
  return {
    id: row.id,
    userId: row.user_id,
    walletAddress: row.wallet_address,
    amountNano: Number(row.amount_nano || 0),
    amountTon: amount,
    amountGram: amount,
    payoutAsset: usdt ? 'USDT' : 'GRAM',
    payoutNetwork: usdt ? 'BEP20' : 'TON',
    payoutAmountUsdt: usdt ? formatUsdtUnits(row.payout_amount_units) : null,
    payoutRateUsd: usdt && Number.isFinite(Number(row.payout_rate_usd)) ? Number(row.payout_rate_usd) : null,
    status: row.status,
    txHash: row.tx_hash || null,
    submissionRef: row.submission_ref || null,
    errorMessage: row.error_message || null,
    approvedAt: row.approved_at || null,
    paidAt: row.paid_at || null,
    rejectedAt: row.rejected_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fallbackRow(id: string, userId: string, wallet: string, amountNano: number, status: string): WithdrawRow {
  return {
    id,
    user_id: userId,
    wallet_address: wallet,
    amount_nano: amountNano,
    payout_asset: 'GRAM',
    payout_network: 'TON',
    payout_amount_units: null,
    payout_rate_usd: null,
    status,
    tx_hash: null,
    submission_ref: null,
    error_message: null,
    approved_at: null,
    paid_at: null,
    rejected_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function tonToNano(value: unknown): number {
  const raw = String(value ?? '').replace(',', '.').trim();
  if (!raw) throw new Error('Enter withdrawal amount');
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) throw new Error('Enter a valid Gram amount');
  const nano = Math.floor(n * TON_NANO);
  if (!Number.isSafeInteger(nano) || nano < 1) throw new Error('Enter a valid Gram amount');
  if (nano > 10_000_000 * TON_NANO) throw new Error('Withdrawal amount is too large');
  return nano;
}

function cleanPayoutMethod(value: unknown, walletInput: unknown): WithdrawalPayoutMethod {
  const method = String(value ?? '').trim().toLowerCase();
  if (!method) return isAddress(String(walletInput ?? '').trim()) ? 'usdt-bep20' : 'gram';
  if (method === 'gram') return 'gram';
  if (method === 'usdt-bep20') return 'usdt-bep20';
  throw new Error('Unsupported withdrawal method');
}

function cleanWithdrawalWallet(value: unknown, method: WithdrawalPayoutMethod): string {
  if (method === 'usdt-bep20') return cleanEvmAddress(value);
  const wallet = String(value ?? '').trim().slice(0, 120);
  if (!wallet) throw new Error('Enter your Gram wallet address');
  if (!/^[A-Za-z0-9_\-:]{24,120}$/.test(wallet)) throw new Error('Enter a valid Gram wallet address');
  return wallet;
}

function cleanEvmAddress(value: unknown): `0x${string}` {
  const wallet = String(value ?? '').trim();
  if (!isAddress(wallet)) throw new Error('Enter a valid BEP20 wallet address');
  return getAddress(wallet);
}

function cleanPositiveBigInt(value: unknown, label: string): bigint {
  const text = String(value ?? '').trim();
  if (!/^[0-9]+$/.test(text)) throw new Error(`Invalid ${label}`);
  const amount = BigInt(text);
  if (amount <= 0n) throw new Error(`Invalid ${label}`);
  return amount;
}

function shortWallet(wallet: string): string {
  return wallet.length > 14 ? wallet.slice(0, 6) + '...' + wallet.slice(-6) : wallet;
}

function cleanUserId(value: unknown): string {
  const id = String(value ?? '').replace(/[^0-9]/g, '').trim().slice(0, 24);
  if (!id) throw new Error('Missing Telegram user');
  return id;
}

function cleanWithdrawalId(value: unknown): string {
  const id = String(value ?? '').replace(/[^0-9A-Za-z_-]/g, '').trim().slice(0, 80);
  if (!id) throw new Error('Invalid withdrawal id');
  return id;
}

function cleanText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function cleanError(error: unknown): string {
  return error instanceof Error ? cleanText(error.message, 240) || 'Withdrawal payout failed' : 'Withdrawal payout failed';
}

function envValue(env: Env, key: string): string {
  return String((env as unknown as Record<string, unknown>)[key] || '').trim();
}

function withdrawalMnemonic(env: Env): string[] {
  const value = envValue(env, 'TON_WITHDRAW_MNEMONIC');
  if (!value) throw new Error('TON_WITHDRAW_MNEMONIC is not configured');
  const words = value.replace(/[\n,]+/g, ' ').split(/\s+/).map((word) => word.trim()).filter(Boolean);
  if (words.length !== 24) throw new Error('TON_WITHDRAW_MNEMONIC must contain 24 words');
  return words;
}

function bscWithdrawalMnemonic(env: Env): string {
  const value = envValue(env, 'USDT_BSC_WITHDRAW_MNEMONIC');
  if (!value) throw new Error('USDT_BSC_WITHDRAW_MNEMONIC is not configured');
  const words = value.replace(/[\n,]+/g, ' ').split(/\s+/).map((word) => word.trim()).filter(Boolean);
  if (![12, 15, 18, 21, 24].includes(words.length)) throw new Error('USDT_BSC_WITHDRAW_MNEMONIC is invalid');
  return words.join(' ');
}

function isUsdtBep20Row(row: WithdrawRow): boolean {
  return String(row.payout_asset || 'GRAM').toUpperCase() === 'USDT' && String(row.payout_network || 'TON').toUpperCase() === 'BEP20';
}

function formatUsdtMicros(micros: number): string {
  const whole = Math.floor(micros / BSC_USDT_MICRO_SCALE);
  const fraction = String(micros % BSC_USDT_MICRO_SCALE).padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

function formatUsdtUnits(value: unknown): string | null {
  try {
    const units = cleanPositiveBigInt(value, 'USDT payout amount');
    const micros = units / BSC_USDT_MICRO_TO_UNITS;
    const whole = micros / BigInt(BSC_USDT_MICRO_SCALE);
    const fraction = String(micros % BigInt(BSC_USDT_MICRO_SCALE)).padStart(6, '0').replace(/0+$/, '');
    return fraction ? `${whole}.${fraction}` : String(whole);
  } catch {
    return null;
  }
}

function withdrawalTitle(row: WithdrawRow, suffix = ''): string {
  const base = isUsdtBep20Row(row) ? 'USDT withdrawal' : 'Gram withdrawal';
  return suffix ? `${base} ${suffix}` : base;
}

function withdrawalMetadata(row: WithdrawRow, extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    walletAddress: row.wallet_address,
    displayCurrency: 'Gram',
    payoutAsset: isUsdtBep20Row(row) ? 'USDT' : 'GRAM',
    payoutNetwork: isUsdtBep20Row(row) ? 'BEP20' : 'TON',
    payoutAmountUsdt: isUsdtBep20Row(row) ? formatUsdtUnits(row.payout_amount_units) : null,
    payoutRateUsd: row.payout_rate_usd ?? null,
    ...extra,
  }).slice(0, 2000);
}

async function sameTonAddress(left: string, right: string): Promise<boolean> {
  try {
    const { Address } = await loadTonSdk();
    return Address.parse(left).equals(Address.parse(right));
  } catch {
    return left.trim().toLowerCase() === right.trim().toLowerCase();
  }
}

async function loadTonSdk(): Promise<{
  mnemonicToPrivateKey: typeof import('@ton/crypto').mnemonicToPrivateKey;
  Address: typeof import('@ton/ton').Address;
  internal: typeof import('@ton/ton').internal;
  SendMode: typeof import('@ton/ton').SendMode;
  TonClient: typeof import('@ton/ton').TonClient;
  WalletContractV5R1?: unknown;
  WalletContractV4: typeof import('@ton/ton').WalletContractV4;
  WalletContractV3R2?: unknown;
  WalletContractV3R1?: unknown;
  WalletContractV2R2?: unknown;
  WalletContractV2R1?: unknown;
}> {
  ensureWindowCompatForTonSdk();
  const [cryptoSdk, tonSdk] = await Promise.all([import('@ton/crypto'), import('@ton/ton')]);
  return {
    mnemonicToPrivateKey: cryptoSdk.mnemonicToPrivateKey,
    Address: tonSdk.Address,
    internal: tonSdk.internal,
    SendMode: tonSdk.SendMode,
    TonClient: tonSdk.TonClient,
    WalletContractV5R1: (tonSdk as unknown as { WalletContractV5R1?: unknown }).WalletContractV5R1,
    WalletContractV4: tonSdk.WalletContractV4,
    WalletContractV3R2: (tonSdk as unknown as { WalletContractV3R2?: unknown }).WalletContractV3R2,
    WalletContractV3R1: (tonSdk as unknown as { WalletContractV3R1?: unknown }).WalletContractV3R1,
    WalletContractV2R2: (tonSdk as unknown as { WalletContractV2R2?: unknown }).WalletContractV2R2,
    WalletContractV2R1: (tonSdk as unknown as { WalletContractV2R1?: unknown }).WalletContractV2R1,
  };
}

function ensureWindowCompatForTonSdk(): void {
  if (typeof globalThis.window === 'undefined') {
    Object.defineProperty(globalThis, 'window', { value: globalThis, configurable: true });
  }
}
