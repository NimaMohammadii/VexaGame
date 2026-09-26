// Chicken Cross owns its scene, controls and client state. Mounted only through the Play Hub lazy section.
export const CHICKEN_CROSS_SECTION = String.raw`
<section id="hilo" class="view cc-view" aria-label="Chicken Cross">
  <style>
    body:has(#hilo.active) .tabs{display:none!important}
    body:has(#hilo.active) .app,body:has(#hilo.active) .content,body:has(#hilo.active) header.top{background:#080b0d!important}
    body:has(#hilo.active) .app{display:flex;flex-direction:column;padding-right:0;padding-bottom:env(safe-area-inset-bottom);padding-left:0}
    body:has(#hilo.active) header.top{flex-shrink:0;margin-right:16px;margin-left:16px}
    body:has(#hilo.active) [data-lazy-section-host="hilo"]{width:100%;flex:1;min-height:0;overflow:hidden}
    .cc-view{--line:rgba(203,159,161,.17);width:100%;height:100%;min-height:0;overflow:hidden!important;color:#f1f2ed;background:#080b0d!important;padding:0;box-sizing:border-box}
    .cc-page{width:100%;max-width:none;height:100%;min-height:0;margin:0;display:grid;grid-template-rows:minmax(190px,1fr) auto}
    .cc-stage{min-height:190px;position:relative;overflow:hidden;background:linear-gradient(#182029,#080b0d 65%);isolation:isolate}
    .cc-stage canvas{width:100%;height:100%;display:block;touch-action:none}
    .cc-stage:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(4,7,10,.33),transparent 19%,transparent 72%,#080b0d 100%);z-index:2}
    .cc-topline{position:absolute;z-index:4;top:20px;left:20px;right:20px;display:flex;align-items:flex-start;justify-content:space-between;pointer-events:none;text-shadow:0 2px 12px #000}
    .cc-multiplier{font:750 42px/1 system-ui,sans-serif;letter-spacing:-.055em;font-variant-numeric:tabular-nums}.cc-multiplier small{display:block;margin-top:7px;font:700 10px system-ui,sans-serif;letter-spacing:.13em;color:#b5c0bb;text-transform:uppercase}
    .cc-counter{padding:8px 12px;border:1px solid rgba(178,108,114,.35);border-radius:100px;background:rgba(28,14,20,.9);font:700 11px system-ui,sans-serif;letter-spacing:.12em}
    .cc-status{position:absolute;z-index:4;left:18px;right:18px;bottom:24px;min-height:19px;text-align:center;font:650 13px system-ui,sans-serif;color:#e6e9e6;text-shadow:0 2px 9px #000}.cc-status.win{color:#a9efc7}.cc-status.lose{color:#ffadb1}
    .cc-loading{position:absolute;inset:0;z-index:5;display:grid;place-content:center;text-align:center;gap:9px;background:#10171a;color:#c9d2d1;font:650 12px system-ui,sans-serif;letter-spacing:.1em;transition:opacity .4s,visibility .4s}.cc-loading.ready{opacity:0;visibility:hidden;pointer-events:none}.cc-loading b{font-size:18px;letter-spacing:0;color:white}
    .cc-panel{position:relative;z-index:3;padding:4px 18px 10px;background:#080b0d}
    .cc-panel-inner{border:1px solid var(--line);border-radius:21px;background:linear-gradient(160deg,#21171b,#141215 65%,#101012);box-shadow:inset 0 1px rgba(255,255,255,.06),0 14px 26px rgba(0,0,0,.22);padding:17px}
    .cc-controls-label{display:flex;justify-content:space-between;color:#a6b0ae;text-transform:uppercase;letter-spacing:.11em;font:700 10px system-ui,sans-serif;margin-bottom:10px}
    .cc-difficulties{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}.cc-difficulties button{height:42px;border-radius:11px;border:1px solid var(--line);background:#251e22;color:#cbbfc0;font:700 12px system-ui,sans-serif;transition:background .2s,transform .2s}.cc-difficulties button.active{background:#70434d;color:#fff;border-color:#aa737b}.cc-difficulties button:active,.cc-actions button:active{transform:scale(.98)}
    .cc-wager{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:8px;margin-bottom:14px}.cc-wager button,.cc-wager input{height:46px;border:1px solid var(--line);border-radius:12px;background:#251e22;color:#f2f5f1;font:750 17px system-ui,sans-serif;text-align:center;box-sizing:border-box;min-width:0}.cc-wager input{outline:none;font-variant-numeric:tabular-nums}.cc-wager input:focus{border-color:#b48289}.cc-wager button{font-size:22px}.cc-unit{position:relative}.cc-unit input{width:100%;padding:0 64px 0 15px}.cc-unit span{position:absolute;right:12px;top:16px;color:#b8a6a7;font:700 11px system-ui,sans-serif;pointer-events:none}
    .cc-decision{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 12px;color:#b9abae;font:650 11px system-ui,sans-serif}.cc-decision strong{color:#f2f5f1;font:750 14px system-ui,sans-serif;font-variant-numeric:tabular-nums;text-align:right}
    .cc-panel button,.cc-panel input{touch-action:manipulation}.cc-panel button{user-select:none;-webkit-user-select:none}
    .cc-actions{display:grid;grid-template-columns:1.25fr .75fr;gap:9px}.cc-actions button{height:52px;border:0;border-radius:13px;font:750 15px system-ui,sans-serif;transition:transform .12s,opacity .12s}.cc-go{background:linear-gradient(160deg,#8b4c59,#542934);color:#fff;border:1px solid #a26671!important;box-shadow:inset 0 1px rgba(255,255,255,.15)}.cc-cash{display:block;background:#263c35;color:#d4f7e5;border:1px solid #466858!important}.cc-actions button:disabled{opacity:.5}
    @media(max-height:700px){.cc-panel-inner{padding:13px}.cc-difficulties{margin-bottom:10px}}
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
      <div class="cc-decision" data-cc-decision><span>Cash out now</span><strong data-cc-quote>Cross one lane first</strong></div>
      <div class="cc-actions" data-cc-actions><button type="button" class="cc-go" data-cc-go>Start crossing</button><button type="button" class="cc-cash" data-cc-cash>Cash out</button></div>
    </div></div>
  </div>
  <script type="module">
  (async function(){
    const root=document.getElementById('hilo');if(!root||root.dataset.ready)return;root.dataset.ready='1';
    const q=(s)=>root.querySelector(s),stage=q('[data-cc-stage]'),loading=q('[data-cc-loading]'),go=q('[data-cc-go]'),cash=q('[data-cc-cash]'),input=q('[data-cc-bet]'),status=q('[data-cc-status]'),quote=q('[data-cc-quote]');
    let mode='easy',round=null,busy=false,pendingAction='',engine=null,active=false,requestVersion=0;
    function tgData(){return String(window.Telegram&&window.Telegram.WebApp&&window.Telegram.WebApp.initData||'')}
    function money(n){return (Math.round(n*10000)/10000).toFixed(4).replace(/0+$/,'').replace(/\.$/,'')}
    function haptic(kind){try{const h=window.Telegram.WebApp.HapticFeedback;if(kind==='success'||kind==='error')h.notificationOccurred(kind);else h.impactOccurred('light')}catch(e){}}
    function message(text,kind){status.textContent=text;status.className='cc-status'+(kind?' '+kind:'')}
    function betNano(){return Math.floor(Number(String(input.value).replace(',','.'))*1e9)}
    function syncBalance(n){if(window.VexaTonBalance&&Number.isFinite(Number(n)))window.VexaTonBalance.write(Math.max(0,Math.floor(Number(n))),0)}
    async function api(path,body){const initData=tgData();if(!initData)throw Error('Open the Mini App in Telegram');const options=body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(Object.assign({initData},body))}:{headers:{'x-telegram-init-data':initData},cache:'no-store'};const response=await fetch('/app/api/chicken-cross/'+path,options);const data=await response.json().catch(()=>null);if(!response.ok)throw Error(data&&data.error||'Could not reach the game server');return data}
    function render(){const playing=round&&round.status==='active';go.textContent=pendingAction==='start'?'Starting…':pendingAction==='cross'?'Crossing…':playing?'Cross next lane':'Start crossing';cash.textContent=pendingAction==='cashout'?'Cashing out…':'Cash out';go.disabled=busy||!engine;cash.disabled=busy||!engine||!playing||round.step<1;quote.textContent=playing&&round.step>0&&Number.isSafeInteger(round.cashoutQuoteNano)?'≈ '+money(round.cashoutQuoteNano/1e9)+' GRAM':'Cross one lane first';input.disabled=busy||!!playing;q('[data-cc-half]').disabled=busy||!!playing;q('[data-cc-double]').disabled=busy||!!playing;
      root.querySelectorAll('[data-cc-risk]').forEach(button=>{button.classList.toggle('active',button.dataset.ccRisk===mode);button.disabled=busy||!!playing});q('[data-cc-multiplier]').firstChild.nodeValue=round&&round.status==='lost'?'0.00×':(round?Number(round.multiplier):1).toFixed(2)+'×';q('[data-cc-next]').textContent=playing?'NEXT '+Number(round.nextMultiplier).toFixed(2)+'×':round&&round.status==='lost'?'ROUND ENDED':round&&round.status==='cashed'?'CASHED OUT':'NEXT CROSSING';q('[data-cc-counter]').textContent=(round?round.step:0)+' / 8';}
    function apply(data){if(data&&data.round){round=data.round;mode=round.difficulty;input.value=money(round.amountNano/1e9)}if(data&&data.tonBalanceNano!==undefined)syncBalance(data.tonBalanceNano);render()}
    function setBusy(value,action=''){busy=value;pendingAction=value?action:'';render()}
    async function start(){if(busy)return;const amount=betNano();if(!Number.isSafeInteger(amount)||amount<1000000||amount>20000000000){message('Bet must be between 0.001 and 20 GRAM','lose');return}setBusy(true,'start');message('Starting round…');haptic('light');try{const data=await api('start',{amountNano:amount,difficulty:mode});apply(data);engine&&engine.setStep(round.step,false);message('Each crossing risks the round · choose your next step')}catch(e){message(e.message,'lose')}finally{setBusy(false)}}
    async function cross(){if(busy||!round||round.status!=='active')return;setBusy(true,'cross');const previous=round.step,movement=engine?engine.move(previous+1):Promise.resolve();message('Crossing…');haptic('light');try{const data=await api('step',{roundId:round.id});await movement;if(data.event==='sync'){apply(data);engine&&engine.setStep(round.step,false)}else if(data.event==='hit'){if(engine)await engine.hit(data.round.step);apply(data);engine&&engine.setStep(0,false)}else{apply(data);engine&&engine.confirmStep(data.round.step)}if(data.event==='hit'){message('Hit by traffic · round ended','lose');haptic('error')}else if(data.event==='finish'){message('All lanes crossed · payout credited','win');haptic('success')}else if(data.event==='safe')message('Safe · cash out or cross again');else message('Round updated');}catch(e){message(e.message,'lose');await restore()}finally{setBusy(false)}}
    async function cashOut(){if(busy||!round)return;setBusy(true,'cashout');message('Cashing out…');haptic('light');try{const data=await api('cashout',{roundId:round.id});apply(data);if(round.status==='cashed'){engine&&engine.setStep(0,false);message('Cashed out '+money(round.payoutNano/1e9)+' GRAM','win');haptic('success')}else message('Round updated · choose your next move')}catch(e){message(e.message,'lose');await restore()}finally{setBusy(false)}}
    async function restore(){if(!tgData())return;const version=++requestVersion;try{const data=await api('state');if(version!==requestVersion)return;round=data.round||null;if(round)apply(data);else render();engine&&engine.setStep(round&&round.status==='active'?round.step:0,false);if(round&&round.status==='active')message('Round restored · cross or cash out')}catch(e){message(e.message,'lose')}}
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
      const renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});renderer.setClearColor(0x1b1118);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
      const scene=new T.Scene();scene.background=new T.Color(0x1b1118);scene.fog=new T.FogExp2(0x21141b,.014);
      const camera=new T.PerspectiveCamera(41,1,.2,170),laneEdgeZ=9.2,laneWidth=2.84,startZ=9.8,laneCenter=(step)=>laneEdgeZ-(step-.5)*laneWidth;const clock=new T.Clock();let running=false,frame=0,targetZ=startZ,shownZ=startZ,jumpStart=0,hitTime=0,hitCar=null,resolveCross=null,progressStep=0,blockedLanes=0;
      const material=(color,metalness=0,roughness=.72)=>new T.MeshStandardMaterial({color,metalness,roughness}),unitBoxGeometry=new T.BoxGeometry(1,1,1);
      let detailSeed=87231;function detailRandom(){detailSeed=(Math.imul(detailSeed,1664525)+1013904223)>>>0;return detailSeed/4294967296}
      // A shared small height map adds actual light response to stone and concrete pores.
      const reliefData=new Uint8Array(128*128*4);for(let i=0;i<reliefData.length;i+=4){const value=100+Math.floor(detailRandom()*95);reliefData[i]=reliefData[i+1]=reliefData[i+2]=value;reliefData[i+3]=255}
      const relief=new T.DataTexture(reliefData,128,128,T.RGBAFormat);relief.wrapS=relief.wrapT=T.RepeatWrapping;relief.magFilter=T.LinearFilter;relief.minFilter=T.LinearMipmapLinearFilter;relief.generateMipmaps=true;relief.needsUpdate=true;
      function mineral(mat,depth){mat.bumpMap=relief;mat.bumpScale=depth;return mat}
      const backdropTexture=new T.Texture(backdrop);backdropTexture.colorSpace=T.SRGBColorSpace;backdropTexture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());backdropTexture.needsUpdate=true;const backdropPlane=new T.Mesh(new T.PlaneGeometry(72,24),new T.MeshBasicMaterial({map:backdropTexture,fog:false,toneMapped:false}));backdropPlane.position.set(-67,11,-2.2);backdropPlane.rotation.y=Math.PI/2;backdropPlane.renderOrder=-1;scene.add(backdropPlane);
      // Object-space procedural surfaces stay sharp at every camera distance and need no downloaded images.
      function texturedSurface(mat,fragment){mat.customProgramCacheKey=()=>fragment;mat.onBeforeCompile=shader=>{shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 surfaceUv;').replace('#include <begin_vertex>','#include <begin_vertex>\nsurfaceUv=position.xz;');shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 surfaceUv;\nfloat surfaceNoise(vec2 p){vec3 v=fract(vec3(p.xyx)*.1031);v+=dot(v,v.yzx+33.33);return fract((v.x+v.y)*v.z);}\nfloat surfaceSoft(vec2 p){vec2 c=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(surfaceNoise(c),surfaceNoise(c+vec2(1.0,0.0)),f.x),mix(surfaceNoise(c+vec2(0.0,1.0)),surfaceNoise(c+vec2(1.0,1.0)),f.x),f.y);}').replace('#include <color_fragment>','#include <color_fragment>\n'+fragment)}}
      const asphalt=material(0x383039,.07,.78);texturedSurface(asphalt,'float aggregate=surfaceNoise(floor(surfaceUv*12.0));float fine=surfaceNoise(floor(surfaceUv*38.0));float wear=surfaceSoft(surfaceUv*.55);float lane=fract((surfaceUv.y+10.0)/2.84);float track=min(abs(lane-.28),abs(lane-.72));float tireWear=1.0-smoothstep(.035,.13,track);diffuseColor.rgb*=.74+aggregate*.19+fine*.09+wear*.16-tireWear*.10;');
      const paving=material(0x30272d,0,.98),stone=material(0x826e75,0,.88);texturedSurface(stone,'float grain=surfaceNoise(floor(surfaceUv*26.0));float mottling=surfaceSoft(surfaceUv*3.0);diffuseColor.rgb*=.77+grain*.10+mottling*.18;');
      const line=material(0xbab2ae,0,.86),yellow=material(0xba9c7a,0,.85),curbMat=material(0x765860,0,.85),grass=material(0x24302a,0,.98);
      mineral(stone,.035);mineral(curbMat,.025);mineral(paving,.02);
      texturedSurface(grass,'float clumps=surfaceSoft(surfaceUv*3.5);float blades=surfaceNoise(floor(surfaceUv*30.0));diffuseColor.rgb*=.66+clumps*.24+blades*.18;');
      function mesh(geometry,mat,parent,x=0,y=0,z=0){const obj=new T.Mesh(geometry,mat);obj.position.set(x,y,z);obj.receiveShadow=true;parent.add(obj);return obj}
      function box(w,h,d,mat,parent,x,y,z){const obj=mesh(unitBoxGeometry,mat,parent,x,y,z);obj.scale.set(w,h,d);return obj}
      scene.add(new T.HemisphereLight(0xc7b5bc,0x241017,2.15));const sun=new T.DirectionalLight(0xffdfc9,2.65);sun.position.set(-18,28,15);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-32;sun.shadow.camera.right=32;sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;sun.shadow.normalBias=.025;scene.add(sun);
      const road=box(145,.16,22.8,asphalt,scene,0,-.14,-2.2);road.castShadow=false;
      const gutter=material(0x33252c,.06,.46);for(const z of [9,-13.4])box(145,.012,.25,gutter,scene,0,-.047,z);
      for(let i=1;i<8;i++){const z=laneEdgeZ-i*laneWidth;const mat=i===4?yellow:line;for(let x=-72;x<74;x+=5.5)box(i===4?3.8:2.75,.012,i===4?.075:.055,mat,scene,x,.002,z)}
      const stoneShape=new T.Shape();stoneShape.moveTo(-.75,-.76);stoneShape.lineTo(.75,-.76);stoneShape.lineTo(.75,.76);stoneShape.lineTo(-.75,.76);stoneShape.closePath();const stoneGeometry=new T.ExtrudeGeometry(stoneShape,{depth:.045,bevelEnabled:true,bevelThickness:.012,bevelSize:.014,bevelSegments:1,steps:1});stoneGeometry.rotateX(-Math.PI/2);
      const stones=new T.InstancedMesh(stoneGeometry,stone,360),tile=new T.Object3D(),tileColor=new T.Color();let tileIndex=0;stones.receiveShadow=true;
      for(const z of [9.3,-13.8]){const center=z+(z>0?1.85:-1.85);box(145,.26,.34,curbMat,scene,0,.05,z);box(145,.12,3.4,paving,scene,0,.025,center);box(145,.04,5,grass,scene,0,-.02,z+(z>0?5.8:-5.8));for(let row=0;row<2;row++)for(let col=0;col<90;col++){const variation=((col*17+row*7+(z>0?3:0))%13)/12;tile.position.set(-71.2+col*1.6+(row?.8:0),.09,center+(row?.82:-.82));tile.updateMatrix();stones.setMatrixAt(tileIndex,tile.matrix);const tint=.77+variation*.21;tileColor.setRGB(tint,tint*.96,tint*.97);stones.setColorAt(tileIndex,tileColor);tileIndex++}}scene.add(stones);
      // The left sidewalk faces the camera (+Z); keep its buildings sparse and away from the crossing.
      // Bent, tapered blades have root-to-tip colour and a non-uniform distribution.
      const bladeGeometry=new T.BufferGeometry();bladeGeometry.setAttribute('position',new T.Float32BufferAttribute([-.035,0,0,.035,0,0,-.021,.19,.025,.021,.19,.025,.035,.38,.075],3));bladeGeometry.setAttribute('color',new T.Float32BufferAttribute([.27,.32,.22,.27,.32,.22,.64,.72,.47,.64,.72,.47,.83,.87,.61],3));bladeGeometry.setIndex([0,1,2,1,3,2,2,3,4]);bladeGeometry.computeVertexNormals();
      const grassBladeCount=8000,bladeMaterial=new T.MeshStandardMaterial({color:0x667953,roughness:.96,side:T.DoubleSide,vertexColors:true}),lawn=new T.InstancedMesh(bladeGeometry,bladeMaterial,grassBladeCount),detailTransform=new T.Object3D(),detailTint=new T.Color();lawn.receiveShadow=true;
      for(let i=0;i<grassBladeCount;i++){const x=-45+detailRandom()*62,side=i%2?1:-1,z=side>0?12.95+detailRandom()*1.75:-17.5-detailRandom()*1.75;const patch=.55+.45*Math.sin(x*.73+z*2.1);detailTransform.position.set(x,.015,z);detailTransform.rotation.set(0,detailRandom()*Math.PI*2,0);detailTransform.scale.setScalar(.55+detailRandom()*.62+patch*.38);detailTransform.updateMatrix();lawn.setMatrixAt(i,detailTransform.matrix);detailTint.setRGB(.72+detailRandom()*.22,.76+detailRandom()*.20,.65+detailRandom()*.23);lawn.setColorAt(i,detailTint)}lawn.computeBoundingSphere();scene.add(lawn);
      const concrete=material(0x50444b,0,.92),masonry=material(0x39363b,0,.87),frameMat=material(0x25292d,.55,.42),windowMat=material(0x354148,.28,.19),litWindow=new T.MeshStandardMaterial({color:0x665749,emissive:0x8e6350,emissiveIntensity:.32,metalness:.15,roughness:.32});
      mineral(concrete,.025);mineral(masonry,.045);
      for(const [x,w,h,face] of [[-34,10,8.5,18.2],[-19,9,11,18.2],[-3,11,9,14.8]]){box(w,h,6,masonry,scene,x,h/2,face+3);box(w+.28,.25,6.3,concrete,scene,x,h+.12,face+3);box(w+.35,.46,6.4,concrete,scene,x,.23,face+3);
        for(let floor=0;floor<3;floor++)for(let column=-1;column<=1;column++){const wx=x+column*(w/3.45),wy=1.9+floor*2.25;if(wy+1.2>h)continue;box(1.35,1.25,.05,frameMat,scene,wx,wy,face-.06);box(1.12,1.02,.065,(floor+column+Math.round(x))%5===0?litWindow:windowMat,scene,wx,wy,face-.095);box(.055,1.25,.09,frameMat,scene,wx,wy,face-.15);box(1.55,.065,.18,concrete,scene,wx,wy-.67,face-.2)}
        for(const edge of [-1,1])box(.16,h,.22,concrete,scene,x+edge*(w/2-.3),h/2,face-.12);
        box(1.55,2.15,.12,frameMat,scene,x,1.13,face-.09);box(1.26,1.86,.035,windowMat,scene,x,1.13,face-.17);box(.04,.45,.09,concrete,scene,x+.43,1.12,face-.21);box(2.15,.14,.85,concrete,scene,x,2.4,face-.35).castShadow=true;
        for(let floor=1;floor<=3;floor++){const y=floor*2.25+.25;if(y<h)box(w-.6,.035,.04,frameMat,scene,x,y,face-.025)}
      }
      const bark=material(0x51433e,0,.97),leafMaterial=material(0x2e4339,0,1);texturedSurface(leafMaterial,'float clusters=surfaceSoft(surfaceUv*8.0);float twigs=surfaceNoise(floor(surfaceUv*28.0));diffuseColor.rgb*=.77+clusters*.23+twigs*.09;');
      mineral(bark,.04);const leavesPerTree=500,leafGeometry=new T.SphereGeometry(1,6,4),treeLeaves=new T.InstancedMesh(leafGeometry,leafMaterial,leavesPerTree*2);treeLeaves.receiveShadow=true;let leafIndex=0;
      for(const [x,z,height] of [[-26,17.8,4.2],[-10,18.1,4.8]]){const trunk=mesh(new T.CylinderGeometry(.075,.19,height,12),bark,scene,x,height/2,z);trunk.castShadow=true;
        for(let limb=0;limb<5;limb++){const angle=limb*2.4;const branch=mesh(new T.CylinderGeometry(.018,.07,1.5,7),bark,scene,x+Math.cos(angle)*.35,height-.6,z+Math.sin(angle)*.35);branch.rotation.set(Math.sin(angle)*.65,0,-Math.cos(angle)*.65);branch.castShadow=true}
        for(let leaf=0;leaf<leavesPerTree;leaf++){const angle=detailRandom()*Math.PI*2,vertical=detailRandom()*2-1,radius=Math.cbrt(detailRandom()),spread=Math.sqrt(1-vertical*vertical)*radius;detailTransform.position.set(x+Math.cos(angle)*spread*1.65,height+.15+vertical*radius*1.9,z+Math.sin(angle)*spread*1.4);detailTransform.rotation.set(detailRandom()*Math.PI,angle,detailRandom()*.9);detailTransform.scale.set(.15+detailRandom()*.11,.03,.07+detailRandom()*.05);detailTransform.updateMatrix();treeLeaves.setMatrixAt(leafIndex,detailTransform.matrix);detailTint.setRGB(.65+detailRandom()*.4,.75+detailRandom()*.3,.60+detailRandom()*.3);treeLeaves.setColorAt(leafIndex++,detailTint)}
      }treeLeaves.computeBoundingSphere();scene.add(treeLeaves);
      function lamp(x,z,tint){const pole=material(0x4a4245,.7,.38),armPath=new T.CatmullRomCurve3([new T.Vector3(x,5.2,z),new T.Vector3(x-.08,5.8,z),new T.Vector3(x-.55,6.02,z),new T.Vector3(x-1.9,6.02,z)]);mesh(new T.CylinderGeometry(.065,.115,5.6,12),pole,scene,x,2.85,z).castShadow=true;mesh(new T.CylinderGeometry(.22,.26,.22,16),concrete,scene,x,.15,z);mesh(new T.TubeGeometry(armPath,14,.065,8,false),pole,scene).castShadow=true;box(.68,.14,.3,pole,scene,x-1.9,6,z);box(.53,.025,.21,new T.MeshBasicMaterial({color:tint}),scene,x-1.9,5.917,z);const glow=new T.SpotLight(tint,65,17,Math.PI/3,.8,2);glow.position.set(x-1.9,5.88,z);glow.target.position.set(x-1.9,0,z+(z>0?-2:2));scene.add(glow,glow.target)}lamp(-8,-18,0xffd5ae);lamp(-17,13,0xffd5ae);
      // Deep concrete tunnel occupies the far end of all eight lanes. Cars spawn beyond its mouth.
      const tunnelStone=material(0x403a40,0,.96),tunnelEdge=material(0x675b60,.08,.8),tunnelDark=new T.MeshBasicMaterial({color:0x090c10}),tunnelLight=new T.MeshBasicMaterial({color:0x9d8170});
      mineral(tunnelStone,.035);mineral(tunnelEdge,.025);
      box(.12,7.5,24,tunnelDark,scene,-58,3.75,-2.2);box(12,.32,28,tunnelStone,scene,-54,7.45,-2.2);
      for(const z of [-15.1,10.7])box(12,7.5,1.5,tunnelStone,scene,-54,3.75,z);
      for(const x of [-59,-53,-48]){for(const z of [-14,9.6])box(.52,7.55,1,tunnelEdge,scene,x,3.78,z);box(.52,.9,24.6,tunnelEdge,scene,x,7.25,-2.2);box(.55,.09,24.5,concrete,scene,x,6.76,-2.2)}
      for(const z of [-10,-2.2,5.6])box(8,.04,.11,tunnelLight,scene,-53,7.18,z);
      // Frame the mouth with a continuous urban block; the back wall of the tunnel remains dark.
      const farBrick=material(0x333036,0,.93),farStone=material(0x51474c,0,.88),farGlass=material(0x252f35,.28,.28),farLight=new T.MeshStandardMaterial({color:0x776351,emissive:0x8a6049,emissiveIntensity:.24,roughness:.55});
      mineral(farBrick,.036);mineral(farStone,.024);
      const facadeMatrices=[[],[],[],[]];function facadeDetail(type,x,y,z,w,h,d){const matrix=new T.Matrix4().makeScale(w,h,d);matrix.setPosition(x,y,z);facadeMatrices[type].push(matrix)}
      for(const [z,w,h,depth] of [[-27,15,16,8],[-39,10,11,7],[18,14,18,9],[31,12,12,7]]){
        const front=-54;box(depth,h,w,farBrick,scene,front-depth/2,h/2,z).castShadow=true;
        box(depth+.15,.3,w+.5,farStone,scene,front-depth/2,h+.15,z);
        box(.16,.65,w+.4,farStone,scene,front+.11,.45,z);
        for(let level=0;level<Math.floor((h-1)/2.45);level++)for(let column=0;column<Math.floor((w-1)/2.15);column++){
          const wz=z-w/2+1.35+column*2.15,wy=1.75+level*2.45;
          facadeDetail(0,front+.12,wy,wz,.045,1.16,1.35);
          facadeDetail((level*7+column*3+Math.round(z))%9===0?2:1,front+.155,wy,wz,.058,.99,1.17);
          facadeDetail(3,front+.22,wy-.62,wz,.16,.1,1.54);
        }
      }
      for(let type=0;type<4;type++){const matrices=facadeMatrices[type],part=new T.InstancedMesh(new T.BoxGeometry(1,1,1),[frameMat,farGlass,farLight,farStone][type],matrices.length);matrices.forEach((matrix,index)=>part.setMatrixAt(index,matrix));part.computeBoundingSphere();scene.add(part)}
      // Parapet and a restrained retaining wall visually connect the two blocks above the portal.
      box(4.5,1.5,28.6,farStone,scene,-54,8.7,-2.2).castShadow=true;
      box(.35,.18,29,concrete,scene,-51.65,9.55,-2.2);
      for(const z of [-13.7,9.3]){box(5.2,2,.32,farStone,scene,-51.4,1,z).castShadow=true;box(5.6,.1,.48,concrete,scene,-51.4,2.1,z)}
      // Geometry of the cars is authored here: beveled body, glass cabin, lights and wheels.
      const tire=material(0x111315,.04,.98),rim=material(0x919a9b,.8,.28),glass=material(0x354550,.24,.12),trim=material(0x18191c,.35,.5),lampWhite=new T.MeshBasicMaterial({color:0xffedcc}),lampRed=new T.MeshBasicMaterial({color:0xa51c19});
      const tireGeometry=new T.CylinderGeometry(.37,.37,.17,16),rimGeometry=new T.CylinderGeometry(.20,.20,.185,16),vehicleShadowGeometry=new T.CircleGeometry(1,20),vehicleShadowMaterial=new T.MeshBasicMaterial({color:0x070608,transparent:true,opacity:.28,depthWrite:false});
      const carShape=new T.Shape();carShape.moveTo(-2.05,.38);carShape.lineTo(-1.92,.80);carShape.lineTo(-1.12,.91);carShape.lineTo(-.65,1.48);carShape.lineTo(.78,1.48);carShape.lineTo(1.16,.91);carShape.lineTo(1.95,.79);carShape.lineTo(2.07,.42);carShape.lineTo(2.07,.32);carShape.lineTo(-2.05,.32);const carShellGeometry=new T.ExtrudeGeometry(carShape,{depth:1.54,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.13,bevelThickness:.10,curveSegments:3});
      const windshieldShape=new T.Shape();windshieldShape.moveTo(-.57,.02);windshieldShape.lineTo(.57,.02);windshieldShape.lineTo(.48,.39);windshieldShape.lineTo(-.48,.39);windshieldShape.closePath();const windshieldGeometry=new T.ShapeGeometry(windshieldShape);windshieldGeometry.rotateY(Math.PI/2);
      function car(color,direction){const group=new T.Group(),paint=material(color,.42,.29);scene.add(group);mesh(carShellGeometry,paint,group,0,0,-.77);
        const vehicleShadow=mesh(vehicleShadowGeometry,vehicleShadowMaterial,group,0,.015,0);vehicleShadow.rotation.x=-Math.PI/2;vehicleShadow.scale.set(1.9,.72,1);vehicleShadow.receiveShadow=false;
        box(1.3,.41,1.33,glass,group,.05,1.16,0);box(1.3,.055,1.42,paint,group,.05,1.52,0);
        mesh(windshieldGeometry,glass,group,1.175,1.03,0);
        for(const side of [-1,1]){box(1.45,.02,.018,trim,group,.08,.92,side*.79);box(.16,.1,.22,paint,group,-.7,1.18,side*.85);box(.19,.022,.018,rim,group,.4,.87,side*.8);
          box(.53,.24,.024,glass,group,-.39,1.25,side*.9);box(.5,.24,.024,glass,group,.36,1.25,side*.9);
          box(.025,.26,.035,trim,group,-.02,1.25,side*.93);box(.028,.4,.028,trim,group,-.04,.66,side*.93);
          box(.17,.025,.05,rim,group,.19,.83,side*.84)}
        box(.065,.17,.92,trim,group,2.11,.59,0);box(.07,.035,.42,rim,group,2.15,.54,0);
        box(.1,.15,1.65,trim,group,1.98,.37,0);box(.085,.11,1.65,trim,group,-1.99,.37,0);
        for(const x of [-1.27,1.22])for(const z of [-.82,.82]){const wheel=mesh(tireGeometry,tire,group,x,.38,z);wheel.rotation.x=Math.PI/2;const hub=mesh(rimGeometry,rim,group,x,.38,z+(z>0?.012:-.012));hub.rotation.x=Math.PI/2;}
        for(const z of [-.52,.52]){box(.09,.18,.28,lampWhite,group,direction>0?2.09:-2.09,.68,z);box(.08,.15,.28,lampRed,group,direction>0?-2.09:2.09,.66,z)}
        return group}
      const colors=[0x51575c,0x6d3648,0x443d48,0x756b69,0x27292e,0x753e4a,0x4d4844,0x393338];const traffic=[];
      // One car per lane, all travelling along +X towards the camera; never put a car on a lane marking.
      const carStarts=[-56,-41,-26,-11,-53,-38,-23,-8];
      for(let lane=0;lane<8;lane++){const z=laneCenter(lane+1),obj=car(colors[lane],1),materials=[],clones=new Map();obj.name='traffic-car-'+(lane+1);obj.traverse(part=>{if(!part.isMesh)return;let cloned=clones.get(part.material);if(!cloned){cloned=part.material.clone();cloned.transparent=true;materials.push({mat:cloned,color:cloned.color.clone(),emissive:cloned.emissive&&cloned.emissive.clone()});clones.set(part.material,cloned)}part.material=cloned});obj.position.set(carStarts[lane],0,z);traffic.push({obj,z,speed:15,materials,fade:-1})}
      function fadeCar(car,opacity){const alpha=Math.max(0,Math.min(1,opacity)),visible=alpha>.01;if(car.fade>=0&&Math.abs(car.fade-alpha)<.02&&car.obj.visible===visible)return;car.fade=alpha;car.obj.visible=visible;for(const surface of car.materials){surface.mat.opacity=alpha;surface.mat.color.copy(surface.color).multiplyScalar(.24+.76*alpha);if(surface.emissive)surface.mat.emissive.copy(surface.emissive).multiplyScalar(alpha)}}
      for(const vehicle of traffic)fadeCar(vehicle,Math.min((vehicle.obj.position.x+49)/13,(25-vehicle.obj.position.x)/13));
      // A confirmed crossing closes the lane behind the chicken with a physical road barricade.
      const barrierRed=material(0x6f2f3d,.18,.62),barrierWhite=material(0xc9c2b8,0,.82),barrierMetal=material(0x303438,.72,.36),barrierAmber=new T.MeshStandardMaterial({color:0x7c5733,emissive:0xffa34f,emissiveIntensity:1.4,roughness:.42});
      const barrierLampGeometry=new T.SphereGeometry(.10,10,7),barriers=[];for(let lane=0;lane<8;lane++){const group=new T.Group();group.name='lane-barrier-'+(lane+1);group.position.set(-4.4,-.052,laneCenter(lane+1));group.visible=false;group.userData.amount=0;group.userData.target=0;scene.add(group);
        const plank=box(.28,.48,2.34,barrierRed,group,0,.72,0);
        for(let stripe=-2;stripe<=2;stripe++){const mark=box(.035,.31,.38,barrierWhite,group,.16,.72,stripe*.43);mark.rotation.x=-.55}
        for(const side of [-1,1]){const post=box(.18,.82,.16,barrierMetal,group,-.06,.43,side*.86);post.rotation.z=side*.10;box(.72,.1,.18,barrierMetal,group,.08,.06,side*.88);const lamp=mesh(barrierLampGeometry,barrierAmber,group,.02,1.02,side*.79);lamp.scale.set(1,.72,1)}
        barriers.push(group)}
      function confirmStep(step,immediate=false){const next=Math.max(0,Math.min(8,Number(step)||0)),previous=blockedLanes;blockedLanes=next;for(let lane=0;lane<8;lane++){const barrier=barriers[lane];barrier.userData.target=lane<next?1:0;if(immediate){barrier.userData.amount=barrier.userData.target;barrier.scale.y=Math.max(.001,barrier.userData.amount);barrier.visible=barrier.userData.amount>.01}if(lane>=next&&lane<previous){traffic[lane].obj.position.x=carStarts[lane];fadeCar(traffic[lane],0)}}}
      // A realistic bird silhouette built from layered plumage, articulated legs and a subtle head turn.
      const bird=new T.Group();bird.name='chicken';scene.add(bird);const feather=material(0xe2d8c5,0,.92),shade=material(0xc5bba9,0,.94),tip=material(0xb5a993,0,.96),dark=material(0x282a27,0,.55),beak=material(0x9a8064,0,.8),legMat=material(0x9a8268,0,.88),comb=material(0x96433c,0,.86);
      for(const plumage of [feather,shade,tip])texturedSurface(plumage,'float down=surfaceSoft(surfaceUv*11.0);float filaments=surfaceNoise(floor(surfaceUv*48.0));diffuseColor.rgb*=.87+down*.16+filaments*.05;');
      const featherGeometry=new T.SphereGeometry(1,24,16);
      function oval(parent,sx,sy,sz,x,y,z,mat){const m=mesh(featherGeometry,mat,parent,x,y,z);m.scale.set(sx,sy,sz);return m}
      const body=new T.Group();bird.add(body);oval(body,.68,.63,.9,0,.97,0,feather);oval(body,.53,.49,.67,0,.92,-.08,shade);
      const head=new T.Group();head.position.set(0,1.67,-.48);body.add(head);oval(head,.34,.35,.36,0,0,0,feather);const bill=mesh(new T.ConeGeometry(.14,.38,8),beak,head,0,-.11,-.38);bill.rotation.x=-Math.PI/2;
      for(const x of [-.24,.24]){oval(head,.044,.052,.039,x,.035,-.258,dark);oval(head,.014,.017,.012,x-.012,.051,-.289,feather)}
      oval(head,.075,.10,.06,0,-.29,-.22,comb);
      const wings=[];for(const side of [-1,1]){const wing=new T.Group();wing.position.set(side*.48,1.08,.08);body.add(wing);wings.push(wing);
        oval(wing,.25,.18,.48,side*.04,0,.02,shade);
        for(let row=0;row<3;row++)for(let i=0;i<6;i++){
          const piece=oval(wing,.09+row*.012,.038,.16+row*.045,side*(.12+row*.027),.08-row*.075,-.38+i*.16,(i+row)%3?shade:tip);
          piece.rotation.y=side*.12;piece.rotation.x=-.18;
        }
      }
      for(let i=0;i<3;i++)oval(head,.105,.15,.12,0,.30,-.18+i*.12,comb);
      for(let i=0;i<7;i++){const x=(i-3)*.12;const tail=oval(body,.08,.09,.34,x,1.13,.83,feather);tail.rotation.x=-.32;tail.rotation.z=(i-3)*.12}
      const legs=[];for(const x of [-.25,.25]){const leg=new T.Group();leg.position.set(x,.64,.16);body.add(leg);box(.09,.53,.09,legMat,leg,0,-.27,0);for(let j=-1;j<=1;j++)box(.052,.04,.34,legMat,leg,j*.09,-.53,-.15);legs.push(leg)}
      const birdGround=-.14;bird.position.set(0,birdGround,startZ);bird.rotation.y=0;const birdShadowMaterial=new T.MeshBasicMaterial({color:0x080608,transparent:true,opacity:.3,depthWrite:false}),birdShadow=mesh(new T.CircleGeometry(1,20),birdShadowMaterial,scene,0,-.045,startZ);birdShadow.rotation.x=-Math.PI/2;birdShadow.scale.set(.62,.4,1);birdShadow.receiveShadow=false;
      // Face the road and follow the bird from left to right without turning the camera.
      const cameraDistance=Math.hypot(24,8),roadWidth=18;
      const cameraCenter=(z)=>z-(progressStep>0?4.7:4);
      let cameraZ=cameraCenter(shownZ),renderScale=Math.min(window.devicePixelRatio||1,window.matchMedia&&window.matchMedia('(pointer:coarse)').matches?1.45:1.75),performanceFrames=0,performanceTime=0;
      function resize(){const r=container.getBoundingClientRect(),w=Math.max(1,r.width),h=Math.max(1,r.height);renderer.setPixelRatio(renderScale);renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=2*Math.atan(roadWidth/(2*cameraDistance*camera.aspect))*180/Math.PI;camera.updateProjectionMatrix()}
      const observer=new ResizeObserver(resize);observer.observe(container);resize();
      function finishCross(){if(resolveCross){const done=resolveCross;resolveCross=null;done()}}
      function frameLoop(){if(!running)return;frame=requestAnimationFrame(frameLoop);const rawDt=clock.getDelta(),dt=Math.min(.05,rawDt),now=performance.now();performanceFrames++;performanceTime+=Math.min(.1,rawDt);if(performanceFrames>=90){if(performanceTime/performanceFrames>1/48&&renderScale>1.1){renderScale=Math.max(1.1,renderScale-.15);resize()}performanceFrames=0;performanceTime=0}for(let lane=0;lane<traffic.length;lane++){const car=traffic[lane];if(lane<blockedLanes){fadeCar(car,0);continue}if(hitTime&&car===hitCar)continue;car.obj.position.x+=car.speed*dt;if(car.obj.position.x>30)car.obj.position.x=-56;fadeCar(car,Math.min((car.obj.position.x+49)/13,(25-car.obj.position.x)/13))}
        const barrierEase=1-Math.exp(-dt*11);for(const barrier of barriers){if(barrier.userData.amount===barrier.userData.target)continue;barrier.userData.amount+=(barrier.userData.target-barrier.userData.amount)*barrierEase;if(Math.abs(barrier.userData.target-barrier.userData.amount)<.002)barrier.userData.amount=barrier.userData.target;barrier.visible=barrier.userData.amount>.01;barrier.scale.y=Math.max(.001,barrier.userData.amount)}
        shownZ+=(targetZ-shownZ)*Math.min(1,dt*7);bird.position.z=shownZ;let hop=0,jumpPan=0;if(jumpStart){const t=Math.min(1,(now-jumpStart)/630),arc=Math.sin(t*Math.PI);hop=arc*.46;jumpPan=arc*.65;body.rotation.x=arc*-.13;wings[0].rotation.z=-arc*.32;wings[1].rotation.z=arc*.32;legs[0].rotation.x=Math.sin(t*Math.PI*2)*.5;legs[1].rotation.x=-legs[0].rotation.x;if(t===1){jumpStart=0;body.rotation.x=0;wings.forEach(w=>w.rotation.z=0);legs.forEach(l=>l.rotation.x=0);if(!hitTime)finishCross()}}
        bird.position.y=birdGround+hop;birdShadow.position.z=shownZ;const shadowLift=hop/.46;birdShadow.scale.set(.62-shadowLift*.15,.4-shadowLift*.1,1);birdShadowMaterial.opacity=.3-shadowLift*.12;body.scale.y=1+Math.sin(now*.0022)*.008;head.rotation.y=Math.sin(now*.0008)*.08;head.rotation.x=Math.sin(now*.0016)*.027;
        if(hitTime&&hitCar){const p=Math.min(1,(now-hitTime)/650);hitCar.obj.position.x=-8+9*p;body.rotation.z=p> .55?(p-.55)*1.6:0;if(p===1){hitTime=0;hitCar.obj.position.x=-56;fadeCar(hitCar,0);finishCross()}}
        else body.rotation.z*=.85;
        cameraZ+=(cameraCenter(shownZ)-jumpPan-cameraZ)*(1-Math.exp(-dt*3.4));camera.position.z=cameraZ;camera.lookAt(0,0,cameraZ);renderer.render(scene,camera)}
      function setActive(value){if(value===running)return;running=value;if(running){performanceFrames=0;performanceTime=0;clock.getDelta();resize();frame=requestAnimationFrame(frameLoop)}else{cancelAnimationFrame(frame);shownZ=targetZ;bird.position.z=targetZ;bird.position.y=birdGround;birdShadow.position.z=targetZ;jumpStart=0;hitTime=0;body.rotation.z=0;if(hitCar){hitCar.obj.position.x=-56;fadeCar(hitCar,0)}finishCross()}}
      function setStep(step,animate){progressStep=Math.max(0,Math.min(8,Number(step)||0));targetZ=progressStep?laneCenter(progressStep):startZ;if(!animate){confirmStep(progressStep,true);jumpStart=0;shownZ=targetZ;bird.position.z=targetZ;bird.position.y=birdGround;birdShadow.position.z=targetZ;birdShadow.scale.set(.62,.4,1);birdShadowMaterial.opacity=.3;body.rotation.x=0;body.rotation.z=0;wings.forEach(w=>w.rotation.z=0);legs.forEach(l=>l.rotation.x=0);cameraZ=cameraCenter(targetZ);camera.position.z=cameraZ;camera.lookAt(0,0,cameraZ);finishCross()}}
      function move(after){setStep(after,true);if(!running){shownZ=targetZ;bird.position.z=targetZ;return Promise.resolve()}jumpStart=performance.now();return new Promise(resolve=>{resolveCross=resolve})}
      function hit(step){if(!running)return Promise.resolve();hitCar=traffic[(Math.max(1,step)-1)%traffic.length];hitTime=performance.now();hitCar.obj.position.x=-8;fadeCar(hitCar,1);return new Promise(resolve=>{resolveCross=resolve})}
      camera.position.set(24,8,cameraZ);camera.lookAt(0,0,cameraZ);resize();renderer.compile(scene,camera);renderer.render(scene,camera);
      return {setActive,setStep,move,hit,confirmStep};
    }
  })();
  </script>
</section>`;
