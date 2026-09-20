import type { Env } from './types';
import { ensureTonTransactionsTable } from './ton-transactions';

export type DailyWheelPrizeKey = 'gram_4' | 'double_win' | 'cashback_30' | 'gram_05' | 'lottery_5' | 'empty' | 'deposit_bonus_60' | 'gram_01';

export type DailyWheelSpin = {
  id: string;
  userId: string;
  prizeKey: DailyWheelPrizeKey;
  prizeLabel: string;
  prizeIndex: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
  nextSpinAt: string;
};

export type DailyWheelAdminSpin = DailyWheelSpin & { firstName: string; username: string };

const DAY_MS = 86_400_000;
const PRIZES: ReadonlyArray<{ key: DailyWheelPrizeKey; label: string; weightBps: number }> = [
  { key: 'gram_4', label: '4 GRAM', weightBps: 0 },
  { key: 'double_win', label: '2x WIN · 24H', weightBps: 0 },
  { key: 'cashback_30', label: '30% Cashback · 24H', weightBps: 525 },
  { key: 'gram_05', label: '0.5 GRAM', weightBps: 18 },
  { key: 'lottery_5', label: '5 Lottery Tickets', weightBps: 175 },
  { key: 'empty', label: 'Empty', weightBps: 5254 },
  { key: 'deposit_bonus_60', label: '60% Deposit Bonus', weightBps: 876 },
  { key: 'gram_01', label: '0.1 GRAM', weightBps: 3152 },
];

let schemaReady: Promise<void> | null = null;

export async function ensureDailyWheelSchema(env: Env): Promise<void> {
  if (!schemaReady) {
    schemaReady = ensureDailyWheelSchemaNow(env).catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

async function ensureDailyWheelSchemaNow(env: Env): Promise<void> {
  await ensureTonTransactionsTable(env);
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS daily_wheel_user_state (
      user_id TEXT PRIMARY KEY,
      last_spin_id TEXT,
      next_spin_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS daily_wheel_spins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      prize_key TEXT NOT NULL,
      prize_label TEXT NOT NULL,
      prize_index INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      next_spin_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT
    )`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_daily_wheel_spins_user_created ON daily_wheel_spins(user_id, created_at DESC)'),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS daily_wheel_effects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      rate_bps INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      starts_at TEXT NOT NULL,
      expires_at TEXT,
      source_spin_id TEXT NOT NULL,
      consumed_at TEXT,
      reference_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_spin_id, kind)
    )`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_daily_wheel_effects_user_status ON daily_wheel_effects(user_id, status, kind)'),
  ]);
  await env.DB.prepare('ALTER TABLE app_users ADD COLUMN bonus_balance_nano INTEGER NOT NULL DEFAULT 0').run().catch(() => undefined);
}

export async function createDailyWheelSpin(env: Env, userId: string, admin: boolean): Promise<DailyWheelSpin> {
  await ensureDailyWheelSchema(env);
  const now = new Date();
  const next = new Date(now.getTime() + DAY_MS).toISOString();
  const id = 'dws_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  const prizeIndex = securePrizeIndex();
  const prize = PRIZES[prizeIndex];

  await env.DB.prepare(`INSERT INTO daily_wheel_user_state(user_id,last_spin_id,next_spin_at,updated_at)
    VALUES (?,NULL,'1970-01-01T00:00:00.000Z',CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO NOTHING`).bind(userId).run();

  if (!admin) {
    const reserved = await env.DB.prepare(`UPDATE daily_wheel_user_state
      SET last_spin_id=?,next_spin_at=?,updated_at=CURRENT_TIMESTAMP
      WHERE user_id=? AND datetime(next_spin_at)<=datetime('now')
      RETURNING user_id`).bind(id, next, userId).first<{ user_id: string }>();
    if (!reserved) {
      const state = await getDailyWheelState(env, userId, false);
      const error = new Error('Daily wheel is on cooldown') as Error & { nextSpinAt?: string };
      error.nextSpinAt = state.nextSpinAt;
      throw error;
    }
  }

  try {
    await env.DB.prepare(`INSERT INTO daily_wheel_spins
      (id,user_id,prize_key,prize_label,prize_index,status,next_spin_at,created_at)
      VALUES (?,?,?,?,?,'pending',?,?)`)
      .bind(id, userId, prize.key, prize.label, prizeIndex, next, now.toISOString()).run();
  } catch (error) {
    if (!admin) {
      await env.DB.prepare(`UPDATE daily_wheel_user_state SET last_spin_id=NULL,next_spin_at='1970-01-01T00:00:00.000Z',updated_at=CURRENT_TIMESTAMP
        WHERE user_id=? AND last_spin_id=?`).bind(userId, id).run().catch(() => undefined);
    }
    throw error;
  }
  return { id, userId, prizeKey: prize.key, prizeLabel: prize.label, prizeIndex, status: 'pending', createdAt: now.toISOString(), completedAt: null, nextSpinAt: next };
}

