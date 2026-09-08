import app from './index';
import './prediction-events';
import type { Env } from './types';
import { publishPredictOpsState, publishPredictRoundState, type PredictOpsRealtimeState } from './section-lock-events';
import { adjustUserTonBalance, debitUserTonBalanceIfEnough, getUserControls, publicUserControls, setUserSectionBlocked, type UserSectionBlock } from './user-controls';
import { gameBotToken, validateTelegramInitData } from './utils';
import { getSectionAccess, isMiniAppAdmin } from './section-access';
import { ensurePredictProviderTables, executePolymarketBitcoinBet, getPolymarketBetExecution, getPolymarketBetStatus, getPredictProviderState, getPredictRoundProvider, getRequestedPredictProvider, loadPolymarketBitcoinMarket, persistPolymarketRound, POLYMARKET_RTDS_URL, rememberPredictRoundProvider, resolvePolymarketBitcoinRound, type PredictProvider } from './predict-polymarket';

const CACHE_LONG = 'public, max-age=31536000, immutable';
const CACHE_NONE = 'no-store';
const CACHE_PREDICT_IMAGE_MANIFEST = 'public, max-age=300, stale-while-revalidate=86400';
const PREDICT_MARKETS = ['bitcoin', 'gold', 'oil'] as const;
const TRADE_MARKETS = ['bitcoin', 'gold', 'oil'] as const;
const ASTER_FUTURES_REST_BASE = 'https://fapi.asterdex.com';
const ROUND_MS = 5 * 60 * 1000;
const MONTH_BET_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const LOCK_MS = 0;
const PLATFORM_FEE_BPS = 500;
const POLYMARKET_PLATFORM_FEE_BPS = 200;
const NANO = 1_000_000_000;
const ROUND_BOOTSTRAP_LEASE_MS = 20_000;
const ROUND_BOOTSTRAP_DEFAULT_RETRY_MS = 2_000;
const ROUND_BOOTSTRAP_RATE_LIMIT_RETRY_MS = 30_000;
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
type RoundBootstrapRow = { round_id: string; market: string; lease_until_ms: number; retry_after_ms: number; last_error: string | null; updated_at: string };
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
export type PredictPlatformFeeStats = { rate: number; totalNano: number; todayNano: number; weekNano: number; monthNano: number };
export type PredictUserLimits = { userId: string; maxBetNano: number; dailyLimitNano: number; updatedAt: string | null };
export type PredictUserMarketAccess = { market: TradeMarket; blocked: boolean; expiresAt: string | null; remainingMs: number | null; reason: string | null; adminNote: string | null };
export type PredictOpsBetView = { id: string; roundId: string; market: TradeMarket; userId: string; side: string; stakeNano: number; status: string; payoutNano: number; createdAt: string; roundStatus: string; roundResult: string | null; roundEndsAt: string; refundable: boolean };
export type PredictUserInspector = { userId: string; totalBets: number; wins: number; losses: number; refunded: number; active: number; totalStakeNano: number; totalPayoutNano: number; netNano: number; todayStakeNano: number; lastBetAt: string | null; limits: PredictUserLimits; access: PredictUserMarketAccess[]; recentBets: PredictOpsBetView[] };
export type PredictAuditEntry = { id: string; adminId: string; action: string; userId: string | null; market: TradeMarket | null; targetId: string | null; detail: string | null; createdAt: string };

type PredictBetGuard = { control: PredictOpsControl; userLimits: PredictUserLimits };
let predictOpsTablesReady: Promise<void> | null = null;

class PredictRoundStartingError extends Error {
  readonly roundId: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly retryAfterMs: number;
  constructor(roundId: string, startsAt: string, endsAt: string, retryAfterMs: number) {
    super('Prediction round is starting');
    this.name = 'PredictRoundStartingError';
    this.roundId = roundId;
    this.startsAt = startsAt;
    this.endsAt = endsAt;
    this.retryAfterMs = Math.max(500, Math.min(60_000, Math.floor(Number(retryAfterMs) || ROUND_BOOTSTRAP_DEFAULT_RETRY_MS)));
  }
}

app.get('/app/api/predict-markets', async (c) => c.json(await getPredictMarkets(c.env), 200, { 'cache-control': CACHE_PREDICT_IMAGE_MANIFEST }));

app.get('/app/api/predict-round', async (c) => {
  let market: TradeMarket | null = null;
  let userId = '';
  try {
    market = normalizeTradeMarket(String(c.req.query('market') || 'bitcoin'));
    userId = await authenticateUser(c.env, c.req.query('userId'), c.req.header('x-telegram-init-data'));
    const providerState = market === 'bitcoin' ? await getPredictProviderStateForRound(c.env) : null;
    const snapshot = providerState === 'polymarket' ? { price: 0, history: [] } : await fetchMarketSnapshot(market);
    if (snapshot.price > 0) await notePredictFeedSuccess(c.env, market, snapshot.price).catch(() => undefined);
    await settleDueRounds(c.env, market, false, snapshot.price);
    const round = await getOrCreateCurrentRound(c.env, market, snapshot.price);
    const response = { ...(await publicRoundJson(c.env, round, userId, snapshot.price)), history: snapshot.history };
    await reportPredictOpsRuntimeRecovered(c.env, 'round_request_failed', market, 'Predict round API completed successfully.').catch(() => undefined);
    return c.json(response, 200, { 'cache-control': CACHE_NONE });
  } catch (error) {
    if (market === 'bitcoin' && error instanceof PredictRoundStartingError) {
      const now = Date.now();
      const ends = Date.parse(error.endsAt);
      const controls = userId ? await publicUserControls(c.env, userId).catch(() => null) : null;
      return c.json({
        ok: true,
        starting: true,
        retryAfterMs: error.retryAfterMs,
        userControls: controls,
        history: [],
        round: {
          id: error.roundId,
          market: 'bitcoin',
          provider: 'polymarket',
          polymarket: null,
          startsAt: error.startsAt,
          endsAt: error.endsAt,
          startPrice: null,
          livePrice: null,
          endPrice: null,
          status: 'starting',
          result: null,
          remainingMs: Number.isFinite(ends) ? Math.max(0, ends - now) : ROUND_MS,
          lockRemainingMs: 0,
          pools: { up: { stakeNano: 0, stakeTon: 0, count: 0 }, down: { stakeNano: 0, stakeTon: 0, count: 0 } },
          userBets: [],
          recentUserBets: [],
        },
      }, 202, { 'cache-control': CACHE_NONE, 'retry-after': String(Math.max(1, Math.ceil(error.retryAfterMs / 1000))) });
    }
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
    if (!isMiniAppAdmin(c.env, userId) && (await getSectionAccess(c.env)).some((lock) => lock.sectionId === `predict-${market}`)) {
      throw new Error('This prediction market is temporarily locked.');
    }
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
      const grossStakeUsd = Number(nanoToTon(stakeNano)) * tonUsd;
      const stakeUsd = grossStakeUsd * (10_000 - POLYMARKET_PLATFORM_FEE_BPS) / 10_000;
      if (!(grossStakeUsd > 0) || !(stakeUsd > 0)) throw new Error('A current Gram/USD price is required for Polymarket predictions');
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
    if (debited && betId && userId && !preserveReservation) {
      await adjustUserTonBalance(c.env, userId, stakeNano, { kind: 'predict', title: 'Prediction stake rollback', referenceId: betId, referenceType: 'predict_bet', metadata: { market, status: 'polymarket-order-failed' } }).catch(() => undefined);
    }
    if (betId && !preserveReservation) {
      const failed = await c.env.DB.prepare("UPDATE predict_bets SET status = 'failed' WHERE id = ? AND status = 'pending'").bind(betId).run().catch(() => null);
      releasedReservation = Number(failed?.meta?.changes || 0) > 0;
    }
    if (releasedReservation && market) await publishPredictOpsRealtime(c.env).catch(() => undefined);
    if (!feedError && !(await isExpectedPredictRequestError(c.env, market, error))) await reportPredictOpsRuntimeError(c.env, 'bet_request_failed', market, errorMessage);
    return c.json({ ok: false, error: error instanceof Error ? error.message : 'Could not place prediction' }, 400, { 'cache-control': CACHE_NONE });
  }
});

