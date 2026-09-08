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
import { BOOT_LOADING_IMAGE_DATA_URI, BOOT_LOADER_STYLES } from './boot-loader-script';
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

function bootLoaderScript(): string {
  return `
(function(){
  var ASSET_STATE_KEY='vexa:boot-assets:v3';
  var FIRST_WARMUP_TIMEOUT_MS=12000;
  var HOME_READY_TIMEOUT_MS=6000;
  var FETCH_TIMEOUT_MS=5500;
  var ASSET_TIMEOUT_MS=12000;
  var GAME_IDS=['mines','plinko','wheel','slot','ghostrun','crash','dice','hilo','coinflip'];
  var STATIC_COMMON=['/assets/Home.PNG?v=1','/assets/Playhub.PNG?v=1'];
  var STATIC_BY_GAME={
    mines:['/assets/Mines.PNG?v=1'],
    plinko:['/assets/Plinko.PNG?v=1','/assets/plinko-glass/ball.webp?v=1','/assets/plinko-glass/peg.webp?v=1','/assets/plinko-glass/point-amount-card.webp?v=1','/assets/plinko-glass/houses.webp?v=1','/assets/plinko-glass/risk-easy.webp?v=1','/assets/plinko-glass/risk-medium.webp?v=1','/assets/plinko-glass/risk-hard.webp?v=1','/assets/plinko-glass/control-primary.webp?v=1'],
    crash:['/assets/Crash.PNG?v=60f79b66'],
    slot:['/assets/Slotbackground.PNG?v=1'],
    wheel:['/assets/Wheel.PNG?v=1'],
    dice:['/assets/Dice.PNG?v=1']
  };
  var bootHidden=false;
  var bootProgress=0;
  var assetJobs={};
  var state=readState();
  function readState(){
    try{
      var parsed=JSON.parse(localStorage.getItem(ASSET_STATE_KEY)||'null');
      if(parsed&&parsed.version===3&&parsed.warmed&&typeof parsed.warmed==='object')return parsed;
    }catch(e){}
    return {version:3,initialized:false,warmed:{}};
  }
  function saveState(){
    try{
      var keys=Object.keys(state.warmed||{});
      if(keys.length>512){var keep={};keys.slice(keys.length-512).forEach(function(key){keep[key]=1});state.warmed=keep}
      localStorage.setItem(ASSET_STATE_KEY,JSON.stringify(state));
    }catch(e){}
  }
  function bootNode(){return document.getElementById('vexaBoot')}
  function bootImage(){return document.getElementById('vexaBootImage')}
  function bootProgressNode(){return document.getElementById('vexaBootProgress')}
  function setBootProgress(value){
    var next=Math.max(0,Math.min(100,Number(value)||0));
    if(next<bootProgress)return;
    bootProgress=next;
    var bar=bootProgressNode();if(bar)bar.style.width=next+'%';
    var root=bootNode();if(root)root.setAttribute('aria-valuenow',String(Math.round(next)));
  }
  function advance(weight){setBootProgress(bootProgress+(Number(weight)||0))}
  function bootAudioManager(){var manager=window.VexaAudio;return manager&&typeof manager.playCached==='function'&&typeof manager.refresh==='function'&&typeof manager.stop==='function'?manager:null}
  function stopBootAudio(){var manager=bootAudioManager();if(manager)try{manager.stop('loading')}catch(e){}}
  function hide(){
    if(bootHidden)return;
    bootHidden=true;setBootProgress(100);stopBootAudio();
    var boot=bootNode();if(boot){boot.classList.add('hide');setTimeout(function(){if(boot&&boot.parentNode)boot.parentNode.removeChild(boot)},520)}
  }
  function settle(promise,ms,fallback){
    return new Promise(function(resolve){
      var done=false,timer=setTimeout(function(){finish(fallback)},ms);
      function finish(value){if(done)return;done=true;clearTimeout(timer);resolve(value)}
      Promise.resolve(promise).then(finish,function(){finish(fallback)})
    })
  }
  function timedFetch(url,opt,ms){
    if(typeof AbortController==='undefined')return fetch(url,opt);
    var controller=new AbortController();
    var timer=setTimeout(function(){try{controller.abort()}catch(e){}},ms);
    return fetch(url,Object.assign({},opt||{},{signal:controller.signal})).finally(function(){clearTimeout(timer)})
  }
  function observeUntil(check,ms){
    return new Promise(function(resolve){
      var done=false,timer=setTimeout(function(){finish(false)},ms);
      function finish(value){if(done)return;done=true;clearTimeout(timer);clearInterval(interval);resolve(value)}
      function test(){var value=false;try{value=check()}catch(e){}if(value)finish(value)}
      var interval=setInterval(test,60);test()
    })
  }
  function prepareBootImage(){
    var img=bootImage();if(!img)return Promise.resolve(false);
    function ready(){if(img.naturalWidth>0){img.classList.add('is-ready');return true}return false}
    if(img.complete)return Promise.resolve(ready());
    return settle(new Promise(function(resolve){img.addEventListener('load',function(){resolve(ready())},{once:true});img.addEventListener('error',function(){resolve(false)},{once:true})}),1800,false)
  }
  function prepareBootAudio(){
    var manager=bootAudioManager();if(!manager)return Promise.resolve(false);
    var options={loop:true,gain:true,retryOnGesture:true,restart:false};
    try{manager.playCached('loading',options)}catch(e){}
    try{return Promise.resolve(manager.refresh('loading')).then(function(audio){return !!audio},function(){return false})}catch(e){return Promise.resolve(false)}
  }
  function localAsset(value){
    var raw=String(value||'').trim();
    if(!raw||raw==='none'||raw.indexOf('data:')===0||raw.indexOf('blob:')===0)return '';
    try{var url=new URL(raw,window.location.href);if(url.origin!==window.location.origin)return '';return url.pathname+url.search}catch(e){return ''}
  }
  function warmUrl(value){
    var url=localAsset(value);if(!url||state.warmed[url])return Promise.resolve(true);
    if(assetJobs[url])return assetJobs[url];
    assetJobs[url]=timedFetch(url,{cache:'force-cache',credentials:'same-origin'},ASSET_TIMEOUT_MS)
      .then(function(response){if(!response.ok)throw new Error('asset '+response.status);return response.blob()})
      .then(function(){state.warmed[url]=1;saveState();return true},function(){return false})
      .finally(function(){delete assetJobs[url]});
    return assetJobs[url]
  }
  function warmUrls(values){
    var seen={},pending=[];
    (Array.isArray(values)?values:[]).forEach(function(value){var url=localAsset(value);if(!url||seen[url]||state.warmed[url])return;seen[url]=true;pending.push(url)});
    if(!pending.length)return Promise.resolve(true);
    var cursor=0,allOk=true;
    function worker(){if(cursor>=pending.length)return Promise.resolve();var url=pending[cursor++];return warmUrl(url).then(function(ok){if(!ok)allOk=false;return worker()})}
    var workers=[];for(var i=0;i<Math.min(4,pending.length);i++)workers.push(worker());
    return Promise.all(workers).then(function(){return allOk})
  }
  function fetchJson(url){
    return timedFetch(url,{cache:'no-store',credentials:'same-origin'},FETCH_TIMEOUT_MS).then(function(response){if(!response.ok)throw new Error('manifest '+response.status);return response.json()}).catch(function(){return null})
  }
  function visibleGames(){
    var visibility=window.VexaPlayZoneVisibility;
    return GAME_IDS.filter(function(id){return !!(visibility&&visibility.ready&&typeof visibility.isHidden==='function'&&!visibility.isHidden(id))})
  }
  function waitForVisibility(){
    return settle(Promise.resolve(window.__vexaPlayZoneVisibilityReady||false),6000,false).then(function(){return visibleGames()})
  }
  function documentImageUrls(){
    var urls=[];
    try{Array.prototype.forEach.call(document.querySelectorAll('img[src]'),function(img){urls.push(img.currentSrc||img.getAttribute('src')||'')})}catch(e){}
    try{Array.prototype.forEach.call(document.querySelectorAll('link[rel="preload"][as="image"][href]'),function(link){urls.push(link.getAttribute('href')||'')})}catch(e){}
    return urls
  }
  function sectionAllowed(id,visible){
    id=String(id||'');
    if(id==='playzone'||id==='predict')return true;
    return visible.indexOf(id)>=0
  }
  function manifestUrls(visible){
    var urls=[];
    function add(value){if(Array.isArray(value))value.forEach(add);else if(value)urls.push(value)}
    var jobs=[];
    jobs.push(fetchJson('/app/api/uploaded-images?context=startup').then(function(j){if(j)add(j.preload)}));
    jobs.push(fetchJson('/app/api/section-backgrounds').then(function(j){if(!j||!Array.isArray(j.sections))return;j.sections.forEach(function(section){if(section&&section.backgroundUrl&&sectionAllowed(section.id,visible))add(section.backgroundUrl)})}));
    jobs.push(fetchJson('/app/api/game-card-images').then(function(j){if(!j||!j.images)return;visible.forEach(function(id){add(j.images[id])})}));
    if(visible.indexOf('mines')>=0)jobs.push(fetchJson('/app/api/uploaded-images?context=mines').then(function(j){if(j)add(j.preload)}));
    if(visible.indexOf('plinko')>=0)jobs.push(fetchJson('/app/api/uploaded-images?context=plinko').then(function(j){if(j)add(j.preload)}));
    if(visible.indexOf('ghostrun')>=0)jobs.push(fetchJson('/app/api/ghost-run-assets').then(function(j){if(j&&j.urls)add(Object.keys(j.urls).map(function(key){return j.urls[key]}))}));
    if(visible.indexOf('slot')>=0){
      jobs.push(fetchJson('/app/api/slot-frame').then(function(j){if(j)add(j.slotFrameUrl)}));
      jobs.push(fetchJson('/app/api/slot-symbols').then(function(j){if(j&&Array.isArray(j.symbols))add(j.symbols.map(function(item){return item&&item.imageUrl}))}));
      jobs.push(fetchJson('/app/api/slot-controls').then(function(j){if(j&&Array.isArray(j.controls))add(j.controls.map(function(item){return item&&item.imageUrl}))}));
    }
    if(visible.indexOf('crash')>=0)jobs.push(fetchJson('/app/api/crash-stage-images').then(function(j){if(j)add(j.preload)}));
    return Promise.all(jobs).then(function(){return urls})
  }
  function initialAssetUrls(visible,extra){
    var urls=STATIC_COMMON.concat(documentImageUrls(),Array.isArray(extra)?extra:[]);
    visible.forEach(function(id){if(STATIC_BY_GAME[id])urls=urls.concat(STATIC_BY_GAME[id])});
    return urls
  }
  function warmVisibleAssets(){
    return waitForVisibility().then(function(visible){
      return manifestUrls(visible).then(function(extra){return warmUrls(initialAssetUrls(visible,extra))})
    })
  }
  function homeDataReady(){
    var hydrated=window.__vexaHomeHydrated===true?Promise.resolve(true):new Promise(function(resolve){window.addEventListener('vexa:home-hydrated',function(){resolve(true)},{once:true})});
    return settle(hydrated,HOME_READY_TIMEOUT_MS,false).then(function(){
      return settle(observeUntil(function(){var balance=document.getElementById('topTonBalance');return !!(balance&&String(balance.textContent||'').trim())},2500),2800,false)
    })
  }
  function backgroundSync(){
    warmVisibleAssets().catch(function(){})
  }
  function reveal(){
    if(window.__vexaInitialUiReadyStarted)return;
    window.__vexaInitialUiReadyStarted=true;
    prepareBootImage().then(function(){advance(8)});
    prepareBootAudio();
    var first=!state.initialized;
    var home=homeDataReady().then(function(value){advance(first?30:72);return value});
    var assets;
    if(first){
      assets=settle(warmVisibleAssets(),FIRST_WARMUP_TIMEOUT_MS,false).then(function(value){state.initialized=true;saveState();advance(60);return value})
    }else{
      advance(20);
      assets=Promise.resolve(true)
    }
    window.__vexaInitialUiReady=Promise.all([home,assets]).then(function(){
      return new Promise(function(resolve){requestAnimationFrame(function(){setBootProgress(100);requestAnimationFrame(function(){hide();try{window.dispatchEvent(new CustomEvent('vexa:home-ready'))}catch(e){}setTimeout(backgroundSync,0);resolve(true)})})})
    })
  }
  setBootProgress(0);
  window.addEventListener('pagehide',stopBootAudio,{once:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',reveal,{once:true});else reveal();
})();`;
}

function scripts(): string {
  return [
    `window.__vexaLotteryTexts=${inlineScriptJson(LOTTERY_HOME_TEXT)};window.__vexaCountryLocales=${inlineScriptJson(COUNTRY_TO_VEXA_LOCALE)};`,
    MINIAPP_AUDIO_MANAGER_SCRIPT,
    bootLoaderScript(),
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
