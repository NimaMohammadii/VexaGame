import type { Env } from './types';
import { ACCESS_SECTIONS, clearSectionLock, getSectionAccess, setSectionLock } from './section-access';
import { getTelegramMenuMessageId, setTelegramMenuMessageId, upsertTelegramTextMenu } from './telegram-menu-state';

type Message = { message_id: number; chat: { id: number }; from?: { id: number }; text?: string };
type Callback = { id: string; data?: string; from: { id: number }; message?: { message_id: number; chat: { id: number } } };
type Update = { message?: Message; callback_query?: Callback };
type Button = { text: string; callback_data: string };
type Keyboard = Button[][];

const LOCK_STATE_PREFIX = 'admin:section-access-input:';
const LEGACY_ADMIN_STATE_PREFIX = 'admin:game-card-upload:';

export async function handleSectionAccessAdminRequest(request: Request, env: Env): Promise<Response | null> {
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
  const ours = data === 'botadmin:home'
    || data === 'botadmin:access:list'
    || data === 'botadmin:access:refresh'
    || data.startsWith('botadmin:access:select:')
    || data.startsWith('botadmin:access:unlock:');
  if (!ours) return null;
  if (!isAdmin(env, callback.from.id)) return ok();

  await tg(token, 'answerCallbackQuery', { callback_query_id: callback.id }).catch(() => undefined);
  const chatId = callback.message?.chat.id ?? callback.from.id;
  const messageId = callback.message?.message_id;

  if (data === 'botadmin:home') {
    await clearAdminInputStates(env, callback.from.id);
    await sendAdminHome(env, token, chatId, messageId);
    return ok();
  }

  if (data === 'botadmin:access:list' || data === 'botadmin:access:refresh') {
    await clearLockState(env, callback.from.id);
    await sendAccessMenu(env, token, chatId, messageId);
    return ok();
  }

  if (data.startsWith('botadmin:access:select:')) {
    const sectionId = normalizeSectionId(data.slice('botadmin:access:select:'.length));
    if (!sectionId) return ok();
    await clearLegacyAdminState(env, callback.from.id);
    await env.BOT_CACHE.put(lockStateKey(callback.from.id), sectionId, { expirationTtl: 900 });
    const label = sectionLabel(sectionId);
    await upsert(env, token, chatId, messageId,
      `🔒 قفل ${label}\n\nمدت قفل را به دقیقه بفرستید.\nمثال: 30 یا 120\n\nحداقل 1 دقیقه و حداکثر 43200 دقیقه.`,
      [[{ text: '⬅️ بازگشت', callback_data: 'botadmin:access:list' }]],
    );
    return ok();
  }

  if (data.startsWith('botadmin:access:unlock:')) {
    const sectionId = normalizeSectionId(data.slice('botadmin:access:unlock:'.length));
    if (!sectionId) return ok();
    try {
      await clearSectionLock(env, sectionId);
      await sendAccessMenu(env, token, chatId, messageId, `✅ ${sectionLabel(sectionId)} باز شد.`);
    } catch (error) {
      await sendAccessMenu(env, token, chatId, messageId, `❌ ${error instanceof Error ? error.message : 'باز کردن بخش ناموفق بود.'}`);
    }
    return ok();
  }

  return ok();
}