app.get('/app/api/predict-market-image/:market', async (c) => {
  try {
    const market = normalizePredictMarket(c.req.param('market').replace(/\.png$/i, ''));
    return getPredictImageResponse(c.env, predictImageKey(market));
  } catch {
    return c.text('Not found', 404, { 'cache-control': CACHE_NONE });
  }
});

async function getPredictMarkets(env: Env): Promise<{ markets: Record<PredictMarket, { imageUrl: string }> }> {
  const entries = await Promise.all(PREDICT_MARKETS.map(async (market) => {
    const head = await env.ASSETS.head(predictImageKey(market)).catch(() => null);
    const version = head?.customMetadata?.version || '1';
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
  const polymarketRow = provider === 'polymarket'
    ? await env.DB.prepare('SELECT condition_id, up_token_id, down_token_id, rtds_topic FROM predict_polymarket_rounds WHERE round_id = ?').bind(roundId).first<{ condition_id: string; up_token_id: string; down_token_id: string; rtds_topic: string }>()
    : null;
  const polymarket = polymarketRow ? {
    conditionId: String(polymarketRow.condition_id || ''),
    upTokenId: String(polymarketRow.up_token_id || ''),
    downTokenId: String(polymarketRow.down_token_id || ''),
    rtdsTopic: String(polymarketRow.rtds_topic || ''),
    rtdsUrl: POLYMARKET_RTDS_URL,
    clobWsUrl: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
    takerFeeRate: 0.07,
    platformFeeRate: POLYMARKET_PLATFORM_FEE_BPS / 10_000,
  } : null;
  return { ok: true, userControls, round: { id: roundId, market: String(round.market || ''), provider, polymarket, startsAt: String(round.starts_at || ''), endsAt: String(round.ends_at || ''), startPrice: Number(round.start_price || 0), livePrice: Number(livePrice) > 0 ? Number(livePrice) : null, endPrice: round.end_price == null ? null : Number(round.end_price), status: now >= lockAt && round.status === 'open' ? 'locked' : String(round.status || 'open'), result: round.result || null, remainingMs: Math.max(0, ends - now), lockRemainingMs: Math.max(0, lockAt - now), pools, userBets, recentUserBets } };
}
async function ensurePredictTables(env: Env): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS predict_rounds (id TEXT PRIMARY KEY, market TEXT NOT NULL, starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, start_price REAL NOT NULL, end_price REAL, status TEXT NOT NULL DEFAULT 'open', result TEXT, settled_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_predict_rounds_market_end ON predict_rounds(market, ends_at)').run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS predict_bets (id TEXT PRIMARY KEY, round_id TEXT NOT NULL, market TEXT NOT NULL, user_id TEXT NOT NULL, side TEXT NOT NULL, stake_nano INTEGER NOT NULL, ton_usd_snapshot REAL NOT NULL DEFAULT 0, stake_usd_snapshot REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', payout_nano INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_predict_bets_round ON predict_bets(round_id)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_predict_bets_user_round ON predict_bets(user_id, round_id)').run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS predict_round_bootstrap (round_id TEXT PRIMARY KEY, market TEXT NOT NULL, lease_until_ms INTEGER NOT NULL DEFAULT 0, retry_after_ms INTEGER NOT NULL DEFAULT 0, last_error TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`).run();
}
async function getPredictProviderStateForRound(env: Env): Promise<PredictProvider> {
  const state = await getPredictProviderState(env);
  return state.active || state.requested;
}
async function claimPredictRoundBootstrap(env: Env, roundId: string, market: TradeMarket): Promise<{ claimed: boolean; retryAfterMs: number }> {
  const now = Date.now();
  const leaseUntil = now + ROUND_BOOTSTRAP_LEASE_MS;
  const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO predict_round_bootstrap (round_id, market, lease_until_ms, retry_after_ms, last_error, updated_at) VALUES (?, ?, ?, 0, NULL, CURRENT_TIMESTAMP)`)
    .bind(roundId, market, leaseUntil).run();
  if ((inserted.meta?.changes || 0) > 0) return { claimed: true, retryAfterMs: 0 };
  const current = await env.DB.prepare('SELECT * FROM predict_round_bootstrap WHERE round_id = ? LIMIT 1').bind(roundId).first<RoundBootstrapRow>();
  if (!current) return { claimed: false, retryAfterMs: ROUND_BOOTSTRAP_DEFAULT_RETRY_MS };
  if (Number(current.retry_after_ms || 0) > now) return { claimed: false, retryAfterMs: Number(current.retry_after_ms) - now };
  const claimed = await env.DB.prepare(`UPDATE predict_round_bootstrap SET market = ?, lease_until_ms = ?, last_error = NULL, updated_at = CURRENT_TIMESTAMP WHERE round_id = ? AND lease_until_ms <= ? AND retry_after_ms <= ?`)
    .bind(market, leaseUntil, roundId, now, now).run();
  if ((claimed.meta?.changes || 0) > 0) return { claimed: true, retryAfterMs: 0 };
  const activeLease = Math.max(0, Number(current.lease_until_ms || 0) - now);
  return { claimed: false, retryAfterMs: Math.max(750, Math.min(ROUND_BOOTSTRAP_DEFAULT_RETRY_MS, activeLease || ROUND_BOOTSTRAP_DEFAULT_RETRY_MS)) };
}
async function deferPredictRoundBootstrap(env: Env, roundId: string, error: unknown): Promise<number> {
  const message = messageOf(error);
  const retryMs = /HTTP 429/i.test(message) ? ROUND_BOOTSTRAP_RATE_LIMIT_RETRY_MS : ROUND_BOOTSTRAP_DEFAULT_RETRY_MS;
  await env.DB.prepare(`UPDATE predict_round_bootstrap SET lease_until_ms = 0, retry_after_ms = ?, last_error = ?, updated_at = CURRENT_TIMESTAMP WHERE round_id = ?`)
    .bind(Date.now() + retryMs, message.slice(0, 240), roundId).run();
  return retryMs;
}
async function clearPredictRoundBootstrap(env: Env, roundId: string): Promise<void> {
  await env.DB.prepare('DELETE FROM predict_round_bootstrap WHERE round_id = ?').bind(roundId).run();
}
async function getOrCreateCurrentRound(env: Env, market: TradeMarket, latestPrice = 0): Promise<RoundRow> {
  await ensurePredictTables(env);
  const now = Date.now();
  if (market === 'bitcoin') {
    let existing = await env.DB.prepare(`SELECT * FROM predict_rounds WHERE market = ? AND datetime(starts_at) <= datetime('now') AND datetime(ends_at) > datetime('now') ORDER BY datetime(starts_at) DESC LIMIT 1`).bind(market).first<RoundRow>();
    if (existing) {
      if (Number(existing.start_price) > 0) return existing;
      const provider = await getPredictRoundProvider(env, existing.id);
      if (provider === 'polymarket') {
        const startMs = Date.parse(existing.starts_at);
        if (!Number.isFinite(startMs) || startMs <= 0) throw new Error('Invalid Polymarket Bitcoin round start');
        const bootstrap = await claimPredictRoundBootstrap(env, existing.id, market);
        if (!bootstrap.claimed) throw new PredictRoundStartingError(existing.id, existing.starts_at, existing.ends_at, bootstrap.retryAfterMs);
        let polymarketRound: Awaited<ReturnType<typeof loadPolymarketBitcoinMarket>>;
        try {
          polymarketRound = await loadPolymarketBitcoinMarket(startMs);
        } catch (error) {
          const retryMs = await deferPredictRoundBootstrap(env, existing.id, error).catch(() => ROUND_BOOTSTRAP_DEFAULT_RETRY_MS);
          throw new PredictRoundStartingError(existing.id, existing.starts_at, existing.ends_at, retryMs);
        }
        const repairedPrice = Number(polymarketRound.startPrice);
        if (!(repairedPrice > 0)) {
          const retryMs = await deferPredictRoundBootstrap(env, existing.id, new Error('Polymarket Bitcoin start price is unavailable for this round')).catch(() => ROUND_BOOTSTRAP_DEFAULT_RETRY_MS);
          throw new PredictRoundStartingError(existing.id, existing.starts_at, existing.ends_at, retryMs);
        }
        await env.DB.prepare('UPDATE predict_rounds SET start_price = ? WHERE id = ?').bind(repairedPrice, existing.id).run();
        await persistPolymarketRound(env, existing.id, polymarketRound);
        await clearPredictRoundBootstrap(env, existing.id).catch(() => undefined);
      } else {
        const repairedPrice = Number(latestPrice) > 0 ? Number(latestPrice) : await fetchPrice(market);
        await env.DB.prepare('UPDATE predict_rounds SET start_price = ? WHERE id = ?').bind(repairedPrice, existing.id).run();
      }
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
      const bootstrap = await claimPredictRoundBootstrap(env, id, market);
      if (!bootstrap.claimed) throw new PredictRoundStartingError(id, startsAt, endsAt, bootstrap.retryAfterMs);
      try {
        polymarketRound = await loadPolymarketBitcoinMarket(startMs);
      } catch (error) {
        const retryMs = await deferPredictRoundBootstrap(env, id, error).catch(() => ROUND_BOOTSTRAP_DEFAULT_RETRY_MS);
        throw new PredictRoundStartingError(id, startsAt, endsAt, retryMs);
      }
      if (!(Number(polymarketRound.startPrice) > 0)) {
        const retryMs = await deferPredictRoundBootstrap(env, id, new Error('Polymarket Bitcoin start price is unavailable for this round')).catch(() => ROUND_BOOTSTRAP_DEFAULT_RETRY_MS);
        throw new PredictRoundStartingError(id, startsAt, endsAt, retryMs);
      }
      startPrice = Number(polymarketRound.startPrice);
    } else startPrice = Number(latestPrice) > 0 ? Number(latestPrice) : await fetchPrice(market);
    const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO predict_rounds (id, market, starts_at, ends_at, start_price, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', CURRENT_TIMESTAMP)`).bind(id, market, startsAt, endsAt, startPrice).run();
    const row = await env.DB.prepare('SELECT * FROM predict_rounds WHERE id = ?').bind(id).first<RoundRow>();
    if (!row) throw new Error('Could not create prediction round');
    if ((inserted.meta?.changes || 0) > 0) {
      const provider = await rememberPredictRoundProvider(env, id, requestedProvider);
      if (provider === 'polymarket' && polymarketRound) await persistPolymarketRound(env, id, polymarketRound);
    }
    if (requestedProvider === 'polymarket') await clearPredictRoundBootstrap(env, id).catch(() => undefined);
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
async function settleDueRounds(env: Env, market: TradeMarket, force = false, settlementPrice = 0): Promise<number> {
  await ensurePredictTables(env);
  const rows = await env.DB.prepare(`SELECT * FROM predict_rounds WHERE market = ? AND status NOT IN ('refunding','refunded') AND (status != 'settled' OR id IN (SELECT round_id FROM predict_bets WHERE status IN ('active', 'settling_payment'))) AND (datetime(ends_at) <= datetime('now') OR ? = 1) ORDER BY datetime(ends_at) ASC LIMIT 10`).bind(market, force ? 1 : 0).all<RoundRow>();
  let settled = 0;
  for (const round of rows.results || []) {
    if (!force && Date.parse(round.ends_at) > Date.now()) continue;
    await settleRound(env, round, settlementPrice);
    await publishPredictRoundRealtimeObserved(env, market, round.id);
    settled += 1;
  }
  if (settled > 0) await publishPredictOpsRealtime(env).catch(() => undefined);
  return settled;
}
async function settleRound(env: Env, round: RoundRow, settlementPrice = 0): Promise<void> {
  const fresh = await env.DB.prepare('SELECT * FROM predict_rounds WHERE id = ?').bind(cleanDbText(round.id, 'Prediction round is not ready')).first<RoundRow>();
  if (!fresh) return;
  const freshId = cleanDbText(fresh.id, 'Prediction round is not ready');
  const activeCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM predict_bets WHERE round_id = ? AND status IN ('active', 'settling_payment')").bind(freshId).first<{ count: number }>();
  if (fresh.status === 'refunding' || fresh.status === 'refunded') return;
  if (fresh.status === 'settled' && Number(activeCount?.count || 0) <= 0) return;
  const market = normalizeTradeMarket(fresh.market);
  const provider = await getPredictRoundProvider(env, freshId);
  if (provider === 'polymarket') {
    if (market !== 'bitcoin') throw new Error('Polymarket provider is only available for Bitcoin');
    const resolved = await resolvePolymarketBitcoinRound(env, freshId);
    if (!resolved) return;
    const finalPrice = Number(resolved.finalPrice) > 0 ? Number(resolved.finalPrice) : null;
    const locked = await env.DB.prepare(`UPDATE predict_rounds SET status = 'settling', end_price = ?, result = ? WHERE id = ? AND status = 'open'`).bind(finalPrice, resolved.result, freshId).run();
    if ((locked.meta?.changes || 0) <= 0 && fresh.status !== 'settling' && fresh.status !== 'settled') return;
    const bets = (await env.DB.prepare("SELECT * FROM predict_bets WHERE round_id = ? AND status IN ('active','settling_payment')").bind(freshId).all<BetRow>()).results || [];
    for (const bet of bets) {
      if (bet.side !== resolved.result) {
        await env.DB.prepare("UPDATE predict_bets SET status = 'lost', payout_nano = 0 WHERE id = ? AND status = 'active'").bind(cleanDbText(bet.id, 'Prediction bet is not ready')).run();
        continue;
      }
      const execution = await getPolymarketBetExecution(env, cleanDbText(bet.id, 'Prediction bet is not ready'));
      const rate = Number(bet.ton_usd_snapshot);
      if (!execution || !(rate > 0)) throw new Error('Polymarket winning bet is missing its execution or Gram/USD rate');
      await payBet(env, bet, Math.floor(execution.shares / rate * NANO), 'won');
    }
    const remaining = await env.DB.prepare("SELECT COUNT(*) AS count FROM predict_bets WHERE round_id = ? AND status IN ('active', 'settling_payment')").bind(freshId).first<{ count: number }>();
    if (Number(remaining?.count || 0) <= 0) await env.DB.prepare(`UPDATE predict_rounds SET status = 'settled', end_price = ?, result = ?, settled_at = COALESCE(settled_at, CURRENT_TIMESTAMP) WHERE id = ?`).bind(finalPrice, resolved.result, freshId).run();
    return;
  }
  let endPrice = fresh.end_price == null ? 0 : Number(fresh.end_price);
  let result: RoundResult = fresh.result === 'up' || fresh.result === 'down' || fresh.result === 'draw' ? fresh.result : null;
  if (fresh.status === 'open') {
    const candidateEndPrice = endPrice > 0 ? endPrice : (market === 'bitcoin' ? (Number(settlementPrice) > 0 ? Number(settlementPrice) : await fetchPrice(market)) : await fetchMonthlyBoundaryPrice(market, Date.parse(fresh.ends_at), 'end'));
    const candidateResult: RoundResult = candidateEndPrice > Number(fresh.start_price) ? 'up' : candidateEndPrice < Number(fresh.start_price) ? 'down' : 'draw';
    const lock = await env.DB.prepare(`UPDATE predict_rounds SET status = 'settling', end_price = ?, result = ? WHERE id = ? AND status = 'open'`).bind(candidateEndPrice, candidateResult, freshId).run();
    if ((lock.meta?.changes || 0) > 0) {
      endPrice = candidateEndPrice;
      result = candidateResult;
    } else {
      const locked = await env.DB.prepare('SELECT * FROM predict_rounds WHERE id = ?').bind(freshId).first<RoundRow>();
      if (!locked || locked.status === 'refunding' || locked.status === 'refunded') return;
      endPrice = locked.end_price == null ? 0 : Number(locked.end_price);
      result = locked.result === 'up' || locked.result === 'down' || locked.result === 'draw' ? locked.result : null;
    }
  }
  if (!(endPrice > 0) || !result) return;
  const all = (await env.DB.prepare('SELECT * FROM predict_bets WHERE round_id = ?').bind(freshId).all<BetRow>()).results || [];
  const eligible = all.filter((b) => b.status !== 'failed' && b.status !== 'pending');
  const active = eligible.filter((b) => b.status === 'active' || b.status === 'settling_payment');
  const upPool = eligible.filter((b) => b.side === 'up').reduce((s, b) => s + Number(b.stake_nano || 0), 0);
  const downPool = eligible.filter((b) => b.side === 'down').reduce((s, b) => s + Number(b.stake_nano || 0), 0);
  const winnerPool = result === 'up' ? upPool : result === 'down' ? downPool : 0;
  const loserPool = result === 'up' ? downPool : result === 'down' ? upPool : 0;
  const fee = Math.floor(loserPool * PLATFORM_FEE_BPS / 10000);
  const distributable = Math.max(0, loserPool - fee);
  for (const bet of active) {
    const stake = Number(bet.stake_nano || 0);
    const isWinner = result !== 'draw' && bet.side === result && winnerPool > 0 && loserPool > 0;
    const shouldRefund = result === 'draw' || winnerPool <= 0 || loserPool <= 0;
    if (shouldRefund) await payBet(env, bet, stake, 'refunded');
    else if (isWinner) await payBet(env, bet, stake + Math.floor(stake / winnerPool * distributable), 'won');
    else await env.DB.prepare(`UPDATE predict_bets SET status = 'lost', payout_nano = 0 WHERE id = ? AND status = 'active'`).bind(cleanDbText(bet.id, 'Prediction bet is not ready')).run();
  }
  const remaining = await env.DB.prepare("SELECT COUNT(*) AS count FROM predict_bets WHERE round_id = ? AND status IN ('active', 'settling_payment')").bind(freshId).first<{ count: number }>();
  if (Number(remaining?.count || 0) <= 0) await env.DB.prepare(`UPDATE predict_rounds SET status = 'settled', end_price = ?, result = ?, settled_at = COALESCE(settled_at, CURRENT_TIMESTAMP) WHERE id = ?`).bind(endPrice, result, freshId).run();
}
async function payBet(env: Env, bet: BetRow, payoutNano: number, status: 'won' | 'refunded'): Promise<void> {
  const betId = cleanDbText(bet.id, 'Prediction bet is not ready');
  const lock = bet.status === 'settling_payment' ? { meta: { changes: 1 } } : await env.DB.prepare(`UPDATE predict_bets SET status = 'settling_payment', payout_nano = ? WHERE id = ? AND status = 'active'`).bind(payoutNano, betId).run();
  if ((lock.meta?.changes || 0) <= 0) return;
  if (payoutNano > 0) await adjustUserTonBalance(env, cleanUserId(bet.user_id), payoutNano, { kind: 'predict', title: status === 'won' ? 'Prediction payout' : 'Prediction refund', referenceId: betId, referenceType: 'predict_bet', metadata: { roundId: cleanDbText(bet.round_id, 'Prediction round is not ready'), market: String(bet.market || ''), side: String(bet.side || ''), status } });
  await env.DB.prepare(`UPDATE predict_bets SET status = ?, payout_nano = ? WHERE id = ? AND status = 'settling_payment'`).bind(status, payoutNano, betId).run();
}
async function poolJson(env: Env, roundId: string) {
  const rows = await env.DB.prepare(`SELECT side, SUM(stake_nano) AS stakeNano, COUNT(*) AS count FROM predict_bets WHERE round_id = ? AND status = 'active' GROUP BY side`).bind(cleanDbText(roundId, 'Prediction round is not ready')).all<{ side: string; stakeNano: number; count: number }>();
  const base = { up: { stakeNano: 0, stakeTon: 0, count: 0 }, down: { stakeNano: 0, stakeTon: 0, count: 0 } };
  for (const row of rows.results || []) if (row.side === 'up' || row.side === 'down') base[row.side] = { stakeNano: Number(row.stakeNano || 0), stakeTon: nanoToTon(Number(row.stakeNano || 0)), count: Number(row.count || 0) };
  return base;
}
function betJson(b: BetRow) { return { id: String(b.id || ''), roundId: String(b.round_id || ''), market: String(b.market || ''), side: String(b.side || ''), stakeNano: Number(b.stake_nano || 0), stakeTon: nanoToTon(Number(b.stake_nano || 0)), status: String(b.status || ''), payoutNano: Number(b.payout_nano || 0), payoutTon: nanoToTon(Number(b.payout_nano || 0)), createdAt: String(b.created_at || '') }; }
async function userBetsJson(env: Env, roundId: string, userId: string) { return ((await env.DB.prepare('SELECT * FROM predict_bets WHERE round_id = ? AND user_id = ? ORDER BY datetime(created_at) DESC LIMIT 25').bind(cleanDbText(roundId, 'Prediction round is not ready'), userId).all<BetRow>()).results || []).map(betJson); }
async function recentUserBetsJson(env: Env, market: string, userId: string) { return ((await env.DB.prepare('SELECT * FROM predict_bets WHERE market = ? AND user_id = ? ORDER BY datetime(created_at) DESC LIMIT 25').bind(cleanDbText(market, 'Prediction market is not ready'), userId).all<BetRow>()).results || []).map(betJson); }
async function getBet(env: Env, id: string) {
  const b = await env.DB.prepare('SELECT * FROM predict_bets WHERE id = ?').bind(cleanDbText(id, 'Prediction bet is not ready')).first<BetRow>();
  return b ? betJson(b) : null;
}
function marketSymbol(market: TradeMarket): string {
  return market === 'gold' ? 'XAUUSDT' : market === 'oil' ? 'CLUSDT' : 'BTCUSDT';
}
async function fetchMarketSnapshot(market: TradeMarket): Promise<MarketSnapshot> {
  const symbol = marketSymbol(market);
  const res = await fetch(`${ASTER_FUTURES_REST_BASE}/fapi/v1/markPriceKlines?symbol=${symbol}&interval=1m&limit=23`, { cf: { cacheTtl: 1, cacheEverything: false } } as RequestInit);
  if (!res.ok) throw new Error(`Aster mark price snapshot failed: HTTP ${res.status}`);
  const rows = await res.json() as unknown;
  if (!Array.isArray(rows)) throw new Error('Invalid Aster mark price snapshot');
  const history = rows.map((row) => Array.isArray(row) ? Number(row[4]) : 0).filter((price) => Number.isFinite(price) && price > 0).slice(-23);
  if (!history.length) throw new Error('Aster mark price snapshot is empty');
  return { price: history[history.length - 1], history };
}
async function fetchPrice(market: TradeMarket): Promise<number> {
  const symbol = marketSymbol(market);
  const res = await fetch(`${ASTER_FUTURES_REST_BASE}/fapi/v1/premiumIndex?symbol=${symbol}`, { cf: { cacheTtl: 1, cacheEverything: false } } as RequestInit);
  if (!res.ok) throw new Error(`Aster mark price request failed: HTTP ${res.status}`);
  const data = await res.json() as { markPrice?: string };
  return cleanPrice(data.markPrice);
}
async function fetchMonthlyBoundaryPrice(market: TradeMarket, boundaryMs: number, boundary: 'start' | 'end'): Promise<number> {
  const symbol = marketSymbol(market);
  const timeQuery = boundary === 'start' ? `startTime=${Math.floor(boundaryMs)}` : `endTime=${Math.floor(boundaryMs - 1)}`;
  const res = await fetch(`${ASTER_FUTURES_REST_BASE}/fapi/v1/markPriceKlines?symbol=${symbol}&interval=1m&${timeQuery}&limit=1`, { cf: { cacheTtl: 60, cacheEverything: false } } as RequestInit);
  if (!res.ok) throw new Error(`Aster monthly boundary price failed: HTTP ${res.status}`);
  const rows = await res.json() as unknown;
  if (!Array.isArray(rows) || !rows.length || !Array.isArray(rows[0])) throw new Error('Monthly boundary price is unavailable');
  const row = rows[0] as unknown[];
  return cleanPrice(boundary === 'start' ? row[1] : row[4]);
}

export async function getPredictOpsDashboard(env: Env): Promise<PredictOpsDashboard> {
  const control = await readPredictOpsControl(env);
  const markets = await Promise.all(TRADE_MARKETS.map((market) => getPredictOpsMarketStatus(env, market, control)));
  return { emergencyPaused: control.emergencyPaused, maintenanceMessage: control.maintenanceMessage, updatedAt: control.updatedAt, markets };
}

export async function getPredictPlatformFeeStats(env: Env): Promise<PredictPlatformFeeStats> {
  await Promise.all([ensurePredictTables(env), ensurePredictProviderTables(env)]);
  const row = await env.DB.prepare(`SELECT
      COALESCE(SUM(fee_nano), 0) AS totalNano,
      COALESCE(SUM(CASE WHEN date(earned_at) = date('now') THEN fee_nano ELSE 0 END), 0) AS todayNano,
      COALESCE(SUM(CASE WHEN date(earned_at) >= date('now', '-' || ((CAST(strftime('%w','now') AS INTEGER) + 6) % 7) || ' days') THEN fee_nano ELSE 0 END), 0) AS weekNano,
      COALESCE(SUM(CASE WHEN strftime('%Y-%m', earned_at) = strftime('%Y-%m', 'now') THEN fee_nano ELSE 0 END), 0) AS monthNano
    FROM (
      SELECT p.updated_at AS earned_at,
        CASE
          WHEN b.ton_usd_snapshot > 0 AND b.stake_usd_snapshot > p.requested_usd
          THEN CAST(((b.stake_usd_snapshot - p.requested_usd) / b.ton_usd_snapshot) * ? AS INTEGER)
          ELSE 0
        END AS fee_nano
      FROM predict_bets b
      JOIN predict_polymarket_bets p ON p.bet_id = b.id
      WHERE p.status = 'matched' AND b.status NOT IN ('failed','refunded')
    )`).bind(NANO).first<{ totalNano: number; todayNano: number; weekNano: number; monthNano: number }>();
  return {
    rate: POLYMARKET_PLATFORM_FEE_BPS / 10_000,
    totalNano: normalizePolicyNano(row?.totalNano),
    todayNano: normalizePolicyNano(row?.todayNano),
    weekNano: normalizePolicyNano(row?.weekNano),
    monthNano: normalizePolicyNano(row?.monthNano),
  };
}

export async function publishPredictOpsRealtime(env: Env, refreshRound = false): Promise<void> {
  const dashboard = await getPredictOpsDashboard(env);
  const state: PredictOpsRealtimeState = {
    emergencyPaused: dashboard.emergencyPaused,
    maintenanceMessage: dashboard.maintenanceMessage,
    updatedAt: dashboard.updatedAt,
    markets: {
      bitcoin: realtimeMarketState(dashboard, 'bitcoin'),
      gold: realtimeMarketState(dashboard, 'gold'),
      oil: realtimeMarketState(dashboard, 'oil'),
    },
  };
  await publishPredictOpsState(env, state, refreshRound);
}

export async function listPredictOpsRounds(env: Env, marketInput: unknown, limit = 8): Promise<PredictOpsRoundView[]> {
  const market = normalizeTradeMarket(String(marketInput || ''));
  const cleanLimit = Math.max(1, Math.min(12, Math.floor(Number(limit) || 8)));
  const rows = await env.DB.prepare('SELECT * FROM predict_rounds WHERE market = ? ORDER BY datetime(starts_at) DESC LIMIT ?').bind(market, cleanLimit).all<RoundRow>().catch(() => ({ results: [] as RoundRow[] }));
  return Promise.all((rows.results || []).map((row) => predictOpsRoundView(env, row)));
}

export async function getPredictOpsRound(env: Env, roundIdInput: unknown): Promise<PredictOpsRoundView | null> {
  const roundId = cleanPredictRoundId(roundIdInput);
  const row = await env.DB.prepare('SELECT * FROM predict_rounds WHERE id = ?').bind(roundId).first<RoundRow>().catch(() => null);
  return row ? predictOpsRoundView(env, row) : null;
}

export async function listPredictOpsDueRounds(env: Env): Promise<PredictOpsRoundView[]> {
  const rows = await env.DB.prepare(`SELECT * FROM predict_rounds WHERE datetime(ends_at) <= datetime('now') AND status NOT IN ('refunding','refunded') AND (status != 'settled' OR id IN (SELECT round_id FROM predict_bets WHERE status IN ('active', 'settling_payment'))) ORDER BY datetime(ends_at) ASC LIMIT 12`).all<RoundRow>().catch(() => ({ results: [] as RoundRow[] }));
  return Promise.all((rows.results || []).map((row) => predictOpsRoundView(env, row)));
}

export async function retryPredictSettlement(env: Env, roundIdInput: unknown, adminIdInput: unknown = ''): Promise<PredictOpsRoundView> {
  const roundId = cleanPredictRoundId(roundIdInput);
  const row = await env.DB.prepare('SELECT * FROM predict_rounds WHERE id = ?').bind(roundId).first<RoundRow>();
  if (!row) throw new Error('Prediction round not found.');
  if (row.status === 'refunding' || row.status === 'refunded') throw new Error('Refunded rounds cannot be settled.');
  if (Date.parse(String(row.ends_at || '')) > Date.now()) throw new Error('This round has not ended yet.');
  try {
    await settleRound(env, row);
    const updated = await getPredictOpsRound(env, roundId);
    if (!updated) throw new Error('Prediction round not found after settlement retry.');
    await publishPredictRoundRealtimeObserved(env, updated.market, roundId);
    await appendPredictOpsIncident(env, 'settlement_retry_ok', updated.market, `Settlement retry completed for ${roundId}.`).catch(() => undefined);
    await appendPredictAudit(env, adminIdInput, 'settlement_retry', { market: updated.market, targetId: roundId, detail: 'Settlement retry completed.' }).catch(() => undefined);
    await reportPredictOpsRuntimeRecovered(env, 'settlement_retry_failed', updated.market, `Settlement retry completed successfully for ${roundId}.`).catch(() => undefined);
    await publishPredictOpsRealtime(env, true).catch(() => undefined);
    return updated;
  } catch (error) {
    const market = normalizeTradeMarket(row.market);
    const errorMessage = messageOf(error);
    const feedError = isPredictPriceFeedError(error);
    if (feedError) await notePredictFeedFailure(env, market, errorMessage).catch(() => undefined);
    if (feedError) await appendPredictOpsIncident(env, 'settlement_retry_failed', market, `Settlement retry failed for ${roundId}: ${errorMessage}`).catch(() => undefined);
    else await reportPredictOpsRuntimeError(env, 'settlement_retry_failed', market, `Settlement retry failed for ${roundId}: ${errorMessage}`);
    await appendPredictAudit(env, adminIdInput, 'settlement_retry_failed', { market, targetId: roundId, detail: errorMessage }).catch(() => undefined);
    throw error;
  }
}

export async function setPredictOpsEmergencyPaused(env: Env, paused: boolean, adminIdInput: unknown = ''): Promise<PredictOpsControl> {
  const current = await readPredictOpsControl(env);
  if (current.emergencyPaused === paused) return current;
  const next = { ...current, emergencyPaused: paused, updatedAt: new Date().toISOString() };
  await writePredictOpsControl(env, next);
  await appendPredictOpsIncident(env, paused ? 'emergency_pause' : 'emergency_resume', null, paused ? 'All market predictions paused.' : 'Emergency pause cleared.').catch(() => undefined);
  await appendPredictAudit(env, adminIdInput, paused ? 'emergency_pause' : 'emergency_resume', { detail: paused ? 'All Predict markets paused.' : 'Emergency pause cleared.' }).catch(() => undefined);
  return next;
}

export async function setPredictOpsMarketPaused(env: Env, marketInput: unknown, paused: boolean, adminIdInput: unknown = ''): Promise<PredictOpsControl> {
  const market = normalizeTradeMarket(String(marketInput || ''));
  const current = await readPredictOpsControl(env);
  if (current.pausedMarkets[market] === paused) return current;
  const next = { ...current, pausedMarkets: { ...current.pausedMarkets, [market]: paused }, updatedAt: new Date().toISOString() };
  await writePredictOpsControl(env, next);
  await appendPredictOpsIncident(env, paused ? 'market_pause' : 'market_resume', market, paused ? `${market} predictions paused.` : `${market} predictions resumed.`).catch(() => undefined);
  await appendPredictAudit(env, adminIdInput, paused ? 'market_pause' : 'market_resume', { market, detail: paused ? 'Market betting paused.' : 'Market betting resumed.' }).catch(() => undefined);
  return next;
}

export async function setPredictOpsMaintenanceMessage(env: Env, messageInput: unknown, adminIdInput: unknown = ''): Promise<PredictOpsControl> {
  const message = String(messageInput ?? '').replace(/\s+/g, ' ').trim().slice(0, 180);
  const current = await readPredictOpsControl(env);
  if (current.maintenanceMessage === message) return current;
  const next = { ...current, maintenanceMessage: message, updatedAt: new Date().toISOString() };
  await writePredictOpsControl(env, next);
  await appendPredictOpsIncident(env, message ? 'maintenance_message_set' : 'maintenance_message_cleared', null, message ? 'Predict maintenance message updated.' : 'Predict maintenance message cleared.').catch(() => undefined);
  await appendPredictAudit(env, adminIdInput, message ? 'maintenance_message_set' : 'maintenance_message_cleared', { detail: message || 'Message cleared.' }).catch(() => undefined);
  return next;
}

export async function setPredictOpsExposureLimit(env: Env, marketInput: unknown, limitNanoInput: unknown, adminIdInput: unknown = ''): Promise<PredictOpsControl> {
  const market = normalizeTradeMarket(String(marketInput || ''));
  const limitNano = normalizePolicyNano(limitNanoInput);
  const current = await readPredictOpsControl(env);
  if (current.exposureLimitsNano[market] === limitNano) return current;
  const next = { ...current, exposureLimitsNano: { ...current.exposureLimitsNano, [market]: limitNano }, updatedAt: new Date().toISOString() };
  await writePredictOpsControl(env, next);
  await appendPredictAudit(env, adminIdInput, 'market_exposure_limit', { market, detail: limitNano > 0 ? `Exposure limit set to ${nanoToTon(limitNano)} GRAM.` : 'Exposure limit disabled.' }).catch(() => undefined);
  return next;
}

export async function getPredictOpsIncidents(env: Env): Promise<PredictOpsIncident[]> {
  const raw = await env.BOT_CACHE.get(PREDICT_OPS_INCIDENTS_KEY).catch(() => null);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item): PredictOpsIncident[] => {
      if (!item || typeof item !== 'object') return [];
      const value = item as Partial<PredictOpsIncident>;
      const market = value.market == null ? null : normalizePredictOpsMarketOrNull(value.market);
      if (!value.id || !value.at || !value.type || typeof value.message !== 'string') return [];
      return [{ id: String(value.id), at: String(value.at), type: String(value.type), market, message: value.message.slice(0, 240) }];
    }).slice(0, PREDICT_OPS_INCIDENT_LIMIT);
  } catch { return []; }
}

