import { handleBotAdminCallback, handleBotAdminMessage } from './telegram-bot-admin-panel';
import { getUserRegionPreference, setUserRegionPreference } from './admin-users';
import { DEFAULT_VEXA_LOCALE, VEXA_LOCALES, VEXA_LOCALE_LABELS, type VexaLocale } from './miniapp/i18n';
import { handleStarsPreCheckout, handleStarsSuccessfulPayment } from './stars-deposits';
import type { Env, TelegramUpdate } from './types';
import { PUBLIC_BASE_URL } from './utils';
import { getTelegramMenuMessageId, setTelegramMenuMessageId } from './telegram-menu-state';
import { getMainMenuMedia } from './share-invite-config';

type TelegramApi = <T = unknown>(token: string, method: string, payload: unknown) => Promise<T>;
type TelegramEnvelope<T = unknown> = {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
};
type TelegramSentMessage = { message_id?: number };
type MainMenuCopy = {
  tagline: string;
  quickGames: string;
  predictions: string;
  lotteries: string;
  dailyChance: string;
  ready: string;
};

const USER_REGION_OPTIONS = [
  ['US', '🇺🇸 United States'], ['RU', '🇷🇺 Россия'], ['TR', '🇹🇷 Türkiye'], ['AE', '🇦🇪 العربية'],
  ['ES', '🇪🇸 España'], ['BR', '🇧🇷 Brasil'], ['ID', '🇮🇩 Indonesia'], ['IN', '🇮🇳 India'],
  ['DE', '🇩🇪 Deutschland'], ['IR', '🇮🇷 Iran'], ['FR', '🇫🇷 France'], ['IT', '🇮🇹 Italia'],
  ['UA', '🇺🇦 Україна'], ['PL', '🇵🇱 Polska'], ['VN', '🇻🇳 Việt Nam'], ['TH', '🇹🇭 ไทย'],
  ['KR', '🇰🇷 한국'], ['JP', '🇯🇵 日本'], ['PK', '🇵🇰 Pakistan'], ['PH', '🇵🇭 Philippines'],
  ['MY', '🇲🇾 Malaysia'], ['TW', '🇹🇼 繁體中文'],
] as const;

// Change to true to enable /emojisend.
const EMOJI_SEND_ENABLED = false;

