import type { Env } from './types';
import { adminUsersJson } from './admin-users';
import {
  discoverPolymarketPredictions,
  getPredictionEvent,
  importPolymarketPrediction,
  listPredictionEvents,
  publishPredictionEvent,
  refundPredictionEvent,
  settlePredictionEvent,
  unpublishPredictionEvent,
  updatePredictionEvent,
} from './prediction-events';
import {
  getPredictOpsBet,
  getPredictOpsDashboard,
  getPredictOpsIncidents,
  getPredictOpsRound,
  getPredictPlatformFeeStats,
  getPredictUserAccess,
  getPredictUserInspector,
  listPredictAuditLog,
  listPredictOpsDueRounds,
  listPredictOpsRounds,
  manualRefundPredictBet,
  manualRefundPredictRound,
  publishPredictOpsRealtime,
  retryPredictSettlement,
  setPredictOpsEmergencyPaused,
  setPredictOpsExposureLimit,
  setPredictOpsMaintenanceMessage,
  setPredictOpsMarketPaused,
  setPredictUserAllAccess,
  setPredictUserLimits,
  setPredictUserMarketAccess,
  updatePredictUserMarketAccessNote,
  type PredictAuditEntry,
  type PredictOpsDashboard,
  type PredictOpsMarket,
  type PredictOpsMarketStatus,
  type PredictOpsRoundView,
  type PredictUserMarketAccess,
} from './predict-routes';
import { ensurePredictVisitorTracking, getPredictOnlineUserIds } from './section-lock-events';
import { getPredictProviderState, setRequestedPredictProvider } from './predict-polymarket';
import { upsertTelegramTextMenu } from './telegram-menu-state';
import { clearSectionLock, getSectionAccess, setSectionLock } from './section-access';

type Message = { message_id: number; chat: { id: number }; from?: { id: number }; text?: string };
type Callback = { id: string; data?: string; from: { id: number }; message?: { message_id: number; chat: { id: number } } };
type Update = { message?: Message; callback_query?: Callback };
type Button = { text: string; callback_data: string };
type PredictMenu = PredictOpsMarket | 'world' | 'tech' | 'culture';
type InputState = { eventId: string; mode: 'question' | 'close' | 'source' };
type BlockTarget = PredictOpsMarket | 'all';
type BlockDuration = '1h' | '6h' | '24h' | '7d' | 'p';
type PredictOpsInputState =
  | { mode: 'maintenance' }
  | { mode: 'user-access' }
  | { mode: 'user-note'; userId: string; market: PredictOpsMarket }
  | { mode: 'user-max-limit'; userId: string }
  | { mode: 'user-daily-limit'; userId: string }
  | { mode: 'market-exposure'; market: PredictOpsMarket }
  | { mode: 'user-block-note'; userId: string; target: BlockTarget; duration: BlockDuration };
type AdminEvent = { id: string; source_market_id: string; source_url: string; category: string; question: string; description: string | null; closes_at: string; resolution_source: string | null; status: string; result: string | null; featured: number; created_at: string; updated_at: string; published_at: string | null; settled_at: string | null };
type PredictOpsUserRow = { telegram_user_id: string; username: string | null; first_name: string | null };
type PredictVisitorUserRow = PredictOpsUserRow & { predict_first_seen_at: string | null; predict_last_seen_at: string | null };
type PredictOpsAdminUser = { id?: unknown; firstName?: unknown; username?: unknown; tonBalanceNano?: unknown; returnCount?: unknown };
type PredictBlockedUserRow = { user_id: string; username: string | null; first_name: string | null };
type PredictBlockedUser = { user: PredictOpsUserRow; access: PredictUserMarketAccess[] };

const STATE_PREFIX = 'admin:prediction-event-input:';
const PREDICT_OPS_STATE_PREFIX = 'admin:predict-ops-input:';
const PREDICT_OPS_USER_PAGE_SIZE = 8;
const TELEGRAM_TEXT_SAFE_LIMIT = 3800;
const NANO = 1_000_000_000;

export async function handlePredictionEventsAdminRequest(request: Request, env: Env): Promise<Response | null> {
  if (request.method !== 'POST' || new URL(request.url).pathname !== '/telegram/webhook') return null;
  const update = await request.clone().json().catch(() => null) as Update | null;
  if (!update || !env.BOT_TOKEN) return null;
  if (update.callback_query) return handleCallback(env, update.callback_query);
  if (update.message) return handleMessage(env, update.message);
  return null;
}

async function handleCallback(env: Env, callback: Callback): Promise<Response | null> {
  const data = String(callback.data || '');
  const isEventsCallback = data === 'botadmin:events:list' || data.startsWith('botadmin:events:');
  const isPredictOpsCallback = data === 'botadmin:predictops:menu' || data.startsWith('botadmin:predictops:');
  if (!isEventsCallback && !isPredictOpsCallback) return null;
  if (!isAdmin(env, callback.from.id)) return ok();
  await telegram(env.BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: callback.id }).catch(() => undefined);
  const chatId = callback.message?.chat.id ?? callback.from.id;
  const messageId = callback.message?.message_id;
  if (isPredictOpsCallback) {
    await clearState(env, callback.from.id);
    await clearPredictOpsState(env, callback.from.id);
    try { await handlePredictOpsCallback(env, callback.from.id, chatId, messageId, data); }
    catch (error) { await sendPredictOpsError(env, chatId, messageId, error); }
    return ok();
  }
  await clearPredictOpsState(env, callback.from.id);
  await clearState(env, callback.from.id);
  try {
    if (data === 'botadmin:events:list') await sendEventsMenu(env, chatId, messageId);
    else if (data.startsWith('botadmin:events:discover:')) await sendDiscovery(env, chatId, messageId, data.slice('botadmin:events:discover:'.length));
    else if (data.startsWith('botadmin:events:import:')) {
      const event = await importPolymarketPrediction(env, data.slice('botadmin:events:import:'.length)) as AdminEvent;
      await sendEventPanel(env, chatId, messageId, event);
    } else if (data.startsWith('botadmin:events:show:')) await sendEventPanel(env, chatId, messageId, await requireEvent(env, data.slice('botadmin:events:show:'.length)));
    else if (data.startsWith('botadmin:events:ask:')) {
      const parts = data.split(':');
      const mode = parts[3];
      const event = await requireEvent(env, parts[4] || '');
      if (event.status !== 'draft') throw new Error('فقط Draft قابل ویرایش است.');
      if (mode !== 'question' && mode !== 'close' && mode !== 'source') throw new Error('ویرایش نامعتبر است.');
      await env.BOT_CACHE.put(stateKey(callback.from.id), JSON.stringify({ eventId: event.id, mode }), { expirationTtl: 900 });
      await promptForInput(env, chatId, messageId, mode as InputState['mode'], event);
    } else if (data.startsWith('botadmin:events:publish:')) {
      await sendEventPanel(env, chatId, messageId, await publishPredictionEvent(env, data.slice('botadmin:events:publish:'.length)) as AdminEvent, '✅ منتشر شد. از این لحظه فقط استخر داخلی Vexa برای این پیش‌بینی فعال است.');
    } else if (data.startsWith('botadmin:events:unpublish:')) {
      await sendEventPanel(env, chatId, messageId, await unpublishPredictionEvent(env, data.slice('botadmin:events:unpublish:'.length)) as AdminEvent, '✅ دوباره Draft شد؛ هنوز هیچ بتی ثبت نشده بود.');
    } else if (data.startsWith('botadmin:events:settle:')) {
      const parts = data.split(':');
      const result = parts[4] === 'yes' ? 'yes' : parts[4] === 'no' ? 'no' : '';
      if (!result) throw new Error('نتیجه نامعتبر است.');
      await settlePredictionEvent(env, parts[3] || '', result);
      await sendEventPanel(env, chatId, messageId, await requireEvent(env, parts[3] || ''), '✅ تسویه داخلی Vexa انجام شد.');
    } else if (data.startsWith('botadmin:events:refund:')) {
      const eventId = data.slice('botadmin:events:refund:'.length);
      await refundPredictionEvent(env, eventId);
      await sendEventPanel(env, chatId, messageId, await requireEvent(env, eventId), '✅ همهٔ مبالغ از استخر داخلی Vexa بازگشت داده شد.');
    }
  } catch (error) { await sendError(env, chatId, messageId, error); }
  return ok();
}

