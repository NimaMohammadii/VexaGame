import {
  AssetType,
  OrderSide,
  OrderType,
  buildHmacSignature,
  createSecureClient,
  type ApiKeyAuthorization,
  type SignedOrder,
} from '@polymarket/client';
import { fetchBalanceAllowance } from '@polymarket/client/actions';
import { privateKey } from '@polymarket/client/viem';
import type { Env } from './types';

export type PredictProvider = 'vexa' | 'polymarket';
export type PolymarketSide = 'up' | 'down';

const PROVIDER_KEY = 'admin:predict-provider:v1';
const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const CLOB_BASE = 'https://clob.polymarket.com';
const BRIDGE_BASE = 'https://bridge.polymarket.com';
const POLYMARKET_ROUND_MS = 5 * 60 * 1000;
const PUSD_SCALE = 1_000_000;

type PolymarketRuntimeEnv = Env & {
  POLYMARKET_BUILDER_API_KEY?: string;
  POLYMARKET_BUILDER_SECRET?: string;
  POLYMARKET_BUILDER_PASSPHRASE?: string;
  POLYMARKET_SIGNER_PRIVATE_KEY?: string;
};

type GammaMarket = Record<string, unknown>;
type RoundProviderRow = { round_id: string; provider: string };
type PolymarketRoundRow = {
  round_id: string;
  slug: string;
  market_id: string;
  condition_id: string;
  up_token_id: string;
  down_token_id: string;
  resolution_source: string | null;
  rtds_topic: string;
  redeemed_at: string | null;
  redeem_status: string | null;
};
type PolymarketBetRow = {
  bet_id: string;
  round_id: string;
  token_id: string;
  requested_usd: number;
  filled_usd: number;
  shares: number;
  status: string;
  signed_order_json: string | null;
  order_id: string | null;
  response_json: string | null;
};

type TradingClient = Awaited<ReturnType<typeof createSecureClient>>;
let tradingClientPromise: Promise<TradingClient> | null = null;
let approvalsReadyPromise: Promise<void> | null = null;
let providerTablesReady: Promise<void> | null = null;

export type PolymarketMarketView = {
  slug: string;
  marketId: string;
  conditionId: string;
  upTokenId: string;
  downTokenId: string;
  upPrice: number | null;
  downPrice: number | null;
  upLiquidityUsd: number;
  downLiquidityUsd: number;
  resolutionSource: string;
  rtdsTopic: string;
  rtdsSymbol: 'btc/usd';
};

export type PolymarketExecution = {
  betId: string;
  roundId: string;
  tokenId: string;
  requestedUsd: number;
  filledUsd: number;
  shares: number;
  orderId: string;
  status: 'matched';
};

export type PolymarketAccountHealth = {
  configured: boolean;
  walletAddress: string | null;
  signerAddress: string | null;
  walletType: number | null;
  balanceUsd: number | null;
  bridgeEvmAddress: string | null;
};

export type PredictProviderState = {
  requested: PredictProvider;
  active: PredictProvider | null;
  activeRoundId: string | null;
  switchPending: boolean;
  polymarketConfigured: boolean;
};

