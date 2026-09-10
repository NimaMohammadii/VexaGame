import { Hono } from 'hono';
import { miniAppHtml } from './miniapp-game';
import { registerFriendGameRoutes } from './game-friend-routes';
import { registerWheelRoutes } from './wheel-routes';
import { registerSlotAssetRoutes } from './slot-assets';
import { handleGameBotWebhook } from './telegram-game-bot';
import { addUserXpBatch, getUserLevel } from './levels';
import { adjustUserTonBalance, debitUserTonBalanceIfEnough, getUserControls, settleGameTonBalanceRound } from './user-controls';
import type { Env, TelegramUpdate } from './types';
import { gameBotToken, PUBLIC_BASE_URL, validateTelegramInitData } from './utils';

const app = new Hono<{ Bindings: Env }>();
const FALLBACK_PNG = new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,8,6,0,0,0,31,21,196,137,0,0,0,13,73,68,65,84,120,156,99,248,255,255,63,0,5,254,2,254,167,53,129,132,0,0,0,0,73,69,78,68,174,66,96,130]);
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const HOME_LOTTERY_SLOT_KEY = 'home-lottery-slot';
const VERSIONED_IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const DICE_MAX_BET_NANO = Math.floor(Number.MAX_SAFE_INTEGER / 50);
const SLOT_MAX_BET_NANO = Math.floor(Number.MAX_SAFE_INTEGER / 200);
const PUMP_MAX_BET_NANO = Math.floor(Number.MAX_SAFE_INTEGER / 24);
let slotRoundsReady: Promise<void> | null = null;

type SlotRoundRow = {
  round_id: string;
  user_id: string;
  result_json: string;
  tier: string;
  multiplier: number;
  payout_nano: number;
  ton_balance_nano: number;
};

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
type PumpRoundRow = {
  round_id: string;
  user_id: string;
  amount_nano: number;
  burst_at: number;
  multiplier: number;
  pumps: number;
  status: string;
  payout_nano: number;
};

let pumpTablesReady: Promise<void> | null = null;

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
    const { userId } = await authenticatedGameUser(c.env, body.initData, 'dice');
    const amountNano = cleanGameAmount(body.amountNano, DICE_MAX_BET_NANO, 'Dice');
    const target = cleanDiceTarget(body.target);
    const mode = String(body.mode || '') === 'over' ? 'over' : String(body.mode || '') === 'under' ? 'under' : '';
    if (!mode) throw new Error('Invalid Dice mode');
    const chance = mode === 'under' ? target : 100 - target;
    const multiplier = (100 - 1) / chance;
    const rawRoll = secureRandomUnit() * 100;
    const win = mode === 'under' ? rawRoll < target : rawRoll > target;
    const roll = Math.max(0.01, Math.min(99.99, Math.round(rawRoll * 100) / 100));
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
    const { userId } = await authenticatedGameUser(c.env, body.initData, 'slot');
    const roundId = cleanSlotRoundId(body.roundId);
    await ensureSlotRoundsTable(c.env);
    const previous = await readSlotRound(c.env, userId, roundId);
    if (body.recover === true) {
      if (!previous) throw new Error('Slot result is not ready yet');
      return c.json({ ok: true, recovered: true, ...publicSlotRound(previous) }, 200, { 'cache-control': 'no-store' });
    }
    if (previous) return c.json({ ok: true, recovered: true, ...publicSlotRound(previous) }, 200, { 'cache-control': 'no-store' });
    const amountNano = cleanGameAmount(body.amountNano, SLOT_MAX_BET_NANO, 'Slot');
    const result = serverSlotResult();
    const profile = serverSlotProfile(result);
    const payoutNano = profile.multiplier > 0 ? Math.floor(amountNano * profile.multiplier) : 0;
    const settled = await settleGameTonBalanceRound(c.env, userId, amountNano, payoutNano, {
      referenceId: roundId,
      referenceType: 'slot_round',
      metadata: { section: 'slot', result, tier: profile.tier, multiplier: profile.multiplier },
    });
    const saved = await saveSlotRound(c.env, { roundId, userId, result, tier: profile.tier, multiplier: profile.multiplier, payoutNano, tonBalanceNano: settled.tonBalanceNano });
    return c.json({ ok: true, ...publicSlotRound(saved) }, 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not spin Slot' }, 400, { 'cache-control': 'no-store' });
  }
});

