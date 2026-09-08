import { CRASH_PERFORMANCE_SCRIPT } from './scripts/performance';
import { CRASH_LIVE_D1_SCRIPT } from './scripts/live-bets';
import { CRASH_BACK_BUTTON_SCRIPT } from './scripts/back-button';
import { CRASH_BREAK_FX_SCRIPT } from './scripts/break-effect';

export const CRASH_ROCKET_MODEL_URL = '/assets/Rocket3D.glb?v=2440b00e70f8e34a2366d642d3f99035d366618a';

const CRASH_SPIN_BLUR_SCRIPT = `
(async function(){
  self.ModelViewerElement=self.ModelViewerElement||{};
  self.ModelViewerElement.powerPreference='low-power';
  if(window.__vexaCrashSpinBlurSetup)return;
  window.__vexaCrashSpinBlurSetup=true;
  try{
    await import('https://cdn.jsdelivr.net/npm/@google/model-viewer@4.3.1/dist/model-viewer-module.min.js');
    await customElements.whenDefined('model-viewer');
    await import('https://cdn.jsdelivr.net/npm/@google/model-viewer-effects@1.4.0/dist/model-viewer-effects.min.js');
    await customElements.whenDefined('effect-composer');
    var PostProcessing=await import('https://cdn.jsdelivr.net/npm/postprocessing@6.38.2/build/index.js'),Three=await import('three');
    var Effect=PostProcessing.Effect,EffectAttribute=PostProcessing.EffectAttribute,EffectPass=PostProcessing.EffectPass,Uniform=Three.Uniform;
    var composer=document.getElementById('crashSpinComposer');
    if(!composer)return;
    var fragment=[
      'uniform float strength;',
      'void mainImage(const in vec4 inputColor,const in vec2 uv,out vec4 outputColor){',
      'if(strength<=0.001){outputColor=inputColor;return;}',
      'float radius=mix(0.0,0.032,strength);',
      'vec4 s0=texture2D(inputBuffer,uv+vec2(-radius,0.0));',
      'vec4 s1=texture2D(inputBuffer,uv+vec2(-radius*.50,0.0));',
      'vec4 s2=inputColor;',
      'vec4 s3=texture2D(inputBuffer,uv+vec2(radius*.50,0.0));',
      'vec4 s4=texture2D(inputBuffer,uv+vec2(radius,0.0));',
      'float a0=s0.a*.12,a1=s1.a*.23,a2=s2.a*.30,a3=s3.a*.23,a4=s4.a*.12;',
      'float a=max(a0+a1+a2+a3+a4,0.0001);',
      'vec3 blurred=(s0.rgb*a0+s1.rgb*a1+s2.rgb*a2+s3.rgb*a3+s4.rgb*a4)/a;',
      'float interior=smoothstep(.025,.18,inputColor.a);',
      'outputColor=vec4(mix(inputColor.rgb,blurred,strength*interior),inputColor.a);',
      '}'
    ].join(String.fromCharCode(10));
    class CrashSpinBlurEffect extends Effect{
      constructor(){super('CrashSpinBlurEffect',fragment,{attributes:EffectAttribute.CONVOLUTION,uniforms:new Map([['strength',new Uniform(0)]])})}
    }
    var effect=new CrashSpinBlurEffect(),pass=new EffectPass(undefined,effect),attached=false,last=-1;
    function strengthFor(value){
      var v=Math.max(1,Number(value)||1);if(v<5)return 0;if(v>=8)return 1;
      var t=(v-5)/3;t=t*t*(3-2*t);return .62+.38*t
    }
    function sync(value){
      var strength=strengthFor(value);
      if(Math.abs(strength-last)<.004)return;last=strength;
      effect.uniforms.get('strength').value=strength;
      if(strength>0&&!attached){composer.addPass(pass,false,false);attached=true}
      else if(strength<=0&&attached){composer.removePass(pass,false);attached=false}
      if(attached)composer.queueRender()
    }
    window.__vexaCrashBlurFrame=sync;
    sync(1)
  }catch(e){window.__vexaCrashSpinBlurSetup=false}
})();
`;

