import type { Env } from './types';
import { publishLiveActivity } from './live-activity';
import { publishUserControls } from './section-lock-events';
import { ensureTonTransactionsTable, recordTonTransaction, recordTonTransactions, type TonTransactionMeta, type TonTransactionWrite } from './ton-transactions';

export type UserSectionBlock = {
  sectionId: string;
  blocked: boolean;
  expiresAt: string | null;
  remainingMs: number | null;
  reason: string | null;
  adminNote: string | null;
};

export type PublicUserSectionBlock = Pick<UserSectionBlock, 'sectionId' | 'blocked' | 'expiresAt' | 'remainingMs'>;

export type UserSectionBlockMeta = {
  reason?: unknown;
  adminNote?: unknown;
};

export type UserControls = {
  userId: string;
  banned: boolean;
  tonBalanceNano: number;
  winChancePercent: number;
  blockedSections: string[];
  sectionBlocks: UserSectionBlock[];
};

const VALID_SECTIONS = new Set(['home', 'plinko', 'playzone', 'mines', 'crash', 'wheel', 'dice', 'tower', 'slot', 'coinflip', 'hilo', 'ghostrun', 'predict-bitcoin', 'predict-gold', 'predict-oil']);
let gameBalanceLedgerReady: Promise<void> | null = null;

type StoredUserControls = {
  userId?: string;
  blockedSections?: unknown;
  winChancePercent?: unknown;
  banned?: boolean;
};

type StoredSectionBlock = { sectionId?: unknown; blocked?: unknown; expiresAt?: unknown; reason?: unknown; adminNote?: unknown };
type UserControlRow = { blocked_sections_json: string; win_chance_percent?: number | null; banned?: number | null };

export async function getUserControls(env: Env, userId: string): Promise<UserControls> {
  const id = cleanUserId(userId);
  const [saved, tonBalanceNano] = await Promise.all([readSectionControls(env, id), readUserTonBalance(env, id)]);
  return shapeUserControls(id, saved, tonBalanceNano);
}

export async function setUserTonBalance(env: Env, userId: string, tonBalanceNano: number, meta: TonTransactionMeta = {}): Promise<UserControls> {
  const id = cleanUserId(userId);
  const before = await readUserTonBalance(env, id);
  const after = normalizeNano(tonBalanceNano);
  await writeUserTonBalance(env, id, after);
  await recordTonTransaction(env, id, after - before, after, { kind: 'admin', title: 'Admin balance update', ...meta });
  return controlsWithBalance(env, id, after);
}

export async function adjustUserTonBalance(env: Env, userId: string, deltaNano: number, meta: TonTransactionMeta = {}): Promise<UserControls> {
  const id = cleanUserId(userId);
  const delta = Math.floor(Number(deltaNano) || 0);
  if (!delta) return getUserControls(env, id);
  if (hasBalanceReference(meta)) return applyReferencedBalanceMutation(env, id, delta, meta, false);
  const before = await readUserTonBalance(env, id);
  await addUserTonBalance(env, id, delta);
  const after = await readUserTonBalance(env, id);
  await recordTonTransaction(env, id, after - before, after, meta);
  return controlsWithBalance(env, id, after);
}

export async function applyGameTonBalanceDelta(env: Env, userId: string, deltaNano: number, meta: TonTransactionMeta = {}): Promise<UserControls> {
  const id = cleanUserId(userId);
  await assertUserNotBanned(env, id);
  const baseDelta = Math.floor(Number(deltaNano) || 0);
  if (!baseDelta) return getUserControls(env, id);
  const effectiveMeta: TonTransactionMeta = {
    kind: 'game',
    title: baseDelta >= 0 ? 'Game reward' : 'Game bet',
    ...meta,
    metadata: { ...(meta.metadata || {}), requestedDeltaNano: baseDelta },
  };
  if (hasBalanceReference(effectiveMeta)) return applyReferencedBalanceMutation(env, id, baseDelta, effectiveMeta, false);
  const before = await readUserTonBalance(env, id);
  await addUserTonBalance(env, id, baseDelta);
  const after = await readUserTonBalance(env, id);
  await recordTonTransaction(env, id, after - before, after, effectiveMeta);
  return controlsWithBalance(env, id, after);
}