app.post('/app/api/pump/start', async (c) => {
  let userId = '';
  let roundId = '';
  let amountNano = 0;
  let debited = false;
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const { userId: authenticatedUserId } = await authenticatedGameUser(c.env, body.initData, 'coinflip');
    userId = authenticatedUserId;
    amountNano = cleanGameAmount(body.amountNano, PUMP_MAX_BET_NANO, 'Pump');
    await ensurePumpTables(c.env);
    const active = await readActivePumpRound(c.env, userId);
    if (active) {
      const controls = await getUserControls(c.env, userId);
      return c.json({ ok: true, restored: true, ...publicPumpRound(active), tonBalanceNano: controls.tonBalanceNano }, 200, { 'cache-control': 'no-store' });
    }
    roundId = `pump_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const burstAt = serverPumpBurstPoint();
    const afterDebit = await debitUserTonBalanceIfEnough(c.env, userId, amountNano, {
      kind: 'game',
      title: 'Pump bet',
      referenceId: `${roundId}:bet`,
      referenceType: 'pump_round',
      metadata: { section: 'coinflip', roundId },
    });
    debited = true;
    const inserted = await c.env.DB.prepare(`INSERT INTO pump_rounds
      (round_id,user_id,amount_nano,burst_at,multiplier,pumps,status,payout_nano,created_at,updated_at)
      VALUES (?,?,?, ?,1,0,'active',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
      .bind(roundId, userId, amountNano, burstAt).run();
    if (Number(inserted.meta?.changes || 0) <= 0) throw new Error('Could not start Pump round');
    const row = await readPumpRound(c.env, userId, roundId);
    if (!row) throw new Error('Could not start Pump round');
    return c.json({ ok: true, restored: false, ...publicPumpRound(row), tonBalanceNano: afterDebit.tonBalanceNano }, 200, { 'cache-control': 'no-store' });
  } catch (error) {
    if (debited && userId && roundId && amountNano > 0) {
      await adjustUserTonBalance(c.env, userId, amountNano, {
        kind: 'adjustment',
        title: 'Pump start refund',
        referenceId: `${roundId}:refund`,
        referenceType: 'pump_round',
        metadata: { section: 'coinflip', roundId, reason: 'start-failed' },
      }).catch(() => undefined);
    }
    return c.json({ error: error instanceof Error ? error.message : 'Could not start Pump round' }, 400, { 'cache-control': 'no-store' });
  }
});

app.post('/app/api/pump/pump', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const { userId } = await authenticatedGameUser(c.env, body.initData, 'coinflip');
    const roundId = cleanRoundId(body.roundId, 'Pump round is not ready');
    await ensurePumpTables(c.env);
    const current = await readPumpRound(c.env, userId, roundId);
    if (!current) throw new Error('Pump round not found');
    if (current.status !== 'active') {
      const controls = await getUserControls(c.env, userId);
      return c.json({ ok: true, ...publicPumpRound(current), tonBalanceNano: controls.tonBalanceNano }, 200, { 'cache-control': 'no-store' });
    }
    const nextPumps = Math.max(1, Math.floor(Number(current.pumps) || 0) + 1);
    const currentMultiplier = Math.max(1, Number(current.multiplier) || 1);
    const nextMultiplier = Math.round((currentMultiplier + 0.09 + currentMultiplier * 0.085 + nextPumps * 0.012) * 100) / 100;
    const nextStatus = nextMultiplier >= Number(current.burst_at) ? 'popped' : 'active';
    await c.env.DB.prepare(`UPDATE pump_rounds SET pumps=?,multiplier=?,status=?,updated_at=CURRENT_TIMESTAMP
      WHERE round_id=? AND user_id=? AND status='active' AND pumps=?`)
      .bind(nextPumps, nextMultiplier, nextStatus, roundId, userId, current.pumps).run();
    const row = await readPumpRound(c.env, userId, roundId);
    if (!row) throw new Error('Pump round not found');
    const controls = await getUserControls(c.env, userId);
    return c.json({ ok: true, ...publicPumpRound(row), tonBalanceNano: controls.tonBalanceNano }, 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not pump' }, 400, { 'cache-control': 'no-store' });
  }
});