export async function getDailyWheelState(env: Env, userId: string, admin: boolean): Promise<{ nextSpinAt: string; remainingMs: number; lastSpin: DailyWheelSpin | null; pending: DailyWheelSpin[] }> {
  await ensureDailyWheelSchema(env);
  const [state, last, pendingRows] = await Promise.all([
    env.DB.prepare('SELECT next_spin_at FROM daily_wheel_user_state WHERE user_id=?').bind(userId).first<{ next_spin_at: string }>(),
    env.DB.prepare('SELECT * FROM daily_wheel_spins WHERE user_id=? ORDER BY datetime(created_at) DESC LIMIT 1').bind(userId).first<Record<string, unknown>>(),
    env.DB.prepare("SELECT * FROM daily_wheel_spins WHERE user_id=? AND status='pending' ORDER BY datetime(created_at) ASC LIMIT 5").bind(userId).all<Record<string, unknown>>(),
  ]);
  const nextSpinAt = admin ? new Date(0).toISOString() : String(state?.next_spin_at || new Date(0).toISOString());
  return {
    nextSpinAt,
    remainingMs: admin ? 0 : Math.max(0, Date.parse(nextSpinAt) - Date.now()),
    lastSpin: last ? publicSpin(last) : null,
    pending: (pendingRows.results || []).map(publicSpin),
  };
}

export async function completeDailyWheelSpin(env: Env, spinId: string): Promise<void> {
  await env.DB.prepare("UPDATE daily_wheel_spins SET status='completed',completed_at=CURRENT_TIMESTAMP WHERE id=? AND status='pending'").bind(spinId).run();
}

export async function grantDailyWheelEffect(env: Env, spin: DailyWheelSpin): Promise<void> {
  const effect = spin.prizeKey === 'cashback_30'
    ? { kind: 'cashback', rate: 3000, expiresAt: new Date(Date.parse(spin.createdAt) + DAY_MS).toISOString() }
    : spin.prizeKey === 'deposit_bonus_60'
      ? { kind: 'deposit_bonus', rate: 6000, expiresAt: null }
      : spin.prizeKey === 'double_win'
        ? { kind: 'double_win', rate: 10000, expiresAt: new Date(Date.parse(spin.createdAt) + DAY_MS).toISOString() }
        : null;
  if (!effect) return;
  await ensureDailyWheelSchema(env);
  await env.DB.prepare(`INSERT OR IGNORE INTO daily_wheel_effects
    (id,user_id,kind,rate_bps,status,starts_at,expires_at,source_spin_id,created_at)
    VALUES (?,?,?,?,'active',?,?,?,CURRENT_TIMESTAMP)`)
    .bind('dwe_' + spin.id, spin.userId, effect.kind, effect.rate, spin.createdAt, effect.expiresAt, spin.id).run();
}

