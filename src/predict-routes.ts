import app from './index';
import './prediction-events';
import type { Env } from './types';
import { publishPredictOpsState, publishPredictRoundState, type PredictOpsRealtimeState } from './section-lock-events';
import { adjustUserTonBalance, debitUserTonBalanceIfEnough, getUserControls, publicUserControls, setUserSectionBlocked, type UserSectionBlock } from './user-controls';
import { gameBotToken, validateTelegramInitData } from './utils';
import { executePolymarketBitcoinBet, getPolymarketBetExecution, getPolymarketBetStatus, getPredictProviderState, getPredictRoundProvider, getRequestedPredictProvider, loadPolymarketBitcoinMarket, persistPolymarketRound, rememberPredictRoundProvider, resolvePolymarketBitcoinRound, type PredictProvider } from './predict-polymarket';

const CACHE_LONG = 'public, max-age=31536000, immutable';
const CACHE_NONE = 'no-store';
const CACHE_PREDICT_IMAGE_MANIFEST = 'public, max-age=300, stale-while-revalidate=86400';
const PREDICT_MARKETS = ['bitcoin', 'gold', 'oil'] as const;
const TRADE_MARKETS = ['bitcoin', 'gold', 'oil'] as const;
const ASTER_FUTURES_REST_BASE = 'https://fapi.asterdex.com';
const ROUND_MS = 5 * 60 * 1000;
const MONTH_BET_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const LOCK_MS = 15 * 1000;
const PLATFORM_FEE_BPS = 500;
const NANO = 1_000_000_000;
const PREDICT_OPS_CONTROL_KEY = 'admin:predict-ops-control:v1';
const PREDICT_OPS_FEED_PREFIX = 'admin:predict-ops-feed:v1:';
const PREDICT_OPS_INCIDENTS_KEY = 'admin:predict-ops-incidents:v1';
const PREDICT_RUNTIME_ISSUE_PREFIX = 'admin:predict-runtime-issue:v1:';
const PREDICT_OPS_INCIDENT_LIMIT = 24;
const DEFAULT_PREDICT_MAINTENANCE = 'Predictions are temporarily unavailable. Please try again shortly.';
const USER_MARKET_BLOCK_MESSAGE = 'Your access to this market is currently paused. If you have any questions, please contact an admin — we’re happy to help.';
type PredictMarket = typeof PREDICT_MARKETS[number];
type TradeMarket = typeof TRADE_MARKETS[number];
type PredictSide = 'up' | 'down';
type RoundResult = 'up' | 'down' | 'draw' | null;
type RoundRow = { id: string; market: string; starts_at: string; ends_at: string; start_price: number; end_price: number | null; status: string; result: string | null; settled_at: string | null; created_at: string };
type BetRow = { id: string; round_id: string; market: string; user_id: string; side: string; stake_nano: number; ton_usd_snapshot: number; stake_usd_snapshot: number; status: string; payout_nano: number; created_at: string };
type MarketSnapshot = { price: number; history: number[] };
type PredictOpsControl = { emergencyPaused: boolean; maintenanceMessage: string; pausedMarkets: Record<TradeMarket, boolean>; exposureLimitsNano: Record<TradeMarket, number>; updatedAt: string | null };
type PredictOpsFeed = { lastPrice: number | null; lastSuccessAt: string | null; circuitOpen: boolean; circuitReason: string | null; circuitOpenedAt: string | null; lastError: string | null; lastErrorAt: string | null };
type PredictUserLimitRow = { user_id: string; max_bet_nano: number; daily_limit_nano: number; updated_at: string };
type PredictAuditRow = { id: string; admin_id: string; action: string; user_id: string | null; market: string | null; target_id: string | null; detail: string | null; created_at: string };
type PredictBetAdminRow = BetRow & { round_status: string; round_result: string | null; round_ends_at: string };
type PredictRuntimeIssue = { type: string; market: TradeMarket | null; where: string; message: string; firstAt: string; lastAt: string };
export type PredictOpsMarket = TradeMarket;
export type PredictOpsIncident = { id: string; at: string; type: string; market: TradeMarket | null; message: string };
export type PredictOpsRoundView = { id: string; market: TradeMarket; startsAt: string; endsAt: string; startPrice: number; endPrice: number | null; status: string; result: string | null; settledAt: string | null; createdAt: string; due: boolean; totalBets: number; totalStakeNano: number; counts: Record<string, number> };
export type PredictOpsMarketStatus = { market: TradeMarket; manualPaused: boolean; circuitOpen: boolean; circuitReason: string | null; lastPrice: number | null; lastSuccessAt: string | null; lastError: string | null; lastErrorAt: string | null; latestRound: PredictOpsRoundView | null; lastSettledAt: string | null; dueSettlementCount: number; activeExposureNano: number; exposureLimitNano: number; capacityReached: boolean };
export type PredictOpsDashboard = { emergencyPaused: boolean; maintenanceMessage: string; updatedAt: string | null; markets: PredictOpsMarketStatus[] };
export type PredictUserLimits = { userId: string; maxBetNano: number; dailyLimitNano: number; updatedAt: string | null };
export type PredictUserMarketAccess = { market: TradeMarket; blocked: boolean; expiresAt: string | null; remainingMs: number | null; reason: string | null; adminNote: string | null };
export type PredictOpsBetView = { id: string; roundId: string; market: TradeMarket; userId: string; side: string; stakeNano: number; status: string; payoutNano: number; createdAt: string; roundStatus: string; roundResult: string | null; roundEndsAt: string; refundable: boolean };
export type PredictUserInspector = { userId: string; totalBets: number; wins: number; losses: number; refunded: number; active: number; totalStakeNano: number; totalPayoutNano: number; netNano: number; todayStakeNano: number; lastBetAt: string | null; limits: PredictUserLimits; access: PredictUserMarketAccess[]; recentBets: PredictOpsBetView[] };
export type PredictAuditEntry = { id: string; adminId: string; action: string; userId: string | null; market: TradeMarket | null; targetId: string | null; detail: string | null; createdAt: string };

type PredictBetGuard = { control: PredictOpsControl; userLimits: PredictUserLimits };
let predictOpsTablesReady: Promise<void> | null = null;

app.get('/app/api/predict-markets', async (c) => c.json(await getPredictMarkets(c.env), 200, { 'cache-control': CACHE_PREDICT_IMAGE_MANIFEST }));

app.get('/app/api/predict-round', async (c) => {
  let market: TradeMarket | null = null;
  try {
    market = normalizeTradeMarket(String(c.req.query('market') || 'bitcoin'));
    const userId = await authenticateUser(c.env, c.req.query('userId'), c.req.header('x-telegram-init-data'));
    const providerState = market === 'bitcoin' ? await getPredictProviderStateForRound(c.env) : null;
    const snapshot = providerState === 'polymarket' ? { price: 0, history: [] } : await fetchMarketSnapshot(market);
    if (snapshot.price > 0) await notePredictFeedSuccess(c.env, market, snapshot.price).catch(() => undefined);
    await settleDueRounds(c.env, market, false, snapshot.price);
    const round = await getOrCreateCurrentRound(c.env, market, snapshot.price);
    const response = { ...(await publicRoundJson(c.env, round, userId, snapshot.price)), history: snapshot.history };
    await reportPredictOpsRuntimeRecovered(c.env, 'round_request_failed', market, 'Predict round API completed successfully.').catch(() => undefined);
    return c.json(response, 200, { 'cache-control': CACHE_NONE });
  } catch (error) {
    const errorMessage = messageOf(error);
    if (market && isPredictPriceFeedError(error)) await notePredictFeedFailure(c.env, market, errorMessage).catch(() => undefined);
    else if (!(await isExpectedPredictRequestError(c.env, market, error))) await reportPredictOpsRuntimeError(c.env, 'round_request_failed', market, errorMessage);
    return c.json({ error: error instanceof Error ? error.message : 'Could not load prediction round' }, 400, { 'cache-control': CACHE_NONE });
  }
});

