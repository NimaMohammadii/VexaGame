import app from './index';
import type { Env } from './types';
import { adjustUserTonBalance, debitUserTonBalanceIfEnough, getUserControls } from './user-controls';
import { gameBotToken, validateTelegramInitData } from './utils';
import { getSectionAccess, isMiniAppAdmin } from './section-access';

const CACHE_NONE = 'no-store';
const NANO = 1_000_000_000;
const PLATFORM_FEE_BPS = 500;
const DISCOVERY_LIMIT = 80;
const DISCOVERY_SOURCE = 'https://gamma-api.polymarket.com';
const PICKS = new Set(['yes', 'no']);
const SPORT_PATTERN = /\b(sports?|soccer|football|nba|nfl|mlb|nhl|ufc|mma|tennis|golf|hockey|cricket|baseball|basketball|volleyball|formula\s*1|f1|esports?)\b/i;
const CATEGORY_PATTERNS: Record<PredictionEventCategory, RegExp> = {
  world: /\b(world|global|geopolitic|geopolitics|politic|politics|election|government|war|international|middle east|europe|asia|united nations|diplomac)\b/i,
  tech: /\b(tech|technology|artificial intelligence|\bai\b|openai|anthropic|google|apple|microsoft|tesla|space|science|nasa|robot|software|hardware|chip|semiconductor)\b/i,
  culture: /\b(culture|entertainment|movie|film|television|\btv\b|music|celebrity|award|oscars?|grammys?|pop culture|fashion)\b/i,
};

export type PredictionEventCategory = 'world' | 'tech' | 'culture';
export type PredictionEventStatus = 'draft' | 'open' | 'locked' | 'settling' | 'settled' | 'refunding' | 'refunded';
type PredictionPick = 'yes' | 'no';
type EventRow = {
  id: string;
  source_market_id: string;
  source_url: string;
  category: string;
  question: string;
  description: string | null;
  closes_at: string;
  resolution_source: string | null;
  status: string;
  result: string | null;
  featured: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  settled_at: string | null;
};
type EventBetRow = {
  id: string;
  event_id: string;
  user_id: string;
  pick: string;
  stake_nano: number;
  status: string;
  payout_nano: number;
  created_at: string;
  settled_at: string | null;
};
type GammaMarket = Record<string, unknown>;

app.get('/app/api/prediction-events', async (c) => {
  try {
    await ensurePredictionEventTables(c.env);
    const claimedUserId = cleanUserIdOptional(c.req.query('userId'));
    const userId = claimedUserId ? await authenticateUser(c.env, claimedUserId, c.req.header('x-telegram-init-data') || c.req.query('initData')) : '';
    const lockedCategories = isMiniAppAdmin(c.env, userId) ? new Set<string>() : new Set((await getSectionAccess(c.env)).map((lock) => lock.sectionId.replace(/^predict-/, '')));
    const rows = await c.env.DB.prepare("SELECT * FROM prediction_events WHERE status != 'draft' ORDER BY featured DESC, datetime(closes_at) ASC, datetime(created_at) DESC LIMIT 50").all<EventRow>();
    const available = (rows.results || []).filter((row) => !lockedCategories.has(String(row.category || '').toLowerCase()));
    return c.json({ ok: true, events: await Promise.all(available.map((row) => predictionEventJson(c.env, row, userId))), userControls: userId ? await getUserControls(c.env, userId) : null }, 200, { 'cache-control': CACHE_NONE });
  } catch (error) {
    return c.json({ ok: false, error: messageOf(error, 'Could not load predictions') }, 400, { 'cache-control': CACHE_NONE });
  }
});