export async function getPredictUserLimits(env: Env, userIdInput: unknown): Promise<PredictUserLimits> {
  const userId = cleanUserId(userIdInput);
  await ensurePredictOpsTables(env);
  const row = await env.DB.prepare('SELECT user_id, max_bet_nano, daily_limit_nano, updated_at FROM predict_user_limits WHERE user_id = ? LIMIT 1').bind(userId).first<PredictUserLimitRow>();
  return { userId, maxBetNano: normalizePolicyNano(row?.max_bet_nano), dailyLimitNano: normalizePolicyNano(row?.daily_limit_nano), updatedAt: row?.updated_at || null };
}

export async function setPredictUserLimits(env: Env, userIdInput: unknown, patch: { maxBetNano?: unknown; dailyLimitNano?: unknown }, adminIdInput: unknown): Promise<PredictUserLimits> {
  const userId = cleanUserId(userIdInput);
  const current = await getPredictUserLimits(env, userId);
  const maxBetNano = patch.maxBetNano === undefined ? current.maxBetNano : normalizePolicyNano(patch.maxBetNano);
  const dailyLimitNano = patch.dailyLimitNano === undefined ? current.dailyLimitNano : normalizePolicyNano(patch.dailyLimitNano);
  await env.DB.prepare(`INSERT INTO predict_user_limits (user_id, max_bet_nano, daily_limit_nano, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET max_bet_nano = excluded.max_bet_nano, daily_limit_nano = excluded.daily_limit_nano, updated_at = CURRENT_TIMESTAMP`)
    .bind(userId, maxBetNano, dailyLimitNano).run();
  await appendPredictAudit(env, adminIdInput, 'user_bet_limits', { userId, detail: `Max/bet=${nanoToTon(maxBetNano)} GRAM; daily=${nanoToTon(dailyLimitNano)} GRAM.` }).catch(() => undefined);
  return getPredictUserLimits(env, userId);
}

