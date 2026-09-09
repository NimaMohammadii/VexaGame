export const MINES_SCRIPT = `
(function(){
  var size=25;
  var NANO=1000000000;
  var audioCtx=null;
  var toastTimer=null;
  var statusTimer=null;
  var displayTimer=null;
  var displayGeneration=0;
  var statusMessage='';
  var statusUntil=0;
  var lastMultiplierText='1.00x';
  var friendMode=false;
  var friendState=null;
  var friendBusy=false;
  var friendSyncing=false;
  var friendSyncQueued=false;
  var friendLastSyncAt=0;
  var friendCreditBlocked=false;
  var lastFriendMessage='';
  var tileImages={safe:'',bomb:''};
  var imageLoadPromise=null;
  var soloSocket=null;
  var soloSocketReady=null;
  var soloSocketAuthed=false;
  var soloSocketSeq=0;
  var soloPending={};
  var state={active:false,ended:false,busy:false,roundId:'',amountNano:10000000,mines:3,revealed:0,bombs:{},safe:{},multiplier:1};
  var xpRoundActive=false;
  var xpRoundFinished=false;
  var RESET_WAIT=6000;
  var FLIP_MS=420;
  var RESET_STEP=36;
  var roundResetGeneration=0;
  var roundResetTimers=[];
  var roundResetPending=false;
  function q(id){return document.getElementById(id)}
  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function toNano(value){return Math.max(0,Math.floor((Number(String(value||'').replace(',','.'))||0)*NANO))}
  function fromNano(value){var ton=Math.max(0,Math.floor(Number(value)||0))/NANO;return ton.toFixed(2)}
  function preload(url){if(!url)return;var img=new Image();img.decoding='async';img.src=url;if(img.decode)img.decode().catch(function(){})}
  function imageEl(kind){var img=document.createElement('img');var src=kind==='bomb'?tileImages.bomb:tileImages.safe;img.decoding='async';img.loading='eager';img.alt=kind==='bomb'?'Mine':'Safe';if(src)img.src=src;img.onerror=function(){img.remove()};return img}
  function applyImages(data){if(!data)return;if(data.minesSafeUrl)tileImages.safe=data.minesSafeUrl;if(data.minesBombUrl)tileImages.bomb=data.minesBombUrl;preload(tileImages.safe);preload(tileImages.bomb);primeBoardImages()}
  function loadImages(){
    if(imageLoadPromise)return imageLoadPromise;
    imageLoadPromise=fetch('/app/api/uploaded-images?context=mines',{credentials:'same-origin',cache:'no-store'})
      .then(function(r){return r.ok?r.json():null})
      .then(function(data){if(data)applyImages(data);return data})
      .catch(function(){return null});
    return imageLoadPromise;
  }
  function tone(freq,duration,type,gain){try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();var osc=audioCtx.createOscillator();var vol=audioCtx.createGain();osc.type=type||'sine';osc.frequency.value=freq;vol.gain.value=0.0001;osc.connect(vol);vol.connect(audioCtx.destination);var now=audioCtx.currentTime;vol.gain.exponentialRampToValueAtTime(gain||0.035,now+0.012);vol.gain.exponentialRampToValueAtTime(0.0001,now+duration);osc.start(now);osc.stop(now+duration+0.02)}catch(e){}}
  function sound(name){if(name==='start'){tone(240,.09,'sine',.026);setTimeout(function(){tone(360,.11,'sine',.026)},55)}else if(name==='safe'){tone(520,.075,'triangle',.022);setTimeout(function(){tone(720,.08,'triangle',.018)},38)}else if(name==='mine'){tone(120,.18,'sawtooth',.026);setTimeout(function(){tone(72,.24,'sine',.022)},70)}else if(name==='cash'){tone(620,.08,'triangle',.025);setTimeout(function(){tone(880,.1,'triangle',.022)},55);setTimeout(function(){tone(1180,.12,'sine',.018)},120)}}
  function readTonBalance(){return window.VexaTonBalance?Math.max(0,Math.floor(Number(window.VexaTonBalance.read())||0)):0}
  function syncServerBalance(data){var value=Number(data&&data.tonBalanceNano);if(!Number.isFinite(value))return;if(window.VexaTonBalance&&typeof window.VexaTonBalance.write==='function')window.VexaTonBalance.write(Math.max(0,Math.floor(value)),0,false)}
  function addGameXp(amount,source,metadata){
    if(!window.VexaLevel||typeof window.VexaLevel.add!=='function')return;
    window.VexaLevel.add(amount,source,Object.assign({game:'mines'},metadata||{}));
  }
  function friendRoundResult(data){var room=data&&data.room||{};var board=data&&data.board||{};var revealed=board.revealed||[];var result={winnerRole:room.winnerRole||null,isDraw:Boolean(room.isDraw)};if(result.winnerRole||result.isDraw)return result;var last=revealed[revealed.length-1];if(last&&last.result==='hidden'&&last.byRole){result.winnerRole=last.byRole==='host'?'guest':'host';return result}var hostSafe=0,guestSafe=0;revealed.forEach(function(item){if(item.result==='safe'&&item.byRole==='host')hostSafe++;if(item.result==='safe'&&item.byRole==='guest')guestSafe++});if(hostSafe===guestSafe)result.isDraw=true;else result.winnerRole=hostSafe>guestSafe?'host':'guest';return result}
  function minSafePicksForCollect(){return state.mines<=5?2:1}
  function hideOldNotice(){var old=q('minesFriendNotice')||q('minesToast');if(old){old.style.setProperty('display','none','important');old.style.setProperty('opacity','0','important')}}
  function currentMultiplierText(){return state.multiplier.toFixed(2)+'x'}
  function applyDisplayText(text,isStatus){var mx=q('minesMultiplier');if(!mx)return;hideOldNotice();text=String(text||currentMultiplierText());mx.classList.toggle('mines-status-label',!!isStatus);if(mx.textContent!==text){var generation=++displayGeneration;clearTimeout(displayTimer);mx.classList.remove('mines-status-fade');var begin=function(){if(generation!==displayGeneration)return;mx.classList.add('mines-status-fade');displayTimer=setTimeout(function(){if(generation!==displayGeneration)return;mx.textContent=text;mx.classList.remove('mines-status-fade')},140)};if(window.requestAnimationFrame)requestAnimationFrame(begin);else setTimeout(begin,16)}}
  function setStatus(text){text=String(text||'').trim();if(!text)return;statusMessage=text;statusUntil=Date.now()+2300;clearTimeout(statusTimer);applyDisplayText(statusMessage,true);statusTimer=setTimeout(function(){statusMessage='';setMultiplierText()},2350)}
  function clearStatus(){statusMessage='';statusUntil=0;clearTimeout(statusTimer);setMultiplierText()}
  function setFriendStatus(text){text=text||'';var el=q('minesFriendStatus');if(el)el.textContent=text;if(text&&text!==lastFriendMessage)setStatus(text);lastFriendMessage=text}
  function setMultiplierText(){var mx=q('minesMultiplier');if(!mx)return;var showStatus=statusMessage&&Date.now()<statusUntil;var next=showStatus?statusMessage:currentMultiplierText();if(!showStatus)lastMultiplierText=next;applyDisplayText(next,showStatus);var view=q('mines');if(view){view.classList.toggle('playing',state.active||friendMode);view.classList.toggle('is-friend-mode',friendMode)}}
  function setBetNano(nano){if(state.active||state.busy)return;var amount=q('minesBet');state.amountNano=clamp(Math.floor(Number(nano)||0),1,999999999999999);if(amount)amount.value=fromNano(state.amountNano);setMultiplierText()}
  function refresh(){var amount=q('minesBet');var count=q('minesCount');if(!friendMode&&!state.active&&!state.busy){state.amountNano=clamp(toNano(amount&&amount.value),1,999999999999999);state.mines=clamp(Math.floor(Number(count&&count.value)||3),1,20)}if(amount){amount.setAttribute('step','0.01');amount.value=fromNano(state.amountNano);amount.disabled=friendMode||state.active||state.busy}if(count){count.value=String(state.mines);count.disabled=friendMode||state.active||state.busy}setMultiplierText();var start=q('minesStart');if(start){start.textContent=friendMode?'Friend Round':state.active?'Playing':'Start Round';start.disabled=friendMode||state.active||state.busy}var cash=q('minesCashout');if(cash)cash.disabled=friendMode||state.busy||!state.active||state.revealed<minSafePicksForCollect();var invite=q('minesInviteFriend');if(invite)invite.disabled=friendBusy||state.active||state.busy;var exit=q('minesFriendExit');if(exit)exit.style.display=friendMode?'block':'none'}
  function tileKind(i){return state.ended&&state.bombs[i]?'bomb':'safe'}
  function boardTiles(){var board=q('minesBoard');return board?Array.prototype.slice.call(board.querySelectorAll('[data-mine-cell]')):[]}
  function setTileBack(tile,kind){var back=tile&&tile.querySelector&&tile.querySelector('.mine-tile-back');if(!back)return;var src=kind==='bomb'?tileImages.bomb:tileImages.safe;var img=back.querySelector('img');if(back.getAttribute('data-kind')===kind&&img&&img.getAttribute('src')===src)return;back.setAttribute('data-kind',kind);if(!img){back.textContent='';img=imageEl(kind);back.appendChild(img);return}img.alt=kind==='bomb'?'Mine':'Safe';if(src&&img.getAttribute('src')!==src)img.src=src}
  function primeBoardImages(){boardTiles().forEach(function(tile){var i=Number(tile.getAttribute('data-mine-cell'));setTileBack(tile,tileKind(i))})}
  function markFlipping(tile){if(!tile)return;tile.classList.add('is-flipping');clearTimeout(tile.__minesFlipTimer);tile.__minesFlipTimer=setTimeout(function(){tile.classList.remove('is-flipping');tile.__minesFlipTimer=0},FLIP_MS+90)}
  function buildBoard(){var board=q('minesBoard');if(!board)return;var existing=board.querySelectorAll('[data-mine-cell]');if(existing.length===size)return;board.textContent='';var frag=document.createDocumentFragment();for(var i=0;i<size;i++){var b=document.createElement('button');var card=document.createElement('span');var front=document.createElement('span');var back=document.createElement('span');b.type='button';b.className='mine-tile';b.setAttribute('data-mine-cell',String(i));b.setAttribute('aria-label','Unrevealed tile');card.className='mine-tile-card';front.className='mine-tile-face mine-tile-front';back.className='mine-tile-face mine-tile-back';card.appendChild(front);card.appendChild(back);b.appendChild(card);setTileBack(b,'safe');frag.appendChild(b)}board.appendChild(frag)}
  function resetBoardForRound(){buildBoard();boardTiles().forEach(function(tile){clearTimeout(tile.__minesFlipTimer);tile.__minesFlipTimer=0;tile.classList.remove('revealed','safe','bomb','is-flipping','is-pending');tile.disabled=false;tile.setAttribute('aria-label','Unrevealed tile');setTileBack(tile,'safe')})}
  function revealTile(tile,kind){if(!tile||tile.classList.contains('revealed'))return;setTileBack(tile,kind);tile.disabled=true;tile.setAttribute('aria-label',kind==='bomb'?'Mine tile':'Safe tile');markFlipping(tile);tile.classList.add('revealed',kind==='bomb'?'bomb':'safe')}
  function revealAll(){boardTiles().forEach(function(tile){var i=Number(tile.getAttribute('data-mine-cell'));revealTile(tile,state.bombs[i]?'bomb':'safe')})}
  function revealMines(){boardTiles().forEach(function(tile){var i=Number(tile.getAttribute('data-mine-cell'));if(state.bombs[i])revealTile(tile,'bomb');else tile.disabled=true})}
  function resetLater(fn,ms){var id=setTimeout(fn,ms);roundResetTimers.push(id);return id}
  function clearRoundResetTimers(){roundResetTimers.forEach(clearTimeout);roundResetTimers=[]}
  function cancelRoundReset(){roundResetGeneration++;clearRoundResetTimers();roundResetPending=false;var root=q('mines');if(root){root.removeAttribute('data-round-reset');root.classList.remove('mines-resetting')}}
  function revealRemainingForReset(generation){var hidden=boardTiles().filter(function(tile){return !tile.classList.contains('revealed')});hidden.forEach(function(tile,index){resetLater(function(){if(generation!==roundResetGeneration)return;setTileBack(tile,'safe');tile.disabled=true;tile.setAttribute('aria-label','Safe tile');markFlipping(tile);tile.classList.add('revealed','safe')},index*RESET_STEP)});return hidden.length?((hidden.length-1)*RESET_STEP+FLIP_MS):FLIP_MS}
  function beginFlipBack(generation){if(generation!==roundResetGeneration)return;var root=q('mines');var list=boardTiles();if(root)root.classList.add('mines-resetting');list.slice().reverse().forEach(function(tile,index){resetLater(function(){if(generation!==roundResetGeneration)return;markFlipping(tile);tile.classList.remove('revealed')},index*RESET_STEP)});var end=Math.max(0,list.length-1)*RESET_STEP+FLIP_MS;resetLater(function(){if(generation!==roundResetGeneration)return;list.forEach(function(tile){clearTimeout(tile.__minesFlipTimer);tile.__minesFlipTimer=0;tile.classList.remove('safe','bomb','is-flipping','is-pending');tile.disabled=false;tile.setAttribute('aria-label','Unrevealed tile');setTileBack(tile,'safe')});if(root){root.classList.remove('mines-resetting');root.removeAttribute('data-round-reset')}roundResetPending=false;refresh();try{if(root)root.dispatchEvent(new CustomEvent('vexa:mines-board-reset'))}catch(e){}},end)}
  function scheduleRoundReset(){if(friendMode||roundResetPending)return;roundResetPending=true;clearRoundResetTimers();var generation=++roundResetGeneration;var root=q('mines');if(root)root.setAttribute('data-round-reset','1');var revealEnd=revealRemainingForReset(generation);resetLater(function(){beginFlipBack(generation)},revealEnd+RESET_WAIT)}
  function telegramInitData(){var t=tg();return t?String(t.initData||''):''}
  function soloSocketUrl(){return(location.protocol==='https:'?'wss:':'ws:')+'//'+location.host+'/app/api/mines/solo/live'}
  function rejectSoloPending(error){var message=error instanceof Error?error:new Error(String(error||'Mines connection closed'));Object.keys(soloPending).forEach(function(id){var item=soloPending[id];delete soloPending[id];clearTimeout(item.timer);item.reject(message)})}
  function closeSoloSocket(){var ws=soloSocket;soloSocket=null;soloSocketReady=null;soloSocketAuthed=false;rejectSoloPending(new Error('Mines connection closed'));if(ws){try{ws.onclose=null;ws.close(1000,'mode change')}catch(e){}}}
  function ensureSoloSocket(){
    if(soloSocket&&soloSocket.readyState===WebSocket.OPEN&&soloSocketAuthed)return Promise.resolve(soloSocket);
    if(soloSocketReady)return soloSocketReady;
    soloSocketReady=new Promise(function(resolve,reject){
      var ws;
      try{ws=new WebSocket(soloSocketUrl())}catch(error){soloSocketReady=null;reject(error);return}
      soloSocket=ws;soloSocketAuthed=false;
      var authTimer=setTimeout(function(){try{ws.close()}catch(e){};if(soloSocket===ws){soloSocket=null;soloSocketReady=null;soloSocketAuthed=false}reject(new Error('Mines connection timeout'))},6000);
      ws.onopen=function(){try{ws.send(JSON.stringify({type:'auth',initData:telegramInitData()}))}catch(error){clearTimeout(authTimer);reject(error)}};
      ws.onmessage=function(event){var message;try{message=JSON.parse(String(event.data||''))}catch(e){return}if(message.type==='auth'){clearTimeout(authTimer);if(message.ok){soloSocketAuthed=true;resolve(ws)}else{soloSocketAuthed=false;soloSocketReady=null;reject(new Error(message.error||'Mines authentication failed'))}return}if(message.type==='response'&&message.id){var pending=soloPending[message.id];if(!pending)return;delete soloPending[message.id];clearTimeout(pending.timer);if(message.ok)pending.resolve(message.data||{});else pending.reject(new Error(message.error||'Mines request failed'))}};
      ws.onerror=function(){};
      ws.onclose=function(){clearTimeout(authTimer);if(soloSocket===ws){soloSocket=null;soloSocketReady=null;soloSocketAuthed=false}rejectSoloPending(new Error('Mines connection closed'))};
    });
    return soloSocketReady;
  }
  function soloCall(type,body){return ensureSoloSocket().then(function(ws){return new Promise(function(resolve,reject){var requestId='m'+(++soloSocketSeq).toString(36)+Date.now().toString(36);var timer=setTimeout(function(){delete soloPending[requestId];reject(new Error('Mines request timeout'))},8000);soloPending[requestId]={resolve:resolve,reject:reject,timer:timer};try{ws.send(JSON.stringify(Object.assign({type:type,id:requestId},body||{})))}catch(error){clearTimeout(timer);delete soloPending[requestId];reject(error)}})})}
  function applySoloState(data){if(!data||!data.roundId)return;state.roundId=String(data.roundId||'');state.active=data.status==='active';state.ended=!state.active;state.amountNano=Math.max(1,Math.floor(Number(data.amountNano)||state.amountNano));state.mines=clamp(Math.floor(Number(data.mineCount)||state.mines),1,20);state.revealed=Math.max(0,Math.floor(Number(data.revealedCount)||0));state.multiplier=Math.max(1,Number(data.multiplier)||1);state.safe={};(Array.isArray(data.revealedCells)?data.revealedCells:[]).forEach(function(cell){var i=Number(cell);if(Number.isInteger(i))state.safe[i]=true});state.bombs={};(Array.isArray(data.bombs)?data.bombs:[]).forEach(function(cell){var i=Number(cell);if(Number.isInteger(i))state.bombs[i]=true});syncServerBalance(data)}
  function renderSoloRevealed(data){(Array.isArray(data&&data.revealedCells)?data.revealedCells:[]).forEach(function(cell){var tile=document.querySelector('[data-mine-cell="'+Number(cell)+'"]');revealTile(tile,'safe')})}
  function restoreSoloBoard(data){cancelRoundReset();resetBoardForRound();applySoloState(data);renderSoloRevealed(data);if(data.status==='cashed_out')revealAll();else if(data.status==='lost')revealMines();refresh()}
  function loadSoloState(){if(friendMode)return Promise.resolve();return soloCall('state',{}).then(function(data){if(friendMode||!data)return;if(data.active||data.status==='cashed_out')restoreSoloBoard(data)}).catch(function(){})}
  function start(){
    refresh();
    if(friendMode||state.active||state.busy)return;
    if(readTonBalance()<state.amountNano){setStatus('Not enough points');return}
    if(roundResetPending)cancelRoundReset();
    clearStatus();state.busy=true;refresh();
    soloCall('start',{amountNano:state.amountNano,mineCount:state.mines})
      .then(function(data){resetBoardForRound();applySoloState(data);renderSoloRevealed(data);if(data.started){sound('start');xpRoundActive=true;xpRoundFinished=false;addGameXp(2,'game-start',{action:'start'})}else{xpRoundActive=true;xpRoundFinished=false}})
      .catch(function(error){setStatus(error&&error.message||'Could not start round')})
      .finally(function(){state.busy=false;refresh()});
  }
  function cashout(){
    if(friendMode||state.busy||!state.active||state.revealed<minSafePicksForCollect()||!state.roundId)return;
    clearStatus();state.busy=true;refresh();
    soloCall('collect',{roundId:state.roundId})
      .then(function(data){applySoloState(data);sound('cash');revealAll();if(xpRoundActive&&!xpRoundFinished){xpRoundFinished=true;addGameXp(state.multiplier<2?15:25,'game-win',{result:'cashout',multiplier:Number(state.multiplier.toFixed(2))})}setStatus('Result +' + fromNano(Number(data.payoutNano)||0));scheduleRoundReset()})
      .catch(function(error){setStatus(error&&error.message||'Could not collect')})
      .finally(function(){state.busy=false;refresh()});
  }
  function hit(cell){
    if(friendMode){friendHit(cell);return}
    if(!state.active||state.ended||state.busy||!state.roundId)return;
    var i=Number(cell.getAttribute('data-mine-cell'));
    if(!Number.isInteger(i)||state.safe[i]||cell.classList.contains('revealed'))return;
    clearStatus();state.busy=true;cell.disabled=true;refresh();
    soloCall('reveal',{roundId:state.roundId,cell:i})
      .then(function(data){var fresh=data&&data.newReveal!==false;applySoloState(data);renderSoloRevealed(data);if(data.result==='mine'&&data.status==='lost'){if(fresh)sound('mine');revealMines();if(fresh&&xpRoundActive&&!xpRoundFinished){xpRoundFinished=true;addGameXp(5,'game-lose',{result:'mine'})}setStatus('Mine found');scheduleRoundReset();return}if(data.result==='safe'&&fresh){sound('safe');addGameXp(1,'game-action',{action:'safe-tile',revealed:state.revealed})}if(data.status==='cashed_out'){sound('cash');revealAll();if(xpRoundActive&&!xpRoundFinished){xpRoundFinished=true;addGameXp(state.multiplier<2?15:25,'game-win',{result:'cashout',multiplier:Number(state.multiplier.toFixed(2))})}setStatus('Result +' + fromNano(Number(data.payoutNano)||0));scheduleRoundReset()}})
      .catch(function(error){cell.disabled=false;setStatus(error&&error.message||'Could not select tile')})
      .finally(function(){state.busy=false;refresh()});
  }
  function tg(){return window.Telegram&&window.Telegram.WebApp}
  function user(){var t=tg();var u=(t&&t.initDataUnsafe&&t.initDataUnsafe.user)||{};var id=String(u.id||localStorage.getItem('ownerId')||'').replace(/[^0-9A-Za-z_-]/g,'').slice(0,80);if(!id){id=localStorage.getItem('minesFriendUserId')||('local_'+Math.random().toString(36).slice(2)+Date.now().toString(36));localStorage.setItem('minesFriendUserId',id)}var name=String(u.first_name||u.username||localStorage.getItem('ownerName')||'Player').replace(/[<>]/g,'').slice(0,80);return{id:id,name:name||'Player'}}
  function api(path,opt){var options=Object.assign({credentials:'same-origin',cache:'no-store'},opt||{});options.headers=Object.assign({'content-type':'application/json','x-telegram-init-data':telegramInitData()},options.headers||{});return fetch(path,options).then(function(r){return r.json().catch(function(){return{error:'Invalid response'}}).then(function(j){if(!r.ok)throw new Error(j.error||'Request failed');return j})})}
  function minesStartParam(roomId){return 'minesroom_'+String(roomId||'').replace(/[^0-9A-Za-z_-]/g,'').slice(0,80)}
  function inviteUrl(roomId){var url=new URL(location.href);url.searchParams.set('minesRoom',roomId);url.searchParams.set('startapp',minesStartParam(roomId));url.searchParams.delete('open');return url.toString()}
  function shareFallback(link,text){var share='https://t.me/share/url?url='+encodeURIComponent(link)+'&text='+encodeURIComponent(text||'Join my friend round in Vexa.');var t=tg();try{if(t&&typeof t.openTelegramLink==='function'){t.openTelegramLink(share);return true}}catch(e){}try{if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(link);setFriendStatus('Invite link copied');return true}}catch(e){}var field=q('minesFriendLink');if(field){field.value=link;field.select();document.execCommand&&document.execCommand('copy');setFriendStatus('Invite link copied');return true}return false}
  function showMinesFromInvite(){document.querySelectorAll('.view').forEach(function(n){n.classList.remove('active')});var root=q('mines');if(root)root.classList.add('active');document.querySelectorAll('.tab').forEach(function(n){n.classList.toggle('active',n.getAttribute('data-view')==='mines')});var title=document.getElementById('brandTitle');if(title)title.textContent='Mines'}
  function enterFriendMode(data){closeSoloSocket();cancelRoundReset();lastFriendMessage='';friendMode=true;friendState=data||friendState;friendCreditBlocked=false;state.active=false;state.ended=false;state.busy=false;state.roundId='';state.bombs={};state.safe={};state.revealed=0;state.multiplier=1;renderFriendState(data);requestFriendSync(true);refresh()}
  function leaveFriendMode(message){cancelRoundReset();lastFriendMessage='';friendMode=false;friendState=null;friendBusy=false;friendCreditBlocked=false;stopPolling();state.active=false;state.ended=false;state.busy=false;state.roundId='';state.bombs={};state.safe={};state.revealed=0;state.multiplier=1;resetBoardForRound();setFriendStatus(message||'');refresh();loadSoloState()}
  function friendCanPick(){var room=friendState&&friendState.room;return friendMode&&!friendBusy&&!friendCreditBlocked&&room&&room.status==='active'&&room.hasGuest&&room.isYourTurn&&friendState.youHavePoints!==false&&friendState.friendHasPoints!==false}
  function renderFriendResult(data){var room=data&&data.room||{};var player=data&&data.player||{};var result=friendRoundResult(data);if(result.isDraw)return 'Draw — points returned';if(result.winnerRole&&result.winnerRole===player.role)return 'You finished first — points are yours';if(result.winnerRole)return 'Friend finished first — points are theirs';if(room.finishedReason==='returned')return 'Points returned';return 'Round complete'}
  function renderFriendState(data){if(!data||!data.room){refresh();return}syncServerBalance(data);friendState=data;var room=data.room,board=data.board||{};if(room.status==='expired'||(data.player&&data.player.role==='spectator')){leaveFriendMode(room.status==='expired'?'Room expired':'Could not join room');return}var field=q('minesFriendLink');if(field)field.value=inviteUrl(room.id);state.amountNano=Number(room.amountNano||state.amountNano||10000000);state.mines=Number(room.mineCount||3);friendCreditBlocked=data.youHavePoints===false;state.bombs={};state.safe={};state.revealed=0;boardTiles().forEach(function(tile){tile.disabled=true;tile.classList.remove('revealed','safe','bomb','is-flipping','is-pending');tile.setAttribute('aria-label','Unrevealed tile');setTileBack(tile,'safe')});(board.revealed||[]).forEach(function(item){var tile=document.querySelector('[data-mine-cell="'+item.cell+'"]');if(item.result==='safe'){state.safe[item.cell]=true;state.revealed++;revealTile(tile,'safe')}else revealTile(tile,'bomb')});if(room.status==='finished'||room.status==='expired'){(board.hiddenCells||[]).forEach(function(cell){var tile=document.querySelector('[data-mine-cell="'+cell+'"]');revealTile(tile,'bomb')})}else if(friendCanPick()){boardTiles().forEach(function(tile){if(!tile.classList.contains('revealed'))tile.disabled=false})}var msg='';if(room.status==='finished')msg=renderFriendResult(data);else if(data.youHavePoints===false||friendCreditBlocked)msg='You need more points for this friend round';else if(data.friendHasPoints===false)msg='Friend needs more points for this friend round';else if(room.status==='active'&&room.isYourTurn)msg='Your turn';else if(room.status==='active')msg='Friend turn';else if(room.hasGuest)msg='Friend joined';setFriendStatus(msg);refresh()}
  function sendFriendReady(data){var room=data&&data.room;if(!friendMode||!room||!room.id||data.youReady===true)return Promise.resolve(data);var u=user();return api('/app/api/mines/friend/rooms/'+encodeURIComponent(room.id)+'/ready',{method:'POST',body:JSON.stringify({userId:u.id,name:u.name})}).catch(function(){return data})}
  function syncFriend(){if(!friendMode||!friendState||!friendState.room||!q('mines')||!q('mines').classList.contains('active'))return Promise.resolve();var u=user();return api('/app/api/mines/friend/rooms/'+encodeURIComponent(friendState.room.id)+'?userId='+encodeURIComponent(u.id)).then(sendFriendReady).then(renderFriendState).catch(function(e){leaveFriendMode(e.message||'Sync failed')})}
  function requestFriendSync(force){if(!friendMode||!friendState||!friendState.room)return Promise.resolve();var now=Date.now();if(!force&&now-friendLastSyncAt<1200)return Promise.resolve();if(friendSyncing){friendSyncQueued=Boolean(force||friendSyncQueued);return Promise.resolve()}friendSyncing=true;friendLastSyncAt=now;return syncFriend().finally(function(){friendSyncing=false;if(friendSyncQueued){friendSyncQueued=false;requestFriendSync(true)}})}
  function startPolling(){requestFriendSync(true)}
  function stopPolling(){friendSyncing=false;friendSyncQueued=false;friendLastSyncAt=0}
  function shareInvite(){if(!friendState||!friendState.room)return;var roomId=friendState.room.id;var link=inviteUrl(roomId);var text='Join my friend round in Vexa.';var field=q('minesFriendLink');if(field)field.value=link;setFriendStatus('Preparing invite...');var u=user();api('/app/api/mines/friend/rooms/'+encodeURIComponent(roomId)+'/share',{method:'POST',body:JSON.stringify({userId:u.id,name:u.name})}).then(function(data){var invite=data.inviteUrl||link;if(field)field.value=invite;var t=tg();if(data.preparedMessageId&&t&&typeof t.shareMessage==='function'){try{var sent=t.shareMessage(data.preparedMessageId);if(sent&&typeof sent.then==='function')sent.catch(function(){shareFallback(invite,data.fallbackText||text)});setFriendStatus('Choose a chat to send the invite');return}catch(e){}}shareFallback(invite,data.fallbackText||text)}).catch(function(){shareFallback(link,text)}).finally(function(){requestFriendSync(true)})}
  function createFriendRoom(){if(friendBusy||state.active||state.busy)return;refresh();if(readTonBalance()<state.amountNano){setFriendStatus('You need more points for this friend round');return}friendBusy=true;setFriendStatus('Creating friend room...');var u=user();api('/app/api/mines/friend/rooms',{method:'POST',body:JSON.stringify({userId:u.id,name:u.name,amountNano:state.amountNano,mineCount:state.mines})}).then(function(data){enterFriendMode(data);shareInvite()}).catch(function(e){leaveFriendMode(e.message||'Could not create room')}).finally(function(){friendBusy=false;refresh()})}
  function joinFriendRoom(roomId){if(friendBusy||!roomId)return;friendBusy=true;setFriendStatus('Joining friend room...');var u=user();api('/app/api/mines/friend/rooms/'+encodeURIComponent(roomId)+'/join',{method:'POST',body:JSON.stringify({userId:u.id,name:u.name})}).then(enterFriendMode).catch(function(e){leaveFriendMode((e.message||'Could not join room'))}).finally(function(){friendBusy=false;refresh()})}
  function friendHit(cell){if(!friendCanPick())return;var i=Number(cell.getAttribute('data-mine-cell'));if(!Number.isInteger(i))return;friendBusy=true;cell.disabled=true;var u=user();api('/app/api/mines/friend/rooms/'+encodeURIComponent(friendState.room.id)+'/reveal',{method:'POST',body:JSON.stringify({userId:u.id,name:u.name,cell:i})}).then(function(data){var before=friendState&&friendState.board&&friendState.board.revealed?friendState.board.revealed.length:0;var result='safe';if(data&&data.board&&data.board.revealed){var latest=data.board.revealed[data.board.revealed.length-1];if(latest&&latest.result==='hidden')result='mine'}renderFriendState(data);var after=data&&data.board&&data.board.revealed?data.board.revealed.length:before;if(after>before)sound(result)}).catch(function(e){setFriendStatus(e.message||'Could not select tile');requestFriendSync(true)}).finally(function(){friendBusy=false;refresh()})}
  function startRoomFromParams(){var roomId='';try{var t=tg();var qs=new URLSearchParams(location.search);roomId=qs.get('minesRoom')||'';var start=(t&&t.initDataUnsafe&&t.initDataUnsafe.start_param)||qs.get('startapp')||qs.get('tgWebAppStartParam')||'';if(!roomId&&start){start=String(start);if(start.indexOf('minesroom_')===0)roomId=start.slice(10);else if(start.indexOf('mines_')===0)roomId=start}}catch(e){}if(roomId){showMinesFromInvite();setTimeout(function(){joinFriendRoom(roomId)},120)}return roomId}
  function bind(){buildBoard();loadImages();refresh();window.addEventListener('vexa-ton-balance-sync',refresh);window.addEventListener('vexa-mines-images-sync',function(ev){if(!ev||!ev.detail)return;applyImages({minesSafeUrl:ev.detail.safeUrl,minesBombUrl:ev.detail.bombUrl})});window.addEventListener('beforeunload',function(){stopPolling();closeSoloSocket()});window.addEventListener('focus',function(){if(friendMode)requestFriendSync(false);else if(state.active)loadSoloState()});document.addEventListener('visibilitychange',function(){if(document.visibilityState==='visible'){if(friendMode)requestFriendSync(false);else if(state.active)loadSoloState()}});if(window.MutationObserver)new MutationObserver(function(){if(friendMode&&q('mines')&&q('mines').classList.contains('active'))requestFriendSync(true)}).observe(q('mines'),{attributes:true,attributeFilter:['class']});var amount=q('minesBet');var count=q('minesCount');if(amount)amount.addEventListener('input',refresh);if(count)count.addEventListener('change',refresh);var invite=q('minesInviteFriend');if(invite)invite.addEventListener('click',function(){if(friendMode)shareInvite();else createFriendRoom()});var exit=q('minesFriendExit');if(exit)exit.addEventListener('click',function(){leaveFriendMode('Solo mode')});document.addEventListener('click',function(ev){var open=ev.target&&ev.target.closest&&ev.target.closest('[data-game-view="mines"],[data-view="mines"]');if(open){setTimeout(loadImages,120);setTimeout(function(){if(friendMode)requestFriendSync(true);else ensureSoloSocket().catch(function(){})},140)}var quick=ev.target&&ev.target.closest&&ev.target.closest('[data-mines-action]');if(quick){if(friendMode||state.active||state.busy)return;var action=quick.getAttribute('data-mines-action');tone(260,.045,'sine',.014);refresh();if(action==='bet-half')setBetNano(Math.max(1,Math.floor(state.amountNano/2)));else if(action==='bet-double')setBetNano(state.amountNano*2);refresh();return}var startBtn=ev.target&&ev.target.closest&&ev.target.closest('#minesStart');if(startBtn){start();return}var cash=ev.target&&ev.target.closest&&ev.target.closest('#minesCashout');if(cash){cashout();return}var tile=ev.target&&ev.target.closest&&ev.target.closest('[data-mine-cell]');if(tile){hit(tile)}});var friendRoom=startRoomFromParams();if(!friendRoom)loadSoloState()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
`;