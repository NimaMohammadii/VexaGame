import type { Env } from './types';

export type OnlineCountRange = { min: number; max: number };
export type OnlineCountRanges = Record<string, OnlineCountRange>;
export type OnlineCountTimedBoost = OnlineCountRange & { expiresAt: string };
export type OnlineCountAdjustment = { permanent: number; timed?: OnlineCountTimedBoost };
export type OnlineCountConfig = {
  ranges: OnlineCountRanges;
  adjustments: Record<string, OnlineCountAdjustment>;
  updatedAt?: string;
};

type AdminSettingRow = { value_json: string };

const KEY = 'admin:online-user-counts';
const SECTION_IDS = ['mines', 'plinko', 'wheel', 'dice', 'crash', 'hilo', 'coinflip', 'slot', 'ghostrun', 'predict'];
const MAX_COUNT = 999_999;

export const ONLINE_COUNT_SECTIONS = SECTION_IDS.map((id) => ({ id, label: labelForSection(id) }));

export async function getOnlineUserCountConfig(env: Env): Promise<OnlineCountConfig> {
  const saved = await readConfig(env);
  return saved ? normalizeOnlineCountConfig(saved) : defaultOnlineCountConfig();
}

export async function saveOnlineUserCountConfig(env: Env, value: unknown): Promise<OnlineCountConfig> {
  const config = normalizeOnlineCountConfig(value);
  config.updatedAt = new Date().toISOString();
  await writeConfig(env, config);
  await publishOnlineUserCountConfig(env, config);
  return config;
}

export async function resetOnlineUserCountConfig(env: Env): Promise<OnlineCountConfig> {
  const config = { ...defaultOnlineCountConfig(), updatedAt: new Date().toISOString() };
  await writeConfig(env, config);
  await publishOnlineUserCountConfig(env, config);
  return config;
}

function defaultOnlineCountConfig(): OnlineCountConfig {
  const ranges: OnlineCountRanges = {};
  const adjustments: Record<string, OnlineCountAdjustment> = {};
  for (const id of SECTION_IDS) ranges[id] = defaultCountFor(id);
  for (const id of SECTION_IDS) adjustments[id] = { permanent: 0 };
  return { ranges, adjustments };
}

function defaultCountFor(_id: string): OnlineCountRange {
  return { min: 0, max: 0 };
}

async function readConfig(env: Env): Promise<unknown | null> {
  try {
    await ensureAdminSettingsTable(env);
    const row = await env.DB.prepare('SELECT value_json FROM admin_settings WHERE name = ?').bind(KEY).first<AdminSettingRow>();
    if (row?.value_json) return JSON.parse(row.value_json);
  } catch (error) {
    console.warn('read online user counts from admin_settings failed', error);
  }
  return null;
}

async function writeConfig(env: Env, config: OnlineCountConfig): Promise<void> {
  await ensureAdminSettingsTable(env);
  await env.DB.prepare(`INSERT INTO admin_settings (name, value_json, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(name) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP`)
    .bind(KEY, JSON.stringify(config))
    .run();
}

async function ensureAdminSettingsTable(env: Env): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_settings (
    name TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

function normalizeOnlineCountConfig(input: any): OnlineCountConfig {
  const source = input && typeof input === 'object' ? input.ranges ?? input.schedule ?? input : {};
  const defaults = defaultOnlineCountConfig();
  const fallback = defaults.ranges;
  const ranges: OnlineCountRanges = {};
  const adjustments: Record<string, OnlineCountAdjustment> = {};
  for (const id of SECTION_IDS) {
    const value = Array.isArray(source?.[id]) ? source[id][0] : source?.[id];
    ranges[id] = normalizeRange(value, fallback[id]);
    adjustments[id] = normalizeAdjustment(input?.adjustments?.[id]);
  }
  return { ranges, adjustments, updatedAt: typeof input?.updatedAt === 'string' ? input.updatedAt : undefined };
}

async function publishOnlineUserCountConfig(env: Env, config: OnlineCountConfig): Promise<void> {
  const id = env.SECTION_LOCK_EVENTS.idFromName('global');
  const response = await env.SECTION_LOCK_EVENTS.get(id).fetch('https://section-lock-events/publish-online-counts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) throw new Error('Could not publish online counts.');
}

function normalizeAdjustment(value: unknown): OnlineCountAdjustment {
  const raw = value && typeof value === 'object' ? value as { permanent?: unknown; timed?: unknown } : {};
  const permanent = normalizeCount(raw.permanent, 0);
  const timedRaw = raw.timed && typeof raw.timed === 'object'
    ? raw.timed as { min?: unknown; max?: unknown; expiresAt?: unknown }
    : null;
  if (!timedRaw || typeof timedRaw.expiresAt !== 'string' || !Number.isFinite(Date.parse(timedRaw.expiresAt))) return { permanent };
  const range = normalizeRange(timedRaw, { min: 0, max: 0 });
  return { permanent, timed: { ...range, expiresAt: timedRaw.expiresAt } };
}

function normalizeRange(value: unknown, fallback: OnlineCountRange): OnlineCountRange {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const raw = value as { min?: unknown; max?: unknown };
    const min = normalizeCount(raw.min, fallback.min);
    const max = normalizeCount(raw.max, fallback.max);
    return min <= max ? { min, max } : { min: max, max: min };
  }
  const fixed = normalizeCount(value, fallback.min);
  return { min: fixed, max: fixed };
}

function normalizeCount(value: unknown, fallback: number): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.max(0, Math.min(MAX_COUNT, n)) : fallback;
}

function labelForSection(id: string): string {
  const labels: Record<string, string> = { mines: 'Mines', plinko: 'Plinko', wheel: 'Wheel', dice: 'Dice', crash: 'Crash', hilo: 'Chicken Cross', coinflip: 'Pump', slot: 'Slot', ghostrun: 'Ghost Run', predict: 'Predict' };
  return labels[id] || id;
}
