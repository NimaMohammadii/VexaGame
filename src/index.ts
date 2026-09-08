import { Hono } from 'hono';
import { miniAppHtml } from './miniapp-game';
import { registerFriendGameRoutes } from './game-friend-routes';
import { registerWheelRoutes } from './wheel-routes';
import { registerSlotAssetRoutes } from './slot-assets';
import { handleGameBotWebhook } from './telegram-game-bot';
import { addUserXpBatch, getUserLevel } from './levels';
import { createUsdtDeposit, getUsdtDeposit, verifyUsdtDeposit } from './usdt-deposits';
import type { Env, TelegramUpdate } from './types';
import { gameBotToken, PUBLIC_BASE_URL, validateTelegramInitData } from './utils';

const app = new Hono<{ Bindings: Env }>();
const FALLBACK_PNG = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,120,156,99,248,255,255,63,0,5,254,2,254,167,53,129,132,0,0,0,0,73,69,78,68,174,66,96,130]);
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const HOME_LOTTERY_SLOT_KEY = 'home-lottery-slot';
const VERSIONED_IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

type LevelXpEventInput = {
  amount?: unknown;
  source?: unknown;
  metadata?: unknown;
  eventId?: unknown;
};

type LevelXpBody = LevelXpEventInput & {
  initData?: unknown;
  events?: LevelXpEventInput[];
};

type StaticAssetsEnv = Env & { STATIC_ASSETS: { fetch(request: Request): Promise<Response> } };

async function serveVersionedStaticAsset(request: Request, env: Env, assetPath: string): Promise<Response> {
  const staticAssets = (env as StaticAssetsEnv).STATIC_ASSETS;
  if (!staticAssets) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  const assetUrl = new URL(request.url);
  assetUrl.pathname = assetPath;
  assetUrl.search = '';
  const upstream = await staticAssets.fetch(new Request(assetUrl.toString(), request));
  const headers = new Headers(upstream.headers);
  headers.set('cache-control', new URL(request.url).searchParams.has('v') ? VERSIONED_IMAGE_CACHE_CONTROL : 'public, max-age=300, must-revalidate');
  headers.set('x-content-type-options', 'nosniff');
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
}

app.get('/', (c) => c.redirect('/app'));
app.get('/tonconnect-manifest.json', (c) => c.json(
  {
    url: PUBLIC_BASE_URL,
    name: 'Vexa Games',
    iconUrl: `${PUBLIC_BASE_URL}/app/api/credit-icon.png`,
  },
  200,
  {
    'cache-control': 'public, max-age=300, must-revalidate',
    'access-control-allow-origin': '*',
    'x-content-type-options': 'nosniff',
  },
));
app.get('/app', async (c) => {
  const [slot, starsImage, gramImage, nftImage] = await Promise.all([
    c.env.ASSETS.head(HOME_LOTTERY_SLOT_KEY).catch(() => null),
    c.env.ASSETS.head('payment-method/stars').catch(() => null),
    c.env.ASSETS.head('payment-method/gram').catch(() => null),
    c.env.ASSETS.head('payment-method/nft').catch(() => null),
  ]);
  const version = String(slot?.customMetadata?.version || slot?.uploaded?.getTime?.() || '1');
  const slotUrl = slot ? `/app/api/home-lottery-slot.png?v=${encodeURIComponent(version)}` : undefined;
  const paymentUrl = (method: 'stars' | 'gram' | 'nft', image: typeof starsImage) => {
    if (!image) return undefined;
    const imageVersion = String(image.customMetadata?.version || image.uploaded?.getTime?.() || '1');
    return `/app/api/uploaded-image/payment-method/${method}.png?v=${encodeURIComponent(imageVersion)}`;
  };
  return html(miniAppHtml(slotUrl, {
    stars: paymentUrl('stars', starsImage),
    gram: paymentUrl('gram', gramImage),
    nft: paymentUrl('nft', nftImage),
  }));
});
app.get('/assets/Crash.PNG', (c) => serveVersionedStaticAsset(c.req.raw, c.env, '/assets/Crash.PNG'));
app.get('/assets/Rocket3D.glb', (c) => serveVersionedStaticAsset(c.req.raw, c.env, '/assets/Rocket3D.glb'));
app.get('/assets/Plinko.PNG', (c) => serveVersionedStaticAsset(c.req.raw, c.env, '/assets/Plinko.PNG'));
app.get('/assets/plinko-glass/:file', (c) => serveVersionedStaticAsset(c.req.raw, c.env, `/assets/plinko-glass/${c.req.param('file')}`));
app.get('/app/health', (c) => c.json({ ok: true, page: 'game-miniapp', appUrl: `${PUBLIC_BASE_URL}/app` }));
app.get('/health', (c) => c.json({ ok: true, service: 'vexa-game', timestamp: new Date().toISOString() }));
app.get('/app/api/level', async (c) => {
  try {
    const initData = c.req.header('x-telegram-init-data') || c.req.query('initData') || '';
    const userId = await validateTelegramInitData(initData, gameBotToken(c.env));
    return c.json(await getUserLevel(c.env, userId), 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not load level' }, 401, { 'cache-control': 'no-store' });
  }
});

app.post('/app/api/level/xp', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as LevelXpBody;
    const userId = await validateTelegramInitData(body.initData, gameBotToken(c.env));
    const rawEvents = Array.isArray(body.events) ? body.events : [body];
    const result = await addUserXpBatch(c.env, userId, rawEvents.slice(0, 120));
    return c.json({ ok: true, processed: result.processed, accepted: result.accepted, profile: result.profile, leveledUp: result.leveledUp, previousLevel: result.previousLevel }, 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not sync XP' }, 400, { 'cache-control': 'no-store' });
  }
});