async function handleMessage(env: Env, message: Message): Promise<Response | null> {
  const adminId = message.from?.id;
  if (!adminId || !isAdmin(env, adminId)) return null;
  const opsState = await readPredictOpsState(env, adminId);
  if (opsState) {
    const text = String(message.text || '').trim();
    await telegram(env.BOT_TOKEN, 'deleteMessage', { chat_id: message.chat.id, message_id: message.message_id }).catch(() => undefined);
    if (text === '/cancel' || text === 'لغو') { await clearPredictOpsState(env, adminId); await sendPredictOpsMenu(env, message.chat.id); return ok(); }
    try {
      if (opsState.mode === 'maintenance') {
        if (!text) throw new Error('پیام نمی‌تواند خالی باشد.');
        if (text.length > 180) throw new Error('پیام نگهداری باید حداکثر ۱۸۰ کاراکتر باشد.');
        await setPredictOpsMaintenanceMessage(env, text, adminId); await publishPredictOpsRealtime(env); await clearPredictOpsState(env, adminId);
        await sendPredictOpsMenu(env, message.chat.id, undefined, '✅ پیام نگهداری ذخیره و همان لحظه به اپ‌های باز ارسال شد.'); return ok();
      }
      if (opsState.mode === 'user-access') {
        await clearPredictOpsState(env, adminId); await sendPredictUserSearchResults(env, message.chat.id, undefined, text); return ok();
      }
      if (opsState.mode === 'market-exposure') {
        const limitNano = gramInputToNano(text); await setPredictOpsExposureLimit(env, opsState.market, limitNano, adminId); await publishPredictOpsRealtime(env); await clearPredictOpsState(env, adminId);
        await sendPredictOpsMarket(env, message.chat.id, undefined, opsState.market, limitNano ? `✅ سقف Exposure روی ${formatGram(limitNano)} GRAM تنظیم شد.` : '✅ سقف Exposure غیرفعال شد.'); return ok();
      }
      if (opsState.mode === 'user-max-limit' || opsState.mode === 'user-daily-limit') {
        const limitNano = gramInputToNano(text);
        await setPredictUserLimits(env, opsState.userId, opsState.mode === 'user-max-limit' ? { maxBetNano: limitNano } : { dailyLimitNano: limitNano }, adminId); await clearPredictOpsState(env, adminId);
        await sendPredictUserLimitsPanel(env, message.chat.id, undefined, opsState.userId, limitNano ? '✅ Limit ذخیره شد و از همین لحظه در backend اعمال می‌شود.' : '✅ این Limit غیرفعال شد.'); return ok();
      }
      if (opsState.mode === 'user-note') {
        const parsed = parseReasonNote(text); await updatePredictUserMarketAccessNote(env, adminId, opsState.userId, opsState.market, parsed.reason, parsed.adminNote); await publishPredictOpsRealtime(env); await clearPredictOpsState(env, adminId);
        await sendPredictUserPanel(env, message.chat.id, undefined, opsState.userId, '✅ دلیل و یادداشت داخلی ذخیره شد.'); return ok();
      }
      if (opsState.mode === 'user-block-note') {
        const parsed = parseReasonNote(text), expiresAt = durationExpiresAt(opsState.duration);
        if (opsState.target === 'all') await setPredictUserAllAccess(env, adminId, opsState.userId, true, { expiresAt, reason: parsed.reason, adminNote: parsed.adminNote });
        else await setPredictUserMarketAccess(env, adminId, opsState.userId, opsState.target, true, { expiresAt, reason: parsed.reason, adminNote: parsed.adminNote });
        await publishPredictOpsRealtime(env); await clearPredictOpsState(env, adminId);
        await sendPredictUserPanel(env, message.chat.id, undefined, opsState.userId, `✅ محدودیت ${durationLabel(opsState.duration)} ثبت و همان لحظه اعمال شد.`); return ok();
      }
    } catch (error) { await upsert(env, message.chat.id, undefined, '❌ ' + messageOf(error) + '\n\nبرای لغو /cancel را بفرستید.', [[{ text: 'لغو', callback_data: 'botadmin:predictops:menu' }]]); return ok(); }
  }
  const state = await readState(env, adminId);
  if (!state) return null;
  const text = String(message.text || '').trim();
  await telegram(env.BOT_TOKEN, 'deleteMessage', { chat_id: message.chat.id, message_id: message.message_id }).catch(() => undefined);
  if (text === '/cancel' || text === 'لغو') { await clearState(env, adminId); await sendEventsMenu(env, message.chat.id); return ok(); }
  try {
    const patch = state.mode === 'question' ? { question: text } : state.mode === 'close' ? { closesAt: text } : { resolutionSource: text };
    const event = await updatePredictionEvent(env, state.eventId, patch) as AdminEvent; await clearState(env, adminId);
    await sendEventPanel(env, message.chat.id, undefined, event, '✅ ذخیره شد.');
  } catch (error) {
    const hint = state.mode === 'close' ? '\nنمونه: 2026-12-31 18:00 UTC' : state.mode === 'source' ? '\nلینک HTTPS معتبر بفرستید.' : '';
    await upsert(env, message.chat.id, undefined, '❌ ' + messageOf(error) + hint, [[{ text: 'لغو', callback_data: 'botadmin:events:show:' + state.eventId }]]);
  }
  return ok();
}

