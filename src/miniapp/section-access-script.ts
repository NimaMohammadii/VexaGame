export const SECTION_ACCESS_SCRIPT = `
(function(){
  var tg=window.Telegram&&window.Telegram.WebApp;
  var user=(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user)||{};
  var expiryTimer=0;
  var last='';
  var cache={locks:{}};
  var sectionAccessReady=false;
  var predictMarketExpiryTimer=0;
  var liveSocket=null;
  var liveReconnectTimer=0;
  var reconnectAttempt=0;
  var predictOpsState=null;
  var predictUserControls=null;
  var predictUserAccessRequest=0;
  var predictUserExpiryTimer=0;
  var predictPresenceActive=false;
  var pendingPredictRoundSync={};
  var predictSyncIssue=null;
  var predictSyncRetryTimer=0;
  var predictSyncRetryRoundId='';
  var predictSocketIssue=false;
  function userId(){return String(user.id||localStorage.getItem('ownerId')||'').trim()}
  function isPredictViewActive(){var root=document.getElementById('predictzone');return !!(root&&root.classList.contains('active')&&!document.hidden)}
  function renderPredictOnlineCount(value){var badge=document.getElementById('predictOnlineBadge'),count=document.getElementById('predictOnlineCount'),n=Math.floor(Number(value));if(count)count.textContent=isFinite(n)&&n>=0?String(n):'—';if(badge)badge.setAttribute('aria-label',isFinite(n)&&n>=0?n+' users online in Predict':'Predict online users')}
  function sendPredictPresence(active){var next=active===true;if(predictPresenceActive===next)return;predictPresenceActive=next;if(!liveSocket||liveSocket.readyState!==1)return;try{liveSocket.send(JSON.stringify({type:'predict-presence',active:next}))}catch(e){}}
  function syncPredictPresence(){sendPredictPresence(isPredictViewActive())}
  function activeGamePresence(){var root=document.querySelector('.view.active');var id=String(root&&root.id||'');return ['mines','plinko','wheel','dice','crash','hilo','coinflip','slot','ghostrun'].indexOf(id)>=0&&!document.hidden?id:''}
  function sendGamePresence(inactive){if(!liveSocket||liveSocket.readyState!==1)return;try{liveSocket.send(JSON.stringify({type:'game-presence',gameActive:inactive===true?'':activeGamePresence()}))}catch(e){}}
  function cleanPredictRoundSync(detail){var market=String(detail&&detail.market||'').toLowerCase(),roundId=String(detail&&detail.roundId||'').trim();if(market!=='bitcoin'&&market!=='gold'&&market!=='oil')return null;if(!(new RegExp('^pr_'+market+'_\\\\d+$')).test(roundId))return null;return{market:market,roundId:roundId}}
  function requestPredictRoundSync(detail){var item=cleanPredictRoundSync(detail);if(!item)return;pendingPredictRoundSync[item.roundId]=item;flushPredictRoundSync()}
  function flushPredictRoundSync(){if(!isPredictViewActive()||!liveSocket||liveSocket.readyState!==1)return;var initData=String((tg&&tg.initData)||'');if(!initData)return;Object.keys(pendingPredictRoundSync).forEach(function(key){var item=pendingPredictRoundSync[key];try{liveSocket.send(JSON.stringify({type:'predict-round-sync',market:item.market,roundId:item.roundId,initData:initData}));delete pendingPredictRoundSync[key]}catch(e){}})}
  function clearPredictSyncIssue(round){var market=String(round&&round.market||''),roundId=String(round&&((round.roundId!==undefined)?round.roundId:round.id)||'');if(!predictSyncIssue||predictSyncIssue.market!==market||predictSyncIssue.roundId!==roundId)return;if(predictSyncRetryTimer){clearTimeout(predictSyncRetryTimer);predictSyncRetryTimer=0}predictSyncIssue=null;predictSyncRetryRoundId='';renderPredictOps()}
  function applyPredictRoundPayload(payload){var round=payload&&payload.round;if(!round)return;clearPredictSyncIssue(round);try{window.dispatchEvent(new CustomEvent('vexa:predict-round-live',{detail:round}))}catch(e){}}
  function applyPredictUserRoundPayload(payload){var update=payload&&payload.update;if(!update||String(update.userId||'')!==userId())return;clearPredictSyncIssue(update);var balance=Math.max(0,Math.floor(Number(update.tonBalanceNano)||0));try{if(window.VexaTonBalance&&window.VexaTonBalance.write)window.VexaTonBalance.write(balance,0,false);else window.dispatchEvent(new CustomEvent('vexa-ton-balance-game-change',{detail:{tonBalanceNano:balance}}))}catch(e){}try{window.dispatchEvent(new CustomEvent('vexa:predict-user-round-live',{detail:update}))}catch(e){}}
  function applyPredictSyncErrorPayload(payload){var item=cleanPredictRoundSync(payload);if(!item||!isPredictViewActive()||activePredictMarket()!==item.market)return;predictSyncIssue=item;renderPredictOps();if(predictSyncRetryRoundId===item.roundId)return;predictSyncRetryRoundId=item.roundId;if(predictSyncRetryTimer)clearTimeout(predictSyncRetryTimer);predictSyncRetryTimer=setTimeout(function(){predictSyncRetryTimer=0;requestPredictRoundSync(item)},2200)}
  function clearExpiry(){if(expiryTimer){clearTimeout(expiryTimer);expiryTimer=0}}
  function remove(){clearExpiry();var el=document.getElementById('vexaAccessLock');if(el)el.remove();document.documentElement.classList.remove('vexa-access-locked')}
  function render(lock){
    var existing=document.getElementById('vexaAccessLock');if(existing)existing.remove();
    clearExpiry();
    document.documentElement.classList.add('vexa-access-locked');
    var el=document.createElement('main');el.id='vexaAccessLock';el.className='vexa-access-lock-screen';
    el.innerHTML='<section class="vexa-access-lock-card" aria-label="Mini app update"><p class="vexa-access-lock-title"><span>Updating</span><span class="vexa-access-lock-dots" aria-hidden="true"><i></i><i></i><i></i></span></p><div class="vexa-access-lock-bar" aria-hidden="true"><span></span></div></section>';
    document.body.appendChild(el);
    var fill=el.querySelector('.vexa-access-lock-bar span');
    var offset=Number(lock.serverNow||0)-Date.now()/1000,from=Number(lock.lockedFrom)||0,until=Number(lock.lockedUntil)||0,total=Math.max(1,until-from);
    var now=Date.now()/1000+offset,progress=Math.min(100,Math.max(0,(now-from)/total*100)),remaining=Math.max(0,until-now);
    if(fill){fill.style.transition='none';fill.style.width=progress+'%';requestAnimationFrame(function(){if(!fill||!fill.isConnected)return;fill.style.transition='width '+remaining+'s linear';fill.style.width='100%'})}
    if(remaining<=0){expireLocks();return}
    expiryTimer=setTimeout(function(){expiryTimer=0;expireLocks()},Math.ceil(remaining*1000)+50);
  }
  function expireLocks(){var now=Date.now()/1000,source=cache&&cache.locks||{},next={},changed=false;Object.keys(source).forEach(function(id){var lock=source[id];if(lock&&Number(lock.lockedUntil)>now)next[id]=lock;else changed=true});if(changed){cache={locks:next};last='__expired__';applyPredictMarketLocks()}apply(cache)}
  function applyLivePayload(payload){
    if(!payload||!payload.locks)return;
    sectionAccessReady=true;cache={locks:payload.locks};applyPredictMarketLocks();apply(cache);
  }
  function applyPredictMarketLocks(){
    var root=document.getElementById('predictzone');if(!root)return;
    if(predictMarketExpiryTimer){clearTimeout(predictMarketExpiryTimer);predictMarketExpiryTimer=0}var nextExpiry=0,now=Date.now()/1000;
    ['bitcoin','oil','gold','world','tech','culture'].forEach(function(market){var button=root.querySelector('[data-vexa-predict-admin-lock][data-vexa-predict-market="'+market+'"]');if(!button)return;var locked=!sectionAccessReady||!!(cache.locks&&cache.locks['predict-'+market]);button.setAttribute('data-vexa-predict-admin-lock',locked?'1':'0');if(locked){button.setAttribute('data-vexa-predict-locked','1');button.setAttribute('aria-disabled','true')}else{button.removeAttribute('data-vexa-predict-locked');button.removeAttribute('aria-disabled')}});
    Object.keys(cache.locks||{}).forEach(function(id){if(id.indexOf('predict-')!==0)return;var until=Number(cache.locks[id]&&cache.locks[id].lockedUntil)||0;if(until>now&&(!nextExpiry||until<nextExpiry))nextExpiry=until});if(nextExpiry)predictMarketExpiryTimer=setTimeout(expireLocks,Math.max(50,Math.ceil((nextExpiry-now)*1000)+50));
    try{window.dispatchEvent(new CustomEvent('vexa:predict-market-access'))}catch(e){}
  }
  function activePredictMarket(){
    var root=document.getElementById('predictzone');if(!root)return'';
    var button=root.querySelector('[data-vexa-predict-market].active');
    var market=String(button&&button.getAttribute('data-vexa-predict-market')||'bitcoin').toLowerCase();
    return market==='bitcoin'||market==='gold'||market==='oil'?market:'';
  }
  function clearPredictUserExpiry(){if(predictUserExpiryTimer){clearTimeout(predictUserExpiryTimer);predictUserExpiryTimer=0}}
  function schedulePredictUserExpiry(){
    clearPredictUserExpiry();
    var blocks=predictUserControls&&Array.isArray(predictUserControls.sectionBlocks)?predictUserControls.sectionBlocks:[],next=0;
    blocks.forEach(function(block){
      var section=String(block&&block.sectionId||'');if(section.indexOf('predict-')!==0)return;
      var remaining=Number(block&&block.remainingMs);if(!isFinite(remaining)||remaining<=0)return;
      if(!next||remaining<next)next=remaining;
    });
    if(next>0)predictUserExpiryTimer=setTimeout(function(){predictUserExpiryTimer=0;refreshPredictUserAccess()},Math.max(50,Math.ceil(next)+60));
  }
  function applyPredictUserControls(result){
    if(!result)return false;predictUserControls=result;schedulePredictUserExpiry();renderPredictOps();return true;
  }
  function applyUserControlsPayload(payload){
    var controls=payload&&payload.controls;if(!controls||String(controls.userId||'')!==userId())return false;
    predictUserAccessRequest++;return applyPredictUserControls(controls);
  }
  function refreshPredictUserAccess(){
    var id=userId();if(!id)return Promise.resolve(false);
    var requestId=++predictUserAccessRequest;
    return fetch('/app/api/user-controls?userId='+encodeURIComponent(id),{cache:'no-store'})
      .then(function(response){return response.ok?response.json():null})
      .then(function(result){if(requestId!==predictUserAccessRequest||!result)return false;return applyPredictUserControls(result)})
      .catch(function(){return false});
  }
  function activePredictUserBlock(market){
    var blocks=predictUserControls&&Array.isArray(predictUserControls.sectionBlocks)?predictUserControls.sectionBlocks:[];
    for(var i=0;i<blocks.length;i++){var block=blocks[i];if(block&&block.blocked!==false&&String(block.sectionId||'')==='predict-'+market)return block}
    return null;
  }
  function predictOpsBlockState(){
    var market=activePredictMarket();if(!market)return null;
    if(activePredictUserBlock(market))return{kind:'user',health:'Access limited',message:'Your access to this market is currently paused. If you have any questions, please contact an admin — we’re happy to help.'};
    var state=predictOpsState||window.VexaPredictOpsState;if(!state)return null;
    var item=state.markets&&state.markets[market];
    var custom=String(state.maintenanceMessage||'').trim();
    if(state.emergencyPaused)return{kind:'market',health:'Predictions paused',message:custom||'Predictions are temporarily unavailable. Please try again shortly.'};
    if(item&&item.manualPaused)return{kind:'market',health:(market==='bitcoin'?'Bitcoin':market==='gold'?'Gold':'Oil')+' paused',message:custom||(market==='bitcoin'?'Bitcoin':market==='gold'?'Gold':'Oil')+' predictions are temporarily paused.'};
    if(item&&item.circuitOpen)return{kind:'feed',health:'Price feed issue',message:custom||'Live price feed is temporarily unavailable. New predictions are paused.'};
    if(item&&item.capacityReached)return{kind:'capacity',health:'Capacity full',message:'This market has reached its current betting capacity. Please try again later.'};
    return null;
  }
  function removePredictOpsNotice(){var notice=document.getElementById('vexaPredictOpsNotice');if(notice)notice.remove()}
  function removePredictHealth(){var health=document.getElementById('vexaPredictHealth');if(health)health.remove()}
  function ensurePredictStatusStyle(){
    if(document.getElementById('vexaPredictStatusStyle'))return;
    var style=document.createElement('style');style.id='vexaPredictStatusStyle';
    style.textContent='#predictzone [data-predict-trend-label][data-vexa-predict-status-active="1"]{font-size:0!important;display:inline-flex!important;align-items:center!important;justify-content:flex-end!important;gap:6px!important;max-width:68%!important;white-space:nowrap!important;color:rgba(255,255,255,.82)!important}#predictzone [data-predict-trend-label][data-vexa-predict-status-active="1"]:before{content:attr(data-vexa-predict-status-text);font:800 10px/1.1 ui-rounded,"SF Pro Rounded","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;letter-spacing:-.01em!important;color:rgba(255,255,255,.82)!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}#predictzone [data-predict-trend-label][data-vexa-predict-status-active="1"]:after{content:"!";flex:0 0 14px;width:14px;height:14px;box-sizing:border-box;border:1px solid rgba(196,48,63,.82);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:rgba(238,78,92,.96);background:transparent;box-shadow:none;font:900 9px/12px ui-rounded,"SF Pro Rounded","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;animation:vexaPredictAlertPulse 1.8s ease-in-out infinite;transform-origin:center}@keyframes vexaPredictAlertPulse{0%,100%{transform:scale(1);opacity:.72}50%{transform:scale(1.09);opacity:1}}@media (prefers-reduced-motion:reduce){#predictzone [data-predict-trend-label][data-vexa-predict-status-active="1"]:after{animation:none}}';
    document.head.appendChild(style);
  }
  function clearPredictStatus(){
    var root=document.getElementById('predictzone');if(!root)return;
    var label=root.querySelector('[data-predict-trend-label]');if(!label)return;
    label.removeAttribute('data-vexa-predict-status-active');label.removeAttribute('data-vexa-predict-status-text');label.removeAttribute('data-vexa-predict-status-kind');label.removeAttribute('title');
  }
  function renderPredictStatus(block){
    var root=document.getElementById('predictzone');if(!root)return;
    var label=root.querySelector('[data-predict-trend-label]');if(!label)return;
    ensurePredictStatusStyle();
    label.setAttribute('data-vexa-predict-status-active','1');
    label.setAttribute('data-vexa-predict-status-text',String(block&&block.health||'Prediction unavailable'));
    label.setAttribute('data-vexa-predict-status-kind',String(block&&block.kind||'market'));
    label.setAttribute('title',String(block&&block.message||''));
    label.setAttribute('aria-live','polite');
  }
  function renderPredictOps(){
    removePredictOpsNotice();removePredictHealth();
    var root=document.getElementById('predictzone');if(!root)return;
    var block=predictOpsBlockState(),market=activePredictMarket();
    if(!block&&isPredictViewActive()&&(predictSocketIssue||(predictSyncIssue&&predictSyncIssue.market===market)))block={kind:'sync',health:'Temporary sync issue',message:'Live prediction data is reconnecting automatically.'};
    if(!block||!block.message){clearPredictStatus();return}
    renderPredictStatus(block);
  }
  function applyPredictOpsPayload(payload){
    if(!payload||!payload.state)return;
    predictOpsState=payload.state;window.VexaPredictOpsState=predictOpsState;renderPredictOps();
    try{window.dispatchEvent(new CustomEvent('vexa:predict-ops',{detail:{state:predictOpsState,refreshRound:payload.refreshRound===true}}))}catch(e){}
    if(payload.refreshRound===true){
      var root=document.getElementById('predictzone');
      if(root&&root.classList.contains('active'))queueMicrotask(function(){var market=activePredictMarket(),button=market&&root.querySelector('[data-vexa-predict-market="'+market+'"]');if(button&&button.getAttribute('data-vexa-predict-locked')!=='1')try{button.click()}catch(e){}})
    }
  }
  function applyGameOnlinePayload(payload){try{window.dispatchEvent(new CustomEvent('vexa:game-online',{detail:payload}))}catch(e){}}
  function reconnectDelay(){return Math.min(30000,1000*Math.pow(2,Math.min(reconnectAttempt++,5)))}
  function connectLive(){
    if(liveSocket||!userId()||!window.WebSocket)return;
    var initData=String((tg&&tg.initData)||'');if(!initData)return;
    var proto=location.protocol==='https:'?'wss:':'ws:';
    var endpoint=proto+'//'+location.host+'/app/api/section-access/live?initData='+encodeURIComponent(initData);
    try{liveSocket=new WebSocket(endpoint);liveSocket.onopen=function(){reconnectAttempt=0;predictSocketIssue=false;renderPredictOps();predictPresenceActive=isPredictViewActive();try{liveSocket&&liveSocket.send(JSON.stringify({type:'identify',initData:initData,predictActive:predictPresenceActive,gameActive:activeGamePresence()}))}catch(e){}refreshPredictUserAccess();flushPredictRoundSync()};liveSocket.onmessage=function(event){try{var payload=JSON.parse(event.data);if(payload&&payload.type==='section-access')applyLivePayload(payload);else if(payload&&payload.type==='user-controls')applyUserControlsPayload(payload);else if(payload&&payload.type==='predict-ops')applyPredictOpsPayload(payload);else if(payload&&payload.type==='predict-online')renderPredictOnlineCount(payload.count);else if(payload&&payload.type==='game-online')applyGameOnlinePayload(payload);else if(payload&&payload.type==='predict-round')applyPredictRoundPayload(payload);else if(payload&&payload.type==='predict-user-round')applyPredictUserRoundPayload(payload);else if(payload&&payload.type==='predict-sync-error')applyPredictSyncErrorPayload(payload)}catch(e){}};liveSocket.onclose=function(){liveSocket=null;predictPresenceActive=false;if(isPredictViewActive()){predictSocketIssue=true;renderPredictOps()}renderPredictOnlineCount(null);clearTimeout(liveReconnectTimer);if(!document.hidden)liveReconnectTimer=setTimeout(connectLive,reconnectDelay())};liveSocket.onerror=function(){try{liveSocket&&liveSocket.close()}catch(e){}}}catch(e){liveSocket=null;predictPresenceActive=false;if(isPredictViewActive()){predictSocketIssue=true;renderPredictOps()}renderPredictOnlineCount(null);clearTimeout(liveReconnectTimer);liveReconnectTimer=setTimeout(connectLive,reconnectDelay())}
  }
  function apply(j){
    var active=document.querySelector('.view.active');var section=active&&active.id||'home';
    var lock=j&&j.locks&&((j.locks.app)||j.locks[section]);
    var signature=lock?lock.sectionId+':'+lock.lockedUntil:'';
    if(signature===last)return;
    last=signature;if(lock)render(lock);else remove();
  }
  function reapply(){if(!liveSocket)connectLive();expireLocks();applyPredictMarketLocks();renderPredictOps();syncPredictPresence();sendGamePresence();flushPredictRoundSync();return Promise.resolve(cache)}
  document.addEventListener('click',function(event){
    var target=event.target&&event.target.closest&&event.target.closest('#predictzone [data-predict-choice],#predictzone [data-predict-bet-submit],#predictzone [data-predict-bet-preset]');
    if(!target)return;
    var block=predictOpsBlockState();if(!block||!block.message)return;
    event.preventDefault();event.stopImmediatePropagation();renderPredictOps();
  },true);
  document.addEventListener('click',function(event){var target=event.target&&event.target.closest&&event.target.closest('#predictzone [data-vexa-predict-market]');if(target)queueMicrotask(renderPredictOps)},false);
  window.VexaSectionLocks={reload:reapply,refresh:function(){if(liveSocket)try{liveSocket.close()}catch(e){}else connectLive();return Promise.resolve(cache)}};
  window.addEventListener('vexa:predict-round-sync-request',function(event){requestPredictRoundSync(event&&event.detail)});
  window.addEventListener('vexa:section-mounted',function(){queueMicrotask(reapply)});
  window.addEventListener('vexa:view-changed',function(){queueMicrotask(function(){if(!liveSocket)connectLive();renderPredictOps();syncPredictPresence();sendGamePresence();flushPredictRoundSync()})});
  document.addEventListener('visibilitychange',function(){if(document.hidden){sendPredictPresence(false);sendGamePresence(true);clearTimeout(liveReconnectTimer);clearPredictUserExpiry()}else{refreshPredictUserAccess();schedulePredictUserExpiry();if(!liveSocket)connectLive();else{syncPredictPresence();sendGamePresence();flushPredictRoundSync()}}});
  window.addEventListener('online',function(){refreshPredictUserAccess();if(!liveSocket)connectLive();else{syncPredictPresence();sendGamePresence();flushPredictRoundSync()}});
  window.addEventListener('pagehide',function(){sendPredictPresence(false);sendGamePresence(true)});
  function init(){refreshPredictUserAccess();renderPredictOnlineCount(null);connectLive()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init()
})();
`;