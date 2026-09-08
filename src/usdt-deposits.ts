import type { Env } from './types';
import { assertUserNotBanned } from './user-controls';
import { getFinanceLimits, formatTonAmount } from './admin-finance-controls';
import { getStarsGramRate } from './stars-deposits';
import { ensureTonTransactionsTable } from './ton-transactions';
import { publishLiveActivity } from './live-activity';
import { awardDepositXp } from './xp-rewards';

type UsdtNetwork = 'bep20' | 'trc20';

type NetworkConfig = {
  id: UsdtNetwork;
  label: 'BEP20' | 'TRC20';
  chainId: string;
  rpcUrl: (env: Env) => string;
  treasuryAddress: (env: Env) => string;
  tokenContract: string;
  decimals: 6 | 18;
};

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const LOG_BLOCK_CHUNK = 4_000;
const MAX_OFFSET_MICROS = 9_999;
const CREATE_ATTEMPTS = 12;
const RPC_TIMEOUT_MS = 7_000;

// Binance-Peg USDT/BSC-USD token used for USDT transfers on BNB Smart Chain.
const BSC_USDT_CONTRACT = '0x55d398326f99059ff775485246999027b3197955';
// Tether USDt TRC20 contract, converted from the official Base58 address
// TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t to its 20-byte JSON-RPC form.
const TRON_USDT_CONTRACT = '0xa614f803b6fd780986a42c78ec9c7f77e6ded13c';

const NETWORKS: Record<UsdtNetwork, NetworkConfig> = {
  bep20: {
    id: 'bep20',
    label: 'BEP20',
    chainId: '0x38',
    rpcUrl: (env) => env.GETBLOCK_BSC_RPC_URL || '',
    treasuryAddress: (env) => env.USDT_BSC_TREASURY_ADDRESS || '',
    tokenContract: BSC_USDT_CONTRACT,
    decimals: 18,
  },
  trc20: {
    id: 'trc20',
    label: 'TRC20',
    chainId: '0x2b6653dc',
    rpcUrl: (env) => env.GETBLOCK_TRON_RPC_URL || '',
    treasuryAddress: (env) => env.USDT_TRON_TREASURY_ADDRESS || '',
    tokenContract: TRON_USDT_CONTRACT,
    decimals: 6,
  },
};

type UsdtDepositRow = {
  id: string;
  user_id: string;
  network: string;
  requested_amount_usdt: string;
  expected_amount_usdt: string;
  expected_amount_micros: number;
  expected_units: string;
  amount_nano: number;
  gram_usd: number;
  treasury_address: string;
  start_block: number;
  last_scanned_block: number;
  status: string;
  tx_hash: string | null;
  claim_token: string | null;
  credited_at: string | null;
  created_at: string;
  updated_at: string;
};

type RpcResponse<T> = {
  result?: T;
  error?: { code?: number; message?: string; data?: unknown };
};

type RpcBlock = {
  number?: string | null;
};

type RpcLog = {
  address?: string;
  topics?: string[];
  data?: string;
  blockNumber?: string;
  transactionHash?: string;
  logIndex?: string;
  removed?: boolean;
};

export type UsdtDeposit = {
  id: string;
  userId: string;
  network: UsdtNetwork;
  networkLabel: string;
  requestedAmountUsdt: string;
  expectedAmountUsdt: string;
  amountNano: number;
  gramUsd: number;
  status: string;
  txHash: string | null;
  treasuryAddress: string;
  tokenContract: string;
  createdAt: string;
  updatedAt: string;
};

