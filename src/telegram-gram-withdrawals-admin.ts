import type { Env } from './types';
import {
  approveTonWithdrawal,
  listAdminTonWithdrawals,
  markTonWithdrawalPaid,
  rejectTonWithdrawal,
  type TonWithdrawal,
} from './ton-withdrawals';
import { getUserControls } from './user-controls';
import { upsertTelegramTextMenu } from './telegram-menu-state';

type Message = { message_id: number; chat: { id: number }; from?: { id: number }; text?: string };
type Callback = { id: string; data?: string; from: { id: number }; message?: { message_id: number; chat: { id: number } } };
type Update = { message?: Message; callback_query?: Callback };
type Button = { text: string; callback_data: string };
type Keyboard = Button[][];
type Filter = 'pending' | 'failed' | 'processing' | 'paid' | 'rejected' | 'all';
type RejectState = { mode: 'reject'; withdrawalId: string; filter: Filter; page: number };
type WithdrawalRow = {
  id: string;
  user_id: string;
  wallet_address: string;
  amount_nano: number;
  status: string;
  tx_hash?: string | null;
  submission_ref?: string | null;
  error_message?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  rejected_at?: string | null;
  admin_notified_at?: string | null;
  admin_notification_error?: string | null;
  created_at: string;
  updated_at: string;
};
type UserProfile = {
  userId: string;
  firstName: string;
  username: string;
  currentSection: string;
  lastSeenAt: string;
  createdAt: string;
  regionCode: string;
  languageCode: string;
  timezone: string;
  source: string;
  balanceNano: number;
};
type LedgerRow = {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  description: string | null;
  amount_nano: number;
  balance_after_nano: number;
  status: string;
  reference_id: string | null;
  reference_type: string | null;
  metadata_json: string | null;
  created_at: string;
};

const PAGE_SIZE = 8;
const STATE_PREFIX = 'admin:gram-withdrawal-input:';
const NOTIFIED_PREFIX = 'admin:gram-withdrawal-notified:';
const FILTERS: readonly Filter[] = ['pending', 'failed', 'processing', 'paid', 'rejected', 'all'];

export async function handleGramWithdrawalAdminRequest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== 'POST' || url.pathname !== '/telegram/webhook') return null;
  const update = await request.clone().json().catch(() => null) as Update | null;
  if (!update || !env.BOT_TOKEN) return null;

  const actorId = update.callback_query?.from.id ?? update.message?.from?.id;
  if (actorId && isAdmin(env, actorId)) {
    await flushPendingGramNotifications(env).catch((error) => console.warn('Gram notification recovery failed', error));
  }

  if (update.callback_query) return handleCallback(env, env.BOT_TOKEN, update.callback_query);
  if (update.message) return handleMessage(env, env.BOT_TOKEN, update.message);
  return null;
}

export async function notifyAdminGramWithdrawal(env: Env, withdrawal: TonWithdrawal): Promise<void> {
  if (!withdrawal?.id) return;
  await ensureNotificationStorage(env);

  const existing = await env.DB.prepare('SELECT admin_notified_at FROM ton_withdrawals WHERE id = ?')
    .bind(withdrawal.id)
    .first<{ admin_notified_at: string | null }>()
    .catch(() => null);
  if (existing?.admin_notified_at) return;

  const token = String(env.BOT_TOKEN || '').trim();
  const admins = adminIds(env);
  if (!token || !admins.length) {
    await recordNotificationError(env, withdrawal.id, 'BOT_TOKEN or BOT_ADMIN is not configured');
    return;
  }

  const [profile, ledger] = await Promise.all([
    loadUserProfile(env, withdrawal.userId),
    loadLedger(env, withdrawal.id),
  ]);
  const text = trimTelegramText(`🆕 New Gram Withdrawal\n\n${detailText(withdrawal, profile, ledger)}`);
  const reply_markup = { inline_keyboard: detailKeyboard(withdrawal, 'pending', 0) };
  const errors: string[] = [];

  for (const chatId of admins) {
    const delivered = await env.BOT_CACHE.get(notificationKey(withdrawal.id, chatId)).catch(() => null);
    if (delivered === '1') continue;
    try {
      await tg(token, 'sendMessage', {
        chat_id: chatId,
        text,
        reply_markup,
        disable_web_page_preview: true,
      });
      await env.BOT_CACHE.put(notificationKey(withdrawal.id, chatId), '1').catch(() => undefined);
    } catch (error) {
      errors.push(`${chatId}: ${error instanceof Error ? error.message : 'Telegram send failed'}`);
    }
  }

  if (errors.length) {
    await recordNotificationError(env, withdrawal.id, errors.join(' | '));
    return;
  }

  await env.DB.prepare(`UPDATE ton_withdrawals
    SET admin_notified_at = COALESCE(admin_notified_at, CURRENT_TIMESTAMP), admin_notification_error = NULL
    WHERE id = ?`)
    .bind(withdrawal.id)
    .run();
}

