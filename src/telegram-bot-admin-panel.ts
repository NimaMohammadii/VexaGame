import { adminUsersJson, resetUserEverywhere } from './admin-users';
import { sendAdminHome as sendCurrentAdminHome } from './telegram-section-access-admin';
import { PUBLIC_BASE_URL } from './utils';
import type { Env, TelegramCallbackQuery, TelegramMessage } from './types';
import { getUserControls, setUserBanned, setUserSectionBlocked, setUserTonBalance, setUserWinChance } from './user-controls';
import { formatTonAmount, getFinanceLimits, getFinanceStats, setFinanceLimits, tonToNano } from './admin-finance-controls';
import { getTelegramMenuMessageId, setTelegramMenuMessageId } from './telegram-menu-state';
import { DEFAULT_VEXA_LOCALE, SHARE_INVITE_BUTTON_TEXT, VEXA_APP_DEEP_LINK, VEXA_LOCALES, VEXA_LOCALE_LABELS, type VexaLocale, vexaLocaleForCountry } from './miniapp/i18n';

type TgApi = <T = unknown>(token: string, method: string, payload: unknown) => Promise<T>;
type AdminUser = Record<string, unknown> & { id?: unknown; firstName?: unknown; username?: unknown; tonBalance?: unknown; tonBalanceNano?: unknown; currentSection?: unknown; status?: unknown; level?: unknown; xp?: unknown; rankName?: unknown; regionCode?: unknown; languageCode?: unknown; regionLabel?: unknown; returnCount?: unknown };
type AdminState = {
  mode: 'win' | 'credit' | 'message' | 'broadcast' | 'limit' | 'search' | 'channel-link' | 'channel-destination' | 'channel-button-text' | 'channel-content';
  userId?: string;
  page?: number;
  list?: string;
  locales?: string[];
  miniAppButton?: boolean;
  menuMessageId?: number;
  channelChatId?: string;
  channelTitle?: string;
  channelUsername?: string;
  destination?: string;
  buttonText?: string;
};
type TelegramSentMessage = { message_id?: number };
type TelegramChatInfo = { id?: number | string; type?: string; title?: string; username?: string };
type ChannelPostSettings = { chatId: string; title: string; username?: string };
type RegionConfig = { code: string; label: string; language: string; timezone: string };
type RegionSettings = { startPromptEnabled: boolean; commandEnabled: boolean; defaultRegionCode: string | null };

const PAGE_SIZE = 8;
const NANO = 1_000_000_000;
const REGION_SETTINGS_KEY = 'admin:bot-region-settings';
const CHANNEL_POST_SETTINGS_KEY = 'admin:channel-post-settings';
const CHANNEL_DESTINATIONS = [
  ['home', '🏠 Home'],
  ['predictzone', '🔮 Predict'],
  ['playzone', '🎮 Play Hub'],
] as const;
const CHANNEL_GAMES = [
  ['mines', 'Mines'], ['plinko', 'Plinko'], ['wheel', 'Wheel'],
  ['slot', 'Slot'], ['ghostrun', 'Ghost Run'], ['crash', 'Crash'],
  ['dice', 'Dice'], ['hilo', 'Chicken Cross'], ['coinflip', 'Pump'],
] as const;
const CHANNEL_DESTINATION_IDS = new Set<string>([
  ...CHANNEL_DESTINATIONS.map(([id]) => id),
  ...CHANNEL_GAMES.map(([id]) => id),
]);
const REGIONS: RegionConfig[] = [
  { code: 'US', label: '🇺🇸 United States', language: 'en', timezone: 'America/New_York' },
  { code: 'RU', label: '🇷🇺 Russia', language: 'ru', timezone: 'Europe/Moscow' },
  { code: 'UA', label: '🇺🇦 Ukraine', language: 'uk', timezone: 'Europe/Kyiv' },
  { code: 'CN', label: '🇨🇳 China', language: 'zh', timezone: 'Asia/Shanghai' },
  { code: 'GB', label: '🇬🇧 United Kingdom', language: 'en', timezone: 'Europe/London' },
  { code: 'DE', label: '🇩🇪 Germany', language: 'de', timezone: 'Europe/Berlin' },
  { code: 'IR', label: '🇮🇷 Iran', language: 'fa', timezone: 'Asia/Tehran' },
  { code: 'AU', label: '🇦🇺 Australia', language: 'en', timezone: 'Australia/Sydney' },
  { code: 'JP', label: '🇯🇵 Japan', language: 'ja', timezone: 'Asia/Tokyo' },
  { code: 'KR', label: '🇰🇷 South Korea', language: 'ko', timezone: 'Asia/Seoul' },
  { code: 'BR', label: '🇧🇷 Brazil', language: 'pt', timezone: 'America/Sao_Paulo' },
  { code: 'AE', label: '🇦🇪 Middle East', language: 'ar', timezone: 'Asia/Dubai' },
  { code: 'TR', label: '🇹🇷 Turkey', language: 'tr', timezone: 'Europe/Istanbul' },
  { code: 'IN', label: '🇮🇳 India', language: 'en', timezone: 'Asia/Kolkata' },
  { code: 'ID', label: '🇮🇩 Indonesia', language: 'id', timezone: 'Asia/Jakarta' },
  { code: 'EU', label: '🇪🇺 Europe', language: 'en', timezone: 'Europe/Berlin' },
  { code: 'ASIA', label: '🌏 Asia', language: 'en', timezone: 'Asia/Singapore' },
  { code: 'AM', label: '🌎 Americas', language: 'en', timezone: 'America/New_York' },
  { code: 'AF', label: '🌍 Africa', language: 'en', timezone: 'Africa/Lagos' },
  { code: 'OTHER', label: '🌐 Other', language: 'en', timezone: 'UTC' },
];
const SECTIONS: Array<[string, string]> = [
  ['home', 'خانه'], ['connect', 'اتصال'], ['playzone', 'بازی‌ها'], ['plinko', 'پلینکو'], ['mines', 'ماینز'], ['crash', 'کرش'], ['wheel', 'ویل'], ['dice', 'تاس'],  ['slot', 'اسلات'], ['ghostrun', 'گوست ران'],
];

export async function handleBotAdminMessage(env: Env, token: string, message: TelegramMessage, tg: TgApi): Promise<boolean> {
  const text = message.text?.trim() ?? '';
  if (!env.BOT_ADMIN && isAdminCommand(text)) {
    await tg(token, 'sendMessage', { chat_id: message.chat.id, text: 'پنل ادمین هنوز تنظیم نشده است. مقدار BOT_ADMIN را برابر آیدی عددی تلگرام ادمین قرار بدهید.' }).catch(() => undefined);
    return true;
  }
  if (!isBotAdmin(env, message.from?.id)) return false;
  const state = await getAdminState(env, message.from?.id);
  if (state && !isAdminCommand(text)) return handleStateMessage(env, token, message, tg, state);
  if (!isAdminCommand(text)) return false;
  await clearAdminState(env, message.from?.id);
  await cleanupAdminInput(token, tg, message);
  await sendAdminHome(env, token, message.chat.id, tg);
  return true;
}