app.post('/app/api/pump/cashout', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const { userId } = await authenticatedGameUser(c.env, body.initData, 'coinflip');
    const roundId = cleanRoundId(body.roundId, 'Pump round is not ready');
    await ensurePumpTables(c.env);
    let row = await readPumpRound(c.env, userId, roundId);
    if (!row) throw new Error('Pump round not found');
    if (row.status === 'popped') throw new Error('This Pump round has already popped');
    if (row.status === 'active') {
      if (Number(row.pumps || 0) < 1) throw new Error('Pump at least once before cashing out');
      const payoutNano = Math.max(0, Math.floor(Number(row.amount_nano || 0) * Number(row.multiplier || 1)));
      await c.env.DB.prepare(`UPDATE pump_rounds SET status='cashout_pending',payout_nano=?,updated_at=CURRENT_TIMESTAMP
        WHERE round_id=? AND user_id=? AND status='active'`).bind(payoutNano, roundId, userId).run();
      row = await readPumpRound(c.env, userId, roundId);
      if (!row) throw new Error('Pump round not found');
    }
    if (row.status !== 'cashout_pending' && row.status !== 'cashed') throw new Error('Pump round is not cashable');
    const payoutNano = Math.max(0, Math.floor(Number(row.payout_nano || 0)));
    let controls = await getUserControls(c.env, userId);
    if (row.status === 'cashout_pending') {
      controls = await adjustUserTonBalance(c.env, userId, payoutNano, {
        kind: 'game',
        title: 'Pump reward',
        referenceId: `${roundId}:cashout`,
        referenceType: 'pump_round',
        metadata: { section: 'coinflip', roundId, multiplier: Number(row.multiplier || 1), pumps: Number(row.pumps || 0) },
      });
      await c.env.DB.prepare(`UPDATE pump_rounds SET status='cashed',updated_at=CURRENT_TIMESTAMP
        WHERE round_id=? AND user_id=? AND status='cashout_pending'`).bind(roundId, userId).run();
      row = await readPumpRound(c.env, userId, roundId) || row;
    }
    return c.json({ ok: true, ...publicPumpRound(row), payoutNano, tonBalanceNano: controls.tonBalanceNano }, 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not cash out Pump round' }, 400, { 'cache-control': 'no-store' });
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

function serverSlotResult(): number[] {
  const roll = secureRandomInt(10_000);
  if (roll < 6500) return secureShuffle([0, 1, 2, 3, 4, 5, 6, 7]).slice(0, 3);
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

function cleanSlotRoundId(value: unknown): string {
  const roundId = String(value || '').trim();
  if (/^slot_[a-zA-Z0-9_-]{16,64}$/.test(roundId)) return roundId;
  return `slot_${crypto.randomUUID().replace(/-/g, '')}`;
}

async function ensureSlotRoundsTable(env: Env): Promise<void> {
  if (!slotRoundsReady) slotRoundsReady = env.DB.prepare(`CREATE TABLE IF NOT EXISTS slot_rounds (
    round_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    result_json TEXT NOT NULL,
    tier TEXT NOT NULL,
    multiplier REAL NOT NULL,
    payout_nano INTEGER NOT NULL,
    ton_balance_nano INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run().then(() => undefined);
  await slotRoundsReady;
}

async function readSlotRound(env: Env, userId: string, roundId: string): Promise<SlotRoundRow | null> {
  return env.DB.prepare(`SELECT round_id, user_id, result_json, tier, multiplier, payout_nano, ton_balance_nano
    FROM slot_rounds WHERE round_id = ? AND user_id = ?`).bind(roundId, userId).first<SlotRoundRow>();
}

async function saveSlotRound(env: Env, round: { roundId: string; userId: string; result: number[]; tier: string; multiplier: number; payoutNano: number; tonBalanceNano: number }): Promise<SlotRoundRow> {
  await env.DB.prepare(`INSERT INTO slot_rounds (round_id, user_id, result_json, tier, multiplier, payout_nano, ton_balance_nano)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .bind(round.roundId, round.userId, JSON.stringify(round.result), round.tier, round.multiplier, round.payoutNano, round.tonBalanceNano).run();
  return { round_id: round.roundId, user_id: round.userId, result_json: JSON.stringify(round.result), tier: round.tier, multiplier: round.multiplier, payout_nano: round.payoutNano, ton_balance_nano: round.tonBalanceNano };
}

function publicSlotRound(round: SlotRoundRow): { roundId: string; result: number[]; tier: string; multiplier: number; payoutNano: number; tonBalanceNano: number } {
  const parsed = JSON.parse(round.result_json);
  return { roundId: round.round_id, result: Array.isArray(parsed) ? parsed : [], tier: round.tier, multiplier: round.multiplier, payoutNano: round.payout_nano, tonBalanceNano: round.ton_balance_nano };
}

function serverPumpBurstPoint(): number {
  const roll = secureRandomUnit();
  let point = 1.18 + Math.pow(roll, 1.9) * 6.2;
  if (secureRandomUnit() < 0.055) point += 4 + secureRandomUnit() * 8;
  return Math.min(24, Math.round(point * 100) / 100);
}

async function ensurePumpTables(env: Env): Promise<void> {
  if (!pumpTablesReady) {
    pumpTablesReady = (async () => {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS pump_rounds (
        round_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount_nano INTEGER NOT NULL,
        burst_at REAL NOT NULL,
        multiplier REAL NOT NULL DEFAULT 1,
        pumps INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active',
        payout_nano INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`).run();
      await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_pump_rounds_active_user ON pump_rounds(user_id) WHERE status='active'").run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_pump_rounds_user_created ON pump_rounds(user_id,created_at)').run();
    })().catch((error) => {
      pumpTablesReady = null;
      throw error;
    });
  }
  await pumpTablesReady;
}

async function readPumpRound(env: Env, userId: string, roundId: string): Promise<PumpRoundRow | null> {
  return env.DB.prepare('SELECT * FROM pump_rounds WHERE user_id=? AND round_id=? LIMIT 1').bind(userId, roundId).first<PumpRoundRow>();
}

async function readActivePumpRound(env: Env, userId: string): Promise<PumpRoundRow | null> {
  return env.DB.prepare("SELECT * FROM pump_rounds WHERE user_id=? AND status='active' ORDER BY datetime(created_at) DESC LIMIT 1").bind(userId).first<PumpRoundRow>();
}

function publicPumpRound(row: PumpRoundRow): { roundId: string; amountNano: number; multiplier: number; pumps: number; status: string; popped: boolean; payoutNano: number } {
  return {
    roundId: String(row.round_id),
    amountNano: Math.max(1, Math.floor(Number(row.amount_nano) || 1)),
    multiplier: Math.max(1, Number(row.multiplier) || 1),
    pumps: Math.max(0, Math.floor(Number(row.pumps) || 0)),
    status: String(row.status || ''),
    popped: String(row.status || '') === 'popped',
    payoutNano: Math.max(0, Math.floor(Number(row.payout_nano) || 0)),
  };
}

function cleanRoundId(value: unknown, message: string): string {
  const roundId = String(value || '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 80);
  if (!roundId) throw new Error(message);
  return roundId;
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
