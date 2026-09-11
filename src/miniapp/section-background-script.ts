export const SECTION_BACKGROUND_SCRIPT = `
(function(){
  var aliases={predict:'predictzone'};
  var EMPTY='data:image/gif;base64,R0lGODlhAQABAAAAACw=';
  var predictBackgroundSource='';
  var predictBackgroundDisplay='';
  var predictBackgroundDesiredSource='';
  function playZoneCardSelectors(id){return ['#'+id,'#playzone [data-play-zone-card-id="'+id+'"]','#playzone [data-play-zone-card-id="'+id+'"] .game-card','#playzone [data-play-zone-card-id="'+id+'"] .game-image img']}
  var targetSelectors={
    connect:['#connect'],
    playzone:['#playzone','#playzone .play-zone-stage'],
    'predict-zone-card':['#playzone .play-zone-predict-card','#playzone [data-admin-image-slot="predict-zone-card"]','#predictzone .predict-zone-glass-card'],
    'playzone-row-ad-right':['#playzone .playzone-row-ad-right','#playzone [data-playzone-ad="right"]','#playzone [data-play-zone-ad="playzone-row-ad-right"]','#playzone [data-play-zone-ad="playzone-row-ad-2"]'],
    'playzone-row-ad-left':['#playzone .playzone-row-ad-left','#playzone [data-playzone-ad="left"]','#playzone [data-play-zone-ad="playzone-row-ad-left"]','#playzone [data-play-zone-ad="playzone-row-ad-1"]'],
    flow:['#flow'],
    mines:playZoneCardSelectors('mines'),
    plinko:playZoneCardSelectors('plinko'),
    crash:playZoneCardSelectors('crash'),
    wheel:playZoneCardSelectors('wheel'),
    dice:playZoneCardSelectors('dice'),
    slot:playZoneCardSelectors('slot'),
    tower:playZoneCardSelectors('tower'),
    coinflip:playZoneCardSelectors('coinflip'),
    hilo:playZoneCardSelectors('hilo'),
    'wheel-separator':['#wheel .wheel-separator','[data-section-background-target="wheel-separator"]'],
  };
  function cssUrl(url){return 'url("'+String(url).replace(/\\\\/g,'\\\\\\\\').replace(/"/g,'\\\\"')+'")'}
  function add(list,el){if(el&&list.indexOf(el)<0)list.push(el)}
  function absoluteUrl(url){try{return new URL(String(url||''),window.location.href).toString()}catch(e){return String(url||'').trim()}}
  function sectionIdFromImage(img){var shell=img&&img.closest&&img.closest('[data-play-zone-card-id]');return shell&&shell.getAttribute('data-play-zone-card-id')||''}
  function defaultPlayZoneImageUrl(id){return id?'/app/api/section-lock-image/'+id+'/locked.png?v=1':''}
  function targets(id){
    var list=[];
    (targetSelectors[id]||[]).forEach(function(selector){try{Array.prototype.forEach.call(document.querySelectorAll(selector),function(el){add(list,el)})}catch(e){}});
    add(list,document.getElementById(id));
    add(list,document.getElementById(aliases[id]||''));
    try{Array.prototype.forEach.call(document.querySelectorAll('[data-section-background-target="'+String(id).replace(/"/g,'\\"')+'"]'),function(el){add(list,el)})}catch(e){}
    return list;
  }
  function applyBackgroundToElement(el,url){if(!el||el.tagName==='IMG')return;el.classList.add('has-admin-background');el.style.setProperty('--admin-section-background-image',cssUrl(url))}
  function clearBackgroundFromElement(el){if(!el||el.tagName==='IMG')return;el.classList.remove('has-admin-background');el.style.removeProperty('--admin-section-background-image')}
  function setPredictBackgroundDisplay(source,display){
    if(predictBackgroundDesiredSource&&source!==predictBackgroundDesiredSource)return false;
    var root=document.documentElement;if(!root)return false;
    var value=display?cssUrl(display):'';
    if(source===predictBackgroundSource&&display===predictBackgroundDisplay)return true;
    if(value){if(root.style.getPropertyValue('--admin-predict-background-image')!==value)root.style.setProperty('--admin-predict-background-image',value)}
    else if(root.style.getPropertyValue('--admin-predict-background-image'))root.style.removeProperty('--admin-predict-background-image');
    predictBackgroundSource=source;
    predictBackgroundDisplay=display;
    return true;
  }
  function applyPredictBackground(url){
    var source=absoluteUrl(url);
    if(!source)return clearPredictBackground();
    predictBackgroundDesiredSource=source;
    return Promise.resolve(setPredictBackgroundDisplay(source,source))
  }
  function clearPredictBackground(){
    predictBackgroundDesiredSource='';
    setPredictBackgroundDisplay('','');
    return Promise.resolve(false)
  }
  function remember(img,name,value){if(!img.dataset[name])img.dataset[name]=value||''}
  function overrideImage(img,url){
    if(!img||img.tagName!=='IMG'||!url)return;
    remember(img,'adminBgOriginalSrc',img.getAttribute('src')||defaultPlayZoneImageUrl(sectionIdFromImage(img)));
    remember(img,'adminBgOriginalSectionSrc',img.getAttribute('data-section-image-src')||defaultPlayZoneImageUrl(sectionIdFromImage(img)));
    remember(img,'adminBgOriginalFallbackSrc',img.getAttribute('data-fallback-src')||defaultPlayZoneImageUrl(sectionIdFromImage(img)));
    img.setAttribute('data-admin-bg-overridden','1');
    img.src=url;
    img.setAttribute('data-section-image-src',url);
    img.setAttribute('data-fallback-src',url);
    img.style.display='';
    img.classList.remove('is-empty');
  }
  function restoreImage(img){
    if(!img||img.tagName!=='IMG'||img.getAttribute('data-admin-bg-overridden')!=='1')return;
    var id=sectionIdFromImage(img);
    var fallback=defaultPlayZoneImageUrl(id);
    var sectionSrc=img.dataset.adminBgOriginalSectionSrc||fallback;
    var fallbackSrc=img.dataset.adminBgOriginalFallbackSrc||fallback||sectionSrc;
    var src=img.dataset.adminBgOriginalSrc||fallback||sectionSrc;
    if(src===EMPTY)src=sectionSrc||fallback||src;
    if(src)img.src=src;else img.removeAttribute('src');
    if(sectionSrc)img.setAttribute('data-section-image-src',sectionSrc);else img.removeAttribute('data-section-image-src');
    if(fallbackSrc)img.setAttribute('data-fallback-src',fallbackSrc);else img.removeAttribute('data-fallback-src');
    img.style.display='';
    img.classList.remove('is-empty');
    img.removeAttribute('data-admin-bg-overridden');
    delete img.dataset.adminBgOriginalSrc;delete img.dataset.adminBgOriginalSectionSrc;delete img.dataset.adminBgOriginalFallbackSrc;
  }
  function imageTargetsInside(el){
    var imgs=[];
    if(!el)return imgs;
    if(el.tagName==='IMG'){add(imgs,el);return imgs}
    try{Array.prototype.forEach.call(el.querySelectorAll('.game-image img,img[data-section-image-src],img[data-admin-bg-overridden="1"]'),function(img){add(imgs,img)})}catch(e){}
    return imgs;
  }
  function applySectionBackground(section){
    if(!section||!section.id)return;
    if(section.id==='ghostrun'||section.id==='predict')return;
    var found=targets(section.id);
    if(!found.length)return;
    found.forEach(function(el){
      if(section.backgroundUrl){
        if(el.tagName==='IMG')overrideImage(el,section.backgroundUrl);else applyBackgroundToElement(el,section.backgroundUrl);
        imageTargetsInside(el).forEach(function(img){overrideImage(img,section.backgroundUrl)});
      }else{
        if(el.tagName==='IMG')restoreImage(el);else clearBackgroundFromElement(el);
        imageTargetsInside(el).forEach(restoreImage);
      }
    });
  }
  var cache=null;
  var inFlight=null;
  function sectionVisible(id){var el=document.getElementById(aliases[id]||id);return !!(el&&el.classList&&el.classList.contains('active'))}
  function visibilityAllowsSection(id){var state=window.VexaPlayZoneVisibility;return !state||typeof state.shouldPreload!=='function'||state.shouldPreload(id)}
  function shouldApplySection(section){if(!section||!section.id)return false;var id=aliases[section.id]||section.id;if(section.id==='home'||section.id.indexOf('home-')===0||section.id==='ghostrun')return false;if(!visibilityAllowsSection(id))return false;if(section.id.indexOf('playzone-')===0)return sectionVisible('playzone');if(['mines','plinko','crash','wheel','dice','slot','tower','coinflip','hilo','predict-zone-card'].indexOf(section.id)>=0)return sectionVisible('playzone')||sectionVisible(id);return sectionVisible(id)}
  function apply(sections){
    if(!Array.isArray(sections))return Promise.resolve();
    var jobs=[];
    sections.forEach(function(section){
      if(section&&section.id==='predict'){jobs.push(section.backgroundUrl?applyPredictBackground(section.backgroundUrl):clearPredictBackground());return}
      if(shouldApplySection(section))applySectionBackground(section)
    });
    return jobs.length?Promise.all(jobs).then(function(){}):Promise.resolve()
  }
  function load(force){
    if(!force&&cache)return apply(cache.sections).then(function(){return cache});
    if(inFlight)return inFlight;
    inFlight=fetch('/app/api/section-backgrounds',{credentials:'same-origin',cache:'no-store'})
      .then(function(r){return r.ok?r.json():null})
      .then(function(j){if(!j)return cache;cache=j;return apply(j.sections).then(function(){return j})})
      .catch(function(){return cache?apply(cache.sections).then(function(){return cache}):cache})
      .finally(function(){inFlight=null});
    return inFlight;
  }
  window.VexaApplySectionBackgrounds=function(){return load(false)};
  if(window.VexaRefreshPlayZoneImages&&!window.VexaRefreshPlayZoneImages.__adminBgWrapped){
    var originalPlayZoneRefresh=window.VexaRefreshPlayZoneImages;
    window.VexaRefreshPlayZoneImages=function(){
      var result=originalPlayZoneRefresh.apply(this,arguments);
      try{Promise.resolve(result).then(function(refreshed){if(refreshed!==false)setTimeout(function(){load(true)},0)})}catch(e){setTimeout(function(){load(true)},0)}
      return result;
    };
    window.VexaRefreshPlayZoneImages.__adminBgWrapped=true;
  }
})();
`;