app.post('/app/api/predict-bet', async (c) => {
  let betId = '';
  let userId = '';
  let stakeNano = 0;
  let market: TradeMarket | null = null;
  let guard: PredictBetGuard | null = null;
  let debited = false;
  let polymarketOrderMayExist = false;
  try {
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    market = normalizeTradeMarket(String(body.market || 'bitcoin'));
    const side = normalizeSide(body.side);
    userId = await authenticateUser(c.env, body.userId, body.initData);
    stakeNano = tonToNano(body.stakeTon);
    const tonUsd = cleanOptionalPrice(body.tonUsdSnapshot);
    if (stakeNano <= 0) throw new Error('Enter a valid GRAM amount');
    const providerState = market === 'bitcoin' ? await getPredictProviderStateForRound(c.env) : null;
    const snapshot = providerState === 'polymarket' ? { price: 0, history: [] } : await fetchMarketSnapshot(market);
    if (snapshot.price > 0) await notePredictFeedSuccess(c.env, market, snapshot.price).catch(() => undefined);
    await settleDueRounds(c.env, market, false, snapshot.price);
    const round = await getOrCreateCurrentRound(c.env, market, snapshot.price);
    const roundId = cleanDbText(round.id, 'Prediction round is not ready');
    if (round.status !== 'open' || Date.now() >= betLockAtMs(round)) throw new Error('This prediction is closed. Wait for the next round.');
    await ensurePredictTables(c.env);

    let existing = await c.env.DB.prepare("SELECT * FROM predict_bets WHERE round_id = ? AND user_id = ? AND status != 'failed' ORDER BY datetime(created_at) DESC LIMIT 1")
      .bind(roundId, userId)
      .first<BetRow>();

    if (existing) {
      if (existing.status !== 'pending') throw new Error('You already placed a prediction in this round. Wait for the next round.');
      if (existing.market !== market || existing.side !== side || Number(existing.stake_nano || 0) !== stakeNano) {
        throw new Error('A previous prediction is still processing. Retry the same prediction.');
      }
      betId = cleanDbText(existing.id, 'Prediction bet is not ready');
      guard = await assertPredictBettingAvailable(c.env, market, userId, stakeNano, true);
    } else {
      guard = await assertPredictBettingAvailable(c.env, market, userId, stakeNano, false);
      const controls = await getUserControls(c.env, userId);
      if (Number(controls.tonBalanceNano || 0) < stakeNano) throw new Error('Insufficient balance');
      betId = 'pbet_' + crypto.randomUUID().replace(/-/g, '').slice(0, 22);
      const exposureLimit = guard.control.exposureLimitsNano[market];
      const inserted = await c.env.DB.prepare(`INSERT INTO predict_bets (id, round_id, market, user_id, side, stake_nano, ton_usd_snapshot, stake_usd_snapshot, status, payout_nano, created_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, CURRENT_TIMESTAMP
        WHERE NOT EXISTS (SELECT 1 FROM predict_bets WHERE round_id = ? AND user_id = ? AND status != 'failed')
          AND EXISTS (SELECT 1 FROM predict_rounds WHERE id = ? AND status = 'open')
          AND NOT EXISTS (SELECT 1 FROM predict_user_limits WHERE user_id = ? AND max_bet_nano > 0 AND ? > max_bet_nano)
          AND NOT EXISTS (SELECT 1 FROM predict_user_limits WHERE user_id = ? AND daily_limit_nano > 0 AND (SELECT COALESCE(SUM(stake_nano), 0) FROM predict_bets WHERE user_id = ? AND status != 'failed' AND date(created_at) = date('now')) + ? > daily_limit_nano)
          AND (? <= 0 OR (SELECT COALESCE(SUM(stake_nano), 0) FROM predict_bets WHERE market = ? AND status IN ('pending','active','settling_payment')) + ? <= ?)`)
        .bind(betId, roundId, market, userId, side, stakeNano, tonUsd, nanoToTon(stakeNano) * tonUsd, roundId, userId, roundId, userId, stakeNano, userId, userId, stakeNano, exposureLimit, market, stakeNano, exposureLimit)
        .run();
      if ((inserted.meta?.changes || 0) <= 0) {
        existing = await c.env.DB.prepare("SELECT * FROM predict_bets WHERE round_id = ? AND user_id = ? AND status != 'failed' ORDER BY datetime(created_at) DESC LIMIT 1")
          .bind(roundId, userId)
          .first<BetRow>();
        if (!existing) {
          await assertPredictBettingAvailable(c.env, market, userId, stakeNano, false);
          throw new Error('Prediction could not be reserved. Please try again.');
        }
        if (existing.status !== 'pending' || existing.market !== market || existing.side !== side || Number(existing.stake_nano || 0) !== stakeNano) {
          throw new Error('You already placed a prediction in this round. Wait for the next round.');
        }
        betId = cleanDbText(existing.id, 'Prediction bet is not ready');
        guard = await assertPredictBettingAvailable(c.env, market, userId, stakeNano, true);
      }
    }

    await debitUserTonBalanceIfEnough(c.env, userId, stakeNano, { kind: 'predict', title: 'Prediction stake', referenceId: betId, referenceType: 'predict_bet', metadata: { market, side, roundId } });
    debited = true;
    const provider = await getPredictRoundProvider(c.env, roundId);
    if (provider === 'polymarket') {
      const stakeUsd = Number(nanoToTon(stakeNano)) * tonUsd;
      if (!(stakeUsd > 0)) throw new Error('A current Gram/USD price is required for Polymarket predictions');
      await executePolymarketBitcoinBet(c.env, { betId, roundId, side, stakeUsd });
      polymarketOrderMayExist = true;
    }
    const active = await c.env.DB.prepare("UPDATE predict_bets SET status = 'active' WHERE id = ? AND status = 'pending'").bind(betId).run();
    if ((active.meta?.changes || 0) <= 0) {
      const fresh = await c.env.DB.prepare('SELECT * FROM predict_bets WHERE id = ?').bind(betId).first<BetRow>();
      if (!fresh || fresh.status !== 'active') {
        if (!polymarketOrderMayExist) {
          await adjustUserTonBalance(c.env, userId, stakeNano, { kind: 'predict', title: 'Prediction stake rollback', referenceId: betId, referenceType: 'predict_bet', metadata: { market, side, roundId, status: 'rollback' } });
          debited = false;
        }
        throw new Error('Could not activate prediction');
      }
    }
    await publishPredictRoundRealtimeObserved(c.env, market, roundId, userId);
    if (market && guard?.control.exposureLimitsNano[market] > 0) await publishPredictOpsRealtime(c.env).catch(() => undefined);
    const response = { ok: true, bet: await getBet(c.env, betId), round: await publicRoundJson(c.env, round, userId), userControls: await publicUserControls(c.env, userId) };
    await reportPredictOpsRuntimeRecovered(c.env, 'bet_request_failed', market, 'Predict bet API completed successfully.').catch(() => undefined);
    return c.json(response, 200, { 'cache-control': CACHE_NONE });
  } catch (error) {
    const errorMessage = messageOf(error);
    const feedError = Boolean(market && isPredictPriceFeedError(error));
    if (market && feedError) await notePredictFeedFailure(c.env, market, errorMessage).catch(() => undefined);
    let releasedReservation = false;
    const polymarketStatus = betId && market === 'bitcoin' ? await getPolymarketBetStatus(c.env, betId).catch(() => null) : null;
    const preserveReservation = polymarketOrderMayExist || polymarketStatus === 'prepared' || polymarketStatus === 'matched';
    if (betId && market) {
      if (!preserveReservation) {
        if (debited && userId && stakeNano > 0) {
          try { await adjustUserTonBalance(c.env, userId, stakeNano, { kind: 'predict', title: 'Prediction stake rollback', referenceId: betId, referenceType: 'predict_bet', metadata: { market, status: 'rollback' } }); debited = false; } catch {}
        }
        try { const failed = await c.env.DB.prepare("UPDATE predict_bets SET status = 'failed' WHERE id = ? AND status = 'pending'").bind(betId).run(); releasedReservation = (failed.meta?.changes || 0) > 0; } catch {}
      }
    }
    if (market && feedError) await notePredictFeedFailure(c.env, market, errorMessage).catch(() => undefined);
    else if (!(await isExpectedPredictRequestError(c.env, market, error))) await reportPredictOpsRuntimeError(c.env, 'bet_request_failed', market, errorMessage);
    if (releasedReservation && market) await publishPredictOpsRealtime(c.env).catch(() => undefined);
    return c.json({ error: error instanceof Error ? error.message : 'Could not place prediction' }, 400, { 'cache-control': CACHE_NONE });
  }
});

app.get('/app/api/predict-market-image/:market.png', async (c) => {
  try { const market = normalizePredictMarket(c.req.param('market')); return getPredictImageResponse(c.env, predictImageKey(market)); }
  catch { return new Response('Not found', { status: 404, headers: { 'cache-control': CACHE_NONE } }); }
});

export async function getPredictMarkets(env: Env) {
  const entries = await Promise.all(PREDICT_MARKETS.map(async (market) => {
    const head = await env.ASSETS.head(predictImageKey(market)).catch(() => null);
    const version = head ? encodeURIComponent(head.httpEtag || head.uploaded?.toISOString?.() || String(Date.now())) : '';
    return [market, { imageUrl: head ? `/app/api/predict-market-image/${market}.png?v=${version}` : '' }] as const;
  }));
  return { markets: Object.fromEntries(entries) as Record<PredictMarket, { imageUrl: string }> };
}

async function publicRoundJson(env: Env, round: RoundRow, userId: string, livePrice = 0) {
  await ensurePredictTables(env);
  const cleanedUserId = cleanUserIdOptional(userId);
  const roundId = cleanDbText(round.id, 'Prediction round is not ready');
  const pools = await poolJson(env, roundId);
  const userBets = cleanedUserId ? await userBetsJson(env, roundId, cleanedUserId) : [];
  const recentUserBets = cleanedUserId ? await recentUserBetsJson(env, String(round.market || ''), cleanedUserId) : [];
  const userControls = cleanedUserId ? await publicUserControls(env, cleanedUserId) : null;
  const now = Date.now();
  const ends = Date.parse(String(round.ends_at || ''));
  const lockAt = betLockAtMs(round);
  const provider = String(round.market || '') === 'bitcoin' ? await getPredictRoundProvider(env, roundId) : 'vexa';
  let polymarket: { upTokenId: string; downTokenId: string; feeRate: number } | null = null;
  if (provider === 'polymarket') {
    const metadata = await env.DB.prepare('SELECT up_token_id, down_token_id FROM predict_polymarket_rounds WHERE round_id = ? LIMIT 1').bind(roundId).first<{ up_token_id: string; down_token_id: string }>();
    const upTokenId = String(metadata?.up_token_id || '').trim();
    const downTokenId = String(metadata?.down_token_id || '').trim();
    if (!/^\d+$/.test(upTokenId) || !/^\d+$/.test(downTokenId)) throw new Error('Polymarket round quote metadata is unavailable');
    polymarket = { upTokenId, downTokenId, feeRate: 0.07 };
  }
  return { ok: true, userControls, round: { id: roundId, market: String(round.market || ''), provider, polymarket, startsAt: String(round.starts_at || ''), endsAt: String(round.ends_at || ''), startPrice: Number(round.start_price || 0), livePrice: Number(livePrice) > 0 ? Number(livePrice) : null, endPrice: round.end_price == null ? null : Number(round.end_price), status: now >= lockAt && round.status === 'open' ? 'locked' : String(round.status || 'open'), result: round.result || null, remainingMs: Math.max(0, ends - now), lockRemainingMs: Math.max(0, lockAt - now), pools, userBets, recentUserBets } };
}