export async function createUsdtDeposit(
  env: Env,
  userIdInput: unknown,
  networkInput: unknown,
  amountInput: unknown,
): Promise<UsdtDeposit> {
  const userId = cleanUserId(userIdInput);
  const config = networkConfig(networkInput);
  const requestedMicros = normalizeRequestedUsdtMicros(amountInput);
  await assertUserNotBanned(env, userId);
  await Promise.all([ensureUsdtDepositsTable(env), ensureTonTransactionsTable(env)]);

  const rpcUrl = cleanRpcUrl(config.rpcUrl(env), config.label);
  const treasuryAddress = cleanTreasuryAddress(config.treasuryAddress(env), config.id);
  await rpcAddress(treasuryAddress, config.id);
  await assertChainId(rpcUrl, config);

  const [latestBlock, rate, limits] = await Promise.all([
    latestBlockNumber(rpcUrl),
    getStarsGramRate(),
    getFinanceLimits(env),
  ]);
  const requestedAmountUsdt = compactUsdt(requestedMicros);

  for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt += 1) {
    const expectedMicros = await nextExpectedMicros(env, config.id, requestedMicros);
    if (expectedMicros > requestedMicros + MAX_OFFSET_MICROS) {
      throw new Error('Too many active values for this amount. Choose a USDT amount at least 0.01 different.');
    }

    const expectedAmountUsdt = microsToUsdt(expectedMicros);
    const amountNano = usdtMicrosToGramNano(expectedMicros, rate.gramUsd);
    if (amountNano < limits.minDepositNano) throw new Error(`Minimum deposit is ${formatTonAmount(limits.minDepositNano)} Gram`);
    if (limits.maxDepositNano && amountNano > limits.maxDepositNano) throw new Error(`Maximum deposit is ${formatTonAmount(limits.maxDepositNano)} Gram`);

    const expectedUnits = tokenUnits(expectedMicros, config.decimals);
    const depositId = 'usdt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 20);
    const transactionId = `finance_usdtdep:${depositId}`;
    const metadataJson = JSON.stringify({
      asset: 'USDT',
      network: config.id,
      networkLabel: config.label,
      requestedAmountUsdt,
      expectedAmountUsdt,
      gramUsd: rate.gramUsd,
      displayCurrency: 'Gram',
    });

    try {
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO usdt_deposits
          (id,user_id,network,requested_amount_usdt,expected_amount_usdt,expected_amount_micros,expected_units,amount_nano,gram_usd,treasury_address,start_block,last_scanned_block,status,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'pending',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
          .bind(
            depositId,
            userId,
            config.id,
            requestedAmountUsdt,
            expectedAmountUsdt,
            expectedMicros,
            expectedUnits,
            amountNano,
            rate.gramUsd,
            treasuryAddress,
            latestBlock,
            latestBlock - 1,
          ),
        env.DB.prepare(`INSERT INTO ton_transactions
          (id,user_id,kind,title,description,amount_nano,balance_after_nano,status,reference_id,reference_type,metadata_json,created_at)
          VALUES (?,?,'deposit','USDT deposit',?,?,COALESCE((SELECT ton_balance_nano FROM app_users WHERE telegram_user_id=?),0),'pending',?,'usdt_deposit',?,CURRENT_TIMESTAMP)`)
          .bind(transactionId, userId, `${expectedAmountUsdt} USDT (${config.label})`, amountNano, userId, depositId, metadataJson),
      ]);
    } catch (error) {
      if (isExpectedAmountCollision(error)) continue;
      throw error;
    }

    const row = await env.DB.prepare('SELECT * FROM usdt_deposits WHERE id = ? AND user_id = ?')
      .bind(depositId, userId)
      .first<UsdtDepositRow>();
    if (!row) throw new Error('USDT deposit creation failed');
    return rowToDeposit(row);
  }

  throw new Error('Could not reserve a unique USDT payment amount. Try again.');
}

export async function getUsdtDeposit(env: Env, userIdInput: unknown, depositIdInput: unknown): Promise<UsdtDeposit | null> {
  const userId = cleanUserId(userIdInput);
  const depositId = cleanDepositId(depositIdInput);
  await ensureUsdtDepositsTable(env);
  const row = await env.DB.prepare('SELECT * FROM usdt_deposits WHERE id = ? AND user_id = ?')
    .bind(depositId, userId)
    .first<UsdtDepositRow>();
  return row ? rowToDeposit(row) : null;
}