const MAIN_MENU_COPY: Readonly<Record<VexaLocale, MainMenuCopy>> = {
  en: {
    tagline: 'Play, predict, and increase your chances of winning.',
    quickGames: 'Quick games',
    predictions: 'Market & event predictions',
    lotteries: 'Lotteries & rewards',
    dailyChance: 'New chances to win every day.',
    ready: 'Ready to play and win?',
  },
  fa: {
    tagline: 'بازی کن، پیش‌بینی کن و شانس برنده شدنت را بیشتر کن.',
    quickGames: 'بازی‌های سریع',
    predictions: 'پیش‌بینی بازار و رویدادها',
    lotteries: 'لاتاری‌ها و جوایز',
    dailyChance: 'هر روز شانس‌های تازه‌ای برای برنده شدن داری.',
    ready: 'آماده‌ای بازی کنی و برنده بشی؟',
  },
  ru: {
    tagline: 'Играйте, прогнозируйте и повышайте свои шансы на победу.',
    quickGames: 'Быстрые игры',
    predictions: 'Прогнозы рынков и событий',
    lotteries: 'Лотереи и награды',
    dailyChance: 'Новые шансы на победу каждый день.',
    ready: 'Готовы играть и побеждать?',
  },
  tr: {
    tagline: 'Oyna, tahmin et ve kazanma şansını artır.',
    quickGames: 'Hızlı oyunlar',
    predictions: 'Piyasa ve etkinlik tahminleri',
    lotteries: 'Çekilişler ve ödüller',
    dailyChance: 'Her gün yeni kazanma şansları.',
    ready: 'Oynamaya ve kazanmaya hazır mısın?',
  },
  ar: {
    tagline: 'العب، توقّع، وزِد فرصك في الفوز.',
    quickGames: 'ألعاب سريعة',
    predictions: 'توقعات الأسواق والأحداث',
    lotteries: 'السحوبات والمكافآت',
    dailyChance: 'فرص جديدة للفوز كل يوم.',
    ready: 'هل أنت مستعد للعب والفوز؟',
  },
  es: {
    tagline: 'Juega, predice y aumenta tus posibilidades de ganar.',
    quickGames: 'Juegos rápidos',
    predictions: 'Predicciones de mercados y eventos',
    lotteries: 'Sorteos y recompensas',
    dailyChance: 'Nuevas oportunidades de ganar cada día.',
    ready: '¿Listo para jugar y ganar?',
  },
  'pt-BR': {
    tagline: 'Jogue, faça previsões e aumente suas chances de ganhar.',
    quickGames: 'Jogos rápidos',
    predictions: 'Previsões de mercado e eventos',
    lotteries: 'Sorteios e recompensas',
    dailyChance: 'Novas chances de ganhar todos os dias.',
    ready: 'Pronto para jogar e ganhar?',
  },
  id: {
    tagline: 'Main, prediksi, dan tingkatkan peluangmu untuk menang.',
    quickGames: 'Game cepat',
    predictions: 'Prediksi pasar & peristiwa',
    lotteries: 'Undian & hadiah',
    dailyChance: 'Peluang baru untuk menang setiap hari.',
    ready: 'Siap bermain dan menang?',
  },
  hi: {
    tagline: 'खेलें, भविष्यवाणी करें और जीतने की संभावना बढ़ाएँ।',
    quickGames: 'त्वरित गेम',
    predictions: 'बाज़ार और इवेंट की भविष्यवाणियाँ',
    lotteries: 'लॉटरी और रिवॉर्ड',
    dailyChance: 'हर दिन जीतने के नए मौके।',
    ready: 'खेलने और जीतने के लिए तैयार हैं?',
  },
  de: {
    tagline: 'Spiele, tippe voraus und erhöhe deine Gewinnchancen.',
    quickGames: 'Schnelle Spiele',
    predictions: 'Markt- & Event-Prognosen',
    lotteries: 'Lotterien & Belohnungen',
    dailyChance: 'Jeden Tag neue Gewinnchancen.',
    ready: 'Bereit zu spielen und zu gewinnen?',
  },
  fr: {
    tagline: 'Joue, fais tes prédictions et augmente tes chances de gagner.',
    quickGames: 'Jeux rapides',
    predictions: 'Prédictions de marchés et d’événements',
    lotteries: 'Loteries et récompenses',
    dailyChance: 'De nouvelles chances de gagner chaque jour.',
    ready: 'Prêt à jouer et à gagner ?',
  },
  it: {
    tagline: 'Gioca, fai previsioni e aumenta le tue possibilità di vincere.',
    quickGames: 'Giochi rapidi',
    predictions: 'Previsioni su mercati ed eventi',
    lotteries: 'Lotterie e premi',
    dailyChance: 'Nuove possibilità di vincere ogni giorno.',
    ready: 'Pronto a giocare e vincere?',
  },
  uk: {
    tagline: 'Грайте, прогнозуйте та збільшуйте свої шанси на перемогу.',
    quickGames: 'Швидкі ігри',
    predictions: 'Прогнози ринків і подій',
    lotteries: 'Лотереї та нагороди',
    dailyChance: 'Нові шанси на перемогу щодня.',
    ready: 'Готові грати та перемагати?',
  },
  pl: {
    tagline: 'Graj, przewiduj i zwiększaj swoje szanse na wygraną.',
    quickGames: 'Szybkie gry',
    predictions: 'Prognozy rynków i wydarzeń',
    lotteries: 'Loterie i nagrody',
    dailyChance: 'Nowe szanse na wygraną każdego dnia.',
    ready: 'Gotowy, by grać i wygrywać?',
  },
  vi: {
    tagline: 'Chơi, dự đoán và tăng cơ hội chiến thắng của bạn.',
    quickGames: 'Trò chơi nhanh',
    predictions: 'Dự đoán thị trường & sự kiện',
    lotteries: 'Xổ số & phần thưởng',
    dailyChance: 'Cơ hội chiến thắng mới mỗi ngày.',
    ready: 'Sẵn sàng chơi và chiến thắng?',
  },
  th: {
    tagline: 'เล่น ทำนาย และเพิ่มโอกาสชนะของคุณ',
    quickGames: 'เกมรวดเร็ว',
    predictions: 'การคาดการณ์ตลาดและเหตุการณ์',
    lotteries: 'ลอตเตอรี่และรางวัล',
    dailyChance: 'โอกาสชนะใหม่ทุกวัน',
    ready: 'พร้อมเล่นและชนะหรือยัง?',
  },
  ko: {
    tagline: '플레이하고 예측하며 승리 확률을 높여보세요.',
    quickGames: '빠른 게임',
    predictions: '시장 & 이벤트 예측',
    lotteries: '복권 & 보상',
    dailyChance: '매일 새로운 승리 기회.',
    ready: '플레이하고 승리할 준비가 되셨나요?',
  },
  ja: {
    tagline: 'プレイして予想し、勝つチャンスを高めよう。',
    quickGames: 'クイックゲーム',
    predictions: '市場・イベント予測',
    lotteries: '抽選・報酬',
    dailyChance: '毎日、新しい勝利のチャンス。',
    ready: 'プレイして勝つ準備はできた？',
  },
  ur: {
    tagline: 'کھیلیں، پیش گوئی کریں اور جیتنے کے امکانات بڑھائیں۔',
    quickGames: 'فوری گیمز',
    predictions: 'مارکیٹ اور ایونٹ کی پیش گوئیاں',
    lotteries: 'لاٹریاں اور انعامات',
    dailyChance: 'ہر روز جیتنے کے نئے مواقع۔',
    ready: 'کھیلنے اور جیتنے کے لیے تیار ہیں؟',
  },
  fil: {
    tagline: 'Maglaro, manghula, at dagdagan ang tsansa mong manalo.',
    quickGames: 'Mabilis na games',
    predictions: 'Mga prediction sa market & events',
    lotteries: 'Mga lottery & rewards',
    dailyChance: 'Bagong pagkakataong manalo araw-araw.',
    ready: 'Handa ka nang maglaro at manalo?',
  },
  ms: {
    tagline: 'Main, ramal dan tingkatkan peluang anda untuk menang.',
    quickGames: 'Permainan pantas',
    predictions: 'Ramalan pasaran & acara',
    lotteries: 'Loteri & ganjaran',
    dailyChance: 'Peluang baharu untuk menang setiap hari.',
    ready: 'Bersedia untuk bermain dan menang?',
  },
  'zh-Hant': {
    tagline: '遊玩、預測，提升你的獲勝機會。',
    quickGames: '快速遊戲',
    predictions: '市場與事件預測',
    lotteries: '抽獎與獎勵',
    dailyChance: '每天都有新的獲勝機會。',
    ready: '準備好遊玩並獲勝了嗎？',
  },
};

