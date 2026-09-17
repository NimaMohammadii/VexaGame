import { MANDATORY_CHANNEL_TEXT } from '../mandatory-channel';

const COPY_JSON = JSON.stringify(MANDATORY_CHANNEL_TEXT)
  .replace(/</g, '\\u003C')
  .replace(/>/g, '\\u003E')
  .replace(/&/g, '\\u0026');

export const MANDATORY_CHANNEL_GATE_STYLES = `
.vexa-mandatory-channel-backdrop{
  position:fixed!important;
  inset:0!important;
  z-index:2147483300!important;
  background:rgba(0,0,0,.34)!important;
  opacity:0!important;
  visibility:hidden!important;
  pointer-events:none!important;
  backdrop-filter:blur(3px)!important;
  -webkit-backdrop-filter:blur(3px)!important;
  transition:opacity .26s ease,visibility 0s linear .34s!important;
}
.vexa-mandatory-channel-panel{
  position:fixed!important;
  left:0!important;
  right:0!important;
  bottom:0!important;
  z-index:2147483301!important;
  width:100%!important;
  max-height:min(72dvh,560px)!important;
  box-sizing:border-box!important;
  padding:10px 16px calc(18px + env(safe-area-inset-bottom))!important;
  border-radius:34px 34px 0 0!important;
  background:rgba(14,10,12,.94)!important;
  color:#fff!important;
  box-shadow:0 -18px 54px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.11)!important;
  backdrop-filter:blur(18px) saturate(1.12)!important;
  -webkit-backdrop-filter:blur(18px) saturate(1.12)!important;
  transform:translate3d(0,105%,0)!important;
  opacity:.98!important;
  visibility:hidden!important;
  pointer-events:none!important;
  transition:transform .36s cubic-bezier(.2,.9,.26,1),visibility 0s linear .36s!important;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Rounded","SF Pro Text","Inter","Segoe UI",sans-serif!important;
  letter-spacing:-.018em!important;
}
body.vexa-mandatory-channel-locked .vexa-mandatory-channel-backdrop{
  opacity:1!important;
  visibility:visible!important;
  pointer-events:auto!important;
  transition:opacity .26s ease!important;
}
body.vexa-mandatory-channel-locked .vexa-mandatory-channel-panel{
  transform:translate3d(0,0,0)!important;
  visibility:visible!important;
  pointer-events:auto!important;
  transition:transform .36s cubic-bezier(.2,.9,.26,1)!important;
}
.vexa-mandatory-channel-grab{
  width:36px!important;
  height:4px!important;
  margin:0 auto 18px!important;
  border-radius:999px!important;
  background:rgba(255,255,255,.20)!important;
}
.vexa-mandatory-channel-hero{
  display:grid!important;
  justify-items:center!important;
  text-align:center!important;
  gap:9px!important;
}
.vexa-mandatory-channel-icon{
  width:54px!important;
  height:54px!important;
  border-radius:19px!important;
  display:grid!important;
  place-items:center!important;
  color:#f2c7d1!important;
  background:rgba(111,16,43,.42)!important;
  border:1px solid rgba(183,65,98,.20)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08)!important;
}
.vexa-mandatory-channel-icon svg{width:27px!important;height:27px!important;display:block!important}
.vexa-mandatory-channel-title{
  margin:2px 0 0!important;
  color:#fff!important;
  font-size:20px!important;
  line-height:1.08!important;
  font-weight:800!important;
  letter-spacing:-.04em!important;
}
.vexa-mandatory-channel-copy{
  max-width:330px!important;
  margin:0 auto!important;
  color:rgba(255,255,255,.52)!important;
  font-size:12px!important;
  line-height:1.45!important;
  font-weight:540!important;
  letter-spacing:-.012em!important;
}
.vexa-mandatory-channel-card{
  position:relative!important;
  overflow:hidden!important;
  min-height:54px!important;
  margin:16px 0 10px!important;
  padding:0 14px!important;
  border-radius:24px!important;
  display:grid!important;
  grid-template-columns:38px minmax(0,1fr)!important;
  gap:10px!important;
  align-items:center!important;
  background:radial-gradient(34px 34px at 0 0,rgba(186,53,87,.15) 0%,rgba(146,35,66,.06) 42%,rgba(104,18,44,0) 76%),radial-gradient(36px 36px at 100% 100%,rgba(172,46,79,.13) 0%,rgba(133,30,60,.055) 43%,rgba(94,16,39,0) 78%),rgba(0,0,0,.42)!important;
  border:1px solid rgba(255,255,255,.055)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.065)!important;
}
.vexa-mandatory-channel-card-icon{
  width:38px!important;
  height:38px!important;
  border-radius:50%!important;
  display:grid!important;
  place-items:center!important;
  background:rgba(255,255,255,.065)!important;
  color:rgba(255,255,255,.84)!important;
}
.vexa-mandatory-channel-card-icon svg{width:20px!important;height:20px!important}
.vexa-mandatory-channel-name{
  min-width:0!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
  color:#fff!important;
  font-size:13px!important;
  font-weight:760!important;
  letter-spacing:-.02em!important;
}
.vexa-mandatory-channel-actions{display:grid!important;gap:8px!important}
.vexa-mandatory-channel-button{
  width:100%!important;
  min-height:48px!important;
  border:0!important;
  border-radius:22px!important;
  padding:0 16px!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  gap:8px!important;
  color:#fff!important;
  font-family:inherit!important;
  font-size:13px!important;
  font-weight:760!important;
  letter-spacing:-.02em!important;
  -webkit-tap-highlight-color:transparent!important;
  transition:transform .18s ease,filter .18s ease,opacity .18s ease!important;
}
.vexa-mandatory-channel-button:active{transform:scale(.975)!important}
.vexa-mandatory-channel-button.primary{
  background:#6f102b!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.10)!important;
}
.vexa-mandatory-channel-button.secondary{
  background:rgba(255,255,255,.055)!important;
  border:1px solid rgba(255,255,255,.055)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.055)!important;
}
.vexa-mandatory-channel-button[disabled]{opacity:.58!important;pointer-events:none!important}
.vexa-mandatory-channel-status{
  min-height:16px!important;
  margin:8px 0 0!important;
  text-align:center!important;
  color:rgba(255,255,255,.44)!important;
  font-size:10.5px!important;
  font-weight:560!important;
  line-height:1.35!important;
}
.vexa-mandatory-channel-panel[dir="rtl"] .vexa-mandatory-channel-copy,
.vexa-mandatory-channel-panel[dir="rtl"] .vexa-mandatory-channel-title,
.vexa-mandatory-channel-panel[dir="rtl"] .vexa-mandatory-channel-status{text-align:center!important}
@media(prefers-reduced-motion:reduce){
  .vexa-mandatory-channel-backdrop,.vexa-mandatory-channel-panel,.vexa-mandatory-channel-button{transition-duration:.01ms!important}
}
`;