async function handleMessage(env: Env, token: string, message: Message): Promise<Response | null> {
  const userId = message.from?.id;
  if (!userId) return null;
  const text = String(message.text || '').trim();

  // The central bot-admin handler owns /admin so it can reuse the one tracked
  // menu message instead of creating another menu in the chat.
  if (isAdminCommand(text)) return null;

  if (!isAdmin(env, userId)) return null;
  const sectionId = normalizeSectionId(await env.BOT_CACHE.get(lockStateKey(userId)).catch(() => null));
  if (!sectionId) return null;

  await tg(token, 'deleteMessage', { chat_id: message.chat.id, message_id: message.message_id }).catch(() => undefined);

  if (text === '/cancel' || text === 'لغو') {
    await clearLockState(env, userId);
    await sendAccessMenu(env, token, message.chat.id);
    return ok();
  }

  if (!/^\d+$/.test(text)) {
    await upsert(env, token, message.chat.id, undefined,
      `❌ فقط تعداد دقیقه را به‌صورت عدد صحیح بفرستید. مثال: 60\n\n🔒 قفل ${sectionLabel(sectionId)}\n\nمدت قفل را به دقیقه بفرستید.`,
      [[{ text: '⬅️ بازگشت', callback_data: 'botadmin:access:list' }]],
    );
    return ok();
  }

  const minutes = Number(text);
  if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 43_200) {
    await upsert(env, token, message.chat.id, undefined,
      `❌ مدت قفل باید بین 1 تا 43200 دقیقه باشد.\n\n🔒 قفل ${sectionLabel(sectionId)}\n\nمدت قفل را به دقیقه بفرستید.`,
      [[{ text: '⬅️ بازگشت', callback_data: 'botadmin:access:list' }]],
    );
    return ok();
  }

  try {
    await setSectionLock(env, sectionId, minutes);
    await clearLockState(env, userId);
    await sendAccessMenu(env, token, message.chat.id, undefined, `✅ ${sectionLabel(sectionId)} برای ${formatMinutes(minutes)} قفل شد.`);
  } catch (error) {
    await upsert(env, token, message.chat.id, undefined,
      `❌ ${error instanceof Error ? error.message : 'قفل کردن بخش ناموفق بود.'}\n\n🔒 قفل ${sectionLabel(sectionId)}\n\nمدت قفل را دوباره بفرستید.`,
      [[{ text: '⬅️ بازگشت', callback_data: 'botadmin:access:list' }]],
    );
  }
  return ok();
}

