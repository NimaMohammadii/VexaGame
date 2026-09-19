import type { Env } from './types';
import {
  getCrashVirtualUsers,
  resetCrashVirtualUsers,
  saveCrashVirtualUsers,
  type CrashVirtualUser,
} from './crash-virtual-users-config';
import {
  getGhostRunVirtualUsers,
  resetGhostRunVirtualUsers,
  saveGhostRunVirtualUsers,
  type GhostRunVirtualUser,
} from './ghost-run-virtual-users-config';
import { upsertTelegramTextMenu } from './telegram-menu-state';

type Message = { message_id: number; chat: { id: number }; from?: { id: number }; text?: string };
type Callback = { id: string; data?: string; from: { id: number }; message?: { message_id: number; chat: { id: number } } };
type Update = { message?: Message; callback_query?: Callback };
type CallbackButton = { text: string; callback_data: string };
type CopyButton = { text: string; copy_text: { text: string } };
type Button = CallbackButton | CopyButton;
type Keyboard = Button[][];
type GameKind = 'crash' | 'ghost';
type LiveBet = { amount: number; cashoutMultiplier: number };
type LiveUser = { name: string; betSecond: number; bets: LiveBet[] };
type State =
  | { mode: 'bulk'; game: GameKind; page: number }
  | { mode: 'add'; game: GameKind; page: number }
  | { mode: 'edit'; game: GameKind; userIndex: number; page: number };

const STATE_PREFIX = 'admin:crash-ghost-live-bets-input:';
const PAGE_SIZE = 10;
const MAX_USERS = 100;
const MAX_BETS = 12;
const MAX_COPY_TEXT = 256;

export async function handleCrashGhostLiveBetsAdminRequest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== 'POST' || url.pathname !== '/telegram/webhook') return null;
  const update = await request.clone().json().catch(() => null) as Update | null;
  if (!update || !env.BOT_TOKEN) return null;
  if (update.callback_query) return handleCallback(env, env.BOT_TOKEN, update.callback_query);
  if (update.message) return handleMessage(env, env.BOT_TOKEN, update.message);
  return null;
}