async function handlePredictOpsCallback(env: Env, adminId: number, chatId: number, messageId: number | undefined, data: string): Promise<void> {
  if (data === 'botadmin:predictops:menu' || data === 'botadmin:predictops:refresh') { await publishPredictOpsRealtime(env); await sendPredictOpsMenu(env, chatId, messageId); return; }
  if (data === 'botadmin:predictops:provider') { await sendPredictProviderMenu(env, chatId, messageId); return; }
  if (data === 'botadmin:predictops:provider:vexa' || data === 'botadmin:predictops:provider:polymarket') {
    const provider = data.endsWith(':polymarket') ? 'polymarket' : 'vexa';
    if (provider === 'polymarket' && !(await getPredictProviderState(env)).polymarketConfigured) {
      await sendPredictProviderMenu(env, chatId, messageId, '⚠️ چهار سکرت Polymarket کامل نیست.');
      return;
    }
    await setRequestedPredictProvider(env, provider);
    await sendPredictProviderMenu(env, chatId, messageId, provider === 'polymarket' ? '✅ از راند بعدی Bitcoin، سفارش‌ها با کیف‌پول مشترک Polymarket ثبت می‌شوند.' : '✅ از راند بعدی Bitcoin به مسیر داخلی Vexa برمی‌گردد.');
    return;
  }
  if (data.startsWith('botadmin:predictops:emergency:')) { const paused = data.endsWith(':on'); await setPredictOpsEmergencyPaused(env, paused, adminId); await publishPredictOpsRealtime(env); await sendPredictOpsMenu(env, chatId, messageId, paused ? '🚨 ثبت bet جدید برای تمام مارکت‌ها متوقف شد.' : '✅ توقف اضطراری برداشته شد.'); return; }
  if (data.startsWith('botadmin:predictops:marketpause:')) { const parts = data.split(':'), market = cleanOpsMarket(parts[3]), paused = parts[4] === 'on'; await setPredictOpsMarketPaused(env, market, paused, adminId); await publishPredictOpsRealtime(env); await sendPredictOpsMarket(env, chatId, messageId, market, paused ? '⏸ این مارکت همان لحظه Pause شد.' : '✅ این مارکت همان لحظه Resume شد.'); return; }
  if (data.startsWith('botadmin:predictops:menulock:')) {
    const parts = data.split(':'), market = cleanPredictMenu(parts[3]), locked = parts[4] === 'on';
    if (locked) await setSectionLock(env, `predict-${market}`, 43_200); else await clearSectionLock(env, `predict-${market}`);
    await sendPredictOpsMenu(env, chatId, messageId, locked ? `🔒 منوی ${predictMenuLabel(market)} برای کاربران قفل و همان لحظه همگام شد.` : `🔓 منوی ${predictMenuLabel(market)} برای کاربران باز و همان لحظه همگام شد.`);
    return;
  }
  if (data.startsWith('botadmin:predictops:ex:')) { const market = cleanOpsMarket(data.slice('botadmin:predictops:ex:'.length)); await savePredictOpsState(env, adminId, { mode: 'market-exposure', market }); await upsert(env, chatId, messageId, `⚖️ ${marketLabel(market)} Exposure Limit\n\nحداکثر مجموع GRAM در betهای Pending/Active/Settling این مارکت را بفرستید.\n\nمثال: 500\nبرای غیرفعال‌کردن: 0`, [[{ text: 'لغو', callback_data: `botadmin:predictops:market:${market}` }]]); return; }
  if (data === 'botadmin:predictops:online' || data.startsWith('botadmin:predictops:online:')) { const page = data === 'botadmin:predictops:online' ? 0 : Number(data.slice('botadmin:predictops:online:'.length)) || 0; await sendPredictOnlineUsers(env, chatId, messageId, page); return; }
  if (data === 'botadmin:predictops:visitors' || data.startsWith('botadmin:predictops:visitors:')) { const page = data === 'botadmin:predictops:visitors' ? 0 : Number(data.slice('botadmin:predictops:visitors:'.length)) || 0; await sendPredictVisitors(env, chatId, messageId, page); return; }
  if (data === 'botadmin:predictops:useraccess') { await sendPredictUserList(env, chatId, messageId, 0); return; }
  if (data.startsWith('botadmin:predictops:users:')) { await sendPredictUserList(env, chatId, messageId, Number(data.slice('botadmin:predictops:users:'.length)) || 0); return; }
  if (data === 'botadmin:predictops:blocked' || data.startsWith('botadmin:predictops:blocked:')) { const page = data === 'botadmin:predictops:blocked' ? 0 : Number(data.slice('botadmin:predictops:blocked:'.length)) || 0; await sendPredictBlockedUsers(env, chatId, messageId, page); return; }
  if (data === 'botadmin:predictops:usersearch') { await savePredictOpsState(env, adminId, { mode: 'user-access' }); await upsert(env, chatId, messageId, '🔎 جستجوی کاربر\n\nآیدی عددی، یوزرنیم یا اسم کاربر را بفرستید.', [[{ text: 'لغو', callback_data: 'botadmin:predictops:useraccess' }]]); return; }
  if (data.startsWith('botadmin:predictops:u:')) { await sendPredictUserPanel(env, chatId, messageId, cleanPredictUserId(data.slice('botadmin:predictops:u:'.length))); return; }
  if (data.startsWith('botadmin:predictops:uba:')) { const parts = data.split(':'); await sendPredictBlockDuration(env, chatId, messageId, cleanPredictUserId(parts[3]), cleanBlockTarget(parts[4])); return; }
  if (data.startsWith('botadmin:predictops:ubp:')) {
    const parts = data.split(':'), userId = cleanPredictUserId(parts[3]), target = cleanBlockTarget(parts[4]), duration = cleanBlockDuration(parts[5]); await savePredictOpsState(env, adminId, { mode: 'user-block-note', userId, target, duration });
    await upsert(env, chatId, messageId, `📝 دلیل محدودیت\n\nبرای ${blockTargetLabel(target)} • ${durationLabel(duration)}\n\nبه این شکل بفرستید:\nReason | internal admin note\n\nمثال:\nManual review | رفتار حساب نیاز به بررسی دارد\n\nیادداشت فقط داخل پنل ادمین دیده می‌شود.`, [[{ text: 'ثبت بدون یادداشت', callback_data: `botadmin:predictops:ubd:${userId}:${target}:${duration}` }, { text: 'لغو', callback_data: `botadmin:predictops:u:${userId}` }]]); return;
  }
  if (data.startsWith('botadmin:predictops:ubd:')) {
    const parts = data.split(':'), userId = cleanPredictUserId(parts[3]), target = cleanBlockTarget(parts[4]), duration = cleanBlockDuration(parts[5]), expiresAt = durationExpiresAt(duration);
    if (target === 'all') await setPredictUserAllAccess(env, adminId, userId, true, { expiresAt, reason: 'Manual review' }); else await setPredictUserMarketAccess(env, adminId, userId, target, true, { expiresAt, reason: 'Manual review' });
    await publishPredictOpsRealtime(env); await sendPredictUserPanel(env, chatId, messageId, userId, `✅ محدودیت ${durationLabel(duration)} ثبت شد.`); return;
  }
  if (data.startsWith('botadmin:predictops:uu:')) { const parts = data.split(':'), userId = cleanPredictUserId(parts[3]), target = cleanBlockTarget(parts[4]); if (target === 'all') await setPredictUserAllAccess(env, adminId, userId, false); else await setPredictUserMarketAccess(env, adminId, userId, target, false); await publishPredictOpsRealtime(env); await sendPredictUserPanel(env, chatId, messageId, userId, target === 'all' ? '✅ دسترسی کاربر به تمام Predict باز شد.' : `✅ دسترسی ${marketLabel(target)} باز شد.`); return; }
  if (data.startsWith('botadmin:predictops:un:')) { const parts = data.split(':'), userId = cleanPredictUserId(parts[3]), market = cleanOpsMarket(parts[4]); await savePredictOpsState(env, adminId, { mode: 'user-note', userId, market }); await upsert(env, chatId, messageId, `📝 ${marketLabel(market)} — Reason / Admin Note\n\nReason | internal admin note\n\nیادداشت داخلی برای کاربر نمایش داده نمی‌شود.`, [[{ text: 'لغو', callback_data: `botadmin:predictops:u:${userId}` }]]); return; }
  if (data.startsWith('botadmin:predictops:ul:')) { await sendPredictUserLimitsPanel(env, chatId, messageId, cleanPredictUserId(data.slice('botadmin:predictops:ul:'.length))); return; }
  if (data.startsWith('botadmin:predictops:ulm:')) { const userId = cleanPredictUserId(data.slice('botadmin:predictops:ulm:'.length)); await savePredictOpsState(env, adminId, { mode: 'user-max-limit', userId }); await upsert(env, chatId, messageId, '🎚 Max per Bet\n\nحداکثر GRAM برای هر prediction را بفرستید.\nمثال: 10\nبرای غیرفعال‌کردن: 0', [[{ text: 'لغو', callback_data: `botadmin:predictops:ul:${userId}` }]]); return; }
  if (data.startsWith('botadmin:predictops:uld:')) { const userId = cleanPredictUserId(data.slice('botadmin:predictops:uld:'.length)); await savePredictOpsState(env, adminId, { mode: 'user-daily-limit', userId }); await upsert(env, chatId, messageId, '📅 Daily Predict Limit\n\nحداکثر GRAM در یک روز UTC را بفرستید.\nمثال: 50\nبرای غیرفعال‌کردن: 0', [[{ text: 'لغو', callback_data: `botadmin:predictops:ul:${userId}` }]]); return; }
  if (data.startsWith('botadmin:predictops:ulc:')) { const userId = cleanPredictUserId(data.slice('botadmin:predictops:ulc:'.length)); await setPredictUserLimits(env, userId, { maxBetNano: 0, dailyLimitNano: 0 }, adminId); await sendPredictUserLimitsPanel(env, chatId, messageId, userId, '✅ هر دو Limit غیرفعال شدند.'); return; }
  if (data.startsWith('botadmin:predictops:ui:')) { await sendPredictUserInspector(env, chatId, messageId, cleanPredictUserId(data.slice('botadmin:predictops:ui:'.length))); return; }
  if (data.startsWith('botadmin:predictops:bet:')) { await sendPredictBetPanel(env, chatId, messageId, data.slice('botadmin:predictops:bet:'.length)); return; }
  if (data.startsWith('botadmin:predictops:rb:')) { await sendPredictBetRefundConfirm(env, chatId, messageId, data.slice('botadmin:predictops:rb:'.length)); return; }
  if (data.startsWith('botadmin:predictops:rbc:')) { const bet = await manualRefundPredictBet(env, data.slice('botadmin:predictops:rbc:'.length), adminId); await publishPredictOpsRealtime(env, true); await sendPredictBetPanel(env, chatId, messageId, bet.id, '✅ اصل stake این bet با reference یکتا Refund شد.'); return; }
  if (data.startsWith('botadmin:predictops:rr:')) { await sendPredictRoundRefundConfirm(env, chatId, messageId, data.slice('botadmin:predictops:rr:'.length)); return; }
  if (data.startsWith('botadmin:predictops:rrc:')) {
    const result = await manualRefundPredictRound(env, data.slice('botadmin:predictops:rrc:'.length), adminId);
    await publishPredictOpsRealtime(env, true);
    const notice = result.mode === 'cancel'
      ? `✅ Round بسته شد • ${result.refundedCount} bet • ${formatGram(result.refundedNano)} GRAM به کاربران برگشت داده شد. این round دیگر bet جدید نمی‌پذیرد.`
      : `✅ ${result.refundedCount} bet بازپرداخت شد • ${formatGram(result.refundedNano)} GRAM. برنده‌ها و refundهای قبلی دست‌نخورده ماندند.`;
    await sendPredictOpsRound(env, chatId, messageId, result.roundId, notice); return;
  }
  if (data === 'botadmin:predictops:audit') { await sendPredictAudit(env, chatId, messageId); return; }
  if (data.startsWith('botadmin:predictops:au:')) { await sendPredictAudit(env, chatId, messageId, cleanPredictUserId(data.slice('botadmin:predictops:au:'.length))); return; }
  if (data.startsWith('botadmin:predictops:market:')) { await sendPredictOpsMarket(env, chatId, messageId, cleanOpsMarket(data.slice('botadmin:predictops:market:'.length))); return; }
  if (data.startsWith('botadmin:predictops:rounds:')) { await sendPredictOpsRounds(env, chatId, messageId, cleanOpsMarket(data.slice('botadmin:predictops:rounds:'.length))); return; }
  if (data.startsWith('botadmin:predictops:round:')) { await sendPredictOpsRound(env, chatId, messageId, data.slice('botadmin:predictops:round:'.length)); return; }
  if (data === 'botadmin:predictops:queue') { await sendPredictOpsQueue(env, chatId, messageId); return; }
  if (data.startsWith('botadmin:predictops:retryask:')) { await sendPredictOpsRetryConfirm(env, chatId, messageId, data.slice('botadmin:predictops:retryask:'.length)); return; }
  if (data.startsWith('botadmin:predictops:retry:')) { const round = await retryPredictSettlement(env, data.slice('botadmin:predictops:retry:'.length), adminId); await sendPredictOpsRound(env, chatId, messageId, round.id, '✅ Retry Settlement با همان مسیر اصلی settlement اجرا شد و اپ‌های باز resync شدند.'); return; }
  if (data === 'botadmin:predictops:incidents') { await sendPredictOpsIncidents(env, chatId, messageId); return; }
  if (data.startsWith('botadmin:predictops:incident:')) { await sendPredictOpsIncident(env, chatId, messageId, data.slice('botadmin:predictops:incident:'.length)); return; }
  if (data === 'botadmin:predictops:askmaintenance') { await savePredictOpsState(env, adminId, { mode: 'maintenance' }); await upsert(env, chatId, messageId, '📝 پیام نگهداری Predict\n\nیک پیام کوتاه حداکثر ۱۸۰ کاراکتر بفرستید. این پیام هنگام Pause یا مشکل feed به کاربر نمایش داده می‌شود.', [[{ text: 'لغو', callback_data: 'botadmin:predictops:menu' }]]); return; }
  if (data === 'botadmin:predictops:clearmaintenance') { await setPredictOpsMaintenanceMessage(env, '', adminId); await publishPredictOpsRealtime(env); await sendPredictOpsMenu(env, chatId, messageId, '✅ پیام نگهداری حذف شد.'); }
}