export async function setTelegramWebhook(env: Env): Promise<{ ok: boolean; description?: string; error_code?: number }> {
  const token = botToken(env);
  const invalid = botTokenError(token);
  if (invalid) return { ok: false, description: invalid };

  const data = await telegramRequest<boolean>(token, 'setWebhook', {
    url: `${PUBLIC_BASE_URL}/telegram/webhook`,
    allowed_updates: ['message', 'callback_query', 'pre_checkout_query', 'my_chat_member'],
    drop_pending_updates: true,
  });

  return { ok: data.ok, description: data.description, error_code: data.error_code };
}

export async function setGameMenuButton(env: Env): Promise<{ ok: boolean; description?: string; error_code?: number }> {
  const token = botToken(env);
  const invalid = botTokenError(token);
  if (invalid) return { ok: false, description: invalid };

  const data = await telegramRequest<boolean>(token, 'setChatMenuButton', {
    menu_button: {
      type: 'web_app',
      text: 'Open Mini App',
      web_app: { url: `${PUBLIC_BASE_URL}/app` },
    },
  });

  return { ok: data.ok, description: data.description, error_code: data.error_code };
}

export async function handleGameBotWebhook(env: Env, update: TelegramUpdate): Promise<void> {
  const token = botToken(env);
  const invalid = botTokenError(token);
  if (invalid) throw new Error(invalid);

  if (update.pre_checkout_query) {
    await handleStarsPreCheckout(env, update.pre_checkout_query);
    return;
  }

  const message = update.message;
  if (message?.successful_payment) {
    const userId = message.from?.id ?? message.chat.id;
    await handleStarsSuccessfulPayment(env, userId, message.successful_payment);
    return;
  }

  if (update.callback_query) {
    if (await handleBotAdminCallback(env, token, update.callback_query, telegram as TelegramApi)) return;
    if (await handleUserRegionCallback(env, token, update.callback_query)) return;
    await telegram(token, 'answerCallbackQuery', { callback_query_id: update.callback_query.id }).catch(() => undefined);
    return;
  }

  if (message) {
    if (await handleEmojiSend(env, token, message)) return;
    if (isMenuCommand(message.text)) await deleteCurrentMenuMessage(env, token, message.chat.id);
    const adminCommand = isAdminCommand(message.text);
    const adminHandled = await handleBotAdminMessage(env, token, message, telegram as TelegramApi);
    if (adminHandled) return;

    if (adminCommand) {
      await deleteIncomingMessage(token, message.chat.id, message.message_id);
      await replaceMenuMessage(env, token, message.chat.id, {
        text: `دسترسی ادمین برای این حساب فعال نیست.\n\nآیدی عددی تلگرام شما: ${message.from?.id ?? message.chat.id}\nاین عدد را داخل BOT_ADMIN قرار بدهید.`,
      }).catch(() => undefined);
      return;
    }

    if (isRegionCommand(message.text)) {
      await deleteIncomingMessage(token, message.chat.id, message.message_id);
      await sendUserRegionMenu(env, token, message.chat.id, message.from?.id ?? message.chat.id);
      return;
    }

    if (!/^\/start(?:@[-_a-z0-9]+)?(?:\s+.*)?$/i.test(String(message.text || '').trim())) {
      await deleteIncomingMessage(token, message.chat.id, message.message_id);
    }
    await sendGameHome(env, token, message.chat.id, undefined, telegramLanguageCode(message.from));
  }
}