app.post('/app/api/usdt/deposits', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as { initData?: unknown; network?: unknown; amountUsdt?: unknown };
    const userId = await validateTelegramInitData(body.initData, gameBotToken(c.env));
    return c.json(await createUsdtDeposit(c.env, userId, body.network, body.amountUsdt), 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not create USDT deposit' }, 400, { 'cache-control': 'no-store' });
  }
});

app.get('/app/api/usdt/deposits/:id', async (c) => {
  try {
    const initData = c.req.header('x-telegram-init-data') || c.req.query('initData') || '';
    const userId = await validateTelegramInitData(initData, gameBotToken(c.env));
    const deposit = await getUsdtDeposit(c.env, userId, c.req.param('id'));
    return deposit
      ? c.json(deposit, 200, { 'cache-control': 'no-store' })
      : c.json({ error: 'USDT deposit not found' }, 404, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not load USDT deposit' }, 400, { 'cache-control': 'no-store' });
  }
});

app.post('/app/api/usdt/deposits/:id/verify', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as { initData?: unknown };
    const initData = body.initData || c.req.header('x-telegram-init-data') || '';
    const userId = await validateTelegramInitData(initData, gameBotToken(c.env));
    return c.json(await verifyUsdtDeposit(c.env, userId, c.req.param('id')), 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not verify USDT deposit' }, 400, { 'cache-control': 'no-store' });
  }
});

app.get('/app/api/credit-icon', (c) => c.redirect('/app/api/credit-icon.png'));
app.get('/app/api/credit-icon.png', async (c) => {
  const icon = await c.env.ASSETS.get('credit-icon').catch(() => null);
  if (icon) {
    return new Response(icon.body, {
      headers: {
        'content-type': icon.httpMetadata?.contentType ?? 'image/png',
        'cache-control': 'public, max-age=31536000, immutable',
      },
    });
  }
  return new Response(FALLBACK_PNG, { headers: { 'content-type': 'image/png', 'cache-control': 'no-store' } });
});

app.get('/app/api/home-lottery-slot.png', async (c) => {
  const image = await c.env.ASSETS.get(HOME_LOTTERY_SLOT_KEY).catch(() => null);
  if (!image) return new Response('', { status: 204, headers: { 'cache-control': 'no-store' } });
  return new Response(image.body, {
    headers: {
      'content-type': image.httpMetadata?.contentType ?? 'image/png',
      'cache-control': c.req.query('v') ? VERSIONED_IMAGE_CACHE_CONTROL : 'public, max-age=300, must-revalidate',
    },
  });
});

registerFriendGameRoutes(app);
registerWheelRoutes(app);
registerSlotAssetRoutes(app);

app.post('/telegram/webhook', async (c) => {
  const update = await c.req.json<TelegramUpdate>().catch(() => null);
  if (!update) return c.json({ ok: true, ignored: true });
  await handleGameBotWebhook(c.env, update);
  return c.json({ ok: true }, 200, { 'cache-control': 'no-store' });
});

app.notFound((c) => c.json({ error: 'Not found' }, 404));
app.onError((error, c) => {
  console.error(error);
  return c.json({ error: 'Internal error' }, 500);
});

function html(content: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(content, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store, no-cache, must-revalidate',
      'x-frame-options': 'ALLOWALL',
      ...extraHeaders,
    },
  });
}

export default app;
