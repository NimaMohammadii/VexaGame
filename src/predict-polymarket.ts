import {
  OrderSide,
  OrderType,
  RequestRejectedError,
  buildHmacSignature,
  createSecureClient,
  production,
  type ApiKeyAuthorization,
  type SignedOrder,
} from '@polymarket/client';
import { fetchBalanceAllowance, fetchNegRisk } from '@polymarket/client/actions';
import { AssetType } from '@polymarket/bindings/clob';
import { privateKey } from '@polymarket/client/viem';
import { hashTypedData, type Address, type Hex } from 'viem';
import type { Env } from './types';

export type PredictProvider = 'vexa' | 'polymarket';
export type PolymarketSide = 'up' | 'down';
export type PolymarketBetStatus = 'reserved' | 'signing' | 'prepared' | 'matched' | 'failed';
export type PolymarketBridgeDestination = 'polygon-usdc' | 'bsc-usdt';

const PROVIDER_KEY = 'admin:predict-provider:v1';
const POLYMARKET_WEB_BASE = 'https://polymarket.com';
const GAMMA_BASE = 'https://gamma-api.polymarket.com';
const CLOB_BASE = 'https://clob.polymarket.com';
const BRIDGE_BASE = 'https://bridge.polymarket.com';
const GEOBLOCK_URL = `${POLYMARKET_WEB_BASE}/api/geoblock`;
const POLYMARKET_ROUND_MS = 5 * 60 * 1000;
const PUSD_SCALE = 1_000_000;
const PUSD_SCALE_BIGINT = 1_000_000n;
const PUSD_TOKEN_ADDRESS = '0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB';
const POLYGON_CHAIN_ID = '137';
const POLYGON_NATIVE_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const BSC_CHAIN_ID = '56';
const RTDS_URL = 'wss://ws-live-data.polymarket.com';
const START_PRICE_CACHE_SECONDS = 15 * 60;
const POLYMARKET_ORDER_LOOKUP_GRACE_MS = 2 * 60 * 1000;
const POLYMARKET_AMOUNT_EPSILON = 1 / PUSD_SCALE;
const V2_RESERVED_BITS_MASK = ((1n << 64n) - 1n) << 40n;
const POLYMARKET_ORDER_TYPES = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'signatureType', type: 'uint8' },
    { name: 'timestamp', type: 'uint256' },
    { name: 'metadata', type: 'bytes32' },
    { name: 'builder', type: 'bytes32' },
  ],
} as const;

export const POLYMARKET_RTDS_URL = RTDS_URL;

type PolymarketRuntimeEnv = Env & {
  POLYMARKET_BUILDER_API_KEY?: string;
  POLYMARKET_BUILDER_SECRET?: string;
  POLYMARKET_BUILDER_PASSPHRASE?: string;
  POLYMARKET_SIGNER_PRIVATE_KEY?: string;
};

type GammaRecord = Record<string, unknown>;
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
  updated_at: string | null;
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
  created_at: string;
  updated_at: string;
  state_at_ms?: number;
};
type PolymarketWithdrawalRow = {
  request_id: string;
  amount_base_units: string;
  recipient_address: string;
  to_chain_id: string;
  to_token_address: string;
  estimated_output_usd: number | null;
  min_received: number | null;
  quote_id: string | null;
  status: string;
  bridge_address: string | null;
  tx_hash: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};
type BridgeSupportedAsset = {
  chainId?: unknown;
  chainName?: unknown;
  token?: { name?: unknown; symbol?: unknown; address?: unknown; decimals?: unknown };
  minCheckoutUsd?: unknown;
};
type BridgeQuote = {
  estOutputUsd?: unknown;
  quoteId?: unknown;
  estFeeBreakdown?: { minReceived?: unknown };
};
type GeoBlockState = { blocked: boolean; country: string; region: string };
type PolymarketStartPriceCachePayload = { openPrice?: unknown; retryAt?: unknown };
type EdgeCache = {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
};

type TradingClient = Awaited<ReturnType<typeof createSecureClient>>;
type PolymarketProductionEnvironment = {
  chainId: number;
  contracts: { standardExchange: Address; negRiskExchange: Address; exchangeV3: Address };
};
const polymarketProduction = production as unknown as PolymarketProductionEnvironment;
let tradingClientPromise: Promise<TradingClient> | null = null;
let approvalsReadyPromise: Promise<void> | null = null;
let providerTablesReady: Promise<void> | null = null;
const startPriceRequests = new Map<string, Promise<number>>();

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
  startPrice: number | null;
  finalPrice: number | null;
  resolutionSource: string;
  rtdsTopic: string;
  rtdsSymbol: 'btc/usd';
  rtdsUrl: string;
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

export type PolymarketBetReconciliation =
  | { status: 'matched'; execution: PolymarketExecution }
  | { status: 'failed' }
  | { status: 'pending' };

export type PolymarketAccountHealth = {
  configured: boolean;
  walletAddress: string | null;
  signerAddress: string | null;
  walletType: number | null;
  balanceUsd: number | null;
  bridgeEvmAddress: string | null;
  geoblocked: boolean | null;
  country: string | null;
  region: string | null;
};

export type PolymarketBridgeAssetView = {
  destination: PolymarketBridgeDestination;
  chainId: string;
  chainName: 'Polygon' | 'BNB Smart Chain';
  tokenSymbol: 'USDC' | 'USDT';
  tokenAddress: string;
  minCheckoutUsd: number | null;
};

export type PolymarketWithdrawalPreview = {
  requestId: string;
  amountUsd: number;
  recipientAddress: string;
  destinationChain: 'Polygon' | 'BNB Smart Chain';
  destinationToken: 'USDC' | 'USDT';
  estimatedOutputUsd: number | null;
  minReceived: number | null;
};

export type PolymarketWithdrawalResult = {
  requestId: string;
  amountUsd: number;
  recipientAddress: string;
  destinationChain: 'Polygon' | 'BNB Smart Chain';
  destinationToken: 'USDC' | 'USDT';
  txHash: string | null;
  status: 'completed';
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
      await env.DB.prepare(`CREATE TABLE IF NOT EXISTS predict_polymarket_withdrawals (
        request_id TEXT PRIMARY KEY,
        amount_base_units TEXT NOT NULL,
        recipient_address TEXT NOT NULL,
        to_chain_id TEXT NOT NULL,
        to_token_address TEXT NOT NULL,
        estimated_output_usd REAL,
        min_received REAL,
        quote_id TEXT,
        status TEXT NOT NULL,
        bridge_address TEXT,
        tx_hash TEXT,
        error TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`).run();
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
  const geo = await assertPolymarketTradingAllowed();
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
    geoblocked: false,
    country: geo.country || null,
    region: geo.region || null,
  };
  if (!(balance > 0)) {
    const destination = bridgeEvmAddress || client.account.wallet;
    throw new Error(`Polymarket wallet is ready but has no pUSD. Fund it first${destination ? ` via deposit address ${destination}` : ''}.`);
  }
  return health;
}

