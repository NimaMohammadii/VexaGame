import type { Context, Hono } from 'hono';
import type { Env } from './types';
import { gameBotToken, validateTelegramInitData } from './utils';
import { adjustUserTonBalance, debitUserTonBalanceIfEnough, getUserControls } from './user-controls';
import { dailyWheelWinMultiplier } from './daily-wheel-rewards';

type App = Hono<{ Bindings: Env }>;
type Difficulty = 'easy' | 'medium' | 'hard';
type Status = 'pending' | 'active' | 'payout_pending' | 'cashed' | 'lost';
type Round = {
  id: string; user_id: string; amount_nano: number; difficulty: Difficulty;
  step: number; status: Status; multiplier: number; payout_nano: number;
  seed: string; seed_hash: string; created_at: string;
};

const LANES = 8;
const MAX_BET = 20_000_000_000;
const CONFIG: Record<Difficulty, number> = { easy: .93, medium: .84, hard: .72 };
const HEADERS = { 'cache-control': 'no-store' };
let schemaReady: Promise<void> | null = null;

function publicRound(round: Round) {
  return {
    id: round.id, amountNano: round.amount_nano, difficulty: round.difficulty,
    step: round.step, lanes: LANES, status: round.status, multiplier: round.multiplier,
    nextMultiplier: round.status === 'active' ? multiplier(round.difficulty, round.step + 1) : null,
    payoutNano: round.payout_nano, seedHash: round.seed_hash,
    seed: round.status === 'lost' || round.status === 'cashed' ? round.seed : null,
  };
}

function multiplier(difficulty: Difficulty, step: number): number {
  return Math.floor((.96 / Math.pow(CONFIG[difficulty], step)) * 100) / 100;
}

