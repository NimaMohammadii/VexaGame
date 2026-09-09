export const TON_BALANCE_SCRIPT = `
(function(){
  var KEY='vexaTonBalanceNano';
  var NANO_PER_TON=1000000000;
  var PLINKO_UNIT_NANO=NANO_PER_TON;
  var lastBalanceLoadAt=0;
  var winChancePercent=50;
  var LOAD_STALE_MS=60000;
  function clean(value){var n=Math.floor(Number(value));return Number.isFinite(n)&&n>=0?n:0}
  function formatTonNumber(value){var raw=clean(value);var ton=raw/NANO_PER_TON;return ton.toFixed(2)}
  function formatTon(value){return formatTonNumber(value)}
  function plinkoUnits(value){return Math.max(0,Math.floor(clean(value)/PLINKO_UNIT_NANO))}
  function parseTonText(text){var value=String(text||'').replace(/(?:GRAM|TON)/i,'').trim();if(!value)return NaN;return Math.floor(Number(value)*NANO_PER_TON)}
  function user(){var tg=window.Telegram&&window.Telegram.WebApp;var u=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user;var tgId=String((u&&u.id)||'').trim();var stored=String(localStorage.getItem('ownerId')||'').trim();var id=tgId||stored;if(tgId&&stored&&tgId!==stored){try{localStorage.removeItem(KEY)}catch(e){}}if(tgId)try{localStorage.setItem('ownerId',tgId)}catch(e){}return {id:String(id||'').trim(),username:u&&u.username?String(u.username):null,firstName:u&&u.first_name?String(u.first_name):null}}
  function readDomBalance(){var nodes=document.querySelectorAll('[data-ton-balance-display],#topTonBalance,#plinkoTonBalance,#minesTonBalance');for(var i=0;i<nodes.length;i++){var raw=nodes[i].getAttribute('data-ton-balance-raw');if(raw!==null){var r=clean(raw);if(Number.isFinite(r))return r}var n=parseTonText(nodes[i].textContent);if(Number.isFinite(n)&&n>=0)return n}return 0}
  function read(){var stored=localStorage.getItem(KEY);if(stored!==null)return clean(stored);return clean(readDomBalance())}
  function render(value){var balance=clean(value);var units=plinkoUnits(balance);var display=formatTonNumber(balance);localStorage.setItem(KEY,String(balance));document.querySelectorAll('[data-ton-balance-display],#topTonBalance,#plinkoTonBalance,#minesTonBalance').forEach(function(el){el.setAttribute('data-ton-balance-raw',String(balance));el.textContent=display});document.querySelectorAll('#plinkoCredit,#creditCount,#plinkoCreditHeader').forEach(function(el){el.setAttribute('data-ton-balance-raw',String(balance));el.textContent=String(units)});return balance}
  function emit(balance,delta){try{var units=plinkoUnits(balance);var unitDelta=Math.trunc((Number(delta)||0)/PLINKO_UNIT_NANO);window.dispatchEvent(new CustomEvent('vexa-ton-balance-sync',{detail:{tonBalanceNano:balance,deltaNano:Math.floor(Number(delta)||0),display:formatTonNumber(balance),rate:NANO_PER_TON}}));window.dispatchEvent(new CustomEvent('vexa-credit-sync',{detail:{credit:units,delta:unitDelta,tonBalanceNano:balance,display:formatTonNumber(balance),rate:PLINKO_UNIT_NANO}}))}catch(e){}}
  function write(value,delta,silent){var balance=render(value);if(!silent)emit(balance,delta);return balance}
  async function fetchServerBalance(){var u=user();if(!u.id)return NaN;var r=await fetch('/app/api/user-controls?userId='+encodeURIComponent(u.id),{headers:{'accept':'application/json'},cache:'no-store'});var j=await r.json().catch(function(){return null});if(!r.ok)throw new Error(j&&j.error?j.error:'Could not load GRAM balance');var chance=Number(j&&j.winChancePercent);if(Number.isFinite(chance))setWinChance(chance);var server=Number(j&&j.tonBalanceNano);return Number.isFinite(server)?server:NaN}
  async function load(){var now=Date.now();if(lastBalanceLoadAt&&now-lastBalanceLoadAt<LOAD_STALE_MS)return write(read(),0,false);lastBalanceLoadAt=now;try{var server=await fetchServerBalance();if(Number.isFinite(server))return write(server,0,false)}catch(e){}return write(read(),0,false)}
  function flush(){return Promise.resolve(read())}
  function setWinChance(value){var n=Math.round(Number(value));winChancePercent=Number.isFinite(n)?Math.max(0,Math.min(100,n)):50;try{localStorage.setItem('vexaWinChancePercent',String(winChancePercent))}catch(e){}return winChancePercent}
  function readWinChance(){try{var stored=localStorage.getItem('vexaWinChancePercent');if(stored!==null)setWinChance(stored)}catch(e){}return winChancePercent}
  function hasCustomChance(){return true}
  function decideWin(){return Math.random()*100<readWinChance()}
  function decideNative(nativeChance){return !!decideWin()}
  readWinChance();
  window.VexaGameChance={read:readWinChance,set:setWinChance,isCustom:hasCustomChance,decideWin:decideWin,decideNative:decideNative};
  window.VexaTonBalance={read:read,write:write,flush:flush,render:function(){return render(read())},load:load,format:formatTon,rate:NANO_PER_TON,parse:parseTonText,plinkoUnitNano:PLINKO_UNIT_NANO};
  window.addEventListener('vexa-ton-balance-game-change',function(ev){if(!ev||!ev.detail)return;var balance=Number(ev.detail.tonBalanceNano);if(Number.isFinite(balance)&&balance>=0)write(balance,0,true)});
  window.addEventListener('vexa-credit-game-change',function(ev){if(!ev||!ev.detail)return;var balance=Number(ev.detail.tonBalanceNano);if(Number.isFinite(balance)&&balance>=0)write(balance,0,true)});
  window.addEventListener('vexa-ton-balance-sync',function(ev){if(!ev||!ev.detail)return;var balance=Number(ev.detail.tonBalanceNano);if(Number.isFinite(balance))render(balance)});
  document.addEventListener('visibilitychange',function(){if(!document.hidden)render(read())});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){render(read())});else render(read());
})();
`;