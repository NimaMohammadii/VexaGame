import { Hono } from 'hono';
import { miniAppHtml } from './miniapp-game';
import { registerFriendGameRoutes } from './game-friend-routes';
import { registerWheelRoutes } from './wheel-routes';
import { registerSlotAssetRoutes } from './slot-assets';
import { handleGameBotWebhook } from './telegram-game-bot';
import { addUserXpBatch, getUserLevel } from './levels';
import { getUserControls, settleGameTonBalanceRound } from './user-controls';
import type { Env, TelegramUpdate } from './types';
import { gameBotToken, PUBLIC_BASE_URL, validateTelegramInitData } from './utils';

const app = new Hono<{ Bindings: Env }>();
const FALLBACK_PNG = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,120,156,99,248,255,255,63,0,5,254,2,254,167,53,129,132,0,0,0,0,73,69,78,68,174,66,96,130]);
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const HOME_LOTTERY_SLOT_KEY = 'home-lottery-slot';
const VERSIONED_IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const NANO_PER_TON = 1_000_000_000;
const DICE_MAX_BET_NANO = Math.floor(Number.MAX_SAFE_INTEGER / 50);
const SLOT_MAX_BET_NANO = Math.floor(Number.MAX_SAFE_INTEGER / 200);

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
  const [slot, starsImage, gramImage, usdtImage, nftImage] = await Promise.all([
    c.env.ASSETS.head(HOME_LOTTERY_SLOT_KEY).catch(() => null),
    c.env.ASSETS.head('payment-method/stars').catch(() => null),
    c.env.ASSETS.head('payment-method/gram').catch(() => null),
    c.env.ASSETS.head('payment-method/usdt').catch(() => null),
    c.env.ASSETS.head('payment-method/nft').catch(() => null),
  ]);
  const version = String(slot?.customMetadata?.version || slot?.uploaded?.getTime?.() || '1');
  const slotUrl = slot ? `/app/api/home-lottery-slot.png?v=${encodeURIComponent(version)}` : undefined;
  const paymentUrl = (method: 'stars' | 'gram' | 'usdt' | 'nft', image: typeof starsImage) => {
    if (!image) return undefined;
    const imageVersion = String(image.customMetadata?.version || image.uploaded?.getTime?.() || '1');
    return `/app/api/uploaded-image/payment-method/${method}.png?v=${encodeURIComponent(imageVersion)}`;
  };
  return html(miniAppHtml(slotUrl, {
    stars: paymentUrl('stars', starsImage),
    gram: paymentUrl('gram', gramImage),
    usdt: paymentUrl('usdt', usdtImage),
    nft: paymentUrl('nft', nftImage),
  }));
});
app.get('/assets/Home.PNG', (c) => serveVersionedStaticAsset(c.req.raw, c.env, '/assets/Home.PNG'));
app.get('/assets/Playhub.PNG', (c) => serveVersionedStaticAsset(c.req.raw, c.env, '/assets/Playhub.PNG'));
app.get('/assets/Mines.PNG', (c) => serveVersionedStaticAsset(c.req.raw, c.env, '/assets/Mines.PNG'));
app.get('/assets/Crash.PNG', (c) => serveVersionedStaticAsset(c.req.raw, c.env, '/assets/Crash.PNG'));
app.get('/assets/Slotbackground.PNG', (c) => serveVersionedStaticAsset(c.req.raw, c.env, '/assets/Slotbackground.PNG'));
app.get('/assets/Wheel.PNG', (c) => serveVersionedStaticAsset(c.req.raw, c.env, '/assets/Wheel.PNG'));
app.get('/assets/Dice.PNG', (c) => serveVersionedStaticAsset(c.req.raw, c.env, '/assets/Dice.PNG'));
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

