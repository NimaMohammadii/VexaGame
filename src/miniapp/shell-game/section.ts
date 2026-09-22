export const SHELL_GAME_SECTION = `
<section id="shellgame" class="view shell-game-view">
  <style>
    body:has(#shellgame.active) .tabs{display:none!important}
    body:has(#shellgame.active) .content{height:calc(100dvh - 54px - env(safe-area-inset-top))!important;overflow:hidden!important}
    .shell-game-view{position:relative;min-height:100dvh;padding:52px 14px max(22px,env(safe-area-inset-bottom));box-sizing:border-box;overflow:hidden;background:radial-gradient(circle at 50% 22%,rgba(112,18,48,.24),transparent 38%),linear-gradient(180deg,#120308 0%,#050203 58%,#000 100%)}
    .shell-game-wrap{width:min(100%,520px);height:100%;margin:auto;display:flex;flex-direction:column;justify-content:flex-end;gap:14px}
    .shell-game-board{position:relative;height:min(56vh,470px);min-height:330px;border-radius:34px;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.025));box-shadow:inset 0 1px 0 rgba(255,255,255,.13),0 24px 60px rgba(0,0,0,.34);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);overflow:hidden}
    .shell-game-board:before{content:'';position:absolute;left:7%;right:7%;bottom:58px;height:2px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);box-shadow:0 18px 38px rgba(0,0,0,.8)}
    .shell-game-status{position:absolute;left:18px;right:18px;top:22px;text-align:center;color:rgba(255,255,255,.7);font-size:14px;font-weight:850;letter-spacing:-.02em}
    .shell-game-status.win{color:#80ffc0}.shell-game-status.lose{color:#ff8aa5}
    .shell-game-multiplier{position:absolute;top:54px;left:50%;transform:translateX(-50%);padding:7px 13px;border-radius:999px;background:rgba(255,255,255,.06);box-shadow:inset 0 1px 0 rgba(255,255,255,.12);color:rgba(255,255,255,.88);font-size:12px;font-weight:900}
    .shell-game-arena{position:absolute;left:0;right:0;bottom:61px;height:230px;perspective:780px}
    .shell-cup-button{--slot-x:0px;--cup-lift:0px;position:absolute;left:50%;bottom:0;width:31%;max-width:132px;height:178px;padding:0;border:0;background:transparent;color:#fff;transform:translateX(calc(-50% + var(--slot-x))) translateY(var(--cup-lift));transition:transform .31s cubic-bezier(.2,.75,.25,1),filter .2s ease;z-index:3;-webkit-tap-highlight-color:transparent}
    .shell-cup-button[data-slot="0"]{--slot-x:max(-31vw,-126px)}
    .shell-cup-button[data-slot="1"]{--slot-x:0px}
    .shell-cup-button[data-slot="2"]{--slot-x:min(31vw,126px)}
    .shell-cup-button.selectable{cursor:pointer}.shell-cup-button.selectable:active{filter:brightness(1.18);transform:translateX(calc(-50% + var(--slot-x))) translateY(-5px) scale(.98)}
    .shell-cup-button.lifted{--cup-lift:-64px}
    .shell-cup{position:absolute;left:8%;right:8%;bottom:0;height:150px;clip-path:polygon(18% 2%,82% 2%,100% 94%,94% 100%,6% 100%,0 94%);background:linear-gradient(90deg,#3a0715 0%,#8e2547 18%,#d56b87 46%,#8b2344 73%,#30050f 100%);box-shadow:inset 0 5px 7px rgba(255,255,255,.35),inset 0 -12px 20px rgba(0,0,0,.5),0 18px 28px rgba(0,0,0,.5);filter:drop-shadow(0 2px 0 rgba(255,211,222,.25))}
    .shell-cup:before{content:'';position:absolute;left:5%;right:5%;top:0;height:15px;border-radius:50%;background:linear-gradient(180deg,#f4a0b4,#7b1735 58%,#2b040e);box-shadow:inset 0 2px 3px rgba(255,255,255,.55),0 4px 8px rgba(0,0,0,.35)}
    .shell-cup:after{content:'';position:absolute;top:19px;bottom:20px;left:22%;width:17%;border-radius:50%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.23),transparent);transform:rotate(-4deg)}
    .shell-ball{position:absolute;left:50%;bottom:5px;width:29px;height:29px;border-radius:50%;transform:translateX(-50%) scale(0);opacity:0;background:radial-gradient(circle at 34% 28%,#fff6c7 0 9%,#ffc83d 27%,#d36c00 72%,#5f1f00 100%);box-shadow:0 6px 16px rgba(0,0,0,.65),0 0 22px rgba(255,159,34,.25);transition:left .28s ease,transform .25s ease,opacity .2s ease;z-index:2}
    .shell-ball.visible{transform:translateX(-50%) scale(1);opacity:1}
    .shell-game-controls{padding:16px;border-radius:30px;background:rgba(15,7,9,.72);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 18px 44px rgba(0,0,0,.3);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px)}
    .shell-bet-row{display:grid;grid-template-columns:64px minmax(0,1fr) 64px;gap:10px;height:62px}
    .shell-bet-row button{border:0;border-radius:20px;background:rgba(255,255,255,.07);box-shadow:inset 0 1px 0 rgba(255,255,255,.12);color:#fff;font-size:17px;font-weight:900}
    .shell-bet-value{display:flex!important;align-items:center;justify-content:center;gap:5px;font-size:20px!important}.shell-bet-value img{width:29px;height:29px;object-fit:contain}
    .shell-play-button{width:100%;height:60px;margin-top:11px;border:0;border-radius:20px;background:linear-gradient(145deg,rgba(139,31,63,.95),rgba(64,7,24,.92));box-shadow:inset 0 1px 0 rgba(255,222,231,.22),0 12px 26px rgba(0,0,0,.28);color:#ffe7ee;font-size:17px;font-weight:920;letter-spacing:-.025em}
    .shell-play-button:disabled{opacity:.56}.shell-play-button:not(:disabled):active{transform:scale(.98)}
    @media(max-height:720px){.shell-game-view{padding-top:34px}.shell-game-board{height:365px;min-height:300px}.shell-game-arena{height:205px}.shell-cup-button{height:158px}.shell-cup{height:132px}}
    @media(prefers-reduced-motion:reduce){.shell-cup-button,.shell-ball{transition-duration:.01ms!important}}
  </style>
  <div class="shell-game-wrap">
    <div class="shell-game-board">
      <div class="shell-game-status" data-shell-status>Press Start and watch the ball</div>
      <div class="shell-game-multiplier">Correct cup pays 2.85×</div>
      <div class="shell-game-arena" data-shell-arena>
        <div class="shell-ball" data-shell-ball></div>
        <button class="shell-cup-button" type="button" data-shell-cup="0" data-slot="0" aria-label="Left cup"><span class="shell-cup"></span></button>
        <button class="shell-cup-button" type="button" data-shell-cup="1" data-slot="1" aria-label="Middle cup"><span class="shell-cup"></span></button>
        <button class="shell-cup-button" type="button" data-shell-cup="2" data-slot="2" aria-label="Right cup"><span class="shell-cup"></span></button>
      </div>
    </div>
    <div class="shell-game-controls">
      <div class="shell-bet-row">
        <button type="button" data-shell-half>½</button>
        <button class="shell-bet-value" type="button" data-shell-bet><img src="/app/api/uploaded-image/ton-icon.png" alt="TON"/><span>0.1</span></button>
        <button type="button" data-shell-double>2×</button>
      </div>
      <button class="shell-play-button" type="button" data-shell-play>Start</button>
    </div>
  </div>
  <script>(function(){
    var root=document.getElementById('shellgame');if(!root||root.dataset.shellReady)return;root.dataset.shellReady='1';
    var tg=window.Telegram&&window.Telegram.WebApp,NANO=1000000000,cups=Array.prototype.slice.call(root.querySelectorAll('[data-shell-cup]')),ball=root.querySelector('[data-shell-ball]'),status=root.querySelector('[data-shell-status]'),play=root.querySelector('[data-shell-play]'),betButton=root.querySelector('[data-shell-bet]'),betText=betButton.querySelector('span'),half=root.querySelector('[data-shell-half]'),doubleButton=root.querySelector('[data-shell-double]');
    var bet=.1,state='ready',slots=[0,1,2],timers=[];
    function wait(ms){return new Promise(function(resolve){var id=setTimeout(resolve,ms);timers.push(id)})}
    function haptic(kind){try{if(!tg||!tg.HapticFeedback)return;if(kind==='success'||kind==='error')tg.HapticFeedback.notificationOccurred(kind);else tg.HapticFeedback.impactOccurred('light')}catch(e){}}
    function money(value){return (Math.round((Number(value)||0)*10000)/10000).toFixed(4).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1')}
    function readBalance(){return window.VexaTonBalance?Math.max(0,Math.floor(Number(window.VexaTonBalance.read())||0)):0}
    function syncBalance(value){var n=Number(value);if(window.VexaTonBalance&&Number.isFinite(n)&&n>=0)window.VexaTonBalance.write(Math.floor(n),0)}
    function setStatus(text,kind){status.textContent=text;status.classList.remove('win','lose');if(kind)status.classList.add(kind)}
    function setBet(value){bet=Math.max(.0001,Math.round((Number(value)||.1)*10000)/10000);betText.textContent=money(bet)}
    function resetCups(){cups.forEach(function(cup,index){cup.dataset.slot=String(index);cup.classList.remove('lifted','selectable')});slots=[0,1,2];ball.classList.remove('visible');ball.style.left='50%'}
    function ballLeft(slot){return slot===0?'17%':slot===2?'83%':'50%'}
    function swap(a,b){var first=slots.indexOf(a),second=slots.indexOf(b);slots[first]=b;slots[second]=a;cups[a].dataset.slot=String(second);cups[b].dataset.slot=String(first);haptic('impact')}
    async function shuffle(){for(var i=0;i<9;i++){var a=Math.floor(Math.random()*3),b=(a+1+Math.floor(Math.random()*2))%3;swap(a,b);await wait(270+Math.floor(Math.random()*55))}}
    function chooseEnabled(enabled){cups.forEach(function(cup){cup.classList.toggle('selectable',enabled);cup.disabled=!enabled})}
    function requestPlay(choice){var initData=tg?String(tg.initData||''):'';if(!initData)return Promise.reject(new Error('Open the Mini App inside Telegram'));return fetch('/app/api/shellgame/play',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({initData:initData,amountNano:Math.max(1,Math.floor(bet*NANO)),choice:choice})}).then(function(response){return response.json().catch(function(){return null}).then(function(data){if(!response.ok)throw new Error(data&&data.error||'Could not reveal the ball');return data})})}
    async function start(){if(state!=='ready')return;var stake=Math.max(1,Math.floor(bet*NANO));if(readBalance()<stake){setStatus('Not enough balance','lose');return}state='shuffling';play.disabled=true;half.disabled=true;doubleButton.disabled=true;betButton.disabled=true;resetCups();setStatus('Watch the ball');cups[1].classList.add('lifted');ball.style.left=ballLeft(1);ball.classList.add('visible');haptic('impact');await wait(850);cups[1].classList.remove('lifted');ball.classList.remove('visible');await wait(350);setStatus('Keep your eye on it');await shuffle();state='choosing';chooseEnabled(true);setStatus('Choose a cup');play.textContent='Choose one cup'}
    async function choose(cup){if(state!=='choosing')return;state='revealing';chooseEnabled(false);setStatus('Revealing...');var selectedSlot=Number(cup.dataset.slot);try{var data=await requestPlay(selectedSlot),winning=Number(data.winningCup),winner=cups.filter(function(item){return Number(item.dataset.slot)===winning})[0];syncBalance(data.tonBalanceNano);if(winner)winner.classList.add('lifted');ball.style.left=ballLeft(winning);await wait(230);ball.classList.add('visible');if(data.win){setStatus('You won '+money(Number(data.payoutNano||0)/NANO)+' TON','win');haptic('success')}else{setStatus('The ball was under another cup','lose');haptic('error')}await wait(1900)}catch(error){setStatus(error&&error.message||'Game failed','lose');await wait(1300)}finally{resetCups();state='ready';play.disabled=false;half.disabled=false;doubleButton.disabled=false;betButton.disabled=false;play.textContent='Start'}}
    cups.forEach(function(cup){cup.disabled=true;cup.addEventListener('click',function(){choose(cup)})});
    half.addEventListener('click',function(){if(state==='ready')setBet(bet/2)});doubleButton.addEventListener('click',function(){if(state==='ready')setBet(Math.min(readBalance()/NANO||bet*2,bet*2))});betButton.addEventListener('click',function(){if(state!=='ready')return;var value=window.prompt('Enter TON bet',money(bet));if(value!==null){var parsed=Number(String(value).replace(',','.'));if(Number.isFinite(parsed)&&parsed>0)setBet(parsed)}});play.addEventListener('click',start);
    window.addEventListener('vexa:view-changed',function(event){if(!event.detail||event.detail.id==='shellgame')return;timers.forEach(clearTimeout);timers=[];state='ready';resetCups();play.disabled=false;half.disabled=false;doubleButton.disabled=false;betButton.disabled=false;play.textContent='Start';setStatus('Press Start and watch the ball')});
  })();</script>
</section>`;