export async function handleBotAdminCallback(env: Env, token: string, q: TelegramCallbackQuery, tg: TgApi): Promise<boolean> {
  const data = q.data ?? '';
  if (!data.startsWith('botadmin:')) return false;
  if (!isBotAdmin(env, q.from.id)) return true;
  await tg(token, 'answerCallbackQuery', { callback_query_id: q.id }).catch(() => undefined);
  const chatId = q.message?.chat.id ?? q.from.id;
  const messageId = q.message?.message_id;
  const parts = data.split(':');
  const action = parts[1] || '';
  const id = parts[2] || '';
  const arg = parts[3] || '';
  const pageArg = Number(parts[4]) || 0;
  const pendingState = action.startsWith('channel') ? await getAdminState(env, q.from.id) : null;
  await clearAdminState(env, q.from.id);
  if (action === 'home') return sendAdminHome(env, token, chatId, tg, messageId);
  if (action === 'channelpost') return sendChannelPostMenu(env, token, chatId, tg, q.from.id, messageId);
  if (action === 'channelchange') return promptChannelLink(env, token, chatId, tg, q.from.id, messageId);
  if (action === 'channelcompose') return beginChannelComposition(env, token, chatId, tg, q.from.id, messageId);
  if (action === 'channeldestination') return chooseChannelDestination(env, token, chatId, tg, q.from.id, pendingState, id, messageId);
  if (action === 'channelbutton') return chooseChannelButton(env, token, chatId, tg, q.from.id, pendingState, id === 'yes', messageId);
  if (action === 'users') return sendUsersList(env, token, chatId, tg, Number(id) || 0, messageId);
  if (action === 'returns') return sendReturnUsersMenu(env, token, chatId, tg, messageId);
  if (action === 'asksearch') return promptAdminInput(env, token, chatId, tg, q.from.id, { mode: 'search', list: returnListKey(id) }, searchPrompt(returnListKey(id)), messageId);
  if (action === 'returnusers') return sendUsersList(env, token, chatId, tg, pageArg || 0, messageId, returnListKey(id));
  if (action === 'page') return sendUsersList(env, token, chatId, tg, Number(id) || 0, messageId, returnListKey(arg));
  if (action === 'user') return sendUserPanel(env, token, chatId, tg, id, messageId, Number(arg) || 0, returnListKey(parts[4] || 'all'));
  if (action === 'back') return sendUsersList(env, token, chatId, tg, Number(id) || 0, messageId, returnListKey(arg));
  if (action === 'askwin') return promptAdminInput(env, token, chatId, tg, q.from.id, { mode: 'win', userId: id, page: Number(arg) || 0, list: returnListKey(parts[4] || 'all') }, 'درصد شانس برد را به عدد ۰ تا ۱۰۰ بفرستید.', messageId);
  if (action === 'askcredit') return promptAdminInput(env, token, chatId, tg, q.from.id, { mode: 'credit', userId: id, page: Number(arg) || 0, list: returnListKey(parts[4] || 'all') }, 'مقدار تغییر کردیت/TON را با علامت مثبت یا منفی بفرستید. مثال: +1.5 یا -0.25', messageId);
  if (action === 'askmsg') return promptAdminInput(env, token, chatId, tg, q.from.id, { mode: 'message', userId: id, page: Number(arg) || 0, list: returnListKey(parts[4] || 'all') }, 'پیام تکی کاربر را بفرستید: متن، عکس با کپشن، ویدیو، ویس/صوت یا فایل.', messageId);
  if (action === 'askbroadcast') return sendBroadcastOptions(env, token, chatId, tg, q.from.id, messageId);
  if (action === 'ban') return toggleUserBan(env, token, chatId, tg, id, arg === 'on', messageId, pageArg);
  if (action === 'financestats') return sendFinanceStatsPanel(env, token, chatId, tg, messageId);
  if (action === 'financelimits') return sendFinanceLimitsPanel(env, token, chatId, tg, messageId);
  if (action === 'asklimit') return promptAdminInput(env, token, chatId, tg, q.from.id, { mode: 'limit', userId: id }, limitPrompt(id), messageId);
  if (action === 'regionsettings') return sendRegionSettingsPanel(env, token, chatId, tg, messageId);
  if (action === 'togglestartregion') return updateRegionSettings(env, token, chatId, tg, messageId, { startPromptEnabled: id !== 'off' });
  if (action === 'toggleregioncmd') return updateRegionSettings(env, token, chatId, tg, messageId, { commandEnabled: id !== 'off' });
  if (action === 'setdefaultregion') return updateRegionSettings(env, token, chatId, tg, messageId, { defaultRegionCode: regionByCode(id)?.code ?? null });
  if (action === 'broadcastlocale') return promptAdminInput(env, token, chatId, tg, q.from.id, { mode: 'broadcast', locales: normalizeBroadcastLocales(id), miniAppButton: arg !== 'nobutton' }, broadcastPrompt(normalizeBroadcastLocales(id), arg !== 'nobutton'), messageId);
  if (action === 'report') return sendUserReportPdf(env, token, chatId, tg, id);
  if (action === 'block') return toggleSection(env, token, chatId, tg, id, arg, messageId, pageArg);
  if (action === 'reset') return resetUser(env, token, chatId, tg, id, messageId);
  return true;
}

function isAdminCommand(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return normalized === 'admin' || normalized === 'ادمین' || /^\/admin(?:@[-_a-z0-9]+)?$/.test(normalized);
}

function isBotAdmin(env: Env, userId: unknown): boolean {
  const admins = String(env.BOT_ADMIN ?? '').split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean);
  return admins.includes(String(userId ?? ''));
}

async function sendAdminHome(env: Env, token: string, chatId: number, tg: TgApi, messageId?: number): Promise<true> {
  void tg;
  await sendCurrentAdminHome(env, token, chatId, messageId);
  return true;
}

