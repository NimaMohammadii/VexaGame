import type { Env } from './types';
import { publishSectionAccess } from './section-lock-events';

const ACCESS_KEY = 'admin:miniapp-section-access';

export const ACCESS_SECTIONS = [
  ['app', 'Entire mini app'],
  ['home', 'Lucky Zone'],
  ['playzone', 'Play Hub'],
  ['wallet', 'Wallet'],
  ['predictzone', 'Predict'],
  ['predict-bitcoin', 'Predict · Bitcoin'],
  ['predict-oil', 'Predict · Oil'],
  ['predict-gold', 'Predict · Gold'],
  ['mines', 'Mines'],
  ['plinko', 'Plinko'],
  ['crash', 'Crash'],
  ['slot', 'Slot'],
  ['wheel', 'Wheel'],
  ['dice', 'Dice'],
  ['coinflip', 'Pump'],
  ['hilo', 'Chicken Cross'],
  ['ghostrun', 'Ghost Run'],
] as const;

export type AccessSectionId = typeof ACCESS_SECTIONS[number][0];
export type SectionLock = { sectionId: AccessSectionId; lockedFrom: number; lockedUntil: number };
type StoredAccess = { locks?: unknown };

const VALID_IDS = new Set<string>(ACCESS_SECTIONS.map(([id]) => id));

export function normalizeAccessSectionId(value: unknown): AccessSectionId | null {
  const id = String(value || '').trim().toLowerCase();
  return VALID_IDS.has(id) ? id as AccessSectionId : null;
}

export async function getSectionAccess(env: Env): Promise<SectionLock[]> {
  const raw = await env.BOT_CACHE.get(ACCESS_KEY).catch(() => null);
  let parsed: StoredAccess = {};
  try { parsed = raw ? JSON.parse(raw) as StoredAccess : {}; } catch { parsed = {}; }
  const now = Math.floor(Date.now() / 1000);
  const seen = new Set<string>();
  const locks = (Array.isArray(parsed.locks) ? parsed.locks : [])
    .map((item): SectionLock | null => {
      const value = (item && typeof item === 'object' ? item : {}) as Partial<SectionLock>;
      const sectionId = normalizeAccessSectionId(value.sectionId);
      const lockedFrom = Math.floor(Number(value.lockedFrom) || 0);
      const lockedUntil = Math.floor(Number(value.lockedUntil) || 0);
      if (!sectionId || lockedUntil <= now || lockedUntil <= lockedFrom || seen.has(sectionId)) return null;
      seen.add(sectionId);
      return { sectionId, lockedFrom, lockedUntil };
    })
    .filter((lock): lock is SectionLock => Boolean(lock));
  if (JSON.stringify(locks) !== JSON.stringify(parsed.locks || [])) await saveSectionAccess(env, locks);
  return locks;
}

export async function setSectionLock(env: Env, sectionIdInput: unknown, minutesInput: unknown): Promise<SectionLock[]> {
  const sectionId = normalizeAccessSectionId(sectionIdInput);
  const minutes = Math.floor(Number(minutesInput));
  if (!sectionId) throw new Error('Unknown mini app section.');
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 43_200) throw new Error('Enter a duration between 1 and 43,200 minutes.');
  const now = Math.floor(Date.now() / 1000);
  const locks = (await getSectionAccess(env)).filter((lock) => lock.sectionId !== sectionId);
  locks.push({ sectionId, lockedFrom: now, lockedUntil: now + minutes * 60 });
  await saveSectionAccess(env, locks);
  await publishSectionAccess(env, locks).catch(() => undefined);
  return locks;
}

export async function clearSectionLock(env: Env, sectionIdInput: unknown): Promise<SectionLock[]> {
  const sectionId = normalizeAccessSectionId(sectionIdInput);
  if (!sectionId) throw new Error('Unknown mini app section.');
  const locks = (await getSectionAccess(env)).filter((lock) => lock.sectionId !== sectionId);
  await saveSectionAccess(env, locks);
  await publishSectionAccess(env, locks).catch(() => undefined);
  return locks;
}

export function isMiniAppAdmin(env: Env, userId: unknown): boolean {
  const user = String(userId || '').trim();
  if (!user) return false;
  return String(env.BOT_ADMIN || '').split(/[\s,;|]+/).some((id) => id && id === user);
}

async function saveSectionAccess(env: Env, locks: SectionLock[]): Promise<void> {
  await env.BOT_CACHE.put(ACCESS_KEY, JSON.stringify({ locks }));
}