async function ensurePredictTables(env: Env): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS predict_rounds (id TEXT PRIMARY KEY, market TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, start_price REAL NOT NULL, end_price REAL, status TEXT NOT NULL DEFAULT 'open', result TEXT, settled_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_predict_rounds_market_end ON predict_rounds(market, ends_at)').run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS predict_bets (id TEXT PRIMARY KEY, round_id TEXT NOT NULL, market TEXT NOT NULL, user_id TEXT NOT NULL, side TEXT NOT NULL, stake_nano INTEGER NOT NULL, ton_usd_snapshot REAL NOT NULL DEFAULT 0, stake_usd_snapshot REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', payout_nano INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_predict_bets_round ON predict_bets(round_id)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_predict_bets_user_round ON predict_bets(user_id, round_id)').run();
}

async function getPredictProviderStateForRound(env: Env): Promise<PredictProvider> {
  const state = await getPredictProviderState(env);
  return state.active || state.requested;
}

async function getOrCreateCurrentRound(env: Env, market: TradeMarket, latestPrice = 0): Promise<RoundRow> {
  await ensurePredictTables(env);
  const now = Date.now();
  if (market === 'bitcoin') {
    let existing = await env.DB.prepare(`SELECT * FROM predict_rounds WHERE market = ? AND datetime(starts_at) <= datetime('now') AND datetime(ends_at) > datetime('now') ORDER BY datetime(starts_at) DESC LIMIT 1`).bind(market).first<RoundRow>();
    if (existing) {
      if (Number(existing.start_price) > 0) return existing;
      const repairedPrice = Number(latestPrice) > 0 ? Number(latestPrice) : await fetchPrice(market);
      await env.DB.prepare('UPDATE predict_rounds SET start_price = ? WHERE id = ?').bind(repairedPrice, existing.id).run();
      const repaired = await env.DB.prepare('SELECT * FROM predict_rounds WHERE id = ?').bind(existing.id).first<RoundRow>();
      if (!repaired) throw new Error('Could not repair prediction round');
      return repaired;
    }
    const startMs = Math.floor(now / ROUND_MS) * ROUND_MS;
    const startsAt = new Date(startMs).toISOString();
    const endsAt = new Date(startMs + ROUND_MS).toISOString();
    const id = `pr_${market}_${startMs}`;
    const requestedProvider: PredictProvider = await getRequestedPredictProvider(env);
    let startPrice = 0;
    let polymarketRound: Awaited<ReturnType<typeof loadPolymarketBitcoinMarket>> | null = null;
    if (requestedProvider === 'polymarket') {
      polymarketRound = await loadPolymarketBitcoinMarket(startMs);
      if (!(Number(polymarketRound.startPrice) > 0)) throw new Error('Polymarket Bitcoin start price is unavailable for this round');
      startPrice = Number(polymarketRound.startPrice);
    } else startPrice = Number(latestPrice) > 0 ? Number(latestPrice) : await fetchPrice(market);
    const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO predict_rounds (id, market, starts_at, ends_at, start_price, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP)`).bind(id, market, startsAt, endsAt, startPrice).run();
    const row = await env.DB.prepare('SELECT * FROM predict_rounds WHERE id = ?').bind(id).first<RoundRow>();
    if (!row) throw new Error('Could not create prediction round');
    if ((inserted.meta?.changes || 0) > 0) {
      const provider = await rememberPredictRoundProvider(env, id, requestedProvider);
      if (provider === 'polymarket' && polymarketRound) await persistPolymarketRound(env, id, polymarketRound);
    }
    return row;
  }

  const window = calendarMonthWindow(now);
  const startsAt = new Date(window.startMs).toISOString();
  const endsAt = new Date(window.endMs).toISOString();
  let existing = await env.DB.prepare('SELECT * FROM predict_rounds WHERE market = ? AND starts_at = ? AND ends_at = ? LIMIT 1').bind(market, startsAt, endsAt).first<RoundRow>();
  if (existing) {
    if (Number(existing.start_price) > 0) return existing;
    const repairedPrice = await fetchMonthlyBoundaryPrice(market, window.startMs, 'start');
    await env.DB.prepare('UPDATE predict_rounds SET start_price = ? WHERE id = ?').bind(repairedPrice, existing.id).run();
    const repaired = await env.DB.prepare('SELECT * FROM predict_rounds WHERE id = ?').bind(existing.id).first<RoundRow>();
    if (!repaired) throw new Error('Could not repair monthly prediction round');
    return repaired;
  }

  const legacy = await env.DB.prepare(`SELECT * FROM predict_rounds WHERE market = ? AND datetime(starts_at) <= datetime('now') AND datetime(ends_at) > datetime('now') ORDER BY datetime(starts_at) DESC LIMIT 1`).bind(market).first<RoundRow>();
  if (legacy) {
    const betCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM predict_bets WHERE round_id = ? AND status != 'failed'").bind(legacy.id).first<{ count: number }>();
    if (Number(betCount?.count || 0) <= 0) await env.DB.prepare('DELETE FROM predict_rounds WHERE id = ?').bind(legacy.id).run();
  }

  const id = `pr_${market}_${window.startMs}`;
  const startPrice = await fetchMonthlyBoundaryPrice(market, window.startMs, 'start');
  await env.DB.prepare(`INSERT OR IGNORE INTO predict_rounds (id, market, starts_at, ends_at, start_price, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP)`).bind(id, market, startsAt, endsAt, startPrice).run();
  existing = await env.DB.prepare('SELECT * FROM predict_rounds WHERE id = ?').bind(id).first<RoundRow>();
  if (!existing) throw new Error('Could not create monthly prediction round');
  return existing;
}

async function fetchMarketSnapshot(market: TradeMarket): Promise<MarketSnapshot> {
  if (market === 'bitcoin') return fetchAsterSnapshot('BTCUSDT', 48);
  if (market === 'gold') return fetchAsterSnapshot('PAXGUSDT', 30);
  return fetchAsterSnapshot('CLUSDT', 30);
}

async function fetchAsterSnapshot(symbol: string, limit: number): Promise<MarketSnapshot> {
  const [priceResponse, klinesResponse] = await Promise.all([
    fetch(`${ASTER_FUTURES_REST_BASE}/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`, { headers: { accept: 'application/json' } }),
    fetch(`${ASTER_FUTURES_REST_BASE}/fapi/v1/klines?symbol=${encodeURIComponent(symbol)}&interval=1m&limit=${limit}`, { headers: { accept: 'application/json' } }),
  ]);
  if (!priceResponse.ok) throw new Error(`Aster price unavailable: HTTP ${priceResponse.status}`);
  if (!klinesResponse.ok) throw new Error(`Aster history unavailable: HTTP ${klinesResponse.status}`);
  const priceData = await priceResponse.json() as { markPrice?: unknown; price?: unknown };
  const mark = cleanPrice(priceData.markPrice ?? priceData.price);
  const klines = await klinesResponse.json() as unknown;
  const history = Array.isArray(klines) ? klines.map((row) => Array.isArray(row) ? Number(row[4]) : 0).filter((n) => Number.isFinite(n) && n > 0) : [];
  return { price: mark, history };
}

async function fetchPrice(market: TradeMarket): Promise<number> {
  return (await fetchMarketSnapshot(market)).price;
}

async function fetchMonthlyBoundaryPrice(market: TradeMarket, boundaryMs: number, side: 'start' | 'end'): Promise<number> {
  const symbol = market === 'gold' ? 'PAXGUSDT' : 'CLUSDT';
  const candidate = side === 'start' ? boundaryMs : Math.max(0, boundaryMs - 60_000);
  const response = await fetch(`${ASTER_FUTURES_REST_BASE}/fapi/v1/klines?symbol=${encodeURIComponent(symbol)}&interval=1m&startTime=${candidate}&limit=1`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Monthly boundary price unavailable: HTTP ${response.status}`);
  const rows = await response.json() as unknown;
  if (!Array.isArray(rows) || !rows.length || !Array.isArray(rows[0])) throw new Error('Monthly boundary price snapshot is empty');
  const row = rows[0] as unknown[];
  return cleanPrice(side === 'start' ? row[1] : row[4]);
}