app.post('/app/api/dice/roll', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const { userId, controls } = await authenticatedGameUser(c.env, body.initData, 'dice');
    const amountNano = cleanGameAmount(body.amountNano, DICE_MAX_BET_NANO, 'Dice');
    const target = cleanDiceTarget(body.target);
    const mode = String(body.mode || '') === 'over' ? 'over' : String(body.mode || '') === 'under' ? 'under' : '';
    if (!mode) throw new Error('Invalid Dice mode');
    const chance = mode === 'under' ? target : 100 - target;
    const multiplier = (100 - 1) / chance;
    const win = secureRandomUnit() * 100 < controls.winChancePercent;
    const roll = diceRollForResult(mode, target, win);
    const payoutNano = win ? Math.floor(amountNano * multiplier) : 0;
    const roundId = `dice_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const settled = await settleGameTonBalanceRound(c.env, userId, amountNano, payoutNano, {
      referenceId: roundId,
      referenceType: 'dice_round',
      metadata: { section: 'dice', mode, target, chance, multiplier, roll, result: win ? 'win' : 'lose' },
    });
    return c.json({ ok: true, roundId, win, roll, target, chance, multiplier, payoutNano, tonBalanceNano: settled.tonBalanceNano }, 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not roll Dice' }, 400, { 'cache-control': 'no-store' });
  }
});

app.post('/app/api/slot/spin', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const { userId, controls } = await authenticatedGameUser(c.env, body.initData, 'slot');
    const amountNano = cleanGameAmount(body.amountNano, SLOT_MAX_BET_NANO, 'Slot');
    const win = secureRandomUnit() * 100 < controls.winChancePercent;
    const result = serverSlotResult(win);
    const profile = serverSlotProfile(result);
    const payoutNano = profile.multiplier > 0 ? Math.floor(amountNano * profile.multiplier) : 0;
    const roundId = `slot_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const settled = await settleGameTonBalanceRound(c.env, userId, amountNano, payoutNano, {
      referenceId: roundId,
      referenceType: 'slot_round',
      metadata: { section: 'slot', result, tier: profile.tier, multiplier: profile.multiplier },
    });
    return c.json({ ok: true, roundId, result, tier: profile.tier, multiplier: profile.multiplier, payoutNano, tonBalanceNano: settled.tonBalanceNano }, 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not spin Slot' }, 400, { 'cache-control': 'no-store' });
  }
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

async function authenticatedGameUser(env: Env, initData: unknown, section: string): Promise<{ userId: string; controls: Awaited<ReturnType<typeof getUserControls>> }> {
  const userId = await validateTelegramInitData(String(initData || ''), gameBotToken(env));
  const controls = await getUserControls(env, userId);
  if (controls.banned) throw new Error('Your access to all sections is blocked.');
  if (controls.blockedSections.includes(section)) throw new Error(`${section} is blocked for this account.`);
  return { userId, controls };
}

function cleanGameAmount(value: unknown, max: number, label: string): number {
  const amount = Math.floor(Number(value));
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > max) throw new Error(`Invalid ${label} bet`);
  return amount;
}

function secureRandomUnit(): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 4_294_967_296;
}

function secureRandomInt(max: number): number {
  const limit = Math.max(1, Math.floor(max));
  return Math.floor(secureRandomUnit() * limit);
}

function secureShuffle<T>(items: T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = secureRandomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function cleanDiceTarget(value: unknown): number {
  const target = Number(value);
  if (!Number.isFinite(target) || target < 2 || target > 98) throw new Error('Invalid Dice target');
  return Math.round(target * 100) / 100;
}

function diceRollForResult(mode: 'under' | 'over', target: number, win: boolean): number {
  const lowWin = mode === 'under' ? win : !win;
  const raw = lowWin
    ? secureRandomUnit() * Math.max(0.01, target - 0.01)
    : target + 0.01 + secureRandomUnit() * Math.max(0.01, 99.99 - target);
  return Math.max(0.01, Math.min(99.99, Math.round(raw * 100) / 100));
}

function serverSlotResult(win: boolean): number[] {
  if (!win) return secureShuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 3);
  const roll = 6500 + secureRandomInt(3500);
  if (roll < 9071) {
    const fruit = secureRandomInt(5);
    let third = secureRandomInt(7);
    if (third >= fruit) third += 1;
    return secureShuffle([fruit, fruit, third]);
  }
  if (roll < 9909) {
    const fruit = secureRandomInt(5);
    return [fruit, fruit, fruit];
  }
  if (roll < 9989) return [5, 5, 5];
  if (roll < 9999) return [6, 6, 6];
  return [7, 7, 7];
}

function serverSlotProfile(result: number[]): { tier: string; multiplier: number } {
  const counts = new Map<number, number>();
  for (const value of result) counts.set(value, (counts.get(value) || 0) + 1);
  let symbol = -1;
  let count = 0;
  for (const [key, value] of counts) if (value > count) { symbol = key; count = value; }
  if (count === 3) {
    if (symbol >= 0 && symbol <= 4) return { tier: 'triple-fruit', multiplier: 5 };
    if (symbol === 5) return { tier: 'triple-diamond', multiplier: 15 };
    if (symbol === 6) return { tier: 'triple-gold', multiplier: 30 };
    if (symbol === 7) return { tier: 'triple-seven', multiplier: 200 };
  }
  if (count === 2 && symbol >= 0 && symbol <= 4) return { tier: 'pair-fruit', multiplier: 0.8 };
  return { tier: 'standard', multiplier: 0 };
}

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
