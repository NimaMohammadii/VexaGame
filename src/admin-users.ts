import type { Env } from './types';
import { getUserLevel } from './levels';
import { ensureTonBalanceColumn, getUserControls } from './user-controls';
import { vexaLocaleForCountry } from './miniapp/i18n';

export type AppUserActivityPayload = {
  userId?: string;
  username?: string | null;
  firstName?: string | null;
  avatarUrl?: string | null;
  section?: string | null;
  countryCode?: string | null;
};

export type AdminGeoSnapshot = {
  countryCode?: string | null;
  timezone?: string | null;
};

type AdminUserRow = {
  telegram_user_id: string;
  first_name: string | null;
  username: string | null;
  current_section: string | null;
  ton_balance_nano: number | null;
  last_seen_at: string | null;
  created_at: string | null;
  source: string | null;
  region_code?: string | null;
  language_code?: string | null;
  region_mode?: string | null;
  timezone?: string | null;
  return_count?: number | null;
  bot_started_at?: string | null;
  app_entered_at?: string | null;
  server_country_code?: string | null;
  server_timezone?: string | null;
  level?: number | null;
  xp?: number | null;
  total_xp?: number | null;
};

export type UserRegionPreference = {
  mode: 'automatic' | 'manual';
  countryCode: string | null;
  languageCode: string | null;
};

type ClientResetState = { resetVersion: string; resetAllVersion: string };
type BulkDeleteResult = { ok: true; deleted: Record<string, number>; kvDeleted: number; resetAllVersion: string };

const CLIENT_RESET_PREFIX = 'miniapp-client-reset:';
const CLIENT_RESET_ALL_KEY = 'miniapp-client-reset:all';
const CLIENT_RESET_TTL_SECONDS = 180 * 24 * 60 * 60;

export async function recordBotStartUser(env: Env, payload: Pick<AppUserActivityPayload, 'userId' | 'username' | 'firstName'>): Promise<void> {
  const userId = String(payload.userId ?? '').trim();
  if (!userId) return;
  const username = cleanText(payload.username, 80);
  const firstName = cleanText(payload.firstName, 120);

  try {
    await ensureUserTrackingColumns(env);
    await env.DB.prepare(`INSERT INTO app_users (telegram_user_id, first_name, username, bot_started_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(telegram_user_id) DO UPDATE SET
        first_name = excluded.first_name,
        username = excluded.username,
        bot_started_at = COALESCE(app_users.bot_started_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP`)
      .bind(userId, firstName, username)
      .run();
  } catch (error) {
    console.error('record bot start user failed', error);
  }
}