export async function sendAdminHome(env: Env, token: string, chatId: number, messageId?: number): Promise<void> {
  const trackedMessageId = messageId ?? await getTrackedMenuMessageId(env, chatId);
  const activeMessageId = await upsert(env, token, chatId, trackedMessageId,
    '🛡 پنل مدیریت ربات گیم\n\nبخش موردنظر را انتخاب کنید.',
    [
      [
        { text: '👥 لیست کاربران', callback_data: 'botadmin:users:0' },
        { text: '↩️ کاربران برگشتی', callback_data: 'botadmin:returns' },
      ],
      [
        { text: '📊 آمار مالی و آنلاین', callback_data: 'botadmin:financestats' },
        { text: '⚙️ حدود واریز/برداشت', callback_data: 'botadmin:financelimits' },
      ],
      [
        { text: '💸 Gram Withdrawals', callback_data: 'botadmin:gw:l:pending:0' },
      ],
      [
        { text: '🎟 Lottery', callback_data: 'botadmin:lottery:menu' },
      ],
      [
        { text: '🌍 تنظیمات رجین', callback_data: 'botadmin:regionsettings' },
        { text: '📣 پیام همگانی', callback_data: 'botadmin:askbroadcast' },
      ],
      [{ text: '📨 ارسال پیام به کانال', callback_data: 'botadmin:channelpost' }],
      [
        { text: '🔐 قفل بخش‌ها', callback_data: 'botadmin:access:list' },
        { text: '👥 Online Counts', callback_data: 'botadmin:online:list' },
      ],
      [{ text: '🎮 نمایش کارت‌های Play Hub', callback_data: 'botadmin:playcards' }],
      [{ text: '🔮 رویدادهای Predict', callback_data: 'botadmin:events:list' }],
      [{ text: '🧸 Predict Operations', callback_data: 'botadmin:predictops:menu' }],
      [
        { text: '🎰 Slot Live Bets', callback_data: 'botadmin:slotlive:list:0' },
        { text: '🚀 Crash Live Bets', callback_data: 'botadmin:crashlive:list:0' },
      ],
      [
        { text: '👻 Ghost Run Live Bets', callback_data: 'botadmin:ghostlive:list:0' },
        { text: '🎯 Plinko Control', callback_data: 'botadmin:plinko:list' },
      ],
      [{ text: '🖼 تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }],
    ],
  );
  if (activeMessageId) await setTelegramMenuMessageId(env, chatId, activeMessageId);
}

async function getTrackedMenuMessageId(env: Env, chatId: number): Promise<number | undefined> {
  return getTelegramMenuMessageId(env, chatId);
}

async function sendAccessMenu(env: Env, token: string, chatId: number, messageId?: number, notice = ''): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const locks = await getSectionAccess(env);
  const lockMap = new Map(locks.map((lock) => [lock.sectionId, lock] as const));
  const activeLines = ACCESS_SECTIONS.flatMap(([id, label]) => {
    const lock = lockMap.get(id);
    return lock ? [`🔒 ${label} — ${formatSeconds(lock.lockedUntil - now)} باقی‌مانده`] : [];
  });
  const rows: Keyboard = [];
  const unlockedButtons: Button[] = [];

  for (const [id, label] of ACCESS_SECTIONS) {
    const lock = lockMap.get(id);
    if (lock) {
      rows.push([
        { text: `⏱ ${label}`, callback_data: `botadmin:access:select:${id}` },
        { text: `🔓 باز کردن`, callback_data: `botadmin:access:unlock:${id}` },
      ]);
    } else {
      unlockedButtons.push({ text: `🔒 ${label}`, callback_data: `botadmin:access:select:${id}` });
    }
  }

  for (let index = 0; index < unlockedButtons.length; index += 2) {
    rows.push(unlockedButtons.slice(index, index + 2));
  }

  rows.push([
    { text: '🔄 بروزرسانی', callback_data: 'botadmin:access:refresh' },
    { text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' },
  ]);

  const status = activeLines.length ? `قفل‌های فعال:\n${activeLines.join('\n')}` : 'در حال حاضر هیچ بخشی قفل نیست.';
  await upsert(env, token, chatId, messageId,
    `${notice ? notice + '\n\n' : ''}🔐 قفل بخش‌های مینی‌اپ\n\n${status}\n\nبرای قفل کردن یک بخش روی نامش بزنید. بخش‌های آزاد دو‌تایی چیده شده‌اند؛ قفل‌های فعال دکمه تمدید و باز کردن جدا دارند.`,
    rows,
  );
}

function normalizeSectionId(value: unknown): string | null {
  const id = String(value || '').trim().toLowerCase();
  return ACCESS_SECTIONS.some(([sectionId]) => sectionId === id) ? id : null;
}

function sectionLabel(id: string): string {
  return ACCESS_SECTIONS.find(([sectionId]) => sectionId === id)?.[1] || id;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} دقیقه`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ساعت و ${rest} دقیقه` : `${hours} ساعت`;
}

function formatSeconds(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(Math.max(0, seconds) / 60));
  return formatMinutes(minutes);
}

async function clearAdminInputStates(env: Env, userId: number): Promise<void> {
  await Promise.all([clearLockState(env, userId), clearLegacyAdminState(env, userId)]);
}

function clearLockState(env: Env, userId: number): Promise<void> {
  return env.BOT_CACHE.delete(lockStateKey(userId)).catch(() => undefined);
}

function clearLegacyAdminState(env: Env, userId: number): Promise<void> {
  return env.BOT_CACHE.delete(`${LEGACY_ADMIN_STATE_PREFIX}${userId}`).catch(() => undefined);
}

function lockStateKey(userId: number): string {
  return `${LOCK_STATE_PREFIX}${userId}`;
}

function isAdmin(env: Env, userId: unknown): boolean {
  return String(env.BOT_ADMIN || '').split(/[\s,;]+/).map((value) => value.trim()).filter(Boolean).includes(String(userId || ''));
}

function isAdminCommand(text: string): boolean {
  const value = text.trim().toLowerCase();
  return value === 'admin' || value === 'ادمین' || /^\/admin(?:@[-_a-z0-9]+)?$/.test(value);
}

async function upsert(env: Env, token: string, chatId: number, messageId: number | undefined, text: string, keyboard: Keyboard): Promise<number | undefined> {
  return upsertTelegramTextMenu(env, token, tg, chatId, messageId, {
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