async function settleDueRounds(env: Env, market: TradeMarket, force = false, latestPrice = 0): Promise<void> {
  await ensurePredictTables(env);
  const due = await env.DB.prepare(`SELECT * FROM predict_rounds WHERE market = ? AND datetime(ends_at) <= datetime('now') AND status NOT IN ('refunding','refunded') AND (status != 'settled' OR id IN (SELECT round_id FROM predict_bets WHERE status IN ('active','settling_payment'))) ORDER BY datetime(ends_at) ASC LIMIT 12`).bind(market).all<RoundRow>();
  for (const round of due.results || []) {
    const freshId = cleanDbText(round.id, 'Prediction round is not ready');
    const provider = market === 'bitcoin' ? await getPredictRoundProvider(env, freshId) : 'vexa';
    if (provider === 'polymarket') {
      const resolved = await resolvePolymarketBitcoinRound(env, freshId);
      if (!resolved) continue;
      const finalPrice = Number(resolved.finalPrice) > 0 ? Number(resolved.finalPrice) : null;
      const bets = await env.DB.prepare("SELECT * FROM predict_bets WHERE round_id = ? AND status IN ('active','settling_payment') ORDER BY datetime(created_at) ASC").bind(freshId).all<BetRow>();
      for (const bet of bets.results || []) {
        if (String(bet.side || '') !== resolved.result) {
          await payBet(env, bet, 0, 'lost');
          continue;
        }
        const execution = await getPolymarketBetExecution(env, cleanDbText(bet.id, 'Prediction bet is not ready'));
        const rate = Number(bet.ton_usd_snapshot);
        if (!execution || !(rate > 0)) throw new Error('Polymarket winning bet is missing its execution or Gram/USD rate');
        await payBet(env, bet, Math.floor(execution.shares / rate * NANO), 'won');
      }
      const remaining = await env.DB.prepare("SELECT COUNT(*) AS count FROM predict_bets WHERE round_id = ? AND status IN ('active', 'settling_payment')").bind(freshId).first<{ count: number }>();
      if (Number(remaining?.count || 0) <= 0) await env.DB.prepare(`UPDATE predict_rounds SET status = 'settled', end_price = ?, result = ?, settled_at = COALESCE(settled_at, CURRENT_TIMESTAMP) WHERE id = ?`).bind(finalPrice, resolved.result, freshId).run();
      continue;
    }

    if (round.status === 'settled') continue;
    const endPrice = market === 'bitcoin'
      ? (Number(latestPrice) > 0 ? Number(latestPrice) : await fetchPrice(market))
      : await fetchMonthlyBoundaryPrice(market, Date.parse(String(round.ends_at || '')), 'end');
    const startPrice = Number(round.start_price);
    const result: RoundResult = endPrice > startPrice ? 'up' : endPrice < startPrice ? 'down' : 'draw';
    const updated = await env.DB.prepare(`UPDATE predict_rounds SET status = 'settled', end_price = ?, result = ?, settled_at = COALESCE(settled_at, CURRENT_TIMESTAMP) WHERE id = ? AND status != 'settled'`).bind(endPrice, result, freshId).run();
    if ((updated.meta?.changes || 0) <= 0 && !force) continue;
    await settleVexaRoundBets(env, freshId, result);
  }
}

async function settleVexaRoundBets(env: Env, roundId: string, result: RoundResult): Promise<void> {
  const bets = await env.DB.prepare("SELECT * FROM predict_bets WHERE round_id = ? AND status IN ('active','settling_payment') ORDER BY datetime(created_at) ASC").bind(roundId).all<BetRow>();
  const active = bets.results || [];
  if (!active.length) return;
  if (!result || result === 'draw') {
    for (const bet of active) await payBet(env, bet, Number(bet.stake_nano || 0), 'refunded');
    return;
  }
  const winners = active.filter((bet) => bet.side === result);
  const losers = active.filter((bet) => bet.side !== result);
  const winnerStake = winners.reduce((sum, bet) => sum + Number(bet.stake_nano || 0), 0);
  const loserStake = losers.reduce((sum, bet) => sum + Number(bet.stake_nano || 0), 0);
  if (!winners.length || winnerStake <= 0) {
    for (const bet of active) await payBet(env, bet, Number(bet.stake_nano || 0), 'refunded');
    return;
  }
  const distributable = Math.floor(loserStake * (10_000 - PLATFORM_FEE_BPS) / 10_000);
  let paid = 0;
  for (let i = 0; i < winners.length; i += 1) {
    const bet = winners[i];
    const profit = i === winners.length - 1 ? Math.max(0, distributable - paid) : Math.floor(distributable * Number(bet.stake_nano || 0) / winnerStake);
    paid += profit;
    await payBet(env, bet, Number(bet.stake_nano || 0) + profit, 'won');
  }
  for (const bet of losers) await payBet(env, bet, 0, 'lost');
}

async function payBet(env: Env, bet: BetRow, payoutNano: number, status: 'won' | 'lost' | 'refunded'): Promise<void> {
  const betId = cleanDbText(bet.id, 'Prediction bet is not ready');
  if (status === 'lost') {
    await env.DB.prepare("UPDATE predict_bets SET status = 'lost', payout_nano = 0 WHERE id = ? AND status IN ('active','settling_payment')").bind(betId).run();
    return;
  }
  const payout = Math.max(0, Math.floor(Number(payoutNano) || 0));
  const locked = await env.DB.prepare("UPDATE predict_bets SET status = 'settling_payment', payout_nano = ? WHERE id = ? AND status = 'active'").bind(payout, betId).run();
  if ((locked.meta?.changes || 0) <= 0) {
    const current = await env.DB.prepare('SELECT status, payout_nano FROM predict_bets WHERE id = ?').bind(betId).first<{ status: string; payout_nano: number }>();
    if (!current) throw new Error('Prediction bet disappeared during settlement');
    if (current.status === status) return;
    if (current.status !== 'settling_payment') return;
  }
  if (payout > 0) await adjustUserTonBalance(env, bet.user_id, payout, { kind: 'predict', title: status === 'won' ? 'Prediction win' : 'Prediction refund', referenceId: betId, referenceType: 'predict_bet', metadata: { roundId: bet.round_id, market: bet.market, status } });
  await env.DB.prepare('UPDATE predict_bets SET status = ?, payout_nano = ? WHERE id = ? AND status = ?').bind(status, payout, betId, 'settling_payment').run();
}

async function poolJson(env: Env, roundId: string) {
  const rows = await env.DB.prepare("SELECT side, COUNT(*) AS bets, COALESCE(SUM(stake_nano),0) AS stake FROM predict_bets WHERE round_id = ? AND status != 'failed' GROUP BY side").bind(roundId).all<{ side: string; bets: number; stake: number }>();
  const pools: Record<string, { bets: number; stakeNano: number; stakeTon: number }> = { up: { bets: 0, stakeNano: 0, stakeTon: 0 }, down: { bets: 0, stakeNano: 0, stakeTon: 0 } };
  for (const row of rows.results || []) if (pools[row.side]) pools[row.side] = { bets: Number(row.bets || 0), stakeNano: Number(row.stake || 0), stakeTon: nanoToTon(Number(row.stake || 0)) };
  return pools;
}

async function userBetsJson(env: Env, roundId: string, userId: string) {
  const rows = await env.DB.prepare("SELECT * FROM predict_bets WHERE round_id = ? AND user_id = ? AND status != 'failed' ORDER BY datetime(created_at) DESC LIMIT 12").bind(roundId, userId).all<BetRow>();
  return (rows.results || []).map(publicBetJson);
}

async function recentUserBetsJson(env: Env, market: string, userId: string) {
  const rows = await env.DB.prepare("SELECT * FROM predict_bets WHERE market = ? AND user_id = ? AND status IN ('won','lost','refunded') ORDER BY datetime(created_at) DESC LIMIT 12").bind(market, userId).all<BetRow>();
  return (rows.results || []).map(publicBetJson);
}

function publicBetJson(row: BetRow) {
  return { id: String(row.id || ''), roundId: String(row.round_id || ''), market: String(row.market || ''), side: String(row.side || ''), stakeNano: Number(row.stake_nano || 0), stakeTon: nanoToTon(Number(row.stake_nano || 0)), status: String(row.status || ''), payoutNano: Number(row.payout_nano || 0), payoutTon: nanoToTon(Number(row.payout_nano || 0)), createdAt: String(row.created_at || '') };
}

async function getBet(env: Env, betId: string) {
  const row = await env.DB.prepare('SELECT * FROM predict_bets WHERE id = ?').bind(betId).first<BetRow>();
  if (!row) throw new Error('Prediction bet not found');
  return publicBetJson(row);
}

export async function getPredictOpsDashboard(env: Env): Promise<PredictOpsDashboard> {
  await ensurePredictTables(env);
  await ensurePredictOpsTables(env);
  const control = await readPredictOpsControl(env);
  const markets = await Promise.all(TRADE_MARKETS.map((market) => getPredictOpsMarketStatus(env, market, control)));
  return { emergencyPaused: control.emergencyPaused, maintenanceMessage: control.maintenanceMessage, updatedAt: control.updatedAt, markets };
}

export async function getPredictOpsIncidents(env: Env): Promise<PredictOpsIncident[]> {
  const raw = await env.BOT_CACHE.get(PREDICT_OPS_INCIDENTS_KEY).catch(() => null);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, PREDICT_OPS_INCIDENT_LIMIT).map((item) => {
      const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
      return { id: String(record.id || ''), at: String(record.at || ''), type: String(record.type || ''), market: normalizePredictOpsMarketOrNull(record.market), message: String(record.message || '') };
    }).filter((item) => item.id && item.at && item.type);
  } catch { return []; }
}

export async function getPredictUserLimits(env: Env, userIdInput: unknown): Promise<PredictUserLimits> {
  const userId = cleanUserId(userIdInput);
  await ensurePredictOpsTables(env);
  const row = await env.DB.prepare('SELECT * FROM predict_user_limits WHERE user_id = ?').bind(userId).first<PredictUserLimitRow>();
  return { userId, maxBetNano: normalizePolicyNano(row?.max_bet_nano), dailyLimitNano: normalizePolicyNano(row?.daily_limit_nano), updatedAt: row?.updated_at || null };
}

