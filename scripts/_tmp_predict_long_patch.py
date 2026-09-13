from pathlib import Path

# Shared realtime transport: accept the canonical long Bitcoin round ids that
# the server already accepts.
p = Path('src/miniapp/section-access-script.ts')
s = p.read_text()
old = r"""function cleanPredictRoundSync(detail){var market=String(detail&&detail.market||'').toLowerCase(),roundId=String(detail&&detail.roundId||'').trim();if(market!=='bitcoin'&&market!=='gold'&&market!=='oil')return null;if(!(new RegExp('^pr_'+market+'_\\\\d+$')).test(roundId))return null;return{market:market,roundId:roundId}}"""
new = r"""function cleanPredictRoundSync(detail){var market=String(detail&&detail.market||'').toLowerCase(),roundId=String(detail&&detail.roundId||'').trim(),suffix=market==='bitcoin'?'(?:(?:15m|1h)_)?':'';if(market!=='bitcoin'&&market!=='gold'&&market!=='oil')return null;if(!(new RegExp('^pr_'+market+'_'+suffix+'\\\\d+$')).test(roundId))return null;return{market:market,roundId:roundId}}"""
if s.count(old) != 1:
    raise SystemExit(f'section-access target count={s.count(old)}')
p.write_text(s.replace(old, new, 1))

# Hidden Home preparation is intentionally allowed by canLoadPredict(); its
# round retry path must use the same eligibility instead of requiring visible UI.
p = Path('src/miniapp/predict-zone.ts')
s = p.read_text()
replacements = [
    ("if(my!==seq||id!==market||eventMode||!isActive())return;\n      var wait=", "if(my!==seq||id!==market||eventMode||!canLoadPredict())return;\n      var wait="),
    ("if(!roundSyncAwaitingFeed||roundSyncPending||Date.now()<roundRetryAt||my!==seq||id!==market||eventMode||!isActive())return;", "if(!roundSyncAwaitingFeed||roundSyncPending||Date.now()<roundRetryAt||my!==seq||id!==market||eventMode||!canLoadPredict())return;"),
    ("if(roundSyncPending||my!==seq||id!==market||eventMode||!isActive()||Date.now()<roundRetryAt)return;", "if(roundSyncPending||my!==seq||id!==market||eventMode||!canLoadPredict()||Date.now()<roundRetryAt)return;"),
]
for old, new in replacements:
    if s.count(old) != 1:
        raise SystemExit(f'predict-zone target count={s.count(old)} for {old[:70]}')
    s = s.replace(old, new, 1)
p.write_text(s)

# Server: keep all long-round preparation on one helper using the existing
# getOrCreateCurrentRound source of truth. A long timeframe Starting error must
# never escape as the response to a 5m request.
p = Path('src/predict-routes.ts')
s = p.read_text()
old = """    if (market === 'bitcoin' && timeframe === '5m') {
      // Home prepares the default Bitcoin round before Predict opens. Use that
      // same existing bootstrap path for the longer rounds. Home preparation
      // waits for it; normal 5m requests keep the warm-up in the background.
      const warmLongTimeframes = Promise.all((['15m', '1h'] as BitcoinTimeframe[]).map((warmTimeframe) =>
        getOrCreateCurrentRound(c.env, 'bitcoin', 0, warmTimeframe),
      )).then(() => undefined);
      if (c.req.query('prepare') === '1') await warmLongTimeframes;
      else c.executionCtx.waitUntil(warmLongTimeframes.catch(() => undefined));
    }
"""
new = """    if (market === 'bitcoin' && timeframe === '5m') {
      // Home preparation waits for the same authoritative long-round bootstrap.
      // Normal requests only warm it in the background.
      const prepareLongTimeframes = c.req.query('prepare') === '1';
      const warmLongTimeframes = warmCurrentBitcoinLongTimeframes(c.env, prepareLongTimeframes);
      if (prepareLongTimeframes) await warmLongTimeframes;
      else c.executionCtx.waitUntil(warmLongTimeframes.catch(() => undefined));
    }
"""
if s.count(old) != 1:
    raise SystemExit(f'predict route warm target count={s.count(old)}')
s = s.replace(old, new, 1)

marker = "export async function runPredictScheduledSettlement(env: Env): Promise<void> {\n"
helper = """async function warmCurrentBitcoinLongTimeframes(env: Env, waitForReady: boolean): Promise<void> {
  const deadline = waitForReady ? Date.now() + 10_000 : 0;
  const warmOne = async (timeframe: BitcoinTimeframe): Promise<void> => {
    for (;;) {
      try {
        await getOrCreateCurrentRound(env, 'bitcoin', 0, timeframe);
        return;
      } catch (error) {
        if (!(error instanceof PredictRoundStartingError)) throw error;
        if (!waitForReady) return;
        const remaining = deadline - Date.now();
        if (remaining <= 300) throw new Error(`Bitcoin ${timeframe} round preparation timed out`);
        const delay = Math.min(remaining - 100, Math.max(250, Math.min(2_000, error.retryAfterMs)));
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }
    }
  };
  const results = await Promise.allSettled((['15m', '1h'] as BitcoinTimeframe[]).map(warmOne));
  for (const result of results) if (result.status === 'rejected') throw result.reason;
}

"""
if s.count(marker) != 1:
    raise SystemExit(f'scheduled marker count={s.count(marker)}')
s = s.replace(marker, helper + marker, 1)

old_sched = """export async function runPredictScheduledSettlement(env: Env): Promise<void> {
  let firstError: unknown = null;
  try {
    await reconcilePendingPolymarketBets(env);
"""
new_sched = """export async function runPredictScheduledSettlement(env: Env): Promise<void> {
  let firstError: unknown = null;
  try {
    await warmCurrentBitcoinLongTimeframes(env, false);
  } catch (error) {
    firstError = error;
    console.error('Scheduled Bitcoin long-timeframe preparation failed', messageOf(error));
  }
  try {
    await reconcilePendingPolymarketBets(env);
"""
if s.count(old_sched) != 1:
    raise SystemExit(f'scheduled body target count={s.count(old_sched)}')
s = s.replace(old_sched, new_sched, 1)
p.write_text(s)