async function sendReturnUsersMenu(env: Env, token: string, chatId: number, tg: TgApi, messageId?: number): Promise<true> {
  const data = await adminUsersJson(env);
  const counts = (data.users as AdminUser[]).reduce<Record<string, number>>((acc, user) => { const key = returnListKeyByUser(user); acc[key] = (acc[key] || 0) + 1; return acc; }, {});
  const text = ['↩️ بخش کاربران برگشتی', '', 'کاربران برگشتی اینجا جدا از منوی اصلی دسته‌بندی شده‌اند:', `• فقط ۲ بار: ${counts.r2 || 0} نفر`, `• فقط ۳ بار: ${counts.r3 || 0} نفر`, `• فقط ۴ بار: ${counts.r4 || 0} نفر`, `• بیشتر از ۵ بار: ${counts.r5p || 0} نفر`].join('\n');
  const rows = [
    [{ text: '↩️ فقط ۲ بار', callback_data: 'botadmin:returnusers:r2:x:0' }],
    [{ text: '↩️ فقط ۳ بار', callback_data: 'botadmin:returnusers:r3:x:0' }, { text: '↩️ فقط ۴ بار', callback_data: 'botadmin:returnusers:r4:x:0' }],
    [{ text: '↩️ بیشتر از ۵ بار', callback_data: 'botadmin:returnusers:r5p:x:0' }],
    [{ text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' }],
  ];
  await upsertMessage(env, token, tg, chatId, messageId, text, rows);
  return true;
}

async function sendRegionSettingsPanel(env: Env, token: string, chatId: number, tg: TgApi, messageId?: number): Promise<true> {
  const settings = await getBotRegionSettings(env);
  const defaultRegion = settings.defaultRegionCode ? regionByCode(settings.defaultRegionCode) : null;
  const text = [
    '🌍 Region Settings',
    '',
    `Start region prompt: ${settings.startPromptEnabled ? 'Enabled' : 'Disabled'}`,
    `Default direct region: ${defaultRegion ? defaultRegion.label : 'Not selected'}`,
    `/region command: ${settings.commandEnabled ? 'Enabled' : 'Disabled'}`,
    '',
    'If the prompt is disabled and a default region is selected, new users go directly to the bot menu with that region.',
  ].join('\n');
  const rows = [
    [{ text: `${settings.startPromptEnabled ? '❌' : '✅'} Show region prompt on /start`, callback_data: `botadmin:togglestartregion:${settings.startPromptEnabled ? 'off' : 'on'}` }],
    [{ text: `${settings.commandEnabled ? '✅' : '❌'} /region command`, callback_data: `botadmin:toggleregioncmd:${settings.commandEnabled ? 'off' : 'on'}` }],
    [{ text: `Default: ${defaultRegion ? defaultRegion.label : 'Not selected'}`, callback_data: 'botadmin:regionsettings' }],
    ...chunk(REGIONS.map((region) => ({ text: `${settings.defaultRegionCode === region.code ? '✔️ ' : ''}${region.label}`, callback_data: `botadmin:setdefaultregion:${region.code}` })), 2),
    [{ text: 'Clear default region', callback_data: 'botadmin:setdefaultregion:CLEAR' }],
    [{ text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' }],
  ];
  await upsertMessage(env, token, tg, chatId, messageId, text, rows);
  return true;
}

async function updateRegionSettings(env: Env, token: string, chatId: number, tg: TgApi, messageId: number | undefined, patch: Partial<RegionSettings>): Promise<true> {
  const current = await getBotRegionSettings(env);
  const next = { ...current, ...patch };
  if (next.defaultRegionCode && !regionByCode(next.defaultRegionCode)) next.defaultRegionCode = null;
  await ensureAdminSettings(env);
  await env.DB.prepare(`INSERT INTO admin_settings (name, value_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(name) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`)
    .bind(REGION_SETTINGS_KEY, JSON.stringify(next))
    .run();
  return sendRegionSettingsPanel(env, token, chatId, tg, messageId);
}

export async function getBotRegionSettings(env: Env): Promise<RegionSettings> {
  const fallback: RegionSettings = { startPromptEnabled: true, commandEnabled: true, defaultRegionCode: null };
  try {
    await ensureAdminSettings(env);
    const row = await env.DB.prepare('SELECT value_json FROM admin_settings WHERE name = ?').bind(REGION_SETTINGS_KEY).first<{ value_json: string }>();
    const parsed = JSON.parse(row?.value_json || '{}') as Partial<RegionSettings>;
    const defaultRegion = parsed.defaultRegionCode ? regionByCode(String(parsed.defaultRegionCode)) : null;
    return { startPromptEnabled: parsed.startPromptEnabled !== false, commandEnabled: parsed.commandEnabled !== false, defaultRegionCode: defaultRegion?.code ?? null };
  } catch { return fallback; }
}

async function ensureAdminSettings(env: Env): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_settings (
    name TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run().catch(() => undefined);
}

function regionByCode(code: string): RegionConfig | null {
  const cleaned = String(code || '').trim().toUpperCase();
  return REGIONS.find((region) => region.code === cleaned) ?? null;
}

async function sendUsersList(env: Env, token: string, chatId: number, tg: TgApi, page: number, messageId?: number, list: string = 'all'): Promise<true> {
  const data = await adminUsersJson(env);
  const users = usersForList(data.users as AdminUser[], list);
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  const current = Math.min(Math.max(0, page), totalPages - 1);
  const rows = users.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE).map((u) => [{ text: userButtonText(u), callback_data: `botadmin:user:${cleanId(u.id)}:${current}:${list}` }]);
  const nav = [];
  if (current > 0) nav.push({ text: 'قبلی', callback_data: `botadmin:page:${current - 1}:${list}` });
  nav.push({ text: '🔎 سرچ کاربر', callback_data: `botadmin:asksearch:${list}` });
  if (current < totalPages - 1) nav.push({ text: 'بعدی', callback_data: `botadmin:page:${current + 1}:${list}` });
  rows.push(nav, [{ text: list === 'all' ? '⬅️ منوی اصلی' : '⬅️ بخش برگشتی‌ها', callback_data: list === 'all' ? 'botadmin:home' : 'botadmin:returns' }]);
  await upsertMessage(env, token, tg, chatId, messageId, usersListTitle(list, users.length), rows);
  return true;
}

async function sendUserPanel(env: Env, token: string, chatId: number, tg: TgApi, userId: string, messageId?: number, page = 0, list: string = 'all'): Promise<true> {
  const [data, controls] = await Promise.all([adminUsersJson(env), getUserControls(env, userId)]);
  const user = (data.users as AdminUser[]).find((item) => cleanId(item.id) === userId) || { id: userId };
  const blocked = new Set(controls.blockedSections || []);
  const sectionButtons = SECTIONS.map(([section, label]) => ({ text: `${blocked.has(section) ? '🔒' : '🔓'} ${label}`, callback_data: `botadmin:block:${userId}:${section}:${page}` }));
  const rows = [
    [{ text: `${controls.banned ? '✅ آن‌بن کاربر' : '🚫 بن کاربر'}`, callback_data: `botadmin:ban:${userId}:${controls.banned ? 'off' : 'on'}:${page}` }],
    [{ text: '🎲 تنظیم شانس برد', callback_data: `botadmin:askwin:${userId}:${page}:${list}` }],
    [{ text: '💎 Change Credit', callback_data: `botadmin:askcredit:${userId}:${page}:${list}` }],
    [{ text: '✉️ پیام تکی در چت ربات', callback_data: `botadmin:askmsg:${userId}:${page}:${list}` }],
    [{ text: '📄 دانلود PDF گزارش کامل کاربر', callback_data: `botadmin:report:${userId}` }],
    ...chunk(sectionButtons, 3),
    [{ text: '🧹 ریست کامل کاربر', callback_data: `botadmin:reset:${userId}` }],
    [{ text: 'بازگشت به لیست کاربران', callback_data: `botadmin:back:${page}:${list}` }],
  ];
  const text = ['👤 مدیریت کاربر در پنل ربات گیم', '', `نام: ${cleanText(user.firstName, '—')}`, `یوزرنیم: ${cleanText(user.username, '—')}`, `آیدی: ${userId}`, `رجین: ${cleanText(user.regionLabel, cleanText(user.regionCode, 'نامشخص'))}`, `وضعیت: ${controls.banned ? 'Banned' : cleanText(user.status, '—')}`, `بخش فعلی: ${cleanText(user.currentSection, '—')}`, `دفعات ورود/برگشت: ${returnCount(user)}`, `موجودی: ${formatTon(controls.tonBalanceNano)} TON`, `شانس برد بازی: ${controls.winChancePercent}%`, `سطح: ${cleanText(user.level, '1')} - ${cleanText(user.rankName, 'Starter')} (${cleanText(user.xp, '0')} XP)`, '', 'قفل بخش‌ها سه‌تایی چیده شده‌اند؛ با هر کلیک قفل/باز می‌شوند.'].join('\n');
  await upsertMessage(env, token, tg, chatId, messageId, text, rows);
  return true;
}

async function promptAdminInput(env: Env, token: string, chatId: number, tg: TgApi, adminId: unknown, state: AdminState, text: string, messageId?: number): Promise<true> {
  const menuMessageId = messageId ?? await getAdminMenuMessageId(env, chatId);
  await setAdminState(env, adminId, { ...state, menuMessageId });
  const back = state.userId ? `botadmin:user:${state.userId}:${state.page || 0}:${state.list || 'all'}` : 'botadmin:home';
  await upsertMessage(env, token, tg, chatId, messageId, text, [[{ text: 'لغو و بازگشت', callback_data: back }]]);
  return true;
}

async function handleStateMessage(env: Env, token: string, message: TelegramMessage, tg: TgApi, state: AdminState): Promise<true> {
  if (state.mode === 'channel-link') {
    const target = normalizeChannelTarget(message.text);
    if (!target) return sendChannelStateError(env, token, tg, message, state, 'لینک عمومی کانال، @username یا آیدی عددی کانال را بفرستید.');
    try {
      const chat = await tg<TelegramChatInfo>(token, 'getChat', { chat_id: target });
      if (chat.type !== 'channel' || chat.id === undefined) throw new Error('این آدرس مربوط به کانال نیست.');
      const settings: ChannelPostSettings = {
        chatId: String(chat.id),
        title: String(chat.title || chat.username || target).trim().slice(0, 120),
        ...(chat.username ? { username: String(chat.username).replace(/^@/, '').slice(0, 64) } : {}),
      };
      await saveChannelPostSettings(env, settings);
      await clearAdminState(env, message.from?.id);
      await cleanupAdminInput(token, tg, message);
      return sendChannelPostMenu(env, token, message.chat.id, tg, message.from?.id, state.menuMessageId, '✅ کانال ذخیره شد.');
    } catch (error) {
      return sendChannelStateError(env, token, tg, message, state, error instanceof Error ? error.message : 'کانال پیدا نشد یا ربات به آن دسترسی ندارد.');
    }
  }
  if (state.mode === 'channel-button-text') {
    const buttonText = String(message.text || '').trim();
    if (!buttonText || Array.from(buttonText).length > 64) {
      return sendChannelStateError(env, token, tg, message, state, 'متن دکمه باید بین ۱ تا ۶۴ کاراکتر باشد.');
    }
    await cleanupAdminInput(token, tg, message);
    return promptChannelContent(env, token, message.chat.id, tg, message.from?.id, { ...state, mode: 'channel-content', miniAppButton: true, buttonText }, state.menuMessageId);
  }
  if (state.mode === 'channel-content') {
    try {
      await copyAdminMessageToChannel(token, tg, message, state);
      await clearAdminState(env, message.from?.id);
      await cleanupAdminInput(token, tg, message);
      const channel = state.channelUsername ? `@${state.channelUsername}` : state.channelTitle || state.channelChatId || 'کانال';
      await upsertMessage(env, token, tg, message.chat.id, state.menuMessageId, `✅ پیام با موفقیت در ${channel} منتشر شد.`, [
        [{ text: '📝 ارسال پیام دیگر', callback_data: 'botadmin:channelcompose' }],
        [{ text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' }],
      ]);
      return true;
    } catch (error) {
      await cleanupAdminInput(token, tg, message);
      await setAdminState(env, message.from?.id, state);
      return sendChannelStateError(env, token, tg, message, state, error instanceof Error ? error.message : 'ارسال پیام به کانال ناموفق بود.');
    }
  }
  if (state.mode === 'win' && state.userId) {
    const value = Number((message.text || '').replace(/[٪%]/g, '').trim());
    if (!Number.isFinite(value)) return sendStateError(env, token, tg, message, state, 'عدد شانس برد معتبر نیست.');
    await clearAdminState(env, message.from?.id);
    await setUserWinChance(env, state.userId, value);
    await cleanupAdminInput(token, tg, message);
    return sendUserPanel(env, token, message.chat.id, tg, state.userId, state.menuMessageId, state.page || 0, state.list || 'all');
  }
  if (state.mode === 'credit' && state.userId) {
    const delta = parseTonDelta(message.text || '');
    if (delta === null) return sendStateError(env, token, tg, message, state, 'عدد تغییر کردیت معتبر نیست. مثال: +1 یا -0.25');
    await clearAdminState(env, message.from?.id);
    const controls = await getUserControls(env, state.userId);
    await setUserTonBalance(env, state.userId, Math.max(0, controls.tonBalanceNano + delta), { title: 'Telegram bot admin credit change', metadata: { source: 'telegram_bot_admin', deltaNano: delta } });
    await cleanupAdminInput(token, tg, message);
    return sendUserPanel(env, token, message.chat.id, tg, state.userId, state.menuMessageId, state.page || 0, state.list || 'all');
  }
  if (state.mode === 'message' && state.userId) {
    await clearAdminState(env, message.from?.id);
    await copyAdminMessageToChat(token, tg, message, state.userId);
    await cleanupAdminInput(token, tg, message);
    return sendUserPanel(env, token, message.chat.id, tg, state.userId, state.menuMessageId, state.page || 0, state.list || 'all');
  }
  if (state.mode === 'limit' && state.userId) {
    const value = tonToNano(message.text || '');
    await clearAdminState(env, message.from?.id);
    await setFinanceLimits(env, { [state.userId]: value } as Record<string, number>);
    await cleanupAdminInput(token, tg, message);
    return sendFinanceLimitsPanel(env, token, message.chat.id, tg, state.menuMessageId);
  }
  if (state.mode === 'broadcast') {
    await clearAdminState(env, message.from?.id);
    const data = await adminUsersJson(env);
    const locales = normalizeBroadcastLocales(state.locales || 'ALL');
    let sent = 0;
    for (const user of (data.users as AdminUser[]).filter((item) => localeMatches(item, locales))) {
      const id = cleanId(user.id);
      if (!id) continue;
      try { await copyAdminMessageToChat(token, tg, message, id, state.miniAppButton !== false, broadcastMiniAppButtonText(user)); sent++; } catch (_) { /* ignore blocked users */ }
    }
    await cleanupAdminInput(token, tg, message);
    return sendAdminHome(env, token, message.chat.id, tg, state.menuMessageId);
  }
  if (state.mode === 'search') {
    await clearAdminState(env, message.from?.id);
    await cleanupAdminInput(token, tg, message);
    return sendSearchResults(env, token, message.chat.id, tg, message.text || '', state.list || 'all', state.menuMessageId);
  }
  return true;
}

async function sendSearchResults(env: Env, token: string, chatId: number, tg: TgApi, query: string, list: string = 'all', messageId?: number): Promise<true> {
  const users = usersForList((await adminUsersJson(env)).users as AdminUser[], list).filter((user) => userMatchesSearch(user, query)).slice(0, 25);
  const rows = users.map((u) => [{ text: userButtonText(u), callback_data: `botadmin:user:${cleanId(u.id)}:0:${returnListKey(list)}` }]);
  rows.push([{ text: '🔎 سرچ دوباره', callback_data: `botadmin:asksearch:${returnListKey(list)}` }], [{ text: returnListKey(list) === 'all' ? '⬅️ لیست کاربران' : '⬅️ بخش برگشتی‌ها', callback_data: returnListKey(list) === 'all' ? 'botadmin:users:0' : 'botadmin:returns' }]);
  const text = [`🔎 نتایج جستجوی کاربر`, '', `عبارت: ${cleanText(query, '—')}`, `تعداد نتیجه: ${users.length}`, '', users.length ? 'نتایج در این بخش جدا نمایش داده می‌شوند:' : 'نتیجه‌ای پیدا نشد.'].join('\n');
  await upsertMessage(env, token, tg, chatId, messageId, text, rows);
  return true;
}

async function sendStateError(env: Env, token: string, tg: TgApi, message: TelegramMessage, state: AdminState, text: string): Promise<true> {
  await cleanupAdminInput(token, tg, message);
  await upsertMessage(env, token, tg, message.chat.id, state.menuMessageId, `❌ ${text}\n\nلطفاً دوباره مقدار درست را بفرستید.`, [[{ text: 'لغو و بازگشت', callback_data: state.userId ? `botadmin:user:${state.userId}:${state.page || 0}:${state.list || 'all'}` : 'botadmin:home' }]]);
  return true;
}

async function copyAdminMessageToChat(token: string, tg: TgApi, message: TelegramMessage, targetChatId: string, miniAppButton = false, buttonText = 'Open Mini App'): Promise<void> {
  const reply_markup = miniAppButton ? { inline_keyboard: [[{ text: buttonText, web_app: { url: `${PUBLIC_BASE_URL}/app` } }]] } : undefined;
  await tg(token, 'copyMessage', { chat_id: targetChatId, from_chat_id: message.chat.id, message_id: message.message_id, ...(reply_markup ? { reply_markup } : {}) });
}

async function cleanupAdminInput(token: string, tg: TgApi, message: TelegramMessage): Promise<void> {
  await tg(token, 'deleteMessage', { chat_id: message.chat.id, message_id: message.message_id }).catch(() => undefined);
}

async function toggleUserBan(env: Env, token: string, chatId: number, tg: TgApi, userId: string, banned: boolean, messageId?: number, page = 0): Promise<true> {
  await setUserBanned(env, userId, banned);
  return sendUserPanel(env, token, chatId, tg, userId, messageId, page);
}

async function sendFinanceStatsPanel(env: Env, token: string, chatId: number, tg: TgApi, messageId?: number): Promise<true> {
  const stats = await getFinanceStats(env);
  const text = [
    '📊 آمار آنلاین و مالی',
    '',
    `امروز کاربران آنلاین: ${stats.today.onlineUsers}`,
    `امروز واریز: ${formatTonAmount(stats.today.depositNano)} TON (${stats.today.depositUsers} نفر)`,
    `امروز برداشت: ${formatTonAmount(stats.today.withdrawNano)} TON (${stats.today.withdrawUsers} نفر)`,
    '',
    `۷ روز اخیر کاربران آنلاین: ${stats.weekly.onlineUsers}`,
    `۷ روز اخیر واریز: ${formatTonAmount(stats.weekly.depositNano)} TON (${stats.weekly.depositUsers} نفر)`,
    `۷ روز اخیر برداشت: ${formatTonAmount(stats.weekly.withdrawNano)} TON (${stats.weekly.withdrawUsers} نفر)`,
  ].join('\n');
  await upsertMessage(env, token, tg, chatId, messageId, text, [[{ text: '🔄 بروزرسانی', callback_data: 'botadmin:financestats' }], [{ text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' }]]);
  return true;
}

async function sendFinanceLimitsPanel(env: Env, token: string, chatId: number, tg: TgApi, messageId?: number): Promise<true> {
  const limits = await getFinanceLimits(env);
  const text = [
    '⚙️ تنظیم حداقل و حداکثر برداشت و واریز',
    '',
    `حداقل واریز: ${formatTonAmount(limits.minDepositNano)} TON`,
    `حداکثر واریز: ${formatTonAmount(limits.maxDepositNano)} TON`,
    `حداقل برداشت: ${formatTonAmount(limits.minWithdrawNano)} TON`,
    `حداکثر برداشت: ${formatTonAmount(limits.maxWithdrawNano)} TON`,
    '',
    'برای تغییر هر مقدار، روی همان گزینه بزنید و عدد TON را ارسال کنید.',
  ].join('\n');
  const rows = [
    [{ text: 'حداقل واریز', callback_data: 'botadmin:asklimit:minDepositNano' }, { text: 'حداکثر واریز', callback_data: 'botadmin:asklimit:maxDepositNano' }],
    [{ text: 'حداقل برداشت', callback_data: 'botadmin:asklimit:minWithdrawNano' }, { text: 'حداکثر برداشت', callback_data: 'botadmin:asklimit:maxWithdrawNano' }],
    [{ text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' }],
  ];
  await upsertMessage(env, token, tg, chatId, messageId, text, rows);
  return true;
}

function limitPrompt(key: string): string {
  const labels: Record<string, string> = { minDepositNano: 'حداقل واریز', maxDepositNano: 'حداکثر واریز', minWithdrawNano: 'حداقل برداشت', maxWithdrawNano: 'حداکثر برداشت' };
  return `عدد TON برای ${labels[key] || key} را بفرستید. مثال: 10`;
}

async function toggleSection(env: Env, token: string, chatId: number, tg: TgApi, userId: string, section: string, messageId?: number, page = 0): Promise<true> {
  const controls = await getUserControls(env, userId);
  await setUserSectionBlocked(env, userId, section, !controls.blockedSections.includes(section));
  return sendUserPanel(env, token, chatId, tg, userId, messageId, page);
}

async function resetUser(env: Env, token: string, chatId: number, tg: TgApi, userId: string, messageId?: number): Promise<true> {
  await resetUserEverywhere(env, userId);
  await upsertMessage(env, token, tg, chatId, messageId, `✅ کاربر ${userId} کامل ریست شد.`, [[{ text: 'بازگشت به لیست کاربران', callback_data: 'botadmin:back:0' }]]);
  return true;
}

async function upsertMessage(env: Env, token: string, tg: TgApi, chatId: number, messageId: number | undefined, text: string, inline_keyboard: Array<Array<{ text: string; callback_data: string }>>): Promise<void> {
  const payload = { chat_id: chatId, text, reply_markup: { inline_keyboard } };
  const currentMessageId = messageId ?? await getAdminMenuMessageId(env, chatId);
  if (currentMessageId) {
    const edited = await tg(token, 'editMessageText', { ...payload, message_id: currentMessageId }).then(() => true).catch(() => false);
    if (edited) {
      await setAdminMenuMessageId(env, chatId, currentMessageId);
      return;
    }
    await tg(token, 'deleteMessage', { chat_id: chatId, message_id: currentMessageId }).catch(() => undefined);
  }
  const sent = await tg<TelegramSentMessage>(token, 'sendMessage', payload);
  if (sent?.message_id) await setAdminMenuMessageId(env, chatId, sent.message_id);
}

async function getAdminMenuMessageId(env: Env, chatId: number): Promise<number | undefined> {
  return getTelegramMenuMessageId(env, chatId);
}
async function setAdminMenuMessageId(env: Env, chatId: number, messageId: number): Promise<void> {
  await setTelegramMenuMessageId(env, chatId, messageId);
}

async function getAdminState(env: Env, adminId: unknown): Promise<AdminState | null> { return env.BOT_CACHE.get(stateKey(adminId), 'json').catch(() => null) as Promise<AdminState | null>; }
async function setAdminState(env: Env, adminId: unknown, state: AdminState): Promise<void> { await env.BOT_CACHE.put(stateKey(adminId), JSON.stringify(state), { expirationTtl: 900 }); }
async function clearAdminState(env: Env, adminId: unknown): Promise<void> { await env.BOT_CACHE.delete(stateKey(adminId)).catch(() => undefined); }
function stateKey(adminId: unknown): string { return 'botadmin:state:' + String(adminId ?? ''); }

function parseTonDelta(value: string): number | null {
  const raw = value.trim().replace(/,/g, '.');
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(raw)) return null;
  const ton = Number(raw);
  if (!Number.isFinite(ton)) return null;
  return Math.trunc(ton * NANO);
}
function userButtonText(user: AdminUser): string { return `${cleanText(user.firstName, 'بی‌نام')} | ${cleanText(user.username, 'بدون یوزرنیم')} | ${formatTon(user.tonBalanceNano)} TON | ↩️ ${returnCount(user)}`; }
function returnCount(user: AdminUser): number { return Math.max(1, Math.floor(Number(user.returnCount) || 1)); }
function returnListKey(value: unknown): string { const key = String(value || 'all').toLowerCase(); return key === 'r2' || key === 'r3' || key === 'r4' || key === 'r5p' ? key : 'all'; }
function returnListKeyByUser(user: AdminUser): string { const count = returnCount(user); return count === 2 ? 'r2' : count === 3 ? 'r3' : count === 4 ? 'r4' : count > 5 ? 'r5p' : 'all'; }
function usersForList(users: AdminUser[], list: string): AdminUser[] { const key = returnListKey(list); return users.filter((user) => key === 'all' || returnListKeyByUser(user) === key); }
function usersListTitle(list: string, count: number): string { const labels: Record<string, string> = { r2: 'فقط ۲ بار', r3: 'فقط ۳ بار', r4: 'فقط ۴ بار', r5p: 'بیشتر از ۵ بار' }; return list !== 'all' ? `↩️ کاربران برگشتی ${labels[returnListKey(list)] || ''} (${count} نفر)\nبرای مدیریت هر کاربر روی نام او بزنید.` : '👥 لیست کاربران\nبرای مدیریت هر کاربر روی نام او بزنید.'; }
function searchPrompt(list: string): string { return `عبارت سرچ را بفرستید: آیدی عددی، یوزرنیم یا اسم کاربر.\nمحدوده جستجو: ${returnListKey(list) === 'all' ? 'همه کاربران' : usersListTitle(list, 0).split(' (')[0]}`; }
function normalizedSearch(value: unknown): string { return String(value ?? '').trim().replace(/^@/, '').toLowerCase(); }
function userMatchesSearch(user: AdminUser, query: string): boolean { const q = normalizedSearch(query); if (!q) return false; return [user.id, user.username, user.firstName].some((value) => normalizedSearch(value).includes(q)); }
function chunk<T>(items: T[], size: number): T[][] { const rows: T[][] = []; for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size)); return rows; }
function cleanId(value: unknown): string { return String(value ?? '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 80); }
function cleanText(value: unknown, fallback: string): string { const text = String(value ?? '').trim(); return text && text !== '—' ? text.slice(0, 80) : fallback; }
function formatTon(value: unknown): string { const n = Math.max(0, Math.floor(Number(value) || 0)); return (n / NANO).toLocaleString('en-US', { maximumFractionDigits: 6 }); }

async function sendChannelPostMenu(env: Env, token: string, chatId: number, tg: TgApi, adminId: unknown, messageId?: number, notice = ''): Promise<true> {
  const settings = await getChannelPostSettings(env);
  if (!settings) return promptChannelLink(env, token, chatId, tg, adminId, messageId);
  const channel = settings.username ? `@${settings.username}` : settings.title;
  const text = [notice, '📨 ارسال پیام به کانال', '', `کانال فعلی: ${channel}`, '', 'می‌توانید متن، عکس با کپشن، ویدیو یا فایل ارسال کنید.'].filter(Boolean).join('\n');
  await upsertMessage(env, token, tg, chatId, messageId, text, [
    [{ text: '📝 ساخت پیام جدید', callback_data: 'botadmin:channelcompose' }],
    [{ text: '🔗 تغییر کانال', callback_data: 'botadmin:channelchange' }],
    [{ text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' }],
  ]);
  return true;
}

async function promptChannelLink(env: Env, token: string, chatId: number, tg: TgApi, adminId: unknown, messageId?: number): Promise<true> {
  const menuMessageId = messageId ?? await getAdminMenuMessageId(env, chatId);
  await setAdminState(env, adminId, { mode: 'channel-link', menuMessageId });
  await upsertMessage(env, token, tg, chatId, messageId,
    '🔗 لینک کانال را بفرستید.\n\nفرمت قابل قبول:\nhttps://t.me/channelname\n@channelname\nیا آیدی عددی کانال\n\nربات باید داخل کانال ادمین و دارای اجازه ارسال پیام باشد.',
    [[{ text: 'لغو و بازگشت', callback_data: 'botadmin:channelpost' }]],
  );
  return true;
}

async function beginChannelComposition(env: Env, token: string, chatId: number, tg: TgApi, adminId: unknown, messageId?: number): Promise<true> {
  const settings = await getChannelPostSettings(env);
  if (!settings) return promptChannelLink(env, token, chatId, tg, adminId, messageId);
  return sendChannelDestinationMenu(env, token, chatId, tg, adminId, settings, messageId);
}

async function sendChannelDestinationMenu(env: Env, token: string, chatId: number, tg: TgApi, adminId: unknown, settings: ChannelPostSettings, messageId?: number): Promise<true> {
  const menuMessageId = messageId ?? await getAdminMenuMessageId(env, chatId);
  await setAdminState(env, adminId, { mode: 'channel-destination', menuMessageId, ...channelState(settings) });
  await upsertMessage(env, token, tg, chatId, messageId, 'مقصد دکمه داخل اپ را انتخاب کنید.', [
    ...CHANNEL_DESTINATIONS.map(([id, label]) => [{ text: label, callback_data: `botadmin:channeldestination:${id}` }]),
    [{ text: '🕹 انتخاب یکی از بازی‌ها', callback_data: 'botadmin:channeldestination:games' }],
    [{ text: '⬅️ بازگشت', callback_data: 'botadmin:channelpost' }],
  ]);
  return true;
}

async function sendChannelGameMenu(env: Env, token: string, chatId: number, tg: TgApi, adminId: unknown, settings: ChannelPostSettings, messageId?: number): Promise<true> {
  const menuMessageId = messageId ?? await getAdminMenuMessageId(env, chatId);
  await setAdminState(env, adminId, { mode: 'channel-destination', menuMessageId, ...channelState(settings) });
  await upsertMessage(env, token, tg, chatId, messageId, 'بازی مقصد را انتخاب کنید.', [
    ...chunk(CHANNEL_GAMES.map(([id, label]) => ({ text: label, callback_data: `botadmin:channeldestination:${id}` })), 2),
    [{ text: '⬅️ بازگشت', callback_data: 'botadmin:channelcompose' }],
  ]);
  return true;
}

async function chooseChannelDestination(env: Env, token: string, chatId: number, tg: TgApi, adminId: unknown, state: AdminState | null, destination: string, messageId?: number): Promise<true> {
  const settings = channelSettingsFromState(state) ?? await getChannelPostSettings(env);
  if (!settings) return promptChannelLink(env, token, chatId, tg, adminId, messageId);
  if (destination === 'games') return sendChannelGameMenu(env, token, chatId, tg, adminId, settings, messageId);
  const normalized = normalizeChannelDestination(destination);
  if (!normalized) return sendChannelDestinationMenu(env, token, chatId, tg, adminId, settings, messageId);
  const menuMessageId = messageId ?? await getAdminMenuMessageId(env, chatId);
  await setAdminState(env, adminId, { mode: 'channel-destination', menuMessageId, ...channelState(settings), destination: normalized });
  await upsertMessage(env, token, tg, chatId, messageId, `مقصد انتخاب‌شده: ${channelDestinationLabel(normalized)}\n\nآیا زیر پیام دکمه ورود به اپ قرار بگیرد؟`, [
    [{ text: '✅ با دکمه', callback_data: 'botadmin:channelbutton:yes' }],
    [{ text: 'بدون دکمه', callback_data: 'botadmin:channelbutton:no' }],
    [{ text: '⬅️ تغییر مقصد', callback_data: 'botadmin:channelcompose' }],
  ]);
  return true;
}

async function chooseChannelButton(env: Env, token: string, chatId: number, tg: TgApi, adminId: unknown, state: AdminState | null, withButton: boolean, messageId?: number): Promise<true> {
  const settings = channelSettingsFromState(state) ?? await getChannelPostSettings(env);
  const destination = normalizeChannelDestination(state?.destination);
  if (!settings || !destination) return beginChannelComposition(env, token, chatId, tg, adminId, messageId);
  if (withButton) {
    const menuMessageId = messageId ?? await getAdminMenuMessageId(env, chatId);
    await setAdminState(env, adminId, { mode: 'channel-button-text', menuMessageId, ...channelState(settings), destination, miniAppButton: true });
    await upsertMessage(env, token, tg, chatId, messageId, 'متن دلخواه دکمه را بفرستید.\n\nمثال: ورود به Vexa Game', [[{ text: '⬅️ بازگشت', callback_data: `botadmin:channeldestination:${destination}` }]]);
    return true;
  }
  return promptChannelContent(env, token, chatId, tg, adminId, { mode: 'channel-content', ...channelState(settings), destination, miniAppButton: false }, messageId);
}

async function promptChannelContent(env: Env, token: string, chatId: number, tg: TgApi, adminId: unknown, state: AdminState, messageId?: number): Promise<true> {
  const menuMessageId = messageId ?? state.menuMessageId ?? await getAdminMenuMessageId(env, chatId);
  const next: AdminState = { ...state, mode: 'channel-content', menuMessageId };
  await setAdminState(env, adminId, next);
  const button = next.miniAppButton ? `بله — ${next.buttonText || 'ورود به اپ'}` : 'خیر';
  await upsertMessage(env, token, tg, chatId, messageId, `حالا محتوای پیام کانال را بفرستید.\n\nمی‌توانید متن، عکس با کپشن، ویدیو یا فایل بفرستید.\nمقصد: ${channelDestinationLabel(next.destination || '')}\nدکمه: ${button}`, [[{ text: 'لغو و بازگشت', callback_data: 'botadmin:channelpost' }]]);
  return true;
}

async function copyAdminMessageToChannel(token: string, tg: TgApi, message: TelegramMessage, state: AdminState): Promise<void> {
  const channelId = String(state.channelChatId || '').trim();
  const destination = normalizeChannelDestination(state.destination);
  if (!channelId) throw new Error('کانال تنظیم نشده است.');
  if (!destination) throw new Error('مقصد اپ انتخاب نشده است.');
  const replyMarkup = state.miniAppButton
    ? { inline_keyboard: [[{ text: state.buttonText || 'ورود به اپ', url: channelMiniAppUrl(destination) }]] }
    : undefined;
  await tg(token, 'copyMessage', {
    chat_id: channelId,
    from_chat_id: message.chat.id,
    message_id: message.message_id,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

async function sendChannelStateError(env: Env, token: string, tg: TgApi, message: TelegramMessage, state: AdminState, error: string): Promise<true> {
  await cleanupAdminInput(token, tg, message);
  await setAdminState(env, message.from?.id, state);
  await upsertMessage(env, token, tg, message.chat.id, state.menuMessageId, `❌ ${error}\n\nدوباره مقدار درست را بفرستید.`, [[{ text: 'لغو و بازگشت', callback_data: 'botadmin:channelpost' }]]);
  return true;
}

async function getChannelPostSettings(env: Env): Promise<ChannelPostSettings | null> {
  try {
    await ensureAdminSettings(env);
    const row = await env.DB.prepare('SELECT value_json FROM admin_settings WHERE name = ?').bind(CHANNEL_POST_SETTINGS_KEY).first<{ value_json: string }>();
    const value = JSON.parse(row?.value_json || '{}') as Partial<ChannelPostSettings>;
    const chatId = String(value.chatId || '').trim();
    const title = String(value.title || '').trim();
    if (!chatId || !title) return null;
    return { chatId, title: title.slice(0, 120), ...(value.username ? { username: String(value.username).replace(/^@/, '').slice(0, 64) } : {}) };
  } catch {
    return null;
  }
}

async function saveChannelPostSettings(env: Env, settings: ChannelPostSettings): Promise<void> {
  await ensureAdminSettings(env);
  await env.DB.prepare(`INSERT INTO admin_settings (name, value_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(name) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`)
    .bind(CHANNEL_POST_SETTINGS_KEY, JSON.stringify(settings))
    .run();
}

function channelState(settings: ChannelPostSettings): Pick<AdminState, 'channelChatId' | 'channelTitle' | 'channelUsername'> {
  return { channelChatId: settings.chatId, channelTitle: settings.title, ...(settings.username ? { channelUsername: settings.username } : {}) };
}

function channelSettingsFromState(state: AdminState | null): ChannelPostSettings | null {
  const chatId = String(state?.channelChatId || '').trim();
  const title = String(state?.channelTitle || '').trim();
  if (!chatId || !title) return null;
  return { chatId, title, ...(state?.channelUsername ? { username: state.channelUsername } : {}) };
}

function normalizeChannelTarget(value: unknown): string | null {
  const raw = String(value || '').trim();
  if (/^-100\d{6,20}$/.test(raw)) return raw;
  const username = raw.match(/^@([A-Za-z][A-Za-z0-9_]{4,31})$/)?.[1]
    || raw.match(/^(?:https?:\/\/)?t\.me\/([A-Za-z][A-Za-z0-9_]{4,31})\/?$/i)?.[1];
  return username ? `@${username}` : null;
}

function normalizeChannelDestination(value: unknown): string | null {
  const destination = String(value || '').trim().toLowerCase();
  return CHANNEL_DESTINATION_IDS.has(destination) ? destination : null;
}

function channelDestinationLabel(destination: string): string {
  return [...CHANNEL_DESTINATIONS, ...CHANNEL_GAMES].find(([id]) => id === destination)?.[1] || destination;
}

function channelMiniAppUrl(destination: string): string {
  return `${VEXA_APP_DEEP_LINK}=${encodeURIComponent(destination)}`;
}

async function sendBroadcastOptions(env: Env, token: string, chatId: number, tg: TgApi, adminId: unknown, messageId?: number): Promise<true> {
  await clearAdminState(env, adminId);
  const rows = [
    [{ text: '🌍 همه کاربران + دکمه مینی‌اپ', callback_data: 'botadmin:broadcastlocale:ALL:button' }],
    [{ text: '🌍 همه کاربران بدون دکمه', callback_data: 'botadmin:broadcastlocale:ALL:nobutton' }],
    ...chunk(VEXA_LOCALES.map((locale) => ({
      text: VEXA_LOCALE_LABELS[locale],
      callback_data: `botadmin:broadcastlocale:${locale}:button`,
    })), 2),
    [{ text: 'لغو و بازگشت', callback_data: 'botadmin:home' }],
  ];
  await upsertMessage(env, token, tg, chatId, messageId, '📣 پیام همگانی\n\nزبان مخاطب را انتخاب کنید. متن را به همان زبان بفرستید؛ فقط کاربران همان زبان دریافتش می‌کنند. دکمهٔ ورود به مینی‌اپ نیز خودکار به زبان هر کاربر است.', rows);
  return true;
}

function broadcastPrompt(locales: string[], miniAppButton: boolean): string {
  const target = locales.includes('ALL') ? 'همهٔ زبان‌ها' : locales.map((locale) => VEXA_LOCALE_LABELS[locale as VexaLocale] || locale).join(', ');
  return `پیام همگانی را بفرستید: متن، عکس با کپشن، ویدیو، ویس/صوت یا فایل.\n\nزبان مخاطب: ${target}\nدکمه ورود به مینی‌اپ: ${miniAppButton ? 'بله' : 'خیر'}`;
}

function normalizeBroadcastLocales(value: unknown): string[] {
  const raw = Array.isArray(value) ? value : String(value || 'ALL').split(',');
  const allowed = new Set<string>(['ALL', ...VEXA_LOCALES]);
  const out = raw.map((item) => String(item || '').trim()).filter((item) => allowed.has(item));
  return out.length ? Array.from(new Set(out)) : ['ALL'];
}

function userLocale(user: AdminUser): VexaLocale {
  const stored = String(user.languageCode || '').trim();
  return (VEXA_LOCALES as readonly string[]).includes(stored)
    ? stored as VexaLocale
    : vexaLocaleForCountry(String(user.regionCode || '')) || DEFAULT_VEXA_LOCALE;
}

function localeMatches(user: AdminUser, locales: string[]): boolean {
  return locales.includes('ALL') || locales.includes(userLocale(user));
}

function broadcastMiniAppButtonText(user: AdminUser): string {
  return SHARE_INVITE_BUTTON_TEXT[userLocale(user)];
}

async function sendUserReportPdf(env: Env, token: string, chatId: number, tg: TgApi, userId: string): Promise<true> {
  const report = await buildUserReport(env, userId);
  const pdf = makeSimplePdf(report.lines);
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('caption', `📄 گزارش کامل و به‌روز کاربر ${userId}`);
  form.append('document', new Blob([pdf], { type: 'application/pdf' }), `user-${userId}-report.pdf`);
  await fetch(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: form }).catch(() => tg(token, 'sendMessage', { chat_id: chatId, text: 'ارسال PDF ناموفق بود.' }));
  return true;
}

type ReportData = { lines: string[] };

async function buildUserReport(env: Env, userId: string): Promise<ReportData> {
  const [data, controls] = await Promise.all([adminUsersJson(env), getUserControls(env, userId)]);
  const user = (data.users as AdminUser[]).find((item) => cleanId(item.id) === userId) || { id: userId };
  const tx = await queryAll<Record<string, unknown>>(env, 'SELECT * FROM ton_transactions WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 200', userId);
  const deposits = await queryAll<Record<string, unknown>>(env, 'SELECT * FROM stars_deposits WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 100', userId);
  const games = await gameRows(env, userId);
  const activities = await activityRows(env, userId);
  const spent = tx.filter((r) => Number(r.amount_nano || 0) < 0).reduce((s, r) => s + Math.abs(Number(r.amount_nano || 0)), 0);
  const chargeCount = tx.filter((r) => String(r.kind || '') === 'deposit' || Number(r.amount_nano || 0) > 0 && /deposit|charge|stars/i.test(String(r.title || r.kind || ''))).length + deposits.filter((r) => String(r.status || '') === 'completed').length;
  const wins = games.filter((g) => g.result === 'win');
  const losses = games.filter((g) => g.result === 'loss');
  const lines = [
    'Vexa Game Bot - Full User Report',
    `Generated at: ${new Date().toISOString()}`,
    `User ID: ${userId}`,
    `Name: ${ascii(user.firstName)}`,
    `Username: ${ascii(user.username)}`,
    `Region: ${ascii(user.regionLabel)} (${ascii(user.regionCode)})`,
    `Current section: ${ascii(user.currentSection)}`,
    `Status: ${ascii(user.status)}`,
    `Balance TON: ${formatTon(controls.tonBalanceNano)}`,
    `Win chance: ${controls.winChancePercent}%`,
    `Level: ${ascii(user.level)} / ${ascii(user.rankName)} / XP ${ascii(user.xp)}`,
    `Total spent credit/TON: ${formatTon(spent)} TON`,
    `Charge count: ${chargeCount}`,
    `Games played: ${games.length}; Wins: ${wins.length} (${formatTon(wins.reduce((s, g) => s + Math.max(0, g.amount), 0))} TON); Losses: ${losses.length} (${formatTon(losses.reduce((s, g) => s + Math.abs(Math.min(0, g.amount)), 0))} TON)`,
    '', 'Games:', ...games.slice(0, 120).map((g) => `${g.createdAt} | ${g.game} | ${g.result} | ${formatTon(g.amount)} TON | ${g.id}`),
    '', 'All transactions:', ...tx.map((r) => `${r.created_at || ''} | ${r.kind || ''} | ${r.title || ''} | ${formatTon(r.amount_nano)} TON | balance ${formatTon(r.balance_after_nano)} | ${r.status || ''}`),
    '', 'All activities:', ...activities.map((r) => `${r.created_at || r.updated_at || r.last_seen_at || ''} | ${r.type} | ${JSON.stringify(r).slice(0, 220)}`),
  ];
  return { lines };
}

async function queryAll<T>(env: Env, sql: string, ...binds: unknown[]): Promise<T[]> {
  try { const stmt = env.DB.prepare(sql); const rows = await (binds.length ? stmt.bind(...binds) : stmt).all<T>(); return rows.results || []; } catch { return []; }
}

async function gameRows(env: Env, userId: string): Promise<Array<{ game: string; id: string; result: string; amount: number; createdAt: string }>> {
  const tables = ['wheel_entries', 'crash_bets', 'plinko_rounds', 'mines_rounds', 'dice_rounds', 'predict_bets', 'football_bets', 'football_live_question_bets'];
  const out: Array<{ game: string; id: string; result: string; amount: number; createdAt: string }> = [];
  for (const table of tables) {
    const rows = await queryAll<Record<string, unknown>>(env, `SELECT * FROM ${table} WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT 80`, userId);
    for (const r of rows) {
      const amount = Number(r.payout_nano ?? r.profit_nano ?? r.reward_nano ?? r.amount_nano ?? 0) - Number(r.stake_nano ?? r.bet_nano ?? 0);
      const status = String(r.status ?? r.result ?? '').toLowerCase();
      out.push({ game: table.replace(/_(rounds|bets|entries)$/,''), id: String(r.id || r.round_id || ''), result: amount > 0 || /win|cashout|paid/.test(status) ? 'win' : amount < 0 || /loss|lost|bust/.test(status) ? 'loss' : status || 'played', amount, createdAt: String(r.created_at || r.updated_at || '') });
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function activityRows(env: Env, userId: string): Promise<Array<Record<string, unknown> & { type: string }>> {
  const sources: Array<[string, string]> = [['app_users','telegram_user_id'], ['xp_events','user_id'], ['daily_reward_events','user_id'], ['daily_rewards_events','user_id'], ['market_purchases','user_id'], ['nft_purchases','user_id'], ['ton_withdrawals','user_id']];
  const out: Array<Record<string, unknown> & { type: string }> = [];
  for (const [table, column] of sources) for (const row of await queryAll<Record<string, unknown>>(env, `SELECT * FROM ${table} WHERE ${column} = ? ORDER BY datetime(COALESCE(created_at, updated_at, last_seen_at)) DESC LIMIT 80`, userId)) out.push({ type: table, ...row });
  return out;
}

function makeSimplePdf(lines: string[]): Uint8Array {
  const safe = lines.flatMap((line) => ascii(line).match(/.{1,92}/g) || ['']).slice(0, 1200);
  const pages: string[][] = [];
  for (let i = 0; i < safe.length; i += 68) pages.push(safe.slice(i, i + 68));
  if (!pages.length) pages.push(['No data']);
  const objects: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', ''];
  const pageObjectIds: number[] = [];
  for (const pageLines of pages) {
    const content = ['BT', '/F1 9 Tf', '36 806 Td', '11 TL', ...pageLines.map((line, i) => `${i ? 'T* ' : ''}(${pdfEscape(line)}) Tj`), 'ET'].join('\n');
    const pageId = objects.length + 1;
    const contentId = pageId + 1;
    pageObjectIds.push(pageId);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;
  objects.splice(2, 0, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fixedPageIds = pageObjectIds.map((id) => id + 1);
  objects[1] = `<< /Type /Pages /Kids [${fixedPageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${fixedPageIds.length} >>`;
  for (let i = 3; i < objects.length; i += 2) objects[i] = objects[i].replace('/F1 3 0 R', '/F1 3 0 R').replace(/Contents (\d+) 0 R/, (_m, n) => `Contents ${Number(n) + 1} 0 R`);
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map((o) => String(o).padStart(10, '0') + ' 00000 n ').join('\n') + `\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
function ascii(value: unknown): string { return String(value ?? '—').replace(/[^\x20-\x7E]/g, '?').slice(0, 500); }
function pdfEscape(value: string): string { return value.replace(/[\\()]/g, '\\$&'); }
