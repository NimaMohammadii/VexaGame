import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const files = {
  agents: read('AGENTS.md'),
  wallet: read('src/miniapp/wallet.ts'),
  shell: read('src/miniapp/shell.ts'),
  script: read('src/miniapp/script.ts'),
  index: read('src/index.ts'),
  playZone: read('src/miniapp/play-zone.ts'),
  boot: read('src/miniapp/boot-loader-script.ts'),
  backgrounds: read('src/miniapp/section-background-script.ts'),
  appServices: read('src/index-app-services.ts'),
  sectionBackgrounds: read('src/section-backgrounds.ts'),
  lotteryPrizes: read('src/lottery-prizes.ts'),
  lotteryHttp: read('src/lottery-http.ts'),
  lotteryAdmin: read('src/telegram-lottery-admin.ts'),
  home: read('src/miniapp/home.ts'),
  ghost: read('src/miniapp/ghost-run/index.ts'),
  slot: read('src/miniapp/slot/script.ts'),
  pump: read('src/miniapp/pump/section.ts'),
  back: read('src/miniapp/telegram-back-button-script.ts'),
  crashBack: read('src/miniapp/crash/scripts/back-button.ts'),
};

const failures = [];
function expect(label, condition) {
  if (!condition) failures.push(label);
}
function has(text, value) {
  return text.includes(value);
}
function between(text, start, end) {
  const from = text.indexOf(start);
  if (from < 0) return '';
  const to = text.indexOf(end, from + start.length);
  return to < 0 ? '' : text.slice(from, to);
}

expect('AGENTS.md must keep the protected runtime architecture section.', has(files.agents, '## Protected Mini App runtime architecture'));
expect('AGENTS.md must keep the protected TON/Gram wallet connection section.', has(files.agents, '## Protected TON/Gram wallet connection flow'));