export async function verifyUsdtDeposit(env: Env, userIdInput: unknown, depositIdInput: unknown): Promise<UsdtDeposit> {
  const userId = cleanUserId(userIdInput);
  const depositId = cleanDepositId(depositIdInput);
  await Promise.all([ensureUsdtDepositsTable(env), ensureTonTransactionsTable(env)]);

  const row = await env.DB.prepare('SELECT * FROM usdt_deposits WHERE id = ? AND user_id = ?')
    .bind(depositId, userId)
    .first<UsdtDepositRow>();
  if (!row) throw new Error('USDT deposit not found');
  if (row.status === 'completed') return rowToDeposit(row);
  if (row.status !== 'pending') return rowToDeposit(row);

  const config = networkConfig(row.network);
  const rpcUrl = cleanRpcUrl(config.rpcUrl(env), config.label);
  const configuredTreasury = cleanTreasuryAddress(config.treasuryAddress(env), config.id);
  const treasuryRpcAddress = await rpcAddress(row.treasury_address, config.id);
  const configuredRpcAddress = await rpcAddress(configuredTreasury, config.id);
  if (treasuryRpcAddress !== configuredRpcAddress) {
    throw new Error(`${config.label} treasury address changed after this deposit was created`);
  }
  await assertChainId(rpcUrl, config);

  const fromBlock = Math.max(row.start_block, row.last_scanned_block + 1);
  const finalizedBlock = await finalizedBlockNumber(rpcUrl, config);
  let match: RpcLog | null = null;
  let scannedThrough: number | null = null;

  if (finalizedBlock !== null) {
    if (finalizedBlock >= fromBlock) {
      match = await findTransfer(rpcUrl, config, treasuryRpcAddress, row.expected_units, fromBlock, finalizedBlock);
      scannedThrough = finalizedBlock;
    }
  } else {
    match = await findTransferToFinalizedTag(rpcUrl, config, treasuryRpcAddress, row.expected_units, fromBlock);
  }

  if (!match) {
    if (scannedThrough !== null) {
      await env.DB.prepare(`UPDATE usdt_deposits
        SET last_scanned_block=MAX(last_scanned_block, ?), updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND user_id=? AND status='pending'`)
        .bind(scannedThrough, row.id, row.user_id)
        .run();
    }
    const pending = await env.DB.prepare('SELECT * FROM usdt_deposits WHERE id = ? AND user_id = ?')
      .bind(row.id, row.user_id)
      .first<UsdtDepositRow>();
    return rowToDeposit(pending ?? row);
  }

  const txHash = cleanTxHash(match.transactionHash);
  const used = await env.DB.prepare('SELECT id FROM usdt_deposits WHERE network = ? AND tx_hash = ? LIMIT 1')
    .bind(config.id, txHash)
    .first<{ id: string }>();
  if (used && used.id !== row.id) throw new Error('Transaction already used');

  const claim = 'credit_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  const metadataJson = JSON.stringify({
    asset: 'USDT',
    network: config.id,
    networkLabel: config.label,
    expectedAmountUsdt: row.expected_amount_usdt,
    gramUsd: row.gram_usd,
    txHash,
    displayCurrency: 'Gram',
  });
  const matchedBlock = hexNumber(match.blockNumber);
  const cursorBlock = scannedThrough === null ? matchedBlock : scannedThrough;

  let results;
  try {
    results = await env.DB.batch([
      env.DB.prepare(`UPDATE usdt_deposits
        SET status='crediting', tx_hash=?, claim_token=?, last_scanned_block=MAX(last_scanned_block, ?), updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND user_id=? AND status='pending' AND claim_token IS NULL`)
        .bind(txHash, claim, cursorBlock, row.id, row.user_id),
      env.DB.prepare(`INSERT INTO app_users (telegram_user_id,current_section,ton_balance_nano,last_seen_at,updated_at)
        VALUES (?,'home',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        ON CONFLICT(telegram_user_id) DO NOTHING`).bind(row.user_id),
      env.DB.prepare(`UPDATE app_users
        SET ton_balance_nano=ton_balance_nano+?, updated_at=CURRENT_TIMESTAMP
        WHERE telegram_user_id=?
          AND EXISTS (SELECT 1 FROM usdt_deposits WHERE id=? AND user_id=? AND status='crediting' AND claim_token=?)
          AND EXISTS (SELECT 1 FROM ton_transactions WHERE user_id=? AND kind='deposit' AND reference_type='usdt_deposit' AND reference_id=? AND status!='completed')`)
        .bind(row.amount_nano, row.user_id, row.id, row.user_id, claim, row.user_id, row.id),
      env.DB.prepare(`UPDATE ton_transactions
        SET status='completed', amount_nano=?, balance_after_nano=COALESCE((SELECT ton_balance_nano FROM app_users WHERE telegram_user_id=?),balance_after_nano),
            title='USDT deposit', description=?, metadata_json=?
        WHERE user_id=? AND kind='deposit' AND reference_type='usdt_deposit' AND reference_id=?
          AND EXISTS (SELECT 1 FROM usdt_deposits WHERE id=? AND user_id=? AND status='crediting' AND claim_token=?)`)
        .bind(row.amount_nano, row.user_id, `${row.expected_amount_usdt} USDT (${config.label})`, metadataJson, row.user_id, row.id, row.id, row.user_id, claim),
      env.DB.prepare(`UPDATE usdt_deposits
        SET status='completed', credited_at=CURRENT_TIMESTAMP, claim_token=NULL, updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND user_id=? AND status='crediting' AND claim_token=?`)
        .bind(row.id, row.user_id, claim),
    ]);
  } catch (error) {
    if (isTxHashCollision(error)) throw new Error('Transaction already used');
    throw error;
  }

  const applied = Number(results[0]?.meta?.changes || 0) > 0;
  const completed = await env.DB.prepare('SELECT * FROM usdt_deposits WHERE id = ? AND user_id = ?')
    .bind(row.id, row.user_id)
    .first<UsdtDepositRow>();
  const finalRow = completed ?? row;

  if (applied && finalRow.status === 'completed') {
    await publishLiveActivity(env, {
      kind: 'deposit',
      userId: row.user_id,
      amountNano: row.amount_nano,
      key: row.id,
      createdAt: finalRow.updated_at || new Date().toISOString(),
    }).catch((error) => console.warn('USDT deposit live activity failed', error));
    await awardDepositXp(env, row.user_id, 'usdt_deposit', row.id)
      .catch((error) => console.warn('USDT deposit XP award failed', error));
  }

  return rowToDeposit(finalRow);
}

