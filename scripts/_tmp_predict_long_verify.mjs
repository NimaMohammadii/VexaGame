import fs from 'node:fs';
import ts from 'typescript';

function compile(file, out) {
  const source = fs.readFileSync(file, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    reportDiagnostics: true,
    fileName: file,
  });
  const errors = (compiled.diagnostics || []).filter((x) => x.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(errors.map((x) => ts.flattenDiagnosticMessageText(x.messageText, '\n')).join('\n'));
  fs.writeFileSync(out, compiled.outputText);
  return source;
}

const sectionSource = compile('src/miniapp/section-access-script.ts', 'src/__tmp-section-access.mjs');
const section = await import(new URL('../src/__tmp-section-access.mjs', import.meta.url));
new Function(section.SECTION_ACCESS_SCRIPT);
const start = section.SECTION_ACCESS_SCRIPT.indexOf('function cleanPredictRoundSync(detail)');
const end = section.SECTION_ACCESS_SCRIPT.indexOf('\n  function requestPredictRoundSync', start);
if (start < 0 || end < 0) throw new Error('cleanPredictRoundSync runtime function not found');
const clean = new Function('return (' + section.SECTION_ACCESS_SCRIPT.slice(start, end) + ')')();
for (const id of ['pr_bitcoin_1789326000000', 'pr_bitcoin_15m_1789326000000', 'pr_bitcoin_1h_1789326000000']) {
  if (!clean({ market: 'bitcoin', roundId: id })) throw new Error('realtime rejected ' + id);
}
for (const [market, id] of [['bitcoin', 'pr_bitcoin_30m_1789326000000'], ['bitcoin', 'pr_bitcoin_15m_bad'], ['gold', 'pr_gold_15m_123']]) {
  if (clean({ market, roundId: id })) throw new Error('realtime accepted invalid ' + id);
}
fs.unlinkSync('src/__tmp-section-access.mjs');

const predictSource = compile('src/miniapp/predict-zone.ts', 'src/__tmp-predict-zone.mjs');
const predict = await import(new URL('../src/__tmp-predict-zone.mjs', import.meta.url));
new Function(predict.PREDICT_ZONE_SCRIPT);
if (!predictSource.includes('function scheduleRoundRetry(delay,my,id){\n      if(my!==seq||id!==market||eventMode||!canLoadPredict())return;')) throw new Error('scheduleRoundRetry still blocks hidden Home preparation');
if (!predictSource.includes('eventMode||!canLoadPredict())return;\n      syncNextRound(my,id)')) throw new Error('resumeRoundSync still blocks hidden Home preparation');
if (!predictSource.includes('eventMode||!canLoadPredict()||Date.now()<roundRetryAt)return;')) throw new Error('syncNextRound still blocks hidden Home preparation');
fs.unlinkSync('src/__tmp-predict-zone.mjs');

const routeSource = compile('src/predict-routes.ts', 'src/__tmp-predict-routes.mjs');
if (!routeSource.includes('warmCurrentBitcoinLongTimeframes(c.env, prepareLongTimeframes)')) throw new Error('route does not use canonical long-round helper');
if (!routeSource.includes('warmCurrentBitcoinLongTimeframes(env, false)')) throw new Error('scheduled recovery missing');
if (!routeSource.includes('Bitcoin ${timeframe} round preparation timed out')) throw new Error('long preparation timeout isolation missing');
if (routeSource.includes("Promise.all((['15m', '1h'] as BitcoinTimeframe[]).map((warmTimeframe) =>")) throw new Error('legacy direct long-round Promise.all still present in route');
fs.unlinkSync('src/__tmp-predict-routes.mjs');

const polySource = fs.readFileSync('src/predict-polymarket.ts', 'utf8');
const polyCompiled = ts.transpileModule(polySource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler },
}).outputText;
fs.writeFileSync('src/__tmp-poly.mjs', polyCompiled);
const poly = await import(new URL('../src/__tmp-poly.mjs', import.meta.url));
const durations = { '15m': 900000, '1h': 3600000 };
for (const tf of ['15m', '1h']) {
  const roundStart = Math.floor(Date.now() / durations[tf]) * durations[tf];
  const market = await poly.loadPolymarketBitcoinMarket(roundStart, tf);
  if (!(Number(market.startPrice) > 0) || !market.upTokenId || !market.downTokenId || !market.rtdsTopic) throw new Error(tf + ' live loader incomplete');
  console.log('LOADER_OK', tf, market.slug, market.startPrice, market.rtdsTopic);
}
fs.unlinkSync('src/__tmp-poly.mjs');
console.log('TARGETED_RUNTIME_OK');