export async function trackAppUser(env: Env, payload: AppUserActivityPayload, adminGeo: AdminGeoSnapshot = {}): Promise<{ ok: true; banned: boolean; tonBalanceNano: number; winChancePercent: number; regionPreference: UserRegionPreference; resetVersion: string; resetAllVersion: string; level: Awaited<ReturnType<typeof getUserLevel>> } | { ok: false; error: string }> {
  const userId = String(payload.userId ?? '').trim();
  if (!userId) return { ok: false, error: 'Missing user id' };
  const username = cleanText(payload.username, 80);
  const firstName = cleanText(payload.firstName, 120);
  const section = cleanSection(payload.section);
  const regionCode = cleanCountryCode(payload.countryCode);
  const languageCode = regionCode ? vexaLocaleForCountry(regionCode) : null;
  const serverCountryCode = cleanCountryCode(adminGeo.countryCode);
  const serverTimezone = cleanTimeZone(adminGeo.timezone);

  try {
    await ensureTonBalanceColumn(env);
    await ensureUserRegionColumns(env);
    await ensureUserTrackingColumns(env);
    await env.DB.prepare('ALTER TABLE app_users ADD COLUMN return_count INTEGER NOT NULL DEFAULT 1').run().catch(() => undefined);
    await env.DB.prepare('ALTER TABLE app_users ADD COLUMN avatar_url TEXT').run().catch(() => undefined);
    const [controls, resetState, level] = await Promise.all([
      getUserControls(env, userId),
      getClientResetState(env, userId),
      getUserLevel(env, userId),
    ]);
    const tonBalanceNano = Math.max(0, Math.floor(Number(controls.tonBalanceNano ?? 0) || 0));
    await env.DB.prepare(`INSERT INTO app_users (telegram_user_id, first_name, username, avatar_url, current_section, ton_balance_nano, region_code, language_code, server_country_code, server_timezone, app_entered_at, last_seen_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(telegram_user_id) DO UPDATE SET
        first_name = excluded.first_name,
        username = excluded.username,
        avatar_url = COALESCE(excluded.avatar_url, app_users.avatar_url),
        current_section = excluded.current_section,
        region_code = CASE WHEN COALESCE(app_users.region_mode, 'automatic') = 'manual' THEN app_users.region_code ELSE COALESCE(excluded.region_code, app_users.region_code) END,
        language_code = CASE WHEN COALESCE(app_users.region_mode, 'automatic') = 'manual' THEN app_users.language_code ELSE COALESCE(excluded.language_code, app_users.language_code) END,
        server_country_code = COALESCE(excluded.server_country_code, app_users.server_country_code),
        server_timezone = COALESCE(app_users.server_timezone, excluded.server_timezone),
        return_count = CASE
          WHEN (app_users.app_entered_at IS NOT NULL OR app_users.bot_started_at IS NULL)
            AND datetime(COALESCE(app_users.last_seen_at, app_users.created_at)) < datetime('now', '-30 minutes') THEN COALESCE(app_users.return_count, 1) + 1
          ELSE COALESCE(app_users.return_count, 1)
        END,
        app_entered_at = COALESCE(app_users.app_entered_at, CURRENT_TIMESTAMP),
        last_seen_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP`)
      .bind(userId, firstName, username, cleanAvatarUrl(payload.avatarUrl), section, tonBalanceNano, regionCode, languageCode, serverCountryCode, serverTimezone)
      .run();
    const regionPreference = await getUserRegionPreference(env, userId);
    return { ok: true, banned: controls.banned, tonBalanceNano, winChancePercent: controls.winChancePercent, regionPreference, ...resetState, level };
  } catch (error) {
    console.error('track app user failed', error);
    return { ok: false, error: 'Database is not ready. Run migrations.' };
  }
}

export async function getUserRegionPreference(env: Env, userIdInput: unknown): Promise<UserRegionPreference> {
  const userId = cleanUserId(userIdInput);
  await ensureUserRegionColumns(env);
  const row = await env.DB.prepare('SELECT region_code, language_code, region_mode FROM app_users WHERE telegram_user_id = ? LIMIT 1')
    .bind(userId)
    .first<{ region_code?: string | null; language_code?: string | null; region_mode?: string | null }>();
  const manual = String(row?.region_mode || '').trim().toLowerCase() === 'manual';
  return {
    mode: manual ? 'manual' : 'automatic',
    countryCode: manual ? cleanCountryCode(row?.region_code) : null,
    languageCode: manual ? cleanLocaleCode(row?.language_code) : null,
  };
}

export async function setUserRegionPreference(env: Env, userIdInput: unknown, countryCodeInput: unknown): Promise<UserRegionPreference> {
  const userId = cleanUserId(userIdInput);
  const countryCode = cleanCountryCode(countryCodeInput);
  await ensureTonBalanceColumn(env);
  await ensureUserRegionColumns(env);
  if (!countryCode) {
    await env.DB.prepare(`INSERT INTO app_users (telegram_user_id, region_code, language_code, region_mode, updated_at)
      VALUES (?, NULL, NULL, 'automatic', CURRENT_TIMESTAMP)
      ON CONFLICT(telegram_user_id) DO UPDATE SET region_code = NULL, language_code = NULL, region_mode = 'automatic', updated_at = CURRENT_TIMESTAMP`)
      .bind(userId)
      .run();
    return { mode: 'automatic', countryCode: null, languageCode: null };
  }
  const languageCode = vexaLocaleForCountry(countryCode);
  await env.DB.prepare(`INSERT INTO app_users (telegram_user_id, region_code, language_code, region_mode, updated_at)
    VALUES (?, ?, ?, 'manual', CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_user_id) DO UPDATE SET region_code = excluded.region_code, language_code = excluded.language_code, region_mode = 'manual', updated_at = CURRENT_TIMESTAMP`)
    .bind(userId, countryCode, languageCode)
    .run();
  return { mode: 'manual', countryCode, languageCode };
}