export async function ensurePredictProviderTables(env: Env): Promise<void> {
  if (!providerTablesReady) {
    providerTablesReady = (async () => {
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS predict_round_providers (
        round_id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`).run();
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS predict_polymarket_rounds (
        round_id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        market_id TEXT NOT NULL,
        condition_id TEXT NOT NULL,
        up_token_id TEXT NOT NULL,
        down_token_id TEXT NOT NULL,
        resolution_source TEXT,
        rtds_topic TEXT NOT NULL,
        redeem_status TEXT,
        redeemed_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`).run();
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS predict_polymarket_bets (
        bet_id TEXT PRIMARY KEY,
        round_id TEXT NOT NULL,
        token_id TEXT NOT NULL,
        requested_usd REAL NOT NULL,
        filled_usd REAL NOT NULL DEFAULT 0,
        shares REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL,
        signed_order_json TEXT,
        order_id TEXT,
        response_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`).run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_predict_poly_bets_round ON predict_polymarket_bets(round_id)').run();
    })().catch((error) => {
      providerTablesReady = null;
      throw error;
    });
  }
  await providerTablesReady;
}

export async function getRequestedPredictProvider(env: Env): Promise<PredictProvider> {
  const value = String(await env.BOT_CACHE.get(PROVIDER_KEY).catch(() => '') || '').trim().toLowerCase();
  return value === 'polymarket' ? 'polymarket' : 'vexa';
}

export async function setRequestedPredictProvider(env: Env, provider: PredictProvider): Promise<void> {
  await env.BOT_CACHE.put(PROVIDER_KEY, provider);
}

export async function rememberPredictRoundProvider(env: Env, roundId: string, provider: PredictProvider): Promise<PredictProvider> {
  await ensurePredictProviderTables(env);
  await env.DB.prepare(`INSERT OR IGNORE INTO predict_round_providers (round_id, provider, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`).bind(roundId, provider).run();
  const row = await env.DB.prepare('SELECT round_id, provider FROM predict_round_providers WHERE round_id = ?').bind(roundId).first<RoundProviderRow>();
  return normalizeProvider(row?.provider);
}

export async function getPredictRoundProvider(env: Env, roundId: string): Promise<PredictProvider> {
  await ensurePredictProviderTables(env);
  const row = await env.DB.prepare('SELECT round_id, provider FROM predict_round_providers WHERE round_id = ?').bind(roundId).first<RoundProviderRow>();
  if (row) return normalizeProvider(row.provider);
  return rememberPredictRoundProvider(env, roundId, 'vexa');
}

export async function getPredictProviderState(env: Env): Promise<PredictProviderState> {
  const requested = await getRequestedPredictProvider(env);
  await ensurePredictProviderTables(env);
  const row = await env.DB.prepare(`SELECT id FROM predict_rounds
    WHERE market = 'bitcoin' AND datetime(starts_at) <= datetime('now') AND datetime(ends_at) > datetime('now')
    ORDER BY datetime(starts_at) DESC LIMIT 1`).first<{ id: string }>().catch(() => null);
  const active = row?.id ? await getPredictRoundProvider(env, row.id) : null;
  return {
    requested,
    active,
    activeRoundId: row?.id || null,
    switchPending: Boolean(active && active !== requested),
    polymarketConfigured: polymarketSecretsConfigured(env),
  };
}

export function polymarketSecretsConfigured(env: Env): boolean {
  const runtime = env as PolymarketRuntimeEnv;
  return Boolean(
    cleanSecret(runtime.POLYMARKET_BUILDER_API_KEY) &&
    cleanSecret(runtime.POLYMARKET_BUILDER_SECRET) &&
    cleanSecret(runtime.POLYMARKET_BUILDER_PASSPHRASE) &&
    cleanSecret(runtime.POLYMARKET_SIGNER_PRIVATE_KEY),
  );
}

export async function preparePolymarketForActivation(env: Env): Promise<PolymarketAccountHealth> {
  const client = await getTradingClient(env);
  await ensureTradingApprovals(client);
  const [balance, bridgeEvmAddress] = await Promise.all([
    readCollateralBalanceUsd(client),
    getBridgeEvmAddress(client.account.wallet),
  ]);
  const health: PolymarketAccountHealth = {
    configured: true,
    walletAddress: client.account.wallet,
    signerAddress: client.account.signer,
    walletType: Number(client.account.walletType),
    balanceUsd: balance,
    bridgeEvmAddress,
  };
  if (!(balance > 0)) {
    const destination = bridgeEvmAddress || client.account.wallet;
    throw new Error(`Polymarket wallet is ready but has no pUSD. Fund it first${destination ? ` via deposit address ${destination}` : ''}.`);
  }
  return health;
}

export async function getPolymarketAccountHealth(env: Env): Promise<PolymarketAccountHealth> {
  if (!polymarketSecretsConfigured(env)) return { configured: false, walletAddress: null, signerAddress: null, walletType: null, balanceUsd: null, bridgeEvmAddress: null };
  const client = await getTradingClient(env);
  const [balance, bridgeEvmAddress] = await Promise.all([
    readCollateralBalanceUsd(client).catch(() => null),
    getBridgeEvmAddress(client.account.wallet).catch(() => null),
  ]);
  return {
    configured: true,
    walletAddress: client.account.wallet,
    signerAddress: client.account.signer,
    walletType: Number(client.account.walletType),
    balanceUsd: balance,
    bridgeEvmAddress,
  };
}

export async function loadPolymarketBitcoinMarket(startMs: number): Promise<PolymarketMarketView> {
  const normalizedStart = Math.floor(Number(startMs) / POLYMARKET_ROUND_MS) * POLYMARKET_ROUND_MS;
  if (!Number.isFinite(normalizedStart) || normalizedStart <= 0) throw new Error('Invalid Polymarket Bitcoin round start');
  const slug = `btc-updown-5m-${Math.floor(normalizedStart / 1000)}`;
  const market = await fetchGammaMarketBySlug(slug);
  const parsed = parseGammaBitcoinMarket(market, slug);
  const [upBook, downBook] = await Promise.all([
    fetchBook(parsed.upTokenId),
    fetchBook(parsed.downTokenId),
  ]);
  return {
    ...parsed,
    upPrice: upBook.bestAsk ?? parsed.upPrice,
    downPrice: downBook.bestAsk ?? parsed.downPrice,
    upLiquidityUsd: upBook.askLiquidityUsd,
    downLiquidityUsd: downBook.askLiquidityUsd,
  };
}

export async function persistPolymarketRound(env: Env, roundId: string, market: PolymarketMarketView): Promise<void> {
  await ensurePredictProviderTables(env);
  await env.DB.prepare(`INSERT INTO predict_polymarket_rounds (
    round_id, slug, market_id, condition_id, up_token_id, down_token_id, resolution_source, rtds_topic, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  ON CONFLICT(round_id) DO UPDATE SET
    slug = excluded.slug,
    market_id = excluded.market_id,
    condition_id = excluded.condition_id,
    up_token_id = excluded.up_token_id,
    down_token_id = excluded.down_token_id,
    resolution_source = excluded.resolution_source,
    rtds_topic = excluded.rtds_topic,
    updated_at = CURRENT_TIMESTAMP`)
    .bind(roundId, market.slug, market.marketId, market.conditionId, market.upTokenId, market.downTokenId, market.resolutionSource || null, market.rtdsTopic)
    .run();
}

export async function getPolymarketRoundMarket(env: Env, roundId: string, refreshPrices = false): Promise<PolymarketMarketView> {
  await ensurePredictProviderTables(env);
  const row = await env.DB.prepare('SELECT * FROM predict_polymarket_rounds WHERE round_id = ?').bind(roundId).first<PolymarketRoundRow>();
  if (!row) throw new Error('Polymarket round metadata is unavailable');
  if (refreshPrices) {
    const fresh = await loadPolymarketBitcoinMarket(slugStartMs(row.slug));
    await persistPolymarketRound(env, roundId, fresh);
    return fresh;
  }
  const market = await fetchGammaMarketBySlug(row.slug);
  const parsed = parseGammaBitcoinMarket(market, row.slug);
  const [upBook, downBook] = await Promise.all([fetchBook(row.up_token_id), fetchBook(row.down_token_id)]);
  return {
    ...parsed,
    upTokenId: row.up_token_id,
    downTokenId: row.down_token_id,
    conditionId: row.condition_id,
    marketId: row.market_id,
    resolutionSource: row.resolution_source || parsed.resolutionSource,
    rtdsTopic: row.rtds_topic || parsed.rtdsTopic,
    upPrice: upBook.bestAsk ?? parsed.upPrice,
    downPrice: downBook.bestAsk ?? parsed.downPrice,
    upLiquidityUsd: upBook.askLiquidityUsd,
    downLiquidityUsd: downBook.askLiquidityUsd,
  };
}

export async function resolvePolymarketBitcoinRound(env: Env, roundId: string): Promise<{ result: PolymarketSide; finalPrice: number | null } | null> {
  await ensurePredictProviderTables(env);
  const row = await env.DB.prepare('SELECT * FROM predict_polymarket_rounds WHERE round_id = ?').bind(roundId).first<PolymarketRoundRow>();
  if (!row) throw new Error('Polymarket round metadata is unavailable');
  const market = await fetchGammaMarketBySlug(row.slug);
  const outcomes = parseStringArray(market.outcomes);
  const prices = parseNumberArray(market.outcomePrices);
  let result: PolymarketSide | null = null;
  for (let i = 0; i < Math.min(outcomes.length, prices.length); i += 1) {
    const label = outcomes[i].trim().toLowerCase();
    const price = prices[i];
    if (price < 0.999) continue;
    if (label === 'up' || label === 'yes') result = 'up';
    if (label === 'down' || label === 'no') result = 'down';
  }
  if (!result) {
    const winner = String(market.winner || market.resolvedOutcome || market.result || '').trim().toLowerCase();
    if (winner === 'up' || winner === 'yes') result = 'up';
    else if (winner === 'down' || winner === 'no') result = 'down';
  }
  if (!result) return null;
  return { result, finalPrice: findFinitePositive(market.finalPrice, market.final_price, market.resolutionPrice, market.resolution_price) };
}

export async function executePolymarketBitcoinBet(env: Env, input: { betId: string; roundId: string; side: PolymarketSide; stakeUsd: number }): Promise<PolymarketExecution> {
  const requestedUsd = roundMoney(input.stakeUsd);
  if (!(requestedUsd > 0)) throw new Error('A USD conversion is required for Polymarket predictions');
  await ensurePredictProviderTables(env);
  const market = await getPolymarketRoundMarket(env, input.roundId, true);
  const tokenId = input.side === 'down' ? market.downTokenId : market.upTokenId;
  let row = await env.DB.prepare('SELECT * FROM predict_polymarket_bets WHERE bet_id = ?').bind(input.betId).first<PolymarketBetRow>();
  if (row) {
    if (row.round_id !== input.roundId || row.token_id !== tokenId || Math.abs(Number(row.requested_usd) - requestedUsd) > 0.000001) {
      throw new Error('Polymarket prediction reservation does not match the original request');
    }
    if (row.status === 'matched') return executionFromRow(row);
    if (row.status === 'failed') throw new Error('The Polymarket order for this prediction already failed');
  } else {
    await env.DB.prepare(`INSERT INTO predict_polymarket_bets (
      bet_id, round_id, token_id, requested_usd, filled_usd, shares, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 0, 0, 'reserved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
      .bind(input.betId, input.roundId, tokenId, requestedUsd).run();
    row = await env.DB.prepare('SELECT * FROM predict_polymarket_bets WHERE bet_id = ?').bind(input.betId).first<PolymarketBetRow>();
  }
  if (!row) throw new Error('Could not reserve Polymarket order');

  const client = await getTradingClient(env);
  await ensureTradingApprovals(client);
  let signedOrder: SignedOrder;
  if (row.signed_order_json) {
    signedOrder = JSON.parse(row.signed_order_json) as SignedOrder;
  } else {
    signedOrder = await client.createMarketOrder({
      assetId: tokenId,
      side: OrderSide.BUY,
      amount: requestedUsd.toFixed(6),
      maxSpend: requestedUsd.toFixed(6),
      orderType: OrderType.FOK,
    });
    const signedJson = JSON.stringify(signedOrder);
    await env.DB.prepare(`UPDATE predict_polymarket_bets SET signed_order_json = ?, status = 'prepared', updated_at = CURRENT_TIMESTAMP WHERE bet_id = ? AND status IN ('reserved','prepared')`)
      .bind(signedJson, input.betId).run();
  }

  const response = await client.postOrder(signedOrder);
  if (!response.ok) {
    await env.DB.prepare(`UPDATE predict_polymarket_bets SET status = 'failed', response_json = ?, updated_at = CURRENT_TIMESTAMP WHERE bet_id = ? AND status != 'matched'`)
      .bind(JSON.stringify(response), input.betId).run();
    throw new Error(`Polymarket order rejected: ${response.message}`);
  }
  if (response.status !== 'matched') {
    await env.DB.prepare(`UPDATE predict_polymarket_bets SET status = 'failed', response_json = ?, order_id = ?, updated_at = CURRENT_TIMESTAMP WHERE bet_id = ? AND status != 'matched'`)
      .bind(JSON.stringify(response), response.orderId, input.betId).run();
    throw new Error('Polymarket FOK order was not fully matched');
  }
  const filledUsd = cleanAmount(response.makingAmount);
  const shares = cleanAmount(response.takingAmount);
  if (!(filledUsd > 0) || !(shares > 0)) throw new Error('Polymarket returned an invalid matched order amount');
  await env.DB.prepare(`UPDATE predict_polymarket_bets SET status = 'matched', filled_usd = ?, shares = ?, order_id = ?, response_json = ?, updated_at = CURRENT_TIMESTAMP WHERE bet_id = ?`)
    .bind(filledUsd, shares, response.orderId, JSON.stringify(response), input.betId).run();
  const matched = await env.DB.prepare('SELECT * FROM predict_polymarket_bets WHERE bet_id = ?').bind(input.betId).first<PolymarketBetRow>();
  if (!matched) throw new Error('Polymarket matched order could not be recorded');
  return executionFromRow(matched);
}

export async function markPolymarketBetFailed(env: Env, betId: string): Promise<void> {
  await ensurePredictProviderTables(env);
  await env.DB.prepare(`UPDATE predict_polymarket_bets SET status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE bet_id = ? AND status NOT IN ('matched','failed')`).bind(betId).run();
}

export async function getPolymarketBetExecution(env: Env, betId: string): Promise<PolymarketExecution | null> {
  await ensurePredictProviderTables(env);
  const row = await env.DB.prepare('SELECT * FROM predict_polymarket_bets WHERE bet_id = ?').bind(betId).first<PolymarketBetRow>();
  return row?.status === 'matched' ? executionFromRow(row) : null;
}

export async function redeemPolymarketBitcoinRound(env: Env, roundId: string): Promise<boolean> {
  await ensurePredictProviderTables(env);
  const row = await env.DB.prepare('SELECT * FROM predict_polymarket_rounds WHERE round_id = ?').bind(roundId).first<PolymarketRoundRow>();
  if (!row) throw new Error('Polymarket round metadata is unavailable');
  if (row.redeemed_at) return true;
  const locked = await env.DB.prepare(`UPDATE predict_polymarket_rounds SET redeem_status = 'redeeming', updated_at = CURRENT_TIMESTAMP
    WHERE round_id = ? AND redeemed_at IS NULL AND (redeem_status IS NULL OR redeem_status = 'failed')`).bind(roundId).run();
  if ((locked.meta?.changes || 0) <= 0) return false;
  try {
    const client = await getTradingClient(env);
    const handle = await client.redeemPositions({ conditionId: row.condition_id });
    await handle.wait();
    await env.DB.prepare(`UPDATE predict_polymarket_rounds SET redeem_status = 'redeemed', redeemed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE round_id = ?`).bind(roundId).run();
    return true;
  } catch (error) {
    await env.DB.prepare(`UPDATE predict_polymarket_rounds SET redeem_status = 'failed', updated_at = CURRENT_TIMESTAMP WHERE round_id = ? AND redeemed_at IS NULL`).bind(roundId).run().catch(() => undefined);
    throw error;
  }
}

async function getTradingClient(env: Env): Promise<TradingClient> {
  if (!tradingClientPromise) {
    tradingClientPromise = (async () => {
      const runtime = env as PolymarketRuntimeEnv;
      const key = requireSecret(runtime.POLYMARKET_BUILDER_API_KEY, 'POLYMARKET_BUILDER_API_KEY');
      const secret = requireSecret(runtime.POLYMARKET_BUILDER_SECRET, 'POLYMARKET_BUILDER_SECRET');
      const passphrase = requireSecret(runtime.POLYMARKET_BUILDER_PASSPHRASE, 'POLYMARKET_BUILDER_PASSPHRASE');
      const signerKey = normalizePrivateKey(requireSecret(runtime.POLYMARKET_SIGNER_PRIVATE_KEY, 'POLYMARKET_SIGNER_PRIVATE_KEY'));
      const apiKey: ApiKeyAuthorization = {
        get isBuilderKey() { return true; },
        get supportGasless() { return true; },
        async authorize(request) {
          const timestamp = Math.floor(Date.now() / 1000);
          return {
            POLY_BUILDER_API_KEY: key,
            POLY_BUILDER_PASSPHRASE: passphrase,
            POLY_BUILDER_SIGNATURE: await buildHmacSignature(secret, timestamp, request.method, request.path, request.body),
            POLY_BUILDER_TIMESTAMP: String(timestamp),
          };
        },
      };
      return createSecureClient({ signer: privateKey(signerKey), apiKey });
    })().catch((error) => {
      tradingClientPromise = null;
      approvalsReadyPromise = null;
      throw error;
    });
  }
  return tradingClientPromise;
}

async function ensureTradingApprovals(client: TradingClient): Promise<void> {
  if (!approvalsReadyPromise) approvalsReadyPromise = client.setupTradingApprovals().catch((error) => { approvalsReadyPromise = null; throw error; });
  await approvalsReadyPromise;
}

async function readCollateralBalanceUsd(client: TradingClient): Promise<number> {
  const state = await fetchBalanceAllowance(client, { assetType: AssetType.COLLATERAL });
  return Number(state.balance) / PUSD_SCALE;
}

async function getBridgeEvmAddress(walletAddress: string): Promise<string | null> {
  const response = await fetch(`${BRIDGE_BASE}/deposit`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ address: walletAddress }),
  });
  if (!response.ok) throw new Error(`Polymarket bridge deposit request failed: HTTP ${response.status}`);
  const data = await response.json() as { address?: { evm?: unknown } };
  const evm = String(data?.address?.evm || '').trim();
  return /^0x[0-9a-f]{40}$/i.test(evm) ? evm : null;
}

async function fetchGammaMarketBySlug(slug: string): Promise<GammaMarket> {
  const response = await fetch(`${GAMMA_BASE}/markets/slug/${encodeURIComponent(slug)}`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Polymarket Bitcoin market is unavailable: HTTP ${response.status}`);
  const market = await response.json() as unknown;
  if (!market || typeof market !== 'object' || Array.isArray(market)) throw new Error('Polymarket returned invalid Bitcoin market metadata');
  return market as GammaMarket;
}

function parseGammaBitcoinMarket(market: GammaMarket, expectedSlug: string): PolymarketMarketView {
  const slug = String(market.slug || '').trim();
  if (slug !== expectedSlug || !/^btc-updown-5m-\d{10}$/.test(slug)) throw new Error('Polymarket returned the wrong Bitcoin 5-minute market');
  const marketId = String(market.id || '').trim();
  const conditionId = String(market.conditionId || market.condition_id || '').trim();
  const outcomes = parseStringArray(market.outcomes);
  const tokenIds = parseStringArray(market.clobTokenIds ?? market.clob_token_ids);
  const prices = parseNumberArray(market.outcomePrices ?? market.outcome_prices);
  if (!marketId || !conditionId || outcomes.length < 2 || tokenIds.length < 2) throw new Error('Polymarket Bitcoin market metadata is incomplete');
  let upIndex = outcomes.findIndex((value) => /^(up|yes)$/i.test(value.trim()));
  let downIndex = outcomes.findIndex((value) => /^(down|no)$/i.test(value.trim()));
  if (upIndex < 0 || downIndex < 0) { upIndex = 0; downIndex = 1; }
  const upTokenId = String(tokenIds[upIndex] || '').trim();
  const downTokenId = String(tokenIds[downIndex] || '').trim();
  if (!/^\d+$/.test(upTokenId) || !/^\d+$/.test(downTokenId)) throw new Error('Polymarket Bitcoin outcome token IDs are invalid');
  const resolutionSource = findResolutionSource(market);
  const sourceText = `${resolutionSource} ${String(market.description || '')}`.toLowerCase();
  const rtdsTopic = /twap[-_ ]?30s|30[- ]second/.test(sourceText) ? 'crypto_prices_twap_thirty' : /twap[-_ ]?60s|60[- ]second/.test(sourceText) ? 'crypto_prices_twap_sixty' : 'crypto_prices_twap_sixty';
  return {
    slug,
    marketId,
    conditionId,
    upTokenId,
    downTokenId,
    upPrice: cleanProbability(prices[upIndex]),
    downPrice: cleanProbability(prices[downIndex]),
    upLiquidityUsd: 0,
    downLiquidityUsd: 0,
    resolutionSource,
    rtdsTopic,
    rtdsSymbol: 'btc/usd',
  };
}

async function fetchBook(tokenId: string): Promise<{ bestAsk: number | null; askLiquidityUsd: number }> {
  const response = await fetch(`${CLOB_BASE}/book?token_id=${encodeURIComponent(tokenId)}`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Polymarket order book is unavailable: HTTP ${response.status}`);
  const data = await response.json() as { asks?: Array<{ price?: unknown; size?: unknown }> };
  const asks = (Array.isArray(data.asks) ? data.asks : []).map((level) => ({ price: Number(level?.price), size: Number(level?.size) })).filter((level) => Number.isFinite(level.price) && level.price > 0 && level.price < 1 && Number.isFinite(level.size) && level.size > 0).sort((a, b) => a.price - b.price);
  return { bestAsk: asks.length ? asks[0].price : null, askLiquidityUsd: asks.reduce((sum, level) => sum + level.price * level.size, 0) };
}

function findResolutionSource(market: GammaMarket): string {
  const direct = String(market.resolutionSource || market.resolution_source || '').trim();
  if (direct) return direct;
  const events = Array.isArray(market.events) ? market.events : [];
  for (const event of events) {
    if (!event || typeof event !== 'object') continue;
    const value = String((event as Record<string, unknown>).resolutionSource || (event as Record<string, unknown>).resolution_source || '').trim();
    if (value) return value;
  }
  return '';
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  const text = String(value ?? '').trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
  } catch {}
  return text.split(',').map((item) => item.trim()).filter(Boolean);
}

function parseNumberArray(value: unknown): number[] {
  return parseStringArray(value).map((item) => Number(item)).map((item) => Number.isFinite(item) ? item : NaN);
}

function cleanProbability(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : null;
}

function cleanAmount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function roundMoney(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n * 1_000_000) / 1_000_000 : 0;
}

function findFinitePositive(...values: unknown[]): number | null {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function slugStartMs(slug: string): number {
  const match = /^btc-updown-5m-(\d{10})$/.exec(slug);
  if (!match) throw new Error('Invalid Polymarket Bitcoin slug');
  return Number(match[1]) * 1000;
}

function executionFromRow(row: PolymarketBetRow): PolymarketExecution {
  if (row.status !== 'matched' || !(Number(row.filled_usd) > 0) || !(Number(row.shares) > 0) || !row.order_id) throw new Error('Polymarket matched order is incomplete');
  return {
    betId: row.bet_id,
    roundId: row.round_id,
    tokenId: row.token_id,
    requestedUsd: Number(row.requested_usd),
    filledUsd: Number(row.filled_usd),
    shares: Number(row.shares),
    orderId: row.order_id,
    status: 'matched',
  };
}

function normalizeProvider(value: unknown): PredictProvider {
  return String(value || '').toLowerCase() === 'polymarket' ? 'polymarket' : 'vexa';
}

function cleanSecret(value: unknown): string {
  return String(value ?? '').trim();
}

function requireSecret(value: unknown, name: string): string {
  const clean = cleanSecret(value);
  if (!clean) throw new Error(`${name} is not configured`);
  return clean;
}

function normalizePrivateKey(value: string): `0x${string}` {
  const clean = value.trim();
  const prefixed = clean.startsWith('0x') ? clean : `0x${clean}`;
  if (!/^0x[0-9a-f]{64}$/i.test(prefixed)) throw new Error('POLYMARKET_SIGNER_PRIVATE_KEY is invalid');
  return prefixed as `0x${string}`;
}