async function flushPendingGramNotifications(env: Env): Promise<void> {
  await ensureNotificationStorage(env);
  const rows = await env.DB.prepare(`SELECT * FROM ton_withdrawals
    WHERE admin_notified_at IS NULL
      AND admin_notification_error IS NOT NULL
    ORDER BY datetime(created_at) ASC
    LIMIT 12`)
    .all<WithdrawalRow>();
  for (const row of rows.results ?? []) {
    await notifyAdminGramWithdrawal(env, rowToWithdrawal(row));
  }
}

async function handleCallback(env: Env, token: string, callback: Callback): Promise<Response | null> {
  const data = String(callback.data || '');
  if (!data.startsWith('botadmin:gw:')) return null;
  if (!isAdmin(env, callback.from.id)) return ok();

  await tg(token, 'answerCallbackQuery', { callback_query_id: callback.id }).catch(() => undefined);
  const chatId = callback.message?.chat.id ?? callback.from.id;
  const messageId = callback.message?.message_id;
  const parts = data.split(':');
  const action = parts[2] || '';

  if (action === 'l') {
    await clearState(env, callback.from.id);
    await sendList(env, token, chatId, normalizeFilter(parts[3]), normalizePage(parts[4]), messageId);
    return ok();
  }

  if (action === 'v') {
    await clearState(env, callback.from.id);
    await sendDetail(env, token, chatId, parts[3], normalizeFilter(parts[4]), normalizePage(parts[5]), messageId);
    return ok();
  }

  if (action === 'a') {
    await clearState(env, callback.from.id);
    const id = cleanId(parts[3]);
    const filter = normalizeFilter(parts[4]);
    const page = normalizePage(parts[5]);
    if (!id) return ok();
    const withdrawal = await loadWithdrawal(env, id);
    if (!withdrawal) {
      await sendMissing(env, token, chatId, messageId);
      return ok();
    }
    if (!['pending', 'failed'].includes(withdrawal.status)) {
      await sendDetail(env, token, chatId, id, filter, page, messageId, '⚠️ This request can no longer be submitted.');
      return ok();
    }
    await upsert(env, token, chatId, messageId,
      `⚠️ Confirm Gram payout\n\nRequest: ${withdrawal.id}\nAmount: ${formatGram(withdrawal.amountNano)} Gram\nWallet: ${withdrawal.walletAddress}\n\nThis submits the real payout exactly once. There is no polling and no automatic retry. After submission the request stays Processing until you externally verify it and choose Mark Paid (No Resend).`,
      [[
        { text: '✅ Submit Payout Once', callback_data: cb('ac', id, filter, page) },
        { text: 'Cancel', callback_data: cb('v', id, filter, page) },
      ]],
    );
    return ok();
  }

  if (action === 'ac') {
    await clearState(env, callback.from.id);
    const id = cleanId(parts[3]);
    const filter = normalizeFilter(parts[4]);
    const page = normalizePage(parts[5]);
    if (!id) return ok();
    let notice = '✅ Payout submitted exactly once. No polling or automatic resend is running. Verify the existing submission externally, then use Mark Paid (No Resend).';
    try {
      const result = await approveTonWithdrawal(env, id);
      if (result.status !== 'processing' && result.status !== 'paid') {
        notice = `⚠️ Payout was not submitted. Current status: ${result.status}.`;
      }
    } catch (error) {
      const current = await loadWithdrawal(env, id).catch(() => null);
      if (current?.status === 'processing') {
        notice = `⚠️ Submission state is uncertain: ${error instanceof Error ? error.message : 'Unknown submit error'}\n\nSafety lock is active: no automatic resend and no automatic refund.`;
      } else {
        notice = `❌ Payout preparation failed before a safe submission: ${error instanceof Error ? error.message : 'Unknown payout error'}`;
      }
    }
    await sendDetail(env, token, chatId, id, filter, page, messageId, notice);
    return ok();
  }

  if (action === 'm') {
    await clearState(env, callback.from.id);
    const id = cleanId(parts[3]);
    const filter = normalizeFilter(parts[4]);
    const page = normalizePage(parts[5]);
    if (!id) return ok();
    const withdrawal = await loadWithdrawal(env, id);
    if (!withdrawal) {
      await sendMissing(env, token, chatId, messageId);
      return ok();
    }
    if (withdrawal.status !== 'processing') {
      await sendDetail(env, token, chatId, id, filter, page, messageId, '⚠️ Only a Processing request can be marked paid.');
      return ok();
    }
    await upsert(env, token, chatId, messageId,
      `✅ Confirm Mark Paid\n\nRequest: ${withdrawal.id}\nAmount: ${formatGram(withdrawal.amountNano)} Gram\nSubmission ref: ${valueOrDash(withdrawal.submissionRef)}\n\nThis DOES NOT send any funds and DOES NOT retry the payout. Use it only after you externally verify the existing submission.`,
      [[
        { text: '✅ Mark Paid (No Resend)', callback_data: cb('mc', id, filter, page) },
        { text: 'Cancel', callback_data: cb('v', id, filter, page) },
      ]],
    );
    return ok();
  }

  if (action === 'mc') {
    await clearState(env, callback.from.id);
    const id = cleanId(parts[3]);
    const filter = normalizeFilter(parts[4]);
    const page = normalizePage(parts[5]);
    if (!id) return ok();
    let notice = '✅ Marked Paid. No funds were resent.';
    try {
      await markTonWithdrawalPaid(env, id);
    } catch (error) {
      notice = `❌ Mark Paid failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    await sendDetail(env, token, chatId, id, filter, page, messageId, notice);
    return ok();
  }

  if (action === 'r') {
    const id = cleanId(parts[3]);
    const filter = normalizeFilter(parts[4]);
    const page = normalizePage(parts[5]);
    if (!id) return ok();
    const withdrawal = await loadWithdrawal(env, id);
    if (!withdrawal) {
      await sendMissing(env, token, chatId, messageId);
      return ok();
    }
    if (!['pending', 'failed'].includes(withdrawal.status)) {
      await sendDetail(env, token, chatId, id, filter, page, messageId, '⚠️ This request cannot be rejected or refunded in its current status.');
      return ok();
    }
    await setState(env, callback.from.id, { mode: 'reject', withdrawalId: id, filter, page });
    await upsert(env, token, chatId, messageId,
      `❌ Reject & Refund\n\nRequest: ${id}\nAmount: ${formatGram(withdrawal.amountNano)} Gram\n\nSend the rejection reason as a message, or use the default reason below. Rejecting refunds the reserved balance. Processing requests can never be refunded from here.`,
      [[
        { text: 'Reject with default reason', callback_data: cb('rd', id, filter, page) },
        { text: 'Cancel', callback_data: cb('v', id, filter, page) },
      ]],
    );
    return ok();
  }

  if (action === 'rd') {
    await clearState(env, callback.from.id);
    const id = cleanId(parts[3]);
    const filter = normalizeFilter(parts[4]);
    const page = normalizePage(parts[5]);
    if (!id) return ok();
    let notice = '✅ Withdrawal rejected and balance refunded.';
    try {
      await rejectTonWithdrawal(env, id, 'Rejected by admin');
    } catch (error) {
      notice = `❌ Reject failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    await sendDetail(env, token, chatId, id, filter, page, messageId, notice);
    return ok();
  }

  if (action === 'd') {
    await clearState(env, callback.from.id);
    const id = cleanId(parts[3]);
    if (id) await sendDetailFile(env, token, chatId, id);
    return ok();
  }

  if (action === 'x') {
    await clearState(env, callback.from.id);
    await sendCsv(env, token, chatId, normalizeFilter(parts[3]));
    return ok();
  }

  return ok();
}

async function handleMessage(env: Env, token: string, message: Message): Promise<Response | null> {
  const adminId = message.from?.id;
  if (!adminId) return null;
  const text = String(message.text || '').trim();
  if (isAdminCommand(text)) {
    await clearState(env, adminId);
    return null;
  }
  if (!isAdmin(env, adminId)) return null;
  const state = await getState(env, adminId);
  if (!state) return null;
  await tg(token, 'deleteMessage', { chat_id: message.chat.id, message_id: message.message_id }).catch(() => undefined);

  if (text === '/cancel' || text.toLowerCase() === 'cancel' || text === 'لغو') {
    await clearState(env, adminId);
    await sendDetail(env, token, message.chat.id, state.withdrawalId, state.filter, state.page);
    return ok();
  }
  if (!text) {
    await upsert(env, token, message.chat.id, undefined, 'Send a rejection reason, or press Cancel.', [[{ text: 'Cancel', callback_data: cb('v', state.withdrawalId, state.filter, state.page) }]]);
    return ok();
  }

  let notice = '✅ Withdrawal rejected and balance refunded.';
  try {
    await rejectTonWithdrawal(env, state.withdrawalId, text);
    await clearState(env, adminId);
  } catch (error) {
    notice = `❌ Reject failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
  await sendDetail(env, token, message.chat.id, state.withdrawalId, state.filter, state.page, undefined, notice);
  return ok();
}

async function sendList(env: Env, token: string, chatId: number, filter: Filter, page: number, messageId?: number): Promise<void> {
  await ensureStorage(env);
  const [counts, total] = await Promise.all([withdrawalCounts(env), countRows(env, filter)]);
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const safePage = Math.min(page, maxPage);
  const withdrawals = await listRows(env, filter, safePage);
  const profiles = await Promise.all(withdrawals.map((item) => loadUserProfile(env, item.userId)));
  const rows: Keyboard = [
    [statusButton('Pending', 'pending', filter, counts.pending), statusButton('Failed', 'failed', filter, counts.failed)],
    [statusButton('Processing', 'processing', filter, counts.processing), statusButton('Paid', 'paid', filter, counts.paid)],
    [statusButton('Rejected', 'rejected', filter, counts.rejected), statusButton('All', 'all', filter, counts.all)],
  ];

  withdrawals.forEach((withdrawal, index) => {
    const profile = profiles[index];
    const who = profile.username !== '—' ? profile.username : profile.firstName !== '—' ? profile.firstName : withdrawal.userId;
    rows.push([{ text: `${statusIcon(withdrawal.status)} ${formatGram(withdrawal.amountNano)} Gram · ${shortButtonText(who)}`, callback_data: cb('v', withdrawal.id, filter, safePage) }]);
  });

  const nav: Button[] = [];
  if (safePage > 0) nav.push({ text: '⬅️ Previous', callback_data: cb('l', filter, safePage - 1) });
  if (safePage < maxPage) nav.push({ text: 'Next ➡️', callback_data: cb('l', filter, safePage + 1) });
  if (nav.length) rows.push(nav);
  rows.push([
    { text: '📥 Download CSV', callback_data: cb('x', filter) },
    { text: '🔄 Refresh', callback_data: cb('l', filter, safePage) },
  ]);
  rows.push([{ text: '⬅️ Main Admin', callback_data: 'botadmin:home' }]);

  const shownFrom = total ? safePage * PAGE_SIZE + 1 : 0;
  const shownTo = total ? Math.min(total, shownFrom + withdrawals.length - 1) : 0;
  await upsert(env, token, chatId, messageId,
    `💸 Gram Withdrawals\n\nFilter: ${filterLabel(filter)}\nTotal: ${total}\nShowing: ${shownFrom}-${shownTo}\n\nNew requests are pushed automatically. Failed notifications are retried only on a real admin event. No polling is used.`,
    rows,
  );
}

async function sendDetail(env: Env, token: string, chatId: number, idInput: unknown, filter: Filter, page: number, messageId?: number, notice = ''): Promise<void> {
  const id = cleanId(idInput);
  if (!id) {
    await sendMissing(env, token, chatId, messageId);
    return;
  }
  const withdrawal = await loadWithdrawal(env, id);
  if (!withdrawal) {
    await sendMissing(env, token, chatId, messageId);
    return;
  }
  const [profile, ledger] = await Promise.all([
    loadUserProfile(env, withdrawal.userId),
    loadLedger(env, withdrawal.id),
  ]);
  await upsert(env, token, chatId, messageId,
    trimTelegramText(`${notice ? notice + '\n\n' : ''}${detailText(withdrawal, profile, ledger)}`),
    detailKeyboard(withdrawal, filter, page),
  );
}

function detailText(withdrawal: TonWithdrawal, profile: UserProfile, ledger: LedgerRow | null): string {
  const lines = [
    '💸 Gram Withdrawal Details',
    '',
    `Status: ${statusIcon(withdrawal.status)} ${String(withdrawal.status || '').toUpperCase()}`,
    `Amount: ${formatGram(withdrawal.amountNano)} Gram`,
    `Amount (nano): ${withdrawal.amountNano}`,
    `Wallet: ${withdrawal.walletAddress}`,
    `Request ID: ${withdrawal.id}`,
    `Submission ref: ${valueOrDash(withdrawal.submissionRef)}`,
    '',
    '👤 User',
    `User ID: ${withdrawal.userId}`,
    `Name: ${profile.firstName}`,
    `Username: ${profile.username}`,
    `Current balance: ${formatGram(profile.balanceNano)} Gram`,
    `Current section: ${profile.currentSection}`,
    `Region: ${profile.regionCode}`,
    `Language: ${profile.languageCode}`,
    `Timezone: ${profile.timezone}`,
    `Last seen: ${profile.lastSeenAt}`,
    `User created: ${profile.createdAt}`,
    `Profile source: ${profile.source}`,
    '',
    '🕒 Request timeline',
    `Created: ${valueOrDash(withdrawal.createdAt)}`,
    `Updated: ${valueOrDash(withdrawal.updatedAt)}`,
    `Approved / submitted: ${valueOrDash(withdrawal.approvedAt)}`,
    `Paid: ${valueOrDash(withdrawal.paidAt)}`,
    `Rejected: ${valueOrDash(withdrawal.rejectedAt)}`,
    `Tx hash: ${valueOrDash(withdrawal.txHash)}`,
    `Error / Reject reason: ${valueOrDash(withdrawal.errorMessage)}`,
  ];
  if (withdrawal.status === 'processing') {
    lines.push('', '🛡 Safety: this payout will not be resent or refunded automatically. Verify the existing submission externally.');
  }
  if (ledger) {
    lines.push(
      '',
      '📒 Ledger',
      `Transaction ID: ${ledger.id}`,
      `Status: ${ledger.status}`,
      `Amount (nano): ${ledger.amount_nano}`,
      `Balance after: ${formatGram(ledger.balance_after_nano)} Gram`,
      `Title: ${valueOrDash(displayGramText(ledger.title))}`,
      `Description: ${valueOrDash(displayGramText(ledger.description))}`,
      `Created: ${valueOrDash(ledger.created_at)}`,
      `Metadata: ${shortMetadata(ledger.metadata_json)}`,
    );
  }
  return lines.join('\n');
}

function detailKeyboard(withdrawal: TonWithdrawal, filter: Filter, page: number): Keyboard {
  const rows: Keyboard = [];
  if (withdrawal.status === 'pending' || withdrawal.status === 'failed') {
    rows.push([
      { text: '✅ Approve', callback_data: cb('a', withdrawal.id, filter, page) },
      { text: '❌ Reject & Refund', callback_data: cb('r', withdrawal.id, filter, page) },
    ]);
  } else if (withdrawal.status === 'processing') {
    rows.push([{ text: '✅ Mark Paid (No Resend)', callback_data: cb('m', withdrawal.id, filter, page) }]);
  }
  rows.push([{ text: '📄 Download Details', callback_data: cb('d', withdrawal.id) }]);
  rows.push([{ text: '⬅️ Back to Withdrawals', callback_data: cb('l', filter, page) }]);
  return rows;
}

async function sendDetailFile(env: Env, token: string, chatId: number, id: string): Promise<void> {
  const withdrawal = await loadWithdrawal(env, id);
  if (!withdrawal) {
    await tg(token, 'sendMessage', { chat_id: chatId, text: 'Withdrawal not found.' }).catch(() => undefined);
    return;
  }
  const [profile, ledger] = await Promise.all([
    loadUserProfile(env, withdrawal.userId),
    loadLedger(env, withdrawal.id),
  ]);
  const { amountTon: _legacyAmountTon, ...gramWithdrawal } = withdrawal;
  const exportLedger = ledger ? {
    ...ledger,
    title: displayGramText(ledger.title),
    description: displayGramText(ledger.description),
    metadata: parseMetadata(ledger.metadata_json),
  } : null;
  const content = JSON.stringify({
    exportedAt: new Date().toISOString(),
    displayCurrency: 'Gram',
    withdrawal: gramWithdrawal,
    user: profile,
    ledger: exportLedger,
  }, null, 2);
  await sendDocument(token, chatId, `gram-withdrawal-${withdrawal.id}.json`, content, 'application/json', `Gram withdrawal ${withdrawal.id}`);
}

async function sendCsv(env: Env, token: string, chatId: number, filter: Filter): Promise<void> {
  await ensureStorage(env);
  const where = filter === 'all' ? '' : 'WHERE w.status = ?';
  const sql = `SELECT w.id, w.user_id, w.wallet_address, w.amount_nano, w.status, w.tx_hash, w.submission_ref, w.error_message,
    w.approved_at, w.paid_at, w.rejected_at, w.created_at, w.updated_at, w.admin_notified_at, w.admin_notification_error,
    a.first_name, a.username, a.current_section, a.last_seen_at,
    t.id AS transaction_id, t.status AS transaction_status, t.balance_after_nano, t.title AS transaction_title,
    t.description AS transaction_description, t.metadata_json AS transaction_metadata, t.created_at AS transaction_created_at
    FROM ton_withdrawals w
    LEFT JOIN app_users a ON a.telegram_user_id = w.user_id
    LEFT JOIN ton_transactions t ON t.id = (
      SELECT t2.id FROM ton_transactions t2
      WHERE t2.reference_type = 'ton_withdrawal' AND t2.reference_id = w.id AND t2.kind = 'withdraw'
      ORDER BY datetime(t2.created_at) DESC LIMIT 1
    )
    ${where}
    ORDER BY datetime(w.created_at) DESC
    LIMIT 5000`;
  const result = filter === 'all'
    ? await env.DB.prepare(sql).all<Record<string, unknown>>()
    : await env.DB.prepare(sql).bind(filter).all<Record<string, unknown>>();
  const rows = result.results ?? [];
  const headers = [
    'request_id', 'user_id', 'first_name', 'username', 'amount_gram', 'amount_nano', 'wallet_address', 'status', 'submission_ref', 'tx_hash', 'error_or_reject_reason',
    'created_at', 'updated_at', 'approved_at', 'paid_at', 'rejected_at', 'admin_notified_at', 'admin_notification_error', 'current_section', 'last_seen_at',
    'transaction_id', 'transaction_status', 'balance_after_gram', 'transaction_title', 'transaction_description', 'transaction_metadata', 'transaction_created_at',
  ];
  const csv = [headers.join(',')].concat(rows.map((row) => [
    row.id, row.user_id, row.first_name, row.username, formatGram(Number(row.amount_nano || 0)), row.amount_nano, row.wallet_address, row.status, row.submission_ref, row.tx_hash, row.error_message,
    row.created_at, row.updated_at, row.approved_at, row.paid_at, row.rejected_at, row.admin_notified_at, row.admin_notification_error, row.current_section, row.last_seen_at,
    row.transaction_id, row.transaction_status, formatGram(Number(row.balance_after_nano || 0)), displayGramText(row.transaction_title), displayGramText(row.transaction_description), row.transaction_metadata, row.transaction_created_at,
  ].map(csvCell).join(','))).join('\n');
  await sendDocument(token, chatId, `gram-withdrawals-${filter}-${new Date().toISOString().slice(0, 10)}.csv`, csv, 'text/csv', `${filterLabel(filter)} Gram withdrawals · ${rows.length} rows`);
}

async function listRows(env: Env, filter: Filter, page: number): Promise<TonWithdrawal[]> {
  const where = filter === 'all' ? '' : 'WHERE status = ?';
  const sql = `SELECT * FROM ton_withdrawals ${where} ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?`;
  const offset = page * PAGE_SIZE;
  const rows = filter === 'all'
    ? await env.DB.prepare(sql).bind(PAGE_SIZE, offset).all<WithdrawalRow>()
    : await env.DB.prepare(sql).bind(filter, PAGE_SIZE, offset).all<WithdrawalRow>();
  return (rows.results ?? []).map(rowToWithdrawal);
}

async function countRows(env: Env, filter: Filter): Promise<number> {
  const where = filter === 'all' ? '' : 'WHERE status = ?';
  const sql = `SELECT COUNT(*) AS count FROM ton_withdrawals ${where}`;
  const row = filter === 'all'
    ? await env.DB.prepare(sql).first<{ count: number | string }>()
    : await env.DB.prepare(sql).bind(filter).first<{ count: number | string }>();
  return Math.max(0, Number(row?.count || 0));
}

async function withdrawalCounts(env: Env): Promise<Record<Filter, number>> {
  const out: Record<Filter, number> = { pending: 0, failed: 0, processing: 0, paid: 0, rejected: 0, all: 0 };
  const rows = await env.DB.prepare('SELECT status, COUNT(*) AS count FROM ton_withdrawals GROUP BY status').all<{ status: string; count: number | string }>();
  for (const row of rows.results ?? []) {
    const status = String(row.status || '').toLowerCase() as Filter;
    if (status !== 'all' && FILTERS.includes(status)) out[status] = Math.max(0, Number(row.count || 0));
  }
  out.all = out.pending + out.failed + out.processing + out.paid + out.rejected;
  return out;
}

async function loadWithdrawal(env: Env, id: string): Promise<TonWithdrawal | null> {
  await ensureStorage(env);
  const row = await env.DB.prepare('SELECT * FROM ton_withdrawals WHERE id = ?').bind(id).first<WithdrawalRow>();
  return row ? rowToWithdrawal(row) : null;
}

async function loadUserProfile(env: Env, userId: string): Promise<UserProfile> {
  const base = await env.DB.prepare(`SELECT telegram_user_id, first_name, username, current_section, last_seen_at, created_at
    FROM app_users WHERE telegram_user_id = ? LIMIT 1`).bind(userId).first<{
      telegram_user_id: string; first_name: string | null; username: string | null; current_section: string | null; last_seen_at: string | null; created_at: string | null;
    }>().catch(() => null);
  const extended = base ? await env.DB.prepare('SELECT region_code, language_code, timezone FROM app_users WHERE telegram_user_id = ? LIMIT 1')
    .bind(userId).first<{ region_code: string | null; language_code: string | null; timezone: string | null }>().catch(() => null) : null;
  const controls = await getUserControls(env, userId).catch(() => null);
  const source = base;
  return {
    userId,
    firstName: source?.first_name || '—',
    username: source?.username ? '@' + String(source.username).replace(/^@+/, '') : '—',
    currentSection: source?.current_section || '—',
    lastSeenAt: source?.last_seen_at || '—',
    createdAt: source?.created_at || '—',
    regionCode: extended?.region_code || '—',
    languageCode: extended?.language_code || '—',
    timezone: extended?.timezone || '—',
    source: base ? 'app_users' : '—',
    balanceNano: Math.max(0, Math.floor(Number(controls?.tonBalanceNano || 0))),
  };
}

async function loadLedger(env: Env, withdrawalId: string): Promise<LedgerRow | null> {
  return env.DB.prepare(`SELECT * FROM ton_transactions
    WHERE reference_type = 'ton_withdrawal' AND reference_id = ? AND kind = 'withdraw'
    ORDER BY datetime(created_at) DESC LIMIT 1`)
    .bind(withdrawalId).first<LedgerRow>().catch(() => null);
}

async function ensureStorage(env: Env): Promise<void> {
  await listAdminTonWithdrawals(env, 'pending').catch(() => ({ withdrawals: [] }));
  await ensureNotificationStorage(env);
}

async function ensureNotificationStorage(env: Env): Promise<void> {
  await env.DB.prepare('ALTER TABLE ton_withdrawals ADD COLUMN admin_notified_at TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE ton_withdrawals ADD COLUMN admin_notification_error TEXT').run().catch(() => undefined);
}

async function recordNotificationError(env: Env, id: string, error: string): Promise<void> {
  await env.DB.prepare(`UPDATE ton_withdrawals
    SET admin_notification_error = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND admin_notified_at IS NULL`)
    .bind(String(error || 'Notification failed').slice(0, 500), id)
    .run()
    .catch(() => undefined);
}

function rowToWithdrawal(row: WithdrawalRow): TonWithdrawal {
  const amount = Number(row.amount_nano || 0) / 1_000_000_000;
  return {
    id: row.id,
    userId: row.user_id,
    walletAddress: row.wallet_address,
    amountNano: Number(row.amount_nano || 0),
    amountTon: amount,
    amountGram: amount,
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

function statusButton(label: string, filter: Filter, selected: Filter, count: number): Button {
  return { text: `${filter === selected ? '• ' : ''}${label} (${count})`, callback_data: cb('l', filter, 0) };
}

function cb(action: string, ...parts: Array<string | number>): string {
  return ['botadmin', 'gw', action, ...parts].join(':');
}

function normalizeFilter(value: unknown): Filter {
  const filter = String(value || '').toLowerCase() as Filter;
  return FILTERS.includes(filter) ? filter : 'pending';
}

function normalizePage(value: unknown): number {
  const page = Math.floor(Number(value) || 0);
  return Math.max(0, Math.min(9999, page));
}

function cleanId(value: unknown): string {
  return String(value || '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 80);
}

function filterLabel(filter: Filter): string {
  return filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1);
}

function statusIcon(status: string): string {
  const value = String(status || '').toLowerCase();
  if (value === 'paid') return '✅';
  if (value === 'rejected') return '❌';
  if (value === 'failed') return '⚠️';
  if (value === 'processing') return '⏳';
  return '🟡';
}

function formatGram(nano: number): string {
  const amount = Number(nano || 0) / 1_000_000_000;
  return amount.toFixed(9).replace(/0+$/, '').replace(/\.$/, '') || '0';
}

function valueOrDash(value: unknown): string {
  const text = String(value ?? '').trim();
  return text || '—';
}

function displayGramText(value: unknown): string {
  return String(value ?? '').replace(/\bTON\b/gi, 'Gram');
}

function shortButtonText(value: string): string {
  const text = String(value || '').trim();
  return text.length > 22 ? text.slice(0, 19) + '…' : text || 'User';
}

function shortMetadata(value: string | null): string {
  const text = displayGramText(value);
  return text ? (text.length > 500 ? text.slice(0, 497) + '...' : text) : '—';
}

function parseMetadata(value: string | null): unknown {
  if (!value) return null;
  try { return JSON.parse(displayGramText(value)); } catch { return displayGramText(value); }
}

function trimTelegramText(value: string): string {
  const text = String(value || '');
  return text.length > 3900 ? text.slice(0, 3890) + '\n…' : text;
}

function csvCell(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

async function sendMissing(env: Env, token: string, chatId: number, messageId?: number): Promise<void> {
  await upsert(env, token, chatId, messageId, 'Withdrawal not found.', [[{ text: '⬅️ Back to Withdrawals', callback_data: cb('l', 'all', 0) }]]);
}

async function sendDocument(token: string, chatId: number, filename: string, content: string, contentType: string, caption: string): Promise<void> {
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('caption', caption.slice(0, 900));
  form.append('document', new Blob([content], { type: contentType }), filename);
  const response = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: form });
  const data = await response.json().catch(() => ({})) as { ok?: boolean; description?: string };
  if (!response.ok || !data.ok) throw new Error(data.description || 'Telegram sendDocument failed');
}

async function upsert(env: Env, token: string, chatId: number, messageId: number | undefined, text: string, keyboard: Keyboard): Promise<void> {
  await upsertTelegramTextMenu(env, token, tg, chatId, messageId, {
    text,
    reply_markup: { inline_keyboard: keyboard },
    disable_web_page_preview: true,
  });
}

async function tg<T = unknown>(token: string, method: string, payload: unknown): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({})) as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || !data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result as T;
}

async function clearOtherAdminStates(env: Env, adminId: number): Promise<void> {
  await Promise.all([
    env.BOT_CACHE.delete(`admin:crash-ghost-live-bets-input:${adminId}`).catch(() => undefined),
    env.BOT_CACHE.delete(`admin:slot-live-bets-input:${adminId}`).catch(() => undefined),
    env.BOT_CACHE.delete(`admin:online-count-input:${adminId}`).catch(() => undefined),
    env.BOT_CACHE.delete(`admin:plinko-control-input:${adminId}`).catch(() => undefined),
    env.BOT_CACHE.delete(`admin:section-access-input:${adminId}`).catch(() => undefined),
    env.BOT_CACHE.delete(`admin:game-card-upload:${adminId}`).catch(() => undefined),
    env.BOT_CACHE.delete(`botadmin:state:${adminId}`).catch(() => undefined),
  ]);
}

async function getState(env: Env, adminId: number): Promise<RejectState | null> {
  const state = await env.BOT_CACHE.get(stateKey(adminId), 'json').catch(() => null) as RejectState | null;
  return state?.mode === 'reject' && cleanId(state.withdrawalId) ? state : null;
}

async function setState(env: Env, adminId: number, state: RejectState): Promise<void> {
  await clearOtherAdminStates(env, adminId);
  await env.BOT_CACHE.put(stateKey(adminId), JSON.stringify(state), { expirationTtl: 900 });
}

function clearState(env: Env, adminId: number): Promise<void> {
  return env.BOT_CACHE.delete(stateKey(adminId)).catch(() => undefined);
}

function stateKey(adminId: number): string {
  return `${STATE_PREFIX}${adminId}`;
}

function notificationKey(withdrawalId: string, adminId: number): string {
  return `${NOTIFIED_PREFIX}${withdrawalId}:${adminId}`;
}

function adminIds(env: Env): number[] {
  return String(env.BOT_ADMIN || '').split(/[\s,;]+/).map((value) => Number(value.trim())).filter((value) => Number.isSafeInteger(value) && value !== 0);
}

function isAdmin(env: Env, userId: unknown): boolean {
  return String(env.BOT_ADMIN || '').split(/[\s,;]+/).map((value) => value.trim()).filter(Boolean).includes(String(userId || ''));
}

function isAdminCommand(text: string): boolean {
  const value = text.trim().toLowerCase();
  return value === 'admin' || value === 'ادمین' || /^\/admin(?:@[-_a-z0-9]+)?$/.test(value);
}

function ok(): Response {
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}