export async function getPredictUserAccess(env: Env, userIdInput: unknown): Promise<PredictUserMarketAccess[]> {
  const userId = cleanUserId(userIdInput);
  const controls = await getUserControls(env, userId);
  return TRADE_MARKETS.map((market) => userMarketAccessFromControls(controls.sectionBlocks, market));
}

export async function setPredictUserMarketAccess(env: Env, adminIdInput: unknown, userIdInput: unknown, marketInput: unknown, blocked: boolean, options: { expiresAt?: unknown; reason?: unknown; adminNote?: unknown } = {}): Promise<PredictUserMarketAccess[]> {
  const userId = cleanUserId(userIdInput);
  const market = normalizeTradeMarket(String(marketInput || ''));
  await setUserSectionBlocked(env, userId, `predict-${market}`, blocked, blocked ? options.expiresAt ?? null : null, { reason: options.reason, adminNote: options.adminNote });
  await appendPredictAudit(env, adminIdInput, blocked ? 'user_market_block' : 'user_market_allow', {
    userId,
    market,
    detail: blocked ? `Access blocked${options.expiresAt ? ` until ${String(options.expiresAt)}` : ' permanently'}. Reason: ${cleanAuditText(options.reason, 80) || 'Manual review'}.` : 'Access restored.',
  }).catch(() => undefined);
  return getPredictUserAccess(env, userId);
}