async function sendPredictOpsMenu(env: Env, chatId: number, messageId?: number, notice = ''): Promise<void> {
  const [dashboard, feeStats, sectionLocks] = await Promise.all([getPredictOpsDashboard(env), getPredictPlatformFeeStats(env), getSectionAccess(env)]);
  const menuLocked = (market: PredictMenu) => sectionLocks.some((lock) => lock.sectionId === `predict-${market}`);
  const text = [notice, '🩺 Predict Operations', '', `Emergency: ${dashboard.emergencyPaused ? '🚨 PAUSED' : '✅ Normal'}`, `Maintenance: ${dashboard.maintenanceMessage ? '📝 Set' : '—'}`, '', `💰 Polymarket Fee Revenue • ${(feeStats.rate * 100).toFixed(0)}%`, `Total: ${formatFeeGram(feeStats.totalNano)} GRAM`, `Today: ${formatFeeGram(feeStats.todayNano)} GRAM`, `This week: ${formatFeeGram(feeStats.weekNano)} GRAM`, `This month: ${formatFeeGram(feeStats.monthNano)} GRAM`, '', 'یک بخش را انتخاب کنید.', 'قیمت و منبع Aster از این پنل تغییر نمی‌کند.'].filter(Boolean).join('\n');
  const lockButton = (market: PredictMenu, label: string): Button => ({ text: `${menuLocked(market) ? '🔓' : '🔒'} ${label} Menu`, callback_data: `botadmin:predictops:menulock:${market}:${menuLocked(market) ? 'off' : 'on'}` });
  const rows: Button[][] = [[{ text: '₿ Bitcoin', callback_data: 'botadmin:predictops:market:bitcoin' }, { text: '🥇 Gold', callback_data: 'botadmin:predictops:market:gold' }, { text: '🛢 Oil', callback_data: 'botadmin:predictops:market:oil' }], [lockButton('bitcoin', 'Bitcoin'), lockButton('gold', 'Gold'), lockButton('oil', 'Oil')], [lockButton('world', 'World'), lockButton('tech', 'Tech / AI'), lockButton('culture', 'Culture')], [{ text: '🔗 Bitcoin Provider', callback_data: 'botadmin:predictops:provider' }], [{ text: dashboard.emergencyPaused ? '✅ Resume All Markets' : '🚨 Emergency Pause All', callback_data: `botadmin:predictops:emergency:${dashboard.emergencyPaused ? 'off' : 'on'}` }], [{ text: '👤 User Predict Controls', callback_data: 'botadmin:predictops:useraccess' }, { text: '⛔ Blocked Users', callback_data: 'botadmin:predictops:blocked' }], [{ text: '🟢 Online in Predict', callback_data: 'botadmin:predictops:online' }, { text: '👣 Predict Visitors', callback_data: 'botadmin:predictops:visitors' }], [{ text: '🧾 Settlement Queue', callback_data: 'botadmin:predictops:queue' }, { text: '📜 Incident Log', callback_data: 'botadmin:predictops:incidents' }], [{ text: '🔐 Audit Log', callback_data: 'botadmin:predictops:audit' }, { text: '📝 Maintenance', callback_data: 'botadmin:predictops:askmaintenance' }], ...(dashboard.maintenanceMessage ? [[{ text: '🗑 حذف Maintenance Message', callback_data: 'botadmin:predictops:clearmaintenance' }]] : []), [{ text: '🔄 Refresh', callback_data: 'botadmin:predictops:refresh' }, { text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' }]];
  await upsert(env, chatId, messageId, text, rows);
}

async function sendPredictProviderMenu(env: Env, chatId: number, messageId?: number, notice = ''): Promise<void> {
  const state = await getPredictProviderState(env);
  const active = state.active ? `Active round: ${state.active}` : 'No active Bitcoin round';
  const text = `🔗 Bitcoin Provider\n\nRequested: ${state.requested}\n${active}${state.switchPending ? '\n\nتغییر در پایان راند فعلی اعمال می‌شود.' : ''}${state.polymarketConfigured ? '' : '\n\n⚠️ Polymarket wallet secrets are incomplete.'}${notice ? `\n\n${notice}` : ''}`;
  await upsert(env, chatId, messageId, text, [
    [{ text: `${state.requested === 'polymarket' ? '✅ ' : ''}Polymarket shared wallet`, callback_data: 'botadmin:predictops:provider:polymarket' }],
    [{ text: `${state.requested === 'vexa' ? '✅ ' : ''}Vexa internal`, callback_data: 'botadmin:predictops:provider:vexa' }],
    [{ text: '⬅️ Predict Ops', callback_data: 'botadmin:predictops:menu' }],
  ]);
}

async function sendPredictOpsMarket(env: Env, chatId: number, messageId: number | undefined, market: PredictOpsMarket, notice = ''): Promise<void> {
  const dashboard = await getPredictOpsDashboard(env), status = requireMarketStatus(dashboard, market), round = status.latestRound, effectivePaused = dashboard.emergencyPaused || status.manualPaused || status.circuitOpen || status.capacityReached;
  const text = [notice, `${marketIcon(market)} ${marketLabel(market)} — Predict Ops`, '', `Betting: ${effectivePaused ? '⏸ Paused' : '✅ Active'}`, `Manual pause: ${status.manualPaused ? 'ON' : 'OFF'}`, `Circuit breaker: ${status.circuitOpen ? '🛑 OPEN' : '✅ Closed'}`, `Capacity: ${status.capacityReached ? '🟠 FULL' : '✅ Available'}`, `Exposure: ${formatGram(status.activeExposureNano)} / ${status.exposureLimitNano ? formatGram(status.exposureLimitNano) + ' GRAM' : 'Unlimited'}`, `Last REST price: ${formatOpsPrice(market, status.lastPrice)}`, `Last feed success: ${formatOpsTime(status.lastSuccessAt)}`, `Last feed error: ${status.lastError ? shorten(status.lastError, 110) : '—'}`, '', `Latest round: ${round ? round.id : '—'}`, `Round status: ${round ? round.status : '—'}`, `Round end: ${round ? formatOpsTime(round.endsAt) : '—'}`, `Active bets: ${round ? Number(round.counts.active || 0) : 0}`, `Due settlements: ${status.dueSettlementCount}`, `Last settlement: ${formatOpsTime(status.lastSettledAt)}`].filter(Boolean).join('\n');
  const rows: Button[][] = [[{ text: status.manualPaused ? '✅ Resume Market' : '⏸ Pause Market', callback_data: `botadmin:predictops:marketpause:${market}:${status.manualPaused ? 'off' : 'on'}` }], [{ text: '⚖️ Exposure Limit', callback_data: `botadmin:predictops:ex:${market}` }]];
  if (round && (round.status === 'open' || round.status === 'refunding')) rows.push([{ text: round.status === 'refunding' ? '↩️ Resume Close & Refund' : '🛑 Close & Refund Current Round', callback_data: `botadmin:predictops:rr:${round.id}` }]);
  rows.push([{ text: '🔎 Round Inspector', callback_data: `botadmin:predictops:rounds:${market}` }, { text: '🧾 Settlement Queue', callback_data: 'botadmin:predictops:queue' }], [{ text: '⬅️ Predict Ops', callback_data: 'botadmin:predictops:menu' }]);
  await upsert(env, chatId, messageId, text, rows);
}

async function sendPredictUserList(env: Env, chatId: number, messageId: number | undefined, page: number): Promise<void> {
  const users = (await adminUsersJson(env)).users as PredictOpsAdminUser[];
  const totalPages = Math.max(1, Math.ceil(users.length / PREDICT_OPS_USER_PAGE_SIZE));
  const current = Math.min(Math.max(0, Math.floor(page) || 0), totalPages - 1);
  const rows: Button[][] = users.slice(current * PREDICT_OPS_USER_PAGE_SIZE, current * PREDICT_OPS_USER_PAGE_SIZE + PREDICT_OPS_USER_PAGE_SIZE)
    .map((user) => [{ text: predictAdminUserButtonText(user), callback_data: `botadmin:predictops:u:${predictAdminUserId(user)}` }]);
  const nav: Button[] = [];
  if (current > 0) nav.push({ text: 'قبلی', callback_data: `botadmin:predictops:users:${current - 1}` });
  nav.push({ text: '🔎 سرچ کاربر', callback_data: 'botadmin:predictops:usersearch' });
  if (current < totalPages - 1) nav.push({ text: 'بعدی', callback_data: `botadmin:predictops:users:${current + 1}` });
  rows.push(nav, [{ text: '⬅️ Predict Ops', callback_data: 'botadmin:predictops:menu' }]);
  await upsert(env, chatId, messageId, `👤 User Predict Controls\n\nکاربر را از لیست انتخاب کنید.\n${users.length} کاربر • صفحه ${current + 1}/${totalPages}`, rows);
}

async function loadPredictUsersByIds(env: Env, userIds: string[]): Promise<PredictOpsUserRow[]> {
  if (!userIds.length) return [];
  const placeholders = userIds.map(() => '?').join(',');
  const result = await env.DB.prepare(`SELECT telegram_user_id, username, first_name FROM app_users WHERE telegram_user_id IN (${placeholders})`).bind(...userIds).all<PredictOpsUserRow>();
  const byId = new Map((result.results || []).map((user) => [String(user.telegram_user_id), user]));
  return userIds.map((userId) => byId.get(userId) || { telegram_user_id: userId, username: null, first_name: null });
}

async function sendPredictOnlineUsers(env: Env, chatId: number, messageId: number | undefined, page: number): Promise<void> {
  const userIds = await getPredictOnlineUserIds(env);
  const totalPages = Math.max(1, Math.ceil(userIds.length / PREDICT_OPS_USER_PAGE_SIZE));
  const current = Math.min(Math.max(0, Math.floor(page) || 0), totalPages - 1);
  const pageIds = userIds.slice(current * PREDICT_OPS_USER_PAGE_SIZE, current * PREDICT_OPS_USER_PAGE_SIZE + PREDICT_OPS_USER_PAGE_SIZE);
  const users = await loadPredictUsersByIds(env, pageIds);
  const rows: Button[][] = users.map((user) => [{ text: predictOnlineUserButtonText(user), callback_data: `botadmin:predictops:u:${user.telegram_user_id}` }]);
  const nav: Button[] = [];
  if (current > 0) nav.push({ text: 'قبلی', callback_data: `botadmin:predictops:online:${current - 1}` });
  nav.push({ text: '🔄 Refresh', callback_data: `botadmin:predictops:online:${current}` });
  if (current < totalPages - 1) nav.push({ text: 'بعدی', callback_data: `botadmin:predictops:online:${current + 1}` });
  rows.push(nav, [{ text: '⬅️ Predict Ops', callback_data: 'botadmin:predictops:menu' }]);
  const summary = userIds.length ? `${userIds.length} کاربر واقعی الان داخل Predict هستند • صفحه ${current + 1}/${totalPages}` : 'الان هیچ کاربر واقعی داخل Predict نیست.';
  await upsert(env, chatId, messageId, `🟢 Online in Predict\n\n${summary}\n\nاین لیست فقط از sessionهای واقعی و احراز‌شده می‌آید؛ Online Boost عمومی داخل آن حساب نمی‌شود.`, rows);
}

async function sendPredictVisitors(env: Env, chatId: number, messageId: number | undefined, page: number): Promise<void> {
  await ensurePredictVisitorTracking(env);
  const countRow = await env.DB.prepare('SELECT COUNT(*) AS count FROM app_users WHERE predict_first_seen_at IS NOT NULL').first<{ count: number }>();
  const total = Math.max(0, Math.floor(Number(countRow?.count) || 0));
  const totalPages = Math.max(1, Math.ceil(total / PREDICT_OPS_USER_PAGE_SIZE));
  const current = Math.min(Math.max(0, Math.floor(page) || 0), totalPages - 1);
  const result = await env.DB.prepare(`SELECT telegram_user_id, username, first_name, predict_first_seen_at, predict_last_seen_at
    FROM app_users
    WHERE predict_first_seen_at IS NOT NULL
    ORDER BY datetime(predict_last_seen_at) DESC, telegram_user_id ASC
    LIMIT ? OFFSET ?`)
    .bind(PREDICT_OPS_USER_PAGE_SIZE, current * PREDICT_OPS_USER_PAGE_SIZE)
    .all<PredictVisitorUserRow>();
  const users = result.results || [];
  const rows: Button[][] = users.map((user) => [{ text: predictVisitorButtonText(user), callback_data: `botadmin:predictops:u:${user.telegram_user_id}` }]);
  const nav: Button[] = [];
  if (current > 0) nav.push({ text: 'قبلی', callback_data: `botadmin:predictops:visitors:${current - 1}` });
  nav.push({ text: '🔄 Refresh', callback_data: `botadmin:predictops:visitors:${current}` });
  if (current < totalPages - 1) nav.push({ text: 'بعدی', callback_data: `botadmin:predictops:visitors:${current + 1}` });
  rows.push(nav, [{ text: '⬅️ Predict Ops', callback_data: 'botadmin:predictops:menu' }]);
  const summary = total ? `${total} کاربر تا الان وارد Predict شده‌اند • صفحه ${current + 1}/${totalPages}` : 'هنوز ورود ثبت‌شده‌ای به Predict وجود ندارد.';
  await upsert(env, chatId, messageId, `👣 Predict Visitors\n\n${summary}\n\nورودهای جدید از presence واقعی Predict ثبت می‌شوند؛ سوابق قدیمی فقط از داده‌های قابل‌اثبات موجود backfill شده‌اند.`, rows);
}

async function loadPredictBlockedUsers(env: Env): Promise<PredictBlockedUser[]> {
  const candidates = await env.DB.prepare(`SELECT uc.user_id, au.username, au.first_name
    FROM user_controls uc
    LEFT JOIN app_users au ON au.telegram_user_id = uc.user_id
    WHERE uc.blocked_sections_json LIKE '%predict-%'
    ORDER BY datetime(uc.updated_at) DESC
    LIMIT 100`).all<PredictBlockedUserRow>();
  const resolved = await Promise.all((candidates.results || []).map(async (row): Promise<PredictBlockedUser> => ({
    user: { telegram_user_id: cleanPredictUserId(row.user_id), username: row.username || null, first_name: row.first_name || null },
    access: await getPredictUserAccess(env, row.user_id),
  })));
  return resolved.filter((entry) => entry.access.some((item) => item.blocked));
}

async function sendPredictBlockedUsers(env: Env, chatId: number, messageId: number | undefined, page: number): Promise<void> {
  const users = await loadPredictBlockedUsers(env);
  const totalPages = Math.max(1, Math.ceil(users.length / PREDICT_OPS_USER_PAGE_SIZE));
  const current = Math.min(Math.max(0, Math.floor(page) || 0), totalPages - 1);
  const pageUsers = users.slice(current * PREDICT_OPS_USER_PAGE_SIZE, current * PREDICT_OPS_USER_PAGE_SIZE + PREDICT_OPS_USER_PAGE_SIZE);
  const rows: Button[][] = pageUsers.map((entry) => [{ text: blockedPredictUserButtonText(entry), callback_data: `botadmin:predictops:u:${entry.user.telegram_user_id}` }]);
  const nav: Button[] = [];
  if (current > 0) nav.push({ text: 'قبلی', callback_data: `botadmin:predictops:blocked:${current - 1}` });
  nav.push({ text: '🔄 Refresh', callback_data: `botadmin:predictops:blocked:${current}` });
  if (current < totalPages - 1) nav.push({ text: 'بعدی', callback_data: `botadmin:predictops:blocked:${current + 1}` });
  rows.push(nav, [{ text: '⬅️ Predict Ops', callback_data: 'botadmin:predictops:menu' }]);
  await upsert(env, chatId, messageId, `⛔ Blocked Predict Users\n\n${users.length ? `${users.length} کاربر با محدودیت فعال Predict • صفحه ${current + 1}/${totalPages}` : 'هیچ کاربری در حال حاضر محدودیت فعال Predict ندارد.'}\n\nمحدودیت‌های منقضی‌شده در این لیست نمایش داده نمی‌شوند.`, rows);
}

async function sendPredictUserSearchResults(env: Env, chatId: number, messageId: number | undefined, query: string): Promise<void> {
  const users = ((await adminUsersJson(env)).users as PredictOpsAdminUser[]).filter((user) => predictAdminUserMatches(user, query)).slice(0, 25);
  const rows: Button[][] = users.map((user) => [{ text: predictAdminUserButtonText(user), callback_data: `botadmin:predictops:u:${predictAdminUserId(user)}` }]);
  rows.push([{ text: '🔎 سرچ دوباره', callback_data: 'botadmin:predictops:usersearch' }], [{ text: '⬅️ لیست کاربران', callback_data: 'botadmin:predictops:useraccess' }]);
  await upsert(env, chatId, messageId, `🔎 نتایج جستجوی کاربر\n\nعبارت: ${shorten(String(query || '').trim(), 80) || '—'}\nتعداد نتیجه: ${users.length}\n\n${users.length ? 'یک کاربر را انتخاب کنید.' : 'نتیجه‌ای پیدا نشد.'}`, rows);
}

async function sendPredictUserPanel(env: Env, chatId: number, messageId: number | undefined, userId: string, notice = ''): Promise<void> {
  const [user, inspector] = await Promise.all([findPredictOpsUserById(env, userId), getPredictUserInspector(env, userId)]); if (!user) throw new Error('کاربر پیدا نشد.');
  const lines = inspector.access.flatMap(userAccessLines), allBlocked = inspector.access.every((item) => item.blocked);
  const text = [notice, '👤 User Predict Controls', '', `User: ${predictUserLabel(user)}`, `ID: ${user.telegram_user_id}`, '', ...lines, '', `Max / bet: ${inspector.limits.maxBetNano ? formatGram(inspector.limits.maxBetNano) + ' GRAM' : 'Unlimited'}`, `Daily: ${inspector.limits.dailyLimitNano ? formatGram(inspector.limits.dailyLimitNano) + ' GRAM' : 'Unlimited'}`, `Today used: ${formatGram(inspector.todayStakeNano)} GRAM`].filter(Boolean).join('\n');
  const rows: Button[][] = [];
  for (const access of inspector.access) { rows.push([{ text: access.blocked ? `✅ Allow ${marketLabel(access.market)}` : `⛔ Block ${marketLabel(access.market)}`, callback_data: access.blocked ? `botadmin:predictops:uu:${userId}:${access.market}` : `botadmin:predictops:uba:${userId}:${access.market}` }]); if (access.blocked) rows.push([{ text: `📝 ${marketLabel(access.market)} Reason / Note`, callback_data: `botadmin:predictops:un:${userId}:${access.market}` }]); }
  rows.push([{ text: allBlocked ? '✅ Allow All Predict' : '⛔ Block All Predict', callback_data: allBlocked ? `botadmin:predictops:uu:${userId}:all` : `botadmin:predictops:uba:${userId}:all` }], [{ text: '🎚 Betting Limits', callback_data: `botadmin:predictops:ul:${userId}` }, { text: '📊 Inspector', callback_data: `botadmin:predictops:ui:${userId}` }], [{ text: '🔐 User Audit', callback_data: `botadmin:predictops:au:${userId}` }], [{ text: '⛔ Blocked Users', callback_data: 'botadmin:predictops:blocked' }, { text: '🔎 کاربر دیگر', callback_data: 'botadmin:predictops:useraccess' }], [{ text: '⬅️ Predict Ops', callback_data: 'botadmin:predictops:menu' }]);
  await upsert(env, chatId, messageId, text, rows);
}

async function sendPredictBlockDuration(env: Env, chatId: number, messageId: number | undefined, userId: string, target: BlockTarget): Promise<void> { await upsert(env, chatId, messageId, `⏱ ${blockTargetLabel(target)}\n\nمدت محدودیت را انتخاب کنید. بعد دلیل و یادداشت داخلی را وارد می‌کنید.`, [[{ text: '1h', callback_data: `botadmin:predictops:ubp:${userId}:${target}:1h` }, { text: '6h', callback_data: `botadmin:predictops:ubp:${userId}:${target}:6h` }], [{ text: '24h', callback_data: `botadmin:predictops:ubp:${userId}:${target}:24h` }, { text: '7d', callback_data: `botadmin:predictops:ubp:${userId}:${target}:7d` }], [{ text: 'Permanent', callback_data: `botadmin:predictops:ubp:${userId}:${target}:p` }], [{ text: '⬅️ User', callback_data: `botadmin:predictops:u:${userId}` }]]); }

async function sendPredictUserLimitsPanel(env: Env, chatId: number, messageId: number | undefined, userId: string, notice = ''): Promise<void> {
  const inspector = await getPredictUserInspector(env, userId);
  const text = [notice, '🎚 Predict Betting Limits', '', `User: ${userId}`, `Max per bet: ${inspector.limits.maxBetNano ? formatGram(inspector.limits.maxBetNano) + ' GRAM' : 'Unlimited'}`, `Daily limit: ${inspector.limits.dailyLimitNano ? formatGram(inspector.limits.dailyLimitNano) + ' GRAM' : 'Unlimited'}`, `Used today (UTC): ${formatGram(inspector.todayStakeNano)} GRAM`, '', '0 = Unlimited. Limitها قبل از debit در backend enforce می‌شوند.'].filter(Boolean).join('\n');
  await upsert(env, chatId, messageId, text, [[{ text: '✏️ Max per Bet', callback_data: `botadmin:predictops:ulm:${userId}` }, { text: '✏️ Daily Limit', callback_data: `botadmin:predictops:uld:${userId}` }], [{ text: '♻️ Clear Both', callback_data: `botadmin:predictops:ulc:${userId}` }], [{ text: '⬅️ User', callback_data: `botadmin:predictops:u:${userId}` }]]);
}

async function sendPredictUserInspector(env: Env, chatId: number, messageId: number | undefined, userId: string): Promise<void> {
  const inspector = await getPredictUserInspector(env, userId);
  const text = ['📊 User Predict Inspector', '', `User: ${userId}`, `Bets: ${inspector.totalBets} • Active: ${inspector.active}`, `Won / Lost / Refunded: ${inspector.wins} / ${inspector.losses} / ${inspector.refunded}`, `Total stake: ${formatGram(inspector.totalStakeNano)} GRAM`, `Total payout: ${formatGram(inspector.totalPayoutNano)} GRAM`, `Net: ${formatSignedGram(inspector.netNano)} GRAM`, `Today: ${formatGram(inspector.todayStakeNano)} GRAM`, `Last bet: ${formatOpsTime(inspector.lastBetAt)}`, '', inspector.recentBets.length ? 'Recent bets:' : 'Recent bets: —'].join('\n');
  const rows: Button[][] = inspector.recentBets.map((bet) => [{ text: `${marketIcon(bet.market)} ${bet.side.toUpperCase()} • ${formatGram(bet.stakeNano)} • ${bet.status}`, callback_data: `botadmin:predictops:bet:${bet.id}` }]); rows.push([{ text: '⬅️ User', callback_data: `botadmin:predictops:u:${userId}` }]); await upsert(env, chatId, messageId, text, rows);
}

async function sendPredictBetPanel(env: Env, chatId: number, messageId: number | undefined, betId: string, notice = ''): Promise<void> {
  const bet = await getPredictOpsBet(env, betId); if (!bet) throw new Error('Bet پیدا نشد.');
  const text = [notice, '🎟 Predict Bet', '', `ID: ${bet.id}`, `User: ${bet.userId}`, `Market: ${marketLabel(bet.market)}`, `Side: ${bet.side}`, `Stake: ${formatGram(bet.stakeNano)} GRAM`, `Status: ${bet.status}`, `Payout: ${formatGram(bet.payoutNano)} GRAM`, `Round: ${bet.roundId}`, `Round status: ${bet.roundStatus}`, `Round result: ${bet.roundResult || '—'}`, `Created: ${formatOpsTime(bet.createdAt)}`].filter(Boolean).join('\n');
  const rows: Button[][] = []; if (bet.refundable) rows.push([{ text: '💸 Refund Losing Bet', callback_data: `botadmin:predictops:rb:${bet.id}` }]); rows.push([{ text: '⬅️ Inspector', callback_data: `botadmin:predictops:ui:${bet.userId}` }]); await upsert(env, chatId, messageId, text, rows);
}

async function sendPredictBetRefundConfirm(env: Env, chatId: number, messageId: number | undefined, betId: string): Promise<void> { const bet = await getPredictOpsBet(env, betId); if (!bet || !bet.refundable) throw new Error('این bet برای Refund امن واجد شرایط نیست.'); await upsert(env, chatId, messageId, `⚠️ Confirm Bet Refund\n\n${bet.id}\n${formatGram(bet.stakeNano)} GRAM\n\nفقط اصل stake یک bet با وضعیت Lost در round تسویه‌شده برمی‌گردد. عملیات با reference یکتا است و دوبار credit نمی‌شود.`, [[{ text: '✅ Refund', callback_data: `botadmin:predictops:rbc:${bet.id}` }], [{ text: 'لغو', callback_data: `botadmin:predictops:bet:${bet.id}` }]]); }

async function sendPredictOpsRounds(env: Env, chatId: number, messageId: number | undefined, market: PredictOpsMarket): Promise<void> { const rounds = await listPredictOpsRounds(env, market, 8); const rows: Button[][] = rounds.map((round) => [{ text: `${roundStatusIcon(round)} ${shortRoundId(round.id)} • ${round.status}`, callback_data: `botadmin:predictops:round:${round.id}` }]); rows.push([{ text: `⬅️ ${marketLabel(market)}`, callback_data: `botadmin:predictops:market:${market}` }]); await upsert(env, chatId, messageId, `🔎 ${marketLabel(market)} Round Inspector\n\n${rounds.length ? 'یک round را انتخاب کنید.' : 'هنوز roundی پیدا نشد.'}`, rows); }

async function sendPredictOpsRound(env: Env, chatId: number, messageId: number | undefined, roundId: string, notice = ''): Promise<void> {
  const round = await getPredictOpsRound(env, roundId); if (!round) throw new Error('Round پیدا نشد.');
  const text = [notice, `🔎 ${marketIcon(round.market)} Round Inspector`, '', `ID: ${round.id}`, `Market: ${marketLabel(round.market)}`, `Status: ${round.status}`, `Start: ${formatOpsTime(round.startsAt)}`, `End: ${formatOpsTime(round.endsAt)}`, `Start price: ${formatOpsPrice(round.market, round.startPrice)}`, `End price: ${formatOpsPrice(round.market, round.endPrice)}`, `Result: ${round.result || '—'}`, `Settled: ${formatOpsTime(round.settledAt)}`, '', `Bets: ${round.totalBets} • Stake: ${formatGram(round.totalStakeNano)} GRAM`, `Active: ${Number(round.counts.active || 0)}`, `Pending: ${Number(round.counts.pending || 0)}`, `Settling: ${Number(round.counts.settling_payment || 0)}`, `Won / Lost: ${Number(round.counts.won || 0)} / ${Number(round.counts.lost || 0)}`, `Refunded / Failed: ${Number(round.counts.refunded || 0)} / ${Number(round.counts.failed || 0)}`].filter(Boolean).join('\n');
  const rows: Button[][] = [];
  if (round.due) rows.push([{ text: '🔁 Retry Settlement', callback_data: `botadmin:predictops:retryask:${round.id}` }]);
  if (round.status === 'open' || round.status === 'refunding') rows.push([{ text: round.status === 'refunding' ? '↩️ Resume Close & Refund' : '🛑 Close & Refund Round', callback_data: `botadmin:predictops:rr:${round.id}` }]);
  if (round.status === 'settled' && Number(round.counts.lost || 0) > 0) rows.push([{ text: '💸 Safety Refund Losing Bets', callback_data: `botadmin:predictops:rr:${round.id}` }]);
  rows.push([{ text: `⬅️ ${marketLabel(round.market)} Rounds`, callback_data: `botadmin:predictops:rounds:${round.market}` }]); await upsert(env, chatId, messageId, text, rows);
}

async function sendPredictRoundRefundConfirm(env: Env, chatId: number, messageId: number | undefined, roundId: string): Promise<void> {
  const round = await getPredictOpsRound(env, roundId);
  if (!round) throw new Error('Round پیدا نشد.');
  if (round.status === 'open' || round.status === 'refunding') {
    const active = Number(round.counts.active || 0) + Number(round.counts.settling_payment || 0);
    const pending = Number(round.counts.pending || 0);
    const title = round.status === 'refunding' ? '⚠️ Resume Close & Refund' : '⚠️ Close & Refund Round';
    await upsert(env, chatId, messageId, `${title}\n\n${round.id}\n${marketLabel(round.market)} • ${round.status}\nActive/settling: ${active}\nPending: ${pending}\nTotal stake: ${formatGram(round.totalStakeNano)} GRAM\n\nاین round فوراً بسته می‌شود و دیگر bet جدید نمی‌پذیرد. اصل stake تمام betهای فعال به کاربران برگردانده می‌شود.`, [[{ text: '✅ Close & Refund', callback_data: `botadmin:predictops:rrc:${round.id}` }], [{ text: 'لغو', callback_data: `botadmin:predictops:round:${round.id}` }]]);
    return;
  }
  if (round.status === 'settled' && Number(round.counts.lost || 0) > 0) {
    await upsert(env, chatId, messageId, `⚠️ Confirm Round Safety Refund\n\n${round.id}\nLost bets: ${Number(round.counts.lost || 0)}\n\nفقط اصل stake بت‌های Lost برگردانده می‌شود. Winnerها، payoutهای انجام‌شده و refundهای قبلی دست‌نخورده می‌مانند. هیچ debit یا clawback انجام نمی‌شود.`, [[{ text: '✅ Refund Losing Bets', callback_data: `botadmin:predictops:rrc:${round.id}` }], [{ text: 'لغو', callback_data: `botadmin:predictops:round:${round.id}` }]]);
    return;
  }
  throw new Error('این round برای Close/Refund واجد شرایط نیست.');
}
async function sendPredictOpsQueue(env: Env, chatId: number, messageId?: number): Promise<void> { const rounds = await listPredictOpsDueRounds(env); const rows: Button[][] = rounds.map((round) => [{ text: `${marketIcon(round.market)} ${marketLabel(round.market)} • ${shortRoundId(round.id)} • ${round.status}`, callback_data: `botadmin:predictops:round:${round.id}` }]); rows.push([{ text: '🔄 Refresh', callback_data: 'botadmin:predictops:queue' }, { text: '⬅️ Predict Ops', callback_data: 'botadmin:predictops:menu' }]); await upsert(env, chatId, messageId, rounds.length ? `🧾 Settlement Queue\n\n${rounds.length} round نیاز به بررسی دارد.` : '🧾 Settlement Queue\n\n✅ هیچ settlement عقب‌افتاده‌ای پیدا نشد.', rows); }
async function sendPredictOpsRetryConfirm(env: Env, chatId: number, messageId: number | undefined, roundId: string): Promise<void> { const round = await getPredictOpsRound(env, roundId); if (!round) throw new Error('Round پیدا نشد.'); if (!round.due) throw new Error('این round در صف settlement نیست.'); await upsert(env, chatId, messageId, `⚠️ Retry Settlement\n\n${round.id}\n${marketLabel(round.market)} • ${round.status}\n\nRound یا قیمت دستی ساخته نمی‌شود؛ فقط همان settlement فعلی دوباره اجرا می‌شود.`, [[{ text: '✅ اجرای Retry', callback_data: `botadmin:predictops:retry:${round.id}` }], [{ text: '⬅️ Round', callback_data: `botadmin:predictops:round:${round.id}` }]]); }
async function sendPredictOpsIncidents(env: Env, chatId: number, messageId?: number): Promise<void> { const incidents = await getPredictOpsIncidents(env); const rows: Button[][] = incidents.slice(0, 12).map((incident) => [{ text: `${incidentIcon(incident.type)} ${formatOpsTime(incident.at)}${incident.market ? ` • ${marketLabel(incident.market)}` : ''}`, callback_data: `botadmin:predictops:incident:${incident.id}` }]); rows.push([{ text: '🔄 Refresh', callback_data: 'botadmin:predictops:incidents' }, { text: '⬅️ Predict Ops', callback_data: 'botadmin:predictops:menu' }]); await upsert(env, chatId, messageId, `📜 Predict Incident Log\n\n${incidents.length ? 'یک incident را انتخاب کنید.' : 'هنوز incidentی ثبت نشده است.'}`, rows); }
async function sendPredictOpsIncident(env: Env, chatId: number, messageId: number | undefined, incidentId: string): Promise<void> { const incident = (await getPredictOpsIncidents(env)).find((item) => item.id === incidentId); if (!incident) throw new Error('Incident پیدا نشد یا از محدودهٔ لاگ خارج شده است.'); const text = ['📜 Predict Incident', '', `Time: ${formatOpsTime(incident.at)}`, `Type: ${incident.type}`, `Market: ${incident.market ? marketLabel(incident.market) : '—'}`, '', incident.message].join('\n'); await upsert(env, chatId, messageId, text, [[{ text: '⬅️ Incident Log', callback_data: 'botadmin:predictops:incidents' }]]); }
async function sendPredictAudit(env: Env, chatId: number, messageId?: number, userId?: string): Promise<void> { const entries = await listPredictAuditLog(env, 12, userId || null), lines = entries.map(auditLine); const rows: Button[][] = [[{ text: '🔄 Refresh', callback_data: userId ? `botadmin:predictops:au:${userId}` : 'botadmin:predictops:audit' }], [{ text: userId ? '⬅️ User' : '⬅️ Predict Ops', callback_data: userId ? `botadmin:predictops:u:${userId}` : 'botadmin:predictops:menu' }]]; await upsert(env, chatId, messageId, `${userId ? `🔐 User Audit • ${userId}` : '🔐 Predict Audit Log'}\n\n${lines.length ? lines.join('\n\n') : 'هنوز رکوردی ثبت نشده است.'}`, rows); }

function predictOpsMarketSummaryLines(status: PredictOpsMarketStatus, dashboard: PredictOpsDashboard): string[] { const paused = dashboard.emergencyPaused || status.manualPaused || status.circuitOpen || status.capacityReached; return [`${marketIcon(status.market)} ${marketLabel(status.market)} — ${paused ? '⏸ Paused' : '✅ Active'} • Feed ${status.circuitOpen ? '🛑' : status.lastSuccessAt ? '✅' : '⚪'}`, `   Exposure ${formatGram(status.activeExposureNano)}${status.exposureLimitNano ? '/' + formatGram(status.exposureLimitNano) : ''} • Due ${status.dueSettlementCount}`]; }
function userAccessLines(access: PredictUserMarketAccess): string[] { const state = access.blocked ? `⛔ Blocked • ${access.expiresAt ? formatRemaining(access.remainingMs) : 'Permanent'}` : '✅ Allowed', lines = [`${marketIcon(access.market)} ${marketLabel(access.market)}: ${state}`]; if (access.blocked) { lines.push(`   Reason: ${access.reason || 'Manual review'}`); if (access.adminNote) lines.push(`   Note: ${shorten(access.adminNote, 100)}`); } return lines; }
function auditLine(entry: PredictAuditEntry): string { const parts = [`• ${formatOpsTime(entry.createdAt)}`, entry.action, `admin:${entry.adminId}`]; if (entry.market) parts.push(marketLabel(entry.market)); if (entry.userId) parts.push(`user:${entry.userId}`); if (entry.targetId) parts.push(shorten(entry.targetId, 35)); return parts.join(' • ') + (entry.detail ? `\n${shorten(entry.detail, 170)}` : ''); }

async function findPredictOpsUserById(env: Env, userId: string): Promise<PredictOpsUserRow | null> { return env.DB.prepare('SELECT telegram_user_id,username,first_name FROM app_users WHERE telegram_user_id=? LIMIT 1').bind(cleanPredictUserId(userId)).first<PredictOpsUserRow>(); }
function predictAdminUserId(user: PredictOpsAdminUser): string { return cleanPredictUserId(user.id); }
function predictAdminUserButtonText(user: PredictOpsAdminUser): string { const name = String(user.firstName || '').trim() || 'بی‌نام', username = String(user.username || '').trim() || 'بدون یوزرنیم', returns = Math.max(1, Math.floor(Number(user.returnCount) || 1)); return `${shorten(name, 24)} | ${shorten(username, 24)} | ${formatGram(Number(user.tonBalanceNano) || 0)} GRAM | ↩️ ${returns}`; }
function predictAdminUserMatches(user: PredictOpsAdminUser, query: string): boolean { const q = String(query || '').trim().replace(/^@+/, '').toLowerCase(); if (!q) return false; return [user.id, user.username, user.firstName].some((value) => String(value ?? '').trim().replace(/^@+/, '').toLowerCase().includes(q)); }
function predictOnlineUserButtonText(user: PredictOpsUserRow): string { return `🟢 ${shorten(predictUserLabel(user), 32)} • ${user.telegram_user_id}`; }
function predictVisitorButtonText(user: PredictVisitorUserRow): string { return `👣 ${shorten(predictUserLabel(user), 31)} • ${formatPredictVisitorDay(user.predict_last_seen_at)}`; }
function formatPredictVisitorDay(value: string | null): string { if (!value) return '—'; const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : '—'; }
function blockedPredictUserButtonText(entry: PredictBlockedUser): string { const name = shorten(predictUserLabel(entry.user), 28), markets = entry.access.filter((item) => item.blocked).map((item) => marketIcon(item.market)).join(' '); return `⛔ ${name} • ${markets || 'Predict'}`; }
function parseReasonNote(textInput: string): { reason: string; adminNote: string | null } { const text = String(textInput || '').trim(); if (!text || text === '-') return { reason: 'Manual review', adminNote: null }; const split = text.indexOf('|'), reason = (split >= 0 ? text.slice(0, split) : text).replace(/\s+/g, ' ').trim().slice(0, 80) || 'Manual review', adminNote = split >= 0 ? text.slice(split + 1).replace(/\s+/g, ' ').trim().slice(0, 180) || null : null; return { reason, adminNote }; }
function durationExpiresAt(duration: BlockDuration): string | null { const hours = duration === '1h' ? 1 : duration === '6h' ? 6 : duration === '24h' ? 24 : duration === '7d' ? 168 : 0; return hours ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString() : null; }
function durationLabel(duration: BlockDuration): string { return duration === '1h' ? '1 hour' : duration === '6h' ? '6 hours' : duration === '24h' ? '24 hours' : duration === '7d' ? '7 days' : 'Permanent'; }
function blockTargetLabel(target: BlockTarget): string { return target === 'all' ? 'All Predict Markets' : marketLabel(target); }
function cleanBlockTarget(value: unknown): BlockTarget { const v = String(value || '').toLowerCase(); return v === 'all' ? 'all' : cleanOpsMarket(v); }
function cleanBlockDuration(value: unknown): BlockDuration { const v = String(value || ''); if (v === '1h' || v === '6h' || v === '24h' || v === '7d' || v === 'p') return v; throw new Error('مدت نامعتبر است.'); }
function gramInputToNano(value: unknown): number { const n = Number(String(value ?? '').trim()); if (!Number.isFinite(n) || n < 0 || n > 9_000_000_000) throw new Error('مقدار GRAM نامعتبر است.'); const nano = Math.floor(n * NANO); if (!Number.isSafeInteger(nano)) throw new Error('مقدار بیش از حد بزرگ است.'); return nano; }
function formatRemaining(value: number | null): string { const ms = Math.max(0, Number(value) || 0), minutes = Math.ceil(ms / 60000); if (minutes >= 1440) return `${Math.ceil(minutes / 1440)}d`; if (minutes >= 60) return `${Math.ceil(minutes / 60)}h`; return `${minutes}m`; }
function predictUserLabel(user: PredictOpsUserRow): string { const name = String(user.first_name || '').replace(/[<>]/g, '').trim(), username = String(user.username || '').replace(/^@+/, '').replace(/[^0-9A-Za-z_]/g, '').slice(0, 64); return name && username ? `${name} (@${username})` : name || (username ? `@${username}` : 'User'); }
function cleanPredictUserId(value: unknown): string { const id = String(value || '').trim(); if (!/^\d{1,20}$/.test(id)) throw new Error('User ID نامعتبر است.'); return id; }
function requireMarketStatus(dashboard: PredictOpsDashboard, market: PredictOpsMarket): PredictOpsMarketStatus { const status = dashboard.markets.find((item) => item.market === market); if (!status) throw new Error('Market status unavailable.'); return status; }
function cleanOpsMarket(value: unknown): PredictOpsMarket { const market = String(value || '').trim().toLowerCase(); if (market === 'bitcoin' || market === 'gold' || market === 'oil') return market; throw new Error('Market نامعتبر است.'); }
function cleanPredictMenu(value: unknown): PredictMenu { const market = String(value || '').trim().toLowerCase(); if (market === 'world' || market === 'tech' || market === 'culture') return market; return cleanOpsMarket(market); }
function predictMenuLabel(market: PredictMenu): string { return market === 'world' ? 'World' : market === 'tech' ? 'Tech / AI' : market === 'culture' ? 'Culture' : marketLabel(market); }
function marketIcon(market: PredictOpsMarket): string { return market === 'bitcoin' ? '₿' : market === 'gold' ? '🥇' : '🛢'; }
function marketLabel(market: PredictOpsMarket): string { return market === 'bitcoin' ? 'Bitcoin' : market === 'gold' ? 'Gold' : 'Oil'; }
function formatOpsPrice(market: PredictOpsMarket, value: number | null): string { const n = Number(value); return !Number.isFinite(n) || n <= 0 ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: market === 'bitcoin' ? 0 : 2, maximumFractionDigits: market === 'bitcoin' ? 0 : 2 }); }
function formatGram(nano: number): string { return (Math.max(0, Number(nano) || 0) / NANO).toLocaleString('en-US', { maximumFractionDigits: 4 }); }
function formatFeeGram(nano: number): string { return (Math.max(0, Number(nano) || 0) / NANO).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatSignedGram(nano: number): string { const value = Number(nano) || 0; return (value >= 0 ? '+' : '-') + formatGram(Math.abs(value)); }
function formatOpsTime(value: string | null): string { if (!value) return '—'; const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toISOString().replace('.000Z', 'Z') : String(value); }
function shortRoundId(value: string): string { const parts = String(value || '').split('_'); return parts.length >= 3 ? parts.slice(-1)[0].slice(-8) : shorten(value, 18); }
function roundStatusIcon(round: PredictOpsRoundView): string { return round.due ? '⚠️' : round.status === 'settled' ? '✅' : round.status === 'refunded' ? '↩️' : round.status === 'refunding' ? '🟠' : round.status === 'open' ? '🟢' : '🟡'; }
function incidentIcon(type: string): string { return type === 'feed_recovered' || type === 'settlement_retry_ok' || type === 'market_resume' || type === 'emergency_resume' ? '✅' : type.includes('failed') || type.includes('circuit') ? '🛑' : type.includes('pause') ? '⏸' : '•'; }

async function sendEventsMenu(env: Env, chatId: number, messageId?: number): Promise<void> { const events = await listPredictionEvents(env, true) as AdminEvent[]; const rows: Button[][] = [[{ text: '🌍 World', callback_data: 'botadmin:events:discover:world' }, { text: '🤖 Tech / AI', callback_data: 'botadmin:events:discover:tech' }], [{ text: '🎬 Culture', callback_data: 'botadmin:events:discover:culture' }]]; for (const event of events.slice(0, 12)) rows.push([{ text: statusIcon(event.status) + ' ' + shorten(event.question, 42), callback_data: 'botadmin:events:show:' + event.id }]); rows.push([{ text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' }]); const counts = events.reduce<Record<string, number>>((out, event) => { out[event.status] = (out[event.status] || 0) + 1; return out; }, {}); await upsert(env, chatId, messageId, '🔮 پیش‌بینی رویدادهای Vexa\n\nمنبع پولی‌مارکت فقط برای کشف دستی است؛ هیچ انتقال پول یا تسویه‌ای خارج از Vexa انجام نمی‌شود.\n\nDraft: ' + (counts.draft || 0) + ' • Open: ' + (counts.open || 0) + ' • Final: ' + ((counts.settled || 0) + (counts.refunded || 0)), rows); }
async function sendDiscovery(env: Env, chatId: number, messageId: number | undefined, category: string): Promise<void> { if (category !== 'world' && category !== 'tech' && category !== 'culture') throw new Error('دسته نامعتبر است.'); const markets = await discoverPolymarketPredictions(category), rows: Button[][] = markets.map((market) => [{ text: '＋ ' + shorten(market.question, 52), callback_data: 'botadmin:events:import:' + market.sourceMarketId }]); rows.push([{ text: '🔄 دوباره جست‌وجو', callback_data: 'botadmin:events:discover:' + category }, { text: '⬅️ رویدادها', callback_data: 'botadmin:events:list' }]); const label = category === 'world' ? 'World' : category === 'tech' ? 'Tech / AI' : 'Culture'; await upsert(env, chatId, messageId, markets.length ? `🔎 ${label}\n\nاین فهرست فقط با لمس دکمه از API عمومی پولی‌مارکت خوانده شده و ورزش حذف شده است.` : `🔎 ${label}\n\nفعلاً مورد مناسبی پیدا نشد. هیچ رفرش خودکاری فعال نیست.`, rows); }
async function sendEventPanel(env: Env, chatId: number, messageId: number | undefined, event: AdminEvent, notice = ''): Promise<void> { const rows: Button[][] = []; if (event.status === 'draft') { rows.push([{ text: '✏️ ویرایش سؤال', callback_data: 'botadmin:events:ask:question:' + event.id }]); rows.push([{ text: '🕒 زمان بسته‌شدن', callback_data: 'botadmin:events:ask:close:' + event.id }, { text: '🔗 منبع تسویه', callback_data: 'botadmin:events:ask:source:' + event.id }]); rows.push([{ text: '✅ انتشار در Vexa', callback_data: 'botadmin:events:publish:' + event.id }]); } else if (event.status === 'open') { rows.push([{ text: '↩️ لغو انتشار (بدون بت)', callback_data: 'botadmin:events:unpublish:' + event.id }]); rows.push([{ text: '🟢 تسویه Yes', callback_data: 'botadmin:events:settle:' + event.id + ':yes' }, { text: '🔴 تسویه No', callback_data: 'botadmin:events:settle:' + event.id + ':no' }]); rows.push([{ text: '💸 بازگرداندن همهٔ مبالغ', callback_data: 'botadmin:events:refund:' + event.id }]); } rows.push([{ text: '⬅️ رویدادها', callback_data: 'botadmin:events:list' }]); const text = [notice, '🔮 ' + statusIcon(event.status) + ' ' + event.status.toUpperCase(), '', event.question, '', 'Category: ' + event.category, 'Close: ' + formatDate(event.closes_at), 'Resolution source: ' + (event.resolution_source || 'تنظیم نشده'), 'Polymarket reference: ' + event.source_url, event.result ? 'Result: ' + event.result.toUpperCase() : ''].filter(Boolean).join('\n'); await upsert(env, chatId, messageId, text, rows); }
async function promptForInput(env: Env, chatId: number, messageId: number | undefined, mode: InputState['mode'], event: AdminEvent): Promise<void> { const text = mode === 'question' ? '✏️ سؤال جدید را بفرستید.\n\nفعلی: ' + event.question : mode === 'close' ? '🕒 زمان بسته‌شدن را به فرمت UTC بفرستید.\nنمونه: 2026-12-31 18:00 UTC\n\nفعلی: ' + formatDate(event.closes_at) : '🔗 لینک HTTPS منبع رسمی نتیجه را بفرستید.\n\nفعلی: ' + (event.resolution_source || 'تنظیم نشده'); await upsert(env, chatId, messageId, text, [[{ text: 'لغو', callback_data: 'botadmin:events:show:' + event.id }]]); }
async function requireEvent(env: Env, id: string): Promise<AdminEvent> { const event = await getPredictionEvent(env, id) as AdminEvent | null; if (!event) throw new Error('رویداد پیدا نشد.'); return event; }
async function readState(env: Env, userId: number): Promise<InputState | null> { const raw = await env.BOT_CACHE.get(stateKey(userId)).catch(() => null); if (!raw) return null; try { const state = JSON.parse(raw) as InputState; return state && typeof state.eventId === 'string' && (state.mode === 'question' || state.mode === 'close' || state.mode === 'source') ? state : null; } catch { return null; } }
function clearState(env: Env, userId: number): Promise<void> { return env.BOT_CACHE.delete(stateKey(userId)).catch(() => undefined); }
function stateKey(userId: number): string { return STATE_PREFIX + String(userId); }
async function savePredictOpsState(env: Env, userId: number, state: PredictOpsInputState): Promise<void> { await env.BOT_CACHE.put(predictOpsStateKey(userId), JSON.stringify(state), { expirationTtl: 900 }); }
async function readPredictOpsState(env: Env, userId: number): Promise<PredictOpsInputState | null> { const raw = await env.BOT_CACHE.get(predictOpsStateKey(userId)).catch(() => null); if (!raw) return null; try { const state = JSON.parse(raw) as PredictOpsInputState; if (!state || typeof state !== 'object' || typeof state.mode !== 'string') return null; if (state.mode === 'maintenance' || state.mode === 'user-access') return state; if ((state.mode === 'user-note' || state.mode === 'user-max-limit' || state.mode === 'user-daily-limit') && typeof state.userId === 'string') return state; if (state.mode === 'market-exposure' && (state.market === 'bitcoin' || state.market === 'gold' || state.market === 'oil')) return state; if (state.mode === 'user-block-note' && typeof state.userId === 'string') return state; return null; } catch { return null; } }
function clearPredictOpsState(env: Env, userId: number): Promise<void> { return env.BOT_CACHE.delete(predictOpsStateKey(userId)).catch(() => undefined); }
function predictOpsStateKey(userId: number): string { return PREDICT_OPS_STATE_PREFIX + String(userId); }
function isAdmin(env: Env, userId: unknown): boolean { return String(env.BOT_ADMIN || '').split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean).includes(String(userId || '')); }
function statusIcon(status: string): string { return status === 'open' ? '🟢' : status === 'draft' ? '🟡' : status === 'settled' ? '✅' : status === 'refunded' ? '↩️' : '⚪'; }
function shorten(value: string, length: number): string { const text = String(value || '').replace(/\s+/g, ' ').trim(); return text.length > length ? text.slice(0, Math.max(1, length - 1)) + '…' : text; }
function limitTelegramText(value: unknown, max = TELEGRAM_TEXT_SAFE_LIMIT): string { const chars = Array.from(String(value ?? '')); return chars.length > max ? chars.slice(0, Math.max(1, max - 1)).join('') + '…' : chars.join(''); }
function formatDate(value: string): string { const date = new Date(value); return Number.isFinite(date.getTime()) ? date.toISOString().replace('.000Z', 'Z') : value; }
function messageOf(error: unknown): string { return error instanceof Error ? error.message : 'عملیات ناموفق بود.'; }
function ok(): Response { return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } }); }
async function sendError(env: Env, chatId: number, messageId: number | undefined, error: unknown): Promise<void> { await upsert(env, chatId, messageId, '❌ ' + messageOf(error), [[{ text: '⬅️ رویدادها', callback_data: 'botadmin:events:list' }]]); }
async function sendPredictOpsError(env: Env, chatId: number, messageId: number | undefined, error: unknown): Promise<void> { await upsert(env, chatId, messageId, '❌ Predict Ops\n\n' + messageOf(error), [[{ text: '⬅️ Predict Ops', callback_data: 'botadmin:predictops:menu' }]]); }
async function upsert(env: Env, chatId: number, messageId: number | undefined, text: string, keyboard: Button[][]): Promise<void> { await upsertTelegramTextMenu(env, env.BOT_TOKEN, telegram, chatId, messageId, { text: limitTelegramText(text), reply_markup: { inline_keyboard: keyboard }, disable_web_page_preview: true }); }
async function telegram<T = unknown>(token: string, method: string, payload: unknown): Promise<T> { const response = await fetch('https://api.telegram.org/bot' + token + '/' + method, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); const result = await response.json().catch(() => ({})) as { ok?: boolean; result?: T; description?: string }; if (!response.ok || !result.ok) throw new Error(result.description || 'Telegram ' + method + ' failed'); return result.result as T; }
