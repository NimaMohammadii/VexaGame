import type { Env } from './types';
import { getMandatoryChannelConfig, resolveMandatoryChannel, saveMandatoryChannelConfig, setMandatoryChannelEnabled, setMandatoryChannelScope } from './mandatory-channel';
import { upsertTelegramTextMenu } from './telegram-menu-state';

type Message = { message_id: number; text?: string; chat: { id: number }; from?: { id: number } };
type Callback = { id: string; data?: string; from: { id: number }; message?: { message_id: number; chat: { id: number } } };
type Update = { message?: Message; callback_query?: Callback };
type Button = { text: string; callback_data: string };

const INPUT_PREFIX = 'admin:mandatory-channel-input:';

export async function handleMandatoryChannelAdminRequest(request: Request, env: Env): Promise<Response | null> {
  if (request.method !== 'POST' || new URL(request.url).pathname !== '/telegram/webhook') return null;
  const update = await request.clone().json().catch(() => null) as Update | null;
  if (!update || !env.BOT_TOKEN) return null;

  if (update.callback_query) return handleCallback(env, env.BOT_TOKEN, update.callback_query);
  if (update.message) return handleMessage(env, env.BOT_TOKEN, update.message);
  return null;
}

async function handleCallback(env: Env, token: string, callback: Callback): Promise<Response | null> {
  const data = String(callback.data || '');
  if (data !== 'botadmin:mandatorychannel'
    && data !== 'botadmin:mandatorychannel:refresh'
    && data !== 'botadmin:mandatorychannel:set'
    && data !== 'botadmin:mandatorychannel:on'
    && data !== 'botadmin:mandatorychannel:off'
    && data !== 'botadmin:mandatorychannel:scope:app'
    && data !== 'botadmin:mandatorychannel:scope:bot'
    && data !== 'botadmin:mandatorychannel:scope:both') return null;
  if (!isAdmin(env, callback.from.id)) return ok();

  await tg(token, 'answerCallbackQuery', { callback_query_id: callback.id }).catch(() => undefined);
  const chatId = callback.message?.chat.id ?? callback.from.id;
  const messageId = callback.message?.message_id;

  if (data === 'botadmin:mandatorychannel:set') {
    await env.BOT_CACHE.put(inputKey(callback.from.id), '1', { expirationTtl: 900 });
    await upsertTelegramTextMenu(env, token, tg, chatId, messageId, {
      text: [
        '📢 تنظیم کانال عضویت اجباری',
        '',
        'آیدی کانال را بفرستید.',
        'فرمت‌های قابل قبول:',
        '• @username',
        '• https://t.me/username',
        '• آیدی عددی کانال',
        '',
        '⚠️ ربات باید داخل کانال Admin باشد تا عضویت کاربران قابل بررسی باشد.',
      ].join('\n'),
      reply_markup: { inline_keyboard: [[{ text: '⬅️ بازگشت', callback_data: 'botadmin:mandatorychannel' }]] },
    });
    return ok();
  }

  await env.BOT_CACHE.delete(inputKey(callback.from.id)).catch(() => undefined);
  try {
    if (data === 'botadmin:mandatorychannel:on') await setMandatoryChannelEnabled(env, true);
    if (data === 'botadmin:mandatorychannel:off') await setMandatoryChannelEnabled(env, false);
    if (data === 'botadmin:mandatorychannel:scope:app') await setMandatoryChannelScope(env, 'app');
    if (data === 'botadmin:mandatorychannel:scope:bot') await setMandatoryChannelScope(env, 'bot');
    if (data === 'botadmin:mandatorychannel:scope:both') await setMandatoryChannelScope(env, 'both');
    await sendMenu(env, token, chatId, messageId);
  } catch (error) {
    await sendMenu(env, token, chatId, messageId, `❌ ${error instanceof Error ? error.message : 'ذخیره تنظیمات ناموفق بود.'}`);
  }
  return ok();
}