app.post('/app/api/prediction-events/bet', async (c) => {
  let betId = '';
  try {
    await ensurePredictionEventTables(c.env);
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const eventId = cleanDbText(body.eventId, 'Missing prediction id');
    const userId = await authenticateUser(c.env, body.userId, body.initData);
    const pick = normalizePick(body.pick);
    const stakeNano = tonToNano(body.stakeTon);
    if (stakeNano <= 0) throw new Error('Enter a valid GRAM amount');

    const event = await c.env.DB.prepare('SELECT * FROM prediction_events WHERE id = ?').bind(eventId).first<EventRow>();
    if (!event) throw new Error('Prediction not found');
    if (!isMiniAppAdmin(c.env, userId) && (await getSectionAccess(c.env)).some((lock) => lock.sectionId === `predict-${event.category}`)) throw new Error('This prediction category is temporarily locked');
    if (!isEventOpen(event)) throw new Error('This prediction is closed');

    let existing = await c.env.DB.prepare("SELECT * FROM prediction_event_bets WHERE event_id = ? AND user_id = ? AND status != 'failed' ORDER BY datetime(created_at) DESC LIMIT 1").bind(eventId, userId).first<EventBetRow>();
    if (existing) {
      if (existing.status !== 'pending') throw new Error('You already placed a prediction for this event');
      if (existing.pick !== pick || Number(existing.stake_nano || 0) !== stakeNano) throw new Error('A previous prediction is still processing. Retry the same prediction.');
      betId = existing.id;
    } else {
      betId = 'pebet_' + crypto.randomUUID().replace(/-/g, '').slice(0, 22);
      const inserted = await c.env.DB.prepare("INSERT INTO prediction_event_bets (id,event_id,user_id,pick,stake_nano,status,payout_nano,created_at) SELECT ?,?,?,?,?,'pending',0,CURRENT_TIMESTAMP WHERE NOT EXISTS (SELECT 1 FROM prediction_event_bets WHERE event_id=? AND user_id=? AND status != 'failed')").bind(betId, eventId, userId, pick, stakeNano, eventId, userId).run();
      if ((inserted.meta?.changes || 0) <= 0) {
        existing = await c.env.DB.prepare("SELECT * FROM prediction_event_bets WHERE event_id = ? AND user_id = ? AND status != 'failed' ORDER BY datetime(created_at) DESC LIMIT 1").bind(eventId, userId).first<EventBetRow>();
        if (!existing || existing.status !== 'pending' || existing.pick !== pick || Number(existing.stake_nano || 0) !== stakeNano) throw new Error('You already placed a prediction for this event');
        betId = existing.id;
      }
    }

    await debitUserTonBalanceIfEnough(c.env, userId, stakeNano, { kind: 'predict', title: 'Vexa event prediction stake', referenceId: betId, referenceType: 'prediction_event_bet', metadata: { eventId, pick } });
    const active = await c.env.DB.prepare("UPDATE prediction_event_bets SET status = 'active' WHERE id = ? AND status = 'pending'").bind(betId).run();
    if ((active.meta?.changes || 0) <= 0) {
      const fresh = await c.env.DB.prepare('SELECT * FROM prediction_event_bets WHERE id = ?').bind(betId).first<EventBetRow>();
      if (!fresh || fresh.status !== 'active') {
        await adjustUserTonBalance(c.env, userId, stakeNano, { kind: 'predict', title: 'Vexa event prediction rollback', referenceId: betId, referenceType: 'prediction_event_bet', metadata: { eventId, pick, status: 'rollback' } });
        throw new Error('Could not activate prediction');
      }
    }
    const freshEvent = await c.env.DB.prepare('SELECT * FROM prediction_events WHERE id = ?').bind(eventId).first<EventRow>();
    return c.json({ ok: true, bet: await getEventBet(c.env, betId), event: freshEvent ? await predictionEventJson(c.env, freshEvent, userId) : null }, 200, { 'cache-control': CACHE_NONE });
  } catch (error) {
    if (betId) await c.env.DB.prepare("UPDATE prediction_event_bets SET status = 'failed' WHERE id = ? AND status = 'pending'").bind(betId).run().catch(() => undefined);
    return c.json({ ok: false, error: messageOf(error, 'Could not place prediction') }, 400, { 'cache-control': CACHE_NONE });
  }
});

