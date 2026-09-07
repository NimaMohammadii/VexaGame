import type { Env } from './types';
import {
  ONLINE_COUNT_SECTIONS,
  getOnlineUserCountConfig,
  resetOnlineUserCountConfig,
  saveOnlineUserCountConfig,
  type OnlineCountRange,
} from './online-user-counts';
import { upsertTelegramTextMenu } from './telegram-menu-state';

type Message = { message_id: number; chat: { id: number }; from?: { id: number }; text?: string };
type Callback = { id: string; data?: string; from: { id: number }; message?: { message_id: number; chat: { id: number } } };
type Update = { message?: Message; callback_query?: Callback };
type Button = { text: string; callback_data: string };
type Keyboard = Button[][];
type OnlineState =
  | { mode: 'base'; sectionId: string }
  | { mode: 'timed-amount'; sectionId: string }
  | { mode: 'timed-hours'; sectionId: string; range: OnlineCountRange };

const STATE_PREFIX = 'admin:online-count-input:';
const MAX_COUNT = 999_999;

export async function handleOnlineCountsAdminRequest(request: Request, env: Env): Promise<Response | null> {
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
  if (!data.startsWith('botadmin:online:')) {
    if (data.startsWith('botadmin:')) await clearState(env, callback.from.id);
    return null;
  }
  if (!isAdmin(env, callback.from.id)) return ok();

  await clearOtherAdminStates(env, callback.from.id);
  await tg(token, 'answerCallbackQuery', { callback_query_id: callback.id }).catch(() => undefined);
  const chatId = callback.message?.chat.id ?? callback.from.id;
  const messageId = callback.message?.message_id;

  if (data === 'botadmin:online:list' || data === 'botadmin:online:refresh') {
    await clearState(env, callback.from.id);
    await sendMainMenu(env, token, chatId, messageId);
    return ok();
  }

  if (data === 'botadmin:online:reset:ask') {
    await clearState(env, callback.from.id);
    await upsert(env, token, chatId, messageId,
      '♻️ بازگردانی Online Counts\n\nتمام مقادیر پایه و افزایش‌های Online Counts به حالت پیش‌فرض برمی‌گردد. مطمئن هستید؟',
      [
        [{ text: '✅ بله، ریست کن', callback_data: 'botadmin:online:reset:confirm' }],
        [{ text: '⬅️ انصراف', callback_data: 'botadmin:online:list' }],
      ],
    );
    return ok();
  }

  if (data === 'botadmin:online:reset:confirm') {
    await clearState(env, callback.from.id);
    try {
      await resetOnlineUserCountConfig(env);
      await sendMainMenu(env, token, chatId, messageId, '✅ مقادیر پیش‌فرض Online Counts بازیابی شد.');
    } catch (error) {
      await sendMainMenu(env, token, chatId, messageId, errorText(error));
    }
    return ok();
  }

  if (data.startsWith('botadmin:online:section:')) {
    await clearState(env, callback.from.id);
    const sectionId = normalizeSectionId(data.slice('botadmin:online:section:'.length));
    if (sectionId) await sendSectionMenu(env, token, chatId, sectionId, messageId);
    return ok();
  }

  if (data.startsWith('botadmin:online:adjust:')) {
    const raw = data.slice('botadmin:online:adjust:'.length).split(':');
    const sectionId = normalizeSectionId(raw[0]);
    const delta = Number(raw[1]);
    if (!sectionId || (delta !== 1 && delta !== -1)) return ok();
    const config = await getOnlineUserCountConfig(env);
    config.adjustments[sectionId].permanent = Math.max(0, Math.min(MAX_COUNT, config.adjustments[sectionId].permanent + delta));
    await saveOnlineUserCountConfig(env, config);
    await sendSectionMenu(env, token, chatId, sectionId, messageId, `✅ مقدار افزوده‌شده ${delta > 0 ? 'یک نفر زیاد' : 'یک نفر کم'} شد.`);
    return ok();
  }

  if (data.startsWith('botadmin:online:timed:')) {
    const sectionId = normalizeSectionId(data.slice('botadmin:online:timed:'.length));
    if (!sectionId) return ok();
    await setState(env, callback.from.id, { mode: 'timed-amount', sectionId });
    await upsert(env, token, chatId, messageId,
      `⏱ افزایش زمان‌دار ${sectionLabel(sectionId)}\n\nمقدار ثابت یا بازهٔ افزایشی را بفرستید.\nمثال ثابت: 100\nمثال متغیر: 20-100`,
      [[{ text: '⬅️ لغو', callback_data: `botadmin:online:section:${sectionId}` }]],
    );
    return ok();
  }

  if (data.startsWith('botadmin:online:timedclear:')) {
    const sectionId = normalizeSectionId(data.slice('botadmin:online:timedclear:'.length));
    if (!sectionId) return ok();
    const config = await getOnlineUserCountConfig(env);
    delete config.adjustments[sectionId].timed;
    await saveOnlineUserCountConfig(env, config);
    await sendSectionMenu(env, token, chatId, sectionId, messageId, '✅ افزایش زمان‌دار حذف شد؛ فقط مقدار پایه و افزودهٔ دائمی نمایش داده می‌شود.');
    return ok();
  }

  if (data.startsWith('botadmin:online:realonly:')) {
    const sectionId = normalizeSectionId(data.slice('botadmin:online:realonly:'.length));
    if (!sectionId) return ok();
    const config = await getOnlineUserCountConfig(env);
    config.ranges[sectionId] = { min: 0, max: 0 };
    config.adjustments[sectionId] = { permanent: 0 };
    await saveOnlineUserCountConfig(env, config);
    await sendSectionMenu(env, token, chatId, sectionId, messageId, '✅ همهٔ مقادیر اعمالی حذف شد؛ عدد نمایش‌داده‌شده فقط کاربران واقعاً حاضر در بازی است.');
    return ok();
  }

  if (data.startsWith('botadmin:online:base:')) {
    const sectionId = normalizeSectionId(data.slice('botadmin:online:base:'.length));
    if (!sectionId || sectionId === 'predict') return ok();
    await setState(env, callback.from.id, { mode: 'base', sectionId });
    const config = await getOnlineUserCountConfig(env);
    const current = normalizeRange(config.ranges[sectionId]);
    await upsert(env, token, chatId, messageId,
      `✏️ ${sectionLabel(sectionId)} — مقدار پایه\n\nمقدار فعلی: ${current.min} تا ${current.max}\n\nحداقل و حداکثر را در یک پیام بفرستید.\nمثال: 120-280`,
      [[{ text: '⬅️ لغو', callback_data: `botadmin:online:section:${sectionId}` }]],
    );
    return ok();
  }

  return ok();
}