async function handleEmojiSend(env: Env, token: string, message: NonNullable<TelegramUpdate['message']>): Promise<boolean> {
  const userId = message.from?.id;
  if (!userId) return false;
  const stateKey = `emoji-send:${message.chat.id}:${userId}`;
  if (/^\/emojisend(?:@[-_a-z0-9]+)?$/i.test(String(message.text || '').trim())) {
    await deleteIncomingMessage(token, message.chat.id, message.message_id);
    if (!EMOJI_SEND_ENABLED) return true;
    await deleteCurrentMenuMessage(env, token, message.chat.id);
    await env.BOT_CACHE.put(stateKey, '1', { expirationTtl: 300 }).catch(() => undefined);
    await replaceMenuMessage(env, token, message.chat.id, { text: 'حالا ایموجی متحرک را بفرست.' }).catch(() => undefined);
    return true;
  }
  if (!EMOJI_SEND_ENABLED) return false;
  const waiting = await env.BOT_CACHE.get(stateKey).catch(() => null);
  const customEmojiId = message.entities?.find((entity) => entity.type === 'custom_emoji' && entity.custom_emoji_id)?.custom_emoji_id;
  if (!waiting || !customEmojiId) return false;
  await env.BOT_CACHE.delete(stateKey).catch(() => undefined);
  await deleteIncomingMessage(token, message.chat.id, message.message_id);
  await replaceMenuMessage(env, token, message.chat.id, {
    text: `Custom emoji ID:\n<code>${customEmojiId}</code>`,
    parse_mode: 'HTML',
  }).catch(() => undefined);
  return true;
}