async function findTransfer(
  rpcUrl: string,
  config: NetworkConfig,
  treasuryRpcAddress: string,
  expectedUnits: string,
  fromBlock: number,
  toBlock: number,
): Promise<RpcLog | null> {
  const destinationTopic = addressTopic(treasuryRpcAddress);
  const expected = BigInt(expectedUnits);
  for (let start = fromBlock; start <= toBlock; start += LOG_BLOCK_CHUNK) {
    const end = Math.min(toBlock, start + LOG_BLOCK_CHUNK - 1);
    const logs = await getTransferLogs(rpcUrl, config, destinationTopic, blockHex(start), blockHex(end));
    const match = matchingTransfer(logs, config, destinationTopic, expected);
    if (match) return match;
  }
  return null;
}

async function findTransferToFinalizedTag(
  rpcUrl: string,
  config: NetworkConfig,
  treasuryRpcAddress: string,
  expectedUnits: string,
  fromBlock: number,
): Promise<RpcLog | null> {
  const destinationTopic = addressTopic(treasuryRpcAddress);
  const expected = BigInt(expectedUnits);
  try {
    const logs = await getTransferLogs(rpcUrl, config, destinationTopic, blockHex(fromBlock), 'finalized');
    return matchingTransfer(logs, config, destinationTopic, expected);
  } catch (error) {
    if (config.id === 'trc20') {
      throw new Error('TRC20 finalized log queries are not available on the configured RPC endpoint');
    }
    throw error;
  }
}