export async function settleGameTonBalanceRound(env: Env, userId: string, betNanoInput: number, payoutNanoInput: number, meta: TonTransactionMeta = {}): Promise<UserControls> {
  const id = cleanUserId(userId);
  await assertUserNotBanned(env, id);
  const betNano = normalizeNano(betNanoInput);
  const payoutNano = normalizeNano(payoutNanoInput);
  if (betNano <= 0) throw new Error('Invalid game amount');
  await ensureAppUserBalanceRow(env, id);
  const result = await env.DB.prepare(`UPDATE app_users
    SET ton_balance_nano = ton_balance_nano - ? + ?, updated_at = CURRENT_TIMESTAMP
    WHERE telegram_user_id = ? AND ton_balance_nano >= ?
    RETURNING ton_balance_nano`)
    .bind(betNano, payoutNano, id, betNano)
    .first<{ ton_balance_nano: number }>();
  if (!result) throw new Error('Insufficient balance');
  const after = normalizeNano(result.ton_balance_nano);
  const before = after + betNano - payoutNano;
  const afterBet = Math.max(0, before - betNano);
  const writes: TonTransactionWrite[] = [{
    amountNano: -betNano,
    balanceAfterNano: afterBet,
    meta: { kind: 'game', title: 'Game bet', ...meta, metadata: { ...(meta.metadata || {}), phase: 'bet', requestedDeltaNano: -betNano } },
  }];
  if (payoutNano > 0) writes.push({
    amountNano: payoutNano,
    balanceAfterNano: after,
    meta: { kind: 'game', title: 'Game reward', ...meta, metadata: { ...(meta.metadata || {}), phase: 'payout', requestedDeltaNano: payoutNano } },
  });
  await recordTonTransactions(env, id, writes);
  return controlsWithBalance(env, id, after);
}

export async function debitUserTonBalanceIfEnough(env: Env, userId: string, amountNano: number, meta: TonTransactionMeta = {}): Promise<UserControls> {
  const id = cleanUserId(userId);
  await assertUserNotBanned(env, id);
  const amount = normalizeNano(amountNano);
  if (amount <= 0) throw new Error('Invalid purchase amount');
  const effectiveMeta: TonTransactionMeta = { kind: 'adjustment', title: 'GRAM debit', ...meta };
  if (hasBalanceReference(effectiveMeta)) return applyReferencedBalanceMutation(env, id, -amount, effectiveMeta, true);
  await ensureAppUserBalanceRow(env, id);
  const result = await env.DB.prepare(`UPDATE app_users
    SET ton_balance_nano = ton_balance_nano - ?, updated_at = CURRENT_TIMESTAMP
    WHERE telegram_user_id = ? AND ton_balance_nano >= ?`).bind(amount, id, amount).run();
  if ((result.meta?.changes || 0) <= 0) throw new Error('Insufficient balance');
  const after = await readUserTonBalance(env, id);
  await recordTonTransaction(env, id, -amount, after, effectiveMeta);
  return controlsWithBalance(env, id, after);
}

export async function setUserSectionBlocked(env: Env, userId: string, sectionId: string, blocked: boolean, expiresAtInput: unknown = null, meta: UserSectionBlockMeta = {}): Promise<UserControls> {
  const id = cleanUserId(userId);
  const section = cleanSection(sectionId);
  if (!VALID_SECTIONS.has(section)) throw new Error('Unknown section');
  const current = await getUserControls(env, id);
  const expiresAt = blocked ? normalizeExpiresAt(expiresAtInput) : null;
  const next = current.sectionBlocks.filter((item) => item.sectionId !== section);
  if (blocked) next.push({
    sectionId: section,
    blocked: true,
    expiresAt,
    remainingMs: expiresAt ? Math.max(0, Date.parse(expiresAt) - Date.now()) : null,
    reason: normalizeBlockText(meta.reason, 80),
    adminNote: normalizeBlockText(meta.adminNote, 180),
  });
  const normalized = normalizeSectionBlocks(next);
  await saveControls(env, id, normalized, current.winChancePercent, current.banned);
  if (section.startsWith('predict-')) {
    await publishUserControls(env, {
      userId: id,
      sectionBlocks: normalized.map((item) => ({ sectionId: item.sectionId, blocked: item.blocked, expiresAt: item.expiresAt, remainingMs: item.remainingMs })),
    });
  }
  return getUserControls(env, id);
}

