import { MINIAPP_STYLES } from './styles';
import {
  PLINKO_CONTROLS_MODERN_STYLES,
  PLINKO_DROP_FEEDBACK_SCRIPT,
  PLINKO_PANEL_SCRIPT,
  PLINKO_PERFORMANCE_SCRIPT,
  PLINKO_SCRIPT,
  PLINKO_SECTION,
  PLINKO_STYLES,
} from './plinko';
import { MINES_SCRIPT, MINES_SECTION, MINES_STYLES } from './mines';
import { CRASH_SCRIPT, CRASH_SECTION, CRASH_STYLES } from './crash';
import { SLOT_SCRIPT, SLOT_SECTION, SLOT_STYLES } from './slot';
import { DICE_FINAL_TWEAK, DICE_SECTION } from './dice';
import { WHEEL_SECTION } from './wheel';
import { PUMP_SECTION } from './pump';
import { GHOST_RUN_SECTION, GHOST_RUN_STYLES } from './ghost-run';
import { PLAY_ZONE_STYLES } from './play-zone-styles';
import { PLAY_ZONE_SHOWCASE_OVERRIDES } from './play-zone-showcase-overrides';
import { PLAY_ZONE_TOP_BLUR } from './play-zone-top-blur';
import { PLAY_ZONE_ROW_IMAGE_FIX } from './play-zone-row-image-fix';
import { PLAY_ZONE_EDGE_FIX } from './play-zone-edge-fix';
import { BALANCE_OVERRIDES } from './balance-overrides';
import { NAV_GLASS_OVERRIDES } from './nav-glass-overrides';
import { GLASS_COMPONENTS_OVERRIDES } from './glass-components-overrides';
import { APP_BACKGROUND_OVERRIDES } from './app-background-overrides';
import { SECTION_BACKGROUND_SCRIPT, SECTION_BACKGROUND_STYLES } from './section-background-script';
import { GAME_LIVE_COUNT_SCRIPT, GAME_LIVE_COUNT_STYLES } from './game-live-counts';
import { HOME_SCRIPT, HOME_SECTION, HOME_STYLES } from './home';
import { DEPOSIT_ENHANCEMENTS_SCRIPT, WALLET_GLOBAL_STYLES, WALLET_SECTION } from './wallet';
import { RESULTS_SECTION } from './results';
import { PLAY_ZONE_SECTION, PLAY_ZONE_VISIBILITY_SCRIPT } from './play-zone';
import { PREDICT_ZONE_SCRIPT, PREDICT_ZONE_SECTION, PREDICT_ZONE_STYLES } from './predict-zone';
import { MINIAPP_SCRIPT } from './script';
import { TON_BALANCE_SCRIPT } from './ton-balance-script';
import { PLAY_ZONE_STACK_SCROLL_SCRIPT } from './play-zone-stack-scroll-script';
import { BOOT_LOADING_IMAGE_DATA_URI, BOOT_LOADER_SCRIPT, BOOT_LOADER_STYLES } from './boot-loader-script';
import { ACTIVITY_SCRIPT } from './activity-script';
import { MINIAPP_AUDIO_MANAGER_SCRIPT, MINIAPP_AUDIO_SCRIPT } from './audio-script';
import { XP_BAR_EFFECTS_SCRIPT } from './xp-bar-effects-script';
import { TELEGRAM_BACK_BUTTON_SCRIPT } from './telegram-back-button-script';
import { SECTION_ACCESS_SCRIPT } from './section-access-script';
import { SECTION_ACCESS_STYLES } from './section-access-styles';
import { CREDIT_GUARD_SCRIPT } from './credit-guard-script';
import { COUNTRY_TO_VEXA_LOCALE, LOTTERY_HOME_TEXT } from './i18n';

const TON_LOGO_PNG = 'data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2064%2064%27%3E%3Ccircle%20cx=%2732%27%20cy=%2732%27%20r=%2732%27%20fill=%27%230096ff%27/%3E%3Cpath%20d=%27M16%2018h32L32%2048%2016%2018z%27%20fill=%27white%27/%3E%3Cpath%20d=%27M22%2022h20L32%2042%2022%2022z%27%20fill=%27%230096ff%27%20opacity=%27.18%27/%3E%3C/svg%3E';
const GAME_BOT_PROFILE_IMAGE = 'https://t.me/i/userpic/320/' + 'VexaAppBOT' + '.jpg';