async function handleMessage(env: Env, token: string, message: Message): Promise<Response | null> {
  const userId = message.from?.id;
  if (!userId || !isAdmin(env, userId)) return null;
  const text = String(message.text || '').trim();

  if (isAdminCommand(text)) {
    await Promise.all([clearState(env, userId), clearOtherAdminStates(env, userId)]);
    return null;
  }

  const state = await getState(env, userId);
  if (!state) return null;
  await tg(token, 'deleteMessage', { chat_id: message.chat.id, message_id: message.message_id }).catch(() => undefined);

  if (text === '/cancel' || text === 'لغو') {
    await clearState(env, userId);
    await sendSectionMenu(env, token, message.chat.id, state.sectionId);
    return ok();
  }

  if (state.mode === 'base') {
    const range = parseRange(text);
    if (!range) {
      await upsert(env, token, message.chat.id, undefined,
        `❌ دو عدد بین 0 تا ${MAX_COUNT} بفرستید. مثال: 120-280\n\nحداقل و حداکثر را دوباره در یک پیام بفرستید.`,
        [[{ text: '⬅️ لغو', callback_data: `botadmin:online:section:${state.sectionId}` }]],
      );
      return ok();
    }
    try {
      const config = await getOnlineUserCountConfig(env);
      config.ranges[state.sectionId] = range;
      await saveOnlineUserCountConfig(env, config);
      await clearState(env, userId);
      await sendSectionMenu(env, token, message.chat.id, state.sectionId, undefined, `✅ مقدار پایه روی ${range.min} تا ${range.max} ذخیره و همان لحظه اعمال شد.`);
    } catch (error) {
      await upsert(env, token, message.chat.id, undefined,
        `${errorText(error)}\n\nمقدار را دوباره بفرستید.`,
        [[{ text: '⬅️ لغو', callback_data: `botadmin:online:section:${state.sectionId}` }]],
      );
    }
    return ok();
  }

  if (state.mode === 'timed-amount') {
    const range = parseBoostRange(text);
    if (!range) {
      await upsert(env, token, message.chat.id, undefined,
        `❌ یک عدد یا بازه بین 0 تا ${MAX_COUNT} بفرستید. مثال: 100 یا 20-100\n\nمقدار را دوباره بفرستید.`,
        [[{ text: '⬅️ لغو', callback_data: `botadmin:online:section:${state.sectionId}` }]],
      );
      return ok();
    }
    await setState(env, userId, { mode: 'timed-hours', sectionId: state.sectionId, range });
    await upsert(env, token, message.chat.id, undefined,
      '⏱ مدت افزایش زمان‌دار\n\nاین افزایش چند ساعت فعال بماند؟ یک عدد از 1 تا 720 بفرستید.',
      [[{ text: '⬅️ لغو', callback_data: `botadmin:online:section:${state.sectionId}` }]],
    );
    return ok();
  }

  if (state.mode === 'timed-hours') {
    const hours = Number(text);
    if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
      await upsert(env, token, message.chat.id, undefined,
        '❌ مدت باید یک عدد صحیح از 1 تا 720 ساعت باشد.\n\nتعداد ساعت را دوباره بفرستید.',
        [[{ text: '⬅️ لغو', callback_data: `botadmin:online:section:${state.sectionId}` }]],
      );
      return ok();
    }
    const config = await getOnlineUserCountConfig(env);
    config.adjustments[state.sectionId].timed = { ...state.range, expiresAt: new Date(Date.now() + hours * 3_600_000).toISOString() };
    await saveOnlineUserCountConfig(env, config);
    await clearState(env, userId);
    await sendSectionMenu(env, token, message.chat.id, state.sectionId, undefined, `✅ افزایش ${state.range.min === state.range.max ? state.range.min : `${state.range.min} تا ${state.range.max}`} برای ${hours} ساعت فعال شد.`);
    return ok();
  }

  return ok();
}

