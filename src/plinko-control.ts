import type { Env } from './types';

export type PlinkoRisk = 'low' | 'medium' | 'high';
export type PlinkoRow = '8' | '12' | '16';
export type PlinkoMode = 'weighted';

export interface PlinkoRiskConfig {
  multipliers: number[];
  weights: number[];
}

export interface PlinkoRowsConfig {
  low: PlinkoRiskConfig;
  medium: PlinkoRiskConfig;
  high: PlinkoRiskConfig;
}

export interface PlinkoControlConfig {
  enabled: boolean;
  mode: PlinkoMode;
  houseEdge: number;
  volatility: number;
  rows: Record<PlinkoRow, PlinkoRowsConfig>;
  updatedAt?: string;
}

type AdminSettingRow = { value_json: string };

const KEY = 'admin:plinko-control';

export const PLINKO_ROWS: readonly PlinkoRow[] = ['8', '12', '16'];
export const PLINKO_RISKS: readonly PlinkoRisk[] = ['low', 'medium', 'high'];

const WEIGHTS_8 = [
  0.390625, 3.125, 10.9375, 21.875, 27.34375, 21.875, 10.9375, 3.125, 0.390625,
];
const WEIGHTS_12 = [
  0.0244140625, 0.29296875, 1.611328125, 5.37109375, 12.0849609375,
  19.3359375, 22.55859375, 19.3359375, 12.0849609375, 5.37109375,
  1.611328125, 0.29296875, 0.0244140625,
];
const WEIGHTS_16 = [
  0.00152587890625, 0.0244140625, 0.18310546875, 0.8544921875,
  2.777099609375, 6.6650390625, 12.21923828125, 17.4560546875,
  19.6380615234375, 17.4560546875, 12.21923828125, 6.6650390625,
  2.777099609375, 0.8544921875, 0.18310546875, 0.0244140625,
  0.00152587890625,
];

function riskConfig(multipliers: number[], weights: number[]): PlinkoRiskConfig {
  return { multipliers: multipliers.slice(), weights: weights.slice() };
}

export const DEFAULT_PLINKO_CONTROL: PlinkoControlConfig = {
  enabled: true,
  mode: 'weighted',
  houseEdge: 8,
  volatility: 50,
  rows: {
    '8': {
      low: riskConfig([5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6], WEIGHTS_8),
      medium: riskConfig([13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13], WEIGHTS_8),
      high: riskConfig([29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29], WEIGHTS_8),
    },
    '12': {
      low: riskConfig([10, 3, 1.6, 1.2, 1.11, 1.05, 0.5, 1.05, 1.11, 1.2, 1.6, 3, 10], WEIGHTS_12),
      medium: riskConfig([33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33], WEIGHTS_12),
      high: riskConfig([170, 24, 8.1, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8.1, 24, 170], WEIGHTS_12),
    },
    '16': {
      low: riskConfig([16, 5, 2.5, 1.6, 1.2, 1.09, 1.05, 1, 0.5, 1, 1.05, 1.09, 1.2, 1.6, 2.5, 5, 16], WEIGHTS_16),
      medium: riskConfig([110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110], WEIGHTS_16),
      high: riskConfig([1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000], WEIGHTS_16),
    },
  },
};

export async function getPlinkoControl(env: Env): Promise<PlinkoControlConfig> {
  const saved = await readConfig(env);
  return saved ? normalizePlinkoConfig(saved) : cloneDefault();
}

export async function savePlinkoControl(env: Env, value: unknown): Promise<PlinkoControlConfig> {
  const config = normalizePlinkoConfig(value);
  validatePlinkoChanceTotals(config);
  config.updatedAt = new Date().toISOString();
  await writeConfig(env, config);
  return cloneConfig(config);
}

export async function resetPlinkoControl(env: Env): Promise<PlinkoControlConfig> {
  const config = cloneDefault();
  config.updatedAt = new Date().toISOString();
  await writeConfig(env, config);
  return cloneConfig(config);
}