export async function getPolymarketAccountHealth(env: Env): Promise<PolymarketAccountHealth> {
  if (!polymarketSecretsConfigured(env)) return emptyAccountHealth();
  const client = await getTradingClient(env);
  const [balance, bridgeEvmAddress, geo] = await Promise.all([
    readCollateralBalanceUsd(client).catch(() => null),
    getBridgeEvmAddress(client.account.wallet).catch(() => null),
    readPolymarketGeoblock().catch(() => null),
  ]);
  return {
    configured: true,
    walletAddress: client.account.wallet,
    signerAddress: client.account.signer,
    walletType: Number(client.account.walletType),
    balanceUsd: balance,
    bridgeEvmAddress,
    geoblocked: geo ? geo.blocked : null,
    country: geo?.country || null,
    region: geo?.region || null,
  };
}

export async function getPolymarketBridgeAsset(destination: PolymarketBridgeDestination): Promise<PolymarketBridgeAssetView> {
  return requireBridgeAsset(destination);
}

export async function preparePolymarketWithdrawalToSigner(env: Env, amountInput: unknown, destination: PolymarketBridgeDestination = 'polygon-usdc', recipientInput?: unknown): Promise<PolymarketWithdrawalPreview> {
  await ensurePredictProviderTables(env);
  const client = await getTradingClient(env);
  const amountBaseUnits = parsePusdBaseUnits(amountInput);
  const recipientAddress = normalizeEvmAddress(recipientInput ?? client.account.signer);
  const balanceBaseUnits = await readCollateralBalanceBaseUnits(client);
  if (amountBaseUnits > balanceBaseUnits) throw new Error('مبلغ برداشت از موجودی pUSD بیشتر است.');
  const supported = await requireBridgeAsset(destination);
  const amountUsd = baseUnitsToUsd(amountBaseUnits);
  const minimumUsd = Number(supported.minCheckoutUsd);
  if (Number.isFinite(minimumUsd) && minimumUsd > 0 && amountUsd < minimumUsd) {
    throw new Error(`حداقل برداشت فعلی برای ${supported.tokenSymbol} روی ${supported.chainName} برابر $${minimumUsd} است.`);
  }
  const quote = await getBridgeQuote({
    amountBaseUnits,
    fromTokenAddress: PUSD_TOKEN_ADDRESS,
    recipientAddress,
    toChainId: supported.chainId,
    toTokenAddress: supported.tokenAddress,
  });
  const requestId = `pw_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  await env.DB.prepare(`INSERT INTO predict_polymarket_withdrawals (
    request_id, amount_base_units, recipient_address, to_chain_id, to_token_address,
    estimated_output_usd, min_received, quote_id, status, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'prepared', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .bind(
      requestId,
      amountBaseUnits.toString(),
      recipientAddress,
      supported.chainId,
      supported.tokenAddress,
      quote.estimatedOutputUsd,
      quote.minReceived,
      quote.quoteId,
    )
    .run();
  return {
    requestId,
    amountUsd,
    recipientAddress,
    destinationChain: supported.chainName,
    destinationToken: supported.tokenSymbol,
    estimatedOutputUsd: quote.estimatedOutputUsd,
    minReceived: quote.minReceived,
  };
}

export async function executePolymarketWithdrawal(env: Env, requestIdInput: unknown): Promise<PolymarketWithdrawalResult> {
  await ensurePredictProviderTables(env);
  const requestId = normalizeWithdrawalRequestId(requestIdInput);
  let row = await env.DB.prepare('SELECT * FROM predict_polymarket_withdrawals WHERE request_id = ?').bind(requestId).first<PolymarketWithdrawalRow>();
  if (!row) throw new Error('درخواست برداشت پیدا نشد.');
  if (row.status === 'completed') return withdrawalResultFromRow(row);
  if (row.status !== 'prepared') throw new Error(row.status === 'review' ? 'این برداشت نیاز به بررسی تراکنش قبلی دارد و خودکار تکرار نمی‌شود.' : 'این برداشت در حال اجراست یا دیگر قابل اجرا نیست.');

  const client = await getTradingClient(env);
  const recipientAddress = normalizeEvmAddress(row.recipient_address);
  const destination = await requireStoredBridgeAsset(row.to_chain_id, row.to_token_address);
  const amountBaseUnits = BigInt(row.amount_base_units);
  if (amountBaseUnits <= 0n) throw new Error('مبلغ برداشت ذخیره‌شده نامعتبر است.');
  const balanceBaseUnits = await readCollateralBalanceBaseUnits(client);
  if (amountBaseUnits > balanceBaseUnits) throw new Error('موجودی pUSD برای این برداشت کافی نیست.');

  const freshQuote = await getBridgeQuote({
    amountBaseUnits,
    fromTokenAddress: PUSD_TOKEN_ADDRESS,
    recipientAddress,
    toChainId: destination.chainId,
    toTokenAddress: destination.tokenAddress,
  });
  if (row.min_received != null && freshQuote.minReceived != null && freshQuote.minReceived + 0.000001 < Number(row.min_received)) {
    await env.DB.prepare(`UPDATE predict_polymarket_withdrawals SET estimated_output_usd = ?, min_received = ?, quote_id = ?, updated_at = CURRENT_TIMESTAMP WHERE request_id = ? AND status = 'prepared'`)
      .bind(freshQuote.estimatedOutputUsd, freshQuote.minReceived, freshQuote.quoteId, requestId).run();
    throw new Error('Quote برداشت تغییر کرده است. دوباره Withdraw را باز کن تا مقدار جدید را تأیید کنی.');
  }

  const locked = await env.DB.prepare(`UPDATE predict_polymarket_withdrawals SET status = 'executing', error = NULL, estimated_output_usd = ?, min_received = ?, quote_id = ?, updated_at = CURRENT_TIMESTAMP WHERE request_id = ? AND status = 'prepared'`)
    .bind(freshQuote.estimatedOutputUsd, freshQuote.minReceived, freshQuote.quoteId, requestId).run();
  if ((locked.meta?.changes || 0) <= 0) {
    row = await env.DB.prepare('SELECT * FROM predict_polymarket_withdrawals WHERE request_id = ?').bind(requestId).first<PolymarketWithdrawalRow>();
    if (row?.status === 'completed') return withdrawalResultFromRow(row);
    throw new Error('این برداشت قبلاً شروع شده است و دوباره اجرا نمی‌شود.');
  }

  let bridgeAddress: string;
  try {
    bridgeAddress = await createBridgeWithdrawalAddress(client.account.wallet, recipientAddress, destination.chainId, destination.tokenAddress);
  } catch (error) {
    await env.DB.prepare(`UPDATE predict_polymarket_withdrawals SET status = 'prepared', error = ?, updated_at = CURRENT_TIMESTAMP WHERE request_id = ? AND status = 'executing'`)
      .bind(messageOf(error), requestId).run().catch(() => undefined);
    throw error;
  }

  await env.DB.prepare(`UPDATE predict_polymarket_withdrawals SET bridge_address = ?, updated_at = CURRENT_TIMESTAMP WHERE request_id = ? AND status = 'executing'`)
    .bind(bridgeAddress, requestId).run();

  try {
    const handle = await client.transferErc20({
      amount: amountBaseUnits,
      recipientAddress: bridgeAddress as typeof client.account.signer,
      tokenAddress: PUSD_TOKEN_ADDRESS as typeof client.account.signer,
    });
    const submittedHash = handle.transactionHash ? String(handle.transactionHash) : null;
    if (submittedHash) {
      await env.DB.prepare(`UPDATE predict_polymarket_withdrawals SET tx_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE request_id = ? AND status = 'executing'`)
        .bind(submittedHash, requestId).run();
    }
    const outcome = await handle.wait();
    const txHash = String(outcome.transactionHash || handle.transactionHash || '').trim() || null;
    await env.DB.prepare(`UPDATE predict_polymarket_withdrawals SET status = 'completed', tx_hash = ?, error = NULL, updated_at = CURRENT_TIMESTAMP WHERE request_id = ? AND status = 'executing'`)
      .bind(txHash, requestId).run();
    const completed = await env.DB.prepare('SELECT * FROM predict_polymarket_withdrawals WHERE request_id = ?').bind(requestId).first<PolymarketWithdrawalRow>();
    if (!completed || completed.status !== 'completed') throw new Error('برداشت انجام شد اما ثبت نتیجه کامل نشد.');
    return withdrawalResultFromRow(completed);
  } catch (error) {
    await env.DB.prepare(`UPDATE predict_polymarket_withdrawals SET status = 'review', error = ?, updated_at = CURRENT_TIMESTAMP WHERE request_id = ? AND status = 'executing'`)
      .bind(messageOf(error), requestId).run().catch(() => undefined);
    throw new Error(`وضعیت انتقال قطعی نیست و برای جلوگیری از برداشت دوباره، Retry خودکار متوقف شد. ${messageOf(error)}`);
  }
}

export async function loadPolymarketBitcoinMarket(startMs: number): Promise<PolymarketMarketView> {
  const normalizedStart = Math.floor(Number(startMs) / POLYMARKET_ROUND_MS) * POLYMARKET_ROUND_MS;
  if (!Number.isFinite(normalizedStart) || normalizedStart <= 0) throw new Error('Invalid Polymarket Bitcoin round start');
  const slug = `btc-updown-5m-${Math.floor(normalizedStart / 1000)}`;
  return loadPolymarketBitcoinMarketBySlug(slug, undefined, false);
}

async function loadPolymarketBitcoinMarketBySlug(slug: string, startPrice?: number, refreshBooks = true): Promise<PolymarketMarketView> {
  const [market, event] = await Promise.all([fetchGammaMarketBySlug(slug), fetchGammaEventBySlug(slug)]);
  if (startPrice === undefined) {
    const startMs = Number(slug.split('-').pop()) * 1000;
    startPrice = await fetchPolymarketBitcoinStartPrice(startMs, bitcoinRtdsTopic(market, event));
  }
  const parsed = parseGammaBitcoinMarket(market, event, slug, startPrice);
  // Round readiness needs the reference price and token IDs. Executing a bet
  // still refreshes both books; the UI receives its books over the CLOB stream.
  if (!refreshBooks) return parsed;
  const [upBook, downBook] = await Promise.all([fetchBook(parsed.upTokenId), fetchBook(parsed.downTokenId)]);
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
  const round = await env.DB.prepare('SELECT start_price FROM predict_rounds WHERE id = ?').bind(roundId).first<{ start_price: number }>();
  const startPrice = Number(round?.start_price);
  if (!(startPrice > 0)) throw new Error('Polymarket Bitcoin start price is unavailable for this round');
  const fresh = await loadPolymarketBitcoinMarketBySlug(row.slug, startPrice);
  if (refreshPrices) await persistPolymarketRound(env, roundId, fresh);
  return {
    ...fresh,
    upTokenId: row.up_token_id,
    downTokenId: row.down_token_id,
    conditionId: row.condition_id,
    marketId: row.market_id,
    resolutionSource: row.resolution_source || fresh.resolutionSource,
    rtdsTopic: row.rtds_topic || fresh.rtdsTopic,
  };
}

export async function resolvePolymarketBitcoinRound(env: Env, roundId: string): Promise<{ result: PolymarketSide; finalPrice: number | null } | null> {
  await ensurePredictProviderTables(env);
  const row = await env.DB.prepare('SELECT * FROM predict_polymarket_rounds WHERE round_id = ?').bind(roundId).first<PolymarketRoundRow>();
  if (!row) throw new Error('Polymarket round metadata is unavailable');
  const [market, event] = await Promise.all([fetchGammaMarketBySlug(row.slug), fetchGammaEventBySlug(row.slug)]);
  const outcomes = parseStringArray(market.outcomes);
  const prices = parseNumberArray(market.outcomePrices ?? market.outcome_prices);
  let result: PolymarketSide | null = null;
  for (let i = 0; i < Math.min(outcomes.length, prices.length); i += 1) {
    const label = outcomes[i].trim().toLowerCase();
    const price = prices[i];
    if (price < 0.999) continue;
    if (label === 'up' || label === 'yes') result = 'up';
    if (label === 'down' || label === 'no') result = 'down';
  }
  if (!result) {
    const winner = String(market.winner || market.resolvedOutcome || market.result || event.winner || event.resolvedOutcome || event.result || '').trim().toLowerCase();
    if (winner === 'up' || winner === 'yes') result = 'up';
    else if (winner === 'down' || winner === 'no') result = 'down';
  }
  if (!result) return null;
  return { result, finalPrice: metadataFinalPrice(event, market) };
}

export async function executePolymarketBitcoinBet(env: Env, input: { betId: string; roundId: string; side: PolymarketSide; stakeUsd: number }): Promise<PolymarketExecution> {
  const requestedUsd = roundMoney(input.stakeUsd);
  if (!(requestedUsd > 0)) throw new Error('A USD conversion is required for Polymarket predictions');
  await ensurePredictProviderTables(env);
  await assertPolymarketTradingAllowed();
  const market = await getPolymarketRoundMarket(env, input.roundId, true);
  const tokenId = input.side === 'down' ? market.downTokenId : market.upTokenId;
  let row = await env.DB.prepare('SELECT * FROM predict_polymarket_bets WHERE bet_id = ?').bind(input.betId).first<PolymarketBetRow>();
  if (!row) {
    await env.DB.prepare(`INSERT OR IGNORE INTO predict_polymarket_bets (
      bet_id, round_id, token_id, requested_usd, filled_usd, shares, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 0, 0, 'reserved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
      .bind(input.betId, input.roundId, tokenId, requestedUsd).run();
    row = await env.DB.prepare('SELECT * FROM predict_polymarket_bets WHERE bet_id = ?').bind(input.betId).first<PolymarketBetRow>();
  }
  if (!row) throw new Error('Could not reserve Polymarket order');
  if (row.round_id !== input.roundId || row.token_id !== tokenId || Math.abs(Number(row.requested_usd) - requestedUsd) > POLYMARKET_AMOUNT_EPSILON) throw new Error('Polymarket prediction reservation does not match the original request');
  if (row.status === 'matched') return executionFromRow(row);
  if (row.status === 'failed') throw new Error('The Polymarket order for this prediction already failed');
  if (row.status === 'prepared') {
    const reconciled = await reconcilePolymarketBitcoinBet(env, input.betId);
    if (reconciled.status === 'matched') return reconciled.execution;
    if (reconciled.status === 'failed') throw new Error('The Polymarket order for this prediction failed');
    throw new Error('The Polymarket order for this prediction is still being confirmed');
  }
  if (row.status === 'signing') throw new Error('The Polymarket order for this prediction is still being prepared');
  if (row.status !== 'reserved') throw new Error('The Polymarket order for this prediction has an invalid state');

  // Only the request that atomically claims this reservation may create and post
  // a signed order. Concurrent retries observe `signing` and cannot post a duplicate.
  const claimed = await env.DB.prepare(`UPDATE predict_polymarket_bets SET status = 'signing', updated_at = CURRENT_TIMESTAMP WHERE bet_id = ? AND status = 'reserved'`)
    .bind(input.betId).run();
  if ((claimed.meta?.changes || 0) <= 0) {
    const current = await env.DB.prepare('SELECT * FROM predict_polymarket_bets WHERE bet_id = ?').bind(input.betId).first<PolymarketBetRow>();
    if (current?.status === 'matched') return executionFromRow(current);
    if (current?.status === 'failed') throw new Error('The Polymarket order for this prediction already failed');
    if (current?.status === 'prepared') {
      const reconciled = await reconcilePolymarketBitcoinBet(env, input.betId);
      if (reconciled.status === 'matched') return reconciled.execution;
      if (reconciled.status === 'failed') throw new Error('The Polymarket order for this prediction failed');
    }
    throw new Error('The Polymarket order for this prediction is still being prepared');
  }

  let client: TradingClient;
  try {
    client = await getTradingClient(env);
    await ensureTradingApprovals(client);
  } catch (error) {
    await markPolymarketBetFailed(env, input.betId);
    throw error;
  }
  let signedOrder: SignedOrder;
  if (row.signed_order_json) {
    signedOrder = JSON.parse(row.signed_order_json) as SignedOrder;
  } else {
    try {
      signedOrder = await client.createMarketOrder({
        assetId: tokenId,
        side: OrderSide.BUY,
        amount: requestedUsd.toFixed(6),
        maxSpend: requestedUsd.toFixed(6),
        orderType: OrderType.FOK,
      });
    } catch (error) {
      await markPolymarketBetFailed(env, input.betId);
      throw error;
    }
    const signedJson = JSON.stringify(signedOrder);
    let orderId: string;
    try {
      orderId = await polymarketOrderId(client, signedOrder);
    } catch (error) {
      await markPolymarketBetFailed(env, input.betId);
      throw error;
    }
    const prepared = await env.DB.prepare(`UPDATE predict_polymarket_bets SET signed_order_json = ?, order_id = ?, status = 'prepared', updated_at = CURRENT_TIMESTAMP WHERE bet_id = ? AND status = 'signing'`)
      .bind(signedJson, orderId, input.betId).run();
    if ((prepared.meta?.changes || 0) <= 0) {
      const current = await env.DB.prepare('SELECT * FROM predict_polymarket_bets WHERE bet_id = ?').bind(input.betId).first<PolymarketBetRow>();
      if (current?.status === 'matched') return executionFromRow(current);
      if (current?.status === 'failed') throw new Error('The Polymarket order for this prediction already failed');
      throw new Error('The Polymarket order for this prediction could not be prepared safely');
    }
  }

  // A transport failure after this point is intentionally not marked failed. The exact
  // signed FOK order and its deterministic ID are persisted for read-only reconciliation.
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
  if (!(filledUsd > 0) || !(shares > 0)) {
    await markPolymarketBetFailed(env, input.betId);
    throw new Error('Polymarket returned an invalid matched order amount');
  }
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

export async function getPolymarketBetStatus(env: Env, betId: string): Promise<PolymarketBetStatus | null> {
  await ensurePredictProviderTables(env);
  const row = await env.DB.prepare('SELECT status FROM predict_polymarket_bets WHERE bet_id = ?').bind(betId).first<{ status: string }>();
  const value = String(row?.status || '').toLowerCase();
  if (value === 'reserved' || value === 'signing' || value === 'prepared' || value === 'matched' || value === 'failed') return value;
  return null;
}

export async function getPolymarketBetExecution(env: Env, betId: string): Promise<PolymarketExecution | null> {
  await ensurePredictProviderTables(env);
  const row = await env.DB.prepare('SELECT * FROM predict_polymarket_bets WHERE bet_id = ?').bind(betId).first<PolymarketBetRow>();
  return row?.status === 'matched' ? executionFromRow(row) : null;
}

export async function reconcilePolymarketBitcoinBet(env: Env, betId: string): Promise<PolymarketBetReconciliation> {
  await ensurePredictProviderTables(env);
  const row = await env.DB.prepare(`SELECT *, CAST(strftime('%s', COALESCE(updated_at, created_at)) * 1000 AS INTEGER) AS state_at_ms
    FROM predict_polymarket_bets WHERE bet_id = ?`).bind(betId).first<PolymarketBetRow>();
  if (!row) return { status: 'failed' };
  if (row.status === 'matched') return { status: 'matched', execution: executionFromRow(row) };
  if (row.status === 'failed') return { status: 'failed' };
  if (row.status === 'reserved' || row.status === 'signing') {
    const reservedAt = Number(row.state_at_ms);
    if (!(reservedAt > 0) || Date.now() - reservedAt < POLYMARKET_ORDER_LOOKUP_GRACE_MS) return { status: 'pending' };
    await markPolymarketBetFailed(env, betId);
    return { status: 'failed' };
  }
  if (row.status !== 'prepared' || !row.signed_order_json) return { status: 'pending' };

  let signedOrder: SignedOrder;
  try {
    signedOrder = JSON.parse(row.signed_order_json) as SignedOrder;
  } catch {
    return { status: 'pending' };
  }
  if (String(signedOrder.tokenId) !== String(row.token_id)) return { status: 'pending' };

  const client = await getTradingClient(env);
  const orderId = row.order_id || await polymarketOrderId(client, signedOrder);
  if (!row.order_id) {
    await env.DB.prepare(`UPDATE predict_polymarket_bets SET order_id = ? WHERE bet_id = ? AND status = 'prepared' AND order_id IS NULL`)
      .bind(orderId, betId).run();
  }

  try {
    const order = await client.fetchOrder({ orderId });
    if (String(order.id).toLowerCase() !== orderId.toLowerCase() || String(order.assetId) !== String(row.token_id)) return { status: 'pending' };
    const originalSize = Number(order.originalSize);
    const matchedSize = Number(order.sizeMatched);
    const signedShares = baseUnitsToUsd(BigInt(signedOrder.takerAmount));
    const fullyMatched = Number.isFinite(originalSize) && originalSize > 0
      && Number.isFinite(matchedSize) && matchedSize > 0
      && Math.abs(originalSize - signedShares) <= POLYMARKET_AMOUNT_EPSILON
      && Math.abs(matchedSize - originalSize) <= POLYMARKET_AMOUNT_EPSILON;
    if (fullyMatched) {
      const filledUsd = baseUnitsToUsd(BigInt(signedOrder.makerAmount));
      const shares = matchedSize;
      if (!(filledUsd > 0) || !(shares > 0)) return { status: 'pending' };
      await env.DB.prepare(`UPDATE predict_polymarket_bets SET status = 'matched', filled_usd = ?, shares = ?, order_id = ?, response_json = ?, updated_at = CURRENT_TIMESTAMP WHERE bet_id = ? AND status = 'prepared'`)
        .bind(filledUsd, shares, orderId, JSON.stringify({ reconciled: true, order }), betId).run();
      const matched = await env.DB.prepare('SELECT * FROM predict_polymarket_bets WHERE bet_id = ?').bind(betId).first<PolymarketBetRow>();
      if (matched?.status === 'matched') return { status: 'matched', execution: executionFromRow(matched) };
      return { status: 'pending' };
    }
    const status = String(order.status || '').trim().toUpperCase();
    if (status === 'CANCELED' || status === 'CANCELLED' || status === 'INVALID' || status === 'EXPIRED') {
      await env.DB.prepare(`UPDATE predict_polymarket_bets SET status = 'failed', response_json = ?, updated_at = CURRENT_TIMESTAMP WHERE bet_id = ? AND status = 'prepared'`)
        .bind(JSON.stringify({ reconciled: true, order }), betId).run();
      return { status: 'failed' };
    }
    return { status: 'pending' };
  } catch (error) {
    const preparedAt = Number(row.state_at_ms);
    const graceElapsed = preparedAt > 0 && Date.now() - preparedAt >= POLYMARKET_ORDER_LOOKUP_GRACE_MS;
    if (!(error instanceof RequestRejectedError) || error.status !== 404 || !graceElapsed) throw error;
    await env.DB.prepare(`UPDATE predict_polymarket_bets SET status = 'failed', response_json = ?, updated_at = CURRENT_TIMESTAMP WHERE bet_id = ? AND status = 'prepared'`)
      .bind(JSON.stringify({ reconciled: true, orderId, status: 404 }), betId).run();
    return { status: 'failed' };
  }
}

export async function redeemPolymarketBitcoinRound(env: Env, roundId: string): Promise<boolean> {
  await ensurePredictProviderTables(env);
  const row = await env.DB.prepare('SELECT * FROM predict_polymarket_rounds WHERE round_id = ?').bind(roundId).first<PolymarketRoundRow>();
  if (!row) throw new Error('Polymarket round metadata is unavailable');
  if (row.redeemed_at) return true;
  const locked = await env.DB.prepare(`UPDATE predict_polymarket_rounds SET redeem_status = 'redeeming', updated_at = CURRENT_TIMESTAMP
    WHERE round_id = ? AND redeemed_at IS NULL AND (
      redeem_status IS NULL OR redeem_status = 'failed' OR (redeem_status = 'redeeming' AND datetime(updated_at) <= datetime('now','-2 minutes'))
    )`).bind(roundId).run();
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
        async authorize(request: { method: 'DELETE' | 'GET' | 'PATCH' | 'POST'; path: string; body?: string }) {
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

async function readCollateralBalanceBaseUnits(client: TradingClient): Promise<bigint> {
  const state = await fetchBalanceAllowance(client, { assetType: AssetType.COLLATERAL });
  const value = String(state.balance ?? '').trim();
  if (!/^\d+$/.test(value)) throw new Error('Polymarket returned an invalid pUSD balance');
  return BigInt(value);
}

async function readCollateralBalanceUsd(client: TradingClient): Promise<number> {
  return Number(await readCollateralBalanceBaseUnits(client)) / PUSD_SCALE;
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

async function fetchBridgeSupportedAssets(): Promise<BridgeSupportedAsset[]> {
  const response = await fetch(`${BRIDGE_BASE}/supported-assets`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Polymarket bridge supported-assets request failed: HTTP ${response.status}`);
  const data = await response.json() as { supportedAssets?: BridgeSupportedAsset[] };
  return Array.isArray(data.supportedAssets) ? data.supportedAssets : [];
}

function bridgeTarget(destination: PolymarketBridgeDestination): { chainId: string; chainName: 'Polygon' | 'BNB Smart Chain'; tokenSymbol: 'USDC' | 'USDT' } {
  if (destination === 'bsc-usdt') return { chainId: BSC_CHAIN_ID, chainName: 'BNB Smart Chain', tokenSymbol: 'USDT' };
  return { chainId: POLYGON_CHAIN_ID, chainName: 'Polygon', tokenSymbol: 'USDC' };
}

async function requireBridgeAsset(destination: PolymarketBridgeDestination): Promise<PolymarketBridgeAssetView> {
  const target = bridgeTarget(destination);
  const assets = await fetchBridgeSupportedAssets();
  const matches = assets.filter((item) =>
    String(item.chainId || '') === target.chainId &&
    String(item.token?.symbol || '').trim().toUpperCase() === target.tokenSymbol,
  );
  const selected = destination === 'polygon-usdc'
    ? matches.find((item) => String(item.token?.address || '').trim().toLowerCase() === POLYGON_NATIVE_USDC.toLowerCase())
    : matches.length === 1 ? matches[0] : undefined;
  const tokenAddress = String(selected?.token?.address || '').trim();
  if (!selected || !/^0x[0-9a-f]{40}$/i.test(tokenAddress)) {
    throw new Error(`${target.tokenSymbol} روی ${target.chainName} در لیست فعلی Bridge پولی‌مارکت پیدا نشد.`);
  }
  return {
    destination,
    chainId: target.chainId,
    chainName: target.chainName,
    tokenSymbol: target.tokenSymbol,
    tokenAddress,
    minCheckoutUsd: finiteNullable(selected.minCheckoutUsd),
  };
}

async function requireStoredBridgeAsset(chainIdInput: string, tokenAddressInput: string): Promise<PolymarketBridgeAssetView> {
  const chainId = String(chainIdInput || '').trim();
  const tokenAddress = String(tokenAddressInput || '').trim().toLowerCase();
  const candidates: PolymarketBridgeDestination[] = chainId === BSC_CHAIN_ID ? ['bsc-usdt'] : chainId === POLYGON_CHAIN_ID ? ['polygon-usdc'] : [];
  if (!candidates.length) throw new Error('شبکه مقصد برداشت معتبر نیست.');
  const asset = await requireBridgeAsset(candidates[0]);
  if (asset.tokenAddress.toLowerCase() !== tokenAddress) throw new Error('توکن مقصد برداشت دیگر با تنظیمات Bridge مطابقت ندارد.');
  return asset;
}

async function getBridgeQuote(input: { amountBaseUnits: bigint; fromTokenAddress: string; recipientAddress: string; toChainId: string; toTokenAddress: string }): Promise<{ estimatedOutputUsd: number | null; minReceived: number | null; quoteId: string | null }> {
  const response = await fetch(`${BRIDGE_BASE}/quote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      fromAmountBaseUnit: input.amountBaseUnits.toString(),
      fromChainId: POLYGON_CHAIN_ID,
      fromTokenAddress: input.fromTokenAddress,
      recipientAddress: input.recipientAddress,
      toChainId: input.toChainId,
      toTokenAddress: input.toTokenAddress,
    }),
  });
  if (!response.ok) throw new Error(`Polymarket bridge quote failed: HTTP ${response.status}`);
  const data = await response.json() as BridgeQuote;
  return {
    estimatedOutputUsd: finiteNullable(data.estOutputUsd),
    minReceived: finiteNullable(data.estFeeBreakdown?.minReceived),
    quoteId: String(data.quoteId || '').trim() || null,
  };
}

async function createBridgeWithdrawalAddress(walletAddress: string, recipientAddress: string, toChainId: string, toTokenAddress: string): Promise<string> {
  const response = await fetch(`${BRIDGE_BASE}/withdraw`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      address: walletAddress,
      toChainId,
      toTokenAddress,
      recipientAddr: recipientAddress,
    }),
  });
  if (!response.ok) throw new Error(`Polymarket bridge withdrawal request failed: HTTP ${response.status}`);
  const data = await response.json() as { address?: { evm?: unknown } };
  const evm = String(data?.address?.evm || '').trim();
  if (!/^0x[0-9a-f]{40}$/i.test(evm)) throw new Error('Polymarket bridge returned an invalid withdrawal address');
  return evm;
}

async function readPolymarketGeoblock(): Promise<GeoBlockState> {
  const response = await fetch(GEOBLOCK_URL, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Polymarket geoblock check failed: HTTP ${response.status}`);
  const data = await response.json() as { blocked?: unknown; country?: unknown; region?: unknown };
  return { blocked: data.blocked === true, country: String(data.country || '').trim().toUpperCase(), region: String(data.region || '').trim().toUpperCase() };
}

async function assertPolymarketTradingAllowed(): Promise<GeoBlockState> {
  const geo = await readPolymarketGeoblock();
  if (geo.blocked) throw new Error(`Polymarket trading is blocked from the Vexa backend region${geo.country ? ` (${geo.country}${geo.region ? `-${geo.region}` : ''})` : ''}.`);
  return geo;
}

export async function fetchPolymarketBitcoinStartPrice(startMs: number, rtdsTopic: string): Promise<number> {
  const normalizedStart = Math.floor(Number(startMs) / POLYMARKET_ROUND_MS) * POLYMARKET_ROUND_MS;
  if (!Number.isFinite(normalizedStart) || normalizedStart <= 0) throw new Error('Invalid Polymarket Bitcoin round start');
  if (!['crypto_prices_chainlink', 'crypto_prices_twap_thirty', 'crypto_prices_twap_sixty'].includes(rtdsTopic)) throw new Error('Unsupported Polymarket Bitcoin reference feed');
  const key = `${normalizedStart}:${rtdsTopic}`;
  const inFlight = startPriceRequests.get(key);
  if (inFlight) return inFlight;
  const request = fetchPolymarketBitcoinStartPriceOnce(normalizedStart, rtdsTopic).catch((error) => {
    startPriceRequests.delete(key);
    throw error;
  });
  startPriceRequests.set(key, request);
  // Successful opening references are immutable for this round/source. Bound
  // isolate memory while sharing the same result across concurrent requests.
  if (startPriceRequests.size > 16) startPriceRequests.delete(startPriceRequests.keys().next().value!);
  return request;
}

async function fetchPolymarketBitcoinStartPriceOnce(normalizedStart: number, rtdsTopic: string): Promise<number> {
  const query = new URLSearchParams({
    symbol: 'BTC',
    eventStartTime: new Date(normalizedStart).toISOString(),
    variant: 'fiveminute',
    endDate: new Date(normalizedStart + POLYMARKET_ROUND_MS).toISOString(),
  });
  if (rtdsTopic !== 'crypto_prices_chainlink') {
    query.set('twapEnabled', 'true');
    query.set('twapLookbackSeconds', rtdsTopic === 'crypto_prices_twap_thirty' ? '30' : '60');
  }
  const url = `${POLYMARKET_WEB_BASE}/api/crypto/crypto-price?${query.toString()}`;
  const cacheKey = new Request(url, { method: 'GET' });
  const cache = getPolymarketEdgeCache();
  const cached = cache ? await cache.match(cacheKey).catch(() => undefined) : undefined;
  if (cached) {
    const data = await cached.json().catch(() => ({})) as PolymarketStartPriceCachePayload;
    const cachedPrice = Number(data.openPrice);
    if (Number.isFinite(cachedPrice) && cachedPrice > 0) return cachedPrice;
    const retryAt = Number(data.retryAt);
    if (Number.isFinite(retryAt) && retryAt > Date.now()) throw new Error('Polymarket Bitcoin start price is unavailable: HTTP 429');
  }

  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(6_000) });
  if (!response.ok) {
    if (response.status === 429 && cache) {
      const retryMs = parseRetryAfterMs(response.headers.get('retry-after'));
      const retryAt = Date.now() + retryMs;
      const ttlSeconds = Math.max(1, Math.ceil(retryMs / 1000));
      const hold = new Response(JSON.stringify({ retryAt }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'cache-control': `public, max-age=${ttlSeconds}`,
        },
      });
      await cache.put(cacheKey, hold).catch(() => undefined);
    }
    throw new Error(`Polymarket Bitcoin start price is unavailable: HTTP ${response.status}`);
  }
  const data = await response.json() as { openPrice?: unknown };
  const startPrice = Number(data.openPrice);
  if (!Number.isFinite(startPrice) || startPrice <= 0) throw new Error('Polymarket Bitcoin start price is unavailable for this round');
  if (cache) {
    const cachedResponse = new Response(JSON.stringify({ openPrice: startPrice }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, max-age=${START_PRICE_CACHE_SECONDS}`,
      },
    });
    await cache.put(cacheKey, cachedResponse).catch(() => undefined);
  }
  return startPrice;
}

function getPolymarketEdgeCache(): EdgeCache | null {
  const storage = (globalThis as unknown as { caches?: { default?: EdgeCache } }).caches;
  return storage?.default || null;
}

function parseRetryAfterMs(value: string | null): number {
  const text = String(value || '').trim();
  const seconds = Number(text);
  if (Number.isFinite(seconds) && seconds > 0) return Math.min(60_000, Math.max(5_000, Math.ceil(seconds * 1000)));
  const at = Date.parse(text);
  if (Number.isFinite(at)) return Math.min(60_000, Math.max(5_000, at - Date.now()));
  return 30_000;
}

async function fetchGammaMarketBySlug(slug: string): Promise<GammaRecord> {
  const response = await fetch(`${GAMMA_BASE}/markets/slug/${encodeURIComponent(slug)}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(6_000) });
  if (!response.ok) throw new Error(`Polymarket Bitcoin market is unavailable: HTTP ${response.status}`);
  const market = await response.json() as unknown;
  if (!market || typeof market !== 'object' || Array.isArray(market)) throw new Error('Polymarket returned invalid Bitcoin market metadata');
  return market as GammaRecord;
}