async function sendMainMenu(env: Env, token: string, chatId: number, messageId?: number, notice = ''): Promise<void> {
  const config = await getOnlineUserCountConfig(env);
  const rows: Keyboard = [];
  for (let index = 0; index < ONLINE_COUNT_SECTIONS.length; index += 2) {
    rows.push(ONLINE_COUNT_SECTIONS.slice(index, index + 2).map((section) => ({
      text: section.label,
      callback_data: `botadmin:online:section:${section.id}`,
    })));
  }
  rows.push([{ text: '♻️ بازگردانی پیش‌فرض‌ها', callback_data: 'botadmin:online:reset:ask' }]);
  rows.push([
    { text: '🔄 بروزرسانی', callback_data: 'botadmin:online:refresh' },
    { text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' },
  ]);

  await upsert(env, token, chatId, messageId,
    `${notice ? notice + '\n\n' : ''}👥 Online Counts\n\nبرای هر بازی یک Min/Max پایه تنظیم می‌شود و کاربران واقعاً حاضر در همان بازی به آن اضافه می‌شوند. عدد پایهٔ Predict فقط از کاربران واقعاً آنلاین می‌آید.${config.updatedAt ? `\n\nآخرین ذخیره: ${formatUpdatedAt(config.updatedAt)}` : ''}`,
    rows,
  );
}

async function sendSectionMenu(env: Env, token: string, chatId: number, sectionId: string, messageId?: number, notice = ''): Promise<void> {
  const config = await getOnlineUserCountConfig(env);
  const base = normalizeRange(config.ranges[sectionId]);
  const adjustment = config.adjustments[sectionId];
  const timed = adjustment.timed && Date.parse(adjustment.timed.expiresAt) > Date.now() ? adjustment.timed : undefined;
  const isPredict = sectionId === 'predict';
  const rows: Keyboard = [];
  if (!isPredict) rows.push([{ text: `✏️ مقدار پایه • ${base.min}-${base.max}`, callback_data: `botadmin:online:base:${sectionId}` }]);
  if (!isPredict && (base.min > 0 || base.max > 0 || adjustment.permanent > 0 || timed)) {
    rows.push([{ text: '👤 فقط کاربران واقعی (حذف همهٔ مقادیر)', callback_data: `botadmin:online:realonly:${sectionId}` }]);
  }
  rows.push([
    { text: '➖ کم‌کردن ۱', callback_data: `botadmin:online:adjust:${sectionId}:-1` },
    { text: '➕ افزودن ۱', callback_data: `botadmin:online:adjust:${sectionId}:1` },
  ]);
  rows.push([{ text: '⏱ افزودن زمان‌دار', callback_data: `botadmin:online:timed:${sectionId}` }]);
  if (timed) rows.push([{ text: '🛑 حذف افزایش زمان‌دار', callback_data: `botadmin:online:timedclear:${sectionId}` }]);
  rows.push([{ text: '⬅️ بازی‌ها', callback_data: 'botadmin:online:list' }]);

  await upsert(env, token, chatId, messageId,
    `${notice ? notice + '\n\n' : ''}👥 ${sectionLabel(sectionId)} — Online Counts\n\nافزودهٔ دائمی: +${adjustment.permanent}\n${timed ? `افزایش زمان‌دار: +${timed.min === timed.max ? timed.min : `${timed.min} تا ${timed.max}`} (تا ${formatUpdatedAt(timed.expiresAt)})` : 'افزایش زمان‌دار: غیرفعال'}\n\n${isPredict ? 'مقدار پایه: تعداد کاربران واقعاً آنلاین در Predict' : `مقدار پایه: ${base.min} تا ${base.max} + کاربران واقعاً حاضر در بازی`}\n\nعدد نمایشی = مقدار پایه + کاربران واقعی + افزودهٔ دائمی + افزایش زمان‌دار فعال. دکمه‌های ± فقط افزودهٔ دائمی را تغییر می‌دهند.`,
    rows,
  );
}

function parseRange(text: string): OnlineCountRange | null {
  const match = text.trim().match(/^(\d{1,6})\s*(?:[-–—,:]\s*|\s+)(\d{1,6})$/);
  if (!match) return null;
  const a = Number(match[1]);
  const b = Number(match[2]);
  if (!validCount(a) || !validCount(b)) return null;
  return a <= b ? { min: a, max: b } : { min: b, max: a };
}

function parseBoostRange(text: string): OnlineCountRange | null {
  const fixed = text.trim().match(/^(\d{1,6})$/);
  if (fixed) {
    const value = Number(fixed[1]);
    return validCount(value) ? { min: value, max: value } : null;
  }
  return parseRange(text);
}

function validCount(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_COUNT;
}

function normalizeRange(value: OnlineCountRange | undefined): OnlineCountRange {
  const min = Math.max(0, Math.min(MAX_COUNT, Math.floor(Number(value?.min) || 0)));
  const max = Math.max(0, Math.min(MAX_COUNT, Math.floor(Number(value?.max) || 0)));
  return min <= max ? { min, max } : { min: max, max: min };
}

function normalizeSectionId(value: unknown): string | null {
  const id = String(value || '').trim().toLowerCase();
  return ONLINE_COUNT_SECTIONS.some((section) => section.id === id) ? id : null;
}

function sectionLabel(id: string): string {
  return ONLINE_COUNT_SECTIONS.find((section) => section.id === id)?.label || id;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

async function getState(env: Env, userId: number): Promise<OnlineState | null> {
  const raw = await env.BOT_CACHE.get(stateKey(userId)).catch(() => null);
  if (!raw) return null;
  try {
    const state = JSON.parse(raw) as { mode?: string; sectionId?: string };
    const sectionId = normalizeSectionId(state.sectionId);
    if (!sectionId) return null;
    if (state.mode === 'base') return { mode: 'base', sectionId };
    if (state.mode === 'timed-amount') return { mode: 'timed-amount', sectionId };
    if (state.mode === 'timed-hours') {
      const range = normalizeRange((state as { range?: OnlineCountRange }).range);
      return { mode: 'timed-hours', sectionId, range };
    }
    return null;
  } catch {
    return null;
  }
}

function setState(env: Env, userId: number, state: OnlineState): Promise<void> {
  return env.BOT_CACHE.put(stateKey(userId), JSON.stringify(state), { expirationTtl: 900 });
}

function clearState(env: Env, userId: number): Promise<void> {
  return env.BOT_CACHE.delete(stateKey(userId)).catch(() => undefined);
}

async function clearOtherAdminStates(env: Env, userId: number): Promise<void> {
  await Promise.all([
    env.BOT_CACHE.delete(`admin:section-access-input:${userId}`).catch(() => undefined),
    env.BOT_CACHE.delete(`admin:game-card-upload:${userId}`).catch(() => undefined),
    env.BOT_CACHE.delete(`botadmin:state:${userId}`).catch(() => undefined),
  ]);
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

function errorText(error: unknown): string {
  return `❌ ${error instanceof Error ? error.message : 'عملیات ناموفق بود.'}`;
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