async function getTransferLogs(
  rpcUrl: string,
  config: NetworkConfig,
  destinationTopic: string,
  fromBlock: string,
  toBlock: string,
): Promise<RpcLog[]> {
  return await rpcCall<RpcLog[]>(rpcUrl, 'eth_getLogs', [{
    fromBlock,
    toBlock,
    address: config.tokenContract,
    topics: [TRANSFER_TOPIC, null, destinationTopic],
  }]);
}

function matchingTransfer(logsInput: RpcLog[], config: NetworkConfig, destinationTopic: string, expected: bigint): RpcLog | null {
  const matches = (Array.isArray(logsInput) ? logsInput : [])
    .filter((log) => !log.removed)
    .filter((log) => String(log.address || '').toLowerCase() === config.tokenContract)
    .filter((log) => Array.isArray(log.topics) && String(log.topics[0] || '').toLowerCase() === TRANSFER_TOPIC)
    .filter((log) => String(log.topics?.[2] || '').toLowerCase() === destinationTopic)
    .filter((log) => hexBigInt(log.data) === expected)
    .filter((log) => /^0x[0-9a-f]{64}$/i.test(String(log.transactionHash || '')))
    .sort(compareLogs);
  return matches[0] ?? null;
}

function compareLogs(a: RpcLog, b: RpcLog): number {
  const blockDiff = hexNumber(a.blockNumber) - hexNumber(b.blockNumber);
  return blockDiff || hexNumber(a.logIndex) - hexNumber(b.logIndex);
}

async function latestBlockNumber(rpcUrl: string): Promise<number> {
  const value = await rpcCall<string>(rpcUrl, 'eth_blockNumber', []);
  const block = hexNumber(value);
  if (!Number.isSafeInteger(block) || block < 1) throw new Error('Could not read blockchain height');
  return block;
}

async function finalizedBlockNumber(rpcUrl: string, config: NetworkConfig): Promise<number | null> {
  try {
    const block = await rpcCall<RpcBlock | null>(rpcUrl, 'eth_getBlockByNumber', ['finalized', false]);
    const number = hexNumber(block?.number);
    if (!Number.isSafeInteger(number) || number < 1) throw new Error('Could not read finalized blockchain height');
    return number;
  } catch (error) {
    // BSC documents the finalized block tag for eth_getBlockByNumber. TRON's
    // JSON-RPC documentation guarantees finalized for eth_getLogs, while block
    // tag support is method-specific, so TRC20 safely falls back to finalized logs.
    if (config.id === 'trc20') return null;
    throw error;
  }
}

async function assertChainId(rpcUrl: string, config: NetworkConfig): Promise<void> {
  const chainId = String(await rpcCall<string>(rpcUrl, 'eth_chainId', []) || '').trim().toLowerCase();
  if (chainId !== config.chainId) throw new Error(`${config.label} RPC is connected to the wrong network`);
}

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method, params }),
      signal: controller.signal,
    });
    const json = await response.json().catch(() => ({})) as RpcResponse<T>;
    if (!response.ok || json.error || json.result === undefined) {
      const detail = String(json.error?.message || `HTTP ${response.status}`).slice(0, 180);
      throw new Error(`Blockchain RPC error: ${detail}`);
    }
    return json.result;
  } finally {
    clearTimeout(timeout);
  }
}