export async function setPredictUserLimits(env: Env, userIdInput: unknown, maxBetNanoInput: unknown, dailyLimitNanoInput: unknown, adminIdInput: unknown): Promise<PredictUserLimits> {
  const userId = cleanUserId(userIdInput), maxBetNano = normalizePolicyNano(maxBetNanoInput), dailyLimitNano = normalizePolicyNano(dailyLimitNanoInput);
  await ensurePredictOpsTables(env);
  await env.DB.prepare(`INSERT INTO predict_user_limits (user_id,max_bet_nano,daily_limit_nano,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET max_bet_nano=excluded.max_bet_nano,daily_limit_nano=excluded.daily_limit_nano,updated_at=CURRENT_TIMESTAMP`).bind(userId, maxBetNano, dailyLimitNano).run();
  await appendPredictAudit(env, adminIdInput, 'user_limits_set', { userId, detail: `max=${nanoToTon(maxBetNano)} GRAM; daily=${nanoToTon(dailyLimitNano)} GRAM` }).catch(() => undefined);
  return getPredictUserLimits(env, userId);
}

export async function getPredictUserInspector(env: Env, userIdInput: unknown): Promise<PredictUserInspector> {
  const userId = cleanUserId(userIdInput);
  await ensurePredictTables(env); await ensurePredictOpsTables(env);
  const [summary, limits, controls, rows] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN status='won' THEN 1 ELSE 0 END),0) AS wins, COALESCE(SUM(CASE WHEN status='lost' THEN 1 ELSE 0 END),0) AS losses, COALESCE(SUM(CASE WHEN status='refunded' THEN 1 ELSE 0 END),0) AS refunded, COALESCE(SUM(CASE WHEN status IN ('pending','active','settling_payment') THEN 1 ELSE 0 END),0) AS active, COALESCE(SUM(stake_nano),0) AS total_stake, COALESCE(SUM(payout_nano),0) AS total_payout, MAX(created_at) AS last_bet FROM predict_bets WHERE user_id=? AND status!='failed'`).bind(userId).first<{ total:number; wins:number; losses:number; refunded:number; active:number; total_stake:number; total_payout:number; last_bet:string|null }>(),
    getPredictUserLimits(env, userId),
    getUserControls(env, userId),
    env.DB.prepare(`SELECT b.*, r.status AS round_status, r.result AS round_result, r.ends_at AS round_ends_at FROM predict_bets b JOIN predict_rounds r ON r.id=b.round_id WHERE b.user_id=? ORDER BY datetime(b.created_at) DESC LIMIT 25`).bind(userId).all<PredictBetAdminRow>(),
  ]);
  const recentBets = (rows.results || []).map(predictOpsBetView);
  const todayStakeNano = await getPredictUserDailyStake(env, userId);
  const totalStakeNano = normalizePolicyNano(summary?.total_stake), totalPayoutNano = normalizePolicyNano(summary?.total_payout);
  return { userId, totalBets: Number(summary?.total || 0), wins: Number(summary?.wins || 0), losses: Number(summary?.losses || 0), refunded: Number(summary?.refunded || 0), active: Number(summary?.active || 0), totalStakeNano, totalPayoutNano, netNano: totalPayoutNano - totalStakeNano, todayStakeNano, lastBetAt: summary?.last_bet || null, limits, access: TRADE_MARKETS.map((market) => userMarketAccessFromControls(controls.sectionBlocks || [], market)), recentBets };
}

export async function getPredictOpsBet(env: Env, betIdInput: unknown): Promise<PredictOpsBetView | null> {
  const betId = cleanPredictBetId(betIdInput); await ensurePredictTables(env);
  const row = await env.DB.prepare(`SELECT b.*, r.status AS round_status, r.result AS round_result, r.ends_at AS round_ends_at FROM predict_bets b JOIN predict_rounds r ON r.id=b.round_id WHERE b.id=? LIMIT 1`).bind(betId).first<PredictBetAdminRow>();
  return row ? predictOpsBetView(row) : null;
}

export async function manualRefundPredictBet(env: Env, betIdInput: unknown, adminIdInput: unknown, writeAudit = true): Promise<PredictOpsBetView> {
  const betId = cleanPredictBetId(betIdInput); await ensurePredictTables(env);
  const view = await getPredictOpsBet(env, betId);
  if (!view) throw new Error('Prediction bet not found.');
  if (!view.refundable) throw new Error('Only a settled losing bet can be manually refunded safely.');
  await adjustUserTonBalance(env, view.userId, view.stakeNano, {
    kind: 'predict', title: 'Prediction admin refund', referenceId: `admin-refund:${betId}`, referenceType: 'predict_admin_refund',
    metadata: { betId, roundId: view.roundId, market: view.market, adminId: cleanAdminId(adminIdInput) },
  });
  const changed = await env.DB.prepare("UPDATE predict_bets SET status='refunded', payout_nano=stake_nano WHERE id=? AND status='lost'").bind(betId).run();
  if ((changed.meta?.changes || 0) <= 0) {
    const fresh = await getPredictOpsBet(env, betId);
    if (!fresh || fresh.status !== 'refunded') throw new Error('Could not finalize manual refund.');
    return fresh;
  }
  if (writeAudit) await appendPredictAudit(env, adminIdInput, 'bet_manual_refund', { userId: view.userId, market: view.market, targetId: betId, detail: `${nanoToTon(view.stakeNano)} GRAM stake refunded.` }).catch(() => undefined);
  const updated = await getPredictOpsBet(env, betId);
  if (!updated) throw new Error('Prediction bet not found after refund.');
  return updated;
}

export async function manualRefundPredictRound(env: Env, roundIdInput: unknown, adminIdInput: unknown): Promise<{ roundId: string; refundedCount: number; refundedNano: number; mode: 'cancel' | 'safety' }> {
  const roundId = cleanPredictRoundId(roundIdInput);
  await ensurePredictTables(env);
  let round = await env.DB.prepare('SELECT * FROM predict_rounds WHERE id=? LIMIT 1').bind(roundId).first<RoundRow>();
  if (!round) throw new Error('Prediction round not found.');
  const market = normalizeTradeMarket(round.market);

  if (round.status === 'settled') {
    const lost = await env.DB.prepare("SELECT id FROM predict_bets WHERE round_id=? AND status='lost' ORDER BY datetime(created_at) ASC").bind(roundId).all<{ id: string }>();
    let refundedCount = 0;
    let refundedNano = 0;
    for (const row of lost.results || []) {
      const before = await getPredictOpsBet(env, row.id);
      if (!before?.refundable) continue;
      await manualRefundPredictBet(env, row.id, adminIdInput, false);
      refundedCount += 1;
      refundedNano += before.stakeNano;
    }
    await appendPredictAudit(env, adminIdInput, 'round_manual_refund', { market, targetId: roundId, detail: `${refundedCount} losing bets refunded; ${nanoToTon(refundedNano)} GRAM returned. Winners and existing refunds were unchanged.` }).catch(() => undefined);
    return { roundId, refundedCount, refundedNano, mode: 'safety' };
  }

  if (round.status === 'refunded') return { roundId, refundedCount: 0, refundedNano: 0, mode: 'cancel' };
  if (round.status !== 'open' && round.status !== 'refunding') throw new Error('Only an open/locked round can be closed before settlement.');

  if (round.status === 'open') {
    const locked = await env.DB.prepare("UPDATE predict_rounds SET status='refunding', end_price=NULL, result=NULL WHERE id=? AND status='open'").bind(roundId).run();
    if ((locked.meta?.changes || 0) <= 0) {
      const fresh = await env.DB.prepare('SELECT * FROM predict_rounds WHERE id=? LIMIT 1').bind(roundId).first<RoundRow>();
      if (!fresh) throw new Error('Prediction round not found.');
      if (fresh.status === 'refunded') return { roundId, refundedCount: 0, refundedNano: 0, mode: 'cancel' };
      if (fresh.status !== 'refunding') throw new Error('Round state changed before close could start.');
      round = fresh;
    }
  }

  await env.DB.prepare("UPDATE predict_bets SET status='failed' WHERE round_id=? AND status='pending'").bind(roundId).run();
  const refundable = await env.DB.prepare("SELECT * FROM predict_bets WHERE round_id=? AND status IN ('active','settling_payment') ORDER BY datetime(created_at) ASC").bind(roundId).all<BetRow>();
  for (const bet of refundable.results || []) await payBet(env, bet, Number(bet.stake_nano || 0), 'refunded');

  const remaining = await env.DB.prepare("SELECT COUNT(*) AS count FROM predict_bets WHERE round_id=? AND status IN ('pending','active','settling_payment')").bind(roundId).first<{ count: number }>();
  if (Number(remaining?.count || 0) > 0) throw new Error('Some round refunds are still pending. Retry Close & Refund.');

  await env.DB.prepare("UPDATE predict_rounds SET status='refunded', end_price=NULL, result=NULL, settled_at=COALESCE(settled_at,CURRENT_TIMESTAMP) WHERE id=? AND status='refunding'").bind(roundId).run();
  const totals = await env.DB.prepare("SELECT COUNT(*) AS count, COALESCE(SUM(payout_nano),0) AS total FROM predict_bets WHERE round_id=? AND status='refunded'").bind(roundId).first<{ count: number; total: number }>();
  const refundedCount = Number(totals?.count || 0);
  const refundedNano = normalizePolicyNano(totals?.total);
  await appendPredictOpsIncident(env, 'round_cancel_refund', market, `${roundId} closed by admin; ${refundedCount} bets refunded.`).catch(() => undefined);
  await appendPredictAudit(env, adminIdInput, 'round_cancel_refund', { market, targetId: roundId, detail: `Round closed before settlement; ${refundedCount} bets refunded; ${nanoToTon(refundedNano)} GRAM returned.` }).catch(() => undefined);
  return { roundId, refundedCount, refundedNano, mode: 'cancel' };
}

export async function listPredictAuditLog(env: Env, limitInput = 20, userIdInput: unknown = null): Promise<PredictAuditEntry[]> {
  await ensurePredictOpsTables(env);
  const limit = Math.max(1, Math.min(50, Math.floor(Number(limitInput) || 20)));
  const userId = userIdInput == null || String(userIdInput).trim() === '' ? null : cleanUserId(userIdInput);
  const rows = userId
    ? await env.DB.prepare('SELECT * FROM predict_admin_audit WHERE user_id=? ORDER BY datetime(created_at) DESC LIMIT ?').bind(userId, limit).all<PredictAuditRow>()
    : await env.DB.prepare('SELECT * FROM predict_admin_audit ORDER BY datetime(created_at) DESC LIMIT ?').bind(limit).all<PredictAuditRow>();
  return (rows.results || []).map((row) => ({ id: row.id, adminId: row.admin_id, action: row.action, userId: row.user_id, market: normalizePredictOpsMarketOrNull(row.market), targetId: row.target_id, detail: row.detail, createdAt: row.created_at }));
}

export async function updatePredictOpsControl(env: Env, input: { emergencyPaused?: boolean; maintenanceMessage?: string; pausedMarkets?: Partial<Record<TradeMarket, boolean>>; exposureLimitsNano?: Partial<Record<TradeMarket, number>> }, adminIdInput: unknown): Promise<PredictOpsDashboard> {
  const current = await readPredictOpsControl(env);
  if (typeof input.emergencyPaused === 'boolean') current.emergencyPaused = input.emergencyPaused;
  if (typeof input.maintenanceMessage === 'string') current.maintenanceMessage = input.maintenanceMessage.trim().slice(0, 180);
  for (const market of TRADE_MARKETS) {
    if (typeof input.pausedMarkets?.[market] === 'boolean') current.pausedMarkets[market] = Boolean(input.pausedMarkets[market]);
    if (input.exposureLimitsNano?.[market] !== undefined) current.exposureLimitsNano[market] = normalizePolicyNano(input.exposureLimitsNano[market]);
  }
  current.updatedAt = new Date().toISOString();
  await writePredictOpsControl(env, current);
  await appendPredictAudit(env, adminIdInput, 'ops_control_update', { detail: JSON.stringify(input).slice(0, 360) }).catch(() => undefined);
  await publishPredictOpsRealtime(env).catch(() => undefined);
  return getPredictOpsDashboard(env);
}

export async function setPredictUserMarketAccess(env: Env, userIdInput: unknown, marketInput: unknown, blocked: boolean, durationMsInput: unknown, reasonInput: unknown, adminNoteInput: unknown, adminIdInput: unknown): Promise<PredictUserInspector> {
  const userId = cleanUserId(userIdInput), market = normalizeTradeMarket(String(marketInput || ''));
  const durationMs = blocked ? Math.max(0, Math.floor(Number(durationMsInput) || 0)) : 0;
  const reason = blocked ? (cleanAuditText(reasonInput, 120) || USER_MARKET_BLOCK_MESSAGE) : null;
  const adminNote = blocked ? cleanAuditText(adminNoteInput, 180) : null;
  await setUserSectionBlocked(env, userId, `predict-${market}`, blocked, { durationMs, reason: reason || USER_MARKET_BLOCK_MESSAGE, adminNote: adminNote || undefined });
  await appendPredictAudit(env, adminIdInput, blocked ? 'user_market_block' : 'user_market_unblock', { userId, market, detail: blocked ? `durationMs=${durationMs}; reason=${reason || ''}; note=${adminNote || ''}` : 'access restored' }).catch(() => undefined);
  return getPredictUserInspector(env, userId);
}

export async function forceSettlePredictRound(env: Env, roundIdInput: unknown, adminIdInput: unknown): Promise<PredictOpsRoundView> {
  const roundId = cleanPredictRoundId(roundIdInput); await ensurePredictTables(env);
  const round = await env.DB.prepare('SELECT * FROM predict_rounds WHERE id=? LIMIT 1').bind(roundId).first<RoundRow>();
  if (!round) throw new Error('Prediction round not found.');
  const market = normalizeTradeMarket(round.market);
  await settleDueRounds(env, market, true, 0);
  await appendPredictAudit(env, adminIdInput, 'round_force_settle', { market, targetId: roundId }).catch(() => undefined);
  const fresh = await env.DB.prepare('SELECT * FROM predict_rounds WHERE id=? LIMIT 1').bind(roundId).first<RoundRow>();
  if (!fresh) throw new Error('Prediction round not found after settlement.');
  return predictOpsRoundView(env, fresh);
}

export async function publishPredictOpsRealtime(env: Env): Promise<void> {
  const dashboard = await getPredictOpsDashboard(env);
  const state: PredictOpsRealtimeState = {
    emergencyPaused: dashboard.emergencyPaused,
    maintenanceMessage: dashboard.maintenanceMessage,
    updatedAt: dashboard.updatedAt,
    markets: dashboard.markets.map((item) => ({ market: item.market, manualPaused: item.manualPaused, circuitOpen: item.circuitOpen, circuitReason: item.circuitReason, capacityReached: item.capacityReached })),
  };
  await publishPredictOpsState(env, state);
}

async function assertPredictBettingAvailable(env: Env, market: TradeMarket, userId: string, stakeNano: number, existingReservation: boolean): Promise<PredictBetGuard> {
  const [control, feed, userLimits, controls, dailyStakeNano, activeExposureNano] = await Promise.all([
    readPredictOpsControl(env), readPredictOpsFeed(env, market), getPredictUserLimits(env, userId), getUserControls(env, userId), getPredictUserDailyStake(env, userId), getPredictMarketExposure(env, market),
  ]);
  if (control.emergencyPaused) throw new Error(control.maintenanceMessage || DEFAULT_PREDICT_MAINTENANCE);
  if (control.pausedMarkets[market]) throw new Error(`${marketLabel(market)} predictions are temporarily paused.`);
  if (feed.circuitOpen) throw new Error(feed.circuitReason || `${marketLabel(market)} live price feed is unavailable.`);
  const access = userMarketAccessFromControls(controls.sectionBlocks || [], market);
  if (access.blocked) throw new Error(access.reason || USER_MARKET_BLOCK_MESSAGE);
  if (!existingReservation) {
    if (userLimits.maxBetNano > 0 && stakeNano > userLimits.maxBetNano) throw new Error(`Your maximum prediction is ${nanoToTon(userLimits.maxBetNano)} GRAM per bet.`);
    if (userLimits.dailyLimitNano > 0 && dailyStakeNano + stakeNano > userLimits.dailyLimitNano) throw new Error(`Your daily Predict limit is ${nanoToTon(userLimits.dailyLimitNano)} GRAM.`);
    const exposureLimitNano = control.exposureLimitsNano[market];
    if (exposureLimitNano > 0 && activeExposureNano + stakeNano > exposureLimitNano) throw new Error('This market has reached its current betting capacity. Please try again later.');
  }
  return { control, userLimits };
}

async function notePredictFeedSuccess(env: Env, market: TradeMarket, price: number): Promise<void> {
  const clean = Number(price);
  if (!Number.isFinite(clean) || clean <= 0) return;
  const current = await readPredictOpsFeed(env, market);
  const recovered = current.circuitOpen;
  const next: PredictOpsFeed = { lastPrice: clean, lastSuccessAt: new Date().toISOString(), circuitOpen: false, circuitReason: null, circuitOpenedAt: null, lastError: null, lastErrorAt: null };
  await writePredictOpsFeed(env, market, next);
  if (recovered) {
    await reportPredictOpsRuntimeRecovered(env, 'feed_circuit_open', market, `${marketLabel(market)} price feed is responding normally again.`).catch(() => undefined);
    await publishPredictOpsRealtime(env).catch(() => undefined);
  }
}

async function notePredictFeedFailure(env: Env, market: TradeMarket, reasonInput: unknown): Promise<void> {
  const reason = String(reasonInput || 'Price feed unavailable').replace(/\s+/g, ' ').trim().slice(0, 220);
  const current = await readPredictOpsFeed(env, market);
  const now = new Date().toISOString();
  const next: PredictOpsFeed = { ...current, circuitOpen: true, circuitReason: reason, circuitOpenedAt: current.circuitOpenedAt || now, lastError: reason, lastErrorAt: now };
  await writePredictOpsFeed(env, market, next);
  if (!current.circuitOpen) { await reportPredictOpsRuntimeError(env, 'feed_circuit_open', market, `${marketLabel(market)} feed circuit opened: ${reason}`); await publishPredictOpsRealtime(env).catch(() => undefined); }
}

function isPredictPriceFeedError(error: unknown): boolean { return /aster|mark price|boundary price|invalid price|price snapshot|snapshot is empty|monthly boundary/i.test(messageOf(error)); }

async function isExpectedPredictRequestError(env: Env, market: TradeMarket | null, error: unknown): Promise<boolean> {
  const message = messageOf(error);
  if (/open the mini app inside telegram|invalid telegram session|telegram session expired|telegram user mismatch|missing telegram user|missing user id|invalid predict market|choose up or down|enter a valid gram amount|this prediction is closed|already placed a prediction|previous prediction is still processing|prediction could not be reserved|insufficient balance|your access to this market is currently paused|predictions are temporarily unavailable|predictions are temporarily paused|live price feed is unavailable|your maximum prediction|your daily predict limit|current betting capacity/i.test(message)) return true;
  if (!market) return false;
  const control = await readPredictOpsControl(env).catch(() => null);
  return Boolean(control?.maintenanceMessage && message === control.maintenanceMessage);
}

async function publishPredictRoundRealtimeObserved(env: Env, market: TradeMarket, roundId: string, userIdInput: unknown = ''): Promise<boolean> {
  try {
    await publishPredictRoundState(env, market, roundId, userIdInput);
    await reportPredictOpsRuntimeRecovered(env, 'round_realtime_publish_failed', market, `Realtime round sync succeeded for ${roundId}.`).catch(() => undefined);
    return true;
  } catch (error) {
    await reportPredictOpsRuntimeError(env, 'round_realtime_publish_failed', market, `Round ${roundId}: ${messageOf(error)}`);
    return false;
  }
}

async function reportPredictOpsRuntimeError(env: Env, typeInput: unknown, marketInput: unknown, messageInput: unknown): Promise<void> {
  const type = cleanPredictRuntimeType(typeInput);
  const market = marketInput == null ? null : normalizePredictOpsMarketOrNull(marketInput);
  const message = cleanPredictRuntimeMessage(messageInput);
  const where = predictRuntimeLocation(type);
  const key = predictRuntimeIssueKey(type, market);
  const previous = await readPredictRuntimeIssue(env, key);
  const now = new Date().toISOString();
  const issue: PredictRuntimeIssue = { type, market, where, message, firstAt: previous?.firstAt || now, lastAt: now };
  await Promise.allSettled([
    appendPredictOpsIncident(env, type, market, `${where}: ${message}`),
    env.BOT_CACHE.put(key, JSON.stringify(issue)),
  ]);
  if (!previous || previous.message !== message || previous.where !== where) await notifyPredictAdmins(env, 'error', issue);
}

async function reportPredictOpsRuntimeRecovered(env: Env, typeInput: unknown, marketInput: unknown, recoveryInput: unknown): Promise<void> {
  const type = cleanPredictRuntimeType(typeInput);
  const market = marketInput == null ? null : normalizePredictOpsMarketOrNull(marketInput);
  const key = predictRuntimeIssueKey(type, market);
  const previous = await readPredictRuntimeIssue(env, key);
  if (!previous) return;
  try { await env.BOT_CACHE.delete(key); } catch { return; }
  const recovery = cleanPredictRuntimeMessage(recoveryInput || 'The affected Predict path completed successfully again.');
  await appendPredictOpsIncident(env, `${type}_recovered`, market, `${previous.where}: ${recovery}`).catch(() => undefined);
  await notifyPredictAdmins(env, 'recovered', previous, recovery);
}

function predictRuntimeLocation(type: string): string {
  if (type === 'round_request_failed') return 'predict-routes.ts → GET /app/api/predict-round → load/create/settle/public round';
  if (type === 'bet_request_failed') return 'predict-routes.ts → POST /app/api/predict-bet → reserve/debit/provider order/activate';
  if (type === 'feed_circuit_open') return 'predict-routes.ts → Predict price-feed circuit breaker';
  if (type === 'round_realtime_publish_failed') return 'predict-routes.ts → publishPredictRoundRealtimeObserved → section-lock-events.ts';
  return 'predict-routes.ts → Predict runtime';
}

function cleanPredictRuntimeType(value: unknown): string { const text = String(value || 'runtime').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 60); return text || 'runtime'; }
function cleanPredictRuntimeMessage(value: unknown): string { return String(value || 'Unknown Predict runtime failure').replace(/\s+/g, ' ').trim().slice(0, 500); }
function predictRuntimeIssueKey(type: string, market: TradeMarket | null): string { return `${PREDICT_RUNTIME_ISSUE_PREFIX}${market || 'all'}:${type}`; }
async function readPredictRuntimeIssue(env: Env, key: string): Promise<PredictRuntimeIssue | null> { const raw = await env.BOT_CACHE.get(key).catch(() => null); if (!raw) return null; try { const value = JSON.parse(raw) as PredictRuntimeIssue; return value && typeof value === 'object' ? value : null; } catch { return null; } }
async function notifyPredictAdmins(env: Env, status: 'error' | 'recovered', issue: PredictRuntimeIssue, recovery = ''): Promise<void> {
  const token = gameBotToken(env);
  const adminsRaw = String((env as Env & { ADMIN_IDS?: string }).ADMIN_IDS || '').trim();
  const adminIds = adminsRaw.split(/[\s,;]+/).map((v) => v.trim()).filter((v) => /^\d+$/.test(v));
  if (!token || !adminIds.length) return;
  const marketText = issue.market ? marketLabel(issue.market) : 'All';
  const text = status === 'error'
    ? `🚨 <b>Predict Runtime Alert</b>\n<b>Status:</b> ERROR\n<b>Type:</b> <code>${escapeTelegramHtml(issue.type)}</code>\n<b>Market:</b> ${escapeTelegramHtml(marketText)}\n<b>Where:</b> <code>${escapeTelegramHtml(issue.where)}</code>\n<b>Root error:</b> ${escapeTelegramHtml(issue.message)}\n<b>First seen:</b> ${escapeTelegramHtml(issue.firstAt)}\n<b>Detected:</b> ${escapeTelegramHtml(issue.lastAt)}`
    : `✅ <b>Predict Runtime Recovered</b>\n<b>Type:</b> <code>${escapeTelegramHtml(issue.type)}</code>\n<b>Market:</b> ${escapeTelegramHtml(marketText)}\n<b>Where:</b> <code>${escapeTelegramHtml(issue.where)}</code>\n<b>Previous error:</b> ${escapeTelegramHtml(issue.message)}\n<b>Recovery:</b> ${escapeTelegramHtml(recovery)}\n<b>Recovered at:</b> ${escapeTelegramHtml(new Date().toISOString())}`;
  await Promise.allSettled(adminIds.map((chatId) => fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }) })));
}
function escapeTelegramHtml(value: unknown): string { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

async function readPredictOpsControl(env: Env): Promise<PredictOpsControl> {
  const fallback: PredictOpsControl = { emergencyPaused: false, maintenanceMessage: DEFAULT_PREDICT_MAINTENANCE, pausedMarkets: { bitcoin: false, gold: false, oil: false }, exposureLimitsNano: { bitcoin: 0, gold: 0, oil: 0 }, updatedAt: null };
  const raw = await env.BOT_CACHE.get(PREDICT_OPS_CONTROL_KEY).catch(() => null);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<PredictOpsControl>;
    const paused = parsed.pausedMarkets && typeof parsed.pausedMarkets === 'object' ? parsed.pausedMarkets : {} as Record<string, unknown>;
    const exposure = parsed.exposureLimitsNano && typeof parsed.exposureLimitsNano === 'object' ? parsed.exposureLimitsNano : {} as Record<string, unknown>;
    return { emergencyPaused: parsed.emergencyPaused === true, maintenanceMessage: typeof parsed.maintenanceMessage === 'string' ? parsed.maintenanceMessage.slice(0, 180) : '', pausedMarkets: { bitcoin: paused.bitcoin === true, gold: paused.gold === true, oil: paused.oil === true }, exposureLimitsNano: { bitcoin: normalizePolicyNano(exposure.bitcoin), gold: normalizePolicyNano(exposure.gold), oil: normalizePolicyNano(exposure.oil) }, updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null };
  } catch { return fallback; }
}

function writePredictOpsControl(env: Env, value: PredictOpsControl): Promise<void> { return env.BOT_CACHE.put(PREDICT_OPS_CONTROL_KEY, JSON.stringify(value)); }

async function readPredictOpsFeed(env: Env, market: TradeMarket): Promise<PredictOpsFeed> {
  const fallback: PredictOpsFeed = { lastPrice: null, lastSuccessAt: null, circuitOpen: false, circuitReason: null, circuitOpenedAt: null, lastError: null, lastErrorAt: null };
  const raw = await env.BOT_CACHE.get(PREDICT_OPS_FEED_PREFIX + market).catch(() => null);
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<PredictOpsFeed>;
    const lastPrice = Number(parsed.lastPrice);
    return { lastPrice: Number.isFinite(lastPrice) && lastPrice > 0 ? lastPrice : null, lastSuccessAt: typeof parsed.lastSuccessAt === 'string' ? parsed.lastSuccessAt : null, circuitOpen: parsed.circuitOpen === true, circuitReason: typeof parsed.circuitReason === 'string' ? parsed.circuitReason.slice(0, 220) : null, circuitOpenedAt: typeof parsed.circuitOpenedAt === 'string' ? parsed.circuitOpenedAt : null, lastError: typeof parsed.lastError === 'string' ? parsed.lastError.slice(0, 220) : null, lastErrorAt: typeof parsed.lastErrorAt === 'string' ? parsed.lastErrorAt : null };
  } catch { return fallback; }
}
function writePredictOpsFeed(env: Env, market: TradeMarket, value: PredictOpsFeed): Promise<void> { return env.BOT_CACHE.put(PREDICT_OPS_FEED_PREFIX + market, JSON.stringify(value)); }

async function appendPredictOpsIncident(env: Env, type: string, market: TradeMarket | null, message: string): Promise<void> {
  const incidents = await getPredictOpsIncidents(env);
  incidents.unshift({ id: 'pi_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18), at: new Date().toISOString(), type: String(type || 'event').slice(0, 60), market, message: String(message || '').slice(0, 240) });
  await env.BOT_CACHE.put(PREDICT_OPS_INCIDENTS_KEY, JSON.stringify(incidents.slice(0, PREDICT_OPS_INCIDENT_LIMIT)));
}

async function ensurePredictOpsTables(env: Env): Promise<void> {
  if (!predictOpsTablesReady) {
    predictOpsTablesReady = (async () => {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS predict_user_limits (user_id TEXT PRIMARY KEY, max_bet_nano INTEGER NOT NULL DEFAULT 0, daily_limit_nano INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS predict_admin_audit (id TEXT PRIMARY KEY, admin_id TEXT NOT NULL, action TEXT NOT NULL, user_id TEXT, market TEXT, target_id TEXT, detail TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_predict_admin_audit_created ON predict_admin_audit(created_at)').run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_predict_admin_audit_user ON predict_admin_audit(user_id, created_at)').run();
    })().catch((error) => { predictOpsTablesReady = null; throw error; });
  }
  await predictOpsTablesReady;
}

async function appendPredictAudit(env: Env, adminIdInput: unknown, actionInput: unknown, detail: { userId?: unknown; market?: TradeMarket | null; targetId?: unknown; detail?: unknown }): Promise<void> {
  await ensurePredictOpsTables(env);
  const adminId = cleanAdminId(adminIdInput) || 'system';
  const action = cleanAuditText(actionInput, 60) || 'unknown';
  const userId = detail.userId == null || String(detail.userId).trim() === '' ? null : cleanUserId(detail.userId);
  const market = detail.market || null;
  const targetId = cleanAuditText(detail.targetId, 120);
  const text = cleanAuditText(detail.detail, 360);
  await env.DB.prepare(`INSERT INTO predict_admin_audit (id, admin_id, action, user_id, market, target_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind('pa_' + crypto.randomUUID().replace(/-/g, '').slice(0, 22), adminId, action, userId, market, targetId, text).run();
}