const CRASH_SPACE_ENVIRONMENT_SCRIPT = `
(function(){
  if(window.__vexaCrashSpaceEnvironment)return;
  window.__vexaCrashSpaceEnvironment=true;
  var canvas=document.getElementById('crashSpaceCanvas'),root=document.getElementById('crash');
  if(!canvas||!root)return;
  var booted=false,lastMotionMs=0,webglMotion=0,canvasTravel=0;
  function active(){return root.classList.contains('active')&&!document.hidden}
  function frameDelta(ms){
    ms=Number(ms)||performance.now();
    if(!lastMotionMs){lastMotionMs=ms;return 0}
    var dt=Math.max(0,Math.min(50,ms-lastMotionMs));lastMotionMs=ms;return dt*.001
  }
  function resetMotionClock(){lastMotionMs=0}
  function speedBoost(value){var v=Math.max(1,Number(value)||1);if(v>=2.2)return 3;if(v<1.4){var t=(v-1)/.4;return 1+t*t*(3-2*t)}var t=(v-1.4)/.8;return 2+t*t*(3-2*t)}
  function streakIntensity(value){
    var v=Number.isFinite(value)?Math.max(1,value):1,t=Math.max(0,Math.min(1,(v-1.7)/2.3));
    return Math.min(1,.32+(1-Math.pow(1-t,2))*.68)
  }
  function rocketAngleRad(){var deg=Number(window.__vexaCrashRocketAngleDeg);if(!Number.isFinite(deg))deg=80;deg=Math.max(60,Math.min(80,deg));return deg*Math.PI/180}
  function canvasDpr(){return Math.min(1.05,Math.max(1,window.devicePixelRatio||1))}
  function resize(gl){var rect=canvas.getBoundingClientRect(),dpr=canvasDpr(),w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}if(gl)gl.viewport(0,0,w,h)}
  function fallback2d(){
    var ctx=canvas.getContext('2d');if(!ctx){var replacement=document.createElement('canvas');replacement.id=canvas.id;replacement.className=canvas.className;replacement.setAttribute('aria-hidden','true');canvas.replaceWith(replacement);canvas=replacement;ctx=canvas.getContext('2d')}if(!ctx)return;
    var particles=[],seed=90210;
    function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}
    for(var i=0;i<42;i++)particles.push({x:random(),y:random(),rank:random(),width:.45+random()*.65,length:.55+random()*.9});
    resetMotionClock();resize(null);
    function frame(ms,value){
      if(!active())return;
      var v=Number.isFinite(value)?Math.max(1,value):1,intensity=streakIntensity(v),boost=speedBoost(v),angle=rocketAngleRad(),dx=-Math.sin(angle),dy=Math.cos(angle),w=canvas.width,h=canvas.height,dpr=canvasDpr(),speed=(45+intensity*300)*boost*dpr;
      canvasTravel+=frameDelta(ms)*speed;
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
      for(var i=0;i<particles.length;i++){
        var p=particles[i],visibility=.84-intensity*.36;if(p.rank<visibility)continue;
        var travel=canvasTravel*(.62+p.rank*.65),span=Math.abs(dx)*w+Math.abs(dy)*h+180*dpr;
        var offset=((travel+p.rank*span)%span),x=((p.x*w+dx*offset)%w+w)%w,y=((p.y*h+dy*offset)%h+h)%h;
        var trail=(13+intensity*76)*p.length*dpr;
        ctx.globalAlpha=.22+intensity*.62;ctx.strokeStyle=p.rank>.86?'#ffe9df':'#e8efff';ctx.lineWidth=p.width*dpr;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-dx*trail,y-dy*trail);ctx.stroke();
      }
      ctx.globalAlpha=1
    }
    function resume(){resetMotionClock();resize(null)}
    window.__vexaCrashSpaceFrame=frame;
    window.addEventListener('resize',function(){resetMotionClock();resize(null)},{passive:true});
    window.addEventListener('vexa-crash-visible',resume,{passive:true})
  }
  function boot(){
    if(booted||!active())return;booted=true;resetMotionClock();
    var gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
    if(!gl){fallback2d();return}
    resize(gl);
    var vertex=[
      'attribute vec2 a_position;',
      'varying vec2 v_uv;',
      'void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.0,1.0);}'
    ].join(String.fromCharCode(10));
    var precisionInfo=gl.getShaderPrecisionFormat&&gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT),precisionLine=precisionInfo&&precisionInfo.precision>0?'precision highp float;':'precision mediump float;';
    var fragment=[
      precisionLine,
      'varying vec2 v_uv;',
      'uniform float u_time;',
      'uniform float u_intensity;',
      'uniform float u_rocket_angle;',
      'float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
      'vec3 streakLayer(vec2 uv,float cells,float seed,float gain){',
      'vec2 direction=normalize(vec2(-sin(u_rocket_angle),-cos(u_rocket_angle))),across=vec2(-direction.y,direction.x);',
      'vec2 rotated=vec2(dot(uv,across),dot(uv,direction));rotated.y-=u_time;',
      'vec2 grid=rotated*vec2(cells,cells*.20),cell=floor(grid),gv=fract(grid)-.5;float rnd=hash21(cell+seed);',
      'vec2 jitter=(vec2(hash21(cell+seed+2.8),hash21(cell+seed+8.1))-.5)*vec2(.72,.68);vec2 delta=gv-jitter;',
      'float width=mix(.009,.029,u_intensity),trailLength=mix(.045,.39,u_intensity);',
      'float trail=(1.0-smoothstep(width,width*2.7,abs(delta.x)))*(1.0-smoothstep(trailLength,trailLength+.10,abs(delta.y)));',
      'float head=1.0-smoothstep(width,width*3.8,length(delta-vec2(0.0,-trailLength*.70)));',
      'float exists=smoothstep(mix(.992,.962,u_intensity),1.0,rnd);vec3 tint=mix(vec3(.79,.86,1.0),vec3(1.0,.89,.82),hash21(cell+seed+13.7)*.52);',
      'return tint*(trail*.30+head*.86)*exists*gain*mix(.36,1.0,u_intensity);',
      '}',
      'void main(){vec2 uv=v_uv;vec3 color=vec3(0.0);color+=streakLayer(uv,27.0,21.4,.76);color+=streakLayer(uv+vec2(.17,.09),44.0,44.8,.46);float alpha=clamp(max(max(color.r,color.g),color.b)*3.2,0.0,1.0);gl_FragColor=vec4(color,alpha);}'
    ].join(String.fromCharCode(10));
    function shader(type,source){var s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);return null}return s}
    var vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);if(!vs||!fs){fallback2d();return}
    var program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS)){fallback2d();return}
    gl.useProgram(program);var buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);var position=gl.getAttribLocation(program,'a_position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    var time=gl.getUniformLocation(program,'u_time'),intensity=gl.getUniformLocation(program,'u_intensity'),rocketAngle=gl.getUniformLocation(program,'u_rocket_angle');
    function frame(ms,value){
      if(!active())return;
      var v=Number.isFinite(value)?Math.max(1,value):1,i=streakIntensity(v),boost=speedBoost(v);webglMotion+=frameDelta(ms)*(.15+(.72-.15)*i)*boost;gl.useProgram(program);gl.uniform1f(time,webglMotion);gl.uniform1f(intensity,i);gl.uniform1f(rocketAngle,rocketAngleRad());gl.drawArrays(gl.TRIANGLES,0,6)
    }
    function resume(){resetMotionClock();resize(gl)}
    window.__vexaCrashSpaceFrame=frame;
    canvas.addEventListener('webglcontextlost',function(ev){ev.preventDefault();window.__vexaCrashSpaceFrame=null;booted=false;resetMotionClock()});
    canvas.addEventListener('webglcontextrestored',function(){booted=false;resetMotionClock();boot()});
    window.addEventListener('resize',function(){resetMotionClock();resize(gl)},{passive:true});
    window.addEventListener('vexa-crash-visible',resume,{passive:true})
  }
  window.addEventListener('vexa-crash-visible',boot,{passive:true});
  if(active())boot();
})();
`;
export const CRASH_SECTION = `<section id="crash" class="view crash-view">
  <div class="crash-page">
    <canvas id="crashSpaceCanvas" class="crash-space-canvas" aria-hidden="true"></canvas>
    <div class="crash-stage">
      <div class="crash-history" id="crashHistory"></div>
      <div id="crashRocketScene" class="crash-rocket-scene" aria-label="3D crash rocket">
        <div id="crashRocketFlight" class="crash-rocket-flight" data-state="waiting">
          <div class="crash-rocket-heat" aria-hidden="true"></div>
          <div class="crash-rocket-flame" aria-hidden="true">
            <span class="crash-flame-outer"></span>
            <span class="crash-flame-middle"></span>
            <span class="crash-flame-core"></span>
          </div>
          <model-viewer id="crashRocket" class="crash-rocket-model" src="${CRASH_ROCKET_MODEL_URL}" alt="3D rocket" camera-orbit="0deg 78deg 108%" field-of-view="28deg" exposure="1.08" auto-rotate-delay="0" rotation-per-second="18deg" interaction-prompt="none" disable-zoom touch-action="none" loading="eager" reveal="auto"><effect-composer id="crashSpinComposer" render-mode="performance"></effect-composer></model-viewer>
        </div>
      </div>
      <div class="crash-multiplier-wrap">
        <div class="crash-multiplier" id="crashMultiplier">1.00x</div>
        <div class="crash-next-round" id="crashNextRound">Next round 5.0s</div>
      </div>
      <b id="crashCountdown" class="crash-hidden-state">Ready</b>
      <strong id="crashTotalTime" class="crash-hidden-state">Total 0s</strong>
    </div>
    <div class="crash-controls">
      <div class="crash-control-grid">
        <div class="crash-field crash-auto-field">
          <small>Auto Cash Out</small>
          <b><span class="crash-auto"><input id="crashAutoCashout" inputmode="decimal" pattern="[0-9.]*" value="5.00"/><span>x</span></span></b>
        </div>
        <div class="crash-bet">
          <button type="button" data-action="crash-half">1/2</button>
          <span class="crash-bet-main active"><input id="crashAmount" inputmode="decimal" pattern="[0-9.]*" value="1.00" aria-label="Amount TON"/></span>
          <button type="button" data-action="crash-double">2x</button>
        </div>
        <div class="crash-actions">
          <button id="crashAction" class="crash-primary" type="button">Place Bet</button>
        </div>
      </div>
      <div class="crash-live open" id="crashLive">
        <div class="crash-live-head">
          <span class="crash-live-title">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.2 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/><path d="M3.4 18.4c.6-3 2.3-4.6 4.8-4.6s4.2 1.6 4.8 4.6"/><path d="M16.3 10.2a2.6 2.6 0 1 0 0-5.2"/><path d="M15.4 13.6c2.4.2 3.9 1.7 4.4 4.3"/></svg>
            <span>Live Bets</span>
          </span>
          <div class="crash-live-head-actions">
            <b id="crashLiveTotal">0 Gram</b>
            <button id="crashLiveToggle" class="crash-live-toggle" type="button" aria-label="Toggle live bets" aria-expanded="true">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>
            </button>
          </div>
        </div>
        <div class="crash-live-list" id="crashLiveList"><div class="crash-live-empty">No bets yet</div></div>
      </div>
    </div>
  </div>
  <script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.183.0/build/three.module.min.js"}}</script>
  <script type="module">${CRASH_SPIN_BLUR_SCRIPT}</script>
  <script>${CRASH_SPACE_ENVIRONMENT_SCRIPT}</script>
  <script>${CRASH_PERFORMANCE_SCRIPT}</script>
  <script>${CRASH_LIVE_D1_SCRIPT}</script>
  <script>${CRASH_BACK_BUTTON_SCRIPT}</script>
  <script>${CRASH_BREAK_FX_SCRIPT}</script>
</section>`;