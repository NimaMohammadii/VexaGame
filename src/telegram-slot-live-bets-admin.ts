import type { Env } from './types';
import {
  getSlotVirtualUsers,
  resetSlotVirtualUsers,
  saveSlotVirtualUsers,
} from './slot-virtual-users';
import { upsertTelegramTextMenu } from './telegram-menu-state';

type Message = { message_id: number; chat: { id: number }; from?: { id: number }; text?: string };
type Callback = { id: string; data?: string; from: { id: number }; message?: { message_id: number; chat: { id: number } } };
type Update = { message?: Message; callback_query?: Callback };
type Button = { text: string; callback_data: string };
type Keyboard = Button[][];
type SlotState =
  | { mode: 'add-user'; page: number }
  | { mode: 'rename'; userIndex: number; page: number };

const STATE_PREFIX = 'admin:slot-live-bets-input:';
const PAGE_SIZE = 10;
const MAX_USERS = 80;
const MAX_RESULTS = 12;
const SYMBOLS = [
  ['🍒', 'Cherry'],
  ['🍋', 'Lemon'],
  ['🍊', 'Orange'],
  ['🍇', 'Grape'],
  ['🍉', 'Watermelon'],
  ['💎', 'Diamond'],
  ['⭐', 'Gold'],
  ['7️⃣', 'Lucky 7'],
] as const;

