export const MINIAPP_SCRIPT = `
(function(){
  var tg=window.Telegram&&window.Telegram.WebApp;
  function expandMiniApp(){
    if(!tg)return;
    try{tg.ready&&tg.ready()}catch(e){}
    try{tg.expand&&tg.expand()}catch(e){}
    try{tg.requestFullscreen&&tg.requestFullscreen()}catch(e){}
    try{tg.disableVerticalSwipes&&tg.disableVerticalSwipes()}catch(e){}
  }
  expandMiniApp();
  setTimeout(expandMiniApp,120);
  setTimeout(expandMiniApp,500);
  setTimeout(expandMiniApp,1200);

  function openTelegramLink(url){try{if(tg&&tg.openTelegramLink){tg.openTelegramLink(url);return}}catch(e){}window.location.href=url}
  var timeZoneCountries={"Europe/Andorra":"AD","Asia/Dubai":"AE","Asia/Kabul":"AF","Europe/Tirane":"AL","Asia/Yerevan":"AM","Antarctica/Casey":"AQ","Antarctica/Davis":"AQ","Antarctica/Mawson":"AQ","Antarctica/Palmer":"AQ","Antarctica/Rothera":"AQ","Antarctica/Troll":"AQ","Antarctica/Vostok":"AQ","America/Argentina/Buenos_Aires":"AR","America/Argentina/Cordoba":"AR","America/Argentina/Salta":"AR","America/Argentina/Jujuy":"AR","America/Argentina/Tucuman":"AR","America/Argentina/Catamarca":"AR","America/Argentina/La_Rioja":"AR","America/Argentina/San_Juan":"AR","America/Argentina/Mendoza":"AR","America/Argentina/San_Luis":"AR","America/Argentina/Rio_Gallegos":"AR","America/Argentina/Ushuaia":"AR","Pacific/Pago_Pago":"AS","Europe/Vienna":"AT","Australia/Lord_Howe":"AU","Antarctica/Macquarie":"AU","Australia/Hobart":"AU","Australia/Melbourne":"AU","Australia/Sydney":"AU","Australia/Broken_Hill":"AU","Australia/Brisbane":"AU","Australia/Lindeman":"AU","Australia/Adelaide":"AU","Australia/Darwin":"AU","Australia/Perth":"AU","Australia/Eucla":"AU","Asia/Baku":"AZ","America/Barbados":"BB","Asia/Dhaka":"BD","Europe/Brussels":"BE","Europe/Sofia":"BG","Atlantic/Bermuda":"BM","America/La_Paz":"BO","America/Noronha":"BR","America/Belem":"BR","America/Fortaleza":"BR","America/Recife":"BR","America/Araguaina":"BR","America/Maceio":"BR","America/Bahia":"BR","America/Sao_Paulo":"BR","America/Campo_Grande":"BR","America/Cuiaba":"BR","America/Santarem":"BR","America/Porto_Velho":"BR","America/Boa_Vista":"BR","America/Manaus":"BR","America/Eirunepe":"BR","America/Rio_Branco":"BR","Asia/Thimphu":"BT","Europe/Minsk":"BY","America/Belize":"BZ","America/St_Johns":"CA","America/Halifax":"CA","America/Glace_Bay":"CA","America/Moncton":"CA","America/Goose_Bay":"CA","America/Toronto":"CA","America/Iqaluit":"CA","America/Winnipeg":"CA","America/Resolute":"CA","America/Rankin_Inlet":"CA","America/Regina":"CA","America/Swift_Current":"CA","America/Edmonton":"CA","America/Cambridge_Bay":"CA","America/Inuvik":"CA","America/Vancouver":"CA","America/Dawson_Creek":"CA","America/Fort_Nelson":"CA","America/Whitehorse":"CA","America/Dawson":"CA","Europe/Zurich":"CH","Africa/Abidjan":"CI","Pacific/Rarotonga":"CK","America/Santiago":"CL","America/Coyhaique":"CL","America/Punta_Arenas":"CL","Pacific/Easter":"CL","Asia/Shanghai":"CN","Asia/Urumqi":"CN","America/Bogota":"CO","America/Costa_Rica":"CR","America/Havana":"CU","Atlantic/Cape_Verde":"CV","Asia/Nicosia":"CY","Asia/Famagusta":"CY","Europe/Prague":"CZ","Europe/Berlin":"DE","America/Santo_Domingo":"DO","Africa/Algiers":"DZ","America/Guayaquil":"EC","Pacific/Galapagos":"EC","Europe/Tallinn":"EE","Africa/Cairo":"EG","Africa/El_Aaiun":"EH","Europe/Madrid":"ES","Africa/Ceuta":"ES","Atlantic/Canary":"ES","Europe/Helsinki":"FI","Pacific/Fiji":"FJ","Atlantic/Stanley":"FK","Pacific/Kosrae":"FM","Atlantic/Faroe":"FO","Europe/Paris":"FR","Europe/London":"GB","Asia/Tbilisi":"GE","America/Cayenne":"GF","Europe/Gibraltar":"GI","America/Nuuk":"GL","America/Danmarkshavn":"GL","America/Scoresbysund":"GL","America/Thule":"GL","Europe/Athens":"GR","Atlantic/South_Georgia":"GS","America/Guatemala":"GT","Pacific/Guam":"GU","Africa/Bissau":"GW","America/Guyana":"GY","Asia/Hong_Kong":"HK","America/Tegucigalpa":"HN","America/Port-au-Prince":"HT","Europe/Budapest":"HU","Asia/Jakarta":"ID","Asia/Pontianak":"ID","Asia/Makassar":"ID","Asia/Jayapura":"ID","Europe/Dublin":"IE","Asia/Jerusalem":"IL","Asia/Kolkata":"IN","Indian/Chagos":"IO","Asia/Baghdad":"IQ","Asia/Tehran":"IR","Europe/Rome":"IT","America/Jamaica":"JM","Asia/Amman":"JO","Asia/Tokyo":"JP","Africa/Nairobi":"KE","Asia/Bishkek":"KG","Pacific/Tarawa":"KI","Pacific/Kanton":"KI","Pacific/Kiritimati":"KI","Asia/Pyongyang":"KP","Asia/Seoul":"KR","Asia/Almaty":"KZ","Asia/Qyzylorda":"KZ","Asia/Qostanay":"KZ","Asia/Aqtobe":"KZ","Asia/Aqtau":"KZ","Asia/Atyrau":"KZ","Asia/Oral":"KZ","Asia/Beirut":"LB","Asia/Colombo":"LK","Africa/Monrovia":"LR","Europe/Vilnius":"LT","Europe/Riga":"LV","Africa/Tripoli":"LY","Africa/Casablanca":"MA","Europe/Chisinau":"MD","Pacific/Kwajalein":"MH","Asia/Yangon":"MM","Asia/Ulaanbaatar":"MN","Asia/Hovd":"MN","Asia/Macau":"MO","America/Martinique":"MQ","Europe/Malta":"MT","Indian/Mauritius":"MU","Indian/Maldives":"MV","America/Mexico_City":"MX","America/Cancun":"MX","America/Merida":"MX","America/Monterrey":"MX","America/Matamoros":"MX","America/Chihuahua":"MX","America/Ciudad_Juarez":"MX","America/Ojinaga":"MX","America/Mazatlan":"MX","America/Bahia_Banderas":"MX","America/Hermosillo":"MX","America/Tijuana":"MX","Asia/Kuching":"MY","Africa/Maputo":"MZ","Africa/Windhoek":"NA","Pacific/Noumea":"NC","Pacific/Norfolk":"NF","Africa/Lagos":"NG","America/Managua":"NI","Asia/Kathmandu":"NP","Pacific/Nauru":"NR","Pacific/Niue":"NU","Pacific/Auckland":"NZ","Pacific/Chatham":"NZ","America/Panama":"PA","America/Lima":"PE","Pacific/Tahiti":"PF","Pacific/Marquesas":"PF","Pacific/Gambier":"PF","Pacific/Port_Moresby":"PG","Pacific/Bougainville":"PG","Asia/Manila":"PH","Asia/Karachi":"PK","Europe/Warsaw":"PL","America/Miquelon":"PM","Pacific/Pitcairn":"PN","America/Puerto_Rico":"PR","Asia/Gaza":"PS","Asia/Hebron":"PS","Europe/Lisbon":"PT","Atlantic/Madeira":"PT","Atlantic/Azores":"PT","Pacific/Palau":"PW","America/Asuncion":"PY","Asia/Qatar":"QA","Europe/Bucharest":"RO","Europe/Belgrade":"RS","Europe/Kaliningrad":"RU","Europe/Moscow":"RU","Europe/Simferopol":"RU","Europe/Kirov":"RU","Europe/Volgograd":"RU","Europe/Astrakhan":"RU","Europe/Saratov":"RU","Europe/Ulyanovsk":"RU","Europe/Samara":"RU","Asia/Yekaterinburg":"RU","Asia/Omsk":"RU","Asia/Novosibirsk":"RU","Asia/Barnaul":"RU","Asia/Tomsk":"RU","Asia/Novokuznetsk":"RU","Asia/Krasnoyarsk":"RU","Asia/Irkutsk":"RU","Asia/Chita":"RU","Asia/Yakutsk":"RU","Asia/Khandyga":"RU","Asia/Vladivostok":"RU","Asia/Ust-Nera":"RU","Asia/Magadan":"RU","Asia/Sakhalin":"RU","Asia/Srednekolymsk":"RU","Asia/Kamchatka":"RU","Asia/Anadyr":"RU","Asia/Riyadh":"SA","Pacific/Guadalcanal":"SB","Africa/Khartoum":"SD","Asia/Singapore":"SG","America/Paramaribo":"SR","Africa/Juba":"SS","Africa/Sao_Tome":"ST","America/El_Salvador":"SV","Asia/Damascus":"SY","America/Grand_Turk":"TC","Africa/Ndjamena":"TD","Asia/Bangkok":"TH","Asia/Dushanbe":"TJ","Pacific/Fakaofo":"TK","Asia/Dili":"TL","Asia/Ashgabat":"TM","Africa/Tunis":"TN","Pacific/Tongatapu":"TO","Europe/Istanbul":"TR","Asia/Taipei":"TW","Europe/Kyiv":"UA","America/New_York":"US","America/Detroit":"US","America/Kentucky/Louisville":"US","America/Kentucky/Monticello":"US","America/Indiana/Indianapolis":"US","America/Indiana/Vincennes":"US","America/Indiana/Winamac":"US","America/Indiana/Marengo":"US","America/Indiana/Petersburg":"US","America/Indiana/Vevay":"US","America/Chicago":"US","America/Indiana/Tell_City":"US","America/Indiana/Knox":"US","America/Menominee":"US","America/North_Dakota/Center":"US","America/North_Dakota/New_Salem":"US","America/North_Dakota/Beulah":"US","America/Denver":"US","America/Boise":"US","America/Phoenix":"US","America/Los_Angeles":"US","America/Anchorage":"US","America/Juneau":"US","America/Sitka":"US","America/Metlakatla":"US","America/Yakutat":"US","America/Nome":"US","America/Adak":"US","Pacific/Honolulu":"US","America/Montevideo":"UY","Asia/Samarkand":"UZ","Asia/Tashkent":"UZ","America/Caracas":"VE","Asia/Ho_Chi_Minh":"VN","Pacific/Efate":"VU","Pacific/Apia":"WS","Africa/Johannesburg":"ZA"};
  var detectedCountryPromise=null;
  function currentTimeZone(){
    var zone='';try{zone=Intl.DateTimeFormat().resolvedOptions().timeZone||''}catch(e){}
    var aliases={'Asia/Calcutta':'Asia/Kolkata','Asia/Katmandu':'Asia/Kathmandu','Asia/Rangoon':'Asia/Yangon','Europe/Kiev':'Europe/Kyiv','America/Godthab':'America/Nuuk','Pacific/Truk':'Pacific/Port_Moresby','US/Eastern':'America/New_York','US/Central':'America/Chicago','US/Mountain':'America/Denver','US/Pacific':'America/Los_Angeles'};
    return aliases[zone]||zone;
  }
  function countryName(code){
    if(!code)return 'Other';
    if(code==='GLOBAL')return 'Global';
    try{if(Intl.DisplayNames)return new Intl.DisplayNames(['en'],{type:'region'}).of(code)||code}catch(e){}
    return code;
  }
  function timeZoneCountryCode(zone){
    var code=timeZoneCountries[zone]||'';
    if(code)return code;
    return zone==='UTC'||zone==='Etc/UTC'||zone==='GMT'?'GLOBAL':'';
  }
  function detectedCountryCode(){
    if(detectedCountryPromise)return detectedCountryPromise;
    var zone=currentTimeZone();
    var fallback=timeZoneCountryCode(zone);
    if(!fallback)return Promise.resolve('');
    detectedCountryPromise=fetch('/app/api/location-country?timeZone='+encodeURIComponent(zone),{cache:'no-store'})
      .then(function(r){return r.ok?r.json():null})
      .then(function(result){return result&&result.country||fallback})
      .catch(function(){return fallback})
      .then(function(code){
        code=String(code||'').trim().toUpperCase();
        try{window.VexaDetectedCountryCode=code;window.dispatchEvent(new CustomEvent('vexa-country-detected',{detail:{countryCode:code}}))}catch(e){}
        return code;
      });
    return detectedCountryPromise;
  }
  function showInviteAlert(message){
    try{if(tg&&typeof tg.showAlert==='function'){tg.showAlert(message);return}}catch(e){}
    toast(message);
  }
  function shareInvite(countryCode){
    if(!tg||typeof tg.shareMessage!=='function'){showInviteAlert('Please update Telegram to share this invite.');return}
    fetch('/app/api/share-invite',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({initData:String(tg.initData||''),countryCode:countryCode||''})
    }).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j&&j.error||'Could not prepare invite');return j})})
      .then(function(result){if(!result||!result.id)throw new Error('Could not prepare invite');tg.shareMessage(result.id)})
      .catch(function(error){showInviteAlert(error&&error.message||'Could not share the invite.');});
  }
  function openMiniAppSettings(){
    if(!tg||!tg.showPopup)return;
    detectedCountryCode().then(function(countryCode){
      var country=countryName(countryCode);
      tg.showPopup({
        title:'Vexa',
        message:'Choose an action',
        buttons:[
          {id:'country',type:'default',text:'Country · '+country},
          {id:'open-chat',type:'default',text:'Open Chat'},
          {id:'invite-friends',type:'default',text:'Invite Friends'}
        ]
      },function(id){
        if(id==='open-chat'){openTelegramLink('https://t.me/VexaAppBOT');return}
        if(id==='invite-friends')shareInvite(countryCode);
      });
    });
  }
  function initTelegramSettings(){
    if(!tg||!tg.SettingsButton)return;
    try{tg.SettingsButton.offClick(openMiniAppSettings)}catch(e){}
    try{tg.SettingsButton.onClick(openMiniAppSettings)}catch(e){}
    try{tg.SettingsButton.show()}catch(e){}
  }
  initTelegramSettings();
  detectedCountryCode();

  var telegramUserId=String((tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user&&tg.initDataUnsafe.user.id)||'');
  function storageGet(key){try{return window.localStorage?localStorage.getItem(key):''}catch(e){return ''}}
  function storageSet(key,value){try{if(window.localStorage)localStorage.setItem(key,value)}catch(e){}}
  var ownerId=telegramUserId||storageGet('ownerId')||'';
  var sectionTitles={home:'Lucky Zone',predictzone:'Predict',results:'Bot Control',playzone:'Play Hub',mines:'Mines',plinko:'Plinko',crash:'Crash',wheel:'Wheel',dice:'Dice',tower:'Dragon Tower',slot:'Slot',coinflip:'Pump',ghostrun:'Ghost Run'};

  function q(id){return document.getElementById(id)}
  function setText(id,v){var n=q(id);if(n)n.textContent=v}
  function toast(v){var n=q('toast');if(!n)return;n.textContent=v;n.style.display='block';setTimeout(function(){n.style.display='none'},3000)}
  function setKeyboardOpen(open){document.body.classList.toggle('keyboard-open',!!open)}
  function dismissKeyboard(){var active=document.activeElement;if(active&&typeof active.blur==='function')active.blur();setKeyboardOpen(false)}
  function handleBackButton(){show('home')}
  function syncTelegramBackButton(id){
    if(!tg||!tg.BackButton)return;
    try{tg.BackButton.offClick(handleBackButton)}catch(e){}
    try{tg.BackButton.hide()}catch(e){}
  }
  function ensureSection(id){return !id||q(id)||(window.VexaLazySections&&window.VexaLazySections.ensure&&window.VexaLazySections.ensure(id))}
  var primaryTabs={home:true,playzone:true,predictzone:true};
  var sectionTransitionTimer=0;
  function animatePrimarySection(node){
    if(sectionTransitionTimer){clearTimeout(sectionTransitionTimer);sectionTransitionTimer=0}
    node.classList.remove('view-transition-in');
    requestAnimationFrame(function(){
      node.classList.add('view-transition-in');
      sectionTransitionTimer=setTimeout(function(){node.classList.remove('view-transition-in');sectionTransitionTimer=0},820);
    });
  }

  function show(id){
    if(!ensureSection(id))return false;
    var v=q(id),current=document.querySelector('.view.active');
    if(!v)return false;
    if(current!==v){
      var animate=!!(current&&primaryTabs[current.id]&&primaryTabs[v.id]&&!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches));
      document.querySelectorAll('.view').forEach(function(n){n.classList.remove('active','view-transition-in')});
      v.classList.add('active');
      if(animate)animatePrimarySection(v);
    }
    document.querySelectorAll('.tab').forEach(function(n){n.classList.toggle('active',n.getAttribute('data-view')===id)});
    setText('brandTitle',sectionTitles[id]||'Vexa');
    syncTelegramBackButton(id);
    try{window.dispatchEvent(new CustomEvent('vexa:view-changed',{detail:{id:id}}))}catch(e){}
    if(window.VexaSectionLocks&&window.VexaSectionLocks.reload)setTimeout(function(){window.VexaSectionLocks.reload()},30);
    if(window.VexaApplySectionBackgrounds)setTimeout(function(){window.VexaApplySectionBackgrounds()},30);
    return true;
  }

  function openInitialTarget(){
    try{
      var params=new URLSearchParams(location.search);
      var startParam=String(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.start_param||'');
      var section=(params.get('section')||location.hash.replace(/^#/, '')||startParam||'').replace(/[^0-9A-Za-z_-]/g,'').slice(0,40);
      if(!section)return;
      var open=function(){if(ensureSection(section))show(section)};
      var lazy=window.VexaLazySections;
      if(lazy&&typeof lazy.isGame==='function'&&lazy.isGame(section)&&window.__vexaPlayZoneVisibilityReady){Promise.resolve(window.__vexaPlayZoneVisibilityReady).then(open);return}
      open();
    }catch(e){}
  }

  function initPlayZoneGameNavigation(){
    document.addEventListener('click',function(ev){
      var target=ev.target;
      var nav=target&&target.closest?target.closest('#playzone [data-game-view]'):null;
      if(!nav)return;
      var button=nav.matches&&nav.matches('button[data-game-view]')?nav:(nav.querySelector&&nav.querySelector('button[data-game-view]'));
      var id=(nav.getAttribute('data-game-view')||(button&&button.getAttribute('data-game-view'))||'').replace(/[^0-9A-Za-z_-]/g,'').slice(0,40);
      if(!id)return;
      ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
      if(ensureSection(id)){
        var animated=button||nav;
        animated.classList.add('is-soft-entering');
        document.body.classList.add('soft-game-entering');
        setTimeout(function(){show(id);animated.classList.remove('is-soft-entering');document.body.classList.remove('soft-game-entering')},180);
        return;
      }
      toast('Coming soon');
    },true);
  }

  async function api(path,opt){
    opt=opt||{};
    var r=await fetch(path,Object.assign({},opt,{headers:Object.assign({'content-type':'application/json'},opt.headers||{})}));
    var j=await r.json().catch(function(){return{error:'Invalid response'}});
    if(!r.ok)throw new Error(j.error||'Request failed');
    return j;
  }

  function rankFallback(level){level=Math.max(1,Math.floor(Number(level)||1));if(level>=60)return 'Titan';if(level>=40)return 'Legend';if(level>=25)return 'Master';if(level>=15)return 'Elite';if(level>=8)return 'Pro';if(level>=4)return 'Explorer';return 'Rookie'}
  function renderLevel(profile){var n=q('userLine');var level=Math.max(1,Math.floor(Number(profile&&profile.level)||1));var progress=Math.max(0,Math.min(100,Math.floor(Number(profile&&profile.progressPercent)||0)));var left=Math.max(0,Math.floor(Number(profile&&profile.xpLeft)||0));var next=Math.floor(Number(profile&&profile.nextLevelXp)||0);var xp=Math.max(0,Math.floor(Number(profile&&profile.xp)||0));if(next>0){progress=Math.max(0,Math.min(100,Math.floor((Math.min(xp,next)/next)*100)));if(!left)left=Math.max(0,next-Math.min(xp,next))}var rank=String((profile&&profile.rankName)||rankFallback(level));var pill=q('rankPill');if(pill)pill.textContent=rank;if(!n)return;n.innerHTML='<span style="display:block;color:#fff;font-weight:800;font-size:12px;line-height:1">Level '+level+' <span style="color:rgba(255,255,255,.55);font-weight:700">• '+progress+'%</span></span><span style="display:block;width:158px;height:6px;margin-top:6px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden"><span style="display:block;width:'+progress+'%;height:100%;border-radius:999px;background:linear-gradient(90deg,#5b0f24,#8f1d3d,#c03a5b);box-shadow:0 0 14px rgba(192,58,91,.48)"></span></span><span style="display:block;margin-top:5px;color:rgba(255,255,255,.5);font-size:9.5px;line-height:1">'+left+' XP left</span>'}
  async function loadLevel(){if(window.VexaLevel&&typeof window.VexaLevel.load==='function'){window.VexaLevel.load();return}if(!ownerId)return;try{var profile=await api('/app/api/level?userId='+encodeURIComponent(ownerId),{cache:'no-store',headers:{'accept':'application/json','cache-control':'no-store'}});if(window.VexaLevel)return;renderLevel(profile)}catch(e){}}
  function userLine(){loadLevel()}


  function saveUser(){ownerId=telegramUserId||(q('ownerId')&&q('ownerId').value.trim())||ownerId;storageSet('ownerId',ownerId);userLine()}

  document.body.addEventListener('click',function(ev){
    var target=ev.target;
    var b=target&&target.closest?target.closest('button'):null;
    if(!b){var w=q('voiceWrap');if(w)w.classList.remove('open');return}
    if(b.hasAttribute('data-game-view'))return;
    var v=b.getAttribute('data-view');if(v){ev.preventDefault();if(show(v))return;toast('Coming soon');return}
    var a=b.getAttribute('data-action');
    if(a==='dismiss-keyboard'){dismissKeyboard();return}
    if(a==='save-user')saveUser();
  });

  if(ownerId)storageSet('ownerId',ownerId);
  if(q('ownerId'))q('ownerId').value=ownerId;
  initPlayZoneGameNavigation();
  setText('brandTitle',sectionTitles.home);
  syncTelegramBackButton('home');
  setTimeout(openInitialTarget,250);
  setTimeout(openInitialTarget,900);
})();
`;