const STYLES = [
  MINIAPP_STYLES,
  PLINKO_STYLES,
  MINES_STYLES,
  CRASH_STYLES,
  SLOT_STYLES,
  PLINKO_CONTROLS_MODERN_STYLES,
  PLAY_ZONE_STYLES,
  PREDICT_ZONE_STYLES,
  PLAY_ZONE_SHOWCASE_OVERRIDES,
  PLAY_ZONE_TOP_BLUR,
  PLAY_ZONE_ROW_IMAGE_FIX,
  PLAY_ZONE_EDGE_FIX,
  HOME_STYLES,
  WALLET_GLOBAL_STYLES,
  BALANCE_OVERRIDES,
  NAV_GLASS_OVERRIDES,
  GLASS_COMPONENTS_OVERRIDES,
  APP_BACKGROUND_OVERRIDES,
  BOOT_LOADER_STYLES,
  SECTION_BACKGROUND_STYLES,
  GAME_LIVE_COUNT_STYLES,
  GHOST_RUN_STYLES,
  SECTION_ACCESS_STYLES,
].join('');

function initialSections(): string {
  return [
    HOME_SECTION,
    PLAY_ZONE_SECTION,
    PREDICT_ZONE_SECTION,
    WALLET_SECTION,
  ].join('');
}

const LAZY_SECTIONS: Array<{ id: string; html: string; scripts?: string[] }> = [
  { id: 'results', html: RESULTS_SECTION },
  { id: 'mines', html: MINES_SECTION, scripts: [MINES_SCRIPT] },
  { id: 'plinko', html: PLINKO_SECTION, scripts: [PLINKO_SCRIPT, PLINKO_DROP_FEEDBACK_SCRIPT, PLINKO_PERFORMANCE_SCRIPT, PLINKO_PANEL_SCRIPT] },
  { id: 'crash', html: CRASH_SECTION, scripts: [CRASH_SCRIPT] },
  { id: 'slot', html: SLOT_SECTION, scripts: [SLOT_SCRIPT] },
  { id: 'wheel', html: WHEEL_SECTION, scripts: [] },
  { id: 'dice', html: DICE_SECTION + DICE_FINAL_TWEAK },
  { id: 'coinflip', html: PUMP_SECTION },
  { id: 'ghostrun', html: GHOST_RUN_SECTION },
];

const scriptBody = (script: string): string => script.replace(/^\s*<script[^>]*>/i, '').replace(/<\/script>\s*$/i, '');

function inlineScriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003C')
    .replace(/>/g, '\\u003E')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function lazySectionLoaderScript(): string {
  const payload = inlineScriptJson(LAZY_SECTIONS.map((section) => ({
    id: section.id,
    html: section.html,
    scripts: section.scripts || [],
  })));
  return `
(function(){
  var registry=${payload};
  var mounted={};
  var main=null;
  var gameIds={mines:true,plinko:true,crash:true,slot:true,wheel:true,dice:true,coinflip:true,ghostrun:true,hilo:true};
  function findMain(){return main||(main=document.querySelector('main.app')||document.body)}
  function isGame(id){return !!gameIds[String(id||'')]}
  function canMount(id){
    if(!isGame(id))return true;
    var state=window.VexaPlayZoneVisibility;
    if(!state||!state.ready)return false;
    return typeof state.canOpen==='function'?state.canOpen(id):true;
  }
  function runScript(code){
    if(!code)return;
    var script=document.createElement('script');
    script.text=String(code).replace(/^\\s*<script[^>]*>/i,'').replace(/<\\/script>\\s*$/i,'');
    document.body.appendChild(script);
  }
  function executeEmbeddedScripts(root){
    Array.prototype.slice.call(root.querySelectorAll('script')).forEach(function(oldScript){
      var script=document.createElement('script');
      Array.prototype.slice.call(oldScript.attributes||[]).forEach(function(attr){script.setAttribute(attr.name,attr.value)});
      script.text=oldScript.text||oldScript.textContent||'';
      oldScript.parentNode.replaceChild(script,oldScript);
    });
  }
  function mount(id){
    if(!id||document.getElementById(id))return true;
    if(!canMount(id))return false;
    if(mounted[id])return !!document.getElementById(id);
    var item=registry.filter(function(entry){return entry.id===id})[0];
    if(!item)return false;
    mounted[id]=true;
    var wrap=document.createElement('div');
    wrap.setAttribute('data-lazy-section-host',id);
    wrap.innerHTML=item.html;
    findMain().insertBefore(wrap, document.querySelector('nav.tabs'));
    executeEmbeddedScripts(wrap);
    (item.scripts||[]).forEach(runScript);
    try{window.dispatchEvent(new CustomEvent('vexa:section-mounted',{detail:{id:id}}))}catch(e){}
    return !!document.getElementById(id);
  }
  var preloadJob=null;
  function preload(){
    if(preloadJob)return preloadJob;
    var ready=window.__vexaPlayZoneVisibilityReady;
    preloadJob=Promise.resolve(ready||true).then(function(){return true},function(){return true});
    return preloadJob;
  }
  window.VexaLazySections={ensure:mount,preload:preload,isGame:isGame};
})();`;
}