async function readConfig(env: Env): Promise<unknown | null> {
  try {
    const row = await readConfigRow(env);
    if (row?.value_json) return JSON.parse(row.value_json);
  } catch (error) {
    if (isMissingAdminSettingsError(error)) {
      try {
        await ensureAdminSettingsTable(env);
        const row = await readConfigRow(env);
        if (row?.value_json) return JSON.parse(row.value_json);
      } catch (retryError) {
        console.warn('read plinko control from D1 failed', retryError);
      }
    } else {
      console.warn('read plinko control from D1 failed', error);
    }
  }
  return null;
}

async function readConfigRow(env: Env): Promise<AdminSettingRow | null> {
  return env.DB.prepare('SELECT value_json FROM admin_settings WHERE name = ?').bind(KEY).first<AdminSettingRow>();
}

async function writeConfig(env: Env, config: PlinkoControlConfig): Promise<void> {
  await ensureAdminSettingsTable(env);
  const raw = JSON.stringify(config);
  await env.DB.prepare(`INSERT INTO admin_settings (name, value_json, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(name) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = CURRENT_TIMESTAMP`)
    .bind(KEY, raw)
    .run();
}

async function ensureAdminSettingsTable(env: Env): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_settings (
    name TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

function isMissingAdminSettingsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  return /no such table:\s*admin_settings/i.test(message);
}

function normalizePlinkoConfig(input: any): PlinkoControlConfig {
  const base = cloneDefault();
  const out: PlinkoControlConfig = {
    enabled: input?.enabled !== false,
    mode: 'weighted',
    houseEdge: clampNumber(input?.houseEdge, 0, 60, base.houseEdge),
    volatility: clampNumber(input?.volatility, 0, 100, base.volatility),
    rows: base.rows,
    updatedAt: typeof input?.updatedAt === 'string' ? input.updatedAt : undefined,
  };

  for (const rowKey of PLINKO_ROWS) {
    for (const risk of PLINKO_RISKS) {
      const expected = Number(rowKey) + 1;
      const alias = risk === 'low' ? 'easy' : risk === 'high' ? 'hard' : 'medium';
      const item = input?.rows?.[rowKey]?.[risk] ?? input?.rows?.[rowKey]?.[alias];
      out.rows[rowKey][risk] = {
        multipliers: normalizeNumberArray(item?.multipliers, expected, base.rows[rowKey][risk].multipliers, 0.01, 1000),
        weights: normalizeNumberArray(item?.weights, expected, base.rows[rowKey][risk].weights, 0, 100),
      };
    }
  }
  out.rows['16'].low.multipliers[7] = 1;
  out.rows['16'].low.multipliers[9] = 1;
  return out;
}

function normalizeNumberArray(value: unknown, expected: number, fallback: number[], min: number, max: number): number[] {
  const input = Array.isArray(value) ? value : String(value ?? '').split(',');
  const nums = input.map((v) => clampNumber(v, min, max, NaN)).filter((n) => Number.isFinite(n));
  if (nums.length !== expected) return fallback.slice(0, expected);
  return nums;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function validatePlinkoChanceTotals(config: PlinkoControlConfig): void {
  for (const rowKey of PLINKO_ROWS) {
    for (const risk of PLINKO_RISKS) {
      const total = config.rows[rowKey][risk].weights.reduce((sum, value) => sum + value, 0);
      if (Math.abs(total - 100) > 0.05) {
        throw new Error(`Plinko ${rowKey} ${risk} chances must total exactly 100%.`);
      }
    }
  }
}

function cloneDefault(): PlinkoControlConfig {
  return cloneConfig(DEFAULT_PLINKO_CONTROL);
}

function cloneConfig(config: PlinkoControlConfig): PlinkoControlConfig {
  return JSON.parse(JSON.stringify(config)) as PlinkoControlConfig;
}
