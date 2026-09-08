import type { Env } from './types';
import { saveMainMenuMedia, saveShareInviteImageFileId } from './share-invite-config';
import { sendAdminHome as sendCurrentAdminHome } from './telegram-section-access-admin';
import { PUBLIC_BASE_URL } from './utils';
import { sectionBackgroundR2Key } from './section-backgrounds';
import { getTelegramMenuMessageId, setTelegramMenuMessageId } from './telegram-menu-state';

type Photo = { file_id: string; file_size?: number };
type Video = { file_id: string; file_size?: number; mime_type?: string; file_name?: string };
type Document = { file_id: string; file_size?: number; mime_type?: string; file_name?: string };
type Audio = { file_id: string; file_size?: number; mime_type?: string; file_name?: string };
type Message = { message_id: number; chat: { id: number }; from?: { id: number }; text?: string; photo?: Photo[]; video?: Video; document?: Document; audio?: Audio };
type Callback = { id: string; data?: string; from: { id: number }; message?: { message_id: number; chat: { id: number } } };
type Update = { message?: Message; callback_query?: Callback };
type Button = { text: string; callback_data: string };
type Keyboard = Button[][];
type UploadSource = { fileId: string; size?: number; type: string; via: 'photo' | 'document' | 'audio' };
type MainMenuMediaSource = { fileId: string; size?: number; type: 'photo' | 'video' };
type AudioGame = 'slot' | 'dice' | 'wallet-credit' | 'loading';
type PaymentMethod = 'stars' | 'gram' | 'usdt' | 'nft';
type PredictAsset = 'logo';
type PredictMarket = 'bitcoin' | 'gold' | 'oil';

type UploadTarget = { kind: 'game'; game: string } | { kind: 'background'; game: string } | { kind: 'crash-stage'; slot: number } | { kind: 'ton' } | { kind: 'home-slot' } | { kind: 'rank'; rank: string } | { kind: 'ghost-asset'; asset: string } | { kind: 'slot-symbol'; symbol: string } | { kind: 'payment-method'; method: PaymentMethod } | { kind: 'predict'; asset: PredictAsset; market: PredictMarket } | { kind: 'audio'; game: AudioGame } | { kind: 'main-menu' } | { kind: 'share-invite' };

const GAMES = [
  ['mines', 'Mines'], ['plinko', 'Plinko'], ['slot', 'Slot'],
  ['wheel', 'Wheel'], ['dice', 'Dice'], ['crash', 'Crash'], ['hilo', 'Chicken Cross'],
  ['coinflip', 'Pump'], ['ghostrun', 'Ghost Run'],
] as const;
const GAME_IDS = new Set(GAMES.map(([id]) => id));
const BACKGROUND_GAMES = [
  ['predict', 'Predict'],
  ['ghostrun', 'Ghost Run'],
  ['coinflip', 'Pump'],
] as const;
const HOME_PROMO_GAMES = ['promo-1', 'promo-2', 'promo-3'] as const;
const BACKGROUND_GAME_IDS = new Set<string>([...BACKGROUND_GAMES.map(([id]) => id), ...HOME_PROMO_GAMES]);
const STATE_PREFIX = 'admin:game-card-upload:';
const BACKGROUND_STATE_PREFIX = 'background:';
const CRASH_STAGE_STATE_PREFIX = 'crash-stage:';
const RANK_STATE_PREFIX = 'rank:';
const GHOST_ASSET_STATE_PREFIX = 'ghost-asset:';
const SLOT_SYMBOL_STATE_PREFIX = 'slot-symbol:';
const PAYMENT_METHOD_STATE_PREFIX = 'payment-method:';
const AUDIO_STATE_PREFIX = 'audio:';
const PREDICT_STATE_PREFIX = 'predict:';
const TON_STATE = 'ton-icon';
const HOME_SLOT_STATE = 'home-slot';
const MAIN_MENU_STATE = 'main-menu-image';
const SHARE_INVITE_STATE = 'share-invite-image';
const SLOT_AUDIO_KEY = 'slot-spin-audio';
const DICE_AUDIO_KEY = 'miniapp/audio';
const WALLET_CREDIT_AUDIO_KEY = 'miniapp/audio/wallet-credit';
const LOADING_AUDIO_KEY = 'miniapp/audio/loading';
const DICE_AUDIO_ENABLED_KEY = 'admin:miniapp-audio-enabled';
const RANKS = ['Rookie', 'Explorer', 'Pro', 'Elite', 'Master', 'Legend', 'Titan'] as const;
const GHOST_ASSETS = [
  ['background', 'Background اصلی'], ['background1', 'Background 1'], ['background2', 'Background 2'],
  ['background3', 'Background 3'], ['background4', 'Background 4'], ['background5', 'Background 5'],
  ['background6', 'Background 6'],
] as const;
const SLOT_SYMBOLS = [
  ['cherry', '🍒 گیلاس'], ['lemon', '🍋 لیمو'], ['orange', '🍊 پرتقال'], ['grape', '🍇 انگور'],
  ['watermelon', '🍉 هندوانه'], ['diamond', '💎 الماس'], ['gold', '⭐ طلایی'], ['lucky7', '7️⃣ عدد ۷'],
] as const;
const PAYMENT_METHODS = [
  ['stars', '⭐ Stars'], ['gram', '💎 Gram'], ['usdt', '💵 USDT'], ['nft', '🖼 NFT'],
] as const;
const PREDICT_MARKETS = [
  ['bitcoin', 'Bitcoin'], ['gold', 'Gold'], ['oil', 'Oil'],
] as const;
const MAX_BYTES = 10_000_000;
const MAIN_MENU_VIDEO_MAX_BYTES = 50_000_000;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/vnd.wave', 'audio/ogg', 'application/ogg', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/m4a']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'oga', 'webm', 'mp4', 'm4a', 'aac']);
// Versioned URLs are safe to cache forever (for example, Telegram's upload
// confirmation preview). The Play Hub intentionally uses stable URLs, so those
// responses must be re-fetched after an admin replaces an image.
const GAME_CARD_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const LIVE_GAME_CARD_CACHE_CONTROL = 'no-store, max-age=0';

export async function handleGameCardAdminRequest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/app/api/game-card-images') return serveGameCardManifest(env);
  const image = url.pathname.match(/^\/app\/api\/game-card-image\/([^/]+)$/);
  if (request.method === 'GET' && image) return serveImage(request, env, image[1]);
  const paymentMethodImage = url.pathname.match(/^\/app\/api\/uploaded-image\/payment-method\/([^/]+?)(?:\.png)?$/);
  if (request.method === 'GET' && paymentMethodImage) return servePaymentMethodImage(request, env, paymentMethodImage[1]);
  const crashStageImage = url.pathname.match(/^\/app\/api\/crash-stage-image\/(\d+)(?:\.png)?$/);
  if (request.method === 'GET' && crashStageImage) return serveCrashStageImage(request, env, crashStageImage[1]);
  if (request.method === 'GET' && url.pathname === '/app/api/crash-stage-images') return serveCrashStageManifest(env);
  if (request.method !== 'POST' || url.pathname !== '/telegram/webhook') return null;
  const update = await request.clone().json().catch(() => null) as Update | null;
  if (!update) return null;
  return handleUpdate(env, update);
}

async function serveImage(request: Request, env: Env, raw: string): Promise<Response> {
  const game = normalizeGame(raw.replace(/\.png$/i, ''));
  if (!game) return new Response('Not found', { status: 404 });
  const versioned = Boolean(new URL(request.url).searchParams.get('v'));
  const cacheControl = versioned ? GAME_CARD_CACHE_CONTROL : LIVE_GAME_CARD_CACHE_CONTROL;
  const object = await env.ASSETS.get(gameKey(game)).catch(() => null);
  if (!object) {
    return new Response(null, {
      status: 302,
      headers: {
        location: new URL(`/app/api/section-lock-image/${game}/locked.png?v=1`, request.url).toString(),
        'cache-control': cacheControl,
      },
    });
  }
  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType || 'image/jpeg',
      'cache-control': cacheControl,
      'x-content-type-options': 'nosniff',
    },
  });
}

async function serveGameCardManifest(env: Env): Promise<Response> {
  const images: Record<string, string> = {};
  await Promise.all(GAMES.map(async ([game]) => {
    const object = await env.ASSETS.head(gameKey(game)).catch(() => null);
    if (!object) {
      images[game] = `/app/api/section-lock-image/${game}/locked.png?v=1`;
      return;
    }
    const version = String(object.customMetadata?.version || object.uploaded?.getTime?.() || '1');
    images[game] = `/app/api/game-card-image/${game}.png?v=${encodeURIComponent(version)}`;
  }));
  return Response.json({ images }, { headers: { 'cache-control': 'no-store' } });
}