export async function settleDeferredDailyWheelRewards(env: Env, userId: string): Promise<void> {
  await ensureDailyWheelSchema(env);
  const rows = await env.DB.prepare("SELECT * FROM daily_wheel_effects WHERE user_id=? AND status='active' AND kind IN ('cashback','deposit_bonus','double_win') ORDER BY datetime(created_at) ASC")
    .bind(userId).all<Record<string, unknown>>();
  for (const row of rows.results || []) {
    const kind = String(row.kind || '');
    if (kind === 'deposit_bonus') await settleDepositBonus(env, userId, row);
    if (kind === 'cashback' && Date.parse(String(row.expires_at || '')) <= Date.now()) await settleCashback(env, userId, row);
    if (kind === 'double_win' && Date.parse(String(row.expires_at || '')) <= Date.now()) {
      await env.DB.prepare("UPDATE daily_wheel_effects SET status='expired',consumed_at=CURRENT_TIMESTAMP WHERE id=? AND status='active'")
        .bind(String(row.id || '')).run();
    }
  }
}

export async function dailyWheelWinMultiplier(env: Env, userId: string): Promise<number> {
  await ensureDailyWheelSchema(env);
  const row = await env.DB.prepare(`SELECT rate_bps FROM daily_wheel_effects
    WHERE user_id=? AND kind='double_win' AND status='active' AND datetime(expires_at)>datetime('now')
    ORDER BY datetime(created_at) DESC LIMIT 1`).bind(userId).first<{ rate_bps: number }>();
  return row ? 1 + Math.max(0, Number(row.rate_bps || 0)) / 10_000 : 1;
}

export async function listDailyWheelAdminSpins(env: Env, pageInput = 0, pageSizeInput = 8): Promise<{ spins: DailyWheelAdminSpin[]; total: number; page: number; pageSize: number }> {
  await ensureDailyWheelSchema(env);
  const pageSize = Math.max(1, Math.min(20, Math.floor(Number(pageSizeInput) || 8)));
  const totalRow = await env.DB.prepare('SELECT COUNT(*) AS count FROM daily_wheel_spins').first<{ count: number }>();
  const total = Math.max(0, Number(totalRow?.count || 0));
  const lastPage = Math.max(0, Math.ceil(total / pageSize) - 1);
  const page = Math.max(0, Math.min(lastPage, Math.floor(Number(pageInput) || 0)));
  const rows = await env.DB.prepare(`SELECT s.*,COALESCE(u.first_name,'') AS first_name,COALESCE(u.username,'') AS username
    FROM daily_wheel_spins s LEFT JOIN app_users u ON u.telegram_user_id=s.user_id
    ORDER BY datetime(s.created_at) DESC LIMIT ? OFFSET ?`).bind(pageSize, page * pageSize).all<Record<string, unknown>>();
  return {
    spins: (rows.results || []).map((row) => ({ ...publicSpin(row), firstName: String(row.first_name || ''), username: String(row.username || '') })),
    total,
    page,
    pageSize,
  };
}

async function settleDepositBonus(env: Env, userId: string, effect: Record<string, unknown>): Promise<void> {
  const deposit = await env.DB.prepare(`SELECT reference_id,amount_nano,created_at FROM ton_transactions
    WHERE user_id=? AND kind='deposit' AND status='completed' AND amount_nano>0 AND datetime(created_at)>=datetime(?)
      AND NOT EXISTS (SELECT 1 FROM daily_wheel_effects used
        WHERE used.user_id=ton_transactions.user_id AND used.kind='deposit_bonus' AND used.status='consumed'
          AND used.reference_id=ton_transactions.reference_id)
    ORDER BY datetime(created_at) ASC LIMIT 1`).bind(userId, String(effect.starts_at || '')).first<{ reference_id: string; amount_nano: number; created_at: string }>();
  if (!deposit) return;
  const amount = Math.max(0, Math.floor(Number(deposit.amount_nano || 0) * Number(effect.rate_bps || 0) / 10_000));
  if (amount > 0) await creditReward(env, userId, amount, String(effect.id), 'Daily Wheel deposit bonus', true);
  await env.DB.prepare("UPDATE daily_wheel_effects SET status='consumed',consumed_at=CURRENT_TIMESTAMP,reference_id=? WHERE id=? AND status='active'")
    .bind(String(deposit.reference_id || ''), String(effect.id || '')).run();
}

