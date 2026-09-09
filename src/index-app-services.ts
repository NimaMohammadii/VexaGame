import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import app from './index';
import { trackAppUser } from './admin-users';
import { applyGameTonBalanceDeltas, publicUserControls } from './user-controls';
import { setTelegramWebhook } from './telegram-game-bot';
import { gameBotToken, PUBLIC_BASE_URL, validateTelegramInitData } from './utils';
import { cleanSectionId, sectionBackgroundInfo, sectionBackgroundR2Key } from './section-backgrounds';
import type { Env } from './types';
import { getOnlineUserCountConfig, ONLINE_COUNT_SECTIONS, resetOnlineUserCountConfig, saveOnlineUserCountConfig } from './online-user-counts';
import { clearSectionLock, getSectionAccess, isMiniAppAdmin, setSectionLock } from './section-access';
import './predict-routes';
import './crash-routes';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/vnd.wave', 'audio/ogg', 'application/ogg', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/m4a']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'oga', 'webm', 'mp4', 'm4a', 'aac']);
const MINIAPP_AUDIO_KEY = 'miniapp/audio';
const WALLET_CREDIT_AUDIO_KEY = 'miniapp/audio/wallet-credit';
const LOADING_AUDIO_KEY = 'miniapp/audio/loading';
const MINIAPP_AUDIO_ENABLED_KEY = 'admin:miniapp-audio-enabled';
const UPLOADED_IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const UPLOADED_IMAGE_INDEX_CACHE_CONTROL = 'no-store';

type MiniappAudioTarget = 'dice' | 'wallet-credit' | 'loading';

const UPLOADED_IMAGE_CONTEXT_SECTIONS: Record<string, string[]> = {
  home: ['home'],
  startup: ['home'],
  playzone: ['playzone', 'mines', 'plinko', 'crash', 'slot', 'coinflip', 'hilo', 'ghostrun'],
  mines: ['mines'],
  plinko: ['plinko'],
};
const UPLOADED_IMAGE_CONTEXT_ASSETS: Record<string, Array<'credit' | 'ton' | 'plinko' | 'mines'>> = {
  home: ['credit', 'ton'],
  startup: ['credit', 'ton'],
  playzone: ['credit', 'ton'],
  mines: ['credit', 'ton', 'mines'],
  plinko: ['credit', 'ton', 'plinko'],
};

const activitySchema = z.object({ userId: z.string().min(1).max(64), username: z.string().max(80).nullable().optional(), firstName: z.string().max(120).nullable().optional(), avatarUrl: z.string().url().max(1_500).nullable().optional(), section: z.string().max(40).nullable().optional(), countryCode: z.string().max(2).nullable().optional() });
const lockSchema = z.object({ sectionId: z.string().min(1).max(40), locked: z.boolean() });
const codeLockSchema = z.object({ sectionId: z.string().min(1).max(40), code: z.string().min(1).max(80) });
const userIdSchema = z.object({ userId: z.string().min(1).max(80) });
const gameBalanceEventSchema = z.object({ eventId: z.string().min(12).max(80).regex(/^[0-9A-Za-z_-]+$/), deltaNano: z.number().int(), section: z.string().max(40).optional() });
const gameTonBalanceSchema = z.object({ userId: z.string().min(1).max(80), initData: z.string().min(1).max(8192), deltas: z.array(gameBalanceEventSchema).min(1).max(20) });
const userTonBalanceSchema = z.object({ userId: z.string().min(1).max(80), tonBalanceNano: z.number().int().nonnegative() });
const userTonBalanceAdjustSchema = z.object({ userId: z.string().min(1).max(80), deltaNano: z.number().int() });
const userWinChanceSchema = z.object({ userId: z.string().min(1).max(80), winChancePercent: z.number().int().min(0).max(100) });
const userSectionBlockSchema = z.object({ userId: z.string().min(1).max(80), sectionId: z.string().min(1).max(40), blocked: z.boolean() });
const audioEnabledSchema = z.object({ enabled: z.boolean() });
const playZoneCardVisibilitySchema = z.object({ gameId: z.string().min(1).max(40), visible: z.boolean() });
const sectionAccessLockSchema = z.object({ sectionId: z.string().min(1).max(40), minutes: z.number().int().min(1).max(43_200) });
const sectionAccessUnlockSchema = z.object({ sectionId: z.string().min(1).max(40) });