async function servePaymentMethodImage(request: Request, env: Env, raw: string): Promise<Response> {
  const method = normalizePaymentMethod(raw.replace(/\.png$/i, ''));
  if (!method) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  const head = await env.ASSETS.head(paymentMethodKey(method)).catch(() => null);
  if (!head) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  const url = new URL(request.url);
  if (!url.searchParams.get('v')) {
    const version = String(head.customMetadata?.version || head.uploaded?.getTime?.() || '1');
    url.search = '';
    url.searchParams.set('v', version);
    return new Response(null, { status: 302, headers: { location: url.toString(), 'cache-control': 'no-store' } });
  }
  const object = await env.ASSETS.get(paymentMethodKey(method)).catch(() => null);
  if (!object) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType || head.httpMetadata?.contentType || 'image/png',
      'cache-control': GAME_CARD_CACHE_CONTROL,
      'x-content-type-options': 'nosniff',
    },
  });
}

async function serveCrashStageImage(request: Request, env: Env, raw: string): Promise<Response> {
  const slot = normalizeCrashStageSlot(raw);
  if (!slot) return new Response('Not found', { status: 404 });
  const object = await env.ASSETS.get(crashStageKey(slot)).catch(() => null);
  if (!object) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  const versioned = Boolean(new URL(request.url).searchParams.get('v'));
  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType || 'image/jpeg',
      'cache-control': versioned ? 'public, max-age=31536000, immutable' : 'no-store, max-age=0',
      'x-content-type-options': 'nosniff',
    },
  });
}

async function serveCrashStageManifest(env: Env): Promise<Response> {
  const images: Record<string, string | null> = {};
  const preload: string[] = [];
  await Promise.all(Array.from({ length: 5 }, async (_, index) => {
    const slot = index + 1;
    const object = await env.ASSETS.head(crashStageKey(slot)).catch(() => null);
    if (!object) { images[String(slot)] = null; return; }
    const version = String(object.customMetadata?.version || object.uploaded?.getTime?.() || '1');
    const url = `/app/api/crash-stage-image/${slot}.png?v=${encodeURIComponent(version)}`;
    images[String(slot)] = url;
    preload.push(url);
  }));
  return Response.json({ images, preload }, { headers: { 'cache-control': 'no-store' } });
}

