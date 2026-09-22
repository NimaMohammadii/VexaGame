export const SHELL_GAME_SECTION = `
<section id="shellgame" class="view shell-game-view" aria-label="Shell Game">
  <style>
    body:has(#shellgame.active) .tabs{display:none!important}
    body:has(#shellgame.active) .content{height:calc(100dvh - 52px - env(safe-area-inset-top))!important;overflow:hidden!important}
    html body:has(#shellgame.active.has-admin-background){isolation:isolate!important;background:#000!important}
    html body:has(#shellgame.active.has-admin-background)::before{content:''!important;display:block!important;position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;z-index:-1!important;pointer-events:none!important;background-color:#030202!important;background-image:var(--admin-shellgame-background-image)!important;background-size:cover!important;background-position:center top!important;background-repeat:no-repeat!important}
    html body:has(#shellgame.active.has-admin-background)::after,html body:has(#shellgame.active.has-admin-background) .app::before,html body:has(#shellgame.active.has-admin-background) .app::after{display:none!important;content:none!important;background:none!important;background-image:none!important}
    html body:has(#shellgame.active.has-admin-background) .app,html body:has(#shellgame.active.has-admin-background) main.app,html body:has(#shellgame.active.has-admin-background) .content,html body:has(#shellgame.active.has-admin-background) #shellgame.shell-game-view,html body:has(#shellgame.active.has-admin-background) .top,html body:has(#shellgame.active.has-admin-background) header.top{background:transparent!important;background-color:transparent!important;background-image:none!important}
    .shell-game-view{height:calc(100dvh - 52px - env(safe-area-inset-top));padding:0 10px max(22px,env(safe-area-inset-bottom));box-sizing:border-box;overflow-x:hidden;overflow-y:auto;background-color:#030202;color:#fff;scrollbar-width:none;-webkit-overflow-scrolling:touch}
    .shell-game-view::-webkit-scrollbar{display:none}
    .shell-game-wrap{width:min(100%,520px);margin:0 auto;padding:8px 0 24px;display:grid;gap:12px}
    .shell-game-hero{position:relative;height:430px;border:0;border-radius:0;overflow:visible;background:transparent;box-shadow:none}
    .shell-game-hero:after{content:none;display:none}
    .shell-game-head{position:absolute;z-index:7;left:14px;right:14px;top:14px;height:60px;display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:10px}
    .shell-game-title{grid-column:2;min-width:0;text-align:center;color:#f5dfcb;text-shadow:0 3px 16px rgba(0,0,0,.7)}
    .shell-game-title strong{display:flex;align-items:center;justify-content:center;gap:8px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1;font-weight:700;letter-spacing:-.035em;white-space:nowrap}
    .shell-game-title strong i{font-style:normal;font-size:27px;color:#d7a779}
    .shell-game-title small{display:block;margin-top:8px;font-size:7px;line-height:1;font-weight:800;letter-spacing:.42em;color:rgba(241,207,180,.62);white-space:nowrap}
    .shell-game-multiplier{grid-column:3;height:42px;padding:0 14px;border:1px solid rgba(255,76,111,.5);border-radius:15px;display:flex;align-items:center;background:linear-gradient(145deg,rgba(121,22,43,.86),rgba(47,8,18,.84));box-shadow:inset 0 1px 0 rgba(255,202,211,.13),0 8px 22px rgba(0,0,0,.3);color:#ffd9df;font-size:13px;font-weight:850;white-space:nowrap;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}
    .shell-game-status{position:absolute;z-index:7;left:15%;right:15%;top:85px;min-height:18px;text-align:center;color:rgba(255,236,224,.72);font-size:11px;font-weight:800;letter-spacing:.01em;text-shadow:0 3px 9px #000}
    .shell-game-status.win{color:#78efae}.shell-game-status.lose{color:#ff91a7}
    .shell-game-arena{position:absolute;z-index:3;left:0;right:0;bottom:64px;height:275px;perspective:900px;transform:translateY(-20px)}
    .shell-cup-button{--slot-x:0px;--cup-lift:0px;position:absolute;left:50%;bottom:14px;width:34%;max-width:152px;height:190px;padding:0;border:0;background:transparent;color:#f8d8bb;transform:translateX(calc(-50% + var(--slot-x))) translateY(var(--cup-lift));transition:transform .32s cubic-bezier(.2,.76,.24,1),filter .2s ease;z-index:4;-webkit-tap-highlight-color:transparent}
    .shell-cup-button[data-slot="0"]{--slot-x:max(-31vw,-132px)}
    .shell-cup-button[data-slot="1"]{--slot-x:0px}
    .shell-cup-button[data-slot="2"]{--slot-x:min(31vw,132px)}
    .shell-cup-button.selectable{cursor:pointer;filter:brightness(1.04)}
    .shell-cup-button.selectable:active{transform:translateX(calc(-50% + var(--slot-x))) translateY(-5px) scale(.975);filter:brightness(1.17)}
    .shell-cup-button.lifted{--cup-lift:-66px}
    .shell-cup{position:absolute;left:50%;bottom:120px;width:80%;height:auto;object-fit:contain;transform:translateX(-50%);filter:none;pointer-events:none}
    .shell-cup-number{position:absolute;z-index:2;left:50%;bottom:126px;transform:translateX(-50%);font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:700;color:#f3d5b7;text-shadow:0 2px 5px #000;pointer-events:none}
    .shell-ball{position:absolute;left:50%;bottom:18px;width:30px;height:30px;border-radius:50%;transform:translateX(-50%) scale(0);opacity:0;background:radial-gradient(circle at 34% 28%,#fff7ca 0 10%,#ffc640 28%,#d76d00 72%,#5a1b00 100%);box-shadow:0 8px 16px rgba(0,0,0,.7),0 0 20px rgba(255,165,48,.22);transition:left .28s ease,transform .25s ease,opacity .2s ease;z-index:3}
    .shell-ball.visible{transform:translateX(-50%) scale(1);opacity:1}
    .shell-guess{display:flex;align-items:center;justify-content:center;gap:7px;margin:1px 0 0;color:rgba(255,244,237,.86);font-size:13px;font-weight:740}.shell-guess i{font-style:normal;color:#d9a87a}
    .shell-game-controls{padding:13px;border:1px solid rgba(226,188,158,.16);border-radius:23px;background:linear-gradient(145deg,rgba(23,19,18,.88),rgba(6,6,6,.92));box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 16px 38px rgba(0,0,0,.30);transform:translateY(-60px)}
    .shell-control-head{height:28px;margin:0 2px 9px;display:flex;align-items:center;justify-content:space-between;color:rgba(255,255,255,.68);font-size:11px;font-weight:720}
    .shell-balance{height:27px;padding:0 10px;border:1px solid rgba(255,255,255,.10);border-radius:10px;display:flex;align-items:center;gap:7px;background:rgba(0,0,0,.24);color:rgba(255,255,255,.64)}.shell-balance b{color:#fff;font-size:11px;font-weight:850}
    .shell-bet-row{height:58px;display:grid;grid-template-columns:58px minmax(0,1fr) 58px;border:1px solid rgba(226,188,158,.20);border-radius:17px;overflow:hidden;background:rgba(2,2,2,.44)}
    .shell-bet-row button{border:0;background:rgba(255,255,255,.035);color:#fff;font-size:24px;font-weight:450}.shell-bet-row button:first-child{border-right:1px solid rgba(255,255,255,.08)}.shell-bet-row button:last-child{border-left:1px solid rgba(255,255,255,.08)}
    .shell-bet-value{display:flex!important;align-items:center;justify-content:center;gap:9px;font-size:18px!important;font-weight:850!important}.shell-bet-value img{width:29px;height:29px;object-fit:contain}.shell-bet-value small{font-size:13px;color:rgba(255,255,255,.64)}
    .shell-presets{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin-top:10px}.shell-preset{height:34px;border:1px solid rgba(255,255,255,.14);border-radius:999px;background:rgba(255,255,255,.035);color:rgba(255,255,255,.83);font-size:11px;font-weight:760}.shell-preset.active{border-color:rgba(255,83,116,.72);background:linear-gradient(145deg,rgba(115,23,43,.82),rgba(55,9,20,.76));color:#ffe9ed;box-shadow:inset 0 1px 0 rgba(255,220,226,.10)}
    .shell-play-button{width:100%;height:66px;margin-top:12px;padding:0;border:1px solid rgba(255,81,112,.72);border-radius:18px;display:grid;place-items:center;align-content:center;gap:4px;background:linear-gradient(145deg,#a52240,#4f0a1a 68%,#320610);box-shadow:inset 0 1px 0 rgba(255,221,227,.21),0 12px 25px rgba(0,0,0,.28);color:#fff4f5;transition:transform .16s ease,opacity .18s ease}
    .shell-play-main{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:830}.shell-play-main i{font-style:normal;font-size:18px;color:#f7d8c1}.shell-play-button small{font-size:8px;font-weight:750;letter-spacing:.25em;color:rgba(255,211,218,.68)}.shell-play-button:disabled{opacity:.54}.shell-play-button:not(:disabled):active{transform:scale(.985)}
    .shell-info-row{display:grid;grid-template-columns:1.02fr 1.12fr .96fr;gap:8px}.shell-info-card{min-width:0;height:57px;padding:8px 9px;border:1px solid rgba(226,188,158,.15);border-radius:17px;background:linear-gradient(145deg,rgba(27,23,22,.80),rgba(7,7,7,.84));color:rgba(255,255,255,.78);display:flex;align-items:center;gap:8px}.shell-info-card>i{font-style:normal;font-size:21px;color:#e4b183}.shell-info-card span{min-width:0;font-size:9px;font-weight:720;line-height:1.2}.shell-info-card small{display:block;margin-top:4px;font-size:7px;letter-spacing:.04em;color:rgba(255,255,255,.45);white-space:nowrap}.shell-result-dots{display:flex;gap:5px;margin-top:6px}.shell-result-dots i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.17)}.shell-result-dots i.win{background:#35bd72}.shell-result-dots i.lose{background:#be3447}
    @media(max-width:380px){.shell-game-view{padding-left:7px;padding-right:7px}.shell-game-hero{height:405px}.shell-game-head{left:10px;right:10px}.shell-game-title strong{font-size:22px}.shell-game-multiplier{padding:0 10px;font-size:11px}.shell-game-arena{bottom:58px;height:245px}.shell-cup-button{height:166px}.shell-cup-number{font-size:20px}.shell-info-card{padding:7px 6px;gap:5px}.shell-info-card>i{font-size:17px}}
    @media(max-height:720px){.shell-game-hero{height:370px}.shell-game-arena{bottom:48px;height:225px}.shell-cup-button{height:154px}.shell-game-wrap{gap:9px}.shell-game-controls{padding:11px}.shell-info-row{display:none}}
    @media(prefers-reduced-motion:reduce){.shell-cup-button,.shell-ball{transition-duration:.01ms!important}}
  </style>
  <div class="shell-game-wrap">
    <div class="shell-game-hero">
      <div class="shell-game-head">
        <div class="shell-game-title"><strong><i>♠</i>Shell Game</strong><small>TRUST YOUR INSTINCTS</small></div>
        <div class="shell-game-multiplier">Win 2.85×</div>
      </div>
      <div class="shell-game-status" data-shell-status>Press Play Round to begin</div>
      <div class="shell-game-arena" data-shell-arena>
        <div class="shell-ball" data-shell-ball></div>
        <button class="shell-cup-button" type="button" data-shell-cup="0" data-slot="0" aria-label="Cup 1"><img class="shell-cup" src="/assets/shell-game-cup.webp" alt=""/><span class="shell-cup-number">1</span></button>
        <button class="shell-cup-button" type="button" data-shell-cup="1" data-slot="1" aria-label="Cup 2"><img class="shell-cup" src="/assets/shell-game-cup.webp" alt=""/><span class="shell-cup-number">2</span></button>
        <button class="shell-cup-button" type="button" data-shell-cup="2" data-slot="2" aria-label="Cup 3"><img class="shell-cup" src="/assets/shell-game-cup.webp" alt=""/><span class="shell-cup-number">3</span></button>
      </div>
    </div>
    <div class="shell-guess"><i>♠</i><span>Guess where the ball is hidden</span></div>
    <div class="shell-game-controls">
      <div class="shell-control-head"><span>Bet Amount</span><span class="shell-balance">▣ Balance <b data-shell-balance>0 TON</b></span></div>
      <div class="shell-bet-row">
        <button type="button" data-shell-minus aria-label="Decrease bet">−</button>
        <button class="shell-bet-value" type="button" data-shell-bet><img src="/app/api/uploaded-image/ton-icon.png" alt="TON"/><span>1</span><small>TON</small></button>
        <button type="button" data-shell-plus aria-label="Increase bet">+</button>
      </div>
      <div class="shell-presets">
        <button class="shell-preset" type="button" data-shell-preset="0.1">0.1</button>
        <button class="shell-preset" type="button" data-shell-preset="0.5">0.5</button>
        <button class="shell-preset active" type="button" data-shell-preset="1">1.0</button>
        <button class="shell-preset" type="button" data-shell-preset="5">5.0</button>
        <button class="shell-preset" type="button" data-shell-preset="10">10.0</button>
      </div>
      <button class="shell-play-button" type="button" data-shell-play><span class="shell-play-main"><i>▶</i><b>Play Round</b></span><small data-shell-potential>POTENTIAL WIN 2.85 TON</small></button>
    </div>
    <div class="shell-info-row">
      <div class="shell-info-card"><span>Recent Results<span class="shell-result-dots" data-shell-results><i></i><i></i><i></i><i></i><i></i></span></span></div>
      <div class="shell-info-card"><i>♢</i><span>Provably Fair<small>100% TRANSPARENT</small></span></div>
      <div class="shell-info-card"><i>▤</i><span>Game Rules<small>HOW TO PLAY</small></span></div>
    </div>
  </div>
  <script>(function(){
    var root=document.getElementById('shellgame');if(!root||root.dataset.shellReady)return;root.dataset.shellReady='1';
    var tg=window.Telegram&&window.Telegram.WebApp,NANO=1000000000,cups=Array.prototype.slice.call(root.querySelectorAll('[data-shell-cup]')),presets=Array.prototype.slice.call(root.querySelectorAll('[data-shell-preset]')),ball=root.querySelector('[data-shell-ball]'),status=root.querySelector('[data-shell-status]'),play=root.querySelector('[data-shell-play]'),playLabel=play.querySelector('.shell-play-main b'),potential=root.querySelector('[data-shell-potential]'),betButton=root.querySelector('[data-shell-bet]'),betText=betButton.querySelector('span'),minus=root.querySelector('[data-shell-minus]'),plus=root.querySelector('[data-shell-plus]'),balanceText=root.querySelector('[data-shell-balance]'),results=root.querySelector('[data-shell-results]');
    var amounts=[.1,.5,1,5,10],bet=1,state='ready',slots=[0,1,2],timers=[],recent=[];
    function wait(ms){return new Promise(function(resolve){var id=setTimeout(resolve,ms);timers.push(id)})}
    function haptic(kind){try{if(!tg||!tg.HapticFeedback)return;if(kind==='success'||kind==='error')tg.HapticFeedback.notificationOccurred(kind);else tg.HapticFeedback.impactOccurred('light')}catch(e){}}
    function money(value){return (Math.round((Number(value)||0)*10000)/10000).toFixed(4).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1')}
    function readBalance(){return window.VexaTonBalance?Math.max(0,Math.floor(Number(window.VexaTonBalance.read())||0)):0}
    function syncBalance(value){var n=Number(value);if(window.VexaTonBalance&&Number.isFinite(n)&&n>=0)window.VexaTonBalance.write(Math.floor(n),0);renderBalance()}
    function renderBalance(){if(balanceText)balanceText.textContent=money(readBalance()/NANO)+' TON'}
    function setStatus(text,kind){status.textContent=text;status.classList.remove('win','lose');if(kind)status.classList.add(kind)}
    function setBet(value){bet=Math.max(.0001,Math.round((Number(value)||1)*10000)/10000);betText.textContent=money(bet);potential.textContent='POTENTIAL WIN '+money(bet*2.85)+' TON';presets.forEach(function(item){item.classList.toggle('active',Math.abs(Number(item.dataset.shellPreset)-bet)<.00001)})}
    function resetCups(){cups.forEach(function(cup,index){cup.dataset.slot=String(index);cup.classList.remove('lifted','selectable')});slots=[0,1,2];ball.classList.remove('visible');ball.style.left='50%';setPickEnabled(false)}
    function ballLeft(slot){return slot===0?'17%':slot===2?'83%':'50%'}
    function swap(a,b){var first=slots.indexOf(a),second=slots.indexOf(b);slots[first]=b;slots[second]=a;cups[a].dataset.slot=String(second);cups[b].dataset.slot=String(first);haptic('impact')}
    async function shuffle(){for(var i=0;i<9;i++){var a=Math.floor(Math.random()*3),b=(a+1+Math.floor(Math.random()*2))%3;swap(a,b);await wait(270+Math.floor(Math.random()*55))}}
    function setPickEnabled(enabled){cups.forEach(function(cup){cup.classList.toggle('selectable',enabled);cup.disabled=!enabled})}
    function setControlsDisabled(disabled){minus.disabled=disabled;plus.disabled=disabled;betButton.disabled=disabled;presets.forEach(function(item){item.disabled=disabled})}
    function requestPlay(choice){var initData=tg?String(tg.initData||''):'';if(!initData)return Promise.reject(new Error('Open the Mini App inside Telegram'));return fetch('/app/api/shellgame/play',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({initData:initData,amountNano:Math.max(1,Math.floor(bet*NANO)),choice:choice})}).then(function(response){return response.json().catch(function(){return null}).then(function(data){if(!response.ok)throw new Error(data&&data.error||'Could not reveal the ball');return data})})}
    function addResult(won){recent.unshift(won?'win':'lose');recent=recent.slice(0,5);var dots=results?Array.prototype.slice.call(results.querySelectorAll('i')):[];dots.forEach(function(dot,index){dot.className=recent[index]||''})}
    async function start(){if(state!=='ready')return;var stake=Math.max(1,Math.floor(bet*NANO));if(readBalance()<stake){setStatus('Not enough balance','lose');return}state='shuffling';play.disabled=true;setControlsDisabled(true);resetCups();setStatus('Watch the ball');cups[1].classList.add('lifted');ball.style.left=ballLeft(1);ball.classList.add('visible');haptic('impact');await wait(850);cups[1].classList.remove('lifted');ball.classList.remove('visible');await wait(350);setStatus('Keep your eye on it');await shuffle();state='choosing';setPickEnabled(true);setStatus('Choose a cup');playLabel.textContent='Choose One Cup'}
    async function chooseSlot(selectedSlot){if(state!=='choosing')return;state='revealing';setPickEnabled(false);setStatus('Revealing...');try{var data=await requestPlay(selectedSlot),winning=Number(data.winningCup),winner=cups.filter(function(item){return Number(item.dataset.slot)===winning})[0];syncBalance(data.tonBalanceNano);if(winner)winner.classList.add('lifted');ball.style.left=ballLeft(winning);await wait(230);ball.classList.add('visible');addResult(!!data.win);if(data.win){setStatus('You won '+money(Number(data.payoutNano||0)/NANO)+' TON','win');haptic('success')}else{setStatus('The ball was under Cup '+String(winning+1),'lose');haptic('error')}await wait(1900)}catch(error){setStatus(error&&error.message||'Game failed','lose');await wait(1300)}finally{resetCups();state='ready';play.disabled=false;setControlsDisabled(false);playLabel.textContent='Play Round'}}
    cups.forEach(function(cup){cup.disabled=true;cup.addEventListener('click',function(){chooseSlot(Number(cup.dataset.slot))})});
    minus.addEventListener('click',function(){if(state!=='ready')return;var index=0;for(var i=0;i<amounts.length;i++)if(amounts[i]<bet)index=i;setBet(amounts[index])});plus.addEventListener('click',function(){if(state!=='ready')return;var next=amounts[amounts.length-1];for(var i=0;i<amounts.length;i++)if(amounts[i]>bet){next=amounts[i];break}setBet(next)});presets.forEach(function(item){item.addEventListener('click',function(){if(state==='ready')setBet(Number(item.dataset.shellPreset))})});betButton.addEventListener('click',function(){if(state!=='ready')return;var value=window.prompt('Enter TON bet',money(bet));if(value!==null){var parsed=Number(String(value).replace(',','.'));if(Number.isFinite(parsed)&&parsed>0)setBet(parsed)}});play.addEventListener('click',start);
    window.addEventListener('vexa-ton-balance-sync',renderBalance);window.addEventListener('vexa-ton-balance-game-change',renderBalance);window.addEventListener('vexa:view-changed',function(event){if(!event.detail||event.detail.id==='shellgame'){renderBalance();return}timers.forEach(clearTimeout);timers=[];state='ready';resetCups();play.disabled=false;setControlsDisabled(false);playLabel.textContent='Play Round';setStatus('Press Play Round to begin')});
    setBet(1);renderBalance();resetCups();
  })();</script>
</section>`;