async function digest(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function newSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function safeLane(round: Round, nextStep: number): Promise<boolean> {
  const hash = await digest(`${round.seed}:${nextStep}`);
  return parseInt(hash.slice(0, 8), 16) / 0x100000000 < CONFIG[round.difficulty];
}

async function authorize(env: Env, data: unknown): Promise<string> {
  const id = await validateTelegramInitData(String(data || ''), gameBotToken(env));
  const controls = await getUserControls(env, id);
  if (controls.banned || controls.blockedSections.includes('hilo')) throw new Error('Chicken Cross is blocked for this account');
  return id;
}

async function ensureTable(env: Env): Promise<void> {
  if (!schemaReady) schemaReady = (async () => {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS chicken_cross_v2_rounds (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, amount_nano INTEGER NOT NULL,
    difficulty TEXT NOT NULL, step INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL, multiplier REAL NOT NULL DEFAULT 1,
    payout_nano INTEGER NOT NULL DEFAULT 0, seed TEXT NOT NULL, seed_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await env.DB.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS chicken_cross_v2_one_open
      ON chicken_cross_v2_rounds(user_id) WHERE status IN ('pending','active','payout_pending')`).run();
  })().catch((error) => { schemaReady = null; throw error; });
  await schemaReady;
}

async function getRound(env: Env, userId: string, id: string): Promise<Round | null> {
  return env.DB.prepare('SELECT * FROM chicken_cross_v2_rounds WHERE id=? AND user_id=?')
    .bind(id, userId).first<Round>();
}

async function openRound(env: Env, userId: string): Promise<Round | null> {
  return env.DB.prepare(`SELECT * FROM chicken_cross_v2_rounds WHERE user_id=?
    AND status IN ('pending','active','payout_pending') LIMIT 1`).bind(userId).first<Round>();
}

async function ready(env: Env, round: Round): Promise<Round> {
  if (round.status === 'pending') {
    await debitUserTonBalanceIfEnough(env, round.user_id, round.amount_nano, {
      kind: 'game', title: 'Chicken Cross bet', referenceType: 'chicken_cross_bet',
      referenceId: round.id, metadata: { section: 'hilo', difficulty: round.difficulty },
    });
    await env.DB.prepare("UPDATE chicken_cross_v2_rounds SET status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'")
      .bind(round.id).run();
  }
  if (round.status === 'payout_pending') {
    // Store the bonus-adjusted amount in the round before crediting: retries must use the same amount.
    await adjustUserTonBalance(env, round.user_id, round.payout_nano, {
      kind: 'game', title: 'Chicken Cross settlement', referenceType: 'chicken_cross_payout',
      referenceId: round.id, metadata: { section: 'hilo', result: 'settled', multiplier: round.multiplier },
    });
    await env.DB.prepare("UPDATE chicken_cross_v2_rounds SET status='cashed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='payout_pending'")
      .bind(round.id).run();
  }
  return (await getRound(env, round.user_id, round.id))!;
}

async function response(env: Env, round: Round) {
  const current = await ready(env, round);
  const controls = await getUserControls(env, round.user_id);
  return { ok: true, round: publicRound(current), tonBalanceNano: controls.tonBalanceNano };
}

export function registerChickenCrossRoutes(app: App): void {
  app.get('/app/api/chicken-cross/state', async (c) => {
    try {
      const userId = await authorize(c.env, c.req.header('x-telegram-init-data'));
      await ensureTable(c.env);
      const round = await openRound(c.env, userId);
      if (!round) return c.json({ ok: true, round: null }, 200, HEADERS);
      return c.json(await response(c.env, round), 200, HEADERS);
    } catch (error) { return failure(c, error); }
  });

  app.post('/app/api/chicken-cross/start', async (c) => {
    try {
      const body = await c.req.json() as Record<string, unknown>;
      const userId = await authorize(c.env, body.initData);
      await ensureTable(c.env);
      let round = await openRound(c.env, userId);
      if (round) return c.json(await response(c.env, round), 200, HEADERS);
      const amountNano = Number(body.amountNano);
      const difficulty = String(body.difficulty) as Difficulty;
      if (!Number.isSafeInteger(amountNano) || amountNano < 1_000_000 || amountNano > MAX_BET) throw new Error('Bet must be between 0.001 and 20 GRAM');
      if (!Object.prototype.hasOwnProperty.call(CONFIG, difficulty)) throw new Error('Choose a difficulty');
      const id = `cc_${crypto.randomUUID().replace(/-/g, '')}`;
      const seed = newSeed();
      const hash = await digest(seed);
      const inserted = await c.env.DB.prepare(`INSERT OR IGNORE INTO chicken_cross_v2_rounds
        (id,user_id,amount_nano,difficulty,status,seed,seed_hash)
        VALUES (?,?,?,?,'pending',?,?)`).bind(id, userId, amountNano, difficulty, seed, hash).run();
      round = Number(inserted.meta.changes || 0) ? await getRound(c.env, userId, id) : await openRound(c.env, userId);
      if (!round) throw new Error('Could not create round');
      try { return c.json(await response(c.env, round), 200, HEADERS); }
      catch (error) {
        if (error instanceof Error && error.message === 'Insufficient balance') {
          // A pending round has not charged the user if its referenced debit failed.
          await c.env.DB.prepare("DELETE FROM chicken_cross_v2_rounds WHERE id=? AND status='pending'").bind(round.id).run();
        }
        throw error;
      }
    } catch (error) { return failure(c, error); }
  });

  app.post('/app/api/chicken-cross/step', async (c) => {
    try {
      const body = await c.req.json() as Record<string, unknown>;
      const userId = await authorize(c.env, body.initData);
      await ensureTable(c.env);
      const id = String(body.roundId || '').slice(0, 48);
      let round = await getRound(c.env, userId, id);
      if (!round) throw new Error('Round not found');
      round = await ready(c.env, round);
      if (round.status !== 'active') return c.json(await response(c.env, round), 200, HEADERS);
      const step = round.step + 1;
      const survived = await safeLane(round, step);
      const finished = survived && step === LANES;
      const payout = finished ? Math.floor(round.amount_nano * multiplier(round.difficulty, step) * await dailyWheelWinMultiplier(c.env, userId)) : 0;
      const result = await c.env.DB.prepare(`UPDATE chicken_cross_v2_rounds SET
        step=?,status=?,multiplier=?,payout_nano=?,updated_at=CURRENT_TIMESTAMP
        WHERE id=? AND user_id=? AND status='active' AND step=?`)
        .bind(step, survived ? (finished ? 'payout_pending' : 'active') : 'lost',
          survived ? multiplier(round.difficulty, step) : round.multiplier, payout, id, userId, round.step).run();
      const current = (await getRound(c.env, userId, id))!;
      return c.json({ ...(await response(c.env, current)), event: Number(result.meta.changes || 0) ?
        (survived ? finished ? 'finish' : 'safe' : 'hit') : 'sync' }, 200, HEADERS);
    } catch (error) { return failure(c, error); }
  });

  app.post('/app/api/chicken-cross/cashout', async (c) => {
    try {
      const body = await c.req.json() as Record<string, unknown>;
      const userId = await authorize(c.env, body.initData);
      await ensureTable(c.env);
      const id = String(body.roundId || '').slice(0, 48);
      let round = await getRound(c.env, userId, id);
      if (!round) throw new Error('Round not found');
      round = await ready(c.env, round);
      if (round.status === 'active' && round.step > 0) {
        const payout = Math.floor(round.amount_nano * round.multiplier * await dailyWheelWinMultiplier(c.env, userId));
        await c.env.DB.prepare(`UPDATE chicken_cross_v2_rounds SET status='payout_pending',payout_nano=?,updated_at=CURRENT_TIMESTAMP
          WHERE id=? AND user_id=? AND status='active' AND step=?`)
          .bind(payout, id, userId, round.step).run();
      } else if (round.status === 'active') throw new Error('Cross one lane before cashing out');
      const current = (await getRound(c.env, userId, id))!;
      return c.json(await response(c.env, current), 200, HEADERS);
    } catch (error) { return failure(c, error); }
  });
}

function failure(c: Context<{ Bindings: Env }>, error: unknown) {
  return c.json({ error: error instanceof Error ? error.message : 'Chicken Cross request failed' }, 400, HEADERS);
}
