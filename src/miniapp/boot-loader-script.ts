export const STARTUP_RUNTIME_SCRIPT = `
(function(){
  if(window.__vexaStartupRuntimeStarted)return;
  window.__vexaStartupRuntimeStarted=true;
  var STARTUP_MANIFEST_URL='/app/api/uploaded-images?context=startup';
  var BACKGROUND_ASSETS_READY_KEY='vexa:background-assets-ready:v2';
  var startupManifestJob=null;
  var GAME_IMAGE_RETRY_MS=900;
  var GAME_MANIFEST_ATTEMPT_TIMEOUT_MS=6000;
  var GAME_IMAGE_ATTEMPT_TIMEOUT_MS=15000;
  var GAME_IMAGE_MAX_ATTEMPTS=2;
  var GAME_IMAGE_MANIFEST_CACHE_KEY='vexa:game-image-manifests:v1';
  var GAME_IMAGE_COMMON_URLS=[
    '/assets/Home.PNG?v=1',
    '/app/api/uploaded-image/ton-icon.png'
  ];
  var GAME_IMAGE_STATIC_BY_GAME={
    mines:['/assets/Mines.PNG?v=1'],
    plinko:[
      '/assets/Plinko.PNG?v=1',
      '/assets/plinko-glass/ball.webp',
      '/assets/plinko-glass/peg.webp',
      '/assets/plinko-glass/houses.webp',
      '/assets/plinko-glass/control-panel-new.webp',
      '/assets/plinko-glass/point-amount-card.webp?v=2',
      '/assets/plinko-glass/half-button.webp',
      '/assets/plinko-glass/double-button.webp',
      '/assets/plinko-glass/risk-easy.webp',
      '/assets/plinko-glass/risk-medium.webp',
      '/assets/plinko-glass/risk-hard.webp',
      '/assets/plinko-glass/control-primary.webp'
    ],
    crash:['/assets/Crash.PNG?v=60f79b66'],
    slot:['/assets/Slotbackground.PNG?v=1'],
    wheel:['/assets/Wheel.PNG?v=1'],
    dice:['/assets/Dice.PNG?v=1']
  };
  var gameImageKeep=window.__vexaGamePreloadedImages=window.__vexaGamePreloadedImages||[];
  var gameImageJobs=window.__vexaGameImagePreloadJobs=window.__vexaGameImagePreloadJobs||{};
  var gameImageFailures={};
  function visibility(){return window.VexaPlayZoneVisibility||null}
  function shouldPreloadGame(id){var state=visibility();return !state||typeof state.shouldPreload!=='function'||state.shouldPreload(id)}
  function staticUrlsForVisibleGames(){
    var out=GAME_IMAGE_COMMON_URLS.slice();
    Object.keys(GAME_IMAGE_STATIC_BY_GAME).forEach(function(id){if(shouldPreloadGame(id))out=out.concat(GAME_IMAGE_STATIC_BY_GAME[id])});
    return out
  }
  function gameImageDelay(ms){return new Promise(function(resolve){setTimeout(resolve,ms)})}
  function readManifestCache(){try{var value=JSON.parse(localStorage.getItem(GAME_IMAGE_MANIFEST_CACHE_KEY)||'{}');return value&&typeof value==='object'?value:{}}catch(e){return {}}}
  function writeManifestCache(cache){try{localStorage.setItem(GAME_IMAGE_MANIFEST_CACHE_KEY,JSON.stringify(cache||{}))}catch(e){}}
  function fetchJsonAttempt(url){
    return new Promise(function(resolve,reject){
      var done=false,controller=typeof AbortController==='function'?new AbortController():null;
      var options={cache:'no-store',credentials:'same-origin',headers:{accept:'application/json'}};
      if(controller)options.signal=controller.signal;
      var timer=setTimeout(function(){if(done)return;done=true;try{if(controller)controller.abort()}catch(e){}reject(new Error('image manifest timeout'))},GAME_MANIFEST_ATTEMPT_TIMEOUT_MS);
      fetch(url,options)
        .then(function(r){if(!r.ok)throw new Error('image manifest failed');return r.json()})
        .then(function(value){if(done)return;done=true;clearTimeout(timer);resolve(value)},function(error){if(done)return;done=true;clearTimeout(timer);reject(error)})
    })
  }
  function fetchJsonStrict(url,attempt){
    attempt=Math.max(0,Math.floor(Number(attempt)||0));
    return fetchJsonAttempt(url).catch(function(){
      if(attempt+1>=GAME_IMAGE_MAX_ATTEMPTS)return null;
      return gameImageDelay(GAME_IMAGE_RETRY_MS).then(function(){return fetchJsonStrict(url,attempt+1)})
    })
  }
  function startupManifestReady(){
    if(startupManifestJob)return startupManifestJob;
    startupManifestJob=fetchJsonStrict(STARTUP_MANIFEST_URL,0);
    return startupManifestJob
  }
  function preloadGameImageStrict(url){
    url=String(url||'').trim();
    if(!url||url==='none'||url.indexOf('data:image/')===0)return Promise.resolve(true);
    if(gameImageJobs[url])return gameImageJobs[url];
    function attempt(attemptNo){
      return new Promise(function(resolve,reject){
        var img=new Image(),done=false;
        var timer=setTimeout(function(){finish(false)},GAME_IMAGE_ATTEMPT_TIMEOUT_MS);
        function cleanup(){clearTimeout(timer);try{img.removeEventListener('load',loaded);img.removeEventListener('error',failed)}catch(e){}}
        function finish(ok){if(done)return;done=true;cleanup();if(ok){gameImageKeep.push(img);resolve(true)}else reject(new Error('game image failed'))}
        function decoded(){
          if(img.naturalWidth<=0){finish(false);return}
          if(typeof img.decode==='function')img.decode().then(function(){finish(true)}).catch(function(){finish(img.naturalWidth>0)});else finish(true)
        }
        function loaded(){decoded()}
        function failed(){finish(false)}
        img.addEventListener('load',loaded);
        img.addEventListener('error',failed);
        img.decoding='async';
        img.loading='eager';
        img.src=url;
        if(img.complete&&img.naturalWidth>0)decoded()
      }).catch(function(){
        if(attemptNo+1>=GAME_IMAGE_MAX_ATTEMPTS)return false;
        return gameImageDelay(GAME_IMAGE_RETRY_MS).then(function(){return attempt(attemptNo+1)})
      })
    }
    gameImageJobs[url]=attempt(0).then(function(ok){if(ok)delete gameImageFailures[url];else gameImageFailures[url]=true;return ok});
    return gameImageJobs[url]
  }
  function cleanGameImageUrl(value){
    var url=String(value||'').trim();
    return !url||url==='none'||url.indexOf('data:image/')===0?'':url
  }
  function idleTurn(){
    return new Promise(function(resolve){
      if(typeof window.requestIdleCallback==='function'){window.requestIdleCallback(function(){resolve()},{timeout:1800});return}
      setTimeout(resolve,180)
    })
  }
  function preloadUrlListLowPriority(values){
    var seen={},urls=[];
    (Array.isArray(values)?values:[]).forEach(function(value){
      var url=cleanGameImageUrl(value);
      if(!url||seen[url])return;
      seen[url]=true;urls.push(url)
    });
    return urls.reduce(function(job,url){
      return job.then(idleTurn).then(function(){return preloadGameImageStrict(url)})
    },Promise.resolve())
  }
  function preloadArrayUrls(j){return j&&Array.isArray(j.preload)?j.preload:[]}
  function sectionBackgroundUrls(j){
    var out=[];
    (j&&Array.isArray(j.sections)?j.sections:[]).forEach(function(section){
      var id=String(section&&section.id||'').trim(),url=String(section&&section.backgroundUrl||'').trim();
      if(url&&shouldPreloadGame(id))out.push(url)
    });
    return out
  }
  function ghostRunUrls(j){
    var out=[],map=j&&j.urls&&typeof j.urls==='object'?j.urls:{};
    Object.keys(map).forEach(function(key){out.push(map[key])});
    return out
  }
  function slotFrameUrls(j){return [j&&j.slotFrameUrl]}
  function slotSymbolUrls(j){return (j&&Array.isArray(j.symbols)?j.symbols:[]).map(function(item){return item&&item.imageUrl})}
  function slotControlUrls(j){
    return (j&&Array.isArray(j.controls)?j.controls:[]).filter(function(item){return item&&item.id==='spin'}).map(function(item){return item.imageUrl})
  }
  var GAME_IMAGE_MANIFESTS=[
    {url:STARTUP_MANIFEST_URL,urls:preloadArrayUrls},
    {url:'/app/api/section-backgrounds',urls:sectionBackgroundUrls},
    {url:'/app/api/uploaded-images?context=mines',game:'mines',urls:preloadArrayUrls},
    {url:'/app/api/uploaded-images?context=plinko',game:'plinko',urls:preloadArrayUrls},
    {url:'/app/api/ghost-run-assets',game:'ghostrun',urls:ghostRunUrls},
    {url:'/app/api/slot-frame',game:'slot',urls:slotFrameUrls},
    {url:'/app/api/slot-symbols',game:'slot',urls:slotSymbolUrls},
    {url:'/app/api/slot-controls',game:'slot',urls:slotControlUrls}
  ];
  function preloadManifestLowPriority(spec,cache){
    if(spec.game&&!shouldPreloadGame(spec.game))return Promise.resolve(true);
    var cached=cache&&cache[spec.url];
    return preloadUrlListLowPriority(spec.urls(cached)).then(idleTurn).then(function(){
      return spec.url===STARTUP_MANIFEST_URL?startupManifestReady():fetchJsonStrict(spec.url,0)
    }).then(function(j){
      if(!j)return true;
      cache[spec.url]=j;
      writeManifestCache(cache);
      return preloadUrlListLowPriority(spec.urls(j)).then(function(){return true})
    })
  }
  function gameImagesReady(){
    if(window.__vexaAllGameImagesReady)return window.__vexaAllGameImagesReady;
    window.__vexaAllGameImagesReady=Promise.resolve(window.__vexaPlayZoneVisibilityReady||false).then(function(){
      var manifestCache=readManifestCache();
      var job=preloadUrlListLowPriority(staticUrlsForVisibleGames());
      GAME_IMAGE_MANIFESTS.forEach(function(spec){job=job.then(function(){return preloadManifestLowPriority(spec,manifestCache)})});
      return job
    }).then(function(){
      window.__vexaGameImagePreloadFailures=Object.keys(gameImageFailures);
      gameImageKeep.length=0;
      return window.__vexaGameImagePreloadFailures.length===0
    }).catch(function(){
      window.__vexaGameImagePreloadFailures=Object.keys(gameImageFailures);
      gameImageKeep.length=0;
      return false
    });
    return window.__vexaAllGameImagesReady
  }
  function scheduleBackgroundWarmup(){
    if(window.__vexaBackgroundWarmupScheduled)return;
    window.__vexaBackgroundWarmupScheduled=true;
    setTimeout(function(){
      idleTurn().then(function(){
        var applyBackgrounds=window.VexaApplySectionBackgrounds;
        return typeof applyBackgrounds==='function'?Promise.resolve(applyBackgrounds()).catch(function(){return false}):false
      }).then(function(){
        try{if(localStorage.getItem(BACKGROUND_ASSETS_READY_KEY)==='1')return true}catch(e){}
        return gameImagesReady().then(function(value){if(value)try{localStorage.setItem(BACKGROUND_ASSETS_READY_KEY,'1')}catch(e){}return value})
      }).catch(function(){})
    },700)
  }
  function homeHydrationReady(){
    if(window.__vexaHomeHydrated===true)return Promise.resolve(true);
    return new Promise(function(resolve){
      var done=false;
      var timer=setTimeout(function(){finish(false)},6500);
      function finish(value){if(done)return;done=true;clearTimeout(timer);resolve(value)}
      window.addEventListener('vexa:home-hydrated',function(){finish(true)},{once:true});
      if(window.__vexaHomeHydrated===true)finish(true)
    })
  }
  function afterFirstPaint(callback){
    var raf=typeof window.requestAnimationFrame==='function'?window.requestAnimationFrame.bind(window):function(fn){setTimeout(fn,0)};
    raf(function(){raf(callback)})
  }
  function markHomeReady(){
    if(window.__vexaHomeReadyDispatched)return;
    window.__vexaHomeReadyDispatched=true;
    try{window.dispatchEvent(new CustomEvent('vexa:home-ready'))}catch(e){}
    scheduleBackgroundWarmup()
  }
  window.__vexaInitialUiReady=homeHydrationReady().then(function(){
    return new Promise(function(resolve){
      afterFirstPaint(function(){markHomeReady();resolve(true)})
    })
  });
})();
`;