export const SECTION_BACKGROUND_STYLES = `
.has-admin-background {
  background-image: var(--admin-section-background-image) !important;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}
.view.has-admin-background {
  background-color: #000 !important;
}
.view.has-admin-background::before {
  content: "";
  position: sticky;
  top: 0;
  display: block;
  width: 100%;
  height: 0;
  pointer-events: none;
  z-index: 0;
}
.view.has-admin-background > * {
  position: relative;
  z-index: 1;
}
.game-card-shell.has-admin-background,
.game-card.has-admin-background,
.predict-zone-card.has-admin-background,
.play-zone-predict-card.has-admin-background,
.play-zone-predict-image-slot.has-admin-background,
.play-zone-stage.has-admin-background {
  background-image: var(--admin-section-background-image) !important;
  background-size: cover !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
}
html body:has(#ghostrun.active)::before {
  content: "" !important;
  display: block !important;
  position: fixed !important;
  inset: 0 !important;
  z-index: 0 !important;
  pointer-events: none !important;
  background-color: #000 !important;
  background-image: url('/app/api/section-background/ghostrun.png') !important;
  background-size: cover !important;
  background-position: center center !important;
  background-repeat: no-repeat !important;
}
html body:has(#ghostrun.active) .app,
html body:has(#ghostrun.active) .content,
html body:has(#ghostrun.active) #ghostrun.ghost-run-view,
html body:has(#ghostrun.active) #ghostrun .ghost-run-screen,
html body:has(#ghostrun.active) .top {
  background: transparent !important;
  background-color: transparent !important;
  background-image: none !important;
}
html body:has(#ghostrun.active) .top,
html body:has(#ghostrun.active) .content {
  position: relative !important;
  z-index: 1 !important;
}
img[data-admin-bg-overridden="1"] {
  display: block !important;
}
`;