export async function ensurePredictionEventTables(env: Env): Promise<void> {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS prediction_events (id TEXT PRIMARY KEY, source_market_id TEXT NOT NULL UNIQUE, source_url TEXT NOT NULL, category TEXT NOT NULL, question TEXT NOT NULL, description TEXT, closes_at TEXT NOT NULL, resolution_source TEXT, status TEXT NOT NULL DEFAULT 'draft', result TEXT, featured INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, published_at TEXT, settled_at TEXT)").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_prediction_events_status_close ON prediction_events(status, closes_at)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS prediction_event_bets (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, user_id TEXT NOT NULL, pick TEXT NOT NULL, stake_nano INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'active', payout_nano INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, settled_at TEXT)").run();
  await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_prediction_event_bets_one_user_event ON prediction_event_bets(event_id,user_id) WHERE status != 'failed'").run();
  await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_prediction_event_bets_event ON prediction_event_bets(event_id)").run();
}

export async function discoverPolymarketPredictions(category: PredictionEventCategory): Promise<DiscoveredPrediction[]> {
  const normalized = normalizeCategory(category);
  const url = new URL('/markets', DISCOVERY_SOURCE);
  url.searchParams.set('active', 'true');
  url.searchParams.set('closed', 'false');
  url.searchParams.set('limit', String(DISCOVERY_LIMIT));
  url.searchParams.set('order', 'volume24hr');
  url.searchParams.set('ascending', 'false');
  const response = await fetch(url.toString(), { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Polymarket discovery is unavailable (HTTP ' + response.status + ')');
  const payload = await response.json() as unknown;
  const markets = Array.isArray(payload) ? payload : [];
  return markets.map((market) => discoveredPredictionFromGamma(market as GammaMarket)).filter((market): market is DiscoveredPrediction => Boolean(market)).filter((market) => isAllowedCategory(market, normalized)).slice(0, 8);
}

export type DiscoveredPrediction = {
  sourceMarketId: string;
  sourceUrl: string;
  category: PredictionEventCategory;
  question: string;
  description: string;
  closesAt: string;
};

export async function importPolymarketPrediction(env: Env, sourceMarketId: string): Promise<EventRow> {
  await ensurePredictionEventTables(env);
  const id = cleanSourceMarketId(sourceMarketId);
  const source = await fetchGammaMarket(id);
  const candidate = discoveredPredictionFromGamma(source);
  if (!candidate || SPORT_PATTERN.test(candidate.question + ' ' + candidate.description)) throw new Error('This market is not eligible');
  const existing = await env.DB.prepare('SELECT * FROM prediction_events WHERE source_market_id = ?').bind(candidate.sourceMarketId).first<EventRow>();
  if (existing) return existing;
  const eventId = 'pev_' + crypto.randomUUID().replace(/-/g, '').slice(0, 22);
  await env.DB.prepare("INSERT INTO prediction_events (id,source_market_id,source_url,category,question,description,closes_at,resolution_source,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'draft',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)").bind(eventId, candidate.sourceMarketId, candidate.sourceUrl, candidate.category, candidate.question, candidate.description || null, candidate.closesAt, candidate.sourceUrl).run();
  const created = await env.DB.prepare('SELECT * FROM prediction_events WHERE id = ?').bind(eventId).first<EventRow>();
  if (!created) throw new Error('Could not import prediction');
  return created;
}

export async function listPredictionEvents(env: Env, includeDrafts = true): Promise<EventRow[]> {
  await ensurePredictionEventTables(env);
  const where = includeDrafts ? '' : "WHERE status != 'draft'";
  const rows = await env.DB.prepare('SELECT * FROM prediction_events ' + where + ' ORDER BY CASE status WHEN \'open\' THEN 0 WHEN \'draft\' THEN 1 ELSE 2 END, datetime(closes_at) ASC, datetime(created_at) DESC LIMIT 40').all<EventRow>();
  return rows.results || [];
}

export async function getPredictionEvent(env: Env, eventId: string): Promise<EventRow | null> {
  await ensurePredictionEventTables(env);
  return env.DB.prepare('SELECT * FROM prediction_events WHERE id = ?').bind(cleanDbText(eventId, 'Prediction not found')).first<EventRow>();
}

export async function updatePredictionEvent(env: Env, eventId: string, patch: { question?: unknown; closesAt?: unknown; resolutionSource?: unknown }): Promise<EventRow> {
  await ensurePredictionEventTables(env);
  const current = await getPredictionEvent(env, eventId);
  if (!current) throw new Error('Prediction not found');
  if (current.status !== 'draft') throw new Error('Only drafts can be edited');
  const question = patch.question === undefined ? current.question : cleanQuestion(patch.question);
  if (SPORT_PATTERN.test(question)) throw new Error('Sports predictions are not allowed');
  const closesAt = patch.closesAt === undefined ? current.closes_at : normalizeFutureDate(patch.closesAt);
  const resolutionSource = patch.resolutionSource === undefined ? current.resolution_source : cleanResolutionSource(patch.resolutionSource);
  await env.DB.prepare('UPDATE prediction_events SET question = ?, closes_at = ?, resolution_source = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(question, closesAt, resolutionSource, current.id).run();
  const updated = await getPredictionEvent(env, current.id);
  if (!updated) throw new Error('Prediction not found');
  return updated;
}

export async function publishPredictionEvent(env: Env, eventId: string): Promise<EventRow> {
  await ensurePredictionEventTables(env);
  const current = await getPredictionEvent(env, eventId);
  if (!current) throw new Error('Prediction not found');
  if (current.status !== 'draft') throw new Error('Only drafts can be published');
  if (SPORT_PATTERN.test(current.question + ' ' + String(current.description || ''))) throw new Error('Sports predictions are not allowed');
  if (Date.parse(current.closes_at) <= Date.now()) throw new Error('Close time must be in the future');
  if (!current.resolution_source) throw new Error('Set the resolution source before publishing');
  await env.DB.prepare("UPDATE prediction_events SET status = 'open', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'draft'").bind(current.id).run();
  return (await getPredictionEvent(env, current.id))!;
}

export async function unpublishPredictionEvent(env: Env, eventId: string): Promise<EventRow> {
  await ensurePredictionEventTables(env);
  const current = await getPredictionEvent(env, eventId);
  if (!current) throw new Error('Prediction not found');
  if (current.status !== 'open') throw new Error('Only open predictions can be unpublished');
  const count = await countEventBets(env, current.id);
  if (count > 0) throw new Error('Predictions with bets must be refunded, not unpublished');
  await env.DB.prepare("UPDATE prediction_events SET status = 'draft', published_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'open'").bind(current.id).run();
  return (await getPredictionEvent(env, current.id))!;
}

export async function settlePredictionEvent(env: Env, eventId: string, result: PredictionPick): Promise<void> {
  await ensurePredictionEventTables(env);
  const current = await getPredictionEvent(env, eventId);
  if (!current) throw new Error('Prediction not found');
  if (current.status === 'settled') return;
  if (current.status === 'refunded') throw new Error('Prediction is already refunded');
  const lock = await env.DB.prepare("UPDATE prediction_events SET status = 'settling', result = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('open','locked','settling')").bind(result, current.id).run();
  if ((lock.meta?.changes || 0) <= 0) throw new Error('This prediction cannot be settled');
  const all = (await env.DB.prepare('SELECT * FROM prediction_event_bets WHERE event_id = ?').bind(current.id).all<EventBetRow>()).results || [];
  const eligible = all.filter((bet) => bet.status !== 'failed' && bet.status !== 'pending');
  const processing = eligible.filter((bet) => bet.status === 'active' || bet.status === 'settling_payment');
  const winners = eligible.filter((bet) => bet.pick === result);
  const winnerPool = sumStakes(winners);
  if (winnerPool <= 0) {
    for (const bet of processing) await payEventBet(env, bet, Number(bet.stake_nano || 0), 'refunded');
    if (await countUnpaidEventBets(env, current.id) <= 0) await env.DB.prepare("UPDATE prediction_events SET status = 'refunded', result = NULL, settled_at = COALESCE(settled_at,CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(current.id).run();
    return;
  }
  const loserPool = sumStakes(eligible.filter((bet) => bet.pick !== result));
  const distributable = Math.max(0, loserPool - Math.floor(loserPool * PLATFORM_FEE_BPS / 10000));
  for (const bet of processing) {
    const stake = Number(bet.stake_nano || 0);
    if (bet.pick === result) await payEventBet(env, bet, stake + Math.floor(stake / winnerPool * distributable), 'won');
    else await env.DB.prepare("UPDATE prediction_event_bets SET status = 'lost', payout_nano = 0, settled_at = CURRENT_TIMESTAMP WHERE id = ? AND status = 'active'").bind(bet.id).run();
  }
  if (await countUnpaidEventBets(env, current.id) <= 0) await env.DB.prepare("UPDATE prediction_events SET status = 'settled', result = ?, settled_at = COALESCE(settled_at,CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(result, current.id).run();
}

export async function refundPredictionEvent(env: Env, eventId: string): Promise<void> {
  await ensurePredictionEventTables(env);
  const current = await getPredictionEvent(env, eventId);
  if (!current) throw new Error('Prediction not found');
  if (current.status === 'settled' || current.status === 'refunded') throw new Error('This prediction is already final');
  const lock = await env.DB.prepare("UPDATE prediction_events SET status = 'refunding', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status NOT IN ('settled','refunded')").bind(current.id).run();
  if ((lock.meta?.changes || 0) <= 0) return;
  const bets = (await env.DB.prepare("SELECT * FROM prediction_event_bets WHERE event_id = ? AND status IN ('active','settling_payment')").bind(current.id).all<EventBetRow>()).results || [];
  for (const bet of bets) await payEventBet(env, bet, Number(bet.stake_nano || 0), 'refunded');
  if (await countUnpaidEventBets(env, current.id) <= 0) await env.DB.prepare("UPDATE prediction_events SET status = 'refunded', result = NULL, settled_at = COALESCE(settled_at,CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(current.id).run();
}

function discoveredPredictionFromGamma(raw: GammaMarket): DiscoveredPrediction | null {
  const id = cleanSourceMarketIdOptional(raw.id || raw.marketId);
  const question = cleanQuestionOptional(raw.question || raw.title);
  const eventSlug = cleanSlug(raw.eventSlug || raw.event_slug);
  const marketSlug = cleanSlug(raw.slug || raw.marketSlug || raw.market_slug);
  const outcomes = parseOutcomes(raw.outcomes);
  const closesAt = normalizeGammaDate(raw.endDate || raw.end_date || raw.closeTime || raw.endDateIso);
  if (!id || !question || outcomes.length !== 2 || !outcomes.some((value) => /^yes$/i.test(value)) || !outcomes.some((value) => /^no$/i.test(value)) || !closesAt) return null;
  const description = cleanDescription(raw.description || raw.eventDescription || '');
  const category = categoryForText(question + ' ' + description + ' ' + tagsText(raw.tags) + ' ' + String(raw.category || ''));
  const sourceUrl = eventSlug ? 'https://polymarket.com/event/' + encodeURIComponent(eventSlug) : marketSlug ? 'https://polymarket.com/market/' + encodeURIComponent(marketSlug) : 'https://polymarket.com/market/' + encodeURIComponent(id);
  return { sourceMarketId: id, sourceUrl, category, question, description, closesAt };
}

async function fetchGammaMarket(id: string): Promise<GammaMarket> {
  const response = await fetch(DISCOVERY_SOURCE + '/markets/' + encodeURIComponent(id), { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error('Polymarket market is unavailable (HTTP ' + response.status + ')');
  const payload = await response.json() as unknown;
  return (Array.isArray(payload) ? payload[0] : payload) as GammaMarket;
}

function isAllowedCategory(market: DiscoveredPrediction, selected: PredictionEventCategory): boolean {
  const text = market.question + ' ' + market.description + ' ' + market.category;
  return !SPORT_PATTERN.test(text) && (market.category === selected || CATEGORY_PATTERNS[selected].test(text));
}

function categoryForText(text: string): PredictionEventCategory {
  if (CATEGORY_PATTERNS.tech.test(text)) return 'tech';
  if (CATEGORY_PATTERNS.culture.test(text)) return 'culture';
  return 'world';
}

function parseOutcomes(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') {
    try { return parseOutcomes(JSON.parse(value)); } catch { return value.split(',').map((item) => item.trim().replace(/^"|"$/g, '')).filter(Boolean); }
  }
  return [];
}

function tagsText(value: unknown): string {
  if (!Array.isArray(value)) return '';
  return value.map((tag) => {
    if (typeof tag === 'string') return tag;
    const item = tag && typeof tag === 'object' ? tag as Record<string, unknown> : {};
    return [item.label, item.slug, item.name].filter(Boolean).join(' ');
  }).join(' ');
}

function cleanSourceMarketId(value: unknown): string { const id = cleanSourceMarketIdOptional(value); if (!id) throw new Error('Invalid Polymarket market id'); return id; }
function cleanSourceMarketIdOptional(value: unknown): string { const id = String(value || '').trim().replace(/[^A-Za-z0-9_-]/g, '').slice(0, 36); return id || ''; }
function cleanSlug(value: unknown): string { return String(value || '').trim().replace(/[^A-Za-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 160); }
function normalizeGammaDate(value: unknown): string | null { const date = new Date(String(value || '').trim()); return Number.isFinite(date.getTime()) && date.getTime() > Date.now() ? date.toISOString() : null; }
function normalizeCategory(value: unknown): PredictionEventCategory { const category = String(value || '').trim().toLowerCase(); if (category === 'world' || category === 'tech' || category === 'culture') return category; throw new Error('Invalid discovery category'); }
function normalizePick(value: unknown): PredictionPick { const pick = String(value || '').trim().toLowerCase(); if (PICKS.has(pick)) return pick as PredictionPick; throw new Error('Choose Yes or No'); }
function normalizeFutureDate(value: unknown): string { const date = new Date(String(value || '').trim()); if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new Error('Close time must be in the future'); return date.toISOString(); }
function cleanQuestion(value: unknown): string { const question = cleanQuestionOptional(value); if (!question) throw new Error('Question is required'); return question; }
function cleanQuestionOptional(value: unknown): string { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 220); }
function cleanDescription(value: unknown): string { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 600); }
function cleanResolutionSource(value: unknown): string | null { const url = String(value || '').trim(); if (!url) return null; try { const parsed = new URL(url); if (parsed.protocol !== 'https:') throw new Error(); return parsed.toString().slice(0, 500); } catch { throw new Error('Resolution source must be an HTTPS URL'); } }
function cleanUserId(value: unknown): string { const id = cleanUserIdOptional(value); if (!id) throw new Error('Missing user id'); return id; }
function cleanUserIdOptional(value: unknown): string { return String(value || '').replace(/[^0-9A-Za-z_-]/g, '').trim().slice(0, 80); }
function cleanDbText(value: unknown, message: string): string { const text = String(value || '').trim().slice(0, 120); if (!text) throw new Error(message); return text; }
function tonToNano(value: unknown): number { const n = Number(value); return Number.isFinite(n) && n > 0 ? Math.max(1, Math.floor(n * NANO)) : 0; }
function nanoToTon(value: number): number { return Math.floor(Number(value || 0)) / NANO; }
function isEventOpen(event: EventRow): boolean { return event.status === 'open' && Date.parse(event.closes_at) > Date.now(); }
function sumStakes(bets: EventBetRow[]): number { return bets.reduce((sum, bet) => sum + Number(bet.stake_nano || 0), 0); }
function messageOf(error: unknown, fallback: string): string { return error instanceof Error ? error.message : fallback; }

async function authenticateUser(env: Env, claimed: unknown, initData: unknown): Promise<string> {
  const requested = cleanUserId(claimed);
  const verified = await validateTelegramInitData(initData, gameBotToken(env));
  if (verified !== requested) throw new Error('Telegram user mismatch');
  return verified;
}

async function predictionEventJson(env: Env, row: EventRow, userId: string) {
  const pools = await eventPoolsJson(env, row.id);
  const bet = userId ? await env.DB.prepare("SELECT * FROM prediction_event_bets WHERE event_id = ? AND user_id = ? AND status != 'failed' ORDER BY datetime(created_at) DESC LIMIT 1").bind(row.id, cleanUserIdOptional(userId)).first<EventBetRow>() : null;
  const status = row.status === 'open' && Date.parse(row.closes_at) <= Date.now() ? 'locked' : row.status;
  return { id: row.id, category: row.category, question: row.question, description: row.description || '', closesAt: row.closes_at, resolutionSource: row.resolution_source || null, sourceUrl: row.source_url, status, result: row.result || null, featured: Number(row.featured || 0) === 1, locked: status !== 'open', remainingMs: Math.max(0, Date.parse(row.closes_at) - Date.now()), pools, userBet: bet ? eventBetJson(bet) : null, settledAt: row.settled_at || null };
}

async function eventPoolsJson(env: Env, eventId: string) {
  const rows = await env.DB.prepare("SELECT pick,SUM(stake_nano) AS stakeNano,COUNT(*) AS count FROM prediction_event_bets WHERE event_id = ? AND status = 'active' GROUP BY pick").bind(eventId).all<{ pick: string; stakeNano: number; count: number }>();
  const pools = { yes: poolItem(0, 0), no: poolItem(0, 0) };
  for (const row of rows.results || []) if (row.pick === 'yes' || row.pick === 'no') pools[row.pick] = poolItem(Number(row.stakeNano || 0), Number(row.count || 0));
  return pools;
}
function poolItem(stakeNano: number, count: number) { return { stakeNano, stakeTon: nanoToTon(stakeNano), count }; }
function eventBetJson(bet: EventBetRow) { return { id: bet.id, eventId: bet.event_id, userId: bet.user_id, pick: bet.pick, stakeNano: Number(bet.stake_nano || 0), stakeTon: nanoToTon(Number(bet.stake_nano || 0)), status: bet.status, payoutNano: Number(bet.payout_nano || 0), payoutTon: nanoToTon(Number(bet.payout_nano || 0)), createdAt: bet.created_at, settledAt: bet.settled_at || null }; }
async function getEventBet(env: Env, id: string) { const bet = await env.DB.prepare('SELECT * FROM prediction_event_bets WHERE id = ?').bind(id).first<EventBetRow>(); return bet ? eventBetJson(bet) : null; }
async function countEventBets(env: Env, eventId: string): Promise<number> { const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM prediction_event_bets WHERE event_id = ? AND status != 'failed'").bind(eventId).first<{ count: number }>(); return Number(row?.count || 0); }
async function countUnpaidEventBets(env: Env, eventId: string): Promise<number> { const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM prediction_event_bets WHERE event_id = ? AND status IN ('active','settling_payment')").bind(eventId).first<{ count: number }>(); return Number(row?.count || 0); }
async function payEventBet(env: Env, bet: EventBetRow, payoutNano: number, status: 'won' | 'refunded'): Promise<void> {
  if (bet.status !== 'settling_payment') {
    const locked = await env.DB.prepare("UPDATE prediction_event_bets SET status = 'settling_payment', payout_nano = ? WHERE id = ? AND status = 'active'").bind(payoutNano, bet.id).run();
    if ((locked.meta?.changes || 0) <= 0) return;
  }
  if (payoutNano > 0) await adjustUserTonBalance(env, cleanUserId(bet.user_id), payoutNano, { kind: 'predict', title: status === 'won' ? 'Vexa event prediction payout' : 'Vexa event prediction refund', referenceId: bet.id, referenceType: 'prediction_event_bet', metadata: { eventId: bet.event_id, pick: bet.pick, status } });
  await env.DB.prepare("UPDATE prediction_event_bets SET status = ?, payout_nano = ?, settled_at = COALESCE(settled_at,CURRENT_TIMESTAMP) WHERE id = ? AND status = 'settling_payment'").bind(status, payoutNano, bet.id).run();
}