async function getPredictUserDailyStake(env: Env, userId: string): Promise<number> { await ensurePredictTables(env); const row = await env.DB.prepare("SELECT COALESCE(SUM(stake_nano),0) AS total FROM predict_bets WHERE user_id=? AND status!='failed' AND date(created_at)=date('now')").bind(userId).first<{ total: number }>(); return normalizePolicyNano(row?.total); }
async function getPredictMarketExposure(env: Env, market: TradeMarket): Promise<number> { await ensurePredictTables(env); const row = await env.DB.prepare("SELECT COALESCE(SUM(stake_nano),0) AS total FROM predict_bets WHERE market=? AND status IN ('pending','active','settling_payment')").bind(market).first<{ total: number }>(); return normalizePolicyNano(row?.total); }

function userMarketAccessFromControls(blocks: UserSectionBlock[], market: TradeMarket): PredictUserMarketAccess {
  const block = blocks.find((item) => item.sectionId === `predict-${market}` && item.blocked);
  return { market, blocked: Boolean(block), expiresAt: block?.expiresAt || null, remainingMs: block?.remainingMs ?? null, reason: block?.reason || null, adminNote: block?.adminNote || null };
}

function predictOpsBetView(row: PredictBetAdminRow): PredictOpsBetView {
  const market = normalizeTradeMarket(row.market), status = String(row.status || ''), roundStatus = String(row.round_status || '');
  return { id: String(row.id || ''), roundId: String(row.round_id || ''), market, userId: cleanUserId(row.user_id), side: String(row.side || ''), stakeNano: normalizePolicyNano(row.stake_nano), status, payoutNano: normalizePolicyNano(row.payout_nano), createdAt: String(row.created_at || ''), roundStatus, roundResult: row.round_result == null ? null : String(row.round_result), roundEndsAt: String(row.round_ends_at || ''), refundable: status === 'lost' && roundStatus === 'settled' };
}