export const MANDATORY_CHANNEL_GATE_SCRIPT = `
(function(){
  var tg=window.Telegram&&window.Telegram.WebApp;
  var copy=${COPY_JSON};
  var checking=false,current=null,lastCheckAt=0,retryTimer=null,retryCount=0;
  function q(id){return document.getElementById(id)}
  function locale(){
    var raw=String(tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user&&tg.initDataUnsafe.user.language_code||'').trim().replace(/_/g,'-').toLowerCase();
    if(raw==='pt'||raw.indexOf('pt-')===0)return'pt-BR';
    if(raw==='tl'||raw.indexOf('tl-')===0||raw==='fil'||raw.indexOf('fil-')===0)return'fil';
    if(raw==='zh'||raw.indexOf('zh-')===0)return'zh-Hant';
    var base=raw.split('-')[0]||raw;
    if(copy[raw])return raw;
    if(copy[base])return base;
    var country=String(window.VexaDetectedCountryCode||'').trim().toUpperCase();
    var mapped=window.__vexaCountryLocales&&window.__vexaCountryLocales[country];
    return mapped&&copy[mapped]?mapped:'en';
  }
  function rtl(lang){return lang==='fa'||lang==='ar'||lang==='ur'}
  function ensure(){
    var panel=q('vexaMandatoryChannelPanel');
    if(panel)return panel;
    var backdrop=document.createElement('div');backdrop.id='vexaMandatoryChannelBackdrop';backdrop.className='vexa-mandatory-channel-backdrop';backdrop.setAttribute('aria-hidden','true');
    panel=document.createElement('section');panel.id='vexaMandatoryChannelPanel';panel.className='vexa-mandatory-channel-panel';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');
    panel.innerHTML='<div class="vexa-mandatory-channel-grab" aria-hidden="true"></div><div class="vexa-mandatory-channel-hero"><div class="vexa-mandatory-channel-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M4.5 11.5 19.2 5.3c.8-.3 1.5.4 1.2 1.2l-4.2 12.4c-.3.8-1.3 1-1.8.3l-3.3-4.1-2.4 2.1c-.5.4-1.2.1-1.2-.5l.2-4.2-3.4-1c-.9-.3-.9-1.6.2-2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m7.8 12.4 8.1-4.2-4.8 6.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></div><h2 class="vexa-mandatory-channel-title" id="vexaMandatoryChannelTitle"></h2><p class="vexa-mandatory-channel-copy" id="vexaMandatoryChannelCopy"></p></div><div class="vexa-mandatory-channel-card"><div class="vexa-mandatory-channel-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5 7.5h14v9H5z" stroke="currentColor" stroke-width="1.6"/><path d="M8 5h8M8 19h8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></div><strong class="vexa-mandatory-channel-name" id="vexaMandatoryChannelName"></strong></div><div class="vexa-mandatory-channel-actions"><button class="vexa-mandatory-channel-button primary" id="vexaMandatoryChannelJoin" type="button"></button><button class="vexa-mandatory-channel-button secondary" id="vexaMandatoryChannelCheck" type="button"></button></div><p class="vexa-mandatory-channel-status" id="vexaMandatoryChannelStatus" aria-live="polite"></p>';
    document.body.appendChild(backdrop);document.body.appendChild(panel);
    q('vexaMandatoryChannelJoin').addEventListener('click',openChannel);
    q('vexaMandatoryChannelCheck').addEventListener('click',function(){check(true)});
    return panel;
  }
  function render(data){
    current=data;
    var lang=locale(),c=copy[lang]||copy.en,panel=ensure(),name=String(data&&data.channel&&data.channel.title||'Vexa');
    panel.setAttribute('lang',lang);panel.setAttribute('dir',rtl(lang)?'rtl':'ltr');
    q('vexaMandatoryChannelTitle').textContent=c.title;
    q('vexaMandatoryChannelCopy').textContent=String(c.body||'').replace('{channel}',name);
    q('vexaMandatoryChannelName').textContent=name;
    q('vexaMandatoryChannelJoin').textContent=c.join;
    q('vexaMandatoryChannelCheck').textContent=c.check;
    q('vexaMandatoryChannelStatus').textContent=data&&data.verificationError?c.notJoined:'';
    document.body.classList.add('vexa-mandatory-channel-locked');
  }
  function unlock(){
    document.body.classList.remove('vexa-mandatory-channel-locked');current=null;
    var status=q('vexaMandatoryChannelStatus');if(status)status.textContent='';
  }
  function openChannel(){
    var url=String(current&&current.channel&&current.channel.joinUrl||'');if(!url)return;
    try{if(tg&&typeof tg.openTelegramLink==='function'&&url.indexOf('https://t.me/')===0){tg.openTelegramLink(url);return}}catch(e){}
    try{window.open(url,'_blank','noopener,noreferrer')}catch(e){location.href=url}
  }
  function setChecking(active){
    var button=q('vexaMandatoryChannelCheck');if(!button)return;
    var c=copy[locale()]||copy.en;button.disabled=!!active;button.textContent=active?c.checking:c.check;
  }
  function scheduleRetry(){
    if(retryTimer)return;
    retryCount=Math.min(retryCount+1,6);
    var delay=Math.min(3200,300*Math.pow(1.65,retryCount-1));
    retryTimer=setTimeout(function(){retryTimer=null;check(false)},delay);
  }
  function clearRetry(){retryCount=0;if(retryTimer){clearTimeout(retryTimer);retryTimer=null}}
  function check(interactive){
    var initData=String(tg&&tg.initData||'').trim();
    if(!initData)scheduleRetry();
    if(checking)return Promise.resolve(false);
    checking=true;lastCheckAt=Date.now();setChecking(true);
    return fetch('/app/api/mandatory-channel/status',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({initData:initData}),cache:'no-store'})
      .then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error(j&&j.error||'Membership check failed');return j})})
      .then(function(data){
        if(data&&data.verificationError===true)scheduleRetry();else clearRetry();
        if(!data||data.required!==true||data.joined===true){unlock();return true}
        render(data);if(interactive){var c=copy[locale()]||copy.en;q('vexaMandatoryChannelStatus').textContent=c.notJoined}return false;
      })
      .catch(function(){
        scheduleRetry();
        if(current){render(current);var c=copy[locale()]||copy.en;q('vexaMandatoryChannelStatus').textContent=c.notJoined}
        return false;
      })
      .finally(function(){checking=false;setChecking(false)});
  }
  function recheck(){if(!document.body.classList.contains('vexa-mandatory-channel-locked'))return;if(Date.now()-lastCheckAt<900)return;setTimeout(function(){check(false)},320)}
  function start(){ensure();check(false)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  document.addEventListener('visibilitychange',function(){if(!document.hidden)recheck()});
  window.addEventListener('focus',recheck);
  window.VexaMandatoryChannelGate={check:function(){return check(true)}};
})();
`;
