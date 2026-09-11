export const WHEEL_SECTION = `
<section id="wheel" class="view wheel-view">
  <style>
    html body:has(#wheel.active){isolation:isolate!important;background:#000!important}
    html body:has(#wheel.active)::before{content:""!important;display:block!important;position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;z-index:-1!important;pointer-events:none!important;background-color:#000!important;background-image:url('/assets/Wheel.PNG?v=1')!important;background-size:cover!important;background-position:center top!important;background-repeat:no-repeat!important;transform:none!important;animation:none!important;filter:none!important;opacity:1!important}
    html body:has(#wheel.active)::after,html body:has(#wheel.active) .app::before,html body:has(#wheel.active) .app::after{display:none!important;content:none!important;background:none!important;background-image:none!important}
    html body:has(#wheel.active) .app,html body:has(#wheel.active) main.app,html body:has(#wheel.active) .content,html body:has(#wheel.active) .view.active,html body:has(#wheel.active) #wheel,html body:has(#wheel.active) .wheel-view,html body:has(#wheel.active) .top,html body:has(#wheel.active) header.top{background:transparent!important;background-color:transparent!important;background-image:none!important;box-shadow:none!important}
    body:has(#wheel.active) .tabs{display:none!important}
    .wheel-view{position:relative;box-sizing:border-box;height:100%;min-height:100%;padding:0 14px calc(96px + env(safe-area-inset-bottom));background:transparent!important;color:#fff;overflow-y:auto!important;overflow-x:hidden;-webkit-overflow-scrolling:touch}
    .wheel-wrap{position:relative;z-index:1;max-width:520px;margin:0 auto;display:grid;gap:12px}

    /* Wheel component */
    .wheel-stage{position:relative;width:min(74vw,286px);height:auto;aspect-ratio:1;margin:20px auto 13px;display:block}
    .wheel-rotor{position:absolute;inset:0;border-radius:50%;overflow:hidden;background:conic-gradient(from 0deg,#E8D5DA 0deg 72deg,#1A0B0F 72deg 360deg);border:1px solid rgba(232,213,218,.22);box-shadow:0 26px 70px rgba(0,0,0,.56),inset 0 0 0 1px rgba(255,255,255,.035),inset 0 0 0 7px rgba(8,3,5,.16);will-change:transform;transform:rotate(0deg)}
    .wheel-rotor:after{content:"";position:absolute;inset:7px;border-radius:50%;border:1px solid rgba(232,213,218,.11);box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 1px 0 rgba(0,0,0,.18);pointer-events:none}
    .wheel-prize{position:absolute;z-index:2;left:50%;top:50%;width:56px;margin-left:-28px;margin-top:-9px;text-align:center;color:#fff;font-size:12px;font-weight:900;font-variant-numeric:tabular-nums;text-shadow:0 1px 4px rgba(0,0,0,.72);transform:rotate(var(--wheel-angle)) translateY(-100px) rotate(calc(-1 * var(--wheel-angle)));will-change:transform}
    .wheel-prize.win{color:#050505;text-shadow:none}
    .wheel-prize.lose{color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.72)}
    .wheel-hub{position:absolute;z-index:3;left:50%;top:50%;width:36px;height:36px;margin:-18px;border-radius:50%;background:radial-gradient(circle at 38% 30%,#3b252c 0%,#1b0e12 42%,#080405 100%);border:1px solid rgba(232,213,218,.28);box-shadow:0 8px 22px rgba(0,0,0,.52),inset 0 1px 0 rgba(255,255,255,.15),inset 0 -1px 0 rgba(0,0,0,.58)}
    .wheel-hub:after{content:"";position:absolute;inset:4px;border-radius:50%;border:1px solid rgba(232,213,218,.07);pointer-events:none}
    .wheel-pointer{position:absolute;z-index:6;left:50%;top:-3px;width:0;height:0;transform:translateX(-50%);border-left:11px solid transparent;border-right:11px solid transparent;border-top:23px solid #fff;filter:drop-shadow(0 5px 8px rgba(0,0,0,.65))}

    /* Original wheel controls, unchanged */
    .wheel-panel{position:relative;border:0!important;border-radius:28px;background:transparent!important;box-shadow:none!important;padding:12px 14px 14px;margin-bottom:48px}
    .wheel-controls{display:grid;gap:10px}
    .wheel-input-row{display:grid;grid-template-columns:1fr auto auto;gap:8px}
    .wheel-input-row input{height:50px;border-radius:18px;border:1px solid rgba(255,255,255,.12);background-color:rgba(255,255,255,.06);background-image:url('/app/api/uploaded-image/ton-icon.png');background-repeat:no-repeat;background-position:right 12px center;background-size:28px 28px;color:#fff;padding:0 50px 0 14px;font-size:18px;font-weight:900;outline:none}
    .wheel-multiplier-btn{height:50px;min-width:58px;border-radius:18px;border:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.35);color:#fff;display:grid;place-items:center;font-weight:950;font-size:13px;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
    .wheel-chance-card{position:relative;border:0!important;border-radius:0;background:transparent!important;padding:0;box-shadow:none!important}
    .wheel-chance-head{display:flex;align-items:center;justify-content:space-between;gap:10px;position:absolute;left:18px;right:18px;top:14px;z-index:3;margin-bottom:0;padding:0;font-size:12px;font-weight:900;color:rgba(255,255,255,.56);letter-spacing:-.02em}
    .wheel-chance-head b{color:#fff;font-size:14px;font-weight:950;font-variant-numeric:tabular-nums lining-nums}
    .wheel-chance-shell{--wheel-left-color:rgba(58,6,20,.84);--wheel-right-color:rgba(138,138,146,.54);position:relative;height:96px;border-radius:22px;background:rgba(8,8,10,.48)!important;border:1px solid rgba(255,255,255,.12)!important;overflow:visible;box-shadow:none!important;touch-action:none;user-select:none;padding:42px 6px 24px;box-sizing:border-box}
    .wheel-chance-shell:before{content:'';position:absolute;left:20px;right:20px;top:57px;height:10px;background:linear-gradient(90deg,rgba(255,255,255,.10) 0 2px,transparent 2px 25%,rgba(255,255,255,.10) 25% calc(25% + 2px),transparent calc(25% + 2px) 50%,rgba(255,255,255,.10) 50% calc(50% + 2px),transparent calc(50% + 2px) 75%,rgba(255,255,255,.10) 75% calc(75% + 2px),transparent calc(75% + 2px) 100%);clip-path:polygon(0 100%,1.6% 0,3.2% 100%,25% 100%,26.6% 0,28.2% 100%,50% 100%,51.6% 0,53.2% 100%,75% 100%,76.6% 0,78.2% 100%,100% 100%);opacity:.56;pointer-events:none}
    .wheel-chance-fill{position:absolute;left:12px;right:12px;top:63%;height:30px;border-radius:999px;transform:translateY(-50%);background:rgba(14,14,16,.86);border:1px solid rgba(255,255,255,.15);box-shadow:0 16px 36px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.20),inset 0 -1px 0 rgba(0,0,0,.55);pointer-events:none}
    .wheel-chance-fill:before{content:'';position:absolute;left:16px;right:16px;top:50%;height:12px;border-radius:999px;transform:translateY(-50%);background:linear-gradient(90deg,var(--wheel-left-color) 0%,var(--wheel-left-color) var(--wheel-pos,20%),var(--wheel-right-color) var(--wheel-pos,20%),var(--wheel-right-color) 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.10),0 0 14px rgba(0,0,0,.42)}
    .wheel-chance-thumb{position:absolute;left:calc(29px + (100% - 58px) * var(--wheel-ratio,.2));top:63%;width:34px;height:34px;border-radius:12px;transform:translate(-50%,-50%);background:var(--wheel-thumb-color,#4a0a1e);border:1px solid rgba(255,255,255,.34);box-shadow:0 14px 34px rgba(0,0,0,.58),inset 0 1px 0 rgba(255,255,255,.42),inset 0 -1px 0 rgba(255,255,255,.06);pointer-events:none}
    .wheel-chance-thumb:before{content:'';position:absolute;left:50%;top:50%;width:17px;height:18px;transform:translate(-50%,-50%);background:linear-gradient(90deg,rgba(255,255,255,.58) 0 3px,transparent 3px 7px,rgba(255,255,255,.58) 7px 10px,transparent 10px 14px,rgba(255,255,255,.58) 14px 17px);border-radius:2px}
    .wheel-chance-slider{position:absolute;inset:0;z-index:2;width:100%;height:100%;margin:0;opacity:0;appearance:none;-webkit-appearance:none;cursor:pointer}
    .wheel-quick{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .wheel-quick button,.wheel-join{border:1px solid rgba(255,255,255,.12);border-radius:18px;background:rgba(255,255,255,.06);color:#fff;font-weight:900;height:44px;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
    .wheel-quick button{display:inline-flex;align-items:center;justify-content:center;gap:1px}
    .wheel-ton-icon{width:28px;height:28px;display:inline-block;object-fit:contain;flex:0 0 28px;filter:drop-shadow(0 3px 8px rgba(0,136,204,.28))}
    .wheel-quick button.active{background:#4a0a1e;border-color:#5f0d27}
    .wheel-join{height:58px;border-radius:18px;font-size:18px;background:#3b0715;color:#ffdce5;letter-spacing:-.045em;border-color:rgba(255,96,128,.18);box-shadow:0 12px 24px rgba(0,0,0,.50),inset 0 1px 0 rgba(255,255,255,.08);transition:transform .18s ease,opacity .18s ease,background .18s ease}
    .wheel-join:active{transform:scale(.975)}.wheel-join:disabled{opacity:.62;transform:scale(.985)}.wheel-join.win{background:#0f3f2a;border-color:rgba(120,255,179,.22);color:#d8ffe8}
    .wheel-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
    .wheel-stat{border:1px solid rgba(255,255,255,.1);border-radius:18px;background:rgba(0,0,0,.35);padding:11px;text-align:center}
    .wheel-stat small{display:block;color:rgba(255,255,255,.45);font-size:10px;font-weight:850}.wheel-stat b{display:block;margin-top:4px;font-size:14px}
  </style>

  <div class="wheel-wrap">
    <div class="wheel-stage">
      <span class="wheel-pointer" aria-hidden="true"></span>
      <div class="wheel-rotor" data-wheel-rotor>
        <span class="wheel-prize win" style="--wheel-angle:36deg" data-wheel-win-label>WIN</span>
        <span class="wheel-prize lose" style="--wheel-angle:216deg" data-wheel-lose-label>LOSE</span>
        <i class="wheel-hub" aria-hidden="true"></i>
      </div>
    </div>

    <div class="wheel-panel">
      <div class="wheel-controls">
        <div class="wheel-input-row">
          <input data-wheel-amount inputmode="decimal" pattern="[0-9.]*" value="0.1" />
          <button class="wheel-multiplier-btn" type="button" data-wheel-half>1/2</button>
          <button class="wheel-multiplier-btn" type="button" data-wheel-double>2x</button>
        </div>
        <div class="wheel-chance-card">
          <div class="wheel-chance-head"><span>Win Chance</span><b data-wheel-chance-value>20%</b></div>
          <div class="wheel-chance-shell" data-wheel-chance-shell>
            <div class="wheel-chance-fill"></div><div class="wheel-chance-thumb"></div>
            <input class="wheel-chance-slider" type="range" min="4" max="96" step="1" value="20" data-wheel-chance />
          </div>
        </div>
        <div class="wheel-quick">
          <button data-wheel-quick="0.1" class="active"><span>0.1</span><img class="wheel-ton-icon" src="/app/api/uploaded-image/ton-icon.png" alt="GRAM" loading="eager" decoding="async" data-wheel-credit-icon /></button>
          <button data-wheel-quick="0.5"><span>0.5</span><img class="wheel-ton-icon" src="/app/api/uploaded-image/ton-icon.png" alt="GRAM" loading="eager" decoding="async" data-wheel-credit-icon /></button>
          <button data-wheel-quick="1"><span>1</span><img class="wheel-ton-icon" src="/app/api/uploaded-image/ton-icon.png" alt="GRAM" loading="eager" decoding="async" data-wheel-credit-icon /></button>
        </div>
        <button class="wheel-join" data-wheel-join>Spin</button>
      </div>
      <div class="wheel-stats">
        <div class="wheel-stat"><small>CHANCE</small><b data-wheel-count>20%</b></div>
        <div class="wheel-stat"><small>MULTIPLIER</small><b data-wheel-pot>4.80x</b></div>
        <div class="wheel-stat"><small>RESULT</small><b data-wheel-user>Ready</b></div>
      </div>
    </div>
  </div>
  <script>
    (function(){
      function initWheelGame(){
        var root=document.getElementById('wheel');
        if(!root||root.dataset.readyWheelConfigaUi==='1')return;
        var rotor=root.querySelector('[data-wheel-rotor]');
        var winLabel=root.querySelector('[data-wheel-win-label]');
        var loseLabel=root.querySelector('[data-wheel-lose-label]');
        var amountInput=root.querySelector('[data-wheel-amount]');
        var chanceInput=root.querySelector('[data-wheel-chance]');
        var chanceShell=root.querySelector('[data-wheel-chance-shell]');
        var chanceText=root.querySelector('[data-wheel-chance-value]');
        var chanceStat=root.querySelector('[data-wheel-count]');
        var multiplierStat=root.querySelector('[data-wheel-pot]');
        var resultStat=root.querySelector('[data-wheel-user]');
        var spinButton=root.querySelector('[data-wheel-join]');
        var halfButton=root.querySelector('[data-wheel-half]');
        var doubleButton=root.querySelector('[data-wheel-double]');
        if(!rotor||!winLabel||!loseLabel||!amountInput||!chanceInput||!chanceShell||!spinButton||!halfButton||!doubleButton){setTimeout(initWheelGame,80);return}
        root.dataset.readyWheelConfigaUi='1';
        var rotation=0,spinning=false,dragging=false,houseEdge=.96,minChance=4,maxChance=96,sliceFrame=0,sliceTarget=20,dragFrame=0,pendingClientX=0,dragRect=null;
        function clampChance(v){return Math.max(minChance,Math.min(maxChance,Math.round(Number(v)||20)))}
        function chanceToRatio(c){return(clampChance(c)-minChance)/Math.max(1,maxChance-minChance)}
        function chanceToPos(c){return chanceToRatio(c)*100}
        function posToChance(p){return clampChance(Math.max(minChance,Math.min(maxChance,p)))}
        function chanceFromClientX(x){var r=dragRect||chanceShell.getBoundingClientRect(),left=r.left+29,width=Math.max(1,r.width-58);return posToChance(((x-left)/width)*100)}
        function multiplierFor(c){return Math.max(1.01,Math.floor((100/c)*houseEdge*100)/100)}
        function money(n){var x=Number(n)||0,t=x.toFixed(2);if(t.slice(-3)==='.00')return t.slice(0,-3);if(t.charAt(t.length-1)==='0')return t.slice(0,-1);return t}
        function toNano(v){return Math.max(0,Math.floor((Number(String(v||'').replace(',','.'))||0)*1000000000))}
        function userId(){var tg=window.Telegram&&window.Telegram.WebApp,u=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user,id=String((u&&u.id)||'').trim();if(id)return id;try{return String(localStorage.getItem('ownerId')||'').trim()}catch(_){return ''}}
        function telegramInitData(){var tg=window.Telegram&&window.Telegram.WebApp;return tg?String(tg.initData||''):''}
        function applyWheelSlices(c){var winDeg=c*3.6,loseDeg=360-winDeg;rotor.style.background='conic-gradient(from 0deg,#E8D5DA 0deg '+winDeg+'deg,#1A0B0F '+winDeg+'deg 360deg)';winLabel.style.setProperty('--wheel-angle',(winDeg/2)+'deg');loseLabel.style.setProperty('--wheel-angle',(winDeg+loseDeg/2)+'deg')}
        function queueWheelSlices(value){sliceTarget=clampChance(value);if(sliceFrame)return;sliceFrame=requestAnimationFrame(function(){sliceFrame=0;applyWheelSlices(sliceTarget)})}
        async function syncPendingBalance(){if(window.VexaTonBalance&&typeof window.VexaTonBalance.flush==='function')await window.VexaTonBalance.flush()}
        async function requestSpin(chance,betNano){var id=userId();var initData=telegramInitData();if(!id||!initData)throw new Error('Open the Mini App inside Telegram');var r=await fetch('/app/api/wheel/spin',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({userId:id,initData:initData,amountNano:betNano,chance:chance})});var j=await r.json().catch(function(){return null});if(!r.ok)throw new Error(j&&j.error?j.error:'Spin failed');return j}
        function syncBalance(value){var n=Number(value);if(window.VexaTonBalance&&Number.isFinite(n)&&n>=0)window.VexaTonBalance.write(Math.floor(n),0)}
        function updateUi(){var c=clampChance(chanceInput.value),p=chanceToPos(c),r=chanceToRatio(c),m=multiplierFor(c);chanceInput.value=String(c);root.style.setProperty('--wheel-pos',p+'%');root.style.setProperty('--wheel-ratio',String(r));chanceShell.style.setProperty('--wheel-pos',p+'%');chanceShell.style.setProperty('--wheel-ratio',String(r));var red=[74,10,30],gray=[138,138,146],thumb=red.map(function(v,i){return Math.round(v+(gray[i]-v)*r)});chanceShell.style.setProperty('--wheel-thumb-color','rgb('+thumb.join(',')+')');if(chanceText)chanceText.textContent=c+'%';if(chanceStat)chanceStat.textContent=c+'%';if(multiplierStat)multiplierStat.textContent=m.toFixed(2)+'x';queueWheelSlices(c)}
        function flushDragFrame(){dragFrame=0;if(!dragging)return;chanceInput.value=String(chanceFromClientX(pendingClientX));updateUi()}
        function setChanceFromClientX(x){if(spinning||chanceInput.disabled)return;pendingClientX=x;if(!dragFrame)dragFrame=requestAnimationFrame(flushDragFrame)}
        function startDrag(e){if(spinning||chanceInput.disabled)return;dragging=true;dragRect=chanceShell.getBoundingClientRect();chanceShell.classList.add('dragging');if(chanceShell.setPointerCapture&&e.pointerId!=null)chanceShell.setPointerCapture(e.pointerId);setChanceFromClientX(e.clientX);e.preventDefault()}
        function moveDrag(e){if(!dragging)return;setChanceFromClientX(e.clientX);e.preventDefault()}
        function endDrag(e){if(!dragging)return;dragging=false;dragRect=null;chanceShell.classList.remove('dragging');if(chanceShell.releasePointerCapture&&e&&e.pointerId!=null){try{chanceShell.releasePointerCapture(e.pointerId)}catch(_){}}}
        function setControlsLocked(v){amountInput.disabled=!!v;chanceInput.disabled=!!v;halfButton.disabled=!!v;doubleButton.disabled=!!v;root.querySelectorAll('[data-wheel-quick]').forEach(function(b){b.disabled=!!v})}
        function awardXP(a,s,m){if(window.VexaLevel&&typeof window.VexaLevel.add==='function')window.VexaLevel.add(a,s,m||{section:'wheel'})}
        function readRotorAngle(){var t=getComputedStyle(rotor).transform;if(!t||t==='none')return((rotation%360)+360)%360;var m=t.match(/^matrix\(([^)]+)\)$/);if(m){var p=m[1].split(',').map(Number);return(Math.atan2(p[1],p[0])*180/Math.PI+360)%360}var m3=t.match(/^matrix3d\(([^)]+)\)$/);if(m3){var q=m3[1].split(',').map(Number);return(Math.atan2(q[1],q[0])*180/Math.PI+360)%360}return((rotation%360)+360)%360}
        function beginImmediateSpin(){rotor.style.transition='transform 6s linear';rotation+=2160;requestAnimationFrame(function(){rotor.style.transform='rotate('+rotation+'deg)'})}
        function freezeRotor(){var angle=readRotorAngle();rotor.style.transition='none';rotation=angle;rotor.style.transform='rotate('+angle+'deg)';void rotor.offsetWidth;return angle}
        function settleRotor(targetAngle){return new Promise(function(resolve){var current=freezeRotor(),desired=(360-targetAngle)%360,delta=(desired-current+360)%360,done=false;rotation=current+1080+delta;function finish(){if(done)return;done=true;rotor.removeEventListener('transitionend',onEnd);resolve()}function onEnd(e){if(e.propertyName==='transform')finish()}rotor.addEventListener('transitionend',onEnd);rotor.style.transition='transform 2.65s cubic-bezier(.12,.72,.12,1)';requestAnimationFrame(function(){rotor.style.transform='rotate('+rotation+'deg)'});setTimeout(finish,3000)})}
        async function spin(){
          if(spinning)return;
          var chance=clampChance(chanceInput.value),betNano=toNano(amountInput.value);
          if(betNano<=0){if(resultStat)resultStat.textContent='Invalid bet';return}
          if(window.VexaTonBalance&&typeof window.VexaTonBalance.read==='function'&&window.VexaTonBalance.read()<betNano){if(resultStat)resultStat.textContent='No GRAM';return}
          spinning=true;
          setControlsLocked(true);
          spinButton.disabled=true;
          spinButton.classList.remove('win');
          spinButton.textContent='Spinning...';
          if(resultStat)resultStat.textContent='Spinning';
          beginImmediateSpin();
          try{
            await syncPendingBalance();
            var outcome=await requestSpin(chance,betNano);
            var win=!!outcome.win,targetAngle=Number(outcome.targetAngleDeg),mult=Number(outcome.multiplier)||multiplierFor(chance);
            if(!Number.isFinite(targetAngle))throw new Error('Invalid wheel result');
            targetAngle=((targetAngle%360)+360)%360;
            awardXP(2,'game-start',{section:'wheel',event:'spin'});
            await settleRotor(targetAngle);
            syncBalance(outcome.tonBalanceNano);
            if(win){
              var payoutNano=Math.max(0,Math.floor(Number(outcome.payoutNano)||0));
              awardXP(mult>=10?60:(mult>=4?30:12),'game-win',{section:'wheel',event:'spin-finish',result:'win',multiplier:mult});
              spinButton.classList.add('win');
              spinButton.textContent='Won +'+money(payoutNano/1000000000)+' GRAM';
              if(resultStat)resultStat.textContent='+'+money(payoutNano/1000000000)+' GRAM';
            }else{
              awardXP(4,'game-lose',{section:'wheel',event:'spin-finish',result:'no-win',multiplier:mult});
              spinButton.textContent='Spin';
              if(resultStat)resultStat.textContent='Lost';
            }
          }catch(error){
            freezeRotor();
            spinButton.textContent='Spin';
            if(resultStat){var message=String(error&&error.message||'Spin failed');resultStat.textContent=/insufficient/i.test(message)?'No GRAM':'Error'}
            if(window.VexaTonBalance&&typeof window.VexaTonBalance.load==='function')window.VexaTonBalance.load();
          }finally{
            spinning=false;
            spinButton.disabled=false;
            setControlsLocked(false);
          }
        }
        function promptWheelAmount(){if(spinning)return;var current=String(amountInput.value||'0.1'),next=null;try{next=window.prompt('Enter GRAM amount',current)}catch(e){return}if(next===null)return;var parsed=Number(String(next).trim().replace(',','.'));if(!Number.isFinite(parsed)||parsed<=0)return;amountInput.value=String(parsed)}
        amountInput.readOnly=true;amountInput.tabIndex=-1;amountInput.style.pointerEvents='none';var amountRow=amountInput.closest&&amountInput.closest('.wheel-input-row');if(amountRow){amountRow.setAttribute('aria-haspopup','dialog');amountRow.addEventListener('click',function(ev){if(spinning)return;var button=ev.target&&ev.target.closest&&ev.target.closest('button');if(button)return;ev.preventDefault();promptWheelAmount()})}
        root.querySelectorAll('[data-wheel-quick]').forEach(function(button){button.addEventListener('click',function(){if(spinning)return;root.querySelectorAll('[data-wheel-quick]').forEach(function(item){item.classList.remove('active')});button.classList.add('active');amountInput.value=button.getAttribute('data-wheel-quick')||'0.1'})});
        halfButton.addEventListener('click',function(){if(spinning)return;var v=Math.max(.1,Number(amountInput.value||'.1')/2);amountInput.value=String(Math.round(v*100)/100).replace(/\.0$/,'')});
        doubleButton.addEventListener('click',function(){if(spinning)return;var v=Math.max(.1,Number(amountInput.value||'.1')*2);amountInput.value=String(Math.round(v*100)/100).replace(/\.0$/,'')});
        chanceInput.min=String(minChance);chanceInput.max=String(maxChance);chanceShell.addEventListener('pointerdown',startDrag);chanceShell.addEventListener('pointermove',moveDrag,{passive:false});chanceShell.addEventListener('pointerup',endDrag);chanceShell.addEventListener('pointercancel',endDrag);chanceInput.addEventListener('input',updateUi);chanceInput.addEventListener('change',updateUi);spinButton.addEventListener('click',spin);sliceTarget=clampChance(chanceInput.value);applyWheelSlices(sliceTarget);updateUi()
      }
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initWheelGame);else initWheelGame();
    })();
  </script>
</section>
`;