export async function setUserBanned(env: Env, userId: string, banned: boolean): Promise<UserControls> {
  const id = cleanUserId(userId);
  const current = await getUserControls(env, id);
  await saveControls(env, id, current.sectionBlocks, current.winChancePercent, banned);
  return getUserControls(env, id);
}

export async function setUserWinChance(env: Env, userId: string, winChancePercent: number): Promise<UserControls> {
  const id = cleanUserId(userId);
  const current = await getUserControls(env, id);
  await saveControls(env, id, current.sectionBlocks, normalizeWinChance(winChancePercent), current.banned);
  return getUserControls(env, id);
}

export async function assertUserNotBanned(env: Env, userId: string): Promise<void> {
  const id = cleanUserId(userId);
  const controls = await readSectionControls(env, id);
  if (controls?.banned === true) throw new Error('Your access to all sections is blocked.');
}

export async function publicUserControls(env: Env, userId: string): Promise<{ userId: string; banned: boolean; tonBalanceNano: number; winChancePercent: number; blockedSections: string[]; sectionBlocks: PublicUserSectionBlock[] }> {
  const controls = await getUserControls(env, userId);
  return {
    userId: controls.userId,
    banned: controls.banned,
    tonBalanceNano: controls.tonBalanceNano,
    winChancePercent: controls.winChancePercent,
    blockedSections: controls.blockedSections,
    sectionBlocks: controls.sectionBlocks.map((item) => ({ sectionId: item.sectionId, blocked: item.blocked, expiresAt: item.expiresAt, remainingMs: item.remainingMs })),
  };
}

async function controlsWithBalance(env: Env, userId: string, tonBalanceNano: number): Promise<UserControls> {
  const saved = await readSectionControls(env, userId);
  return shapeUserControls(userId, saved, tonBalanceNano);
}

function shapeUserControls(userId: string, saved: StoredUserControls | null, tonBalanceNano: number): UserControls {
  const sectionBlocks = normalizeSectionBlocks(saved?.blockedSections);
  return {
    userId,
    banned: saved?.banned === true,
    tonBalanceNano: normalizeNano(tonBalanceNano),
    winChancePercent: normalizeWinChance(saved?.winChancePercent),
    blockedSections: sectionBlocks.filter((item) => item.blocked).map((item) => item.sectionId),
    sectionBlocks,
  };
}

async function readSectionControls(env: Env, userId: string): Promise<StoredUserControls | null> {
  try {
    const row = await readUserControlRow(env, userId);
    if (row) return rowToStoredControls(userId, row);
  } catch (error) {
    if (isMissingUserControlsSchema(error)) {
      try {
        await ensureUserControlsTable(env);
        const row = await readUserControlRow(env, userId);
        if (row) return rowToStoredControls(userId, row);
      } catch (retryError) {
        console.warn('read user section controls from D1 failed', retryError);
      }
    } else {
      console.warn('read user section controls from D1 failed', error);
    }
  }
  return env.BOT_CACHE.get(key(userId), 'json').catch(() => null) as Promise<StoredUserControls | null>;
}

async function readUserControlRow(env: Env, userId: string): Promise<UserControlRow | null> {
  return env.DB.prepare('SELECT blocked_sections_json, win_chance_percent, banned FROM user_controls WHERE user_id = ?').bind(userId).first<UserControlRow>();
}

function rowToStoredControls(userId: string, row: UserControlRow): StoredUserControls {
  return { userId, blockedSections: row.blocked_sections_json ? JSON.parse(row.blocked_sections_json) : [], winChancePercent: row.win_chance_percent, banned: Number(row.banned || 0) === 1 };
}

async function saveControls(env: Env, userId: string, sectionBlocks: UserSectionBlock[], winChancePercent: number, banned = false): Promise<void> {
  await ensureUserControlsTable(env);
  await env.DB.prepare(`INSERT INTO user_controls (user_id, blocked_sections_json, win_chance_percent, banned, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET
      blocked_sections_json = excluded.blocked_sections_json,
      win_chance_percent = excluded.win_chance_percent,
      banned = excluded.banned,
      updated_at = CURRENT_TIMESTAMP`)
    .bind(userId, JSON.stringify(normalizeSectionBlocks(sectionBlocks)), normalizeWinChance(winChancePercent), banned ? 1 : 0)
    .run();
}