async function handleUpdate(env: Env, update: Update): Promise<Response | null> {
  const token = env.BOT_TOKEN;
  if (!token) return null;

  const callback = update.callback_query;
  if (callback) {
    const data = callback.data || '';
    const ours = data === 'botadmin:home'
      || data === 'botadmin:imagesmenu'
      || data === 'botadmin:paymentmethods'
      || data === 'botadmin:audiomenu'
      || data === 'botadmin:gameimages'
      || data === 'botadmin:gamebackgrounds'
      || data === 'botadmin:homepromos'
      || data === 'botadmin:crashstage'
      || data === 'botadmin:tonlogo'
      || data === 'botadmin:homeslot'
      || data === 'botadmin:mainmenuimage'
      || data === 'botadmin:predictimages'
      || data === 'botadmin:shareinviteimage'
      || data === 'botadmin:ranks'
      || data === 'botadmin:ghostassets'
      || data === 'botadmin:slotsymbols'
      || data.startsWith('botadmin:paymentmethod:')
      || data.startsWith('botadmin:audio:')
      || data.startsWith('botadmin:gameimage:')
      || data.startsWith('botadmin:gamebackground:')
      || data.startsWith('botadmin:homepromo:')
      || data.startsWith('botadmin:crashstage:')
      || data.startsWith('botadmin:rank:')
      || data.startsWith('botadmin:ghostasset:')
      || data.startsWith('botadmin:slotsymbol:')
      || data.startsWith('botadmin:predictimage:');
    if (!ours) return null;
    if (!isAdmin(env, callback.from.id)) return ok();
    await tg(token, 'answerCallbackQuery', { callback_query_id: callback.id }).catch(() => undefined);
    const chatId = callback.message?.chat.id ?? callback.from.id;
    const messageId = callback.message?.message_id;

    if (data === 'botadmin:home') {
      await clearState(env, callback.from.id);
      await sendHome(env, token, chatId, messageId);
    } else if (data === 'botadmin:imagesmenu') {
      await clearState(env, callback.from.id);
      await sendImagesMenu(token, chatId, messageId);
    } else if (data === 'botadmin:paymentmethods') {
      await clearState(env, callback.from.id);
      await sendPaymentMethodMenu(env, token, chatId, messageId);
    } else if (data === 'botadmin:audiomenu') {
      await clearState(env, callback.from.id);
      await sendAudioMenu(env, token, chatId, messageId);
    } else if (data === 'botadmin:gameimages') {
      await clearState(env, callback.from.id);
      await sendGameMenu(token, chatId, messageId);
    } else if (data === 'botadmin:gamebackgrounds') {
      await clearState(env, callback.from.id);
      await sendBackgroundMenu(token, chatId, messageId);
    } else if (data === 'botadmin:homepromos') {
      await clearState(env, callback.from.id);
      await sendHomePromoMenu(env, token, chatId, messageId);
    } else if (data === 'botadmin:crashstage') {
      await clearState(env, callback.from.id);
      await sendCrashStageMenu(env, token, chatId, messageId);
    } else if (data === 'botadmin:tonlogo') {
      await env.BOT_CACHE.put(stateKey(callback.from.id), TON_STATE, { expirationTtl: 900 });
      await upsert(token, chatId, messageId, '💎 لوگوی TON\n\nبرای حفظ فرمت و شفافیت، تصویر PNG را حتماً به‌صورت File/Document بفرستید.', [
        [{ text: '⬅️ تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }],
      ]);
    } else if (data === 'botadmin:homeslot') {
      await env.BOT_CACHE.put(stateKey(callback.from.id), HOME_SLOT_STATE, { expirationTtl: 900 });
      await promptImage(token, chatId, messageId, '🎰 تصویر اسلات صفحه Home', 'تصویری که داخل کادر شیشه‌ای اسلات در Home نمایش داده می‌شود را بفرستید.', 'botadmin:imagesmenu');
    } else if (data === 'botadmin:mainmenuimage') {
      await env.BOT_CACHE.put(stateKey(callback.from.id), MAIN_MENU_STATE, { expirationTtl: 900 });
      await upsert(token, chatId, messageId, '🎪 مدیای منوی اصلی 𝗩𝗲𝘅𝗮 𝗚𝗮𝗺𝗲\n\nیک عکس یا ویدیوی معمولی بفرستید. ویدیو باید به‌صورت Video تلگرام ارسال شود، نه File/Document. همان مدیا همراه متن منوی اصلی و دکمهٔ ورود به اپ نمایش داده می‌شود.', [
        [{ text: '⬅️ تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }],
      ]);
    } else if (data === 'botadmin:shareinviteimage') {
      await env.BOT_CACHE.put(stateKey(callback.from.id), SHARE_INVITE_STATE, { expirationTtl: 900 });
      await promptImage(token, chatId, messageId, '🎪 تصویر دعوت 𝗩𝗲𝘅𝗮 𝗚𝗮𝗺𝗲', 'یک تصویر را به‌صورت عکس معمولی بفرستید. همین تصویر همراه متن دعوت و دکمهٔ ورود به اپ ارسال می‌شود.', 'botadmin:imagesmenu');
    } else if (data === 'botadmin:predictimages') {
      await clearState(env, callback.from.id);
      await sendPredictImageMenu(env, token, chatId, messageId);
    } else if (data === 'botadmin:ranks') {
      await clearState(env, callback.from.id);
      await sendRankMenu(env, token, chatId, messageId);
    } else if (data === 'botadmin:ghostassets') {
      await clearState(env, callback.from.id);
      await sendGhostAssetMenu(env, token, chatId, messageId);
    } else if (data === 'botadmin:slotsymbols') {
      await clearState(env, callback.from.id);
      await sendSlotSymbolMenu(env, token, chatId, messageId);
    } else if (data.startsWith('botadmin:paymentmethod:')) {
      const method = normalizePaymentMethod(data.slice('botadmin:paymentmethod:'.length));
      if (method) {
        await env.BOT_CACHE.put(stateKey(callback.from.id), `${PAYMENT_METHOD_STATE_PREFIX}${method}`, { expirationTtl: 900 });
        await promptImage(token, chatId, messageId, `💳 تصویر روش پرداخت ${paymentMethodLabel(method)}`, 'تصویر جدید این روش پرداخت را بفرستید. بعد از آپلود، نسخه جدید خودکار جای نسخه قبلی را می‌گیرد.', 'botadmin:paymentmethods');
      }
    } else if (data.startsWith('botadmin:audio:')) {
      const game = normalizeAudioGame(data.slice('botadmin:audio:'.length));
      if (game) {
        await env.BOT_CACHE.put(stateKey(callback.from.id), `${AUDIO_STATE_PREFIX}${game}`, { expirationTtl: 900 });
        await promptAudio(token, chatId, messageId, game);
      }
    } else if (data.startsWith('botadmin:rank:')) {
      const rank = normalizeRank(data.slice('botadmin:rank:'.length));
      if (rank) {
        await env.BOT_CACHE.put(stateKey(callback.from.id), `${RANK_STATE_PREFIX}${rank}`, { expirationTtl: 900 });
        await promptImage(token, chatId, messageId, `🏆 تصویر رنک ${rank}`, 'تصویر شخصیت این رنک را بفرستید.', 'botadmin:ranks');
      }
    } else if (data.startsWith('botadmin:ghostasset:')) {
      const asset = normalizeGhostAsset(data.slice('botadmin:ghostasset:'.length));
      if (asset) {
        await env.BOT_CACHE.put(stateKey(callback.from.id), `${GHOST_ASSET_STATE_PREFIX}${asset}`, { expirationTtl: 900 });
        await promptImage(token, chatId, messageId, `👻 ${ghostAssetLabel(asset)}`, 'تصویر داخل کادر بازی Ghost Run را بفرستید.', 'botadmin:ghostassets');
      }
    } else if (data.startsWith('botadmin:slotsymbol:')) {
      const symbol = normalizeSlotSymbol(data.slice('botadmin:slotsymbol:'.length));
      if (symbol) {
        await env.BOT_CACHE.put(stateKey(callback.from.id), `${SLOT_SYMBOL_STATE_PREFIX}${symbol}`, { expirationTtl: 900 });
        await promptImage(token, chatId, messageId, `🎰 ${slotSymbolLabel(symbol)}`, 'تصویر این شکل اسلات را بفرستید. تصویر بلافاصله روی ریل‌های بازی استفاده می‌شود.', 'botadmin:slotsymbols');
      }
    } else if (data.startsWith('botadmin:predictimage:')) {
      const [assetValue, marketValue] = data.slice('botadmin:predictimage:'.length).split(':');
      const asset = normalizePredictAsset(assetValue);
      const market = normalizePredictMarket(marketValue);
      if (asset && market) {
        await env.BOT_CACHE.put(stateKey(callback.from.id), `${PREDICT_STATE_PREFIX}${asset}:${market}`, { expirationTtl: 900 });
        await promptImage(token, chatId, messageId, `📈 لوگو ${predictMarketLabel(market)}`, 'لوگوی بازار را ترجیحاً به‌صورت PNG شفاف و File/Document بفرستید.', 'botadmin:predictimages');
      }
    } else if (data.startsWith('botadmin:homepromo:')) {
      const slot = normalizeHomePromoSlot(data.slice('botadmin:homepromo:'.length));
      if (slot) {
        await env.BOT_CACHE.put(stateKey(callback.from.id), `${BACKGROUND_STATE_PREFIX}${homePromoGame(slot)}`, { expirationTtl: 900 });
        await upsert(token, chatId, messageId, `🖼 تبلیغ Home — تصویر ${slot} از 3\n\nتصویر را فقط به‌صورت File/Document بفرستید تا تلگرام آن را فشرده یا تبدیل نکند. فایل اصلی PNG، JPG یا WebP بدون تغییر ذخیره می‌شود.`, [
          [{ text: '⬅️ تبلیغات Home', callback_data: 'botadmin:homepromos' }],
        ]);
      }
    } else if (data.startsWith('botadmin:gamebackground:')) {
      const game = normalizeBackgroundGame(data.slice('botadmin:gamebackground:'.length));
      if (game && !homePromoSlotFromGame(game)) {
        await env.BOT_CACHE.put(stateKey(callback.from.id), `${BACKGROUND_STATE_PREFIX}${game}`, { expirationTtl: 900 });
        await upsert(token, chatId, messageId, `🌄 بک‌گراند ${backgroundLabel(game)}\n\nتصویر را به‌صورت عکس معمولی یا File/Document بفرستید. PNG، JPG و WebP پشتیبانی می‌شوند.`, [
          [{ text: '⬅️ بازگشت', callback_data: 'botadmin:gamebackgrounds' }],
        ]);
      }
    } else if (data.startsWith('botadmin:crashstage:')) {
      const slot = normalizeCrashStageSlot(data.slice('botadmin:crashstage:'.length));
      if (slot) {
        await env.BOT_CACHE.put(stateKey(callback.from.id), `${CRASH_STAGE_STATE_PREFIX}${slot}`, { expirationTtl: 900 });
        await upsert(token, chatId, messageId, `🚀 تصویر ${slot} از 5 داخل Crash\n\n${slot === 1 ? 'Image 1 شروع مسیر افقی است.' : slot === 5 ? 'Image 5 آخر مسیر است و بعد از آن دوباره Image 1 می‌آید.' : `Image ${slot} بین تصویر قبلی و بعدی قرار می‌گیرد.`}\nلبه راست هر تصویر باید ادامه‌ی طبیعی لبه چپ تصویر بعدی باشد. برای حفظ کیفیت، تصویر را به‌صورت File/Document بفرستید. PNG، JPG و WebP پشتیبانی می‌شوند.`, [
          [{ text: '⬅️ بازگشت', callback_data: 'botadmin:crashstage' }],
        ]);
      }
    } else {
      const game = normalizeGame(data.slice('botadmin:gameimage:'.length));
      if (game) {
        await env.BOT_CACHE.put(stateKey(callback.from.id), game, { expirationTtl: 900 });
        await upsert(token, chatId, messageId, `🖼 تصویر کارت ${label(game)}\n\nتصویر را به‌صورت عکس معمولی یا File/Document بفرستید. نسبت پیشنهادی ۴:۵ است.`, [
          [{ text: '⬅️ بازگشت', callback_data: 'botadmin:gameimages' }],
        ]);
      }
    }
    return ok();
  }

  const message = update.message;
  if (!message?.from?.id) return null;
  const text = message.text?.trim() || '';
  if (isAdminCommand(text)) {
    if (!env.BOT_ADMIN) {
      await deleteMessage(token, message.chat.id, message.message_id);
      await tg(token, 'sendMessage', { chat_id: message.chat.id, text: `BOT_ADMIN تنظیم نشده.\nآیدی عددی شما: ${message.from.id}` }).catch(() => undefined);
      return ok();
    }
    if (!isAdmin(env, message.from.id)) {
      await deleteMessage(token, message.chat.id, message.message_id);
      await tg(token, 'sendMessage', { chat_id: message.chat.id, text: `دسترسی ادمین ندارید.\nآیدی عددی شما: ${message.from.id}` }).catch(() => undefined);
      return ok();
    }
    await clearState(env, message.from.id);
    await deleteMessage(token, message.chat.id, message.message_id);
    await sendHome(env, token, message.chat.id);
    return ok();
  }
  if (!isAdmin(env, message.from.id)) return null;

  const target = normalizeTarget(await env.BOT_CACHE.get(stateKey(message.from.id)).catch(() => null));
  if (!target) return null;
  if (text === '/cancel' || text === 'لغو') {
    await clearState(env, message.from.id);
    await deleteMessage(token, message.chat.id, message.message_id);
    const menuMessageId = await trackedMenuMessageId(env, message.chat.id);
    if (target.kind === 'game') await sendGameMenu(token, message.chat.id, menuMessageId);
    else if (target.kind === 'background') {
      if (homePromoSlotFromGame(target.game)) await sendHomePromoMenu(env, token, message.chat.id, menuMessageId);
      else await sendBackgroundMenu(token, message.chat.id, menuMessageId);
    }
    else if (target.kind === 'crash-stage') await sendCrashStageMenu(env, token, message.chat.id, menuMessageId);
    else if (target.kind === 'rank') await sendRankMenu(env, token, message.chat.id, menuMessageId);
    else if (target.kind === 'ghost-asset') await sendGhostAssetMenu(env, token, message.chat.id, menuMessageId);
    else if (target.kind === 'slot-symbol') await sendSlotSymbolMenu(env, token, message.chat.id, menuMessageId);
    else if (target.kind === 'payment-method') await sendPaymentMethodMenu(env, token, message.chat.id, menuMessageId);
    else if (target.kind === 'predict') await sendPredictImageMenu(env, token, message.chat.id, menuMessageId);
    else if (target.kind === 'audio') await sendAudioMenu(env, token, message.chat.id, menuMessageId);
    else await sendImagesMenu(token, message.chat.id, menuMessageId);
    return ok();
  }

  if (target.kind === 'audio') {
    const source = audioFromMessage(message);
    if (!source) {
      await replaceUploadPrompt(env, token, message, '❌ فایل صوتی MP3، WAV، OGG، WebM، M4A یا AAC بفرستید یا /cancel را بزنید.', 'botadmin:audiomenu');
      return ok();
    }
    try {
      await saveAudio(env, token, target.game, source);
      await clearState(env, message.from.id);
      await deleteMessage(token, message.chat.id, message.message_id);
      await deleteTrackedMenu(env, token, message.chat.id);
      const successText = target.game === 'loading'
        ? '✅ صدای Loading Screen ذخیره شد و روی لودر اولیه فعال است.'
        : `✅ صدای ${audioGameLabel(target.game)} ذخیره شد${target.game === 'dice' ? ' و فعال است.' : '.'}`;
      const sent = await tg<{ message_id?: number }>(token, 'sendMessage', {
        chat_id: message.chat.id,
        text: successText,
        reply_markup: { inline_keyboard: [[{ text: `🔊 تغییر صدای ${audioGameLabel(target.game)}`, callback_data: `botadmin:audio:${target.game}` }], [{ text: '🎵 صداها', callback_data: 'botadmin:audiomenu' }], [{ text: '🖼 تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]] },
      });
      await trackMenuMessage(env, message.chat.id, sent?.message_id);
    } catch (error) {
      await replaceUploadPrompt(env, token, message, `❌ ${error instanceof Error ? error.message : 'آپلود صدا انجام نشد.'}`, 'botadmin:audiomenu');
    }
    return ok();
  }

  if (target.kind === 'main-menu') {
    const source = mainMenuMediaFromMessage(message);
    if (!source) {
      await replaceUploadPrompt(env, token, message, '❌ یک عکس یا ویدیوی معمولی بفرستید. ویدیو را به‌صورت Video تلگرام ارسال کنید، نه File/Document.');
      return ok();
    }
    if (source.type === 'video' && source.size && source.size > MAIN_MENU_VIDEO_MAX_BYTES) {
      await replaceUploadPrompt(env, token, message, '❌ حجم ویدیوی منوی اصلی باید حداکثر ۵۰ مگابایت باشد.');
      return ok();
    }
    try {
      await saveMainMenuMedia(env, source.fileId, source.type);
      await clearState(env, message.from.id);
      await deleteMessage(token, message.chat.id, message.message_id);
      await deleteTrackedMenu(env, token, message.chat.id);
      const successText = `✅ ${source.type === 'video' ? 'ویدیو' : 'تصویر'} منوی اصلی 𝗩𝗲𝘅𝗮 𝗚𝗮𝗺𝗲 ذخیره شد.`;
      const reply_markup = { inline_keyboard: [[{ text: '🎪 تغییر مدیای منوی اصلی', callback_data: 'botadmin:mainmenuimage' }], [{ text: '🖼 تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]] };
      const sent = source.type === 'video'
        ? await tg<{ message_id?: number }>(token, 'sendVideo', { chat_id: message.chat.id, video: source.fileId, caption: successText, supports_streaming: true, reply_markup })
          .catch(() => tg<{ message_id?: number }>(token, 'sendMessage', { chat_id: message.chat.id, text: successText, reply_markup }))
        : await tg<{ message_id?: number }>(token, 'sendPhoto', { chat_id: message.chat.id, photo: source.fileId, caption: successText, reply_markup })
          .catch(() => tg<{ message_id?: number }>(token, 'sendMessage', { chat_id: message.chat.id, text: successText, reply_markup }));
      await trackMenuMessage(env, message.chat.id, sent?.message_id);
    } catch (error) {
      await replaceUploadPrompt(env, token, message, `❌ ${error instanceof Error ? error.message : 'ذخیرهٔ مدیای منوی اصلی انجام نشد.'}`);
    }
    return ok();
  }

  if (target.kind === 'share-invite') {
    const source = imageFromMessage(message);
    if (!source || source.via !== 'photo') {
      await replaceUploadPrompt(env, token, message, '❌ تصویر دعوت را به‌صورت عکس معمولی بفرستید، نه File/Document.');
      return ok();
    }
    try {
      await saveShareInviteImageFileId(env, source.fileId);
      await clearState(env, message.from.id);
      await deleteMessage(token, message.chat.id, message.message_id);
      await deleteTrackedMenu(env, token, message.chat.id);
      const sent = await tg<{ message_id?: number }>(token, 'sendPhoto', {
        chat_id: message.chat.id,
        photo: source.fileId,
        caption: '✅ تصویر دعوت 𝗩𝗲𝘅𝗮 𝗚𝗮𝗺𝗲 ذخیره شد.',
        reply_markup: { inline_keyboard: [[{ text: '🎪 تغییر تصویر دعوت', callback_data: 'botadmin:shareinviteimage' }], [{ text: '🖼 تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]] },
      }).catch(() => tg<{ message_id?: number }>(token, 'sendMessage', { chat_id: message.chat.id, text: '✅ تصویر دعوت 𝗩𝗲𝘅𝗮 𝗚𝗮𝗺𝗲 ذخیره شد.' }));
      await trackMenuMessage(env, message.chat.id, sent?.message_id);
    } catch (error) {
      await replaceUploadPrompt(env, token, message, `❌ ${error instanceof Error ? error.message : 'ذخیرهٔ تصویر دعوت انجام نشد.'}`);
    }
    return ok();
  }

  const source = imageFromMessage(message);
  if (!source) {
    await replaceUploadPrompt(env, token, message, '❌ یک فایل PNG، JPG یا WebP بفرستید یا /cancel را بزنید.');
    return ok();
  }
  if (target.kind === 'ton' && source.via !== 'document') {
    await replaceUploadPrompt(env, token, message, '❌ برای اینکه PNG تبدیل به JPG نشود و شفافیتش حفظ شود، تصویر را از بخش File به‌صورت Document بفرستید؛ عکس معمولی پذیرفته نمی‌شود.');
    return ok();
  }
  if (target.kind === 'crash-stage' && source.via !== 'document') {
    await replaceUploadPrompt(env, token, message, '❌ برای اینکه تصویرهای متصل Crash فشرده و تار نشوند، تصویر را از بخش File به‌صورت Document بفرستید؛ عکس معمولی پذیرفته نمی‌شود.');
    return ok();
  }
  if (target.kind === 'background' && homePromoSlotFromGame(target.game) && source.via !== 'document') {
    await replaceUploadPrompt(env, token, message, '❌ تصاویر تبلیغاتی Home باید فقط به‌صورت File/Document ارسال شوند تا تلگرام هیچ فشرده‌سازی یا تبدیلی روی فایل انجام ندهد.', 'botadmin:homepromos');
    return ok();
  }

  try {
    await saveImage(env, token, target, source);
    await clearState(env, message.from.id);
    await deleteMessage(token, message.chat.id, message.message_id);
    await deleteTrackedMenu(env, token, message.chat.id);

    if (target.kind === 'ton') {
      const successText = `✅ لوگوی TON با فرمت ${source.type === 'image/png' ? 'PNG' : source.type === 'image/webp' ? 'WebP' : 'JPG'} ذخیره شد.`;
      const sent = await tg<{ message_id?: number }>(token, 'sendPhoto', {
        chat_id: message.chat.id,
        photo: `${PUBLIC_BASE_URL}/app/api/uploaded-image/ton-icon.png?v=${Date.now()}`,
        caption: successText,
        reply_markup: { inline_keyboard: [[{ text: '💎 تغییر لوگوی TON', callback_data: 'botadmin:tonlogo' }], [{ text: '🖼 تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]] },
      }).catch(() => tg<{ message_id?: number }>(token, 'sendMessage', { chat_id: message.chat.id, text: successText }));
      await trackMenuMessage(env, message.chat.id, sent?.message_id);
    } else if (target.kind === 'background') {
      const promoSlot = homePromoSlotFromGame(target.game);
      if (promoSlot) {
        await sendSavedImage(env, token, message.chat.id, `${PUBLIC_BASE_URL}/app/api/section-background/${target.game}.png?v=${Date.now()}`, `✅ تصویر تبلیغاتی ${promoSlot} از 3 Home بدون تغییر ذخیره شد.`, '🖼 تبلیغات Home', 'botadmin:homepromos');
      } else {
        const successText = `✅ بک‌گراند ${backgroundLabel(target.game)} ذخیره شد.`;
        const sent = await tg<{ message_id?: number }>(token, 'sendPhoto', {
          chat_id: message.chat.id,
          photo: `${PUBLIC_BASE_URL}/app/api/section-background/${target.game}.png?v=${Date.now()}`,
          caption: successText,
          reply_markup: { inline_keyboard: [[{ text: '🌄 بک‌گراند بازی‌ها', callback_data: 'botadmin:gamebackgrounds' }], [{ text: '🖼 تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]] },
        }).catch(() => tg<{ message_id?: number }>(token, 'sendMessage', { chat_id: message.chat.id, text: successText }));
        await trackMenuMessage(env, message.chat.id, sent?.message_id);
      }
    } else if (target.kind === 'crash-stage') {
      const successText = `✅ تصویر ${target.slot} از 5 مسیر افقی Crash ذخیره شد.`;
      const sent = await tg<{ message_id?: number }>(token, 'sendPhoto', {
        chat_id: message.chat.id,
        photo: `${PUBLIC_BASE_URL}/app/api/crash-stage-image/${target.slot}.png?v=${Date.now()}`,
        caption: successText,
        reply_markup: { inline_keyboard: [[{ text: '🚀 تصاویر داخل Crash', callback_data: 'botadmin:crashstage' }], [{ text: '🖼 تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]] },
      }).catch(() => tg<{ message_id?: number }>(token, 'sendMessage', { chat_id: message.chat.id, text: successText, reply_markup: { inline_keyboard: [[{ text: '🚀 تصاویر داخل Crash', callback_data: 'botadmin:crashstage' }]] } }));
      await trackMenuMessage(env, message.chat.id, sent?.message_id);
    } else if (target.kind === 'home-slot') {
      await sendSavedImage(env, token, message.chat.id, `${PUBLIC_BASE_URL}/app/api/home-lottery-slot.png?v=${Date.now()}`, '✅ تصویر اسلات صفحه Home ذخیره شد.', '🎰 تغییر دوباره', 'botadmin:homeslot');
    } else if (target.kind === 'rank') {
      await sendSavedImage(env, token, message.chat.id, `${PUBLIC_BASE_URL}/app/api/rank-character/${target.rank}.png?v=${Date.now()}`, `✅ تصویر رنک ${target.rank} ذخیره شد.`, '🏆 تصاویر رنک‌ها', 'botadmin:ranks');
    } else if (target.kind === 'ghost-asset') {
      await sendSavedImage(env, token, message.chat.id, `${PUBLIC_BASE_URL}/app/api/ghost-run-asset/${target.asset}.png?v=${Date.now()}`, `✅ ${ghostAssetLabel(target.asset)} ذخیره شد.`, '👻 تصاویر Ghost Run', 'botadmin:ghostassets');
    } else if (target.kind === 'slot-symbol') {
      await sendSavedImage(env, token, message.chat.id, `${PUBLIC_BASE_URL}/app/api/uploaded-image/slot-symbols/${target.symbol}?v=${Date.now()}`, `✅ ${slotSymbolLabel(target.symbol)} ذخیره شد و روی ریل‌های Slot نمایش داده می‌شود.`, '🎰 شکل‌های اسلات', 'botadmin:slotsymbols');
    } else if (target.kind === 'payment-method') {
      await sendSavedImage(env, token, message.chat.id, `${PUBLIC_BASE_URL}/app/api/uploaded-image/payment-method/${target.method}.png?v=${Date.now()}`, `✅ تصویر روش پرداخت ${paymentMethodLabel(target.method)} ذخیره شد.`, '💳 تصاویر روش پرداخت', 'botadmin:paymentmethods');
    } else if (target.kind === 'predict') {
      await sendSavedImage(env, token, message.chat.id, `${PUBLIC_BASE_URL}/app/api/predict-market-image/${target.market}.png?v=${Date.now()}`, `✅ لوگوی ${predictMarketLabel(target.market)} ذخیره شد.`, '📈 تصاویر Predict', 'botadmin:predictimages');
    } else {
      const sent = await tg<{ message_id?: number }>(token, 'sendPhoto', {
        chat_id: message.chat.id,
        photo: `${PUBLIC_BASE_URL}/app/api/game-card-image/${target.game}.png?v=${Date.now()}`,
        caption: `✅ تصویر کارت ${label(target.game)} ذخیره شد.`,
        reply_markup: { inline_keyboard: [[{ text: '🎮 تصاویر بازی‌ها', callback_data: 'botadmin:gameimages' }], [{ text: '🖼 تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]] },
      }).catch(() => tg<{ message_id?: number }>(token, 'sendMessage', { chat_id: message.chat.id, text: `✅ تصویر کارت ${label(target.game)} ذخیره شد.` }));
      await trackMenuMessage(env, message.chat.id, sent?.message_id);
    }
  } catch (error) {
    await replaceUploadPrompt(env, token, message, `❌ ${error instanceof Error ? error.message : 'آپلود انجام نشد.'}`);
  }
  return ok();
}

async function sendHome(env: Env, token: string, chatId: number, messageId?: number): Promise<void> {
  await sendCurrentAdminHome(env, token, chatId, messageId);
}

async function sendImagesMenu(token: string, chatId: number, messageId?: number): Promise<void> {
  await upsert(token, chatId, messageId, '🖼 تصاویر و ظاهر\n\nبخش موردنظر را انتخاب کنید.', [
    [{ text: '💳 تصاویر روش پرداخت', callback_data: 'botadmin:paymentmethods' }],
    [
      { text: '🎮 کارت بازی‌ها', callback_data: 'botadmin:gameimages' },
      { text: '🌄 بک‌گراندها', callback_data: 'botadmin:gamebackgrounds' },
    ],
    [{ text: '🖼 تبلیغات Home', callback_data: 'botadmin:homepromos' }],
    [{ text: '🎵 صداها', callback_data: 'botadmin:audiomenu' }],
    [{ text: '🎪 مدیای منوی اصلی 𝗩𝗲𝘅𝗮 𝗚𝗮𝗺𝗲', callback_data: 'botadmin:mainmenuimage' }],
    [{ text: '🎪 تصویر دعوت 𝗩𝗲𝘅𝗮 𝗚𝗮𝗺𝗲', callback_data: 'botadmin:shareinviteimage' }],
    [{ text: '💎 لوگوی TON', callback_data: 'botadmin:tonlogo' }],
    [{ text: '📈 لوگوهای Predict', callback_data: 'botadmin:predictimages' }],
    [{ text: '🎰 شکل‌های بازی Slot', callback_data: 'botadmin:slotsymbols' }],
    [
      { text: '🎰 اسلات Home', callback_data: 'botadmin:homeslot' },
      { text: '🏆 تصاویر رنک‌ها', callback_data: 'botadmin:ranks' },
    ],
    [{ text: '👻 تصاویر داخل Ghost Run', callback_data: 'botadmin:ghostassets' }],
    [{ text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' }],
  ]);
}

async function sendHomePromoMenu(env: Env, token: string, chatId: number, messageId?: number): Promise<void> {
  const present = await Promise.all(HOME_PROMO_GAMES.map((game) => env.ASSETS.head(sectionBackgroundR2Key(game)).then(Boolean).catch(() => false)));
  const buttons = HOME_PROMO_GAMES.map((_, index) => ({ text: `${present[index] ? '✅ ' : ''}Image ${index + 1}`, callback_data: `botadmin:homepromo:${index + 1}` }));
  await upsert(token, chatId, messageId, '🖼 تبلیغات Home\n\nسه جایگاه تصویر در بالای Home. هر تصویر را فقط به‌صورت File/Document بفرستید تا فایل اصلی بدون فشرده‌سازی و تبدیل ذخیره شود.', [
    buttons,
    [{ text: '⬅️ تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }],
  ]);
}

async function sendPaymentMethodMenu(env: Env, token: string, chatId: number, messageId?: number): Promise<void> {
  const present = await Promise.all(PAYMENT_METHODS.map(([method]) => env.ASSETS.head(paymentMethodKey(method)).then(Boolean).catch(() => false)));
  const buttons = PAYMENT_METHODS.map(([method, title], index) => ({ text: `${present[index] ? '✅ ' : ''}${title}`, callback_data: `botadmin:paymentmethod:${method}` }));
  await upsert(token, chatId, messageId, '💳 تصاویر روش پرداخت\n\nStars، Gram، USDT یا NFT را انتخاب کنید و تصویر جدیدش را بفرستید. علامت ✅ یعنی قبلاً برای آن تصویر آپلود شده است.', [
    buttons,
    [{ text: '⬅️ تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }],
  ]);
}

async function sendAudioMenu(env: Env, token: string, chatId: number, messageId?: number): Promise<void> {
  const [loadingAudio, slotAudio, diceAudio, walletCreditAudio] = await Promise.all([
    env.ASSETS.head(LOADING_AUDIO_KEY).then(Boolean).catch(() => false),
    env.ASSETS.head(SLOT_AUDIO_KEY).then(Boolean).catch(() => false),
    env.ASSETS.head(DICE_AUDIO_KEY).then(Boolean).catch(() => false),
    env.ASSETS.head(WALLET_CREDIT_AUDIO_KEY).then(Boolean).catch(() => false),
  ]);
  await upsert(token, chatId, messageId, '🎵 صداها\n\nبخش موردنظر را انتخاب کنید و فایل جدید را بفرستید. آپلود جدید مستقیماً جایگزین صدای فعلی می‌شود.', [
    [{ text: `${loadingAudio ? '✅ ' : ''}🔊 Loading Screen`, callback_data: 'botadmin:audio:loading' }],
    [
      { text: `${slotAudio ? '✅ ' : ''}🎰 Slot`, callback_data: 'botadmin:audio:slot' },
      { text: `${diceAudio ? '✅ ' : ''}🎲 Dice`, callback_data: 'botadmin:audio:dice' },
    ],
    [{ text: `${walletCreditAudio ? '✅ ' : ''}💳 Wallet · موجودی ناکافی`, callback_data: 'botadmin:audio:wallet-credit' }],
    [{ text: '⬅️ تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }],
  ]);
}

async function sendGameMenu(token: string, chatId: number, messageId?: number): Promise<void> {
  const rows: Keyboard = [];
  for (let i = 0; i < GAMES.length; i += 2) {
    rows.push(GAMES.slice(i, i + 2).map(([id, name]) => ({ text: name, callback_data: `botadmin:gameimage:${id}` })));
  }
  rows.push([{ text: '⬅️ تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]);
  await upsert(token, chatId, messageId, '🎮 تصاویر کارت بازی‌ها\n\nیک بازی را انتخاب کنید. تصویر را می‌توانید عادی یا به‌صورت فایل بفرستید.', rows);
}

async function sendPredictImageMenu(env: Env, token: string, chatId: number, messageId?: number): Promise<void> {
  const present = await Promise.all(PREDICT_MARKETS.map(([market]) => env.ASSETS.head(predictAssetKey('logo', market)).then(Boolean).catch(() => false)));
  const rows: Keyboard = PREDICT_MARKETS.map(([market, title], index) => [
    { text: `${present[index] ? '✅ ' : ''}لوگو ${title}`, callback_data: `botadmin:predictimage:logo:${market}` },
  ]);
  rows.push([{ text: '⬅️ تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]);
  await upsert(token, chatId, messageId, '📈 تصاویر Predict\n\nلوگوی بازار را انتخاب کنید. علامت ✅ یعنی تصویر آن بخش قبلاً ذخیره شده است.', rows);
}

async function sendBackgroundMenu(token: string, chatId: number, messageId?: number): Promise<void> {
  const gameBackgrounds = BACKGROUND_GAMES;
  const rows: Keyboard = [
    gameBackgrounds.map(([id, name]) => ({ text: name, callback_data: `botadmin:gamebackground:${id}` })),
    [{ text: '⬅️ تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }],
  ];
  await upsert(token, chatId, messageId, '🌄 بک‌گراند بازی‌ها\n\nPredict، Ghost Run یا Pump را انتخاب کنید و تصویر بک‌گراند را بفرستید.', rows);
}

async function sendCrashStageMenu(env: Env, token: string, chatId: number, messageId?: number): Promise<void> {
  const present = await Promise.all(Array.from({ length: 5 }, (_, index) => env.ASSETS.head(crashStageKey(index + 1)).then((object) => Boolean(object)).catch(() => false)));
  const buttons = Array.from({ length: 5 }, (_, index) => ({ text: `${present[index] ? '✅ ' : ''}Image ${index + 1}`, callback_data: `botadmin:crashstage:${index + 1}` }));
  const rows: Keyboard = [];
  for (let index = 0; index < buttons.length; index += 2) rows.push(buttons.slice(index, index + 2));
  rows.push([{ text: '⬅️ تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]);
  await upsert(token, chatId, messageId, '🚀 ۵ تصویر افقی داخل Crash\n\nImage 1 تا Image 5 به‌ترتیب از چپ به راست حرکت می‌کنند. لبه راست هر تصویر باید ادامه‌ی لبه چپ تصویر بعدی باشد و بعد از Image 5 دوباره Image 1 نمایش داده می‌شود.', rows);
}

async function sendRankMenu(env: Env, token: string, chatId: number, messageId?: number): Promise<void> {
  const present = await Promise.all(RANKS.map((rank) => env.ASSETS.head(`rank-character/${rank}`).then(Boolean).catch(() => false)));
  const buttons = RANKS.map((rank, index) => ({ text: `${present[index] ? '✅ ' : ''}${rank}`, callback_data: `botadmin:rank:${rank}` }));
  const rows: Keyboard = [];
  for (let index = 0; index < buttons.length; index += 2) rows.push(buttons.slice(index, index + 2));
  rows.push([{ text: '⬅️ تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]);
  await upsert(token, chatId, messageId, '🏆 تصاویر رنک‌ها\n\nرنک موردنظر را انتخاب و تصویر جدیدش را ارسال کنید. علامت ✅ یعنی قبلاً تصویری برای آن آپلود شده است.', rows);
}

async function sendGhostAssetMenu(env: Env, token: string, chatId: number, messageId?: number): Promise<void> {
  const present = await Promise.all(GHOST_ASSETS.map(([asset]) => env.ASSETS.head(`ghost-run-assets/${asset}`).then(Boolean).catch(() => false)));
  const buttons = GHOST_ASSETS.map(([asset, title], index) => ({ text: `${present[index] ? '✅ ' : ''}${title}`, callback_data: `botadmin:ghostasset:${asset}` }));
  const rows: Keyboard = [];
  for (let index = 0; index < buttons.length; index += 2) rows.push(buttons.slice(index, index + 2));
  rows.push([{ text: '⬅️ تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]);
  await upsert(token, chatId, messageId, '👻 تصاویر داخل کادر بازی Ghost Run\n\nبخش موردنظر صحنه را انتخاب کنید و تصویر جایگزین را بفرستید.', rows);
}

async function sendSlotSymbolMenu(env: Env, token: string, chatId: number, messageId?: number): Promise<void> {
  const present = await Promise.all(SLOT_SYMBOLS.map(([symbol]) => env.ASSETS.head(`slot-symbol/${symbol}`).then(Boolean).catch(() => false)));
  const buttons = SLOT_SYMBOLS.map(([symbol, title], index) => ({ text: `${present[index] ? '✅ ' : ''}${title}`, callback_data: `botadmin:slotsymbol:${symbol}` }));
  const rows: Keyboard = [];
  for (let index = 0; index < buttons.length; index += 2) rows.push(buttons.slice(index, index + 2));
  rows.push([{ text: '⬅️ تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]);
  await upsert(token, chatId, messageId, '🎰 شکل‌های بازی Slot\n\nیکی از ۸ شکل را انتخاب کنید و تصویر PNG، JPG یا WebP آن را بفرستید. علامت ✅ یعنی تصویر آن شکل قبلاً آپلود شده است.', rows);
}

async function promptImage(token: string, chatId: number, messageId: number | undefined, title: string, description: string, back: string): Promise<void> {
  await upsert(token, chatId, messageId, `${title}\n\n${description}\n\nPNG، JPG و WebP پشتیبانی می‌شوند. برای حفظ کیفیت و شفافیت بهتر است تصویر را به‌صورت File/Document بفرستید.`, [[{ text: '⬅️ بازگشت', callback_data: back }]]);
}

async function promptAudio(token: string, chatId: number, messageId: number | undefined, game: AudioGame): Promise<void> {
  await upsert(token, chatId, messageId, `🔊 صدای ${audioGameLabel(game)}\n\nفایل صوتی جدید را بفرستید. فایل قبلی مستقیماً جایگزین می‌شود.\n\nMP3، WAV، OGG، WebM، M4A و AAC پشتیبانی می‌شوند. حداکثر حجم ۱۰ مگابایت است.`, [[{ text: '⬅️ صداها', callback_data: 'botadmin:audiomenu' }]]);
}

async function sendSavedImage(env: Env, token: string, chatId: number, photo: string, caption: string, buttonText: string, callbackData: string): Promise<void> {
  const reply_markup = { inline_keyboard: [[{ text: buttonText, callback_data: callbackData }], [{ text: '🖼 تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' }]] };
  const sent = await tg<{ message_id?: number }>(token, 'sendPhoto', { chat_id: chatId, photo, caption, reply_markup })
    .catch(() => tg<{ message_id?: number }>(token, 'sendMessage', { chat_id: chatId, text: caption, reply_markup }));
  await trackMenuMessage(env, chatId, sent?.message_id);
}

async function replaceUploadPrompt(env: Env, token: string, message: Message, text: string, back = 'botadmin:imagesmenu'): Promise<void> {
  await deleteMessage(token, message.chat.id, message.message_id);
  await upsert(token, message.chat.id, await trackedMenuMessageId(env, message.chat.id), text, [[{ text: '⬅️ بازگشت', callback_data: back }]]);
}

async function trackedMenuMessageId(env: Env, chatId: number): Promise<number | undefined> {
  return getTelegramMenuMessageId(env, chatId);
}

async function deleteTrackedMenu(env: Env, token: string, chatId: number): Promise<void> {
  const messageId = await trackedMenuMessageId(env, chatId);
  if (messageId) await deleteMessage(token, chatId, messageId);
}

async function deleteMessage(token: string, chatId: number, messageId: number): Promise<void> {
  await tg(token, 'deleteMessage', { chat_id: chatId, message_id: messageId }).catch(() => undefined);
}

async function trackMenuMessage(env: Env, chatId: number, messageId: number | undefined): Promise<void> {
  if (messageId) await setTelegramMenuMessageId(env, chatId, messageId);
}

async function saveAudio(env: Env, token: string, game: AudioGame, source: UploadSource): Promise<void> {
  if (source.size && source.size > MAX_BYTES) throw new Error('حجم صدا باید کمتر از ۱۰ مگابایت باشد.');
  const file = await tg<{ file_path?: string }>(token, 'getFile', { file_id: source.fileId });
  if (!file.file_path) throw new Error('فایل صوتی از تلگرام دریافت نشد.');
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
  if (!response.ok) throw new Error('دانلود فایل صوتی ناموفق بود.');
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) throw new Error('حجم صدا باید کمتر از ۱۰ مگابایت باشد.');
  const responseType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const contentType = AUDIO_TYPES.has(source.type) ? source.type : AUDIO_TYPES.has(responseType) ? responseType : 'audio/mpeg';
  const version = String(Date.now());
  const assetKey = game === 'loading' ? LOADING_AUDIO_KEY : game === 'slot' ? SLOT_AUDIO_KEY : game === 'dice' ? DICE_AUDIO_KEY : WALLET_CREDIT_AUDIO_KEY;
  await env.ASSETS.put(assetKey, bytes, {
    httpMetadata: { contentType },
    customMetadata: { version, gameId: game, contentType, uploadedVia: `telegram-admin-${source.via}` },
  });
  if (game === 'dice') await env.BOT_CACHE.put(DICE_AUDIO_ENABLED_KEY, '1');
}

async function saveImage(env: Env, token: string, target: Exclude<UploadTarget, { kind: 'audio' } | { kind: 'share-invite' } | { kind: 'main-menu' }>, source: UploadSource): Promise<void> {
  if (source.size && source.size > MAX_BYTES) throw new Error('حجم تصویر باید کمتر از ۱۰ مگابایت باشد.');
  const file = await tg<{ file_path?: string }>(token, 'getFile', { file_id: source.fileId });
  if (!file.file_path) throw new Error('فایل از تلگرام دریافت نشد.');
  const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
  if (!response.ok) throw new Error('دانلود تصویر ناموفق بود.');
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) throw new Error('حجم تصویر باید کمتر از ۱۰ مگابایت باشد.');
  const responseType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const contentType = source.via === 'document' ? source.type : (TYPES.has(responseType) ? responseType : source.type);
  const version = String(Date.now());
  const assetKey = target.kind === 'ton' ? 'ton-icon'
    : target.kind === 'home-slot' ? 'home-lottery-slot'
      : target.kind === 'rank' ? `rank-character/${target.rank}`
        : target.kind === 'ghost-asset' ? `ghost-run-assets/${target.asset}`
          : target.kind === 'slot-symbol' ? `slot-symbol/${target.symbol}`
            : target.kind === 'payment-method' ? paymentMethodKey(target.method)
              : target.kind === 'predict' ? predictAssetKey(target.asset, target.market)
              : target.kind === 'background' ? sectionBackgroundR2Key(target.game)
                : target.kind === 'crash-stage' ? crashStageKey(target.slot) : gameKey(target.game);
  const metadata: Record<string, string> = target.kind === 'ton'
    ? { version, assetId: 'ton-icon', contentType, uploadedVia: `telegram-admin-${source.via}` }
    : target.kind === 'background'
      ? { version, sectionId: target.game, contentType, uploadedVia: `telegram-admin-${source.via}` }
      : target.kind === 'crash-stage'
        ? { version, assetId: `crash-stage-${target.slot}`, slot: String(target.slot), contentType, uploadedVia: `telegram-admin-${source.via}` }
        : target.kind === 'home-slot'
          ? { version, assetId: 'home-lottery-slot', contentType, uploadedVia: `telegram-admin-${source.via}` }
          : target.kind === 'rank'
            ? { version, rank: target.rank, contentType, uploadedVia: `telegram-admin-${source.via}` }
            : target.kind === 'ghost-asset'
              ? { version, kind: target.asset, contentType, uploadedVia: `telegram-admin-${source.via}` }
              : target.kind === 'slot-symbol'
                ? { version, symbolId: target.symbol, contentType, uploadedVia: `telegram-admin-${source.via}` }
                : target.kind === 'payment-method'
                  ? { version, paymentMethod: target.method, contentType, uploadedVia: `telegram-admin-${source.via}` }
                  : target.kind === 'predict'
                    ? { version, predictAsset: target.asset, market: target.market, contentType, uploadedVia: `telegram-admin-${source.via}` }
                  : { version, gameId: target.game, contentType, uploadedVia: `telegram-admin-${source.via}` };
  await env.ASSETS.put(assetKey, bytes, {
    httpMetadata: { contentType },
    customMetadata: metadata,
  });
}

function mainMenuMediaFromMessage(message: Message): MainMenuMediaSource | null {
  const photo = message.photo?.at(-1);
  if (photo?.file_id) return { fileId: photo.file_id, size: photo.file_size, type: 'photo' };
  const video = message.video;
  if (video?.file_id) return { fileId: video.file_id, size: video.file_size, type: 'video' };
  return null;
}

function imageFromMessage(message: Message): UploadSource | null {
  const photo = message.photo?.at(-1);
  if (photo?.file_id) {
    return { fileId: photo.file_id, size: photo.file_size, type: 'image/jpeg', via: 'photo' };
  }
  const doc = message.document;
  if (!doc?.file_id) return null;
  const mime = String(doc.mime_type || '').split(';')[0].trim().toLowerCase();
  const ext = String(doc.file_name || '').split('.').pop()?.toLowerCase();
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : TYPES.has(mime) ? mime : '';
  return type ? { fileId: doc.file_id, size: doc.file_size, type, via: 'document' } : null;
}

function audioFromMessage(message: Message): UploadSource | null {
  if (message.audio?.file_id) {
    const mime = String(message.audio.mime_type || '').split(';')[0].trim().toLowerCase();
    const ext = String(message.audio.file_name || '').split('.').pop()?.toLowerCase();
    const type = audioContentType(mime, ext);
    return type ? { fileId: message.audio.file_id, size: message.audio.file_size, type, via: 'audio' } : null;
  }
  const doc = message.document;
  if (!doc?.file_id) return null;
  const mime = String(doc.mime_type || '').split(';')[0].trim().toLowerCase();
  const ext = String(doc.file_name || '').split('.').pop()?.toLowerCase();
  const type = audioContentType(mime, ext);
  return type ? { fileId: doc.file_id, size: doc.file_size, type, via: 'document' } : null;
}

function audioContentType(mime: string, ext: string | undefined): string {
  if (AUDIO_TYPES.has(mime)) return mime;
  if (!ext || !AUDIO_EXTENSIONS.has(ext)) return '';
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'ogg' || ext === 'oga') return 'audio/ogg';
  if (ext === 'webm') return 'audio/webm';
  if (ext === 'aac') return 'audio/aac';
  return 'audio/mp4';
}

async function upsert(token: string, chatId: number, messageId: number | undefined, text: string, keyboard: Keyboard): Promise<void> {
  const payload = { chat_id: chatId, text, reply_markup: { inline_keyboard: keyboard }, disable_web_page_preview: true };
  if (messageId) {
    const edited = await tg(token, 'editMessageText', { ...payload, message_id: messageId }).then(() => true).catch(() => false);
    if (edited) return;
  }
  await tg(token, 'sendMessage', payload);
}

async function tg<T = unknown>(token: string, method: string, payload: unknown): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({})) as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || !data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result as T;
}

function normalizeGame(value: unknown): string | null {
  const game = String(value || '').replace(/\.png$/i, '').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
  return GAME_IDS.has(game as never) ? game : null;
}
function normalizeBackgroundGame(value: unknown): string | null {
  const game = String(value || '').replace(/\.png$/i, '').replace(/[^a-z0-9_-]/gi, '').toLowerCase();
  return BACKGROUND_GAME_IDS.has(game) ? game : null;
}
function normalizeCrashStageSlot(value: unknown): number | null {
  const slot = Number(String(value || '').replace(/[^0-9]/g, ''));
  return Number.isInteger(slot) && slot >= 1 && slot <= 5 ? slot : null;
}
function normalizeHomePromoSlot(value: unknown): number | null {
  const slot = Number(String(value || '').replace(/[^0-9]/g, ''));
  return Number.isInteger(slot) && slot >= 1 && slot <= 3 ? slot : null;
}
function homePromoGame(slot: number): string { return `promo-${slot}`; }
function homePromoSlotFromGame(game: string): number | null {
  const match = String(game || '').match(/^promo-([1-3])$/);
  return match ? Number(match[1]) : null;
}
function normalizeTarget(value: unknown): UploadTarget | null {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === MAIN_MENU_STATE) return { kind: 'main-menu' };
  if (raw === SHARE_INVITE_STATE) return { kind: 'share-invite' };
  if (raw === TON_STATE) return { kind: 'ton' };
  if (raw === HOME_SLOT_STATE) return { kind: 'home-slot' };
  if (raw.startsWith(PAYMENT_METHOD_STATE_PREFIX)) {
    const method = normalizePaymentMethod(raw.slice(PAYMENT_METHOD_STATE_PREFIX.length));
    return method ? { kind: 'payment-method', method } : null;
  }
  if (raw.startsWith(AUDIO_STATE_PREFIX)) {
    const game = normalizeAudioGame(raw.slice(AUDIO_STATE_PREFIX.length));
    return game ? { kind: 'audio', game } : null;
  }
  if (raw.startsWith(PREDICT_STATE_PREFIX)) {
    const [assetValue, marketValue] = raw.slice(PREDICT_STATE_PREFIX.length).split(':');
    const asset = normalizePredictAsset(assetValue);
    const market = normalizePredictMarket(marketValue);
    return asset && market ? { kind: 'predict', asset, market } : null;
  }
  if (raw.startsWith(RANK_STATE_PREFIX)) {
    const rank = normalizeRank(raw.slice(RANK_STATE_PREFIX.length));
    return rank ? { kind: 'rank', rank } : null;
  }
  if (raw.startsWith(GHOST_ASSET_STATE_PREFIX)) {
    const asset = normalizeGhostAsset(raw.slice(GHOST_ASSET_STATE_PREFIX.length));
    return asset ? { kind: 'ghost-asset', asset } : null;
  }
  if (raw.startsWith(SLOT_SYMBOL_STATE_PREFIX)) {
    const symbol = normalizeSlotSymbol(raw.slice(SLOT_SYMBOL_STATE_PREFIX.length));
    return symbol ? { kind: 'slot-symbol', symbol } : null;
  }
  if (raw.startsWith(BACKGROUND_STATE_PREFIX)) {
    const game = normalizeBackgroundGame(raw.slice(BACKGROUND_STATE_PREFIX.length));
    return game ? { kind: 'background', game } : null;
  }
  if (raw.startsWith(CRASH_STAGE_STATE_PREFIX)) {
    const slot = normalizeCrashStageSlot(raw.slice(CRASH_STAGE_STATE_PREFIX.length));
    return slot ? { kind: 'crash-stage', slot } : null;
  }
  const game = normalizeGame(raw);
  return game ? { kind: 'game', game } : null;
}
function normalizePaymentMethod(value: unknown): PaymentMethod | null { const clean = String(value || '').replace(/\.png$/i, '').trim().toLowerCase(); return clean === 'stars' || clean === 'gram' || clean === 'usdt' || clean === 'nft' ? clean : null; }
function paymentMethodLabel(method: PaymentMethod): string { return PAYMENT_METHODS.find(([id]) => id === method)?.[1] || method; }
function paymentMethodKey(method: PaymentMethod): string { return `payment-method/${method}`; }
function normalizePredictAsset(value: unknown): PredictAsset | null { return String(value || '').trim().toLowerCase() === 'logo' ? 'logo' : null; }
function normalizePredictMarket(value: unknown): PredictMarket | null { const clean = String(value || '').trim().toLowerCase(); return PREDICT_MARKETS.some(([market]) => market === clean) ? clean as PredictMarket : null; }
function predictMarketLabel(market: PredictMarket): string { return PREDICT_MARKETS.find(([id]) => id === market)?.[1] || market; }
function predictAssetKey(_asset: PredictAsset, market: PredictMarket): string { return `predict/${market}/question-image`; }
function normalizeAudioGame(value: unknown): AudioGame | null { const clean = String(value || '').trim().toLowerCase(); return clean === 'slot' || clean === 'dice' || clean === 'wallet-credit' || clean === 'loading' ? clean : null; }
function audioGameLabel(game: AudioGame): string { return game === 'loading' ? 'Loading Screen' : game === 'slot' ? 'Slot' : game === 'dice' ? 'Dice' : 'Wallet · موجودی ناکافی'; }
function normalizeRank(value: unknown): string | null { return RANKS.find((rank) => rank.toLowerCase() === String(value || '').trim().toLowerCase()) || null; }
function normalizeGhostAsset(value: unknown): string | null { const clean = String(value || '').trim().toLowerCase(); return GHOST_ASSETS.some(([asset]) => asset === clean) ? clean : null; }
function ghostAssetLabel(asset: string): string { return GHOST_ASSETS.find(([id]) => id === asset)?.[1] || asset; }
function normalizeSlotSymbol(value: unknown): string | null { const clean = String(value || '').trim().toLowerCase(); return SLOT_SYMBOLS.some(([symbol]) => symbol === clean) ? clean : null; }
function slotSymbolLabel(symbol: string): string { return SLOT_SYMBOLS.find(([id]) => id === symbol)?.[1] || symbol; }
function label(game: string): string { return GAMES.find(([id]) => id === game)?.[1] || game; }
function backgroundLabel(game: string): string { return BACKGROUND_GAMES.find(([id]) => id === game)?.[1] || game; }
function gameKey(game: string): string { return `game-card-images/${game}`; }
function crashStageKey(slot: number): string { return `crash-stage-images/${slot}`; }
function stateKey(id: number): string { return `${STATE_PREFIX}${id}`; }
function clearState(env: Env, id: number): Promise<void> { return env.BOT_CACHE.delete(stateKey(id)).catch(() => undefined); }
function isAdmin(env: Env, id: unknown): boolean { return String(env.BOT_ADMIN || '').split(/[\s,;]+/).includes(String(id || '')); }
function isAdminCommand(text: string): boolean { const value = text.toLowerCase(); return value === 'admin' || value === 'ادمین' || /^\/admin(?:@[-_a-z0-9]+)?$/.test(value); }
function ok(): Response { return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } }); }