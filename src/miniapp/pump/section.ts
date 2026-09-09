export const PUMP_SECTION = String.raw`
<section id="coinflip" class="view pump-view">
  <style>
    body:has(#coinflip.active) .tabs { display:none !important; }
    body:has(#coinflip.active), body:has(#coinflip.active) .app, body:has(#coinflip.active) .content, body:has(#coinflip.active) .view.active, body:has(#coinflip.active) header.top {
      background:linear-gradient(180deg,#12020a 0%,#060103 46%,#020102 100%) !important;
      background-image:none !important; box-shadow:none !important;
    }
    .pump-view {
      min-height:100%; height:100%; overflow-y:auto !important; overflow-x:hidden;
      padding:8px 14px calc(28px + env(safe-area-inset-bottom)); box-sizing:border-box;
      color:#fff; background:transparent !important;
    }
    .pump-page { width:min(100%,430px); min-height:calc(100vh - 74px); margin:0 auto; display:flex; flex-direction:column; box-sizing:border-box; }
    .pump-stage {
      position:relative; width:100%; height:min(60vh,475px); min-height:360px; flex:0 0 auto;
      overflow:hidden; background:transparent; isolation:isolate;
    }
    .pump-stage::before {
      content:""; position:absolute; z-index:0; inset:10% 5% 4%; pointer-events:none;
      background:radial-gradient(ellipse at 50% 55%,rgba(120,9,52,.33),rgba(55,3,23,.13) 37%,transparent 69%);
      filter:blur(15px);
    }
    #pumpCanvas { position:absolute; inset:0; z-index:1; display:block; width:100%; height:100%; }
    .pump-controls {
      width:100%; margin-top:18px; padding:16px; box-sizing:border-box; border-radius:26px;
      border:1px solid rgba(255,255,255,.11); background:rgba(16,3,10,.38);
      box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 14px 36px rgba(0,0,0,.22);
      backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
    }
    .pump-label { display:block; margin:0 0 9px 3px; color:rgba(255,255,255,.52); font-size:11px; font-weight:850; letter-spacing:.12em; text-transform:uppercase; }
    .pump-bet-row { display:grid; grid-template-columns:88px minmax(0,1fr) 88px; gap:9px; }
    .pump-bet-row button,.pump-bet-row input {
      height:52px; min-width:0; box-sizing:border-box; border-radius:17px; border:1px solid rgba(255,255,255,.12);
      background:rgba(255,255,255,.045); color:#fff; text-align:center; outline:0;
      font:900 17px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    }
    .pump-action-row { display:grid; gap:9px; margin-top:12px; }
    .pump-action,.pump-cashout {
      width:100%; height:60px; border:0; border-radius:18px; font:950 18px/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      transition:transform .18s ease,filter .18s ease;
    }
    .pump-action:active,.pump-cashout:active,.pump-bet-row button:active { transform:scale(.976); }
    .pump-action { color:#18030a; background:linear-gradient(112deg,#fff 0%,#ffe4ed 55%,#d9a1b6 100%); }
    .pump-action.is-playing { color:#fff; background:linear-gradient(112deg,#8b1a42,#3c0619); border:1px solid rgba(255,212,228,.18); }
    .pump-cashout { display:none; color:#fff; background:linear-gradient(112deg,#206448,#0d3526); border:1px solid rgba(160,239,194,.38); }
    .pump-controls.is-playing .pump-cashout { display:block; }
    .pump-action:disabled,.pump-cashout:disabled,.pump-bet-row button:disabled,.pump-bet-row input:disabled { opacity:.48; }
    .pump-stage.is-burst #pumpCanvas { animation:pumpBurst .48s ease both; }
    @keyframes pumpBurst { 0%{filter:brightness(1)} 45%{filter:brightness(2.2) saturate(1.45)} 100%{filter:brightness(.56)} }
    @media(max-height:700px){ .pump-stage{height:390px;min-height:360px;} }
  </style>

  <div class="pump-page">
    <div id="pumpStage" class="pump-stage">
      <canvas id="pumpCanvas" aria-label="Pump balloon"></canvas>
    </div>

    <div id="pumpControls" class="pump-controls">
      <span class="pump-label">Bet amount</span>
      <div class="pump-bet-row">
        <button id="pumpHalf" type="button">1/2</button>
        <input id="pumpBet" inputmode="decimal" pattern="[0-9.]*" value="1" aria-label="Bet amount"/>
        <button id="pumpDouble" type="button">2×</button>
      </div>
      <div class="pump-action-row">
        <button id="pumpAction" class="pump-action" type="button">Start</button>
        <button id="pumpCashout" class="pump-cashout" type="button">Cash Out</button>
      </div>
    </div>
  </div>

  <script>
  (function(){
    var NANO=1000000000, state='idle', betNano=0, multiplier=1, pumps=0, roundId='', busy=false, scene3d=null;
    function q(id){return document.getElementById(id);}
    function readBalanceNano(){return window.VexaTonBalance&&typeof window.VexaTonBalance.read==='function'?Math.max(0,Math.floor(Number(window.VexaTonBalance.read())||0)):0;}
    function syncBalance(value){var n=Number(value);if(window.VexaTonBalance&&Number.isFinite(n)&&n>=0)window.VexaTonBalance.write(Math.floor(n),0);}
    function telegramInitData(){var tg=window.Telegram&&window.Telegram.WebApp;return tg?String(tg.initData||''):'';}
    function requestPump(path,body){var initData=telegramInitData();if(!initData)return Promise.reject(new Error('Open the Mini App inside Telegram'));var payload=Object.assign({initData:initData},body||{});return fetch('/app/api/pump/'+path,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(payload)}).then(function(response){return response.json().catch(function(){return null;}).then(function(data){if(!response.ok)throw new Error(data&&data.error?data.error:'Pump action failed');return data;});});}
    function toNano(value){var n=Number(String(value||'').replace(',','.'))||0;return Math.max(0,Math.floor(n*NANO));}
    function toTon(nano){var n=Math.max(0,Math.floor(Number(nano)||0))/NANO;return n.toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');}
    function formatMultiplier(value){return(Math.round((Number(value)||1)*100)/100).toFixed(2)+'x';}
    function currentBetNano(){var n=toNano(q('pumpBet')&&q('pumpBet').value);return n<1?NANO:n;}
    function setBetNano(nano){var input=q('pumpBet');if(input)input.value=toTon(Math.max(1,Math.floor(Number(nano)||NANO)));}
    function normalizeBet(){var balance=readBalanceNano(),amount=currentBetNano();if(balance>=NANO&&amount>balance)amount=balance;setBetNano(amount);return amount;}
    function applyRound(data){
      if(!data)return;
      if(data.roundId)roundId=String(data.roundId);
      if(Number.isFinite(Number(data.amountNano))&&Number(data.amountNano)>0){betNano=Math.floor(Number(data.amountNano));setBetNano(betNano);}
      multiplier=Math.max(1,Number(data.multiplier)||1);pumps=Math.max(0,Math.floor(Number(data.pumps)||0));syncBalance(data.tonBalanceNano);
      var status=String(data.status||'');state=status==='active'?'playing':status==='popped'?'popped':status==='cashed'?'cashed':'idle';
    }
    function render(){
      var controls=q('pumpControls'),action=q('pumpAction'),cashout=q('pumpCashout'),input=q('pumpBet'),half=q('pumpHalf'),double=q('pumpDouble'),stage=q('pumpStage'),playing=state==='playing';
      if(controls)controls.classList.toggle('is-playing',playing);
      if(action){action.textContent=playing?'Pump':'Start';action.classList.toggle('is-playing',playing);action.disabled=busy;}
      if(cashout){cashout.disabled=busy||!playing||pumps<1;cashout.textContent='Cash Out  '+formatMultiplier(multiplier);}
      if(input)input.disabled=busy||playing;if(half)half.disabled=busy||playing;if(double)double.disabled=busy||playing;
      if(stage)stage.classList.toggle('is-burst',state==='popped');
      if(scene3d)scene3d.setState(multiplier,pumps,state);
    }
    function resetSoon(delay){setTimeout(function(){state='idle';roundId='';betNano=0;multiplier=1;pumps=0;render();},delay);}
    function startRound(){if(busy)return;var amount=normalizeBet();busy=true;render();requestPump('start',{amountNano:amount}).then(function(data){applyRound(data);render();}).catch(function(){state='idle';render();}).finally(function(){busy=false;render();});}
    function pumpOnce(){
      if(busy)return;if(state!=='playing'){startRound();return;}if(!roundId)return;
      busy=true;render();requestPump('pump',{roundId:roundId}).then(function(data){applyRound(data);render();if(state==='popped')resetSoon(1250);}).catch(function(){render();}).finally(function(){busy=false;render();});
    }
    function cashOut(){
      if(busy||state!=='playing'||pumps<1||!roundId)return;
      busy=true;render();requestPump('cashout',{roundId:roundId}).then(function(data){applyRound(data);state='cashed';render();resetSoon(1050);}).catch(function(){render();}).finally(function(){busy=false;render();});
    }
    function multiplyBet(value){if(state==='playing'||busy)return;var balance=readBalanceNano(),current=currentBetNano(),next=value<1?Math.max(NANO,Math.floor(current/2)):current*2;if(balance>=NANO)next=Math.min(balance,next);setBetNano(next);}
    function bind(){
      var action=q('pumpAction'),cashout=q('pumpCashout'),half=q('pumpHalf'),double=q('pumpDouble'),input=q('pumpBet');
      if(action&&!action.dataset.pumpBound){action.dataset.pumpBound='1';action.addEventListener('click',pumpOnce);}
      if(cashout&&!cashout.dataset.pumpBound){cashout.dataset.pumpBound='1';cashout.addEventListener('click',cashOut);}
      if(half&&!half.dataset.pumpBound){half.dataset.pumpBound='1';half.addEventListener('click',function(){multiplyBet(.5);});}
      if(double&&!double.dataset.pumpBound){double.dataset.pumpBound='1';double.addEventListener('click',function(){multiplyBet(2);});}
      if(input&&!input.dataset.pumpBound){input.dataset.pumpBound='1';input.addEventListener('change',normalizeBet);input.addEventListener('blur',normalizeBet);}
      window.addEventListener('vexa-ton-balance-sync',normalizeBet);render();
    }
    function bootThree(){
      import('https://cdn.jsdelivr.net/npm/three@0.183.2/build/three.module.min.js').then(function(THREE){
        var canvas=q('pumpCanvas'),stage=q('pumpStage'),root=q('coinflip');if(!canvas||!stage||!root)return;
        var renderer=new THREE.WebGLRenderer({canvas:canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;renderer.outputColorSpace=THREE.SRGBColorSpace;
        var scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(29,1,.1,100);camera.position.set(0,.12,10.8);
        var balloonRoot=new THREE.Group();scene.add(balloonRoot);
        var material=new THREE.MeshPhysicalMaterial({color:0x570725,metalness:.1,roughness:.1,clearcoat:1,clearcoatRoughness:.035,reflectivity:1,iridescence:.16,iridescenceIOR:1.35});
        var balloon=new THREE.Mesh(new THREE.SphereGeometry(1.83,96,72),material);balloon.scale.set(.74,.96,.74);balloonRoot.add(balloon);
        var knot=new THREE.Mesh(new THREE.ConeGeometry(.14,.30,28),new THREE.MeshPhysicalMaterial({color:0x360010,metalness:.45,roughness:.14,clearcoat:.8}));knot.position.y=-2.15;knot.rotation.z=Math.PI;balloonRoot.add(knot);
        var topLight=new THREE.DirectionalLight(0xffd9e7,2.75);topLight.position.set(-3,5,6);scene.add(topLight);
        var ambient=new THREE.HemisphereLight(0x401326,0x050103,1.05);scene.add(ambient);
        var targetScale=1,pulse=0,clock=new THREE.Clock(),baseScale={x:.74,y:.96,z:.74},raf=0,disposed=false;
        function active(){return !document.hidden&&root.classList.contains('active')&&document.body.contains(canvas);}
        function resize(){var r=stage.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
        function dispose(){if(disposed)return;disposed=true;if(raf){cancelAnimationFrame(raf);raf=0}renderer.dispose();}
        function loop(){
          raf=0;
          if(!document.body.contains(canvas)){dispose();return}
          if(!active())return;
          var t=clock.getElapsedTime(),breath=1+Math.sin(t*1.05)*.008,stretch=1+pulse*.065;
          balloonRoot.rotation.y=Math.sin(t*.32)*.075;balloonRoot.position.y=Math.sin(t*.7)*.045;
          balloon.scale.set(baseScale.x*targetScale*breath*stretch,baseScale.y*targetScale*(1-pulse*.045),baseScale.z*targetScale*breath*stretch);
          knot.scale.set(1+Math.min(.12,pulse*.02),1,1+Math.min(.12,pulse*.02));pulse*=.89;renderer.render(scene,camera);
          raf=requestAnimationFrame(loop);
        }
        function syncLoop(){
          if(disposed)return;
          if(!document.body.contains(canvas)){dispose();return}
          if(active()){resize();if(!raf)raf=requestAnimationFrame(loop)}else if(raf){cancelAnimationFrame(raf);raf=0}
        }
        resize();
        window.addEventListener('resize',function(){if(active())resize()});
        window.addEventListener('vexa:view-changed',syncLoop);
        document.addEventListener('visibilitychange',syncLoop);
        scene3d={setState:function(value,count,nextState){targetScale=1+Math.min(.40,(Math.max(1,value)-1)*.075+count*.013);if(count>0)pulse=1;if(nextState==='popped'){pulse=7;material.emissive=new THREE.Color(0xa00036);setTimeout(function(){material.emissive=new THREE.Color(0x000000);},420);}}};
        render();syncLoop();
      }).catch(function(){});
    }
    bind();
    var threeBooted=false;
    function ensureThree(){if(threeBooted)return;var root=q('coinflip');if(!root||!root.classList.contains('active'))return;threeBooted=true;bootThree();}
    if(window.MutationObserver){var observer=new MutationObserver(ensureThree),root=q('coinflip');if(root)observer.observe(root,{attributes:true,attributeFilter:['class']});}
    document.addEventListener('click',function(){setTimeout(ensureThree,220)},true);ensureThree();
  })();
  </script>
</section>
`;