function realtimeMarketState(dashboard: PredictOpsDashboard, market: PredictOpsMarket): { manualPaused: boolean; circuitOpen: boolean; circuitReason: string | null; capacityReached: boolean } {
  const status = dashboard.markets.find((item) => item.market === market);
  if (!status) throw new Error('Market status unavailable.');
  return { manualPaused: status.manualPaused, circuitOpen: status.circuitOpen, circuitReason: status.circuitReason, capacityReached: status.capacityReached };
}

function cleanPredictRoundId(value: unknown): string { const id = String(value || '').trim(); if (!/^pr_(bitcoin|gold|oil)_\d+$/.test(id)) throw new Error('Invalid prediction round id.'); return id; }
function cleanPredictBetId(value: unknown): string { const id = String(value || '').trim(); if (!/^pbet_[0-9A-Za-z_-]{8,40}$/.test(id)) throw new Error('Invalid prediction bet id.'); return id; }
function normalizePredictOpsMarketOrNull(value: unknown): TradeMarket | null { try { return normalizeTradeMarket(String(value || '')); } catch { return null; } }
function marketLabel(market: TradeMarket): string { return market === 'bitcoin' ? 'Bitcoin' : market === 'gold' ? 'Gold' : 'Oil'; }
function cleanAdminId(value: unknown): string { return String(value ?? '').replace(/[^0-9A-Za-z_-]/g, '').trim().slice(0, 80); }
function cleanAuditText(value: unknown, max: number): string | null { const text = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max); return text || null; }
function normalizePolicyNano(value: unknown): number { const n = Number(value); if (!Number.isFinite(n) || n <= 0) return 0; return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(n)); }
function messageOf(error: unknown): string { return error instanceof Error ? error.message : String(error || 'Unknown error'); }