async function ensureUserRegionColumns(env: Env): Promise<void> {
  await env.DB.prepare('ALTER TABLE app_users ADD COLUMN region_code TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE app_users ADD COLUMN language_code TEXT').run().catch(() => undefined);
  await env.DB.prepare("ALTER TABLE app_users ADD COLUMN region_mode TEXT NOT NULL DEFAULT 'automatic'").run().catch(() => undefined);
}

async function ensureUserTrackingColumns(env: Env): Promise<void> {
  await env.DB.prepare('ALTER TABLE app_users ADD COLUMN bot_started_at TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE app_users ADD COLUMN app_entered_at TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE app_users ADD COLUMN server_country_code TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE app_users ADD COLUMN server_timezone TEXT').run().catch(() => undefined);
}

function cleanAvatarUrl(value: unknown): string | null {
  const candidate = String(value || '').trim();
  if (!candidate || candidate.length > 1_500) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

let adminUsersSchemaReady: Promise<void> | null = null;

async function ensureAdminUsersSchema(env: Env): Promise<void> {
  if (!adminUsersSchemaReady) {
    adminUsersSchemaReady = (async () => {
      await ensureTonBalanceColumn(env);
      await ensureUserRegionColumns(env);
      await ensureUserTrackingColumns(env);
      await env.DB.prepare('ALTER TABLE app_users ADD COLUMN timezone TEXT').run().catch(() => undefined);
      await env.DB.prepare('ALTER TABLE app_users ADD COLUMN return_count INTEGER NOT NULL DEFAULT 1').run().catch(() => undefined);
    })().catch((error) => {
      adminUsersSchemaReady = null;
      throw error;
    });
  }
  return adminUsersSchemaReady;
}

function adminRankName(levelInput: unknown): string {
  const level = Math.max(1, Math.floor(Number(levelInput) || 1));
  if (level >= 60) return 'Titan';
  if (level >= 40) return 'Legend';
  if (level >= 25) return 'Master';
  if (level >= 16) return 'Elite';
  if (level >= 10) return 'Pro';
  if (level >= 5) return 'Explorer';
  return 'Rookie';
}

export async function adminUsersJson(env: Env): Promise<{ users: Array<Record<string, unknown>>; stats: Record<string, number> }> {
  await ensureAdminUsersSchema(env);
  const rows = await env.DB.prepare(`SELECT
      u.telegram_user_id,
      u.first_name,
      u.username,
      u.current_section,
      u.ton_balance_nano,
      u.last_seen_at,
      u.created_at,
      'game_bot' AS source,
      u.region_code,
      u.language_code,
      u.region_mode,
      u.timezone,
      u.return_count,
      u.bot_started_at,
      u.app_entered_at,
      u.server_country_code,
      u.server_timezone,
      l.level,
      l.xp,
      l.total_xp
    FROM app_users AS u
    LEFT JOIN user_levels AS l ON l.user_id = u.telegram_user_id
    ORDER BY datetime(COALESCE(u.last_seen_at, u.created_at)) DESC
    LIMIT 700`).all<AdminUserRow>();
  const now = Date.now();
  const users = (rows.results ?? []).map((row) => {
    const lastSeenMs = row.last_seen_at ? Date.parse(row.last_seen_at) : 0;
    const appActivityKnown = Boolean(row.app_entered_at) || !row.bot_started_at;
    const online = appActivityKnown && lastSeenMs > 0 && now - lastSeenMs <= 90_000;
    const tonBalanceNano = Number(row.ton_balance_nano ?? 0);
    const level = Math.max(1, Math.floor(Number(row.level) || 1));
    const xp = Math.max(0, Math.floor(Number(row.xp) || 0));
    const totalXp = Math.max(0, Math.floor(Number(row.total_xp) || 0));
    const selectedRegionCode = String(row.region_mode || '').trim().toLowerCase() === 'manual' ? cleanCountryCode(row.region_code) : null;
    const serverRegionCode = cleanCountryCode(row.server_country_code);
    const storedRegionCode = cleanCountryCode(row.region_code);
    const regionCode = selectedRegionCode || serverRegionCode || storedRegionCode || regionKeyFromRow(row.region_code, row.language_code);
    const regionSource = selectedRegionCode ? 'انتخاب‌شده' : serverRegionCode ? 'واقعی' : 'ثبت‌شده';
    const timezone = cleanTimeZone(row.server_timezone) || '';
    return {
      id: row.telegram_user_id,
      username: row.username ? '@' + row.username.replace(/^@+/, '') : '—',
      firstName: row.first_name || '—',
      isActive: online,
      status: online ? 'Online' : 'Inactive',
      currentSection: row.current_section || 'unknown',
      tonBalanceNano,
      tonBalance: formatTon(tonBalanceNano),
      level,
      xp,
      totalXp,
      rankName: adminRankName(level),
      lastSeenAt: row.last_seen_at,
      createdAt: row.created_at,
      botStartedAt: row.bot_started_at || null,
      appEnteredAt: row.app_entered_at || null,
      source: row.source || 'unknown',
      sourceLabel: sourceLabel(row.source || 'unknown'),
      regionCode,
      regionLabel: `${regionLabel(regionCode)} (${regionCode}) · ${regionSource}\nتایم‌زون: ${timezone || 'نامشخص'}`,
      regionSource,
      languageCode: row.language_code || '',
      timezone,
      returnCount: Math.max(1, Math.floor(Number(row.return_count) || 1)),
    };
  });
  const online = users.filter((user) => user.isActive).length;
  const gameBot = users.filter((user) => user.source === 'game_bot').length;
  const userBot = users.filter((user) => user.source === 'user_bot').length;
  const totalTonBalanceNano = users.reduce((sum, user) => sum + Number(user.tonBalanceNano || 0), 0);
  return { users, stats: { total: users.length, online, inactive: users.length - online, gameBot, userBot, totalTonBalanceNano } };
}

export async function resetUserEverywhere(env: Env, userIdInput: unknown): Promise<{ ok: true; userId: string; deleted: Record<string, number>; kvDeleted: number; resetVersion: string }> {
  const userId = cleanUserId(userIdInput);
  const deleted: Record<string, number> = {};
  for (const [table, column] of userTableDeletes()) {
    deleted[table] = await safeDelete(env, table, column, userId);
  }
  const kvDeleted = await deleteUserKv(env, userId);
  const resetVersion = await markClientReset(env, userId);
  return { ok: true, userId, deleted, kvDeleted, resetVersion };
}

export async function resetAllUsersEverywhere(env: Env): Promise<BulkDeleteResult> {
  const deleted: Record<string, number> = {};
  for (const [table] of userTableDeletes()) {
    deleted[table] = await safeDeleteAll(env, table);
  }
  const kvDeleted = await deleteAllUserKv(env);
  const resetAllVersion = await markAllClientReset(env);
  return { ok: true, deleted, kvDeleted, resetAllVersion };
}

function userTableDeletes(): Array<[string, string]> {
  return [
    ['app_users', 'telegram_user_id'],
    ['user_controls', 'user_id'],
    ['ton_transactions', 'user_id'],
    ['ton_withdrawals', 'user_id'],
    ['stars_deposits', 'user_id'],
    ['user_levels', 'user_id'],
    ['xp_events', 'user_id'],
    ['daily_reward_claims', 'user_id'],
    ['daily_reward_events', 'user_id'],
    ['daily_rewards_claims', 'user_id'],
    ['daily_rewards_events', 'user_id'],
    ['predict_bets', 'user_id'],
    ['predict_entries', 'user_id'],
    ['crash_bets', 'user_id'],
    ['plinko_rounds', 'user_id'],
    ['mines_rounds', 'user_id'],
    ['dice_rounds', 'user_id'],
  ];
}

async function safeDelete(env: Env, table: string, column: string, userId: string): Promise<number> {
  try {
    const result = await env.DB.prepare(`DELETE FROM ${table} WHERE ${column} = ?`).bind(userId).run();
    return Number(result.meta?.changes || 0);
  } catch {
    return 0;
  }
}

async function safeDeleteAll(env: Env, table: string): Promise<number> {
  try {
    const result = await env.DB.prepare(`DELETE FROM ${table}`).run();
    return Number(result.meta?.changes || 0);
  } catch {
    return 0;
  }
}

async function deleteUserKv(env: Env, userId: string): Promise<number> {
  const keys = new Set<string>([
    `admin:user-controls:${userId}`,
    `vexaUserControls:${userId}`,
  ]);
  await collectKvByPrefix(env, `image-mode:`, keys, userId);
  let count = 0;
  for (const key of keys) {
    try { await env.BOT_CACHE.delete(key); count++; } catch {}
  }
  return count;
}

async function deleteAllUserKv(env: Env): Promise<number> {
  const prefixes = [
    'admin:user-controls:',
    'vexaUserControls:',
    'image-mode:',
  ];
  let count = 0;
  for (const prefix of prefixes) count += await deleteKvByPrefix(env, prefix);
  return count;
}

async function getClientResetState(env: Env, userId: string): Promise<ClientResetState> {
  const cleanId = cleanUserId(userId);
  const [resetVersion, resetAllVersion] = await Promise.all([
    env.BOT_CACHE.get(`${CLIENT_RESET_PREFIX}${cleanId}`).catch(() => ''),
    env.BOT_CACHE.get(CLIENT_RESET_ALL_KEY).catch(() => ''),
  ]);
  return { resetVersion: resetVersion || '', resetAllVersion: resetAllVersion || '' };
}

async function markClientReset(env: Env, userId: string): Promise<string> {
  const version = resetVersion();
  await env.BOT_CACHE.put(`${CLIENT_RESET_PREFIX}${userId}`, version, { expirationTtl: CLIENT_RESET_TTL_SECONDS }).catch(() => undefined);
  return version;
}

async function markAllClientReset(env: Env): Promise<string> {
  const version = resetVersion();
  await env.BOT_CACHE.put(CLIENT_RESET_ALL_KEY, version, { expirationTtl: CLIENT_RESET_TTL_SECONDS }).catch(() => undefined);
  return version;
}

function resetVersion(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function deleteKvByPrefix(env: Env, prefix: string): Promise<number> {
  let count = 0;
  try {
    let cursor: string | undefined;
    for (let i = 0; i < 20; i++) {
      const page = await env.BOT_CACHE.list({ prefix, cursor, limit: 1000 });
      for (const item of page.keys) {
        try { await env.BOT_CACHE.delete(item.name); count++; } catch {}
      }
      if (page.list_complete) break;
      cursor = page.cursor;
    }
  } catch {}
  return count;
}

async function collectKvByPrefix(env: Env, prefix: string, keys: Set<string>, userId: string): Promise<void> {
  try {
    let cursor: string | undefined;
    for (let i = 0; i < 6; i++) {
      const page = await env.BOT_CACHE.list({ prefix, cursor, limit: 1000 });
      for (const item of page.keys) if (item.name.includes(userId)) keys.add(item.name);
      if (page.list_complete) break;
      cursor = page.cursor;
    }
  } catch {}
}

function sourceLabel(source: string): string {
  if (source === 'game_bot') return 'Game Bot';
  if (source === 'user_bot') return 'User Bot';
  return source || 'Unknown';
}

function formatTon(nano: number): string {
  const value = Math.max(0, Math.floor(Number(nano) || 0)) / 1_000_000_000;
  return value.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1') + ' TON';
}

function cleanText(value: unknown, max: number): string | null {
  const text = String(value ?? '').replace(/[<>]/g, '').trim();
  return text ? text.slice(0, max) : null;
}

function cleanCountryCode(value: unknown): string | null {
  const code = String(value || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}

function cleanLocaleCode(value: unknown): string | null {
  const code = String(value || '').trim();
  return /^[A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(code) ? code : null;
}

function cleanTimeZone(value: unknown): string | null {
  const zone = String(value || '').trim().slice(0, 80);
  if (!zone) return null;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(0);
    return zone;
  } catch {
    return null;
  }
}

function cleanSection(value: unknown): string {
  const text = String(value ?? 'home').replace(/[^a-zA-Z0-9_-]/g, '').trim().slice(0, 40);
  return text || 'home';
}

function cleanUserId(value: unknown): string {
  const id = String(value ?? '').replace(/[^0-9A-Za-z_-]/g, '').trim().slice(0, 80);
  if (!id) throw new Error('Missing user id');
  return id;
}

function regionKeyFromRow(regionCode: unknown, languageCode: unknown): string {
  const region = String(regionCode || '').toUpperCase();
  if (/^[A-Z]{2}$/.test(region)) return region;
  const language = String(languageCode || '').trim().toLowerCase();
  if (language === 'fa') return 'IR';
  if (language === 'tr') return 'TR';
  if (language === 'ru') return 'RU';
  return 'EN';
}

function regionLabel(code: string): string {
  if (code === 'EN') return 'English / Global';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code || 'Unknown';
  }
}