const tonWalletConnectionBody = between(files.wallet, '  var tonFlowActive=false;', '  function installStyles(){');
expect('TON wallet connection flow must remain in its authoritative wallet implementation.', Boolean(tonWalletConnectionBody));
expect('TON HTTP/Bridge restore must keep a separate live-verification state.', has(tonWalletConnectionBody, 'var tonBridgeSessionVerified=false;'));
expect('TON HTTP/Bridge restore must not be treated as a verified wallet connection.', has(tonWalletConnectionBody, "function verifiedWalletConnection(ui){return !!(usableWalletConnection(ui)&&(!isHttpWalletConnection(ui)||tonBridgeSessionVerified))}"));
expect('TON Bridge trusted restore must use its dedicated persisted proof.', has(tonWalletConnectionBody, "var TON_VERIFIED_SESSION_KEY='vexa:verified-ton-wallet-session';"));
expect('TON Bridge trusted proof must bind session, address, and Telegram user.', has(tonWalletConnectionBody, 'JSON.stringify({sessionId:sessionId,address:String(account.address),userId:userId})'));
expect('TON Bridge restore must require an exact trusted-session match.', has(tonWalletConnectionBody, 'String(saved.sessionId)===sessionId&&String(saved.address)===String(account.address)&&String(saved.userId)===userId'));
expect('TON Bridge verification must be persisted only from a live wallet status event.', has(tonWalletConnectionBody, 'if(wallet&&usableWalletConnection(ui)){rememberVerifiedWalletSession(ui).then(function(){finish(true)})}'));
expect('TON Bridge restore must verify the restored session before returning it.', has(tonWalletConnectionBody, 'return restoreVerifiedWalletSession(ui)'));
expect('TON Bridge stale cleanup must delete its trusted proof.', has(tonWalletConnectionBody, 'async function clearStaleWalletSession(ui){forgetVerifiedWalletSession();'));
expect('TON Bridge disconnect events must delete their trusted proof.', has(tonWalletConnectionBody, 'ui.onStatusChange(function(wallet){if(!wallet)forgetVerifiedWalletSession();'));
expect('TON connection UI must require the verified wallet connection guard.', has(tonWalletConnectionBody, "function syncTonConnectionUi(ui){if(!tonFlowActive)return false;if(!verifiedWalletConnection(ui)){showTonConnectGate(false,'');return false}"));
const connectTonWalletBody = between(tonWalletConnectionBody, 'async function connectTonWallet(){', '  function syncModeUi(){');
expect('TON connect flow must clear an unverified restored HTTP/Bridge session.', has(connectTonWalletBody, "if(isHttpWalletConnection(ui)){setTonConnectButton(true,'Refreshing Session…');await clearStaleWalletSession(ui);"));
expect('TON connect flow must clear the restored Bridge session before opening the wallet modal.', connectTonWalletBody.indexOf('await clearStaleWalletSession(ui)') < connectTonWalletBody.indexOf('await ui.openModal()'));
const confirmTonPaymentBody = between(files.wallet, 'async function confirmTonPayment(){', '  function installStyles(){');
expect('TON payment must reject an unverified wallet before creating a deposit.', has(confirmTonPaymentBody, "if(!restored||!verifiedWalletConnection(ui)){tonFlowActive=true;showTonConnectGate(false,'Connect your wallet to continue')") && confirmTonPaymentBody.indexOf('verifiedWalletConnection(ui)') < confirmTonPaymentBody.indexOf('createDeposit(raw,account)'));
expect('Lazy game mount must fail closed until Play Zone visibility is ready.', has(files.shell, "if(!state||!state.ready)return false;"));
expect('Lazy mount must use the existing Play Zone canOpen gate.', has(files.shell, "return typeof state.canOpen==='function'?state.canOpen(id):true;"));
const preloadBody = between(files.shell, 'function preload(){', 'window.VexaLazySections=');
expect('Lazy preload() must exist.', Boolean(preloadBody));
expect('Lazy preload() must never mount sections or execute game runtime.', !/\bmount\s*\(/.test(preloadBody));
expect('VexaLazySections must keep ensure=mount and preload=preload as separate paths.', has(files.shell, 'window.VexaLazySections={ensure:mount,preload:preload,isGame:isGame};'));
expect('Initial Mini App HTML must not serialize lazy game section payloads.', !has(files.shell, 'var registry=${payload};') && !has(files.shell, 'const payload = inlineScriptJson(LAZY_SECTIONS'));
expect('Lazy game sections must be fetched only from the on-demand endpoint.', has(files.shell, "fetch('/app/api/lazy-section/'+encodeURIComponent(id)"));
expect('Lazy section endpoint must use the allowlisted section registry.', has(files.index, "app.get('/app/api/lazy-section/:id'") && has(files.index, "miniAppLazySection(c.req.param('id'))"));
expect('Navigation must activate lazy sections only after async ensure resolves.', has(files.script, "Promise.resolve(result).then(function(ok){delete openingSections[id];if(ok)activateSection(id)"));
const initialStyleBody = between(files.shell, 'const STYLES = [', "].join('');");
expect('Game-only styles must stay out of the initial Home stylesheet payload.', !/PLINKO_STYLES|MINES_STYLES|CRASH_STYLES|SLOT_STYLES|GHOST_RUN_STYLES/.test(initialStyleBody));

expect('Hidden games must be denied by canOpen without an admin bypass.', /canOpen:function\(id\)\{[^}]*!state\.isHidden\(id\)/.test(files.playZone));
expect('Hidden games must be denied by shouldPreload without an admin bypass.', /shouldPreload:function\(id\)\{[^}]*!state\.isHidden\(id\)/.test(files.playZone));
expect('canOpen must not contain an admin bypass.', !/canOpen:function\(id\)\{[^}]*state\.admin/.test(files.playZone));
expect('shouldPreload must not contain an admin bypass.', !/shouldPreload:function\(id\)\{[^}]*state\.admin/.test(files.playZone));
expect('Visibility failures must fail closed by hiding all game ids.', has(files.playZone, 'function fallbackHidden(){return Object.keys(gameIds)}'));
expect('A failed visibility request must remain retryable in the same session.', !/\.catch\(function\(\)\{loaded=true/.test(files.playZone));
expect('Play Hub card images must only load after visibility is ready and the card is visible.', has(files.playZone, "function shouldLoad(id){var state=visibility();return !!(state&&state.ready&&!state.isHidden(id))}"));

expect('Boot asset loading must wait for Play Zone visibility readiness.', has(files.boot, 'Promise.resolve(window.__vexaPlayZoneVisibilityReady||false)'));
expect('Per-game boot manifests must be gated by shouldPreloadGame.', has(files.boot, 'if(spec.game&&!shouldPreloadGame(spec.game))return Promise.resolve(true);'));
expect('Section background URLs in boot preload must be visibility-gated.', has(files.boot, 'if(url&&shouldPreloadGame(id))out.push(url)'));
expect('Runtime section backgrounds must use the Play Zone preload gate.', has(files.backgrounds, 'state.shouldPreload(id)'));
expect('Runtime section backgrounds must stop when visibility denies the section.', has(files.backgrounds, 'if(!visibilityAllowsSection(id))return false;'));
expect('Generic section backgrounds must not advertise Home.', !has(files.appServices, "{ id: 'home', label: 'Home', description: 'Home section background' }"));
expect('Generic section backgrounds must reject Home and home-* paths.', has(files.sectionBackgrounds, "if (/^home(?:-|$)/.test(cleaned)) throw new Error('Home does not use generic section backgrounds');"));

expect('Lottery must have exactly three winners.', has(files.lotteryPrizes, 'export const LOTTERY_WINNER_COUNT = 3;'));
expect('Lottery prize configuration must be percentage-based.', has(files.lotteryPrizes, 'const PRIZE_PERCENT_TOTAL_BPS = 10_000;') && has(files.lotteryPrizes, 'setLotteryPrizePercentages'));
expect('Lottery percentages must allocate the entire Prize Pool.', has(files.lotteryPrizes, 'let remainder = pool - amounts.reduce((sum, amount) => sum + amount, 0);'));
expect('Lottery APIs must expose the authoritative three-winner count.', has(files.lotteryHttp, 'winnerCount: LOTTERY_WINNER_COUNT'));
expect('Lottery admin must remove fixed per-rank prize inputs.', !has(files.lotteryAdmin, 'setLotteryPrize(') && has(files.lotteryAdmin, 'parsePrizePercentages'));
expect('Home must render no more than three lottery winner cards.', has(files.home, 'Math.min(3,Math.floor(Number(state&&state.winnerCount)||0))') && has(files.home, 'Math.min(3,count)'));
expect('Home winner cards must fill the three-row frame.', has(files.home, 'grid-template-rows:repeat(3,minmax(0,1fr))!important'));

expect('Ghost Run runtime must require an active visible section.', has(files.ghost, "function isActive(){return !!(root&&root.classList.contains('active')&&!document.hidden)}"));
expect('Ghost Run reconnects must stop while inactive.', has(files.ghost, 'function scheduleReconnect(){if(!isActive()'));
expect('Ghost Run must expose a stopRuntime lifecycle.', has(files.ghost, 'function stopRuntime(){clearReconnect();'));
expect('Ghost Run RAF must immediately stop while inactive.', has(files.ghost, 'function tick(){raf=0;if(!isActive())return;'));
expect('Ghost Run must resync on view changes.', has(files.ghost, "window.addEventListener('vexa:view-changed',syncRuntime);"));
expect('Ghost Run must not restore the old eager startup runtime chain.', !/loadAssets\(\);renderHistory\(\);connect\(\)/.test(files.ghost));

expect('Slot runtime must be gated by active section and document visibility.', has(files.slot, "function slotActive(){var root=q('slot');return !!(root&&root.classList.contains('active')&&!document.hidden)}"));
expect('Slot reel RAF must stop when Slot is inactive.', has(files.slot, 'if(!slotActive()){finishVirtualReel();return}'));
expect('Slot background live/sound/effect work must stop when inactive.', has(files.slot, 'stopSlotSound();clearWinEffect()'));
expect('Slot observer must be scoped to #slot.', has(files.slot, "new MutationObserver(smartSlotLiveSync).observe(slotRoot,{attributes:true,attributeFilter:['class']})"));
expect('Slot must never restore a body-wide MutationObserver.', !/observe\(document\.body/.test(files.slot));

expect('Pump WebGL runtime must require an active visible section.', has(files.pump, "function active(){return !document.hidden&&root.classList.contains('active')&&document.body.contains(canvas);}"));
expect('Pump render loop must stop while inactive.', has(files.pump, 'if(!active())return;'));
expect('Pump RAF lifecycle must react to view changes.', has(files.pump, "window.addEventListener('vexa:view-changed',syncLoop);"));
expect('Pump RAF lifecycle must react to document visibility.', has(files.pump, "document.addEventListener('visibilitychange',syncLoop);"));

expect('Telegram Back Button must use the existing Play Hub navigation path.', has(files.back, 'button[data-view="playzone"]'));
expect('Telegram Back Button must observe views, not the whole body.', !/observe\(document\.body/.test(files.back));
expect('Telegram Back Button must have only the primary BackButton click path.', !/backButtonClicked/.test(files.back));
expect('Crash must not restore a second Back Button controller.', /^export const CRASH_BACK_BUTTON_SCRIPT = ''\s*;?\s*$/.test(files.crashBack.trim()));

if (failures.length) {
  console.error('\nMini App runtime architecture guard FAILED:\n');
  failures.forEach((failure, index) => console.error(`${index + 1}. ${failure}`));
  console.error('\nDo not weaken or delete this guard to make a change pass. Fix the architecture or obtain an explicit user request to change the protected invariant.\n');
  process.exit(1);
}

console.log('Mini App runtime architecture guard passed.');