export async function handleSlotLiveBetsAdminRequest(request: Request, env: Env): Promise<Response | null> {
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
  if (!data.startsWith('botadmin:slotlive:')) {
    if (data.startsWith('botadmin:')) await clearState(env, callback.from.id);
    return null;
  }
  if (!isAdmin(env, callback.from.id)) return ok();

  await tg(token, 'answerCallbackQuery', { callback_query_id: callback.id }).catch(() => undefined);
  const chatId = callback.message?.chat.id ?? callback.from.id;
  const messageId = callback.message?.message_id;
  const parts = data.split(':');
  const action = parts[2] || '';

  if (action === 'list' || action === 'refresh') {
    await clearState(env, callback.from.id);
    await sendUsersMenu(env, token, chatId, Number(parts[3]) || 0, messageId);
    return ok();
  }

  if (action === 'user') {
    await clearState(env, callback.from.id);
    const index = validIndex(parts[3]);
    const page = Number(parts[4]) || 0;
    if (index !== null) await sendUserPanel(env, token, chatId, index, page, messageId);
    return ok();
  }

  if (action === 'adduser') {
    const page = Number(parts[3]) || 0;
    const config = await getSlotVirtualUsers(env);
    if (config.users.length >= MAX_USERS) {
      await sendUsersMenu(env, token, chatId, page, messageId, `❌ حداکثر ${MAX_USERS} کاربر مجازی مجاز است.`);
      return ok();
    }
    await setState(env, callback.from.id, { mode: 'add-user', page });
    await upsert(env, token, chatId, messageId,
      '➕ افزودن کاربر مجازی Slot\n\nنام کاربر را بفرستید. بعد از ساخت، مستقیم وارد صفحه همان کاربر می‌شوید و ریل‌ها را همان‌جا تغییر می‌دهید.',
      [[{ text: '⬅️ لغو', callback_data: `botadmin:slotlive:list:${page}` }]],
    );
    return ok();
  }

  if (action === 'rename') {
    const index = validIndex(parts[3]);
    const page = Number(parts[4]) || 0;
    if (index === null) return ok();
    const config = await getSlotVirtualUsers(env);
    const user = config.users[index];
    if (!user) {
      await sendUsersMenu(env, token, chatId, page, messageId, '❌ کاربر پیدا نشد.');
      return ok();
    }
    await setState(env, callback.from.id, { mode: 'rename', userIndex: index, page });
    await upsert(env, token, chatId, messageId,
      `✏️ تغییر نام\n\nنام فعلی: ${safe(user.name)}\n\nنام جدید را بفرستید.`,
      [[{ text: '⬅️ لغو', callback_data: `botadmin:slotlive:user:${index}:${page}` }]],
    );
    return ok();
  }

  if (action === 'addresult') {
    const index = validIndex(parts[3]);
    const page = Number(parts[4]) || 0;
    if (index === null) return ok();
    const config = await getSlotVirtualUsers(env);
    const user = config.users[index];
    if (!user) return ok();
    if (user.results.length >= MAX_RESULTS) {
      await sendUserPanel(env, token, chatId, index, page, messageId, `❌ برای هر کاربر حداکثر ${MAX_RESULTS} نتیجه مجاز است.`);
      return ok();
    }
    user.results.push([0, 0, 0]);
    await saveSlotVirtualUsers(env, config);
    await sendUserPanel(env, token, chatId, index, page, messageId, '✅ نتیجه جدید اضافه شد؛ ریل‌هایش همین پایین قابل تغییرند.');
    return ok();
  }

  if (action === 'cycle') {
    const userIndex = validIndex(parts[3]);
    const resultIndex = validIndex(parts[4]);
    const reel = validReel(parts[5]);
    const page = Number(parts[6]) || 0;
    if (userIndex === null || resultIndex === null || reel === null) return ok();

    const config = await getSlotVirtualUsers(env);
    const result = config.users[userIndex]?.results[resultIndex];
    if (!result) {
      await sendUserPanel(env, token, chatId, userIndex, page, messageId, '❌ نتیجه پیدا نشد.');
      return ok();
    }
    const current = validSymbol(result[reel]) ?? 0;
    result[reel] = (current + 1) % SYMBOLS.length;
    await saveSlotVirtualUsers(env, config);
    await sendUserPanel(env, token, chatId, userIndex, page, messageId);
    return ok();
  }

  if (action === 'delresult') {
    const userIndex = validIndex(parts[3]);
    const resultIndex = validIndex(parts[4]);
    const page = Number(parts[5]) || 0;
    if (userIndex === null || resultIndex === null) return ok();
    const config = await getSlotVirtualUsers(env);
    const user = config.users[userIndex];
    if (!user || !user.results[resultIndex]) return ok();
    if (user.results.length <= 1) {
      await sendUserPanel(env, token, chatId, userIndex, page, messageId, '❌ هر کاربر باید حداقل یک نتیجه داشته باشد.');
      return ok();
    }
    user.results.splice(resultIndex, 1);
    await saveSlotVirtualUsers(env, config);
    await sendUserPanel(env, token, chatId, userIndex, page, messageId, '✅ نتیجه حذف شد.');
    return ok();
  }

  // Backward compatibility for buttons left in older Telegram messages.
  if (action === 'result' || action === 'reel' || action === 'symbol') {
    const userIndex = validIndex(parts[3]);
    const page = Number(parts[action === 'result' ? 5 : action === 'reel' ? 6 : 7]) || 0;
    if (userIndex !== null) await sendUserPanel(env, token, chatId, userIndex, page, messageId);
    return ok();
  }

  if (action === 'removeask') {
    const index = validIndex(parts[3]);
    const page = Number(parts[4]) || 0;
    if (index === null) return ok();
    const config = await getSlotVirtualUsers(env);
    const user = config.users[index];
    if (!user) return ok();
    await upsert(env, token, chatId, messageId,
      `🗑 حذف کاربر مجازی\n\n${safe(user.name)} و تمام نتیجه‌هایش حذف شود؟`,
      [
        [{ text: '✅ بله، حذف کن', callback_data: `botadmin:slotlive:remove:${index}:${page}` }],
        [{ text: '⬅️ انصراف', callback_data: `botadmin:slotlive:user:${index}:${page}` }],
      ],
    );
    return ok();
  }

  if (action === 'remove') {
    const index = validIndex(parts[3]);
    const page = Number(parts[4]) || 0;
    if (index === null) return ok();
    const config = await getSlotVirtualUsers(env);
    if (config.users.length <= 1) {
      await sendUsersMenu(env, token, chatId, page, messageId, '❌ حداقل یک کاربر مجازی باید باقی بماند.');
      return ok();
    }
    if (!config.users[index]) return ok();
    config.users.splice(index, 1);
    await saveSlotVirtualUsers(env, config);
    await sendUsersMenu(env, token, chatId, page, messageId, '✅ کاربر مجازی حذف شد.');
    return ok();
  }

  if (action === 'resetask') {
    await upsert(env, token, chatId, messageId,
      '♻️ بازگردانی Slot Live Bets\n\nتمام کاربران و نتیجه‌های مجازی به مقادیر پیش‌فرض برگردند؟',
      [
        [{ text: '✅ بله، ریست کن', callback_data: 'botadmin:slotlive:reset' }],
        [{ text: '⬅️ انصراف', callback_data: 'botadmin:slotlive:list:0' }],
      ],
    );
    return ok();
  }

  if (action === 'reset') {
    await resetSlotVirtualUsers(env);
    await sendUsersMenu(env, token, chatId, 0, messageId, '✅ مقادیر پیش‌فرض Slot Live Bets بازیابی شد.');
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
    if (state.mode === 'rename') await sendUserPanel(env, token, message.chat.id, state.userIndex, state.page);
    else await sendUsersMenu(env, token, message.chat.id, state.page);
    return ok();
  }

  const name = normalizeName(text);
  if (!name) {
    await upsert(env, token, message.chat.id, undefined,
      '❌ نام باید بین 1 تا 80 کاراکتر باشد و نباید شامل < یا > باشد.\n\nنام معتبر را دوباره بفرستید.',
      [[{ text: '⬅️ لغو', callback_data: state.mode === 'rename' ? `botadmin:slotlive:user:${state.userIndex}:${state.page}` : `botadmin:slotlive:list:${state.page}` }]],
    );
    return ok();
  }

  const config = await getSlotVirtualUsers(env);
  if (state.mode === 'add-user') {
    if (config.users.length >= MAX_USERS) {
      await clearState(env, userId);
      await sendUsersMenu(env, token, message.chat.id, state.page, undefined, `❌ حداکثر ${MAX_USERS} کاربر مجازی مجاز است.`);
      return ok();
    }
    config.users.push({ name, results: [[0, 0, 0], [7, 7, 7]] });
    const saved = await saveSlotVirtualUsers(env, config);
    await clearState(env, userId);
    const index = saved.users.length - 1;
    await sendUserPanel(env, token, message.chat.id, index, Math.floor(index / PAGE_SIZE), undefined, '✅ کاربر جدید اضافه شد.');
    return ok();
  }

  const user = config.users[state.userIndex];
  if (!user) {
    await clearState(env, userId);
    await sendUsersMenu(env, token, message.chat.id, state.page, undefined, '❌ کاربر پیدا نشد.');
    return ok();
  }
  user.name = name;
  await saveSlotVirtualUsers(env, config);
  await clearState(env, userId);
  await sendUserPanel(env, token, message.chat.id, state.userIndex, state.page, undefined, '✅ نام ذخیره شد.');
  return ok();
}