export async function setPredictUserAllAccess(env: Env, adminIdInput: unknown, userIdInput: unknown, blocked: boolean, options: { expiresAt?: unknown; reason?: unknown; adminNote?: unknown } = {}): Promise<PredictUserMarketAccess[]> {
  const userId = cleanUserId(userIdInput);
  for (const market of TRADE_MARKETS) await setUserSectionBlocked(env, userId, `predict-${market}`, blocked, blocked ? options.expiresAt ?? null : null, { reason: options.reason, adminNote: options.adminNote });
  await appendPredictAudit(env, adminIdInput, blocked ? 'user_predict_block_all' : 'user_predict_allow_all', {
    userId,
    detail: blocked ? `All Predict markets blocked${options.expiresAt ? ` until ${String(options.expiresAt)}` : ' permanently'}. Reason: ${cleanAuditText(options.reason, 80) || 'Manual review'}.` : 'All Predict market access restored.',
  }).catch(() => undefined);
  return getPredictUserAccess(env, userId);
}

export async function updatePredictUserMarketAccessNote(env: Env, adminIdInput: unknown, userIdInput: unknown, marketInput: unknown, reasonInput: unknown, adminNoteInput: unknown): Promise<PredictUserMarketAccess[]> {
  const userId = cleanUserId(userIdInput);
  const market = normalizeTradeMarket(String(marketInput || ''));
  const controls = await getUserControls(env, userId);
  const block = controls.sectionBlocks.find((item) => item.sectionId === `predict-${market}` && item.blocked);
  if (!block) throw new Error('This market is not blocked for the user.');
  const reason = cleanAuditText(reasonInput, 80) || 'Manual review';
  const adminNote = cleanAuditText(adminNoteInput, 180);
  await setUserSectionBlocked(env, userId, `predict-${market}`, true, block.expiresAt, { reason, adminNote });
  await appendPredictAudit(env, adminIdInput, 'user_market_note', { userId, market, detail: `Reason: ${reason}${adminNote ? `; note: ${adminNote}` : ''}` }).catch(() => undefined);
  return getPredictUserAccess(env, userId);
}

