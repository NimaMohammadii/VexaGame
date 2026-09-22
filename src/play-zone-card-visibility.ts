import type { Env } from './types';

export const PLAY_ZONE_CARD_ITEMS = [
  { id: 'mines', label: 'Mines' },
  { id: 'plinko', label: 'Plinko' },
  { id: 'slot', label: 'Slot' },
  { id: 'wheel', label: 'Wheel' },
  { id: 'dice', label: 'Dice' },
  { id: 'crash', label: 'Crash' },
  { id: 'hilo', label: 'Chicken Cross' },
  { id: 'coinflip', label: 'Pump' },
  { id: 'ghostrun', label: 'Ghost Run' },
  { id: 'shellgame', label: 'Shell Game' },
] as const;

export type PlayZoneCardId = typeof PLAY_ZONE_CARD_ITEMS[number]['id'];
export type PlayZoneCardVisibility = {
  cards: Array<{ id: PlayZoneCardId; label: string; visible: boolean }>;
  hiddenIds: PlayZoneCardId[];
};

type PlayZoneCardVisibilityRow = { value_json: string };
type SavedPlayZoneCardVisibility = { hiddenIds?: unknown } | unknown[];

const PLAY_ZONE_CARD_VISIBILITY_KEY = 'admin:play-zone-hidden-cards';
const PLAY_ZONE_CARD_IDS = new Set<string>(PLAY_ZONE_CARD_ITEMS.map((item) => item.id));

export async function getPlayZoneCardVisibility(env: Env): Promise<PlayZoneCardVisibility> {
  const hiddenIds = await readHiddenPlayZoneCardIds(env);
  const hidden = new Set(hiddenIds);
  return {
    hiddenIds,
    cards: PLAY_ZONE_CARD_ITEMS.map((item) => ({ ...item, visible: !hidden.has(item.id) })),
  };
}

export async function setPlayZoneCardVisibility(env: Env, gameId: unknown, visible: unknown): Promise<PlayZoneCardVisibility> {
  const id = normalizePlayZoneCardId(gameId);
  const hidden = new Set(await readHiddenPlayZoneCardIds(env));
  if (Boolean(visible)) hidden.delete(id);
  else hidden.add(id);
  await writeHiddenPlayZoneCardIds(env, [...hidden]);
  return getPlayZoneCardVisibility(env);
}

export function isPlayZoneVisibilityAdmin(env: Env, userId: unknown): boolean {
  return String(env.BOT_ADMIN || '').split(/[\s,;]+/).map((value) => value.trim()).filter(Boolean).includes(String(userId || ''));
}

export function normalizePlayZoneCardId(value: unknown): PlayZoneCardId {
  const id = String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '').trim().toLowerCase();
  if (!PLAY_ZONE_CARD_IDS.has(id)) throw new Error('Unknown Play Zone card');
  return id as PlayZoneCardId;
}

async function readHiddenPlayZoneCardIds(env: Env): Promise<PlayZoneCardId[]> {
  await ensureAdminSettingsTable(env);
  const row = await env.DB.prepare('SELECT value_json FROM admin_settings WHERE name = ?')
    .bind(PLAY_ZONE_CARD_VISIBILITY_KEY)
    .first<PlayZoneCardVisibilityRow>();
  if (!row?.value_json) return [];
  try {
    return normalizeHiddenIds(JSON.parse(row.value_json) as SavedPlayZoneCardVisibility);
  } catch {
    return [];
  }
}

async function writeHiddenPlayZoneCardIds(env: Env, hiddenIds: PlayZoneCardId[]): Promise<void> {
  await ensureAdminSettingsTable(env);
  await env.DB.prepare(`INSERT INTO admin_settings (name, value_json, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(name) DO UPDATE SET
      value_json = excluded.value_json,
      updated_at = CURRENT_TIMESTAMP`)
    .bind(PLAY_ZONE_CARD_VISIBILITY_KEY, JSON.stringify({ hiddenIds: normalizeHiddenIds(hiddenIds) }))
    .run();
}

async function ensureAdminSettingsTable(env: Env): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_settings (
    name TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

function normalizeHiddenIds(value: SavedPlayZoneCardVisibility): PlayZoneCardId[] {
  const rawIds = Array.isArray(value) ? value : Array.isArray(value?.hiddenIds) ? value.hiddenIds : [];
  const ids = rawIds
    .map((item) => String(item ?? '').replace(/[^a-zA-Z0-9_-]/g, '').trim().toLowerCase())
    .filter((id): id is PlayZoneCardId => PLAY_ZONE_CARD_IDS.has(id));
  return [...new Set(ids)];
}
