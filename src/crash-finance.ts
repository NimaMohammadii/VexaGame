import type { Env } from './types';
import { ensureTonTransactionsTable } from './ton-transactions';
import { dailyWheelWinMultiplier, ensureDailyWheelSchema } from './daily-wheel-rewards';

const CRASH_MAX_MULTIPLIER = 50;
let crashFinanceSchemaReady = false;

export type CrashBetRow = {
  round_id: number;
  user_id: string;
  username: string;
  amount_nano: number;
  status: string;
  cashout_multiplier: number | null;
  auto_cashout_multiplier?: number | null;
  payout_nano: number;
  is_virtual?: number;
  target_cashout_multiplier?: number | null;
  virtual_reveal_at_ms?: number;
  virtual_order?: number;
  created_at: string;
  updated_at: string;
};

export async function ensureCrashFinanceSchema(env: Env): Promise<void> {
  if (crashFinanceSchemaReady) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS crash_live_bets(
    round_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    amount_nano INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'bet',
    cashout_multiplier REAL,
    auto_cashout_multiplier REAL,
    payout_nano INTEGER NOT NULL DEFAULT 0,
    is_virtual INTEGER NOT NULL DEFAULT 0,
    target_cashout_multiplier REAL,
    virtual_reveal_at_ms INTEGER NOT NULL DEFAULT 0,
    virtual_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(round_id,user_id)
  )`).run();
  await addColumnIfMissing(env.DB, 'ALTER TABLE crash_live_bets ADD COLUMN auto_cashout_multiplier REAL');
  await addColumnIfMissing(env.DB, 'ALTER TABLE crash_live_bets ADD COLUMN is_virtual INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(env.DB, 'ALTER TABLE crash_live_bets ADD COLUMN target_cashout_multiplier REAL');
  await addColumnIfMissing(env.DB, 'ALTER TABLE crash_live_bets ADD COLUMN virtual_reveal_at_ms INTEGER NOT NULL DEFAULT 0');
  await addColumnIfMissing(env.DB, 'ALTER TABLE crash_live_bets ADD COLUMN virtual_order INTEGER NOT NULL DEFAULT 0');
  await ensureTonTransactionsTable(env);
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_crash_live_bets_round ON crash_live_bets(round_id,created_at)').run();
  crashFinanceSchemaReady = true;
}

export function cleanCrashAutoCashout(value: unknown): number | null {
  const raw = Number(value);
  if (!Number.isFinite(raw) || raw <= 0) return null;
  if (raw < 1.01 || raw > CRASH_MAX_MULTIPLIER) throw new Error('Invalid Auto Cashout');
  return Math.floor(raw * 100) / 100;
}

export async function settleCrashCashoutAtomic(
  env: Env,
  userId: string,
  roundId: number,
  multiplier: number,
  payoutNano: number,
): Promise<CrashBetRow> {
  await Promise.all([ensureCrashFinanceSchema(env), ensureDailyWheelSchema(env)]);
  const lockedMultiplier = cleanLockedMultiplier(multiplier);
  const rewardMultiplier = lockedMultiplier > 1 ? await dailyWheelWinMultiplier(env, userId) : 1;
  const lockedPayout = cleanPayout(Math.floor(payoutNano * rewardMultiplier));
  const nonce = crypto.randomUUID();
  const metadataJson = cashoutMetadata(nonce, 'manual');
  const statements = [
    env.DB.prepare(`UPDATE crash_live_bets
      SET status='cashout_pending',
          cashout_multiplier=CASE WHEN status IN ('bet','crashed') THEN ? ELSE cashout_multiplier END,
          payout_nano=CASE WHEN status IN ('bet','crashed') THEN ? ELSE payout_nano END,
          updated_at=CURRENT_TIMESTAMP
      WHERE round_id=? AND user_id=? AND is_virtual=0
        AND EXISTS(
          SELECT 1 FROM ton_transactions t
          WHERE t.user_id=crash_live_bets.user_id
            AND t.reference_type='crash'
            AND t.reference_id=('crash:' || crash_live_bets.round_id || ':' || crash_live_bets.user_id)
            AND t.amount_nano<0
        )
        AND (
          status IN ('bet','crashed','cashout_pending') OR
          (status='cashout' AND NOT EXISTS(
            SELECT 1 FROM ton_transactions t
            WHERE t.user_id=crash_live_bets.user_id
              AND t.reference_type='crash'
              AND t.reference_id=('crash:' || crash_live_bets.round_id || ':' || crash_live_bets.user_id || ':cashout')
              AND t.amount_nano>0
          ))
        )`).bind(lockedMultiplier, lockedPayout, roundId, userId),
    ...pendingCashoutStatements(env, roundId, metadataJson),
    env.DB.prepare('SELECT * FROM crash_live_bets WHERE round_id=? AND user_id=? AND is_virtual=0').bind(roundId, userId),
  ];
  const results = await env.DB.batch(statements);
  const rows = resultRows<CrashBetRow>(results[results.length - 1]);
  const row = rows[0];
  if (row?.status === 'cashout') return row;
  throw new Error('Cashout settlement did not complete');
}

export async function settleDueCrashAutoCashouts(
  env: Env,
  roundId: number,
  currentMultiplier: number,
  crashPoint: number,
): Promise<CrashBetRow[]> {
  await Promise.all([ensureCrashFinanceSchema(env), ensureDailyWheelSchema(env)]);
  const current = Math.max(1, Math.min(CRASH_MAX_MULTIPLIER, Number(currentMultiplier) || 1));
  const stop = Math.max(1, Math.min(CRASH_MAX_MULTIPLIER, Number(crashPoint) || 1));
  if (current < 1.01 || stop <= 1.01) return [];

  const nonce = crypto.randomUUID();
  const metadataJson = cashoutMetadata(nonce, 'auto');
  const statements = [
    env.DB.prepare(`UPDATE crash_live_bets
      SET status='cashout_pending',
          cashout_multiplier=auto_cashout_multiplier,
          payout_nano=CAST(amount_nano * auto_cashout_multiplier AS INTEGER) *
            CASE WHEN EXISTS(
              SELECT 1 FROM daily_wheel_effects effect
              WHERE effect.user_id=crash_live_bets.user_id
                AND effect.kind='double_win' AND effect.status='active'
                AND datetime(effect.expires_at)>datetime('now')
            ) THEN 2 ELSE 1 END,
          updated_at=CURRENT_TIMESTAMP
      WHERE round_id=? AND is_virtual=0 AND status IN ('bet','crashed')
        AND auto_cashout_multiplier IS NOT NULL
        AND auto_cashout_multiplier>=1.01
        AND auto_cashout_multiplier<=?
        AND auto_cashout_multiplier<?
        AND EXISTS(
          SELECT 1 FROM ton_transactions t
          WHERE t.user_id=crash_live_bets.user_id
            AND t.reference_type='crash'
            AND t.reference_id=('crash:' || crash_live_bets.round_id || ':' || crash_live_bets.user_id)
            AND t.amount_nano<0
        )
        AND NOT EXISTS(
          SELECT 1 FROM ton_transactions t
          WHERE t.user_id=crash_live_bets.user_id
            AND t.reference_type='crash'
            AND t.reference_id=('crash:' || crash_live_bets.round_id || ':' || crash_live_bets.user_id || ':cashout')
            AND t.amount_nano>0
        )`).bind(roundId, current, stop),
    ...pendingCashoutStatements(env, roundId, metadataJson),
    env.DB.prepare(`SELECT b.*
      FROM crash_live_bets b
      JOIN ton_transactions t ON t.id=('crash_cashout:' || b.round_id || ':' || b.user_id)
      WHERE b.round_id=? AND b.is_virtual=0 AND b.status='cashout' AND t.metadata_json=?
      ORDER BY b.user_id`).bind(roundId, metadataJson),
  ];
  const results = await env.DB.batch(statements);
  return resultRows<CrashBetRow>(results[results.length - 1]);
}

export async function nextCrashAutoCashoutMultiplier(
  env: Env,
  roundId: number,
  crashPoint: number,
): Promise<number | null> {
  await ensureCrashFinanceSchema(env);
  const stop = Math.max(1, Math.min(CRASH_MAX_MULTIPLIER, Number(crashPoint) || 1));
  const row = await env.DB.prepare(`SELECT MIN(b.auto_cashout_multiplier) AS target
    FROM crash_live_bets b
    WHERE b.round_id=? AND b.is_virtual=0 AND b.status='bet'
      AND b.auto_cashout_multiplier IS NOT NULL
      AND b.auto_cashout_multiplier>=1.01
      AND b.auto_cashout_multiplier<?
      AND EXISTS(
        SELECT 1 FROM ton_transactions t
        WHERE t.user_id=b.user_id
          AND t.reference_type='crash'
          AND t.reference_id=('crash:' || b.round_id || ':' || b.user_id)
          AND t.amount_nano<0
      )`).bind(roundId, stop).first<{ target: number | null }>();
  const target = Number(row?.target);
  return Number.isFinite(target) && target >= 1.01 && target < stop ? target : null;
}

function pendingCashoutStatements(env: Env, roundId: number, metadataJson: string): D1PreparedStatement[] {
  return [
    env.DB.prepare(`INSERT OR IGNORE INTO ton_transactions(
        id,user_id,kind,title,description,amount_nano,balance_after_nano,status,reference_id,reference_type,metadata_json,created_at
      )
      SELECT
        ('crash_cashout:' || b.round_id || ':' || b.user_id),
        b.user_id,
        'game',
        'Crash cashout',
        NULL,
        b.payout_nano,
        u.ton_balance_nano+b.payout_nano,
        'completed',
        ('crash:' || b.round_id || ':' || b.user_id || ':cashout'),
        'crash',
        ?,
        CURRENT_TIMESTAMP
      FROM crash_live_bets b
      JOIN app_users u ON u.telegram_user_id=b.user_id
      WHERE b.round_id=? AND b.is_virtual=0 AND b.status='cashout_pending' AND b.payout_nano>0
        AND EXISTS(
          SELECT 1 FROM ton_transactions stake
          WHERE stake.user_id=b.user_id
            AND stake.reference_type='crash'
            AND stake.reference_id=('crash:' || b.round_id || ':' || b.user_id)
            AND stake.amount_nano<0
        )
        AND NOT EXISTS(
          SELECT 1 FROM ton_transactions paid
          WHERE paid.user_id=b.user_id
            AND paid.reference_type='crash'
            AND paid.reference_id=('crash:' || b.round_id || ':' || b.user_id || ':cashout')
            AND paid.amount_nano>0
        )`).bind(metadataJson, roundId),
    env.DB.prepare(`UPDATE app_users
      SET ton_balance_nano=ton_balance_nano+COALESCE((
        SELECT SUM(b.payout_nano)
        FROM crash_live_bets b
        JOIN ton_transactions t ON t.id=('crash_cashout:' || b.round_id || ':' || b.user_id)
        WHERE b.round_id=?
          AND b.is_virtual=0
          AND b.status='cashout_pending'
          AND b.user_id=app_users.telegram_user_id
          AND t.metadata_json=?
      ),0),
      updated_at=CURRENT_TIMESTAMP
      WHERE EXISTS(
        SELECT 1
        FROM crash_live_bets b
        JOIN ton_transactions t ON t.id=('crash_cashout:' || b.round_id || ':' || b.user_id)
        WHERE b.round_id=?
          AND b.is_virtual=0
          AND b.status='cashout_pending'
          AND b.user_id=app_users.telegram_user_id
          AND t.metadata_json=?
      )`).bind(roundId, metadataJson, roundId, metadataJson),
    env.DB.prepare(`UPDATE crash_live_bets
      SET status='cashout',updated_at=CURRENT_TIMESTAMP
      WHERE round_id=? AND is_virtual=0 AND status='cashout_pending'
        AND EXISTS(
          SELECT 1 FROM ton_transactions t
          WHERE t.user_id=crash_live_bets.user_id
            AND t.reference_type='crash'
            AND t.reference_id=('crash:' || crash_live_bets.round_id || ':' || crash_live_bets.user_id || ':cashout')
            AND t.amount_nano>0
        )`).bind(roundId),
  ];
}

async function addColumnIfMissing(db: D1Database, sql: string): Promise<void> {
  try {
    await db.prepare(sql).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || '');
    if (!/duplicate column name/i.test(message)) throw error;
  }
}

function cashoutMetadata(nonce: string, mode: 'manual' | 'auto'): string {
  return JSON.stringify({ section: 'crash', source: 'server', mode, idempotencyNonce: nonce });
}

function cleanLockedMultiplier(value: number): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1 || n > CRASH_MAX_MULTIPLIER) throw new Error('Invalid locked cashout');
  return Math.floor(n * 100) / 100;
}

function cleanPayout(value: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Invalid locked cashout');
  return n;
}

function resultRows<T>(result: D1Result<unknown> | undefined): T[] {
  return Array.isArray(result?.results) ? result.results as T[] : [];
}
