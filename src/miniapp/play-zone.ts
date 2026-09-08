import { livePlayersSeed, shouldShowLivePlayersOnCard } from './game-live-counts';
import { CRASH_ROCKET_MODEL_URL } from './crash';

const playZoneGames = [
  ['mines', 'Mines', 'Reveal safe tiles and cash out', 'Play'],
  ['plinko', 'Plinko', 'Drop the ball and catch a multiplier', 'Play'],
  ['wheel', 'Wheel', 'Spin the wheel and hit a prize', 'Play'],
  ['slot', 'Slot', 'Spin the reels and chase a winning combo', 'Play'],
  ['ghostrun', 'Ghost Run', 'Run through the dark and survive', 'Play'],
  ['crash', 'Crash', 'Cash out before the line crashes', 'Play'],
  ['dice', 'Dice', 'Roll the dice and beat the target', 'Play'],
  ['hilo', 'Chicken Cross', 'Cross the road and collect rewards', 'Play'],
  ['coinflip', 'Pump', 'Pump the multiplier before it pops', 'Play'],
] as const;

const EMPTY_CARD_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';

function liveCardImageUrl(id: string): string {
  return `/app/api/game-card-image/${id}.png?live=2`;
}

function gameCard([id, label, _description, action]: typeof playZoneGames[number], extraClass = ''): string {
  const fallback = liveCardImageUrl(id);
  const viewAttr = action === 'Play' ? `data-game-view="${id}"` : '';
  const footer = shouldShowLivePlayersOnCard(id) ? `<span class="game-footer game-footer-live"><span class="game-players" aria-label="Players online"><i></i><b>${livePlayersSeed(id)}</b><em>players</em></span></span>` : '';
  const countAttr = shouldShowLivePlayersOnCard(id) ? 'data-player-count-visible="true"' : 'data-player-count-visible="false"';

  return `
    <span class="game-card-shell ${extraClass}" data-play-zone-card-id="${id}" ${viewAttr} ${countAttr} hidden aria-hidden="true">
      <button class="game-card game-card-live" type="button" ${viewAttr} aria-label="${label}">
        <span class="game-image">
          <img src="${EMPTY_CARD_IMAGE}" data-section-image-src="${fallback}" data-fallback-src="${fallback}" alt="${label}" decoding="async" loading="eager" onerror="this.onerror=null;this.src=this.dataset.fallbackSrc||this.src"/>
        </span>
      </button>
      ${footer}
    </span>
  `;
}

const PLAY_ZONE_IMAGE_VERSION_SCRIPT = `
(function(){
  var KEY='vexa:game-card-images:v1';
  var CRASH_ROCKET_URL=${JSON.stringify(CRASH_ROCKET_MODEL_URL)};
  var hasCached=false,started=false,readyResolve=null,crashRocketWarmed=false;
  function timedFetch(url,opt,ms){
    if(typeof AbortController==='undefined')return fetch(url,opt);
    var controller=new AbortController();
    var timer=setTimeout(function(){try{controller.abort()}catch(e){}},ms);
    var options=Object.assign({},opt||{},{signal:controller.signal});
    return fetch(url,options).finally(function(){clearTimeout(timer)})
  }
  function visibility(){return window.VexaPlayZoneVisibility||null}
  function shouldLoad(id){var state=visibility();return !!(state&&state.ready&&!state.isHidden(id))}
  function warmCrashRocket(){if(crashRocketWarmed||!shouldLoad('crash'))return;crashRocketWarmed=true;fetch(CRASH_ROCKET_URL,{cache:'force-cache',credentials:'same-origin'}).catch(function(){})}
  function apply(images){
    if(!images||typeof images!=='object')return false;
    var applied=false;
    document.querySelectorAll('#playzone [data-play-zone-card-id]').forEach(function(card){
      var id=String(card.getAttribute('data-play-zone-card-id')||'');
      if(!shouldLoad(id))return;
      var url=String(images[id]||'');
      var img=card.querySelector('.game-image img');
      if(!img||!url)return;
      if(img.getAttribute('src')!==url)img.src=url;
      img.setAttribute('data-section-image-src',url);
      applied=true;
    });
    return applied;
  }
  function fallback(){
    document.querySelectorAll('#playzone [data-play-zone-card-id]').forEach(function(card){
      var id=String(card.getAttribute('data-play-zone-card-id')||'');
      if(!shouldLoad(id))return;
      var img=card.querySelector('.game-image img');
      var url=img&&img.getAttribute('data-fallback-src')||'';
      if(img&&url&&img.getAttribute('src')!==url)img.src=url;
    });
  }
  function applyCached(){
    try{
      var cached=JSON.parse(localStorage.getItem(KEY)||'null');
      hasCached=!!(cached&&cached.images&&apply(cached.images));
    }catch(e){}
  }
  function refresh(){
    if(!started)return Promise.resolve(false);
    return timedFetch('/app/api/game-card-images',{cache:'no-store',credentials:'same-origin'},5500)
      .then(function(r){if(!r.ok)throw new Error('game card manifest failed');return r.json()})
      .then(function(j){
        if(!j||!j.images)throw new Error('game card manifest missing');
        apply(j.images);
        try{localStorage.setItem(KEY,JSON.stringify({images:j.images,updatedAt:Date.now()}))}catch(e){}
        return true;
      })
      .catch(function(){if(!hasCached)fallback();return false});
  }
  function start(){
    if(started){refresh();return}
    started=true;
    applyCached();
    refresh().then(function(value){if(readyResolve){readyResolve(value);readyResolve=null}});
  }
  window.VexaRefreshPlayZoneImages=refresh;
  window.__vexaPlayZoneImagesReady=new Promise(function(resolve){readyResolve=resolve});
  window.addEventListener('vexa:home-ready',warmCrashRocket,{once:true});
  window.addEventListener('vexa:play-zone-visibility-ready',start);
  if(window.VexaPlayZoneVisibility&&window.VexaPlayZoneVisibility.ready)start();
})();
`;

