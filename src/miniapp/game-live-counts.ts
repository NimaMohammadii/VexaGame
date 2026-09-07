const liveGameLabels: Record<string, string> = {
  mines: 'Mines',
  plinko: 'Plinko',
  wheel: 'Wheel',
  dice: 'Dice',
  crash: 'Crash',
  hilo: 'Chicken Cross',
  coinflip: 'Pump',
  slot: 'Slot',
  ghostrun: 'Ghost Run',
};

const hiddenCardPlayerCounts = new Set(['hilo', 'coinflip']);

type LivePlayerRange = { min: number; max: number };
function hashId(id: string): number {
  return id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function defaultRangeForGame(_id: string): LivePlayerRange {
  return { min: 0, max: 0 };
}

export function shouldShowLivePlayersOnCard(id: string): boolean {
  return !hiddenCardPlayerCounts.has(id);
}

export function livePlayersSeed(_id: string): string {
  return '';
}

export const GAME_LIVE_COUNT_STYLES = `
#brandTitle {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  min-width: 0 !important;
}

.game-online-badge {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 5px !important;
  min-width: 0 !important;
  color: rgba(255, 255, 255, .90) !important;
  font-size: 10.5px !important;
  font-weight: 900 !important;
  letter-spacing: -.02em !important;
  white-space: nowrap !important;
  background: transparent !important;
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
  margin-left: 2px !important;
  transform: translateY(1px) !important;
  -webkit-backdrop-filter: none !important;
  backdrop-filter: none !important;
}

.game-online-badge i {
  width: 6px !important;
  height: 6px !important;
  border-radius: 50% !important;
  background: #18ff84 !important;
  box-shadow: 0 0 0 1px rgba(24, 255, 132, .25), 0 0 8px rgba(24, 255, 132, .42), 0 0 14px rgba(24, 255, 132, .14), inset 0 1px 0 rgba(255, 255, 255, .34) !important;
  flex: 0 0 auto !important;
  position: relative !important;
  animation: liveDotSoft 1.7s ease-in-out infinite !important;
}

.game-online-badge i::before {
  content: '' !important;
  position: absolute !important;
  inset: -2px !important;
  border-radius: inherit !important;
  border: 1px solid rgba(24, 255, 132, .40) !important;
  opacity: .36 !important;
  animation: liveDotRing 1.7s ease-in-out infinite !important;
}

.game-online-badge em {
  display: none !important;
  font-style: normal !important;
  font-size: 8px !important;
  font-weight: 900 !important;
  letter-spacing: .08em !important;
  color: rgba(24, 255, 132, .92) !important;
  text-transform: uppercase !important;
  line-height: 1 !important;
}

.game-online-badge b {
  display: inline-block !important;
  min-width: 23px !important;
  font-size: 10.5px !important;
  font-weight: 900 !important;
  color: rgba(255, 255, 255, .90) !important;
  text-shadow: 0 6px 14px rgba(0, 0, 0, .56), 0 0 10px rgba(255, 255, 255, .08) !important;
  font-variant-numeric: tabular-nums !important;
}

@keyframes liveDotSoft {
  0%, 100% { transform: scale(.96); filter: brightness(1); }
  50% { transform: scale(1.04); filter: brightness(1.14); }
}

@keyframes liveDotRing {
  0%, 100% { transform: scale(.84); opacity: .14; }
  50% { transform: scale(1.12); opacity: .30; }
}
`;

export const GAME_LIVE_COUNT_SCRIPT = `
(function(){
  var games=${JSON.stringify(liveGameLabels)};
  var cardCountsVisible=${JSON.stringify(Object.fromEntries(Object.keys(liveGameLabels).map((id) => [id, shouldShowLivePlayersOnCard(id)])))};
  var ranges=${JSON.stringify(Object.fromEntries(Object.keys(liveGameLabels).map((id) => [id, defaultRangeForGame(id)])))};
  var adjustments={};
  var realCounts={};
  var counts={};
  var ready=false;
  function activeGame(){var root=document.querySelector('.view.active');var id=root&&root.id||'';return games[id]?id:''}
  function isPlayZoneActive(){var root=document.getElementById('playzone');return !!(root&&root.classList.contains('active')&&!document.hidden)}
  function rangeValue(id){var range=ranges[id]||{min:0,max:0};var min=Math.max(0,Math.floor(Number(range.min)||0)),max=Math.max(min,Math.floor(Number(range.max)||0));if(max===min)return min;return min+((${JSON.stringify(Object.fromEntries(Object.keys(liveGameLabels).map((id) => [id, hashId(id)])))}[id]||0)*13%(max-min+1))}
  function boost(id){var value=adjustments[id]||{},now=Date.now(),total=Math.max(0,Math.floor(Number(value.permanent)||0)),timed=value.timed;if(!timed||Date.parse(timed.expiresAt)<=now)return total;var min=Math.max(0,Math.floor(Number(timed.min)||0)),max=Math.max(min,Math.floor(Number(timed.max)||0));return total+min+(Math.floor(now/90000)*37%(max-min+1))}
  function count(id){return rangeValue(id)+Math.max(0,Math.floor(Number(realCounts[id])||0))+boost(id)}
  function cardNodes(id){if(!isPlayZoneActive()||cardCountsVisible[id]===false)return [];return Array.prototype.slice.call(document.querySelectorAll('#playzone .game-card-shell[data-game-view="'+id+'"] .game-players b'))}
  function badges(title){return Array.prototype.slice.call(title.querySelectorAll('[data-game-online-badge],[data-dice-online-badge]'))}
  function stripBadges(title,keep){badges(title).forEach(function(node){if(node!==keep)node.remove()})}
  function titleText(title){return String(title.childNodes[0]&&title.childNodes[0].textContent||title.textContent||'').trim()}
  function renderBadge(){var title=document.getElementById('brandTitle');if(!title)return;var id=activeGame();if(!ready||!id){stripBadges(title);return}if(titleText(title)!==games[id]){stripBadges(title);return}var n=count(id),badge=title.querySelector('[data-game-online-badge="'+id+'"]');stripBadges(title,badge);if(!badge){badge=document.createElement('span');badge.className='game-online-badge '+id+'-online-badge';badge.setAttribute('data-game-online-badge',id);badge.appendChild(document.createElement('i'));badge.appendChild(document.createElement('b'));title.appendChild(badge)}badge.setAttribute('aria-label',n+' live online');var b=badge.querySelector('b');if(b)b.textContent=String(n)}
  function setCount(id,value){counts[id]=Math.max(0,Math.floor(Number(value)||0));cardNodes(id).forEach(function(el){if(el.textContent!==String(counts[id])){el.classList.add('is-counting');el.textContent=String(counts[id]);setTimeout(function(){el.classList.remove('is-counting')},180)}});renderBadge();return counts[id]}
  function refresh(){if(!ready)return;Object.keys(games).forEach(function(id){setCount(id,count(id))});renderBadge()}
  function apply(payload){if(!payload||!payload.config)return;ranges=payload.config.ranges||{};adjustments=payload.config.adjustments||{};realCounts=payload.counts||{};ready=true;refresh()}
  window.VexaLiveGameCounts={get:count,setCount:setCount,sync:function(){refresh();return Promise.resolve(true)},refresh:refresh,renderBadge:renderBadge};
  window.addEventListener('vexa:game-online',function(event){apply(event&&event.detail)});
  window.addEventListener('vexa:view-changed',renderBadge);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)refresh()});
  Object.keys(games).forEach(function(id){cardNodes(id).forEach(function(el){el.textContent=''})});
})();
`;