function scripts(): string {
  return [
    `window.__vexaLotteryTexts=${inlineScriptJson(LOTTERY_HOME_TEXT)};window.__vexaCountryLocales=${inlineScriptJson(COUNTRY_TO_VEXA_LOCALE)};`,
    MINIAPP_AUDIO_MANAGER_SCRIPT,
    BOOT_LOADER_SCRIPT,
    lazySectionLoaderScript(),
    MINIAPP_SCRIPT,
    ACTIVITY_SCRIPT,
    TON_BALANCE_SCRIPT,
    DEPOSIT_ENHANCEMENTS_SCRIPT,
    CREDIT_GUARD_SCRIPT,
    HOME_SCRIPT,
    PREDICT_ZONE_SCRIPT,
    PLAY_ZONE_STACK_SCROLL_SCRIPT,
    PLAY_ZONE_VISIBILITY_SCRIPT,
    GAME_LIVE_COUNT_SCRIPT,
    TELEGRAM_BACK_BUTTON_SCRIPT,
    SECTION_ACCESS_SCRIPT,
    SECTION_BACKGROUND_SCRIPT,
    MINIAPP_AUDIO_SCRIPT,
    XP_BAR_EFFECTS_SCRIPT,
  ].map((script) => `<script>${script}</script>`).join('');
}