function isMenuCommand(text: string | undefined): boolean {
  return isAdminCommand(text) || /^\/[a-z][a-z0-9_]*(?:@[-_a-z0-9]+)?(?:\s+.*)?$/i.test(String(text || '').trim());
}

async function deleteCurrentMenuMessage(env: Env, token: string, chatId: number): Promise<void> {
  const messageId = await getTelegramMenuMessageId(env, chatId);
  if (messageId) await deleteIncomingMessage(token, chatId, messageId);
}

function isRegionCommand(text: string | undefined): boolean {
  return /^\/region(?:@[-_a-z0-9]+)?$/i.test(String(text || '').trim());
}

async function handleUserRegionCallback(env: Env, token: string, q: NonNullable<TelegramUpdate['callback_query']>): Promise<boolean> {
  const data = String(q.data || '');
  if (!data.startsWith('vexa:region:')) return false;
  const chatId = q.message?.chat.id ?? q.from.id;
  const action = data.slice('vexa:region:'.length).trim().toUpperCase();
  const countryCode = action === 'AUTO' ? null : USER_REGION_OPTIONS.some(([code]) => code === action) ? action : null;
  if (action !== 'AUTO' && !countryCode) {
    await telegram(token, 'answerCallbackQuery', { callback_query_id: q.id, text: 'Unknown region' }).catch(() => undefined);
    return true;
  }
  const preference = await setUserRegionPreference(env, q.from.id, countryCode);
  await telegram(token, 'answerCallbackQuery', { callback_query_id: q.id, text: preference.mode === 'automatic' ? 'Automatic detection enabled' : 'Region updated' }).catch(() => undefined);
  await sendGameHome(env, token, chatId, q.message?.message_id, preference.languageCode ?? telegramLanguageCode(q.from));
  return true;
}

async function sendUserRegionMenu(env: Env, token: string, chatId: number, userId: number, messageId?: number): Promise<void> {
  const preference = await getUserRegionPreference(env, userId);
  const currentCode = preference.countryCode || '';
  const currentLanguage = preference.languageCode ? (VEXA_LOCALE_LABELS as Record<string, string>)[preference.languageCode] : '';
  const rows = chunk(USER_REGION_OPTIONS.map(([code, label]) => ({ text: `${currentCode === code ? '✓ ' : ''}${label}`, callback_data: `vexa:region:${code}` })), 2);
  rows.push([{ text: `${preference.mode === 'automatic' ? '✓ ' : ''}Automatic (System)`, callback_data: 'vexa:region:AUTO' }]);
  const send = (useCustomEmoji: boolean) => {
    const icon = useCustomEmoji ? '<tg-emoji emoji-id="5321275372333979355">🌐</tg-emoji>' : '🌐';
    const title = preference.mode === 'automatic'
      ? `<b>${icon} Region &amp; Language</b>\n\n<b>Automatic (System)</b>\nYour region and language will be selected automatically.`
      : `<b>${icon} Region &amp; Language</b>\n\n<b>Current:</b> ${currentCode} · ${currentLanguage}\n\nChoose a region below.`;
    return replaceMenuMessage(env, token, chatId, { text: title, parse_mode: 'HTML', reply_markup: { inline_keyboard: rows } }, messageId);
  };
  try {
    await send(true);
  } catch (error) {
    if (!isCustomEmojiFailure(error)) throw error;
    await send(false);
  }
}

