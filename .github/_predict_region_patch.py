from pathlib import Path
import re

p = Path("src/miniapp/predict-zone.ts")
t = p.read_text(encoding="utf-8")

region_css = r'''.predict-region-backdrop{position:fixed!important;inset:0!important;z-index:99994!important;background:rgba(0,0,0,.24)!important;opacity:0!important;visibility:hidden!important;backdrop-filter:blur(2px)!important;-webkit-backdrop-filter:blur(2px)!important;transition:opacity .24s ease,visibility 0s linear .24s!important}.predict-region-backdrop.is-open{opacity:1!important;visibility:visible!important;transition:opacity .24s ease!important}
.predict-region-panel{position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:99995!important;max-height:min(72dvh,620px)!important;padding:10px 16px calc(18px + env(safe-area-inset-bottom))!important;border-radius:34px 34px 0 0!important;background:rgba(13,13,13,.92)!important;color:#fff!important;box-shadow:0 -18px 54px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.12)!important;backdrop-filter:blur(18px) saturate(1.12)!important;-webkit-backdrop-filter:blur(18px) saturate(1.12)!important;transform:translate3d(0,105%,0)!important;transition:transform .34s cubic-bezier(.2,.9,.26,1)!important;display:grid!important;grid-template-rows:auto auto auto auto!important;gap:12px!important;overflow:hidden!important;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Rounded","Inter","Segoe UI",sans-serif!important;letter-spacing:-.018em!important}.predict-region-panel.is-open{transform:translate3d(0,0,0)!important}.predict-region-grab{width:36px!important;height:4px!important;margin:0 auto 2px!important;border-radius:999px!important;background:rgba(255,255,255,.20)!important}
.predict-region-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important}.predict-region-title{display:flex!important;align-items:center!important;gap:9px!important;min-width:0!important}.predict-region-title svg{width:22px!important;height:22px!important;color:rgba(255,255,255,.74)!important;flex:0 0 auto!important;stroke:currentColor!important}.predict-region-head strong{font-family:inherit!important;font-size:18px!important;font-weight:800!important;letter-spacing:-.035em!important;line-height:1!important}.predict-region-close{width:34px!important;height:34px!important;min-width:34px!important;border-radius:999px!important;border:0!important;background:rgba(255,255,255,.045)!important;color:#fff!important;display:grid!important;place-items:center!important;padding:0!important;box-sizing:border-box!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.085),inset 0 -1px 0 rgba(255,255,255,.055),0 16px 34px rgba(0,0,0,.28)!important;backdrop-filter:blur(10px) saturate(1.12)!important;-webkit-backdrop-filter:blur(10px) saturate(1.12)!important;font-family:inherit!important;-webkit-tap-highlight-color:transparent!important;transition:transform .18s ease,background .18s ease!important}.predict-region-close:active{transform:scale(.92)!important}.predict-region-close svg{width:18px!important;height:18px!important;display:block!important;stroke:currentColor!important}
.predict-region-copy{position:relative!important;overflow:hidden!important;display:grid!important;gap:5px!important;padding:13px 14px!important;border:0!important;outline:0!important;border-radius:28px!important;background:rgba(0,0,0,.22)!important;box-sizing:border-box!important;box-shadow:inset 3px 3px .5px -3.5px rgba(255,255,255,.10),inset -3px -3px .5px -3.5px rgba(255,255,255,.12),inset 1px 1px 1px -.5px rgba(255,255,255,.08),inset -1px -1px 1px -.5px rgba(255,255,255,.06),inset 0 0 6px 6px rgba(255,255,255,.04),inset 0 0 2px 2px rgba(255,255,255,.025)!important;backdrop-filter:blur(22px) saturate(1.12) brightness(1.03)!important;-webkit-backdrop-filter:blur(22px) saturate(1.12) brightness(1.03)!important}.predict-region-copy strong{display:block!important;color:#fff!important;font-size:13px!important;font-weight:800!important;line-height:1.35!important;letter-spacing:-.018em!important}.predict-region-copy span{display:block!important;color:rgba(255,255,255,.48)!important;font-size:10.5px!important;font-weight:650!important;line-height:1.42!important}
.predict-region-support{position:relative!important;overflow:hidden!important;width:100%!important;height:40px!important;padding:0 14px!important;border:0!important;outline:0!important;border-radius:28px!important;background:rgba(255,255,255,.055)!important;color:#fff!important;font-family:inherit!important;font-size:12px!important;font-weight:800!important;letter-spacing:-.018em!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.10),inset 0 -1px 0 rgba(255,255,255,.055)!important;backdrop-filter:blur(12px) saturate(1.08)!important;-webkit-backdrop-filter:blur(12px) saturate(1.08)!important;transform:translateZ(0)!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;transition:transform .18s ease,background .18s ease!important}.predict-region-support:active{transform:scale(.97)!important;background:rgba(255,255,255,.075)!important}'''

t, n = re.subn(r'^\.predict-zone-bet-status\.has-support\{.*$', region_css, t, count=1, flags=re.M)
if n != 1:
    raise SystemExit(f"support CSS anchor mismatch: {n}")

old_refs = "    var historyButton=null,historyBackdrop=null,historyDrawer=null,historyClose=null;"
new_refs = "    var historyButton=null,historyBackdrop=null,historyDrawer=null,historyClose=null,regionBackdrop=null,regionPanel=null,regionClose=null,regionMessage=null,regionNote=null,regionSupportButton=null;"
if t.count(old_refs) != 1:
    raise SystemExit("region refs anchor mismatch")
t = t.replace(old_refs, new_refs, 1)

