export const LEVEL_SYNC_SCRIPT = `
(function(){
  var tg=window.Telegram&&window.Telegram.WebApp;
  var user=(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user)||{};
  var profile=null;
  var flushingXp=false;
  var pendingXp=[];
  var pendingXpUserId='';
  var PLAY_XP_INTERVAL_MS=3600000;
  var PLAY_XP_AMOUNT=60;
  var DAILY_XP_AMOUNT=50;
  var playMs=0;
  var playSessionStartedAt=0;
  var dailyChecked=false;
  var loadingProfile=false;
  var profileLoadJob=null;
  var lastProfileLoadAt=0;
  var playTimer=0;
  var renderedTotalXp=-1;
  var flushTimer=0;
  var observedSection='';
  var exitDrained=false;
  var PROFILE_STALE_MS=60000;
  var FORCE_PROFILE_RELOAD_MS=120000;
  var FLUSH_DEBOUNCE_MS=2500;
  var ranks=[
    {name:'Rookie',range:'Level 1-4',min:1,max:4,text:'Start your Vexa journey.'},
    {name:'Explorer',range:'Level 5-9',min:5,max:9,text:'Discover games and rewards.'},
    {name:'Pro',range:'Level 10-15',min:10,max:15,text:'Consistent player with real momentum.'},
    {name:'Elite',range:'Level 16-24',min:16,max:24,text:'Premium status and strong activity.'},
    {name:'Master',range:'Level 25-39',min:25,max:39,text:'Advanced user with high control.'},
    {name:'Legend',range:'Level 40-59',min:40,max:59,text:'Rare profile with serious prestige.'},
    {name:'Titan',range:'Level 60+',min:60,max:999,text:'The highest Vexa FLOW status.'}
  ];
  function id(){return String(user.id||localStorage.getItem('ownerId')||'').trim()}
  function initData(){return String((tg&&tg.initData)||'').trim()}
  function section(){var active=document.querySelector('.view.active');return active&&active.id?active.id:'home'}
  function isPlinkoSection(name){return String(name||section()).replace(/^view-/,'')==='plinko'}
  function todayKey(){return new Date().toISOString().slice(0,10)}
  function storageKey(){return 'vexa:plinko-xp-ms:'+id()}
  function dailyStorageKey(){return 'vexa:daily-xp:'+id()}
  function pendingXpKey(){return 'vexa:xp-pending:'+id()}
  function profileKey(){return 'vexa:level-profile:'+id()}
  function loadPlayMs(){try{var v=Number(localStorage.getItem(storageKey())||0);playMs=Math.max(0,Math.min(PLAY_XP_INTERVAL_MS-1,Math.floor(v)||0))}catch(e){playMs=0}}
  function savePlayMs(){try{var userId=id();if(userId)localStorage.setItem(storageKey(),String(Math.max(0,Math.min(PLAY_XP_INTERVAL_MS-1,Math.floor(playMs)||0))))}catch(e){}}
  function loadPendingXp(){var userId=id();if(!userId)return[];if(pendingXpUserId===userId)return pendingXp;pendingXpUserId=userId;try{var a=JSON.parse(localStorage.getItem(pendingXpKey())||'[]');pendingXp=Array.isArray(a)?a.filter(function(e){return e&&e.eventId&&e.amount}).slice(-120):[]}catch(e){pendingXp=[]}return pendingXp}
  function pendingXpTotal(){return loadPendingXp().reduce(function(sum,e){return sum+Math.max(0,Math.floor(Number(e&&e.amount)||0))},0)}
  function savePendingXp(a){var userId=id();if(!userId)return;pendingXpUserId=userId;pendingXp=(Array.isArray(a)?a:[]).slice(-120);try{if(pendingXp.length)localStorage.setItem(pendingXpKey(),JSON.stringify(pendingXp));else localStorage.removeItem(pendingXpKey())}catch(e){}}
  function cacheProfile(p){try{var userId=id();if(userId&&p)localStorage.setItem(profileKey(),JSON.stringify(p))}catch(e){}}
  function loadCachedProfile(){try{var p=JSON.parse(localStorage.getItem(profileKey())||'null');if(p&&typeof p==='object')render(p,{force:true})}catch(e){}}
  function xpEventId(){return 'xpc_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,12)}
  function esc(v){return String(v==null?'':v).replace(/[&<>]/g,function(s){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[s]||s})}
  function rank(level){level=Math.max(1,Math.floor(Number(level)||1));if(level>=60)return 'Titan';if(level>=40)return 'Legend';if(level>=25)return 'Master';if(level>=16)return 'Elite';if(level>=10)return 'Pro';if(level>=5)return 'Explorer';return 'Rookie'}
  function rankKey(value){return String(value||'Rookie').replace(/[^0-9A-Za-z_-]/g,'').slice(0,40)||'Rookie'}
  function setRankCharacter(rankName){try{var img=document.querySelector('.brand img.logo');if(!img)return;if(!img.dataset.defaultSrc)img.dataset.defaultSrc=img.getAttribute('src')||'https://t.me/i/userpic/320/VexaFlowBOT.jpg';var key=rankKey(rankName);var version=String(window.__vexaAppVersion||Date.now());var src='/app/api/rank-character/'+encodeURIComponent(key)+'.png?v='+version;if(img.getAttribute('src')!==src){img.onerror=function(){this.onerror=null;this.src=this.dataset.defaultSrc||'https://t.me/i/userpic/320/VexaFlowBOT.jpg'};img.src=src}bindRankModalTrigger(img)}catch(e){}}
  function need(level){level=Math.max(1,Math.floor(Number(level)||1));return Math.max(100,Math.floor(100*Math.pow(level,1.35)))}
  function clean(p){var level=Math.max(1,Math.floor(Number(p&&p.level)||1));var next=Math.max(1,Math.floor(Number(p&&p.nextLevelXp)||need(level)));var xp=Math.max(0,Math.min(next,Math.floor(Number(p&&p.xp)||0)));var percent=Math.max(0,Math.min(100,Math.floor((xp/next)*100)));return{level:level,xp:xp,totalXp:Math.max(0,Math.floor(Number(p&&p.totalXp)||0)),nextLevelXp:next,progressPercent:percent,xpLeft:Math.max(0,next-xp),rankName:String((p&&p.rankName)||rank(level))}}
  function fromTotalXp(total){var remaining=Math.max(0,Math.floor(Number(total)||0));var level=1;while(level<999){var next=need(level);if(remaining<next)break;remaining-=next;level++}return clean({level:level,xp:remaining,totalXp:Math.max(0,Math.floor(Number(total)||0)),nextLevelXp:need(level),rankName:rank(level)})}
  function withPendingXp(p){var base=clean(p);var pending=pendingXpTotal();return pending>0?fromTotalXp(base.totalXp+pending):base}
  function rankIndex(name){for(var i=0;i<ranks.length;i++){if(ranks[i].name===name)return i}return 0}
  function ensureRankModal(){
    if(document.getElementById('vexaRankModal'))return document.getElementById('vexaRankModal');
    var style=document.createElement('style');
    style.textContent='.vexa-rank-page{position:fixed;inset:0;z-index:9998;display:block;overflow:auto;padding:calc(54px + env(safe-area-inset-top)) 18px calc(96px + env(safe-area-inset-bottom));background:radial-gradient(circle at 50% -10%,rgba(255,255,255,.08),rgba(255,255,255,0) 34%),rgba(5,5,7,.86);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:0;pointer-events:none;transform:translateX(18px);transition:opacity .26s ease,transform .32s cubic-bezier(.2,.9,.2,1);scrollbar-width:none}.vexa-rank-page::-webkit-scrollbar{display:none}.vexa-rank-page.open{opacity:1;pointer-events:auto;transform:translateX(0)}.vexa-rank-page-top{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 22px}.vexa-rank-back{width:38px;height:38px;border:0;border-radius:999px;background:rgba(255,255,255,.08);color:#fff;font-size:22px;font-weight:900;box-shadow:inset 0 1px 0 rgba(255,255,255,.12)}.vexa-rank-page-kicker{margin:0;color:rgba(255,255,255,.48);font-size:9px;font-weight:950;text-transform:uppercase;letter-spacing:.18em}.vexa-rank-page-title{margin:7px 0 0;color:#fff;font-size:34px;line-height:.9;font-weight:1000;letter-spacing:-.075em}.vexa-rank-page-sub{margin:10px 0 0;max-width:320px;color:rgba(255,255,255,.54);font-size:11px;line-height:1.35;font-weight:650;letter-spacing:-.02em}.vexa-rank-level-strip{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;margin:0 0 22px;padding:0 0 18px;border-bottom:1px solid rgba(255,255,255,.09)}.vexa-rank-level-orb{width:56px;height:56px;border-radius:21px;display:grid;place-items:center;background:rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.13);color:#fff;font-size:24px}.vexa-rank-level-main strong{display:block;color:#fff;font-size:20px;font-weight:1000;line-height:1;letter-spacing:-.055em}.vexa-rank-level-main span{display:block;margin-top:6px;color:rgba(255,255,255,.5);font-size:10px;font-weight:800}.vexa-rank-level-pill{height:32px;padding:0 12px;border-radius:999px;display:grid;place-items:center;background:#fff;color:#050505;font-size:10px;font-weight:1000;white-space:nowrap}.vexa-rank-system{position:relative;display:grid;gap:0;margin-top:4px}.vexa-rank-system:before{content:"";position:absolute;left:17px;top:22px;bottom:22px;width:1px;background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,255,255,.05))}.vexa-rank-item{position:relative;display:grid;grid-template-columns:36px 1fr auto;gap:12px;align-items:start;padding:11px 0 13px;opacity:0;transform:translateY(10px);animation:vexaRankPageIn .38s ease forwards}.vexa-rank-dot{position:relative;z-index:1;width:36px;height:36px;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.075);box-shadow:inset 0 1px 0 rgba(255,255,255,.12);color:#fff;font-size:16px}.vexa-rank-item.current .vexa-rank-dot{background:#fff;color:#050505}.vexa-rank-info strong{display:block;color:#fff;font-size:15px;font-weight:1000;line-height:1;letter-spacing:-.045em}.vexa-rank-info p{margin:6px 0 0;color:rgba(255,255,255,.48);font-size:10px;line-height:1.28;font-weight:700;max-width:230px}.vexa-rank-range{color:rgba(255,255,255,.58);font-size:9px;font-weight:950;white-space:nowrap;margin-top:2px}.vexa-rank-now{display:inline-flex;margin-top:8px;height:22px;align-items:center;padding:0 8px;border-radius:999px;background:#fff;color:#050505;font-size:8px;font-weight:1000;letter-spacing:-.01em}.brand img.logo{cursor:pointer}@keyframes vexaRankPageIn{to{opacity:1;transform:translateY(0)}}@media(max-width:380px){.vexa-rank-page-title{font-size:30px}.vexa-rank-item{grid-template-columns:34px 1fr auto;gap:10px}.vexa-rank-dot{width:34px;height:34px;border-radius:13px}.vexa-rank-info p{max-width:190px;font-size:9px}.vexa-rank-range{font-size:8px}}';
    document.head.appendChild(style);
    var page=document.createElement('div');
    page.id='vexaRankModal';
    page.className='vexa-rank-page';
    page.setAttribute('aria-hidden','true');
    page.innerHTML='<div class="vexa-rank-page-top"><div><p class="vexa-rank-page-kicker">Vexa FLOW Status</p><h2 class="vexa-rank-page-title">Rank System</h2><p class="vexa-rank-page-sub">Your rank grows with your level. Higher ranks create stronger profile prestige across Vexa.</p></div><button class="vexa-rank-back" type="button" data-rank-close aria-label="Back">‹</button></div><div data-rank-current></div><div class="vexa-rank-system" data-rank-list></div>';
    document.body.appendChild(page);
    page.addEventListener('click',function(e){if(e.target.closest('[data-rank-close]'))closeRankModal()});
    document.addEventListener('keydown',function(e){if(e.key==='Escape')closeRankModal()});
    return page;
  }
  function rankIcon(name){return {Rookie:'✦',Explorer:'◆',Pro:'⬢',Elite:'✧',Master:'◇',Legend:'✺',Titan:'♛'}[name]||'✦'}
  function renderRankModal(){var p=clean(profile||{level:1,xp:0,totalXp:0});var page=ensureRankModal();var current=page.querySelector('[data-rank-current]');var list=page.querySelector('[data-rank-list]');var idx=rankIndex(p.rankName);current.innerHTML='<div class="vexa-rank-level-strip"><div class="vexa-rank-level-orb">'+rankIcon(p.rankName)+'</div><div class="vexa-rank-level-main"><strong>'+esc(p.rankName)+'</strong><span>Level '+p.level+' · '+p.progressPercent+'% progress · '+p.xpLeft+' XP left</span></div><div class="vexa-rank-level-pill">Current</div></div>';list.innerHTML=ranks.map(function(r,i){var cls=i===idx?'current':(i<idx?'done':'');return '<div class="vexa-rank-item '+cls+'" style="animation-delay:'+(i*38)+'ms"><div class="vexa-rank-dot">'+rankIcon(r.name)+'</div><div class="vexa-rank-info"><strong>'+esc(r.name)+'</strong><p>'+esc(r.text)+'</p>'+(i===idx?'<span class="vexa-rank-now">Current rank</span>':'')+'</div><div class="vexa-rank-range">'+esc(r.range)+'</div></div>'}).join('')}
  function openRankModal(){renderRankModal();var page=ensureRankModal();requestAnimationFrame(function(){page.classList.add('open');page.setAttribute('aria-hidden','false')})}
  function closeRankModal(){var page=document.getElementById('vexaRankModal');if(!page)return;page.classList.remove('open');page.setAttribute('aria-hidden','true')}
  function bindRankModalTrigger(img){if(!img||img.dataset.rankModalReady==='1')return;img.dataset.rankModalReady='1';img.setAttribute('role','button');img.setAttribute('tabindex','0');img.setAttribute('aria-label','Open rank system');img.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();openRankModal()});img.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();openRankModal()}})}
  function render(p,opts){opts=opts||{};var authoritative=!!opts.authoritative;p=authoritative?withPendingXp(p):clean(p);var pending=pendingXpTotal();if(renderedTotalXp>=0&&p.totalXp<renderedTotalXp&&(pending>0||!opts.force))return;renderedTotalXp=p.totalXp;profile=p;cacheProfile(p);var pill=document.getElementById('rankPill');if(pill)pill.textContent=p.rankName;setRankCharacter(p.rankName);var n=document.getElementById('userLine');if(!n)return;n.innerHTML='<span style="display:block;color:#fff;font-weight:800;font-size:12px;line-height:1">Level '+p.level+' <span style="color:rgba(255,255,255,.55);font-weight:700">• '+p.progressPercent+'%</span></span><span style="display:block;width:158px;height:6px;margin-top:6px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden"><span style="display:block;width:'+p.progressPercent+'%;height:100%;border-radius:999px;background:linear-gradient(90deg,#5b0f24,#8f1d3d,#c03a5b);box-shadow:0 0 14px rgba(192,58,91,.48);transition:width .35s ease"></span></span><span style="display:block;margin-top:5px;color:rgba(255,255,255,.5);font-size:9.5px;line-height:1">'+p.xpLeft+' XP left</span>'}
  function popup(level,rankName){var t=document.getElementById('toast');if(!t)return;t.textContent='Level Up '+level+' • '+rankName;t.style.display='block';setTimeout(function(){t.style.display='none'},2500)}
  function xpToast(amount){var t=document.getElementById('toast');if(!t)return;t.textContent='+'+amount+' XP';t.style.display='block';setTimeout(function(){t.style.display='none'},1800)}
  function preview(amount){amount=Math.max(0,Math.floor(Number(amount)||0));if(!amount)return;var p=clean(profile||{level:1,xp:0,totalXp:0});var old=p.level;p.xp+=amount;p.totalXp+=amount;while(p.xp>=p.nextLevelXp){p.xp-=p.nextLevelXp;p.level++;p.nextLevelXp=need(p.level)}p.progressPercent=Math.max(0,Math.min(100,Math.floor((p.xp/p.nextLevelXp)*100)));p.xpLeft=Math.max(0,p.nextLevelXp-p.xp);p.rankName=rank(p.level);render(p);if(p.level>old)popup(p.level,p.rankName)}
  function xpBatchBody(events){return JSON.stringify({initData:initData(),events:(Array.isArray(events)?events:[]).map(function(ev){return{amount:ev.amount,source:ev.source||'activity',metadata:ev.metadata||{section:section()},eventId:ev.eventId}})})}
  function flushPendingXp(){
    if(flushTimer){clearTimeout(flushTimer);flushTimer=0}
    var userId=id();if(!userId||flushingXp)return;
    var pending=loadPendingXp().slice();if(!pending.length)return;
    flushingXp=true;
    var sentIds={};pending.forEach(function(ev){sentIds[ev.eventId]=1});
    fetch('/app/api/level/xp',{method:'POST',cache:'no-store',headers:{'content-type':'application/json','cache-control':'no-store'},body:xpBatchBody(pending)})
      .then(function(r){if(!r.ok)throw new Error('xp sync failed');return r.json().catch(function(){return null})})
      .then(function(j){var remaining=loadPendingXp().filter(function(ev){return !sentIds[ev.eventId]});savePendingXp(remaining);if(j&&j.profile)render(j.profile,{authoritative:true,force:true});if(j&&j.leveledUp&&j.profile)popup(j.profile.level,j.profile.rankName)})
      .catch(function(){})
      .finally(function(){flushingXp=false;if(loadPendingXp().length)scheduleFlushPendingXp(false)});
  }
  function pendingIsOnlyPlinko(){var events=loadPendingXp();return events.length&&events.every(function(ev){return ev&&ev.metadata&&ev.metadata.section==='plinko'})}
  function scheduleFlushPendingXp(force){if(force){flushPendingXp();return}if(flushTimer||flushingXp||!loadPendingXp().length)return;flushTimer=setTimeout(function(){flushTimer=0;flushPendingXp()},pendingIsOnlyPlinko()?10000:FLUSH_DEBOUNCE_MS)}
  function add(amount,source,metadata){var userId=id();amount=Math.max(0,Math.floor(Number(amount)||0));if(!userId||!amount)return;var ev={eventId:xpEventId(),userId:userId,amount:amount,source:source||'activity',metadata:metadata||{section:section()}};var pending=loadPendingXp().slice();pending.push(ev);savePendingXp(pending);preview(amount);scheduleFlushPendingXp(false)}
  function awardDailyOpen(){var userId=id();if(!userId||dailyChecked)return;dailyChecked=true;try{var key=dailyStorageKey(),today=todayKey();if(localStorage.getItem(key)===today)return;localStorage.setItem(key,today);add(DAILY_XP_AMOUNT,'daily-open',{date:today});xpToast(DAILY_XP_AMOUNT)}catch(e){}}
  function load(opts){opts=opts||{};var userId=id();if(!userId)return Promise.resolve(false);loadPlayMs();loadCachedProfile();var now=Date.now();if(loadingProfile)return profileLoadJob||Promise.resolve(false);if(opts.force&&lastProfileLoadAt&&now-lastProfileLoadAt<FORCE_PROFILE_RELOAD_MS){scheduleFlushPendingXp(false);awardDailyOpen();return Promise.resolve(true)}if(!opts.force&&lastProfileLoadAt&&now-lastProfileLoadAt<PROFILE_STALE_MS){scheduleFlushPendingXp(false);awardDailyOpen();return Promise.resolve(true)}loadingProfile=true;lastProfileLoadAt=now;profileLoadJob=fetch('/app/api/level',{cache:'no-store',headers:{'cache-control':'no-store','accept':'application/json','x-telegram-init-data':initData()}}).then(function(r){if(!r.ok)throw new Error('level sync failed');return r.json()}).then(function(p){render(p,{authoritative:true,force:true});scheduleFlushPendingXp(false);awardDailyOpen();return true}).catch(function(){scheduleFlushPendingXp(false);awardDailyOpen();return false}).then(function(result){loadingProfile=false;profileLoadJob=null;return result});return profileLoadJob}
  function applyInitialUserState(state){if(!state||!state.level)return false;lastProfileLoadAt=Date.now();render(state.level,{authoritative:true,force:true});scheduleFlushPendingXp(false);awardDailyOpen();return true}
  function initialLoad(){loadPlayMs();loadPendingXp();loadCachedProfile();var shared=window.VexaInitialUserState;if(shared&&typeof shared.then==='function'){shared.then(function(state){if(!applyInitialUserState(state))load({force:true})}).catch(function(){load({force:true})});return}load({force:true})}
  function clearPlayTimer(){if(playTimer){clearTimeout(playTimer);playTimer=0}}
  function awardElapsedPlayTime(elapsed){playMs+=Math.max(0,Math.floor(Number(elapsed)||0));while(playMs>=PLAY_XP_INTERVAL_MS){playMs-=PLAY_XP_INTERVAL_MS;add(PLAY_XP_AMOUNT,'playtime',{section:'plinko',minutes:60});xpToast(PLAY_XP_AMOUNT)}savePlayMs()}
  function settlePlaySession(){if(!playSessionStartedAt)return;var now=Date.now();var elapsed=Math.max(0,now-playSessionStartedAt);playSessionStartedAt=now;awardElapsedPlayTime(elapsed)}
  function schedulePlayTimer(){clearPlayTimer();if(!playSessionStartedAt)return;var remaining=Math.max(1000,PLAY_XP_INTERVAL_MS-playMs);playTimer=setTimeout(function(){playTimer=0;settlePlaySession();schedulePlayTimer()},remaining+25)}
  function startPlaySession(){if(!id()||document.hidden||!isPlinkoSection(section())||playSessionStartedAt)return;playSessionStartedAt=Date.now();schedulePlayTimer()}
  function stopPlaySession(){if(playSessionStartedAt){settlePlaySession();playSessionStartedAt=0}clearPlayTimer();savePlayMs()}
  function syncPlayPresence(){if(!document.hidden&&isPlinkoSection(section()))startPlaySession();else stopPlaySession()}
  function noteSectionChange(){var current=section();if(current===observedSection)return;observedSection=current;syncPlayPresence()}
  window.VexaLevel={add:add,load:function(){load({force:true})},openRanks:openRankModal,flushPlayXp:function(){settlePlaySession();schedulePlayTimer();scheduleFlushPendingXp(true)}};
  document.addEventListener('visibilitychange',function(){if(document.hidden)stopPlaySession();else{exitDrained=false;startPlaySession()}});
  window.addEventListener('focus',function(){exitDrained=false;startPlaySession()});
  window.addEventListener('online',function(){scheduleFlushPendingXp(true)});
  window.addEventListener('vexa-initial-user-state',function(ev){applyInitialUserState(ev&&ev.detail)});
  window.addEventListener('vexa:view-changed',function(){noteSectionChange()});
  function drainOnExit(){if(exitDrained)return;exitDrained=true;stopPlaySession();try{var pending=loadPendingXp();if(pending.length&&navigator.sendBeacon)navigator.sendBeacon('/app/api/level/xp',new Blob([xpBatchBody(pending)],{type:'application/json'}))}catch(e){}}
  window.addEventListener('pagehide',drainOnExit);
  window.addEventListener('beforeunload',drainOnExit);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){observedSection=section();initialLoad();startPlaySession()});else{observedSection=section();initialLoad();startPlaySession()}
})();
`;