async function nextExpectedMicros(env: Env, network: UsdtNetwork, baseMicros: number): Promise<number> {
  const row = await env.DB.prepare(`SELECT MAX(expected_amount_micros) AS max_micros FROM usdt_deposits
    WHERE network=? AND expected_amount_micros>? AND expected_amount_micros<=?`)
    .bind(network, baseMicros, baseMicros + MAX_OFFSET_MICROS)
    .first<{ max_micros: number | null }>();
  const current = Math.floor(Number(row?.max_micros) || baseMicros);
  return Math.max(baseMicros + 1, current + 1);
}

function usdtMicrosToGramNano(micros: number, gramUsd: number): number {
  if (!Number.isFinite(gramUsd) || gramUsd <= 0) throw new Error('Gram price is unavailable');
  const usdt = micros / 1_000_000;
  const nano = Math.floor((usdt / gramUsd) * 1_000_000_000);
  if (!Number.isSafeInteger(nano) || nano < 1) throw new Error('USDT amount is too large');
  return nano;
}

function tokenUnits(micros: number, decimals: 6 | 18): string {
  const base = BigInt(micros);
  return (decimals === 6 ? base : base * 1_000_000_000_000n).toString();
}

function microsToUsdt(micros: number): string {
  const whole = Math.floor(micros / 1_000_000);
  const fraction = String(micros % 1_000_000).padStart(6, '0');
  return `${whole}.${fraction}`;
}

function compactUsdt(micros: number): string {
  return microsToUsdt(micros).replace(/0+$/, '').replace(/\.$/, '');
}

function normalizeRequestedUsdtMicros(value: unknown): number {
  const text = String(value ?? '').trim().replace(',', '.');
  const match = /^(\d{1,7})(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) throw new Error('Enter a USDT amount with up to 2 decimals');
  const whole = Number(match[1]);
  const cents = Number((match[2] || '').padEnd(2, '0'));
  const micros = whole * 1_000_000 + cents * 10_000;
  if (!Number.isSafeInteger(micros) || micros < 1_000_000) throw new Error('Minimum USDT amount is 1');
  if (micros > 1_000_000_000_000) throw new Error('USDT amount is too large');
  return micros;
}

function networkConfig(value: unknown): NetworkConfig {
  const id = String(value || '').trim().toLowerCase() as UsdtNetwork;
  const config = NETWORKS[id];
  if (!config) throw new Error('Choose BEP20 or TRC20');
  return config;
}

function cleanRpcUrl(value: unknown, label: string): string {
  const url = String(value || '').trim();
  if (!/^https:\/\//i.test(url)) throw new Error(`${label} RPC is not configured`);
  return url;
}

function cleanTreasuryAddress(value: unknown, network: UsdtNetwork): string {
  const address = String(value || '').trim();
  if (network === 'bep20') {
    if (!/^0x[0-9a-f]{40}$/i.test(address)) throw new Error('BEP20 treasury address is invalid');
    return address.toLowerCase();
  }
  if (/^0x[0-9a-f]{40}$/i.test(address)) return address.toLowerCase();
  if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) throw new Error('TRC20 treasury address is invalid');
  return address;
}

async function rpcAddress(address: string, network: UsdtNetwork): Promise<string> {
  if (network === 'bep20' || /^0x[0-9a-f]{40}$/i.test(address)) return address.toLowerCase();
  const decoded = base58Decode(address);
  if (decoded.length !== 25) throw new Error('TRC20 treasury address is invalid');
  const payload = decoded.slice(0, 21);
  if (payload[0] !== 0x41) throw new Error('TRC20 treasury address is invalid');
  const checksum = decoded.slice(21);
  const first = new Uint8Array(await crypto.subtle.digest('SHA-256', payload));
  const second = new Uint8Array(await crypto.subtle.digest('SHA-256', first));
  for (let i = 0; i < 4; i += 1) {
    if (checksum[i] !== second[i]) throw new Error('TRC20 treasury address checksum is invalid');
  }
  return '0x' + bytesHex(payload.slice(1));
}