app.get('/setup-webhook', async (c) => {
  const result = await setTelegramWebhook(c.env);
  const menu = await setGameMenuButton(c.env.TELEGRAM_BOT_TOKEN, `${PUBLIC_BASE_URL}/app`);
  const payload = { ...result, menu, webhookUrl: `${PUBLIC_BASE_URL}/telegram/webhook`, miniApp: `${PUBLIC_BASE_URL}/app` };
  const ok = Boolean((payload as { ok?: boolean }).ok);
  return new Response(`<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Setup Webhook</title><style>body{margin:0;background:#000;color:#fff;font-family:system-ui,-apple-system,Segoe UI,sans-serif;padding:22px}main{max-width:520px;margin:auto}h1{font-size:28px;margin:0 0 10px}.box{border:1px solid rgba(255,255,255,.16);border-radius:22px;padding:16px;background:#080808}pre{white-space:pre-wrap;word-break:break-word;color:#ddd;font-size:12px}.ok{color:#7CFFB2}.bad{color:#FF8A8A}</style></head><body><main><h1 class="${ok ? 'ok' : 'bad'}">${ok ? 'Webhook updated' : 'Webhook failed'}</h1><div class="box"><p>Webhook URL:</p><pre>${escapeHtml(`${PUBLIC_BASE_URL}/telegram/webhook`)}</pre><p>Mini app:</p><pre>${escapeHtml(`${PUBLIC_BASE_URL}/app`)}</pre><p>Telegram response:</p><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre></div></main></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
});

app.post('/app/api/activity', zValidator('json', activitySchema), async (c) => c.json(await trackAppUser(c.env, c.req.valid('json'))));
app.post('/app/api/ton-balance/game-delta', zValidator('json', gameTonBalanceSchema), async (c) => {
  const body = c.req.valid('json');
  try {
    const userId = await validateTelegramInitData(body.initData, gameBotToken(c.env));
    if (userId !== body.userId) throw new Error('Telegram user mismatch');
    const deltas = body.deltas;
    if (deltas.some((item) => ['plinko','crash'].includes(String(item.section || '').trim().toLowerCase()))) throw new Error('Plinko and Crash balances are settled by secure server endpoints.');
    return c.json(await applyGameTonBalanceDeltas(c.env, userId, deltas));
  }
  catch (error) { return c.json({ error: error instanceof Error ? error.message : 'Could not update GRAM balance' }, 400); }
});

app.get('/app/api/section-backgrounds', async (c) => {
  const adminSections = [
    { id: 'playzone', label: 'Play Zone', description: 'Play Zone background' },
    { id: 'predict', label: 'Predict', description: 'Predict background' },
    { id: 'mines', label: 'Mines', description: 'Mines background' },
    { id: 'plinko', label: 'Plinko', description: 'Plinko background' },
    { id: 'crash', label: 'Crash', description: 'Crash background' },
    { id: 'slot', label: 'Slot', description: 'Slot background' },
    { id: 'ghostrun', label: 'Ghost Run', description: 'Ghost Run background' },
    { id: 'coinflip', label: 'Pump', description: 'Pump background' },
  ];
  const sections = await Promise.all(adminSections.map((section) => sectionBackgroundInfo(c.env, section)));
  const preload = sections.map((section) => section.backgroundUrl).filter(Boolean);
  return c.json({ sections, preload }, 200, { 'cache-control': UPLOADED_IMAGE_INDEX_CACHE_CONTROL });
});
app.get('/app/api/section-background/:section', async (c) => {
  try {
    const section = cleanSectionId(c.req.param('section').replace(/\.png$/i, ''));
    const key = sectionBackgroundR2Key(section);
    return getAssetResponse(c.env, key, null, { cacheControl: c.req.query('v') ? UPLOADED_IMAGE_CACHE_CONTROL : 'no-store' });
  } catch {
    return c.text('Not found', 404, { 'cache-control': 'no-store' });
  }
});
app.get('/app/api/uploaded-images', async (c) => {
  const context = normalizeUploadedImagesContext(c.req.query('context'));
  const scopedSections = context ? UPLOADED_IMAGE_CONTEXT_SECTIONS[context] : null;
  const assetScope = new Set(context ? UPLOADED_IMAGE_CONTEXT_ASSETS[context] : uploadedImageAssetScopeForSections(scopedSections));
  const head = (enabled: boolean, key: string) => enabled ? c.env.ASSETS.head(key).catch(() => null) : Promise.resolve(null);
  const [loadingAudioHead, creditHead, tonHead, plinkoHead, minesSafeHead, minesBombHead] = await Promise.all([
    head(context === 'startup', LOADING_AUDIO_KEY),
    head(assetScope.has('credit'), 'credit-icon'),
    head(assetScope.has('ton'), 'ton-icon'),
    head(assetScope.has('plinko'), 'plinko-ball'),
    head(assetScope.has('mines'), 'mines-tile/safe'),
    head(assetScope.has('mines'), 'mines-tile/bomb'),
  ]);
  const loadingAudioUrl = loadingAudioHead ? `/app/api/miniapp-audio-file?target=loading&v=${assetVersion(loadingAudioHead)}` : null;
  const creditIconUrl = assetScope.has('credit') ? `/app/api/credit-icon.png?v=${assetVersion(creditHead)}` : null;
  const tonIconUrl = assetScope.has('ton') ? (tonHead ? `/app/api/uploaded-image/ton-icon.png?v=${assetVersion(tonHead)}` : creditIconUrl) : null;
  const plinkoBallUrl = assetScope.has('plinko') ? (plinkoHead ? `/app/api/uploaded-image/plinko-ball.png?v=${assetVersion(plinkoHead)}` : creditIconUrl) : null;
  const minesSafeUrl = minesSafeHead ? `/app/api/uploaded-image/mines-safe.png?v=${assetVersion(minesSafeHead)}` : null;
  const minesBombUrl = minesBombHead ? `/app/api/uploaded-image/mines-bomb.png?v=${assetVersion(minesBombHead)}` : null;
  const preload = [creditIconUrl, tonIconUrl, plinkoBallUrl, minesSafeUrl, minesBombUrl].filter(Boolean);
  return c.json({ loadingAudioUrl, creditIconUrl, tonIconUrl, plinkoBallUrl, minesSafeUrl, minesBombUrl, preload }, 200, { 'cache-control': UPLOADED_IMAGE_INDEX_CACHE_CONTROL });
});

app.get('/app/api/uploaded-image/ton-icon.png', async (c) => getAssetResponse(c.env, 'ton-icon', '/app/api/credit-icon.png'));
app.get('/app/api/uploaded-image/plinko-ball.png', async (c) => getAssetResponse(c.env, 'plinko-ball', '/app/api/credit-icon.png'));
app.get('/app/api/uploaded-image/mines-safe.png', async (c) => getAssetResponse(c.env, 'mines-tile/safe', null, { cacheControl: c.req.query('v') ? UPLOADED_IMAGE_CACHE_CONTROL : 'no-store' }));
app.get('/app/api/uploaded-image/mines-bomb.png', async (c) => getAssetResponse(c.env, 'mines-tile/bomb', null, { cacheControl: c.req.query('v') ? UPLOADED_IMAGE_CACHE_CONTROL : 'no-store' }));
app.get('/app/api/miniapp-audio', async (c) => getMiniappAudioResponse(c.env, normalizeMiniappAudioTarget(c.req.query('target'))));
app.get('/app/api/miniapp-audio-file', async (c) => {
  const target = normalizeMiniappAudioTarget(c.req.query('target'));
  return getAssetResponse(c.env, miniappAudioKey(target), null, { rangeHeader: c.req.header('range'), defaultContentType: 'audio/mpeg' });
});

function uploadedImageAssetScopeForSections(sections: string[] | null): Array<'credit' | 'ton' | 'plinko' | 'mines'> {
  if (!sections) return ['credit', 'ton', 'plinko', 'mines'];
  const scope: Array<'credit' | 'ton' | 'plinko' | 'mines'> = ['credit', 'ton'];
  if (sections.includes('plinko')) scope.push('plinko');
  if (sections.includes('mines')) scope.push('mines');
  return scope;
}
function normalizeUploadedImagesContext(context: string | undefined): string | null {
  const clean = String(context || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(UPLOADED_IMAGE_CONTEXT_SECTIONS, clean) ? clean : null;
}
app.get('/app/api/online-user-counts', async (c) => c.json({ ok: true, sections: ONLINE_COUNT_SECTIONS, ...(await getOnlineUserCountConfig(c.env)) }, 200, { 'cache-control': 'no-store' }));
app.get('/app/api/user-controls', zValidator('query', userIdSchema), async (c) => c.json(await publicUserControls(c.env, c.req.valid('query').userId)));
app.get('/app/api/section-access', zValidator('query', userIdSchema), async (c) => {
  const userId = c.req.valid('query').userId;
  const locks = await getSectionAccess(c.env);
  if (isMiniAppAdmin(c.env, userId)) return c.json({ ok: true, locks: {}, serverNow: Math.floor(Date.now() / 1000) }, 200, { 'cache-control': 'no-store' });
  const bySection = Object.fromEntries(locks.map((lock) => [lock.sectionId, { ...lock, serverNow: Math.floor(Date.now() / 1000) }]));
  return c.json({ ok: true, locks: bySection, serverNow: Math.floor(Date.now() / 1000) }, 200, { 'cache-control': 'no-store' });
});

function normalizeMiniappAudioTarget(value: unknown): MiniappAudioTarget {
  const clean = String(value || '').trim().toLowerCase();
  return clean === 'loading' ? 'loading' : clean === 'wallet-credit' ? 'wallet-credit' : 'dice';
}
function miniappAudioKey(target: MiniappAudioTarget): string {
  return target === 'loading' ? LOADING_AUDIO_KEY : target === 'wallet-credit' ? WALLET_CREDIT_AUDIO_KEY : MINIAPP_AUDIO_KEY;
}
async function getMiniappAudioJson(env: Env, target: MiniappAudioTarget): Promise<Record<string, unknown>> {
  const object = await env.ASSETS.head(miniappAudioKey(target)).catch(() => null);
  const enabled = target === 'dice'
    ? (await env.BOT_CACHE.get(MINIAPP_AUDIO_ENABLED_KEY).catch(() => '0')) === '1'
    : true;
  const version = assetVersion(object);
  return {
    ok: true,
    target,
    hasAudio: Boolean(object),
    enabled: Boolean(object) && enabled,
    version,
    type: object?.httpMetadata?.contentType || '',
    url: object ? `/app/api/miniapp-audio-file?target=${encodeURIComponent(target)}&v=${encodeURIComponent(version)}` : null,
  };
}
async function getMiniappAudioResponse(env: Env, target: MiniappAudioTarget): Promise<Response> { return Response.json(await getMiniappAudioJson(env, target), { headers: { 'cache-control': UPLOADED_IMAGE_INDEX_CACHE_CONTROL } }); }
async function getAssetResponse(env: Env, key: string, fallbackUrl: string | null, options: { rangeHeader?: string; defaultContentType?: string; cacheControl?: string } = {}): Promise<Response> { const head = await env.ASSETS.head(key).catch(() => null); if (!head) return fallbackUrl ? Response.redirect(fallbackUrl, 302) : new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } }); const range = parseByteRange(options.rangeHeader, head.size); const object = await env.ASSETS.get(key, range ? { range: { offset: range.start, length: range.end - range.start + 1 } } : undefined).catch(() => null); if (!object) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } }); const headers = new Headers({ 'content-type': object.httpMetadata?.contentType || head.httpMetadata?.contentType || options.defaultContentType || 'image/png', 'cache-control': options.cacheControl || UPLOADED_IMAGE_CACHE_CONTROL, 'accept-ranges': 'bytes', 'content-length': String(range ? range.end - range.start + 1 : head.size) }); if (range) headers.set('content-range', `bytes ${range.start}-${range.end}/${head.size}`); return new Response(object.body, { status: range ? 206 : 200, headers }); }
function parseByteRange(header: string | undefined, size: number): { start: number; end: number } | null { if (!header || !Number.isFinite(size) || size <= 0) return null; const match = header.match(/^bytes=(\d*)-(\d*)$/); if (!match || (!match[1] && !match[2])) return null; let start = match[1] ? Number(match[1]) : size - Number(match[2]); let end = match[2] ? Number(match[2]) : size - 1; if (!Number.isInteger(start) || !Number.isInteger(end)) return null; start = Math.max(0, start); end = Math.min(size - 1, end); return start <= end ? { start, end } : null; }
function audioContentTypeFromExtension(extension: string): string { if (extension === 'wav') return 'audio/wav'; if (extension === 'ogg' || extension === 'oga') return 'audio/ogg'; if (extension === 'webm') return 'audio/webm'; if (extension === 'mp4' || extension === 'm4a') return 'audio/mp4'; if (extension === 'aac') return 'audio/aac'; return 'audio/mpeg'; }
function assetVersion(object: { customMetadata?: Record<string, string> } | null): string { return object?.customMetadata?.version || '1'; }
async function setGameMenuButton(token: string, url: string): Promise<{ ok: boolean; description?: string }> { const response = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ menu_button: { type: 'web_app', text: 'Vexa Games', web_app: { url } } }) }); return response.json() as Promise<{ ok: boolean; description?: string }>; }
function escapeHtml(value: string): string { return value.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char] ?? char)); }
export default app;