async function fetchGammaEventBySlug(slug: string): Promise<GammaRecord> {
  const response = await fetch(`${GAMMA_BASE}/events/slug/${encodeURIComponent(slug)}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(6_000) });
  if (!response.ok) throw new Error(`Polymarket Bitcoin event is unavailable: HTTP ${response.status}`);
  const event = await response.json() as unknown;
  if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error('Polymarket returned invalid Bitcoin event metadata');
  return event as GammaRecord;
}

function parseGammaBitcoinMarket(market: GammaRecord, event: GammaRecord, expectedSlug: string, startPrice: number): PolymarketMarketView {
  const slug = String(market.slug || event.slug || '').trim();
  if (slug !== expectedSlug || !/^btc-updown-5m-\d{10}$/.test(slug)) throw new Error('Polymarket returned the wrong Bitcoin 5-minute market');
  if (market.closed === true || market.active === false || market.enableOrderBook === false || market.acceptingOrders === false) throw new Error('Polymarket Bitcoin market is not accepting orders');
  const secondsDelay = Number(market.secondsDelay ?? market.seconds_delay ?? 0);
  if (Number.isFinite(secondsDelay) && secondsDelay > 0) throw new Error('Polymarket Bitcoin market uses delayed execution and cannot be used for Vexa Predict');
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
  if (!(Number(startPrice) > 0)) throw new Error('Polymarket Bitcoin start price is unavailable for this round');
  const resolutionSource = findResolutionSource(market, event);
  const rtdsTopic = bitcoinRtdsTopic(market, event);
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
    startPrice: Number(startPrice),
    finalPrice: metadataFinalPrice(event, market),
    resolutionSource,
    rtdsTopic,
    rtdsSymbol: 'btc/usd',
    rtdsUrl: RTDS_URL,
  };
}

function bitcoinRtdsTopic(market: GammaRecord, event: GammaRecord): string {
  const config = parseRecord(market.cryptoMarketConfig ?? event.cryptoMarketConfig);
  if (config?.twapEnabled === true) {
    if (Number(config.twapLookbackSeconds) === 30) return 'crypto_prices_twap_thirty';
    if (Number(config.twapLookbackSeconds) === 60) return 'crypto_prices_twap_sixty';
    throw new Error('Unsupported Polymarket Bitcoin TWAP window');
  }
  const source = `${findResolutionSource(market, event)} ${String(market.description || event.description || '')}`.toLowerCase();
  if (/twap[-_ ]?30s|30[- ]second/.test(source)) return 'crypto_prices_twap_thirty';
  if (/twap[-_ ]?60s|60[- ]second/.test(source)) return 'crypto_prices_twap_sixty';
  if (/twap|time-weighted/.test(source)) throw new Error('Unsupported Polymarket Bitcoin TWAP window');
  if (/chain\.link|chainlink/.test(source)) return 'crypto_prices_chainlink';
  throw new Error('Unsupported Polymarket Bitcoin reference feed');
}

async function fetchBook(tokenId: string): Promise<{ bestAsk: number | null; askLiquidityUsd: number }> {
  const response = await fetch(`${CLOB_BASE}/book?token_id=${encodeURIComponent(tokenId)}`, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Polymarket order book is unavailable: HTTP ${response.status}`);
  const data = await response.json() as { asks?: Array<{ price?: unknown; size?: unknown }> };
  const asks = (Array.isArray(data.asks) ? data.asks : [])
    .map((level) => ({ price: Number(level?.price), size: Number(level?.size) }))
    .filter((level) => Number.isFinite(level.price) && level.price > 0 && level.price < 1 && Number.isFinite(level.size) && level.size > 0)
    .sort((a, b) => a.price - b.price);
  return { bestAsk: asks.length ? asks[0].price : null, askLiquidityUsd: asks.reduce((sum, level) => sum + level.price * level.size, 0) };
}