function chunk<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) rows.push(items.slice(index, index + size));
  return rows;
}

function isAdminCommand(text: string | undefined): boolean {
  const normalized = String(text ?? '').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'ادمین' || /^\/admin(?:@[-_a-z0-9]+)?$/.test(normalized);
}

async function sendGameHome(env: Env, token: string, chatId: number, existingMessageId?: number, languageCode?: string): Promise<void> {
  const locale = localeForTelegramLanguage(languageCode);
  const media = await getMainMenuMedia(env).catch(() => null);
  const reply_markup = {
    inline_keyboard: [[{
      text: `🎪 ${stylizeLatin('Open Vexa Game')}`,
      web_app: { url: `${PUBLIC_BASE_URL}/app` },
    }]],
  };
  const send = (useCustomEmoji: boolean) => {
    const text = mainMenuText(locale, useCustomEmoji);
    return replaceMenuMessage(env, token, chatId, media
      ? { [media.type]: media.fileId, text, parse_mode: 'HTML', reply_markup }
      : { text, parse_mode: 'HTML', reply_markup }, existingMessageId);
  };
  try {
    await send(true);
  } catch (error) {
    if (!isCustomEmojiFailure(error)) throw error;
    await send(false);
  }
}

function telegramLanguageCode(user: unknown): string | undefined {
  if (!user || typeof user !== 'object') return undefined;
  const value = (user as { language_code?: unknown }).language_code;
  return typeof value === 'string' ? value : undefined;
}

function localeForTelegramLanguage(languageCode: string | undefined): VexaLocale {
  const normalized = String(languageCode || '').trim().replace(/_/g, '-').toLowerCase();
  if (!normalized) return DEFAULT_VEXA_LOCALE;
  if (normalized === 'pt' || normalized.startsWith('pt-')) return 'pt-BR';
  if (normalized === 'tl' || normalized.startsWith('tl-') || normalized === 'fil' || normalized.startsWith('fil-')) return 'fil';
  if (normalized === 'zh' || normalized.startsWith('zh-')) return 'zh-Hant';
  const base = normalized.split('-')[0] || normalized;
  const exact = VEXA_LOCALES.find((locale) => locale.toLowerCase() === normalized);
  if (exact) return exact;
  const byBase = VEXA_LOCALES.find((locale) => locale.toLowerCase() === base);
  return byBase ?? DEFAULT_VEXA_LOCALE;
}

function mainMenuText(locale: VexaLocale, useCustomEmoji = true): string {
  const copy = MAIN_MENU_COPY[locale] ?? MAIN_MENU_COPY[DEFAULT_VEXA_LOCALE];
  const line = (value: string) => `<b>${escapeHtml(stylizeLatin(value))}</b>`;
  const icon = (id: string, fallback: string) => useCustomEmoji ? `<tg-emoji emoji-id="${id}">${fallback}</tg-emoji>` : fallback;
  return [
    `🎪 ${line('Vexa Game')}`,
    '',
    line(copy.tagline),
    '',
    `${icon('5319247469165433798', '🧩')} ${line(copy.quickGames)}`,
    `${icon('5231005931550030290', '💸')} ${line(copy.predictions)}`,
    `🎟 ${line(copy.lotteries)}`,
    '',
    `${icon('5203996991054432397', '🎁')} ${line(copy.dailyChance)}`,
    '',
    `${line(copy.ready)} ${icon('5231102735817918643', '👇🏼')}`,
  ].join('\n');
}

function stylizeLatin(value: string): string {
  return Array.from(value.normalize('NFD')).map((char) => {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1D5D4 + code - 65);
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1D5EE + code - 97);
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1D7EC + code - 48);
    return char;
  }).join('');
}

