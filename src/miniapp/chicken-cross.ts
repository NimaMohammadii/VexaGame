// Chicken Cross owns its scene, controls and client state. Mounted only through the Play Hub lazy section.
export const CHICKEN_CROSS_SECTION = String.raw`
<section id="hilo" class="view cc-view" aria-label="Chicken Cross">
  <style>
    body:has(#hilo.active) .tabs{display:none!important}
    body:has(#hilo.active) .app,body:has(#hilo.active) .content,body:has(#hilo.active) header.top{background:#080b0d!important}
    body:has(#hilo.active) .app{display:flex;flex-direction:column;padding-bottom:calc(10px + env(safe-area-inset-bottom))}
    body:has(#hilo.active) header.top{flex-shrink:0}
    body:has(#hilo.active) [data-lazy-section-host="hilo"]{flex:1;min-height:0}
    .cc-view{--line:rgba(203,159,161,.17);height:100%;overflow-y:auto!important;overflow-x:hidden;color:#f1f2ed;background:#080b0d!important;padding:0;box-sizing:border-box;-webkit-overflow-scrolling:touch}
    .cc-page{width:min(100%,520px);height:100%;min-height:520px;margin:auto;display:grid;grid-template-rows:minmax(210px,1fr) auto}
    .cc-stage{min-height:210px;position:relative;overflow:hidden;background:linear-gradient(#182029,#080b0d 65%);isolation:isolate}
    .cc-stage canvas{width:100%;height:100%;display:block;touch-action:none}
    .cc-stage:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(4,7,10,.33),transparent 19%,transparent 72%,#080b0d 100%);z-index:2}
    .cc-topline{position:absolute;z-index:4;top:20px;left:20px;right:20px;display:flex;align-items:flex-start;justify-content:space-between;pointer-events:none;text-shadow:0 2px 12px #000}
    .cc-multiplier{font:750 42px/1 system-ui,sans-serif;letter-spacing:-.055em;font-variant-numeric:tabular-nums}.cc-multiplier small{display:block;margin-top:7px;font:700 10px system-ui,sans-serif;letter-spacing:.13em;color:#b5c0bb;text-transform:uppercase}
    .cc-counter{padding:8px 12px;border:1px solid rgba(178,108,114,.35);border-radius:100px;background:rgba(28,14,20,.7);font:700 11px system-ui,sans-serif;letter-spacing:.12em;backdrop-filter:blur(8px)}
    .cc-status{position:absolute;z-index:4;left:18px;right:18px;bottom:24px;min-height:19px;text-align:center;font:650 13px system-ui,sans-serif;color:#e6e9e6;text-shadow:0 2px 9px #000}.cc-status.win{color:#a9efc7}.cc-status.lose{color:#ffadb1}
    .cc-loading{position:absolute;inset:0;z-index:5;display:grid;place-content:center;text-align:center;gap:9px;background:#10171a;color:#c9d2d1;font:650 12px system-ui,sans-serif;letter-spacing:.1em;transition:opacity .4s,visibility .4s}.cc-loading.ready{opacity:0;visibility:hidden;pointer-events:none}.cc-loading b{font-size:18px;letter-spacing:0;color:white}
    .cc-panel{position:relative;z-index:3;padding:4px 18px 20px;background:#080b0d}
    .cc-panel-inner{border:1px solid var(--line);border-radius:21px;background:linear-gradient(160deg,#21171b,#141215 65%,#101012);box-shadow:inset 0 1px rgba(255,255,255,.06),0 14px 26px rgba(0,0,0,.22);padding:17px}
    .cc-controls-label{display:flex;justify-content:space-between;color:#a6b0ae;text-transform:uppercase;letter-spacing:.11em;font:700 10px system-ui,sans-serif;margin-bottom:10px}
    .cc-difficulties{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}.cc-difficulties button{height:42px;border-radius:11px;border:1px solid var(--line);background:#251e22;color:#cbbfc0;font:700 12px system-ui,sans-serif;transition:background .2s,transform .2s}.cc-difficulties button.active{background:#70434d;color:#fff;border-color:#aa737b}.cc-difficulties button:active,.cc-actions button:active{transform:scale(.98)}
    .cc-wager{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;margin-bottom:14px}.cc-wager button,.cc-wager input{height:46px;border:1px solid var(--line);border-radius:12px;background:#251e22;color:#f2f5f1;font:750 17px system-ui,sans-serif;text-align:center;box-sizing:border-box;min-width:0}.cc-wager input{outline:none;font-variant-numeric:tabular-nums}.cc-wager input:focus{border-color:#b48289}.cc-wager button{font-size:22px}.cc-unit{position:relative}.cc-unit input{width:100%;padding:0 64px 0 15px}.cc-unit span{position:absolute;right:12px;top:16px;color:#b8a6a7;font:700 11px system-ui,sans-serif;pointer-events:none}
    .cc-decision{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 12px;color:#b9abae;font:650 11px system-ui,sans-serif}.cc-decision strong{color:#f2f5f1;font:750 14px system-ui,sans-serif;font-variant-numeric:tabular-nums;text-align:right}.cc-decision[hidden],.cc-setup[hidden]{display:none}
    .cc-actions{display:grid;grid-template-columns:1fr;gap:9px}.cc-actions.in-round{grid-template-columns:1.25fr .75fr}.cc-actions button{height:52px;border:0;border-radius:13px;font:750 15px system-ui,sans-serif;transition:transform .18s,opacity .18s}.cc-go{background:linear-gradient(160deg,#8b4c59,#542934);color:#fff;border:1px solid #a26671!important;box-shadow:inset 0 1px rgba(255,255,255,.15)}.cc-cash{display:none;background:#263c35;color:#d4f7e5;border:1px solid #466858!important}.cc-actions.in-round .cc-cash{display:block}.cc-actions button:disabled,.cc-difficulties button:disabled,.cc-wager input:disabled,.cc-wager button:disabled{opacity:.5}
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
      <div class="cc-setup" data-cc-setup>
        <div class="cc-controls-label"><span>Difficulty</span><span>8 lanes</span></div>
        <div class="cc-difficulties"><button type="button" data-cc-risk="easy" class="active">Easy</button><button type="button" data-cc-risk="medium">Medium</button><button type="button" data-cc-risk="hard">Hard</button></div>
        <div class="cc-controls-label"><span>Bet amount</span><span>GRAM</span></div>
        <div class="cc-wager"><button type="button" data-cc-half aria-label="Halve bet">−</button><div class="cc-unit"><input data-cc-bet type="text" inputmode="decimal" value="0.1" aria-label="Bet amount in GRAM"><span>GRAM</span></div><button type="button" data-cc-double aria-label="Double bet">+</button></div>
      </div>
      <div class="cc-decision" data-cc-decision hidden><span>Cash out now</span><strong data-cc-quote>Cross one lane first</strong></div>
      <div class="cc-actions" data-cc-actions><button type="button" class="cc-go" data-cc-go>Start crossing</button><button type="button" class="cc-cash" data-cc-cash>Cash out</button></div>
    </div></div>
  </div>
  <script type="module">
  (async function(){
    const root=document.getElementById('hilo');if(!root||root.dataset.ready)return;root.dataset.ready='1';
    const q=(s)=>root.querySelector(s),stage=q('[data-cc-stage]'),loading=q('[data-cc-loading]'),go=q('[data-cc-go]'),cash=q('[data-cc-cash]'),actions=q('[data-cc-actions]'),input=q('[data-cc-bet]'),status=q('[data-cc-status]'),setup=q('[data-cc-setup]'),decision=q('[data-cc-decision]'),quote=q('[data-cc-quote]');
    let mode='easy',round=null,busy=false,engine=null,active=false,requestVersion=0;
    function tgData(){return String(window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.initData||'')}
    function money(n){return (Math.round(n*10000)/10000).toFixed(4).replace(/0+$/,'').replace(/\.$/,'')}
    function haptic(kind){try{const h=window.Telegram.WebApp.HapticFeedback;if(kind==='success'||kind==='error')h.notificationOccurred(kind);else h.impactOccurred('light')}catch(e){}}
    function message(text,kind){status.textContent=text;status.className='cc-status'+(kind?' '+kind:'')}
    function betNano(){return Math.floor(Number(String(input.value).replace(',','.'))*1e9)}
    function syncBalance(n){if(window.VexaTonBalance&&Number.isFinite(Number(n)))window.VexaTonBalance.write(Math.max(0,Math.floor(Number(n))),0)}
    async function api(path,body){const initData=tgData();if(!initData)throw Error('Open the Mini App in Telegram');const options=body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.assign({initData},body))}:{headers:{'x-telegram-init-data':initData},cache:'no-store'};const response=await fetch('/app/api/chicken-cross/'+path,options);const data=await response.json().catch(()=>null);if(!response.ok)throw Error(data&&data.error||'Could not reach the game server');return data}
    function render(){const playing=round&&round.status==='active';setup.hidden=!!playing;decision.hidden=!playing;actions.classList.toggle('in-round',!!playing);go.textContent=playing?'Cross next lane':'Start crossing';go.disabled=busy||!engine;cash.disabled=busy||!engine||!playing||round.step<1;quote.textContent=playing&&round.step>0&&Number.isSafeInteger(round.cashoutQuoteNano)?'≈ '+money(round.cashoutQuoteNano/1e9)+' GRAM':'Cross one lane first';input.disabled=busy||!!playing;q('[data-cc-half]').disabled=busy||!!playing;q('[data-cc-double]').disabled=busy||!!playing;
      root.querySelectorAll('[data-cc-risk]').forEach(button=>{button.classList.toggle('active',button.dataset.ccRisk===mode);button.disabled=busy||!!playing});q('[data-cc-multiplier]').firstChild.nodeValue=round&&round.status==='lost'?'0.00×':(round?Number(round.multiplier):1).toFixed(2)+'×';q('[data-cc-next]').textContent=playing?'NEXT '+Number(round.nextMultiplier).toFixed(2)+'×':round&&round.status==='lost'?'ROUND ENDED':round&&round.status==='cashed'?'CASHED OUT':'NEXT CROSSING';q('[data-cc-counter]').textContent=(round?round.step:0)+' / 8';}
    function apply(data){if(data&&data.round){round=data.round;mode=round.difficulty;input.value=money(round.amountNano/1e9)}if(data&&data.tonBalanceNano!==undefined)syncBalance(data.tonBalanceNano);render()}
    function setBusy(value){busy=value;render()}
    async function start(){if(busy)return;const amount=betNano();if(!Number.isSafeInteger(amount)||amount<1000000||amount>20000000000){message('Bet must be between 0.001 and 20 GRAM','lose');return}setBusy(true);try{const data=await api('start',{amountNano:amount,difficulty:mode});apply(data);engine&&engine.setStep(round.step,false);message('Each crossing risks the round · choose your next step');haptic('light')}catch(e){message(e.message,'lose')}finally{setBusy(false)}}
    async function cross(){if(busy||!round||round.status!=='active')return;setBusy(true);const previous=round.step;message('Crossing…');try{const data=await api('step',{roundId:round.id});if(data.event==='sync'){apply(data);engine&&engine.setStep(round.step,false)}else{if(engine)await engine.cross(previous,data.round.step,data.event==='hit');apply(data)}if(data.event==='hit'){message('Hit by traffic · round ended','lose');haptic('error')}else if(data.event==='finish'){message('All lanes crossed · payout credited','win');haptic('success')}else if(data.event==='safe'){message('Safe · cash out or cross again');haptic('light')}else message('Round updated');}catch(e){message(e.message,'lose');await restore()}finally{setBusy(false)}}
    async function cashOut(){if(busy||!round)return;setBusy(true);try{const data=await api('cashout',{roundId:round.id});apply(data);if(round.status==='cashed'){message('Cashed out '+money(round.payoutNano/1e9)+' GRAM','win');haptic('success')}else message('Round updated · choose your next move')}catch(e){message(e.message,'lose');await restore()}finally{setBusy(false)}}
    async function restore(){if(!tgData())return;const version=++requestVersion;try{const data=await api('state');if(version!==requestVersion)return;round=data.round||null;if(round)apply(data);else render();engine&&engine.setStep(round?round.step:0,false);if(round&&round.status==='active')message('Round restored · cross or cash out')}catch(e){message(e.message,'lose')}}
    root.querySelectorAll('[data-cc-risk]').forEach(button=>button.addEventListener('click',()=>{if(busy||round&&round.status==='active')return;mode=button.dataset.ccRisk;render();haptic('light')}));
    q('[data-cc-half]').addEventListener('click',()=>{input.value=money(Math.max(.001,(Number(input.value)||.1)/2))});q('[data-cc-double]').addEventListener('click',()=>{input.value=money(Math.min(20,(Number(input.value)||.1)*2))});
    go.addEventListener('click',()=>round&&round.status==='active'?cross():start());cash.addEventListener('click',cashOut);
    function assetImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Could not load the game backdrop'));image.src=src})}
    async function activate(){if(active)return;active=true;const version=++requestVersion;try{if(!engine){const [THREE,backdrop]=await Promise.all([import('/assets/chicken-cross/three.module.min.js'),assetImage('/assets/chicken-cross/city-sky.webp')]);if(!active||version!==requestVersion)return;engine=createWorld(THREE,stage,backdrop);loading.classList.add('ready');render()}engine.setActive(!document.hidden);await restore()}catch(e){loading.innerHTML='<b>Could not load the 3D road</b><span>Try opening the game again</span>';message('3D rendering unavailable','lose')}}
    function deactivate(){active=false;requestVersion++;if(engine)engine.setActive(false)}
    window.addEventListener('vexa:view-changed',event=>{if(event.detail&&event.detail.id==='hilo')activate();else deactivate()});
    document.addEventListener('visibilitychange',()=>{if(engine)engine.setActive(active&&!document.hidden)});
    if(root.classList.contains('active'))activate();render();

    function createWorld(T,container,backdrop){
      const canvas=document.createElement('canvas');container.insertBefore(canvas,container.firstChild);
      const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});renderer.setClearColor(0x1b1118);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
      const scene=new T.Scene();scene.background=new T.Color(0x1b1118);scene.fog=new T.FogExp2(0x21141b,.014);
      const camera=new T.PerspectiveCamera(41,1,.2,170);const clock=new T.Clock();let running=false,frame=0,targetZ=9.8,shownZ=9.8,jumpStart=0,hitTime=0,hitCar=null,resolveCross=null,progressStep=0;
      const material=(color,metalness=0,roughness=.72)=>new T.MeshStandardMaterial({color,metalness,roughness});
      const backdropTexture=new T.Texture(backdrop);backdropTexture.colorSpace=T.SRGBColorSpace;backdropTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());backdropTexture.needsUpdate=true;const backdropPlane=new T.Mesh(new T.PlaneGeometry(72,24),new T.MeshBasicMaterial({map:backdropTexture,fog:false,toneMapped:false}));backdropPlane.position.set(-67,11,-2.2);backdropPlane.rotation.y=Math.PI/2;backdropPlane.renderOrder=-1;scene.add(backdropPlane);
      // Object-space procedural surfaces stay sharp at every camera distance and need no downloaded images.
      function texturedSurface(mat,fragment){mat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 surfaceUv;').replace('#include <begin_vertex>','#include <begin_vertex>\nsurfaceUv=position.xz;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 surfaceUv;\nfloat surfaceNoise(vec2 p){vec3 v=fract(vec3(p.xyx)*.1031);v+=dot(v,v.yzx+33.33);return fract((v.x+v.y)*v.z);}\nfloat surfaceSoft(vec2 p){vec2 c=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(surfaceNoise(c),surfaceNoise(c+vec2(1.0,0.0)),f.x),mix(surfaceNoise(c+vec2(0.0,1.0)),surfaceNoise(c+vec2(1.0,1.0)),f.x),f.y);}').replace('#include <color_fragment>','#include <color_fragment>\n'+fragment)}}
      const asphalt=material(0x383039,.07,.78);texturedSurface(asphalt,'float aggregate=surfaceNoise(floor(surfaceUv*12.0));float fine=surfaceNoise(floor(surfaceUv*38.0));float wear=surfaceSoft(surfaceUv*.55);float lane=fract((surfaceUv.y+10.0)/2.84);float track=min(abs(lane-.28),abs(lane-.72));float tireWear=1.0-smoothstep(.035,.13,track);diffuseColor.rgb*=.74+aggregate*.19+fine*.09+wear*.16-tireWear*.10;');
      const paving=material(0x30272d,0,.98),stone=material(0x826e75,0,.88);texturedSurface(stone,'float grain=surfaceNoise(floor(surfaceUv*26.0));float mottling=surfaceSoft(surfaceUv*3.0);diffuseColor.rgb*=.77+grain*.10+mottling*.18;');
      const line=material(0xbab2ae,0,.86),yellow=material(0xba9c7a,0,.85),curbMat=material(0x765860,0,.85),grass=material(0x24302a,0,.98);
      texturedSurface(grass,'float clumps=surfaceSoft(surfaceUv*3.5);float blades=surfaceNoise(floor(surfaceUv*30.0));diffuseColor.rgb*=.66+clumps*.24+blades*.18;');
      function mesh(geometry,mat,parent,x=0,y=0,z=0){const obj=new T.Mesh(geometry,mat);obj.position.set(x,y,z);obj.receiveShadow=true;parent.add(obj);return obj}
      function box(w,h,d,mat,parent,x,y,z){return mesh(new T.BoxGeometry(w,h,d),mat,parent,x,y,z)}
      scene.add(new T.HemisphereLight(0xc7b5bc,0x241017,2.15));const sun=new T.DirectionalLight(0xffdfc9,2.65);sun.position.set(-18,28,15);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-32;sun.shadow.camera.right=32;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;sun.shadow.normalBias=.025;scene.add(sun);
      const road=box(145,.16,22.8,asphalt,scene,0,-.14,-2.2);road.castShadow=false;
      const gutter=material(0x33252c,.06,.46);for(const z of [9,-13.4])box(145,.012,.25,gutter,scene,0,-.047,z);
      for(let i=1;i<8;i++){const z=9.2-i*2.84;const mat=i===4?yellow:line;for(let x=-72;x<74;x+=5.5)box(i===4?3.8:2.75,.012,i===4?.075:.055,mat,scene,x,.002,z)}
      const stoneShape=new T.Shape();stoneShape.moveTo(-.75,-.76);stoneShape.lineTo(.75,-.76);stoneShape.lineTo(.75,.76);stoneShape.lineTo(-.75,.76);stoneShape.closePath();const stoneGeometry=new T.ExtrudeGeometry(stoneShape,{depth:.045,bevelEnabled:true,bevelThickness:.012,bevelSize:.014,bevelSegments:1,steps:1});stoneGeometry.rotateX(-Math.PI/2);
      const stones=new T.InstancedMesh(stoneGeometry,stone,360),tile=new T.Object3D(),tileColor=new T.Color();let tileIndex=0;stones.receiveShadow=true;
      for(const z of [9.3,-13.8]){const center=z+(z>0?1.85:-1.85);box(145,.26,.34,curbMat,scene,0,.05,z);box(145,.12,3.4,paving,scene,0,.025,center);box(145,.04,5,grass,scene,0,-.02,z+(z>0?5.8:-5.8));for(let row=0;row<2;row++)for(let col=0;col<90;col++){const variation=((col*17+row*7+(z>0?3:0))%13)/12;tile.position.set(-71.2+col*1.6+(row?.8:0),.09,center+(row?.82:-.82));tile.updateMatrix();stones.setMatrixAt(tileIndex,tile.matrix);const tint=.77+variation*.21;tileColor.setRGB(tint,tint*.96,tint*.97);stones.setColorAt(tileIndex,tileColor);tileIndex++}}scene.add(stones);
      // The left sidewalk faces the camera (+Z); keep its buildings sparse and away from the crossing.
      const concrete=material(0x50444b,0,.92),masonry=material(0x39363b,0,.87),frameMat=material(0x25292d,.55,.42),windowMat=material(0x354148,.28,.19),litWindow=new T.MeshStandardMaterial({color:0x665749,emissive:0x8e6350,emissiveIntensity:.32,metalness:.15,roughness:.32});
      for(const [x,w,h,face] of [[-34,10,8.5,18.2],[-19,9,11,18.2],[-3,11,9,14.8]]){box(w,h,6,masonry,scene,x,h/2,face+3);box(w+.28,.25,6.3,concrete,scene,x,h+.12,face+3);box(w+.35,.46,6.4,concrete,scene,x,.23,face+3);
        for(let floor=0;floor<3;floor++)for(let column=-1;column<=1;column++){const wx=x+column*(w/3.45),wy=1.9+floor*2.25;if(wy+1.2>h)continue;box(1.35,1.25,.05,frameMat,scene,wx,wy,face-.06);box(1.12,1.02,.065,(floor+column+Math.round(x))%5===0?litWindow:windowMat,scene,wx,wy,face-.095);box(.055,1.25,.09,frameMat,scene,wx,wy,face-.15);box(1.55,.065,.18,concrete,scene,wx,wy-.67,face-.2)}
        for(const edge of [-1,1])box(.16,h,.22,concrete,scene,x+edge*(w/2-.3),h/2,face-.12);
      }
      const bark=material(0x51433e,0,.97),leaves=[material(0x253a32,0,1),material(0x2e4339,0,1),material(0x34473c,0,1)];for(const leaf of leaves)texturedSurface(leaf,'float clusters=surfaceSoft(surfaceUv*8.0);float twigs=surfaceNoise(floor(surfaceUv*28.0));diffuseColor.rgb*=.77+clusters*.23+twigs*.09;');
      for(const [x,z,height] of [[-26,17.8,4.2],[-10,18.1,4.8]]){const trunk=mesh(new T.CylinderGeometry(.095,.19,height,9),bark,scene,x,height/2,z);trunk.castShadow=true;for(let i=0;i<5;i++){const a=i*2.4,r=i===4?0:.58;const crown=mesh(new T.SphereGeometry(i===4?1.25:1.05,16,12),leaves[i%3],scene,x+Math.cos(a)*r,height+.35+Math.sin(i*3)*.35,z+Math.sin(a)*r);crown.scale.set(.9,1.22,.85);crown.castShadow=true}}
      function lamp(x,z,tint){const pole=material(0x4a383e,.65,.35);box(.13,6,.13,pole,scene,x,3,z);box(2.2,.11,.13,pole,scene,x-1,5.94,z);const bulb=box(.5,.08,.23,new T.MeshBasicMaterial({color:tint}),scene,x-2,5.84,z);bulb.castShadow=false;const glow=new T.PointLight(tint,15,12,2);glow.position.set(x-2,5.6,z);scene.add(glow)}lamp(-8,-18,0xffcba8);lamp(-17,13,0xf0a5a8);
      // Deep concrete tunnel occupies the far end of all eight lanes. Cars spawn beyond its mouth.
      const tunnelStone=material(0x403a40,0,.96),tunnelEdge=material(0x675b60,.08,.8),tunnelDark=new T.MeshBasicMaterial({color:0x090c10}),tunnelLight=new T.MeshBasicMaterial({color:0x9d8170});
      box(.12,7.5,24,tunnelDark,scene,-58,3.75,-2.2);box(12,.32,28,tunnelStone,scene,-54,7.45,-2.2);
      for(const z of [-15.1,10.7])box(12,7.5,1.5,tunnelStone,scene,-54,3.75,z);
      for(const x of [-59,-53,-48]){for(const z of [-14,9.6])box(.52,7.55,1,tunnelEdge,scene,x,3.78,z);box(.52,.9,24.6,tunnelEdge,scene,x,7.25,-2.2);box(.55,.09,24.5,concrete,scene,x,6.76,-2.2)}
      for(const z of [-10,-2.2,5.6])box(8,.04,.11,tunnelLight,scene,-53,7.18,z);
      // Geometry of the cars is authored here: beveled body, glass cabin, lights and wheels.
      const tire=material(0x111315,.04,.98),rim=material(0x919a9b,.8,.28),glass=material(0x354550,.24,.12),trim=material(0x18191c,.35,.5),lampWhite=new T.MeshBasicMaterial({color:0xffedcc}),lampRed=new T.MeshBasicMaterial({color:0xa51c19});
      const tireGeometry=new T.CylinderGeometry(.37,.37,.17,20),rimGeometry=new T.CylinderGeometry(.20,.20,.185,20);
      function car(color,direction){const group=new T.Group(),paint=material(color,.42,.29);scene.add(group);const shape=new T.Shape();shape.moveTo(-2.05,.38);shape.lineTo(-1.92,.80);shape.lineTo(-1.12,.91);shape.lineTo(-.65,1.48);shape.lineTo(.78,1.48);shape.lineTo(1.16,.91);shape.lineTo(1.95,.79);shape.lineTo(2.07,.42);shape.lineTo(2.07,.32);shape.lineTo(-2.05,.32);const shell=new T.ExtrudeGeometry(shape,{depth:1.54,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.13,bevelThickness:.10,curveSegments:3});mesh(shell,paint,group,0,0,-.77).castShadow=true;
        box(1.3,.41,1.33,glass,group,.05,1.16,0);box(1.3,.055,1.42,paint,group,.05,1.52,0);
        for(const side of [-1,1]){box(1.45,.02,.018,trim,group,.08,.92,side*.79);box(.16,.1,.22,paint,group,-.7,1.18,side*.85);box(.19,.022,.018,rim,group,.4,.87,side*.8)}
        for(const x of [-1.27,1.22])for(const z of [-.82,.82]){const wheel=mesh(tireGeometry,tire,group,x,.38,z);wheel.rotation.x=Math.PI/2;const hub=mesh(rimGeometry,rim,group,x,.38,z+(z>0?.012:-.012));hub.rotation.x=Math.PI/2;}
        for(const z of [-.52,.52]){box(.09,.18,.28,lampWhite,group,direction>0?2.09:-2.09,.68,z);box(.08,.15,.28,lampRed,group,direction>0?-2.09:2.09,.66,z)}
        return group}
      const colors=[0x51575c,0x6d3648,0x443d48,0x756b69,0x27292e,0x753e4a,0x4d4844,0x393338];const traffic=[];
      // One car per lane, all travelling along +X towards the camera; never put a car on a lane marking.
      const carStarts=[-56,-41,-26,-11,-53,-38,-23,-8];
      for(let lane=0;lane<8;lane++){const z=9.2-(lane+.5)*2.84,obj=car(colors[lane],1),materials=[],clones=new Map();obj.traverse(part=>{if(!part.isMesh)return;let cloned=clones.get(part.material);if(!cloned){cloned=part.material.clone();cloned.transparent=true;materials.push({mat:cloned,color:cloned.color.clone(),emissive:cloned.emissive&&cloned.emissive.clone()});clones.set(part.material,cloned)}part.material=cloned});obj.position.set(carStarts[lane],0,z);traffic.push({obj,z,speed:7,materials})}
      function fadeCar(car,opacity){const alpha=Math.max(0,Math.min(1,opacity));car.obj.visible=alpha>.01;for(const surface of car.materials){surface.mat.opacity=alpha;surface.mat.color.copy(surface.color).multiplyScalar(.24+.76*alpha);if(surface.emissive)surface.mat.emissive.copy(surface.emissive).multiplyScalar(alpha)}}
      for(const vehicle of traffic)fadeCar(vehicle,Math.min((vehicle.obj.position.x+49)/13,(25-vehicle.obj.position.x)/13));
      // A realistic bird silhouette built from layered plumage, articulated legs and a subtle head turn.
      const bird=new T.Group();scene.add(bird);const feather=material(0xe2d8c5,0,.92),shade=material(0xc5bba9,0,.94),tip=material(0xb5a993,0,.96),dark=material(0x282a27,0,.55),beak=material(0x9a8064,0,.8),legMat=material(0x9a8268,0,.88),comb=material(0x96433c,0,.86);
      for(const plumage of [feather,shade,tip])texturedSurface(plumage,'float down=surfaceSoft(surfaceUv*11.0);float filaments=surfaceNoise(floor(surfaceUv*48.0));diffuseColor.rgb*=.87+down*.16+filaments*.05;');
      const featherGeometry=new T.SphereGeometry(1,24,18);
      function oval(parent,sx,sy,sz,x,y,z,mat){const m=mesh(featherGeometry,mat,parent,x,y,z);m.scale.set(sx,sy,sz);return m}
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
      const cameraDistance=Math.hypot(24,8),roadWidth=18;
      const cameraCenter=(z)=>Math.max(-9.4,z-4);
      let cameraZ=cameraCenter(shownZ);
      function resize(){const r=container.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,w<=520?2.5:2));renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=2*Math.atan(roadWidth/(2*cameraDistance*camera.aspect))*180/Math.PI;camera.updateProjectionMatrix()}
      const observer=new ResizeObserver(resize);observer.observe(container);resize();
      function finishCross(){if(resolveCross){const done=resolveCross;resolveCross=null;done()}}
      function frameLoop(){if(!running)return;frame=requestAnimationFrame(frameLoop);const dt=Math.min(.05,clock.getDelta()),now=performance.now();for(const car of traffic){if(hitTime&&car===hitCar)continue;car.obj.position.x+=car.speed*dt;if(car.obj.position.x>30)car.obj.position.x=-56;fadeCar(car,Math.min((car.obj.position.x+49)/13,(25-car.obj.position.x)/13))}
        shownZ+=(targetZ-shownZ)*Math.min(1,dt*7);bird.position.z=shownZ;let hop=0;if(jumpStart){const t=Math.min(1,(now-jumpStart)/630);hop=Math.sin(t*Math.PI)*.46;body.rotation.x=Math.sin(t*Math.PI)*-.13;legs[0].rotation.x=Math.sin(t*Math.PI*2)*.5;legs[1].rotation.x=-legs[0].rotation.x;if(t===1){jumpStart=0;body.rotation.x=0;legs.forEach(l=>l.rotation.x=0);if(!hitTime)finishCross()}}
        bird.position.y=.03+hop;head.rotation.y=Math.sin(now*.0008)*.08;
        if(hitTime&&hitCar){const p=Math.min(1,(now-hitTime)/820);hitCar.obj.position.x=-8+9*p;body.rotation.z=p> .55?(p-.55)*1.6:0;if(p===1){hitTime=0;hitCar.obj.position.x=-56;fadeCar(hitCar,0);finishCross()}}
        else body.rotation.z*=.85;
        cameraZ+=(cameraCenter(shownZ)-cameraZ)*(1-Math.exp(-dt*3));camera.position.z=cameraZ;camera.lookAt(0,0,cameraZ);renderer.render(scene,camera)}
      function setActive(value){if(value===running)return;running=value;if(running){clock.getDelta();resize();frame=requestAnimationFrame(frameLoop)}else{cancelAnimationFrame(frame);shownZ=targetZ;bird.position.z=targetZ;jumpStart=0;hitTime=0;body.rotation.z=0;if(hitCar){hitCar.obj.position.x=-56;fadeCar(hitCar,0)}finishCross()}}
      function setStep(step,animate){progressStep=Math.max(0,Math.min(8,Number(step)||0));targetZ=9.8-progressStep*2.84;if(!animate){shownZ=targetZ;bird.position.z=targetZ;body.rotation.z=0;cameraZ=cameraCenter(targetZ);camera.position.z=cameraZ;camera.lookAt(0,0,cameraZ)}}
      function cross(before,after,hit){setStep(after,true);if(!running){shownZ=targetZ;return Promise.resolve()}jumpStart=performance.now();if(hit){hitCar=traffic[(after-1)%traffic.length];hitTime=jumpStart;hitCar.obj.position.x=-8;fadeCar(hitCar,1)}return new Promise(resolve=>{resolveCross=resolve})}
      camera.position.set(24,8,cameraZ);camera.lookAt(0,0,cameraZ);
      return {setActive,setStep,cross};
    }
  })();
  </script>
</section>`;