function findResolutionSource(market: GammaRecord, event: GammaRecord): string {
  const direct = String(market.resolutionSource || market.resolution_source || event.resolutionSource || event.resolution_source || '').trim();
  if (direct) return direct;
  const events = Array.isArray(market.events) ? market.events : [];
  for (const item of events) {
    if (!item || typeof item !== 'object') continue;
    const record = item as GammaRecord;
    const value = String(record.resolutionSource || record.resolution_source || '').trim();
    if (value) return value;
  }
  return '';
}

function metadataFinalPrice(primary: GammaRecord, secondary: GammaRecord): number | null {
  const keys = ['finalPrice', 'final_price', 'resolutionPrice', 'resolution_price'];
  const records: GammaRecord[] = [primary, secondary];
  for (const source of [primary, secondary]) {
    const metadata = parseRecord(source.eventMetadata ?? source.event_metadata);
    if (metadata) records.push(metadata);
    const events = Array.isArray(source.events) ? source.events : [];
    for (const item of events) {
      if (!item || typeof item !== 'object') continue;
      const event = item as GammaRecord;
      records.push(event);
      const nested = parseRecord(event.eventMetadata ?? event.event_metadata);
      if (nested) records.push(nested);
    }
  }
  for (const record of records) {
    for (const key of keys) {
      const value = Number(record[key]);
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return null;
}

function parseRecord(value: unknown): GammaRecord | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as GammaRecord;
  const text = String(value ?? '').trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as GammaRecord : null;
  } catch { return null; }
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

async function polymarketOrderId(client: TradingClient, order: SignedOrder): Promise<string> {
  const tokenId = BigInt(String(order.tokenId));
  const protocolV3 = (tokenId & V2_RESERVED_BITS_MASK) === 0n;
  const negRisk = protocolV3 ? false : await fetchNegRisk(client, { assetId: order.tokenId });
  const verifyingContract = protocolV3
    ? polymarketProduction.contracts.exchangeV3
    : negRisk ? polymarketProduction.contracts.negRiskExchange : polymarketProduction.contracts.standardExchange;
  return hashTypedData({
    domain: {
      name: 'Polymarket CTF Exchange',
      version: protocolV3 ? '3' : '2',
      chainId: polymarketProduction.chainId,
      verifyingContract: verifyingContract as Address,
    },
    primaryType: 'Order',
    types: POLYMARKET_ORDER_TYPES,
    message: {
      salt: BigInt(order.salt),
      maker: order.maker as Address,
      signer: order.signer as Address,
      tokenId,
      makerAmount: BigInt(order.makerAmount),
      takerAmount: BigInt(order.takerAmount),
      side: order.side === OrderSide.BUY ? 0 : 1,
      signatureType: Number(order.signatureType),
      timestamp: BigInt(order.timestamp),
      metadata: order.metadata as Hex,
      builder: order.builder as Hex,
    },
  });
}

function roundMoney(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n * 1_000_000) / 1_000_000 : 0;
}