export function miniAppShellHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"/>
  <script>
    (function(){
      var launch=String(location.search||'')+'&'+String(location.hash||'');
      if(!/(?:^|[?&#])tgWebApp(?:Data|Version|Platform|ThemeParams)=/.test(launch))document.documentElement.classList.add('vexa-web');
    })();
  </script>
  <meta name="theme-color" content="#12070a"/>
  <script>if(document.documentElement.classList.contains('vexa-web'))document.querySelector('meta[name="theme-color"]').setAttribute('content','#000000');</script>
  <title>Vexa FLOW</title>
  <script src="https://telegram.org/js/telegram-web-app.js"></script>
  <style>${STYLES}
    html.vexa-web .app{padding-top:0!important}
    html.vexa-web,html.vexa-web body{background:#000!important}
    html.vexa-web body:has(#home.active){background:#000!important}
    html.vexa-web .vexa-boot{inset:0!important}
    html.vexa-web .vexa-boot-top-shadow{position:absolute;top:0;left:0;right:0;height:150px;z-index:3;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.98) 0%,rgba(0,0,0,.82) 24%,rgba(0,0,0,.48) 52%,rgba(0,0,0,.16) 76%,rgba(0,0,0,0) 100%)}
    html.vexa-web body:has(#home.active)::before{inset:0!important;width:auto!important;height:auto!important;background-color:transparent!important}
    #rankPill:empty,#userLine:empty{display:none!important}
    .brand .logo[src="${GAME_BOT_PROFILE_IMAGE}"]{visibility:hidden!important}
    .top-balance-pill:has(#topTonBalance:empty),.top-balance-pill:has(.ton-mini-icon img[src^="data:image/"]){visibility:hidden!important}
    .predict-online-badge{display:none;align-items:center;justify-content:center;gap:5px;height:22px;padding:0;background:transparent;border:0;box-shadow:none;color:rgba(255,255,255,.82);font-family:"SF Pro Rounded","SF Pro Text","Inter Variable",Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1;white-space:nowrap;pointer-events:none;transform:translateY(1px)}
    body:has(#predictzone.active) .predict-online-badge{display:inline-flex}
    .predict-online-dot{position:relative;width:6px;height:6px;flex:0 0 6px;border-radius:50%;background:#35d979;box-shadow:0 0 0 1px rgba(53,217,121,.16)}
    .predict-online-dot::after{content:"";position:absolute;inset:-2px;border:1px solid rgba(53,217,121,.36);border-radius:50%;animation:vexaPredictOnlinePulse 1.8s ease-in-out infinite}
    .predict-online-count{min-width:12px;color:rgba(255,255,255,.94);font-size:11px;font-weight:850;letter-spacing:-.025em;font-variant-numeric:tabular-nums}
    .predict-online-label{color:#35d979;font-size:9.5px;font-weight:760;letter-spacing:-.01em;margin-left:-3px}
    @keyframes vexaPredictOnlinePulse{0%,100%{transform:scale(.92);opacity:.18}50%{transform:scale(1.16);opacity:.62}}
    @media(prefers-reduced-motion:reduce){.predict-online-dot::after{animation:none;opacity:.3;transform:none}}
  </style>
</head>
<body>
  <div id="vexaBoot" class="vexa-boot" role="progressbar" aria-label="Loading Vexa Game" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
    <div class="vexa-boot-top-shadow" aria-hidden="true"></div>
    <div class="vexa-boot-card">
      <img id="vexaBootImage" class="vexa-boot-logo" src="${BOOT_LOADING_IMAGE_DATA_URI}" alt="" decoding="async" fetchpriority="high"/>
      <div class="vexa-boot-progress" aria-hidden="true"><span id="vexaBootProgress" class="vexa-boot-progress-bar"></span></div>
    </div>
  </div>
  <main class="app">
    <header class="top">
      <div class="brand">
        <img class="logo" src="${GAME_BOT_PROFILE_IMAGE}" alt="Vexa App"/>
        <div>
          <div style="display:flex;align-items:center;gap:9px;min-width:0">
            <h1 id="brandTitle">Lucky Zone</h1>
            <span class="predict-online-badge" id="predictOnlineBadge" aria-label="Predict online users"><span class="predict-online-dot" aria-hidden="true"></span><b class="predict-online-count" id="predictOnlineCount">—</b><span class="predict-online-label">Online</span></span>
            <div id="rankPill" aria-label="Current rank" style="height:30px;min-width:74px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.055);box-shadow:0 12px 28px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.16);backdrop-filter:blur(4px) saturate(1.15);-webkit-backdrop-filter:blur(4px) saturate(1.15);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:850;letter-spacing:-.025em;pointer-events:none;text-shadow:0 1px 10px rgba(0,0,0,.32);transform:translateY(-1px)"></div>
          </div>
          <p id="userLine"></p>
        </div>
      </div>
      <div class="top-balance-wrap">
        <button class="top-balance-pill" type="button" data-action="open-transactions" aria-label="Open transaction history">
          <span class="ton-mini-icon"><img src="${TON_LOGO_PNG}" alt="" decoding="async"/></span>
          <b id="topTonBalance" data-ton-balance-display></b>
        </button>
        <button class="top-balance-plus" type="button" data-view="wallet" aria-label="Open wallet">+</button>
      </div>
    </header>
    ${initialSections()}
    <nav class="tabs">
      <button class="tab active" data-view="home">Lucky Zone</button>
      <button class="tab" data-view="playzone">Play Hub</button>
      <button class="tab" data-view="predictzone">Predict</button>
    </nav>
  </main>
  <div id="toast" class="toast"></div>
  ${scripts()}
</body>
</html>`;
}