async function handleCallback(env: Env, token: string, callback: Callback): Promise<Response | null> {
  const data = String(callback.data || '');
  const game: GameKind | null = data.startsWith('botadmin:crashlive:') ? 'crash' : data.startsWith('botadmin:ghostlive:') ? 'ghost' : null;
  if (!game) {
    if (data.startsWith('botadmin:')) await clearState(env, callback.from.id);
    return null;
  }
  if (!isAdmin(env, callback.from.id)) return ok();

  await tg(token, 'answerCallbackQuery', { callback_query_id: callback.id }).catch(() => undefined);
  const chatId = callback.message?.chat.id ?? callback.from.id;
  const messageId = callback.message?.message_id;
  const prefix = gamePrefix(game);
  const parts = data.slice(prefix.length).split(':');
  const action = parts[0] || 'list';
  const page = Math.max(0, Number(parts[1]) || 0);

  if (action === 'list' || action === 'refresh') {
    await clearState(env, callback.from.id);
    await sendUsersMenu(env, token, chatId, game, page, messageId);
    return ok();
  }

  if (action === 'bulk') {
    const users = await getUsers(env, game);
    await setState(env, callback.from.id, { mode: 'bulk', game, page });
    const lines = users.map((user) => formatUserLine(user)).join('\n');
    await upsert(env, token, chatId, messageId,
      `${gameTitle(game)} — ویرایش سریع همه\n\nکل لیست را ادیت کنید و دوباره بفرستید. برای حذف کاربر، خطش را پاک کنید. برای اضافه کردن، یک خط جدید بسازید.\n\n${formatHelp(game)}\n\n${lines}`,
      [[{ text: '⬅️ لغو', callback_data: `${prefix}list:${page}` }]],
    );
    return ok();
  }

  if (action === 'add') {
    await setState(env, callback.from.id, { mode: 'add', game, page });
    const example = game === 'ghost'
      ? 'ShadowX | 2.5 | 0.5@1.35, 1.2@2.1'
      : 'RocketX | 3 | 5@1.35, 12@2.1';
    await upsert(env, token, chatId, messageId,
      `${gameTitle(game)} — افزودن کاربر\n\nیک خط بفرستید:\n${formatHelp(game)}\n\nمثال: ${example}`,
      [[{ text: '⬅️ لغو', callback_data: `${prefix}list:${page}` }]],
    );
    return ok();
  }

  if (action === 'edit') {
    const index = Number(parts[1]);
    const editPage = Math.max(0, Number(parts[2]) || 0);
    const users = await getUsers(env, game);
    const user = users[index];
    if (!user) {
      await sendUsersMenu(env, token, chatId, game, editPage, messageId, '❌ کاربر پیدا نشد.');
      return ok();
    }
    await setState(env, callback.from.id, { mode: 'edit', game, userIndex: index, page: editPage });
    const line = formatUserLine(user);
    const keyboard: Keyboard = [];
    if (line.length <= MAX_COPY_TEXT) keyboard.push([{ text: '📋 کپی همین خط', copy_text: { text: line } }]);
    keyboard.push([{ text: '⬅️ لغو', callback_data: `${prefix}list:${editPage}` }]);
    await upsert(env, token, chatId, messageId,
      `${gameTitle(game)} — ویرایش ${user.name}\n\nهمین یک خط را تغییر بده و بفرست:\n\n${line}\n\n${formatHelp(game)}${line.length > MAX_COPY_TEXT ? '\n\n⚠️ این خط بیشتر از محدودیت ۲۵۶ کاراکتری دکمه Copy تلگرام است.' : ''}`,
      keyboard,
    );
    return ok();
  }

  if (action === 'delete') {
    const index = Number(parts[1]);
    const deletePage = Math.max(0, Number(parts[2]) || 0);
    const users = await getUsers(env, game);
    const removed = users[index];
    if (!removed) {
      await sendUsersMenu(env, token, chatId, game, deletePage, messageId, '❌ کاربر پیدا نشد.');
      return ok();
    }
    if (users.length <= 1) {
      await sendUsersMenu(env, token, chatId, game, deletePage, messageId, '❌ حداقل یک کاربر باید باقی بماند.');
      return ok();
    }
    users.splice(index, 1);
    await saveUsers(env, game, users);
    await sendUsersMenu(env, token, chatId, game, deletePage, messageId, `✅ ${removed.name} حذف شد.`);
    return ok();
  }

  if (action === 'reset') {
    const resetPage = Math.max(0, Number(parts[2]) || 0);
    if (parts[1] !== 'confirm') {
      await upsert(env, token, chatId, messageId,
        `♻️ ${gameTitle(game)}\n\nهمه کاربران، زمان ورود و Bet Optionهای این بازی به پیش‌فرض خودش برمی‌گردد.`,
        [[{ text: '✅ ریست کن', callback_data: `${prefix}reset:confirm:${resetPage}` }], [{ text: '⬅️ انصراف', callback_data: `${prefix}list:${resetPage}` }]],
      );
      return ok();
    }
    await resetUsers(env, game);
    await sendUsersMenu(env, token, chatId, game, resetPage, messageId, '✅ پیش‌فرض‌های همین بازی بازیابی شد.');
    return ok();
  }

  return ok();
}

async function handleMessage(env: Env, token: string, message: Message): Promise<Response | null> {
  const userId = message.from?.id;
  if (!userId || !isAdmin(env, userId)) return null;
  const text = String(message.text || '').trim();
  if (isAdminCommand(text)) {
    await clearState(env, userId);
    return null;
  }

  const state = await getState(env, userId);
  if (!state) return null;
  await tg(token, 'deleteMessage', { chat_id: message.chat.id, message_id: message.message_id }).catch(() => undefined);

  if (text === '/cancel' || text === 'لغو') {
    await clearState(env, userId);
    await sendUsersMenu(env, token, message.chat.id, state.game, state.page);
    return ok();
  }

  try {
    if (state.mode === 'bulk') {
      const parsed = parseBulk(state.game, text);
      if (!parsed) throw new Error(bulkError(state.game));
      await saveUsers(env, state.game, parsed);
      await clearState(env, userId);
      await sendUsersMenu(env, token, message.chat.id, state.game, 0, undefined, `✅ ${parsed.length} کاربر ذخیره شد.`);
      return ok();
    }

    const parsed = parseUserLine(state.game, text);
    if (!parsed) throw new Error(lineError(state.game));
    const users = await getUsers(env, state.game);
    if (state.mode === 'add') {
      if (users.length >= MAX_USERS) throw new Error(`حداکثر ${MAX_USERS} کاربر مجاز است.`);
      users.push(parsed);
    } else {
      if (!users[state.userIndex]) throw new Error('کاربر پیدا نشد.');
      users[state.userIndex] = parsed;
    }

    await saveUsers(env, state.game, users);
    await clearState(env, userId);
    await sendUsersMenu(env, token, message.chat.id, state.game, state.page, undefined,
      state.mode === 'add' ? `✅ ${parsed.name} اضافه شد.` : `✅ ${parsed.name} ذخیره شد.`);
    return ok();
  } catch (error) {
    await upsert(env, token, message.chat.id, undefined,
      `❌ ${error instanceof Error ? error.message : 'فرمت نامعتبر است.'}\n\n${state.mode === 'bulk' ? 'لیست اصلاح‌شده را دوباره بفرستید.' : 'خط اصلاح‌شده را دوباره بفرستید.'}`,
      [[{ text: '⬅️ لغو', callback_data: `${gamePrefix(state.game)}list:${state.page}` }]],
    );
    return ok();
  }
}