async function getPredictImageResponse(env: Env, key: string): Promise<Response> {
  const object = await env.ASSETS.get(key).catch(() => null);
  if (!object) return new Response('Not found', { status: 404, headers: { 'cache-control': CACHE_NONE } });
  const headers = new Headers(); object.writeHttpMetadata(headers); headers.set('etag', object.httpEtag); headers.set('cache-control', CACHE_LONG); if (!headers.get('content-type')) headers.set('content-type', object.customMetadata?.contentType || 'image/png'); return new Response(object.body, { headers });
}
function predictImageKey(market: PredictMarket): string { return `predict/${market}/question-image`; }
function normalizePredictMarket(value: string): PredictMarket { const market = value.trim().toLowerCase(); if (market === 'bitcoin' || market === 'btc') return 'bitcoin'; if (market === 'gold' || market === 'paxg') return 'gold'; if (market === 'oil' || market === 'cl' || market === 'clusdt') return 'oil'; throw new Error('Invalid predict market'); }
function normalizeTradeMarket(value: string): TradeMarket { const market = value.trim().toLowerCase(); if (market === 'bitcoin' || market === 'btc') return 'bitcoin'; if (market === 'gold' || market === 'paxg') return 'gold'; if (market === 'oil' || market === 'cl' || market === 'clusdt') return 'oil'; throw new Error('Invalid predict market'); }
function calendarMonthWindow(now: number): { startMs: number; endMs: number } { const date = new Date(now); const year = date.getUTCFullYear(); const month = date.getUTCMonth(); return { startMs: Date.UTC(year, month, 1), endMs: Date.UTC(year, month + 1, 1) }; }
function betLockAtMs(round: RoundRow): number { const starts = Date.parse(String(round.starts_at || '')); const ends = Date.parse(String(round.ends_at || '')); if (!Number.isFinite(starts) || !Number.isFinite(ends)) return 0; return String(round.market || '') === 'bitcoin' ? Math.max(starts, ends - LOCK_MS) : Math.min(ends, starts + MONTH_BET_WINDOW_MS); }
function normalizeSide(value: unknown): PredictSide { const side = String(value || '').toLowerCase(); if (side === 'up' || side === 'down') return side; throw new Error('Choose Up or Down'); }
function tonToNano(value: unknown): number { const n = Number(value); if (!Number.isFinite(n) || n <= 0) return 0; return Math.max(1, Math.floor(n * NANO)); }
function nanoToTon(value: number): number { return Math.floor(Number(value) || 0) / NANO; }
function cleanPrice(value: unknown): number { const n = Number(value); if (!Number.isFinite(n) || n <= 0) throw new Error('Invalid price'); return n; }
function cleanOptionalPrice(value: unknown): number { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : 0; }
function cleanDbText(value: unknown, message: string): string { const text = String(value ?? '').trim(); if (!text) throw new Error(message); return text; }
function cleanUserId(value: unknown): string { const id = String(value ?? '').replace(/[^0-9A-Za-z_-]/g, '').trim().slice(0, 80); if (!id) throw new Error('Missing user id'); return id; }
function cleanUserIdOptional(value: unknown): string { return String(value ?? '').replace(/[^0-9A-Za-z_-]/g, '').trim().slice(0, 80); }
async function authenticateUser(env: Env, claimedInput: unknown, initDataInput: unknown): Promise<string> { const claimed = cleanUserId(claimedInput); const verified = await validateTelegramInitData(initDataInput, gameBotToken(env)); if (verified !== claimed) throw new Error('Telegram user mismatch'); return verified; }