new_status = r'''    function setStatus(text,type){if(!betStatus)return;betStatus.textContent='';betStatus.classList.toggle('bad',type==='bad');betStatus.classList.toggle('good',type==='good');betStatus.setAttribute('dir','auto');if(text){var message=document.createElement('span');message.className='predict-zone-bet-status-message';message.textContent=String(text);betStatus.appendChild(message)}}
    function ensureRegionSheet(){if(regionPanel)return;regionBackdrop=document.createElement('div');regionBackdrop.className='predict-region-backdrop';regionBackdrop.setAttribute('data-predict-region-backdrop','1');regionPanel=document.createElement('section');regionPanel.className='predict-region-panel';regionPanel.setAttribute('data-predict-region-panel','1');regionPanel.setAttribute('role','dialog');regionPanel.setAttribute('aria-modal','true');regionPanel.setAttribute('aria-label','Predict');regionPanel.setAttribute('aria-hidden','true');regionPanel.innerHTML='<div class="predict-region-grab" aria-hidden="true"></div><header class="predict-region-head"><div class="predict-region-title"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke-width="1.7"/><path d="M3.8 12h16.4M12 3.5c2.1 2.25 3.2 5.08 3.2 8.5S14.1 18.25 12 20.5M12 3.5C9.9 5.75 8.8 8.58 8.8 12s1.1 6.25 3.2 8.5" stroke-width="1.7" stroke-linecap="round"/></svg><strong>Predict</strong></div><button class="predict-region-close" type="button" data-predict-region-close="1" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></header><div class="predict-region-copy" dir="auto"><strong data-predict-region-message></strong><span data-predict-region-note></span></div><button class="predict-region-support" type="button" data-predict-support="1"></button>';regionClose=regionPanel.querySelector('[data-predict-region-close]');regionMessage=regionPanel.querySelector('[data-predict-region-message]');regionNote=regionPanel.querySelector('[data-predict-region-note]');regionSupportButton=regionPanel.querySelector('[data-predict-support]');document.body.appendChild(regionBackdrop);document.body.appendChild(regionPanel)}
    function setRegionSheet(open,message){if(open)ensureRegionSheet();if(!regionPanel||!regionBackdrop)return;var next=!!open;if(message&&regionMessage)regionMessage.textContent=String(message);if(regionNote)regionNote.textContent=predictText('regionSupport');if(regionSupportButton)regionSupportButton.textContent=predictText('contactSupport');regionPanel.classList.toggle('is-open',next);regionPanel.setAttribute('aria-hidden',next?'false':'true');regionBackdrop.classList.toggle('is-open',next)}
    function openPredictSupport(){var supportUrl='https://t.me/vexaplace',tg=window.Telegram&&window.Telegram.WebApp;try{if(tg&&typeof tg.openTelegramLink==='function'){tg.openTelegramLink(supportUrl);return}}catch(_){}window.location.href=supportUrl}'''

t, n = re.subn(r'^    function setStatus\(text,type,options\)\{.*$', new_status, t, count=1, flags=re.M)
if n != 1:
    raise SystemExit(f"status anchor mismatch: {n}")

old_catch = "setStatus(message,'bad',{support:regionError})"
new_catch = "if(regionError){setStatus('','');setRegionSheet(true,message)}else setStatus(message,'bad')"
if t.count(old_catch) != 1:
    raise SystemExit("region catch anchor mismatch")
t = t.replace(old_catch, new_catch, 1)

t, n = re.subn(r"var support=target\.closest&&target\.closest\('\[data-predict-support\]'\);if\(support\)\{.*?return\}var preset=", "var preset=", t, count=1)
if n != 1:
    raise SystemExit(f"root support handler anchor mismatch: {n}")

doc_prefix = "    document.addEventListener('click',function(e){var target=e.target;"
doc_insert = doc_prefix + "if(regionClose&&target&&target.closest&&target.closest('[data-predict-region-close]')){e.preventDefault();setRegionSheet(false);return}if(regionBackdrop&&target===regionBackdrop){e.preventDefault();setRegionSheet(false);return}var support=target&&target.closest&&target.closest('[data-predict-support]');if(support){e.preventDefault();openPredictSupport();return}"
if t.count(doc_prefix) != 1:
    raise SystemExit("document click anchor mismatch")
t = t.replace(doc_prefix, doc_insert, 1)

suspend_old = "    function suspend(){if(runtimeSuspended)return;runtimeSuspended=true;setHistoryDrawer(false);clearRoundRetry();"
suspend_new = "    function suspend(){if(runtimeSuspended)return;runtimeSuspended=true;setHistoryDrawer(false);if(regionPanel&&regionPanel.classList.contains('is-open'))setRegionSheet(false);clearRoundRetry();"
if t.count(suspend_old) != 1:
    raise SystemExit("suspend anchor mismatch")
t = t.replace(suspend_old, suspend_new, 1)

back_old = "    window.VexaPredictBack=function(){if(historyDrawer&&historyDrawer.classList.contains('is-open')){setHistoryDrawer(false);return true}if(betOpen){closeBet();return true}return false};"
back_new = "    window.VexaPredictBack=function(){if(regionPanel&&regionPanel.classList.contains('is-open')){setRegionSheet(false);return true}if(historyDrawer&&historyDrawer.classList.contains('is-open')){setHistoryDrawer(false);return true}if(betOpen){closeBet();return true}return false};"
if t.count(back_old) != 1:
    raise SystemExit("back handler anchor mismatch")
t = t.replace(back_old, back_new, 1)

for old in (".predict-zone-bet-status.has-support", "region-error", "{support:regionError}"):
    if old in t:
        raise SystemExit(f"old inline region UI remains: {old}")
if t.count("function ensureRegionSheet()") != 1 or t.count("https://t.me/vexaplace") != 1:
    raise SystemExit("region sheet/support path is not singular")

p.write_text(t, encoding="utf-8")