async function sendUsersMenu(env: Env, token: string, chatId: number, game: GameKind, page = 0, messageId?: number, notice = ''): Promise<void> {
  const users = await getUsers(env, game);
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const start = safePage * PAGE_SIZE;
  const visible = users.slice(start, start + PAGE_SIZE);
  const prefix = gamePrefix(game);

  const rows: Keyboard = [
    [{ text: '✏️ ویرایش سریع همه', callback_data: `${prefix}bulk:${safePage}` }, { text: '➕ افزودن کاربر', callback_data: `${prefix}add:${safePage}` }],
  ];
  visible.forEach((user, localIndex) => {
    const index = start + localIndex;
    rows.push([
      { text: `✏️ ${shortName(user.name)}`, callback_data: `${prefix}edit:${index}:${safePage}` },
      { text: '🗑', callback_data: `${prefix}delete:${index}:${safePage}` },
    ]);
  });
  if (totalPages > 1) {
    rows.push([
      { text: '◀️', callback_data: `${prefix}list:${Math.max(0, safePage - 1)}` },
      { text: `${safePage + 1}/${totalPages}`, callback_data: `${prefix}refresh:${safePage}` },
      { text: '▶️', callback_data: `${prefix}list:${Math.min(totalPages - 1, safePage + 1)}` },
    ]);
  }
  rows.push([{ text: '♻️ Reset', callback_data: `${prefix}reset:ask:${safePage}` }, { text: '🔄 Refresh', callback_data: `${prefix}refresh:${safePage}` }]);
  rows.push([{ text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' }]);

  const timing = game === 'crash'
    ? 'زمان ورود هر کاربر: ۰ تا ۸ ثانیه.'
    : 'زمان ورود هر کاربر: ۰ تا ۶.۵ ثانیه.';
  const pageText = totalPages > 1 ? `\nصفحه ${safePage + 1} از ${totalPages}` : '';
  await upsert(env, token, chatId, messageId,
    `${notice ? notice + '\n\n' : ''}${gameTitle(game)}\n\n👥 تعداد کاربران: ${users.length}\n${timing}${pageText}\n\nکاربر را از دکمه‌های زیر انتخاب کنید.`,
    rows,
  );
}

function parseBulk(game: GameKind, text: string): LiveUser[] | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length || lines.length > MAX_USERS) return null;
  const users = lines.map((line) => parseUserLine(game, line));
  return users.every(Boolean) ? users as LiveUser[] : null;
}

function parseUserLine(game: GameKind, line: string): LiveUser | null {
  const parts = line.split('|').map((part) => part.trim());
  if (parts.length !== 3) return null;
  const name = cleanName(parts[0]);
  if (!name) return null;
  const betSecond = Number(parts[1]);
  const maxSecond = game === 'crash' ? 8 : 6.5;
  if (!Number.isFinite(betSecond) || betSecond < 0 || betSecond > maxSecond) return null;
  const rawBets = parts[2].split(',').map((part) => part.trim()).filter(Boolean);
  if (!rawBets.length || rawBets.length > MAX_BETS) return null;
  const bets: LiveBet[] = [];
  for (const raw of rawBets) {
    const match = raw.match(/^(\d+(?:\.\d{1,2})?)\s*@\s*(\d+(?:\.\d{1,2})?)$/);
    if (!match) return null;
    const amount = Number(match[1]);
    const cashoutMultiplier = Number(match[2]);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
    if (!Number.isFinite(cashoutMultiplier) || cashoutMultiplier < 1.01 || cashoutMultiplier > 60) return null;
    bets.push({ amount, cashoutMultiplier });
  }
  return { name, betSecond: Math.round(betSecond * 10) / 10, bets };
}

function formatUserLine(user: LiveUser): string {
  const bets = user.bets.map((bet) => `${trimNumber(bet.amount)}@${trimNumber(bet.cashoutMultiplier)}`).join(', ');
  return `${user.name} | ${trimNumber(user.betSecond)} | ${bets}`;
}

function formatHelp(game: GameKind): string {
  return game === 'crash'
    ? 'فرمت Crash: Name | second(0-8) | amount@multiplier, amount@multiplier'
    : 'فرمت Ghost: Name | second(0-6.5) | amount@multiplier, amount@multiplier';
}

function bulkError(game: GameKind): string {
  return `فرمت یکی از خط‌ها اشتباه است. ${formatHelp(game)}. حداکثر ${MAX_USERS} کاربر و ${MAX_BETS} Bet Option برای هر کاربر.`;
}

function lineError(game: GameKind): string {
  const maxSecond = game === 'crash' ? '8' : '6.5';
  return `فرمت درست نیست. ${formatHelp(game)}. second باید بین 0 تا ${maxSecond} و Multiplier بین 1.01 تا 60 باشد.`;
}

async function getUsers(env: Env, game: GameKind): Promise<LiveUser[]> {
  if (game === 'ghost') return (await getGhostRunVirtualUsers(env)).users.map(fromGhostUser);
  return (await getCrashVirtualUsers(env)).users.map(fromCrashUser);
}

async function saveUsers(env: Env, game: GameKind, users: LiveUser[]): Promise<void> {
  if (game === 'ghost') {
    await saveGhostRunVirtualUsers(env, { users });
    return;
  }
  await saveCrashVirtualUsers(env, { users });
}

async function resetUsers(env: Env, game: GameKind): Promise<void> {
  if (game === 'ghost') await resetGhostRunVirtualUsers(env);
  else await resetCrashVirtualUsers(env);
}

function fromCrashUser(user: CrashVirtualUser): LiveUser {
  return { name: user.name, betSecond: user.betSecond, bets: user.bets.map((bet) => ({ ...bet })) };
}

function fromGhostUser(user: GhostRunVirtualUser): LiveUser {
  return { name: user.name, betSecond: user.betSecond, bets: user.bets.map((bet) => ({ ...bet })) };
}

function cleanName(value: string): string {
  return value.replace(/[<>]/g, '').trim().slice(0, 80);
}

function shortName(value: string): string {
  const clean = value.trim();
  return clean.length > 24 ? clean.slice(0, 22) + '…' : clean;
}

function trimNumber(value: number): string {
  return String(Math.round(Number(value) * 100) / 100).replace(/\.0+$/, '');
}

function gameTitle(game: GameKind): string {
  return game === 'ghost' ? '👻 Ghost Run Live Bets' : '🚀 Crash Live Bets';
}

function gamePrefix(game: GameKind): string {
  return game === 'ghost' ? 'botadmin:ghostlive:' : 'botadmin:crashlive:';
}

async function getState(env: Env, userId: number): Promise<State | null> {
  const raw = await env.BOT_CACHE.get(stateKey(userId)).catch(() => null);
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as State;
    if ((state.game !== 'crash' && state.game !== 'ghost') || !['bulk', 'add', 'edit'].includes(state.mode)) return null;
    return state;
  } catch {
    return null;
  }
}

function setState(env: Env, userId: number, state: State): Promise<void> {
  return env.BOT_CACHE.put(stateKey(userId), JSON.stringify(state), { expirationTtl: 900 });
}

function clearState(env: Env, userId: number): Promise<void> {
  return env.BOT_CACHE.delete(stateKey(userId)).catch(() => undefined);
}

function stateKey(userId: number): string {
  return `${STATE_PREFIX}${userId}`;
}

function isAdmin(env: Env, userId: unknown): boolean {
  return String(env.BOT_ADMIN || '').split(/[\s,;]+/).map((value) => value.trim()).filter(Boolean).includes(String(userId || ''));
}

function isAdminCommand(text: string): boolean {
  const value = text.trim().toLowerCase();
  return value === 'admin' || value === 'ادمین' || /^\/admin(?:@[-_a-z0-9]+)?$/.test(value);
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

function ok(): Response {
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}