async function ensureUserControlsTable(env: Env): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_controls (
    user_id TEXT PRIMARY KEY,
    blocked_sections_json TEXT NOT NULL DEFAULT '[]',
    win_chance_percent INTEGER NOT NULL DEFAULT 50,
    banned INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare('ALTER TABLE user_controls ADD COLUMN win_chance_percent INTEGER NOT NULL DEFAULT 50').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE user_controls ADD COLUMN banned INTEGER NOT NULL DEFAULT 0').run().catch(() => undefined);
}

function isMissingUserControlsSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /no such table:\s*user_controls|no such column:\s*(win_chance_percent|banned)/i.test(message);
}

export async function ensureTonBalanceColumn(env: Env): Promise<void> {
  await env.DB.prepare('ALTER TABLE app_users ADD COLUMN ton_balance_nano INTEGER NOT NULL DEFAULT 0').run().catch(() => undefined);
}

async function ensureAppUserBalanceRow(env: Env, userId: string): Promise<void> {
  await env.DB.prepare(`INSERT INTO app_users (telegram_user_id, current_section, ton_balance_nano, last_seen_at, updated_at)
    VALUES (?, 'home', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_user_id) DO NOTHING`).bind(userId).run();
}

async function ensureGameBalanceLedger(env: Env): Promise<void> {
  if (!gameBalanceLedgerReady) {
    gameBalanceLedgerReady = ensureTonTransactionsTable(env).catch((error) => {
      gameBalanceLedgerReady = null;
      throw error;
    });
  }
  await gameBalanceLedgerReady;
}

async function applyReferencedBalanceMutation(env: Env, userId: string, deltaNano: number, meta: TonTransactionMeta, requireEnough: boolean): Promise<UserControls> {
  const delta = Math.floor(Number(deltaNano) || 0);
  if (!delta) return getUserControls(env, userId);
  const referenceId = cleanMetaText(meta.referenceId, 120);
  const referenceType = cleanMetaText(meta.referenceType, 60);
  if (!referenceId || !referenceType) throw new Error('Missing balance operation reference');

  await ensureAppUserBalanceRow(env, userId);
  await ensureGameBalanceLedger(env);

  const kind = cleanMetaText(meta.kind || 'adjustment', 40) || 'adjustment';
  const title = cleanMetaText(meta.title || (delta >= 0 ? 'GRAM credit' : 'GRAM debit'), 90) || (delta >= 0 ? 'GRAM credit' : 'GRAM debit');
  const description = cleanMetaText(meta.description, 180) || null;
  const status = cleanMetaText(meta.status || 'completed', 40) || 'completed';
  const transactionId = await referencedBalanceTransactionId(userId, kind, referenceType, referenceId, delta, title);
  const requestNonce = crypto.randomUUID();
  const metadataJson = JSON.stringify({ ...(meta.metadata || {}), requestedDeltaNano: delta, idempotencyNonce: requestNonce }).slice(0, 2000);
  const requiredBalance = requireEnough && delta < 0 ? Math.abs(delta) : 0;

  const results = await env.DB.batch([
    env.DB.prepare(`INSERT OR IGNORE INTO ton_transactions (
      id, user_id, kind, title, description, amount_nano, balance_after_nano, status,
      reference_id, reference_type, metadata_json, created_at
    )
    SELECT ?, ?, ?, ?, ?,
      max(0, ton_balance_nano + ?) - ton_balance_nano,
      max(0, ton_balance_nano + ?),
      ?, ?, ?, ?, CURRENT_TIMESTAMP
    FROM app_users
    WHERE telegram_user_id = ? AND (? <= 0 OR ton_balance_nano >= ?)`)
      .bind(transactionId, userId, kind, title, description, delta, delta, status, referenceId, referenceType, metadataJson, userId, requiredBalance, requiredBalance),
    env.DB.prepare(`UPDATE app_users
      SET ton_balance_nano = max(0, ton_balance_nano + ?), updated_at = CURRENT_TIMESTAMP
      WHERE telegram_user_id = ?
        AND EXISTS (
          SELECT 1 FROM ton_transactions
          WHERE id = ? AND user_id = ? AND metadata_json = ?
        )`)
      .bind(delta, userId, transactionId, userId, metadataJson),
  ]);

  const applied = Number(results[0]?.meta?.changes || 0) > 0;
  if (!applied && requiredBalance > 0) {
    const existing = await env.DB.prepare('SELECT id FROM ton_transactions WHERE id = ? AND user_id = ? LIMIT 1')
      .bind(transactionId, userId)
      .first<{ id: string }>();
    if (!existing) throw new Error('Insufficient balance');
  }

  const after = await readUserTonBalance(env, userId);
  if (applied && kind === 'deposit' && delta > 0) {
    await publishLiveActivity(env, {
      kind: 'deposit',
      userId,
      amountNano: delta,
      key: referenceId,
      createdAt: new Date().toISOString(),
    }).catch((error) => console.warn('live activity publish failed', error));
  }
  return controlsWithBalance(env, userId, after);
}