function isCustomEmojiFailure(error: unknown): boolean {
  return /custom emoji|emoji.*not allowed|can't parse entities/i.test(error instanceof Error ? error.message : String(error));
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function replaceMenuMessage(env: Env, token: string, chatId: number, content: Record<string, unknown>, existingMessageId?: number): Promise<void> {
  const messageId = existingMessageId ?? await getTelegramMenuMessageId(env, chatId);
  const photo = typeof content.photo === 'string' ? content.photo : '';
  const video = typeof content.video === 'string' ? content.video : '';
  const mediaFileId = video || photo;
  if (mediaFileId) {
    const mediaType = video ? 'video' : 'photo';
    const caption = String(content.text ?? '');
    const parseMode = typeof content.parse_mode === 'string' ? content.parse_mode : undefined;
    const replyMarkup = content.reply_markup;
    if (messageId) {
      const edited = await telegram(token, 'editMessageMedia', {
        chat_id: chatId,
        message_id: messageId,
        media: { type: mediaType, media: mediaFileId, caption, ...(parseMode ? { parse_mode: parseMode } : {}) },
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }).then(() => true).catch(() => false);
      if (edited) return;
      await telegram(token, 'deleteMessage', { chat_id: chatId, message_id: messageId }).catch(() => undefined);
    }
    const method = mediaType === 'video' ? 'sendVideo' : 'sendPhoto';
    const sent = await telegram<TelegramSentMessage>(token, method, {
      chat_id: chatId,
      [mediaType]: mediaFileId,
      caption,
      ...(mediaType === 'video' ? { supports_streaming: true } : {}),
      ...(parseMode ? { parse_mode: parseMode } : {}),
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
    if (sent?.message_id) await setTelegramMenuMessageId(env, chatId, sent.message_id);
    return;
  }

  const payload = { chat_id: chatId, ...content };
  if (messageId) {
    const edited = await telegram(token, 'editMessageText', { ...payload, message_id: messageId }).then(() => true).catch(() => false);
    if (edited) return;
    await telegram(token, 'deleteMessage', { chat_id: chatId, message_id: messageId }).catch(() => undefined);
  }
  const sent = await telegram<TelegramSentMessage>(token, 'sendMessage', payload);
  if (sent?.message_id) await setTelegramMenuMessageId(env, chatId, sent.message_id);
}

async function deleteIncomingMessage(token: string, chatId: number, messageId: number): Promise<void> {
  await telegram(token, 'deleteMessage', { chat_id: chatId, message_id: messageId }).catch(() => undefined);
}

function botToken(env: Env): string {
  let token = String(env.BOT_TOKEN ?? '').trim();
  token = token.replace(/^['"]|['"]$/g, '').trim();
  token = token.replace(/^https:\/\/api\.telegram\.org\/bot/i, '');
  token = token.replace(/^bot/i, '');
  token = token.split('/')[0]?.trim() ?? '';
  return token;
}

function botTokenError(token: string): string | null {
  if (!token) return 'BOT_TOKEN is not configured.';
  if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(token)) {
    return 'BOT_TOKEN format is invalid. Store only the raw BotFather token, without bot, URL, spaces or quotes.';
  }
  return null;
}

async function telegramRequest<T = unknown>(token: string, method: string, payload: unknown): Promise<TelegramEnvelope<T>> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({})) as TelegramEnvelope<T>;
  if (!data.ok && (method === 'editMessageText' || method === 'editMessageMedia') && /message is not modified/i.test(String(data.description || ''))) {
    return { ok: true, result: data.result };
  }
  if (!response.ok && typeof data.ok !== 'boolean') {
    return { ok: false, description: `Telegram ${method} failed with HTTP ${response.status}` };
  }
  return data;
}

async function telegram<T = unknown>(token: string, method: string, payload: unknown): Promise<T> {
  const data = await telegramRequest<T>(token, method, payload);
  if (!data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result as T;
}