async function handleMessage(env: Env, token: string, message: Message): Promise<Response | null> {
  const userId = message.from?.id;
  if (!userId || !isAdmin(env, userId)) return null;
  const waiting = await env.BOT_CACHE.get(inputKey(userId)).catch(() => null);
  if (!waiting) return null;

  await tg(token, 'deleteMessage', { chat_id: message.chat.id, message_id: message.message_id }).catch(() => undefined);
  const text = String(message.text || '').trim();
  if (text === '/cancel' || text === 'لغو') {
    await env.BOT_CACHE.delete(inputKey(userId)).catch(() => undefined);
    await sendMenu(env, token, message.chat.id);
    return ok();
  }
  if (!text) {
    await promptAgain(env, token, message.chat.id, '❌ آیدی کانال را به‌صورت متن بفرستید.');
    return ok();
  }

  try {
    const config = await resolveMandatoryChannel(env, text);
    await saveMandatoryChannelConfig(env, config);
    await env.BOT_CACHE.delete(inputKey(userId)).catch(() => undefined);
    await sendMenu(env, token, message.chat.id, undefined, `✅ کانال «${config.title}» ذخیره و عضویت اجباری فعال شد.`);
  } catch (error) {
    await promptAgain(env, token, message.chat.id, `❌ ${error instanceof Error ? error.message : 'تنظیم کانال ناموفق بود.'}`);
  }
  return ok();
}

async function promptAgain(env: Env, token: string, chatId: number, notice: string): Promise<void> {
  await upsertTelegramTextMenu(env, token, tg, chatId, undefined, {
    text: `${notice}\n\n📢 آیدی کانال را دوباره بفرستید.\nمثال: @VexaChannel`,
    reply_markup: { inline_keyboard: [[{ text: '⬅️ بازگشت', callback_data: 'botadmin:mandatorychannel' }]] },
  });
}

async function sendMenu(env: Env, token: string, chatId: number, messageId?: number, notice = ''): Promise<void> {
  const config = await getMandatoryChannelConfig(env);
  const enabled = config?.enabled === true;
  const scope = config?.scope ?? 'both';
  const scopeLabel = scope === 'app' ? 'فقط Mini App' : scope === 'bot' ? 'فقط منوی ربات' : 'Mini App و ربات';
  const lines = config
    ? [
      `وضعیت: ${enabled ? '🟢 فعال' : '⚪️ غیرفعال'}`,
      `اعمال روی: ${scopeLabel}`,
      `کانال: ${config.title}`,
      `آیدی: ${config.username ? '@' + config.username : config.chatId}`,
    ]
    : ['وضعیت: ⚪️ تنظیم نشده', 'هنوز کانالی انتخاب نشده است.'];
  const rows: Button[][] = [
    [{ text: config ? '✏️ تغییر کانال' : '➕ تنظیم کانال', callback_data: 'botadmin:mandatorychannel:set' }],
  ];
  if (config) {
    rows.push([
      { text: `${scope === 'app' ? '✓ ' : ''}📱 فقط App`, callback_data: 'botadmin:mandatorychannel:scope:app' },
      { text: `${scope === 'bot' ? '✓ ' : ''}🤖 فقط ربات`, callback_data: 'botadmin:mandatorychannel:scope:bot' },
    ]);
    rows.push([{ text: `${scope === 'both' ? '✓ ' : ''}🔗 هر دو`, callback_data: 'botadmin:mandatorychannel:scope:both' }]);
    rows.push([{ text: enabled ? '⏸ غیرفعال کردن' : '▶️ فعال کردن', callback_data: enabled ? 'botadmin:mandatorychannel:off' : 'botadmin:mandatorychannel:on' }]);
  }
  rows.push([
    { text: '🔄 بروزرسانی', callback_data: 'botadmin:mandatorychannel:refresh' },
    { text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' },
  ]);
  await upsertTelegramTextMenu(env, token, tg, chatId, messageId, {
    text: `${notice ? notice + '\n\n' : ''}📢 عضویت اجباری کانال\n\n${lines.join('\n')}\n\nوقتی فعال باشد، کاربر قبل از منوی اصلی ربات و استفاده از Mini App باید عضو این کانال باشد.`,
    reply_markup: { inline_keyboard: rows },
  });
}

function inputKey(userId: number): string { return `${INPUT_PREFIX}${userId}`; }

function isAdmin(env: Env, userId: unknown): boolean {
  return String(env.BOT_ADMIN || '').split(/[\s,;]+/).map((value) => value.trim()).filter(Boolean).includes(String(userId || ''));
}

async function tg(token: string, method: string, payload: unknown): Promise<unknown> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({})) as { ok?: boolean; description?: string };
  if (!response.ok || !data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data;
}

function ok(): Response { return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } }); }