async function sendUsersMenu(env: Env, token: string, chatId: number, pageInput = 0, messageId?: number, notice = ''): Promise<void> {
  const config = await getSlotVirtualUsers(env);
  const pageCount = Math.max(1, Math.ceil(config.users.length / PAGE_SIZE));
  const page = Math.max(0, Math.min(pageCount - 1, Math.floor(pageInput)));
  const start = page * PAGE_SIZE;
  const users = config.users.slice(start, start + PAGE_SIZE);
  const rows: Keyboard = users.map((user, offset) => {
    const index = start + offset;
    return [{ text: `👤 ${user.name} • ${user.results.length} نتیجه`, callback_data: `botadmin:slotlive:user:${index}:${page}` }];
  });
  if (pageCount > 1) {
    const nav: Button[] = [];
    if (page > 0) nav.push({ text: '⬅️ قبلی', callback_data: `botadmin:slotlive:list:${page - 1}` });
    if (page < pageCount - 1) nav.push({ text: 'بعدی ➡️', callback_data: `botadmin:slotlive:list:${page + 1}` });
    rows.push(nav);
  }
  rows.push([{ text: '➕ افزودن کاربر', callback_data: `botadmin:slotlive:adduser:${page}` }]);
  rows.push([{ text: '♻️ بازگردانی پیش‌فرض‌ها', callback_data: 'botadmin:slotlive:resetask' }]);
  rows.push([
    { text: '🔄 بروزرسانی', callback_data: `botadmin:slotlive:refresh:${page}` },
    { text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' },
  ]);
  await upsert(env, token, chatId, messageId,
    `${notice ? notice + '\n\n' : ''}🎰 Slot Live Bets\n\nکاربر را انتخاب کنید؛ تمام نتیجه‌ها و ۳ ریل هر نتیجه همان صفحه قابل تغییرند.\n\nتعداد کاربران: ${config.users.length}${config.updatedAt ? `\nآخرین ذخیره: ${formatUpdatedAt(config.updatedAt)}` : ''}\nصفحه ${page + 1} از ${pageCount}`,
    rows,
  );
}

async function sendUserPanel(env: Env, token: string, chatId: number, userIndex: number, page: number, messageId?: number, notice = ''): Promise<void> {
  const config = await getSlotVirtualUsers(env);
  const user = config.users[userIndex];
  if (!user) return sendUsersMenu(env, token, chatId, page, messageId, '❌ کاربر پیدا نشد.');

  const rows: Keyboard = [];
  user.results.forEach((result, resultIndex) => {
    rows.push([
      { text: `🎲 نتیجه ${resultIndex + 1}: ${resultText(result)}`, callback_data: `botadmin:slotlive:user:${userIndex}:${page}` },
      { text: '🗑', callback_data: `botadmin:slotlive:delresult:${userIndex}:${resultIndex}:${page}` },
    ]);
    rows.push([0, 1, 2].map((reel) => ({
      text: `R${reel + 1} ${symbolIcon(result[reel])}`,
      callback_data: `botadmin:slotlive:cycle:${userIndex}:${resultIndex}:${reel}:${page}`,
    })));
  });

  rows.push([{ text: '➕ افزودن نتیجه', callback_data: `botadmin:slotlive:addresult:${userIndex}:${page}` }]);
  rows.push([
    { text: '✏️ تغییر نام', callback_data: `botadmin:slotlive:rename:${userIndex}:${page}` },
    { text: '🗑 حذف کاربر', callback_data: `botadmin:slotlive:removeask:${userIndex}:${page}` },
  ]);
  rows.push([{ text: '⬅️ لیست کاربران', callback_data: `botadmin:slotlive:list:${page}` }]);

  await upsert(env, token, chatId, messageId,
    `${notice ? notice + '\n\n' : ''}👤 ${safe(user.name)}\n\nهمه‌چیز همین‌جاست. هر نتیجه ۳ ریل دارد؛ روی هر ریل بزنید تا بین ۸ نماد Slot بچرخد و همان لحظه ذخیره شود.\n\n${user.results.map((result, index) => `${index + 1}. ${resultText(result)}`).join('\n')}`,
    rows,
  );
}

function resultText(result: number[]): string {
  return [0, 1, 2].map((index) => symbolIcon(result[index])).join('  ');
}
function symbolIcon(index: number): string { return SYMBOLS[validSymbol(index) ?? 0][0]; }
function validIndex(value: unknown): number | null { const n = Number(value); return Number.isInteger(n) && n >= 0 ? n : null; }
function validReel(value: unknown): number | null { const n = Number(value); return Number.isInteger(n) && n >= 0 && n < 3 ? n : null; }
function validSymbol(value: unknown): number | null { const n = Number(value); return Number.isInteger(n) && n >= 0 && n < SYMBOLS.length ? n : null; }
function normalizeName(value: string): string | null {
  const name = value.replace(/[<>]/g, '').trim().slice(0, 80);
  return name ? name : null;
}
function safe(value: string): string { return String(value || '').replace(/[<>]/g, ''); }
function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}
async function getState(env: Env, userId: number): Promise<SlotState | null> {
  const raw = await env.BOT_CACHE.get(stateKey(userId)).catch(() => null);
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as SlotState;
    if (state.mode === 'add-user') return { mode: 'add-user', page: Number(state.page) || 0 };
    if (state.mode === 'rename' && validIndex(state.userIndex) !== null) return { mode: 'rename', userIndex: state.userIndex, page: Number(state.page) || 0 };
  } catch {}
  return null;
}
function setState(env: Env, userId: number, state: SlotState): Promise<void> { return env.BOT_CACHE.put(stateKey(userId), JSON.stringify(state), { expirationTtl: 900 }); }
function clearState(env: Env, userId: number): Promise<void> { return env.BOT_CACHE.delete(stateKey(userId)).catch(() => undefined); }
function stateKey(userId: number): string { return `${STATE_PREFIX}${userId}`; }
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
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({})) as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || !data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result as T;
}
function ok(): Response { return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } }); }
