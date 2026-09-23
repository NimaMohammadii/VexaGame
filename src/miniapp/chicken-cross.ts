// Chicken Cross owns its scene, controls and client state. Mounted only through the Play Hub lazy section.
export const CHICKEN_CROSS_SECTION = String.raw`
<section id="hilo" class="view cc-view" aria-label="Chicken Cross">
  <style>
    body:has(#hilo.active) .tabs{display:none!important}
    body:has(#hilo.active) .app,body:has(#hilo.active) .content,body:has(#hilo.active) header.top{background:#080b0d!important}
    body:has(#hilo.active) .app{display:flex;flex-direction:column;padding-bottom:calc(10px + env(safe-area-inset-bottom))}
    body:has(#hilo.active) header.top{flex-shrink:0}
    body:has(#hilo.active) [data-lazy-section-host="hilo"]{flex:1;min-height:0}
    .cc-view{--line:rgba(235,241,238,.12);height:100%;overflow-y:auto!important;overflow-x:hidden;color:#f1f2ed;background:#080b0d!important;padding:0;box-sizing:border-box;-webkit-overflow-scrolling:touch}
    .cc-page{width:min(100%,520px);height:100%;min-height:520px;margin:auto;display:grid;grid-template-rows:minmax(210px,1fr) auto}
    .cc-stage{min-height:210px;position:relative;overflow:hidden;background:linear-gradient(#182029,#080b0d 65%);isolation:isolate}
    .cc-stage canvas{width:100%;height:100%;display:block;touch-action:none}
    .cc-stage:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(4,7,10,.33),transparent 19%,transparent 72%,#080b0d 100%);z-index:2}
    .cc-topline{position:absolute;z-index:4;top:20px;left:20px;right:20px;display:flex;align-items:flex-start;justify-content:space-between;pointer-events:none;text-shadow:0 2px 12px #000}
    .cc-multiplier{font:750 42px/1 system-ui,sans-serif;letter-spacing:-.055em;font-variant-numeric:tabular-nums}.cc-multiplier small{display:block;margin-top:7px;font:700 10px system-ui,sans-serif;letter-spacing:.13em;color:#b5c0bb;text-transform:uppercase}
    .cc-counter{padding:8px 12px;border:1px solid rgba(255,255,255,.17);border-radius:100px;background:rgba(9,15,19,.56);font:700 11px system-ui,sans-serif;letter-spacing:.12em;backdrop-filter:blur(8px)}
    .cc-status{position:absolute;z-index:4;left:18px;right:18px;bottom:24px;min-height:19px;text-align:center;font:650 13px system-ui,sans-serif;color:#e6e9e6;text-shadow:0 2px 9px #000}.cc-status.win{color:#a9efc7}.cc-status.lose{color:#ffadb1}
    .cc-loading{position:absolute;inset:0;z-index:5;display:grid;place-content:center;text-align:center;gap:9px;background:#10171a;color:#c9d2d1;font:650 12px system-ui,sans-serif;letter-spacing:.1em;transition:opacity .4s,visibility .4s}.cc-loading.ready{opacity:0;visibility:hidden;pointer-events:none}.cc-loading b{font-size:18px;letter-spacing:0;color:white}
    .cc-panel{position:relative;z-index:3;padding:4px 18px 20px;background:#080b0d}
    .cc-panel-inner{border:1px solid var(--line);border-radius:21px;background:linear-gradient(160deg,#161b1d,#101315 65%,#0d1011);box-shadow:inset 0 1px rgba(255,255,255,.055),0 14px 26px rgba(0,0,0,.22);padding:17px}
    .cc-controls-label{display:flex;justify-content:space-between;color:#a6b0ae;text-transform:uppercase;letter-spacing:.11em;font:700 10px system-ui,sans-serif;margin-bottom:10px}
    .cc-difficulties{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}.cc-difficulties button{height:42px;border-radius:11px;border:1px solid var(--line);background:#1b2225;color:#aeb9b7;font:700 12px system-ui,sans-serif;transition:background .2s,transform .2s}.cc-difficulties button.active{background:#c4d6cb;color:#0b1916;border-color:#c4d6cb}.cc-difficulties button:active,.cc-actions button:active{transform:scale(.98)}
    .cc-wager{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;margin-bottom:14px}.cc-wager button,.cc-wager input{height:46px;border:1px solid var(--line);border-radius:12px;background:#1b2225;color:#f2f5f1;font:750 17px system-ui,sans-serif;text-align:center;box-sizing:border-box;min-width:0}.cc-wager input{outline:none;font-variant-numeric:tabular-nums}.cc-wager input:focus{border-color:#c4d6cb}.cc-wager button{font-size:22px}.cc-unit{position:relative}.cc-unit input{width:100%;padding:0 64px 0 15px}.cc-unit span{position:absolute;right:12px;top:16px;color:#a4b3ad;font:700 11px system-ui,sans-serif;pointer-events:none}
    .cc-actions{display:grid;grid-template-columns:1fr;gap:9px}.cc-actions.in-round{grid-template-columns:1.25fr .75fr}.cc-actions button{height:52px;border:0;border-radius:13px;font:750 15px system-ui,sans-serif;transition:transform .18s,opacity .18s}.cc-go{background:#c4d6cb;color:#0a1814}.cc-cash{display:none;background:#263c35;color:#d4f7e5;border:1px solid #466858!important}.cc-actions.in-round .cc-cash{display:block}.cc-actions button:disabled,.cc-difficulties button:disabled,.cc-wager input:disabled,.cc-wager button:disabled{opacity:.5}
    .cc-proof{margin:11px 2px 0;font:600 10px/1.4 system-ui,sans-serif;color:#81908b;word-break:break-all}.cc-proof strong{color:#c4d6cb}
    @media(max-height:700px){.cc-page{min-height:470px}.cc-panel-inner{padding:13px}.cc-difficulties{margin-bottom:10px}}
    @media(prefers-reduced-motion:reduce){.cc-difficulties button,.cc-actions button{transition:none}}
  </style>
  <div class="cc-page">
    <div class="cc-stage" data-cc-stage>
      <div class="cc-loading" data-cc-loading><b>CHICKEN CROSS</b><span>Preparing the road…</span></div>
      <div class="cc-topline"><div class="cc-multiplier" data-cc-multiplier>1.00×<small data-cc-next>Next crossing</small></div><div class="cc-counter" data-cc-counter>0 / 8</div></div>
      <div class="cc-status" data-cc-status aria-live="polite">Choose a risk and start crossing</div>
    </div>
    <div class="cc-panel"><div class="cc-panel-inner">
      <div class="cc-controls-label"><span>Difficulty</span><span>8 lanes</span></div>
      <div class="cc-difficulties"><button type="button" data-cc-risk="easy" class="active">Easy</button><button type="button" data-cc-risk="medium">Medium</button><button type="button" data-cc-risk="hard">Hard</button></div>
      <div class="cc-controls-label"><span>Bet amount</span><span>GRAM</span></div>
      <div class="cc-wager"><button type="button" data-cc-half aria-label="Halve bet">−</button><div class="cc-unit"><input data-cc-bet type="text" inputmode="decimal" value="0.1" aria-label="Bet amount in GRAM"><span>GRAM</span></div><button type="button" data-cc-double aria-label="Double bet">+</button></div>
      <div class="cc-actions" data-cc-actions><button type="button" class="cc-go" data-cc-go>Start crossing</button><button type="button" class="cc-cash" data-cc-cash>Cash out</button></div>
      <div class="cc-proof" data-cc-proof>Server verified round · seed commitment shown after starting</div>
    </div></div>
  </div>
  <script type="module">
  (async function(){
    const root=document.getElementById('hilo');if(!root||root.dataset.ready)return;root.dataset.ready='1';
    const q=(s)=>root.querySelector(s),stage=q('[data-cc-stage]'),loading=q('[data-cc-loading]'),go=q('[data-cc-go]'),cash=q('[data-cc-cash]'),actions=q('[data-cc-actions]'),input=q('[data-cc-bet]'),status=q('[data-cc-status]'),proof=q('[data-cc-proof]');
    const modes={easy:.93,medium:.84,hard:.72};let mode='easy',round=null,busy=false,engine=null,active=false,requestVersion=0;
    function tgData(){return String(window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.initData||'')}
    function money(n){return (Math.round(n*10000)/10000).toFixed(4).replace(/0+$/,'').replace(/\.$/,'')}
    function haptic(kind){try{const h=window.Telegram.WebApp.HapticFeedback;if(kind==='success'||kind==='error')h.notificationOccurred(kind);else h.impactOccurred('light')}catch(e){}}
    function message(text,kind){status.textContent=text;status.className='cc-status'+(kind?' '+kind:'')}
    function betNano(){return Math.floor(Number(String(input.value).replace(',','.'))*1e9)}
    function syncBalance(n){if(window.VexaTonBalance&&Number.isFinite(Number(n)))window.VexaTonBalance.write(Math.max(0,Math.floor(Number(n))),0)}
    async function api(path,body){const initData=tgData();if(!initData)throw Error('Open the Mini App in Telegram');const options=body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.assign({initData},body))}:{headers:{'x-telegram-init-data':initData},cache:'no-store'};const response=await fetch('/app/api/chicken-cross/'+path,options);const data=await response.json().catch(()=>null);if(!response.ok)throw Error(data&&data.error||'Could not reach the game server');return data}
    function render(){const playing=round&&round.status==='active';actions.classList.toggle('in-round',!!playing);go.textContent=playing?'Cross next lane':'Start crossing';go.disabled=busy||!engine;cash.disabled=busy||!engine||!playing||round.step<1;input.disabled=busy||!!playing;q('[data-cc-half]').disabled=busy||!!playing;q('[data-cc-double]').disabled=busy||!!playing;
      root.querySelectorAll('[data-cc-risk]').forEach(button=>{button.classList.toggle('active',button.dataset.ccRisk===mode);button.disabled=busy||!!playing});q('[data-cc-multiplier]').firstChild.nodeValue=(round?Number(round.multiplier):1).toFixed(2)+'×';q('[data-cc-next]').textContent=playing?'NEXT '+Number(round.nextMultiplier||1).toFixed(2)+'×':'NEXT '+Math.floor(.96/modes[mode]*100)/100+'×';q('[data-cc-counter]').textContent=(round?round.step:0)+' / 8';proof.innerHTML=round&&round.seedHash?'<strong>SHA-256</strong> '+round.seedHash+(round.seed?' · revealed':' · committed'):'Server verified round · seed commitment shown after starting';}
    function apply(data){if(data&&data.round){round=data.round;mode=round.difficulty;input.value=money(round.amountNano/1e9)}if(data&&data.tonBalanceNano!==undefined)syncBalance(data.tonBalanceNano);render()}
    function setBusy(value){busy=value;render()}
    async function start(){if(busy)return;const amount=betNano();if(!Number.isSafeInteger(amount)||amount<1000000||amount>20000000000){message('Bet must be between 0.001 and 20 GRAM','lose');return}setBusy(true);try{const data=await api('start',{amountNano:amount,difficulty:mode});apply(data);engine&&engine.setStep(round.step,false);message('Cross when the road is clear');haptic('light')}catch(e){message(e.message,'lose')}finally{setBusy(false)}}
    async function cross(){if(busy||!round||round.status!=='active')return;setBusy(true);const previous=round.step;message('Crossing…');try{const data=await api('step',{roundId:round.id});apply(data);if(data.event==='sync')engine&&engine.setStep(round.step,false);else if(engine)await engine.cross(previous,round.step,data.event==='hit');if(data.event==='hit'){message('Hit by traffic · round ended','lose');haptic('error')}else if(data.event==='finish'){message('All lanes crossed · payout credited','win');haptic('success')}else if(data.event==='safe'){message('Safe · continue or cash out');haptic('light')}else message('Round updated');}catch(e){message(e.message,'lose');await restore()}finally{setBusy(false)}}
    async function cashOut(){if(busy||!round)return;setBusy(true);try{const data=await api('cashout',{roundId:round.id});apply(data);if(round.status==='cashed'){message('Cashed out '+money(round.payoutNano/1e9)+' GRAM','win');haptic('success')}else message('Round updated · choose your next move')}catch(e){message(e.message,'lose');await restore()}finally{setBusy(false)}}
    async function restore(){if(!tgData())return;const version=++requestVersion;try{const data=await api('state');if(version!==requestVersion)return;round=data.round||null;if(round)apply(data);else render();engine&&engine.setStep(round?round.step:0,false);if(round&&round.status==='active')message('Round restored · cross or cash out')}catch(e){message(e.message,'lose')}}
    root.querySelectorAll('[data-cc-risk]').forEach(button=>button.addEventListener('click',()=>{if(busy||round&&round.status==='active')return;mode=button.dataset.ccRisk;render();haptic('light')}));
    q('[data-cc-half]').addEventListener('click',()=>{input.value=money(Math.max(.001,(Number(input.value)||.1)/2))});q('[data-cc-double]').addEventListener('click',()=>{input.value=money(Math.min(20,(Number(input.value)||.1)*2))});
    go.addEventListener('click',()=>round&&round.status==='active'?cross():start());cash.addEventListener('click',cashOut);
    async function activate(){if(active)return;active=true;const version=++requestVersion;try{if(!engine){const THREE=await import('/assets/chicken-cross/three.module.min.js');if(!active||version!==requestVersion)return;engine=createWorld(THREE,stage);loading.classList.add('ready');render()}engine.setActive(!document.hidden);await restore()}catch(e){loading.innerHTML='<b>Could not load the 3D road</b><span>Try opening the game again</span>';message('3D rendering unavailable','lose')}}
    function deactivate(){active=false;requestVersion++;if(engine)engine.setActive(false)}
    window.addEventListener('vexa:view-changed',event=>{if(event.detail&&event.detail.id==='hilo')activate();else deactivate()});
    document.addEventListener('visibilitychange',()=>{if(engine)engine.setActive(active&&!document.hidden)});
    if(root.classList.contains('active'))activate();render();

    function createWorld(T,container){
      const canvas=document.createElement('canvas');container.insertBefore(canvas,container.firstChild);
      const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});renderer.setClearColor(0x111a20);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.4;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
      const scene=new T.Scene();scene.background=new T.Color(0x172029);scene.fog=new T.FogExp2(0x172029,.011);
      const camera=new T.PerspectiveCamera(41,1,.2,170);const clock=new T.Clock();let running=false,frame=0,targetZ=9.8,shownZ=9.8,jumpStart=0,hitTime=0,hitCar=null,resolveCross=null,progressStep=0;
      const material=(color,metalness=0,roughness=.72)=>new T.MeshStandardMaterial({color,metalness,roughness});
      const asphalt=material(0x292f32,.08,.57);asphalt.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 roadUv;').replace('#include <begin_vertex>','#include <begin_vertex>\nroadUv=position.xz;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 roadUv;\nfloat roadNoise(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}').replace('#include <color_fragment>','#include <color_fragment>\nfloat grit=roadNoise(floor(roadUv*8.0));float patches=roadNoise(floor(roadUv*1.4));diffuseColor.rgb*=.79+grit*.13+patches*.13;');};
      const line=material(0xb8bcbc,0,.8),yellow=material(0xb9a675,0,.84),concrete=material(0x55585a,0,.9),curbMat=material(0x969994,0,.78),grass=material(0x253329,0,.98);
      function mesh(geometry,mat,parent,x=0,y=0,z=0){const obj=new T.Mesh(geometry,mat);obj.position.set(x,y,z);obj.receiveShadow=true;parent.add(obj);return obj}
      function box(w,h,d,mat,parent,x,y,z){return mesh(new T.BoxGeometry(w,h,d),mat,parent,x,y,z)}
      scene.add(new T.HemisphereLight(0xa8c4db,0x18140e,2.15));const sun=new T.DirectionalLight(0xffd8b3,2.9);sun.position.set(-18,28,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-32;sun.shadow.camera.right=32;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;sun.shadow.normalBias=.025;scene.add(sun);
      const road=box(145,.16,22.8,asphalt,scene,0,-.14,-2.2);road.castShadow=false;
      for(let i=1;i<8;i++){const z=9.2-i*2.84;const mat=i===4?yellow:line;for(let x=-72;x<74;x+=5.5)box(i===4?3.8:2.75,.012,i===4?.075:.055,mat,scene,x,.002,z)}
      for(const z of [9.3,-13.8]){box(145,.26,.34,curbMat,scene,0,.05,z);box(145,.12,3.4,concrete,scene,0,.025,z+(z>0?1.85:-1.85));box(145,.04,5,grass,scene,0,-.02,z+(z>0?5.8:-5.8));for(let x=-70;x<=70;x+=3.2)box(.04,.013,3.3,curbMat,scene,x,.09,z+(z>0?1.85:-1.85))}
      // Roadside architecture is subdued so the road and traffic remain the focus.
      const facade=[material(0x272b2d),material(0x343536),material(0x20272b)];for(let i=0;i<15;i++){const x=-67+i*9.6,h=4+(i*7%8);box(6.6,h,5.8,facade[i%3],scene,x,h/2,-26);if(i%2===0){const warm=new T.MeshBasicMaterial({color:0xb49b79});for(let f=1;f<h-1;f+=2.6)for(let w=-2;w<3;w+=2)box(.65,.9,.015,warm,scene,x+w,f,-23.06)}}
      function lamp(x,z){const pole=material(0x3b4245,.65,.35);box(.13,6,.13,pole,scene,x,3,z);box(2.2,.11,.13,pole,scene,x-1,5.94,z);const bulb=box(.5,.08,.23,new T.MeshBasicMaterial({color:0xffe1ab}),scene,x-2,5.84,z);bulb.castShadow=false;const glow=new T.PointLight(0xffd3a0,15,12,2);glow.position.set(x-2,5.6,z);scene.add(glow)}lamp(-8,-18);lamp(10,13);
      // Geometry of the cars is authored here: beveled body, glass cabin, lights and wheels.
      const tire=material(0x111315,.04,.98),rim=material(0x919a9b,.8,.28),glass=material(0x354550,.24,.12),lampWhite=new T.MeshBasicMaterial({color:0xffedcc}),lampRed=new T.MeshBasicMaterial({color:0xa51c19});
      const tireGeometry=new T.CylinderGeometry(.37,.37,.17,14),rimGeometry=new T.CylinderGeometry(.20,.20,.185,14);
      function car(color,direction){const group=new T.Group(),paint=material(color,.42,.29);scene.add(group);const shape=new T.Shape();shape.moveTo(-2.05,.38);shape.lineTo(-1.92,.80);shape.lineTo(-1.12,.91);shape.lineTo(-.65,1.48);shape.lineTo(.78,1.48);shape.lineTo(1.16,.91);shape.lineTo(1.95,.79);shape.lineTo(2.07,.42);shape.lineTo(2.07,.32);shape.lineTo(-2.05,.32);const shell=new T.ExtrudeGeometry(shape,{depth:1.54,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.13,bevelThickness:.10,curveSegments:3});mesh(shell,paint,group,0,0,-.77).castShadow=true;
        box(1.3,.41,1.33,glass,group,.05,1.16,0);box(1.3,.055,1.42,paint,group,.05,1.52,0);
        for(const x of [-1.27,1.22])for(const z of [-.82,.82]){const wheel=mesh(tireGeometry,tire,group,x,.38,z);wheel.rotation.x=Math.PI/2;const hub=mesh(rimGeometry,rim,group,x,.38,z+(z>0?.012:-.012));hub.rotation.x=Math.PI/2;}
        for(const z of [-.52,.52]){box(.09,.18,.28,lampWhite,group,direction>0?2.09:-2.09,.68,z);box(.08,.15,.28,lampRed,group,direction>0?-2.09:2.09,.66,z)}
        return group}
      const colors=[0x555e65,0x714942,0x3b4f5b,0x807b70,0x24292b,0x60605a,0x3f4a43,0x55515a];const traffic=[];
      for(let lane=0;lane<8;lane++){const z=7.78-lane*2.84,direction=lane<4?1:-1;for(let j=0;j<2;j++){const obj=car(colors[(lane+j*3)%colors.length],direction);const x=(j?21:-22)+(lane%3)*7;obj.position.set(x,0,z);traffic.push({obj,z,direction,speed:5.3+(lane*3+j*2)%5})}}
      // A realistic bird silhouette built from layered plumage, articulated legs and a subtle head turn.
      const bird=new T.Group();scene.add(bird);const feather=material(0xe2d8c5,0,.92),shade=material(0xc5bba9,0,.94),tip=material(0xb5a993,0,.96),dark=material(0x282a27,0,.55),beak=material(0x9a8064,0,.8),legMat=material(0x9a8268,0,.88),comb=material(0x96433c,0,.86);
      function oval(parent,sx,sy,sz,x,y,z,mat){const m=mesh(new T.SphereGeometry(1,16,12),mat,parent,x,y,z);m.scale.set(sx,sy,sz);return m}
      const body=new T.Group();bird.add(body);oval(body,.68,.63,.9,0,.97,0,feather).castShadow=true;oval(body,.53,.49,.67,0,.92,-.08,shade);
      const head=new T.Group();head.position.set(0,1.67,-.48);body.add(head);oval(head,.34,.35,.36,0,0,0,feather);const bill=mesh(new T.ConeGeometry(.14,.38,8),beak,head,0,-.11,-.38);bill.rotation.x=-Math.PI/2;
      for(const x of [-.24,.24]){oval(head,.044,.052,.039,x,.035,-.258,dark);oval(body,.3,.22,.53,x>0?.56:-.56,1.04,.12,shade)}
      for(let side of [-1,1])for(let row=0;row<3;row++)for(let i=0;i<5;i++){
        const piece=oval(body,.12,.045,.22,side*(.53-row*.09),1.13-row*.16,-.35+i*.20,(i+row)%3?shade:tip);
        piece.rotation.y=side*.18;piece.rotation.x=-.15;
      }
      for(let i=0;i<3;i++)oval(head,.105,.15,.12,0,.30,-.18+i*.12,comb);
      for(let i=0;i<7;i++){const x=(i-3)*.12;const tail=oval(body,.08,.09,.34,x,1.13,.83,feather);tail.rotation.x=-.32;tail.rotation.z=(i-3)*.12}
      const legs=[];for(const x of [-.25,.25]){const leg=new T.Group();leg.position.set(x,.64,.16);body.add(leg);box(.09,.53,.09,legMat,leg,0,-.27,0);for(let j=-1;j<=1;j++)box(.052,.04,.34,legMat,leg,j*.09,-.53,-.15);legs.push(leg)}
      bird.position.set(0,.03,9.8);bird.rotation.y=0;
      // Face the road and follow the bird from left to right without turning the camera.
      const cameraDistance=Math.hypot(28,16),roadWidth=20;
      const cameraCenter=(z)=>Math.max(-9.4,z-4);
      let cameraZ=cameraCenter(shownZ);
      function resize(){const r=container.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=2*Math.atan(roadWidth/(2*cameraDistance*camera.aspect))*180/Math.PI;camera.updateProjectionMatrix()}
      const observer=new ResizeObserver(resize);observer.observe(container);resize();
      function frameLoop(){if(!running)return;frame=requestAnimationFrame(frameLoop);const dt=Math.min(.05,clock.getDelta()),now=performance.now();for(const car of traffic){if(hitTime&&car===hitCar)continue;car.obj.position.x+=car.speed*car.direction*dt;if(car.obj.position.x>53)car.obj.position.x=-53;if(car.obj.position.x< -53)car.obj.position.x=53}
        shownZ+=(targetZ-shownZ)*Math.min(1,dt*7);bird.position.z=shownZ;let hop=0;if(jumpStart){const t=Math.min(1,(now-jumpStart)/630);hop=Math.sin(t*Math.PI)*.46;body.rotation.x=Math.sin(t*Math.PI)*-.13;legs[0].rotation.x=Math.sin(t*Math.PI*2)*.5;legs[1].rotation.x=-legs[0].rotation.x;if(t===1){jumpStart=0;body.rotation.x=0;legs.forEach(l=>l.rotation.x=0);if(resolveCross){const done=resolveCross;resolveCross=null;done()}}}
        bird.position.y=.03+hop;head.rotation.y=Math.sin(now*.0008)*.08;
        if(hitTime&&hitCar){const p=Math.min(1,(now-hitTime)/820);hitCar.obj.position.x=-8+9*p;hitCar.obj.position.z=targetZ;body.rotation.z=p> .55?(p-.55)*1.6:0;if(p===1){hitTime=0;hitCar.obj.position.x=-45}}
        else body.rotation.z*=.85;
        cameraZ+=(cameraCenter(shownZ)-cameraZ)*(1-Math.exp(-dt*3));camera.position.z=cameraZ;camera.lookAt(0,0,cameraZ);renderer.render(scene,camera)}
      function setActive(value){if(value===running)return;running=value;if(running){clock.getDelta();resize();frame=requestAnimationFrame(frameLoop)}else{cancelAnimationFrame(frame);shownZ=targetZ;bird.position.z=targetZ;jumpStart=0;hitTime=0;body.rotation.z=0;if(hitCar)hitCar.obj.position.x=-45;if(resolveCross){const done=resolveCross;resolveCross=null;done()}}}
      function setStep(step,animate){progressStep=Math.max(0,Math.min(8,Number(step)||0));targetZ=9.8-progressStep*2.84;if(!animate){shownZ=targetZ;bird.position.z=targetZ;body.rotation.z=0;cameraZ=cameraCenter(targetZ);camera.position.z=cameraZ;camera.lookAt(0,0,cameraZ)}}
      function cross(before,after,hit){setStep(after,true);if(!running){shownZ=targetZ;return Promise.resolve()}jumpStart=performance.now();if(hit){hitCar=traffic[after%traffic.length];hitTime=jumpStart;hitCar.obj.position.x=-8}return new Promise(resolve=>{resolveCross=resolve})}
      camera.position.set(28,16,cameraZ);camera.lookAt(0,0,cameraZ);
      return {setActive,setStep,cross};
    }
  })();
  </script>
</section>`;