async function settleCashback(env: Env, userId: string, effect: Record<string, unknown>): Promise<void> {
  const totals = await env.DB.prepare(`SELECT COALESCE(SUM(amount_nano),0) AS net FROM ton_transactions
    WHERE user_id=? AND kind='game' AND status='completed' AND datetime(created_at)>=datetime(?) AND datetime(created_at)<=datetime(?)`)
    .bind(userId, String(effect.starts_at || ''), String(effect.expires_at || '')).first<{ net: number }>();
  const loss = Math.max(0, -Math.floor(Number(totals?.net || 0)));
  const amount = Math.floor(loss * Number(effect.rate_bps || 0) / 10_000);
  if (amount > 0) await creditReward(env, userId, amount, String(effect.id), 'Daily Wheel cashback', false);
  await env.DB.prepare("UPDATE daily_wheel_effects SET status='consumed',consumed_at=CURRENT_TIMESTAMP WHERE id=? AND status='active'")
    .bind(String(effect.id || '')).run();
}

async function creditReward(env: Env, userId: string, amount: number, referenceId: string, title: string, restricted: boolean): Promise<void> {
  const transactionId = 'daily_wheel_reward:' + referenceId;
  const nonce = crypto.randomUUID();
  const metadata = JSON.stringify({ section: 'wheel', feature: 'daily', restrictedBonus: restricted, idempotencyNonce: nonce });
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO app_users(telegram_user_id,current_section,ton_balance_nano,last_seen_at,updated_at)
      VALUES (?,'home',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) ON CONFLICT(telegram_user_id) DO NOTHING`).bind(userId),
    env.DB.prepare(`INSERT OR IGNORE INTO ton_transactions
      (id,user_id,kind,title,amount_nano,balance_after_nano,status,reference_id,reference_type,metadata_json,created_at)
      SELECT ?,?,'adjustment',?,?,ton_balance_nano+?,'completed',?,'daily_wheel',?,CURRENT_TIMESTAMP
      FROM app_users WHERE telegram_user_id=?`).bind(transactionId, userId, title, amount, amount, referenceId, metadata, userId),
    env.DB.prepare(`UPDATE app_users SET ton_balance_nano=ton_balance_nano+?,bonus_balance_nano=bonus_balance_nano+?,updated_at=CURRENT_TIMESTAMP
      WHERE telegram_user_id=? AND EXISTS(SELECT 1 FROM ton_transactions WHERE id=? AND user_id=? AND metadata_json=?)`)
      .bind(amount, restricted ? amount : 0, userId, transactionId, userId, metadata),
  ]);
}

function securePrizeIndex(): number {
  const roll = secureIndex(10_000);
  let cursor = 0;
  for (let index = 0; index < PRIZES.length; index += 1) {
    cursor += PRIZES[index].weightBps;
    if (roll < cursor) return index;
  }
  return PRIZES.findIndex((prize) => prize.key === 'empty');
}

function secureIndex(maxExclusive: number): number {
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / maxExclusive) * maxExclusive;
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value); while (value[0] >= limit);
  return value[0] % maxExclusive;
}

function publicSpin(row: Record<string, unknown>): DailyWheelSpin {
  return {
    id: String(row.id || ''),
    userId: String(row.user_id || ''),
    prizeKey: String(row.prize_key || 'empty') as DailyWheelPrizeKey,
    prizeLabel: String(row.prize_label || 'Empty'),
    prizeIndex: Math.max(0, Math.min(PRIZES.length - 1, Number(row.prize_index) || 0)),
    status: String(row.status || 'pending'),
    createdAt: String(row.created_at || ''),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    nextSpinAt: String(row.next_spin_at || ''),
  };
}