export async function getPredictUserInspector(env: Env, userIdInput: unknown): Promise<PredictUserInspector> {
  const userId = cleanUserId(userIdInput);
  await Promise.all([ensurePredictTables(env), ensurePredictOpsTables(env)]);
  const [stats, recent, limits, access] = await Promise.all([
    env.DB.prepare(`SELECT
      COUNT(*) AS totalBets,
      COALESCE(SUM(CASE WHEN status='won' THEN 1 ELSE 0 END),0) AS wins,
      COALESCE(SUM(CASE WHEN status='lost' THEN 1 ELSE 0 END),0) AS losses,
      COALESCE(SUM(CASE WHEN status='refunded' THEN 1 ELSE 0 END),0) AS refunded,
      COALESCE(SUM(CASE WHEN status IN ('pending','active','settling_payment') THEN 1 ELSE 0 END),0) AS active,
      COALESCE(SUM(stake_nano),0) AS totalStakeNano,
      COALESCE(SUM(payout_nano),0) AS totalPayoutNano,
      COALESCE(SUM(CASE WHEN status!='failed' AND date(created_at)=date('now') THEN stake_nano ELSE 0 END),0) AS todayStakeNano,
      MAX(created_at) AS lastBetAt
      FROM predict_bets WHERE user_id=? AND status!='failed'`).bind(userId).first<{ totalBets: number; wins: number; losses: number; refunded: number; active: number; totalStakeNano: number; totalPayoutNano: number; todayStakeNano: number; lastBetAt: string | null }>(),
    env.DB.prepare(`SELECT b.*, r.status AS round_status, r.result AS round_result, r.ends_at AS round_ends_at FROM predict_bets b JOIN predict_rounds r ON r.id=b.round_id WHERE b.user_id=? ORDER BY datetime(b.created_at) DESC LIMIT 8`).bind(userId).all<PredictBetAdminRow>(),
    getPredictUserLimits(env, userId),
    getPredictUserAccess(env, userId),
  ]);
  const totalStakeNano = normalizePolicyNano(stats?.totalStakeNano);
  const totalPayoutNano = normalizePolicyNano(stats?.totalPayoutNano);
  return {
    userId,
    totalBets: Number(stats?.totalBets || 0), wins: Number(stats?.wins || 0), losses: Number(stats?.losses || 0), refunded: Number(stats?.refunded || 0), active: Number(stats?.active || 0),
    totalStakeNano, totalPayoutNano, netNano: totalPayoutNano - totalStakeNano, todayStakeNano: normalizePolicyNano(stats?.todayStakeNano), lastBetAt: stats?.lastBetAt || null,
    limits, access, recentBets: (recent.results || []).map(predictOpsBetView),
  };
}

