export const PLINKO_PANEL_SCRIPT = `
(function(){
  var NANO=1000000000;
  var MIN_BET=.01;
  var lastAmountPointerAt=0;
  function q(id){return document.getElementById(id)}
  function ensureFirstLoadStyle(){if(document.getElementById('plinkoFirstLoadNoOverlayStyle'))return;var style=document.createElement('style');style.id='plinkoFirstLoadNoOverlayStyle';style.textContent='body.plinko-control-loading #plinko.view .plinko-stage{opacity:1!important;pointer-events:auto!important}body.plinko-control-loading #plinko.view .plinko-controls{opacity:1!important;pointer-events:auto!important}body.plinko-control-loading #plinko.view:after{display:none!important;content:none!important;opacity:0!important;pointer-events:none!important}';document.head.appendChild(style)}
  function tonToNano(value){return Math.max(0,Math.floor((Number(String(value||'').replace(',','.'))||0)*NANO))}
  function readBalanceNano(){if(window.VexaTonBalance&&typeof window.VexaTonBalance.read==='function')return Math.max(0,Math.floor(Number(window.VexaTonBalance.read())||0));var source=q('plinkoTonBalance')||q('topTonBalance')||q('plinkoCredit');return tonToNano(source&&source.textContent)}
  function isPlinkoActive(){var active=document.querySelector('.view.active');return !!(active&&active.id==='plinko')}
  function roundCurrency(value){var next=Math.round((Math.max(0,Number(value)||0)+Number.EPSILON)*100)/100;return next}
  function money(value){var next=roundCurrency(value);return next.toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1')}
  function syncHiddenInput(){var input=q('plinkoBet'),open=document.querySelector('[data-plinko-bet-input-open]');if(input&&open)input.value=money(open.textContent||input.value||MIN_BET)}
  function currentBet(){var input=q('plinkoBet');var value=Number(String(input&&input.value||'').replace(',','.'));return Number.isFinite(value)&&value>=MIN_BET?roundCurrency(value):MIN_BET}
  function setBet(value){var input=q('plinkoBet'),open=document.querySelector('[data-plinko-bet-input-open]');var next=roundCurrency(value);if(!Number.isFinite(next)||next<MIN_BET)next=MIN_BET;var balance=roundCurrency(readBalanceNano()/NANO);if(balance>=MIN_BET&&next>balance)next=balance;var display=money(next);if(input)input.value=display;if(open)open.textContent=display;renderStats()}
  function multiplyBet(multiplier){var value=currentBet();setBet(multiplier===.5?Math.max(MIN_BET,value/2):value*2)}
  function renderStats(){var bet=currentBet(),balance=roundCurrency(readBalanceNano()/NANO);var current=document.querySelector('[data-plinko-current]'),balanceEl=document.querySelector('[data-plinko-balance]');if(current)current.textContent=money(bet);if(balanceEl)balanceEl.textContent=money(balance);syncHiddenInput()}
  function promptBetAmount(){if(!isPlinkoActive())return;var current=money(currentBet()),next=null;try{next=window.prompt('Enter point amount',current)}catch(e){return}if(next===null)return;var parsed=Number(String(next).trim().replace(',','.'));if(!Number.isFinite(parsed)||parsed<MIN_BET)return;setBet(parsed)}
  function syncHeaderCredit(){var source=q('plinkoTonBalance')||q('topTonBalance')||q('plinkoCredit');var header=q('plinkoCreditHeader');if(source&&header)header.textContent=source.textContent||'0';renderStats()}
  function setLastWin(value){var win=document.querySelector('[data-plinko-win]');if(win)win.textContent=money(value)}
  function amountButtonFromPoint(x,y){var controls=[document.querySelector('[data-action="plinko-bet-half"]'),document.querySelector('[data-plinko-bet-input-open]'),document.querySelector('[data-action="plinko-bet-double"]')];for(var i=0;i<controls.length;i++){var el=controls[i];if(!el||!el.getBoundingClientRect)return null;var r=el.getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return el}return null}
  function handleAmountPoint(ev){if(!isPlinkoActive())return false;if(ev&&ev.type==='touchstart'&&window.PointerEvent)return false;var x=ev.clientX,y=ev.clientY;if((x==null||y==null)&&ev.touches&&ev.touches[0]){x=ev.touches[0].clientX;y=ev.touches[0].clientY}if(x==null||y==null)return false;var btn=amountButtonFromPoint(x,y);if(!btn)return false;if(btn.hasAttribute('data-plinko-bet-input-open')&&ev.type!=='click')return false;if(ev.cancelable!==false)ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();if(btn.hasAttribute('data-plinko-bet-input-open'))promptBetAmount();else if(btn.getAttribute('data-action')==='plinko-bet-half')multiplyBet(.5);else if(btn.getAttribute('data-action')==='plinko-bet-double')multiplyBet(2);return true}
  function smoothPress(el){if(!el)return;if(el.__plinkoSmoothFrame)cancelAnimationFrame(el.__plinkoSmoothFrame);el.classList.add('plinko-drop-press');el.__plinkoSmoothFrame=requestAnimationFrame(function(){el.classList.add('plinko-drop-tap');clearTimeout(el.__plinkoSmoothTimer);el.__plinkoSmoothTimer=setTimeout(function(){el.classList.remove('plinko-drop-tap');el.classList.remove('plinko-drop-press')},220)})}
  function smoothRelease(el){if(el)el.classList.remove('plinko-drop-press')}
  function dropAssetFromEvent(ev){var btn=ev&&ev.target&&ev.target.closest?ev.target.closest('[data-action="drop-plinko-ball"]'):null;if(!btn)return null;return btn.closest('.plinko-drop-asset')||btn}
  document.addEventListener('pointerdown',function(ev){if(handleAmountPoint(ev)){lastAmountPointerAt=Date.now();return}var el=dropAssetFromEvent(ev);if(el)smoothPress(el)},{capture:true,passive:false});
  document.addEventListener('touchstart',function(ev){if(handleAmountPoint(ev))lastAmountPointerAt=Date.now()},{capture:true,passive:false});
  document.addEventListener('pointerup',function(ev){smoothRelease(dropAssetFromEvent(ev))},{capture:true,passive:true});
  document.addEventListener('pointercancel',function(ev){smoothRelease(dropAssetFromEvent(ev))},{capture:true,passive:true});
  document.addEventListener('click',function(ev){if(Date.now()-lastAmountPointerAt<450){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();return}if(handleAmountPoint(ev))return;var button=ev.target&&ev.target.closest&&ev.target.closest('button');if(!button)return;if(button.hasAttribute('data-plinko-bet-input-open')){ev.preventDefault();promptBetAmount();return}var action=button.getAttribute('data-action');if(action==='plinko-bet-half'){ev.preventDefault();multiplyBet(.5);return}if(action==='plinko-bet-double'){ev.preventDefault();multiplyBet(2);return}},true);
  document.addEventListener('input',function(ev){if(ev.target&&ev.target.id==='plinkoBet')setBet(ev.target.value)});
  document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'&&isPlinkoActive())syncHeaderCredit()});
  window.addEventListener('focus',function(){if(isPlinkoActive())syncHeaderCredit()});
  window.addEventListener('vexa-ton-balance-sync',function(){if(isPlinkoActive())syncHeaderCredit()});
  window.addEventListener('vexa:view-changed',function(ev){if(ev&&ev.detail&&ev.detail.id==='plinko')syncHeaderCredit()});
  window.addEventListener('vexa-plinko-last-win',function(ev){setLastWin(ev&&ev.detail?ev.detail.total:0);renderStats()});
  var start=function(){ensureFirstLoadStyle();setBet(currentBet());syncHeaderCredit()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
`;