function parsePusdBaseUnits(value: unknown): bigint {
  const text = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,6})?$/.test(text)) throw new Error('مبلغ pUSD نامعتبر است. حداکثر ۶ رقم اعشار وارد کن.');
  const [whole, fraction = ''] = text.split('.');
  const units = BigInt(whole) * PUSD_SCALE_BIGINT + BigInt((fraction + '000000').slice(0, 6));
  if (units <= 0n) throw new Error('مبلغ برداشت باید بیشتر از صفر باشد.');
  return units;
}

function baseUnitsToUsd(value: bigint): number {
  return Number(value) / PUSD_SCALE;
}

function finiteNullable(value: unknown): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function normalizeEvmAddress(value: unknown): string {
  const address = String(value ?? '').trim();
  if (!/^0x[0-9a-f]{40}$/i.test(address)) throw new Error('آدرس مقصد نامعتبر است. یک آدرس EVM معتبر با 0x وارد کن.');
  return address;
}

function normalizeWithdrawalRequestId(value: unknown): string {
  const requestId = String(value || '').trim();
  if (!/^pw_[0-9a-f]{20}$/i.test(requestId)) throw new Error('شناسه برداشت نامعتبر است.');
  return requestId;
}

function withdrawalResultFromRow(row: PolymarketWithdrawalRow): PolymarketWithdrawalResult {
  const isBscUsdt = row.to_chain_id === BSC_CHAIN_ID;
  return {
    requestId: row.request_id,
    amountUsd: baseUnitsToUsd(BigInt(row.amount_base_units)),
    recipientAddress: row.recipient_address,
    destinationChain: isBscUsdt ? 'BNB Smart Chain' : 'Polygon',
    destinationToken: isBscUsdt ? 'USDT' : 'USDC',
    txHash: row.tx_hash || null,
    status: 'completed',
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Polymarket operation failed';
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

function emptyAccountHealth(): PolymarketAccountHealth {
  return { configured: false, walletAddress: null, signerAddress: null, walletType: null, balanceUsd: null, bridgeEvmAddress: null, geoblocked: null, country: null, region: null };
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