export async function getPredictOpsBet(env: Env, betIdInput: unknown): Promise<PredictOpsBetView | null> {
  const betId = cleanPredictBetId(betIdInput);
  const row = await env.DB.prepare(`SELECT b.*, r.status AS round_status, r.result AS round_result, r.ends_at AS round_ends_at FROM predict_bets b JOIN predict_rounds r ON r.id=b.round_id WHERE b.id=? LIMIT 1`).bind(betId).first<PredictBetAdminRow>();
  return row ? predictOpsBetView(row) : null;
}

export async function manualRefundPredictBet(env: Env, betIdInput: unknown, adminIdInput: unknown, writeAudit = true): Promise<PredictOpsBetView> {
  const betId = cleanPredictBetId(betIdInput);
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

async function getPredictOpsMarketStatus(env: Env, market: TradeMarket, control: PredictOpsControl): Promise<PredictOpsMarketStatus> {
  const feed = await readPredictOpsFeed(env, market);
  const latestRow = await env.DB.prepare('SELECT * FROM predict_rounds WHERE market = ? ORDER BY datetime(starts_at) DESC LIMIT 1').bind(market).first<RoundRow>().catch(() => null);
  const latestRound = latestRow ? await predictOpsRoundView(env, latestRow) : null;
  const lastSettled = await env.DB.prepare("SELECT settled_at FROM predict_rounds WHERE market = ? AND status = 'settled' AND settled_at IS NOT NULL ORDER BY datetime(settled_at) DESC LIMIT 1").bind(market).first<{ settled_at: string }>().catch(() => null);
  const due = await env.DB.prepare(`SELECT COUNT(*) AS count FROM predict_rounds WHERE market = ? AND datetime(ends_at) <= datetime('now') AND status NOT IN ('refunding','refunded') AND (status != 'settled' OR id IN (SELECT round_id FROM predict_bets WHERE status IN ('active', 'settling_payment')))`).bind(market).first<{ count: number }>().catch(() => null);
  const activeExposureNano = await getPredictMarketExposure(env, market);
  const exposureLimitNano = control.exposureLimitsNano[market];
  return { market, manualPaused: control.pausedMarkets[market], circuitOpen: feed.circuitOpen, circuitReason: feed.circuitReason, lastPrice: feed.lastPrice, lastSuccessAt: feed.lastSuccessAt, lastError: feed.lastError, lastErrorAt: feed.lastErrorAt, latestRound, lastSettledAt: lastSettled?.settled_at || null, dueSettlementCount: Number(due?.count || 0), activeExposureNano, exposureLimitNano, capacityReached: exposureLimitNano > 0 && activeExposureNano >= exposureLimitNano };
}

async function predictOpsRoundView(env: Env, row: RoundRow): Promise<PredictOpsRoundView> {
  const market = normalizeTradeMarket(row.market);
  const stats = await env.DB.prepare('SELECT status, COUNT(*) AS count, COALESCE(SUM(stake_nano), 0) AS stakeNano FROM predict_bets WHERE round_id = ? GROUP BY status').bind(row.id).all<{ status: string; count: number; stakeNano: number }>().catch(() => ({ results: [] as Array<{ status: string; count: number; stakeNano: number }> }));
  const counts: Record<string, number> = {};
  let totalBets = 0;
  let totalStakeNano = 0;
  for (const stat of stats.results || []) { const status = String(stat.status || 'unknown'); const count = Number(stat.count || 0); counts[status] = count; totalBets += count; totalStakeNano += Number(stat.stakeNano || 0); }
  const status = String(row.status || '');
  return { id: String(row.id || ''), market, startsAt: String(row.starts_at || ''), endsAt: String(row.ends_at || ''), startPrice: Number(row.start_price || 0), endPrice: row.end_price == null ? null : Number(row.end_price), status, result: row.result == null ? null : String(row.result), settledAt: row.settled_at == null ? null : String(row.settled_at), createdAt: String(row.created_at || ''), due: status !== 'refunding' && status !== 'refunded' && Number.isFinite(Date.parse(String(row.ends_at || ''))) && Date.parse(String(row.ends_at || '')) <= Date.now() && (status !== 'settled' || Number(counts.active || 0) + Number(counts.settling_payment || 0) > 0), totalBets, totalStakeNano, counts };
}

async function assertPredictBettingAvailable(env: Env, market: TradeMarket, userId: string, stakeNano: number, alreadyReserved: boolean): Promise<PredictBetGuard> {
  const [control, feed, userControls, userLimits] = await Promise.all([readPredictOpsControl(env), readPredictOpsFeed(env, market), getUserControls(env, userId), getPredictUserLimits(env, userId)]);
  if (userControls.blockedSections.includes(`predict-${market}`)) throw new Error(USER_MARKET_BLOCK_MESSAGE);
  if (control.emergencyPaused) throw new Error(control.maintenanceMessage || DEFAULT_PREDICT_MAINTENANCE);
  if (control.pausedMarkets[market]) throw new Error(control.maintenanceMessage || `${marketLabel(market)} predictions are temporarily paused.`);
  if (feed.circuitOpen) throw new Error(control.maintenanceMessage || `${marketLabel(market)} live price feed is unavailable. New predictions are paused automatically.`);
  if (!alreadyReserved) {
    const [dailyStakeNano, activeExposureNano] = await Promise.all([getPredictUserDailyStake(env, userId), getPredictMarketExposure(env, market)]);
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
  if (/open the mini app inside telegram|invalid telegram session|telegram session expired|telegram user mismatch|missing telegram user|missing user id|invalid predict market|choose up or down|enter a valid gram amount|this prediction is closed|prediction round is starting|already placed a prediction|previous prediction is still processing|prediction could not be reserved|insufficient balance|your access to this market is currently paused|predictions are temporarily unavailable|predictions are temporarily paused|live price feed is unavailable|your maximum prediction|your daily predict limit|current betting capacity/i.test(message)) return true;
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
  if (type === 'bet_request_failed') return 'predict-routes.ts → POST /app/api/predict-bet → reserve/debit/activate/respond';
  if (type === 'round_realtime_publish_failed') return 'predict-routes.ts → publishPredictRoundState → SectionLockEvents realtime round sync';
  if (type === 'settlement_retry_failed') return 'predict-routes.ts → retryPredictSettlement → settle/payment/finalize';
  if (type === 'feed_circuit_open') return 'predict-routes.ts → Aster price feed → snapshot/mark/boundary price';
  return 'Predict runtime';
}

function cleanPredictRuntimeType(value: unknown): string {
  return String(value || 'runtime_error').replace(/[^0-9A-Za-z_.:-]/g, '_').slice(0, 60) || 'runtime_error';
}

function cleanPredictRuntimeMessage(value: unknown): string {
  return String(value || 'Unknown Predict error').replace(/\s+/g, ' ').trim().slice(0, 480) || 'Unknown Predict error';
}

function predictRuntimeIssueKey(type: string, market: TradeMarket | null): string {
  return `${PREDICT_RUNTIME_ISSUE_PREFIX}${market || 'global'}:${type}`;
}

async function readPredictRuntimeIssue(env: Env, key: string): Promise<PredictRuntimeIssue | null> {
  const raw = await env.BOT_CACHE.get(key).catch(() => null);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PredictRuntimeIssue>;
    if (!parsed.type || !parsed.where || !parsed.message || !parsed.firstAt) return null;
    return {
      type: cleanPredictRuntimeType(parsed.type),
      market: parsed.market == null ? null : normalizePredictOpsMarketOrNull(parsed.market),
      where: String(parsed.where).replace(/\s+/g, ' ').trim().slice(0, 260),
      message: cleanPredictRuntimeMessage(parsed.message),
      firstAt: String(parsed.firstAt).slice(0, 40),
      lastAt: String(parsed.lastAt || parsed.firstAt).slice(0, 40),
    };
  } catch { return null; }
}

async function notifyPredictAdmins(env: Env, status: 'error' | 'recovered', issue: PredictRuntimeIssue, recovery = ''): Promise<void> {
  const token = String(gameBotToken(env) || '').trim();
  const adminIds = Array.from(new Set(String(env.BOT_ADMIN || '').split(/[\s,;|]+/).map((value) => value.trim()).filter((value) => /^\d+$/.test(value))));
  if (!token || !adminIds.length) return;
  const now = new Date().toISOString();
  const text = status === 'error'
    ? ['🚨 Predict Runtime Alert', 'Status: ERROR', `Type: ${issue.type}`, issue.market ? `Market: ${marketLabel(issue.market)}` : '', `Where: ${issue.where}`, `Root error: ${issue.message}`, `First seen: ${issue.firstAt}`, `Detected: ${now}`].filter(Boolean).join('\n').slice(0, 3800)
    : ['✅ Predict Recovered', 'Status: RECOVERED', `Type: ${issue.type}`, issue.market ? `Market: ${marketLabel(issue.market)}` : '', `Where: ${issue.where}`, `Previous error: ${issue.message}`, `Started: ${issue.firstAt}`, `Recovered: ${now}`, `Result: ${recovery || 'The affected Predict path completed successfully again.'}`].filter(Boolean).join('\n').slice(0, 3800);
  await Promise.allSettled(adminIds.map(async (chatId) => {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!response.ok) throw new Error(`Predict admin alert failed: HTTP ${response.status}`);
  }));
}

async function readPredictOpsControl(env: Env): Promise<PredictOpsControl> {
  const fallback: PredictOpsControl = { emergencyPaused: false, maintenanceMessage: '', pausedMarkets: { bitcoin: false, gold: false, oil: false }, exposureLimitsNano: { bitcoin: 0, gold: 0, oil: 0 }, updatedAt: null };
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