export const PLAY_ZONE_SECTION = `
<section id="playzone" class="view play-zone-view">
  <div class="play-zone-stage">
    <div class="play-zone-featured-row play-zone-grid-row">
      ${playZoneGames.map((game, index) => gameCard(game, `play-zone-featured-card play-zone-featured-card-${index + 1}`)).join('')}
    </div>
  </div>
  <script>${PLAY_ZONE_IMAGE_VERSION_SCRIPT}</script>
</section>
`;

export const PLAY_ZONE_VISIBILITY_SCRIPT = `
(function(){
  var root=document.documentElement;
  var loaded=false;
  var inFlight=null;
  var gameIds={mines:true,plinko:true,wheel:true,slot:true,ghostrun:true,crash:true,dice:true,hilo:true,coinflip:true};
  var state=window.VexaPlayZoneVisibility={
    ready:false,
    admin:false,
    hidden:{},
    isGame:function(id){return !!gameIds[String(id||'')]},
    isHidden:function(id){return !!state.hidden[String(id||'')]},
    canOpen:function(id){id=String(id||'');return !state.isGame(id)||!state.isHidden(id)},
    shouldPreload:function(id){id=String(id||'');return !state.isGame(id)||!state.isHidden(id)}
  };
  function timedFetch(url,opt,ms){
    if(typeof AbortController==='undefined')return fetch(url,opt);
    var controller=new AbortController();
    var timer=setTimeout(function(){try{controller.abort()}catch(e){}},ms);
    var options=Object.assign({},opt||{},{signal:controller.signal});
    return fetch(url,options).finally(function(){clearTimeout(timer)})
  }
  function fallbackHidden(){return Object.keys(gameIds)}
  function finish(hidden,admin){
    var blocked={};if(!admin)(hidden||[]).forEach(function(id){id=String(id||'');if(gameIds[id])blocked[id]=true});
    state.hidden=blocked;state.admin=!!admin;state.ready=true;
    document.querySelectorAll('[data-play-zone-card-id]').forEach(function(card){
      var hide=state.isHidden(card.getAttribute('data-play-zone-card-id'));
      card.hidden=!!hide;card.setAttribute('aria-hidden',hide?'true':'false');
    });
    root.classList.add('play-zone-visibility-ready');
    try{window.dispatchEvent(new CustomEvent('vexa:play-zone-visibility-ready',{detail:{hiddenIds:Object.keys(blocked),admin:state.admin}}))}catch(e){}
  }
  function load(force){
    if(loaded&&!force)return Promise.resolve(true);
    if(inFlight)return inFlight;
    var tg=window.Telegram&&window.Telegram.WebApp;
    var initData=String(tg&&tg.initData||'');
    if(!initData){if(!loaded)finish(fallbackHidden(),false);return Promise.resolve(false)}
    inFlight=timedFetch('/app/api/play-zone-card-visibility',{method:'POST',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({initData:initData})},5500)
      .then(function(r){if(!r.ok)throw new Error('unauthorized');return r.json()})
      .then(function(data){loaded=true;finish(data.hiddenIds,data.admin);return true})
      .catch(function(){if(!loaded)finish(fallbackHidden(),false);return false})
      .finally(function(){inFlight=null});
    return inFlight;
  }
  function active(){var el=document.getElementById('playzone');return !!(el&&el.classList.contains('active'))}
  function loadIfActive(){if(active())load(true)}
  function loadInitial(){window.__vexaPlayZoneVisibilityReady=load(false)}
  window.addEventListener('vexa:view-changed',function(ev){if(ev&&ev.detail&&ev.detail.id==='playzone')load(true)});
  window.addEventListener('online',loadIfActive);
  if(window.MutationObserver){var play=document.getElementById('playzone');if(play)new MutationObserver(loadIfActive).observe(play,{attributes:true,attributeFilter:['class']})}
  loadInitial();
})();`;