async function referencedBalanceTransactionId(userId: string, kind: string, referenceType: string, referenceId: string, deltaNano: number, title: string): Promise<string> {
  const source = JSON.stringify([userId, kind, referenceType, referenceId, deltaNano, title]);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  const hex = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('');
  return 'refbal_' + hex.slice(0, 48);
}

function hasBalanceReference(meta: TonTransactionMeta): boolean {
  return Boolean(cleanMetaText(meta.referenceId, 120) && cleanMetaText(meta.referenceType, 60));
}

function cleanMetaText(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

async function readUserTonBalance(env: Env, userId: string): Promise<number> {
  const app = await env.DB.prepare('SELECT ton_balance_nano FROM app_users WHERE telegram_user_id = ?').bind(userId).first<{ ton_balance_nano: number }>().catch(() => null);
  return normalizeNano(app?.ton_balance_nano ?? 0);
}

async function writeUserTonBalance(env: Env, userId: string, tonBalanceNano: number): Promise<void> {
  const value = normalizeNano(tonBalanceNano);
  await env.DB.prepare(`INSERT INTO app_users (telegram_user_id, current_section, ton_balance_nano, last_seen_at, updated_at)
    VALUES (?, 'home', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_user_id) DO UPDATE SET
      ton_balance_nano = excluded.ton_balance_nano,
      updated_at = CURRENT_TIMESTAMP`)
    .bind(userId, value)
    .run();
}

async function addUserTonBalance(env: Env, userId: string, deltaNano: number): Promise<void> {
  const value = Math.floor(Number(deltaNano) || 0);
  await env.DB.prepare(`INSERT INTO app_users (telegram_user_id, current_section, ton_balance_nano, last_seen_at, updated_at)
    VALUES (?, 'home', max(0, ?), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_user_id) DO UPDATE SET
      ton_balance_nano = max(0, ton_balance_nano + ?),
      updated_at = CURRENT_TIMESTAMP`)
    .bind(userId, value, value)
    .run();
}

function normalizeSectionBlocks(value: unknown): UserSectionBlock[] {
  const now = Date.now();
  const raw = Array.isArray(value) ? value : [];
  const entries = raw.map((item): StoredSectionBlock => typeof item === 'string' ? { sectionId: item, blocked: true } : (item ?? {}) as StoredSectionBlock);
  const map = new Map<string, UserSectionBlock>();
  for (const item of entries) {
    const sectionId = cleanSection(item.sectionId);
    if (!VALID_SECTIONS.has(sectionId)) continue;
    const expiresAt = normalizeExpiresAt(item.expiresAt);
    if (expiresAt && Date.parse(expiresAt) <= now) continue;
    const blocked = item.blocked !== false;
    if (!blocked) continue;
    map.set(sectionId, {
      sectionId,
      blocked: true,
      expiresAt,
      remainingMs: expiresAt ? Math.max(0, Date.parse(expiresAt) - now) : null,
      reason: normalizeBlockText(item.reason, 80),
      adminNote: normalizeBlockText(item.adminNote, 180),
    });
  }
  return Array.from(map.values()).sort((a, b) => a.sectionId.localeCompare(b.sectionId));
}

function normalizeExpiresAt(value: unknown): string | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function normalizeBlockText(value: unknown, max: number): string | null {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
  return text || null;
}

function normalizeNano(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0));
}

function normalizeWinChance(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, n));
}

function key(userId: string): string {
  return 'admin:user-controls:' + userId;
}

function cleanUserId(value: unknown): string {
  const id = String(value ?? '').replace(/[^0-9A-Za-z_-]/g, '').trim().slice(0, 80);
  if (!id) throw new Error('Missing user id');
  return id;
}

function cleanSection(value: unknown): string {
  return String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '').trim().slice(0, 40);
}