function base58Decode(value: string): Uint8Array {
  const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let number = 0n;
  for (const char of value) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error('TRC20 treasury address is invalid');
    number = number * 58n + BigInt(index);
  }
  const bytes: number[] = [];
  while (number > 0n) {
    bytes.push(Number(number & 255n));
    number >>= 8n;
  }
  bytes.reverse();
  let zeros = 0;
  while (zeros < value.length && value[zeros] === '1') zeros += 1;
  return new Uint8Array([...new Array(zeros).fill(0), ...bytes]);
}

function bytesHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function addressTopic(address: string): string {
  const clean = address.toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]{40}$/.test(clean)) throw new Error('Invalid treasury RPC address');
  return '0x' + clean.padStart(64, '0');
}

function blockHex(value: number): string {
  return '0x' + Math.max(0, Math.floor(value)).toString(16);
}

function hexNumber(value: unknown): number {
  const text = String(value || '');
  if (!/^0x[0-9a-f]+$/i.test(text)) return 0;
  const number = Number(BigInt(text));
  return Number.isSafeInteger(number) ? number : 0;
}

function hexBigInt(value: unknown): bigint {
  const text = String(value || '');
  if (!/^0x[0-9a-f]+$/i.test(text)) return -1n;
  try {
    return BigInt(text);
  } catch {
    return -1n;
  }
}

function cleanTxHash(value: unknown): string {
  const hash = String(value || '').trim().toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(hash)) throw new Error('Invalid transaction hash');
  return hash;
}

function cleanUserId(value: unknown): string {
  const id = String(value ?? '').replace(/[^0-9A-Za-z_-]/g, '').trim().slice(0, 80);
  if (!id) throw new Error('Missing user id');
  return id;
}

function cleanDepositId(value: unknown): string {
  const id = String(value ?? '').replace(/[^0-9A-Za-z_-]/g, '').trim().slice(0, 80);
  if (!/^usdt_[0-9a-f]{20}$/.test(id)) throw new Error('Invalid USDT deposit id');
  return id;
}

function isExpectedAmountCollision(error: unknown): boolean {
  return /unique constraint failed:\s*usdt_deposits\.network,\s*usdt_deposits\.expected_amount_micros/i.test(
    String(error instanceof Error ? error.message : error || ''),
  );
}

function isTxHashCollision(error: unknown): boolean {
  return /unique constraint failed:.*usdt_deposits.*tx_hash/i.test(String(error instanceof Error ? error.message : error || ''));
}

async function ensureUsdtDepositsTable(env: Env): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS usdt_deposits (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    network TEXT NOT NULL,
    requested_amount_usdt TEXT NOT NULL,
    expected_amount_usdt TEXT NOT NULL,
    expected_amount_micros INTEGER NOT NULL,
    expected_units TEXT NOT NULL,
    amount_nano INTEGER NOT NULL,
    gram_usd REAL NOT NULL,
    treasury_address TEXT NOT NULL,
    start_block INTEGER NOT NULL,
    last_scanned_block INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    tx_hash TEXT,
    claim_token TEXT,
    credited_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_usdt_deposits_user ON usdt_deposits(user_id, created_at)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_usdt_deposits_status ON usdt_deposits(status, network)').run();
  await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_usdt_deposits_expected_amount ON usdt_deposits(network, expected_amount_micros)').run();
  await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_usdt_deposits_tx_hash ON usdt_deposits(network, tx_hash) WHERE tx_hash IS NOT NULL').run();
}

function rowToDeposit(row: UsdtDepositRow): UsdtDeposit {
  const config = networkConfig(row.network);
  return {
    id: row.id,
    userId: row.user_id,
    network: config.id,
    networkLabel: config.label,
    requestedAmountUsdt: row.requested_amount_usdt,
    expectedAmountUsdt: row.expected_amount_usdt,
    amountNano: Math.max(0, Math.floor(Number(row.amount_nano) || 0)),
    gramUsd: Number(row.gram_usd) || 0,
    status: row.status,
    txHash: row.tx_hash,
    treasuryAddress: row.treasury_address,
    tokenContract: config.tokenContract,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
