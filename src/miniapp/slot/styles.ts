export const SLOT_STYLES = `
body:has(#slot.active){
  isolation:isolate!important;
  background:#000!important;
}
body:has(#slot.active) .tabs{display:none!important}
body:has(#slot.active)::before{
  content:""!important;
  display:block!important;
  position:fixed!important;
  inset:0!important;
  width:100vw!important;
  height:100dvh!important;
  z-index:-1!important;
  pointer-events:none!important;
  background:#000 url('/assets/Slotbackground.PNG?v=1') center top/cover no-repeat!important;
  transform:none!important;
  animation:none!important;
  filter:none!important;
  opacity:1!important;
}
body:has(#slot.active)::after,
body:has(#slot.active) .app::before,
body:has(#slot.active) .app::after{
  display:none!important;
  content:none!important;
  background:none!important;
}
body:has(#slot.active) .app,
body:has(#slot.active) main.app,
body:has(#slot.active) .app-shell,
body:has(#slot.active) .app-content,
body:has(#slot.active) .content,
body:has(#slot.active) #slot.slot-view,
body:has(#slot.active) .top,
body:has(#slot.active) header.top{
  background:transparent!important;
  background-color:transparent!important;
  background-image:none!important;
}

#slot.slot-view{
  isolation:isolate;
  width:100%!important;
  height:100%!important;
  min-height:0!important;
  max-height:100%!important;
  box-sizing:border-box!important;
  overflow-y:hidden!important;
  overflow-x:hidden!important;
  touch-action:none!important;
  padding:22px 0 36px!important;
  color:#f5f1ed;
  -webkit-overflow-scrolling:touch!important;
}
#slot.slot-view:has(.slot-live.open){
  overflow-y:auto!important;
  touch-action:pan-y!important;
  overscroll-behavior-y:contain!important;
}
#slot.slot-view::before,
#slot.slot-view::after{content:none!important;display:none!important}

#slot .slot-rewards-card{
  left:16px;top:14px;width:44px;height:44px;border-radius:15px;
  color:rgba(248,242,238,.9);
  background:linear-gradient(145deg,rgba(31,27,27,.96),rgba(6,5,5,.96))!important;
  border:1px solid rgba(255,255,255,.1)!important;
  box-shadow:0 14px 34px rgba(0,0,0,.48),inset 0 1px 0 rgba(255,255,255,.1)!important;
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
}
#slot .slot-rewards-card svg{filter:drop-shadow(0 5px 8px rgba(0,0,0,.5))}
#slot .slot-rewards-panel{
  background:linear-gradient(155deg,rgba(25,20,21,.99),rgba(3,3,3,.99))!important;
  border:1px solid rgba(255,255,255,.1)!important;
  box-shadow:0 34px 100px rgba(0,0,0,.76),inset 0 1px 0 rgba(255,255,255,.08)!important;
  backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
}
#slot .slot-reward-row{
  background:linear-gradient(110deg,rgba(255,255,255,.035),rgba(76,13,30,.08))!important;
  border:1px solid rgba(255,255,255,.055)!important;
}

#slot .slot-cabinet{
  position:relative!important;
  z-index:3!important;
  width:min(92vw,390px)!important;
  margin:6px auto 0!important;
  transform:none!important;
  transform-origin:top center!important;
  transition:none!important;
  animation:none!important;
}
#slot .slot-win-multiplier{
  position:absolute!important;
  z-index:18!important;
  left:50%!important;
  top:-11px!important;
  width:max-content!important;
  max-width:90%!important;
  margin:0!important;
  padding:0!important;
  transform:translateX(-50%)!important;
  border:0!important;
  border-radius:0!important;
  outline:0!important;
  background:none!important;
  background-color:transparent!important;
  box-shadow:none!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
  color:#7f1834!important;
  background:linear-gradient(180deg,#d38a9d 0%,#922945 37%,#5b1028 72%,#9f3855 100%)!important;
  -webkit-background-clip:text!important;
  background-clip:text!important;
  -webkit-text-fill-color:transparent!important;
  font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter","Segoe UI",sans-serif!important;
  font-size:clamp(27px,8vw,38px)!important;
  font-weight:950!important;
  font-variant-numeric:tabular-nums!important;
  letter-spacing:-.055em!important;
  line-height:1!important;
  white-space:nowrap!important;
  text-align:center!important;
  text-shadow:0 1px 0 rgba(255,214,225,.18),0 7px 18px rgba(0,0,0,.86),0 0 18px rgba(111,16,43,.38)!important;
  filter:drop-shadow(0 10px 18px rgba(0,0,0,.48))!important;
  opacity:1!important;
  visibility:visible!important;
  animation:none!important;
  transition:none!important;
  pointer-events:none!important;
}
#slot .slot-win-multiplier[hidden]{display:none!important}
#slot .slot-machine{
  position:relative!important;
  inset:auto!important;
  left:auto!important;
  top:-14px!important;
  z-index:10!important;
  width:100%!important;
  height:auto!important;
  min-height:0!important;
  aspect-ratio:845/900!important;
  margin:0!important;
  padding:0!important;
  background:transparent!important;
  overflow:visible!important;
  transform:none!important;
  perspective:none!important;
}
#slot .slot-machine-shadow{display:none!important}
#slot .slot-frame-image,
#slot .slot-machine.is-spinning .slot-frame-image,
#slot .slot-machine.is-win .slot-frame-image{
  position:absolute!important;
  inset:0!important;
  z-index:8!important;
  width:100%!important;
  height:100%!important;
  object-fit:contain!important;
  opacity:1!important;
  animation:none!important;
  transform:none!important;
  filter:drop-shadow(0 22px 28px rgba(0,0,0,.68))!important;
  pointer-events:none!important;
}
#slot .slot-jackpot-title{
  position:absolute!important;
  z-index:12!important;
  left:50%!important;
  top:14.2%!important;
  transform:translate(-50%,-50%)!important;
  color:#d9b178!important;
  font-family:Georgia,serif!important;
  font-size:clamp(18px,6vw,27px)!important;
  font-weight:800!important;
  letter-spacing:.18em!important;
  line-height:1!important;
  text-shadow:0 2px 6px rgba(0,0,0,.9)!important;
  pointer-events:none!important;
}

#slot .slot-window{
  position:absolute!important;
  z-index:9!important;
  top:30.2%!important;
  left:9.8%!important;
  width:80.4%!important;
  height:43%!important;
  display:grid!important;
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
  gap:2.4%!important;
  margin:0!important;
  padding:0!important;
  overflow:hidden!important;
  border:0!important;
  border-radius:10px!important;
  background:transparent!important;
  box-shadow:none!important;
  transform:none!important;
  perspective:380px!important;
  -webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 8%,#000 92%,transparent 100%)!important;
  mask-image:linear-gradient(to bottom,transparent 0,#000 8%,#000 92%,transparent 100%)!important;
}
#slot .slot-window::before,
#slot .slot-window::after{
  content:""!important;
  display:block!important;
  position:absolute!important;
  left:0!important;
  right:0!important;
  z-index:6!important;
  pointer-events:none!important;
}
#slot .slot-window::before{
  top:0!important;
  height:14%!important;
  background:linear-gradient(to bottom,rgba(0,0,0,.58),rgba(0,0,0,0))!important;
}
#slot .slot-window::after{
  bottom:0!important;
  height:9%!important;
  background:linear-gradient(to top,rgba(0,0,0,.34),rgba(0,0,0,0))!important;
}
#slot .slot-reel{
  position:relative!important;
  z-index:2!important;
  height:100%!important;
  min-width:0!important;
  overflow:visible!important;
  border:0!important;
  border-radius:0!important;
  outline:0!important;
  background:none!important;
  box-shadow:none!important;
  transform:none!important;
  transform-style:preserve-3d!important;
}
#slot .slot-reel:first-child{transform:translateX(20px)!important}
#slot .slot-reel:last-child{transform:translateX(-20px)!important}
#slot .slot-reel::before,
#slot .slot-reel::after{display:none!important;content:none!important}
#slot .slot-reel-strip{
  position:absolute!important;
  left:0!important;
  right:0!important;
  top:0!important;
  transform:translate3d(0,0,0);
  transform-style:preserve-3d!important;
}
#slot .slot-symbol{
  width:100%!important;
  height:calc((min(92vw,390px) * .460 * 900 / 845) / 3)!important;
  margin-left:0!important;
  display:grid!important;
  place-items:center!important;
  padding:0!important;
  font-size:34px!important;
  user-select:none!important;
  transform-style:preserve-3d!important;
  backface-visibility:hidden!important;
  transition:transform .28s ease,opacity .28s ease,filter .28s ease!important;
  overflow:visible!important;
  border:0!important;
  border-radius:0!important;
  outline:0!important;
  background:none!important;
  box-shadow:none!important;
  filter:none!important;
}
#slot .slot-symbol-fallback{display:none!important}
#slot .slot-symbol-image{
  width:76%!important;
  height:76%!important;
  object-fit:contain!important;
  display:block!important;
  pointer-events:none!important;
  opacity:1!important;
  filter:drop-shadow(0 10px 9px rgba(0,0,0,.96)) drop-shadow(0 0 15px rgba(0,0,0,.78))!important;
}
#slot .slot-reel:first-child .slot-symbol-image{transform:translateX(-11%)!important}
#slot .slot-reel:last-child .slot-symbol-image{transform:translateX(11%)!important}
#slot .slot-symbol.is-reel-top{
  transform:perspective(180px) rotateX(-23deg) translateY(-17px) scale(.80)!important;
  transform-origin:50% 100%!important;
  opacity:.72!important;
  filter:brightness(.72) drop-shadow(0 6px 9px rgba(0,0,0,.48))!important;
}
#slot .slot-symbol.is-reel-center{
  transform:translateZ(8px) scale(1.04)!important;
  transform-origin:50% 50%!important;
  opacity:1!important;
}
#slot .slot-symbol.is-reel-bottom{
  transform:perspective(180px) rotateX(23deg) translateY(17px) scale(.80)!important;
  transform-origin:50% 0!important;
  opacity:.72!important;
  filter:brightness(.72) drop-shadow(0 6px 9px rgba(0,0,0,.48))!important;
}
#slot .slot-machine.is-spinning .slot-reel-strip{
  will-change:transform!important;
  backface-visibility:hidden!important;
  -webkit-backface-visibility:hidden!important;
}
#slot .slot-machine.is-win .slot-window{animation:slotWinPulse .7s ease both}

#slot .slot-simple-controls{
  position:relative!important;
  z-index:14!important;
  width:min(90vw,370px)!important;
  margin:-72px auto 0!important;
  display:grid!important;
  justify-items:center!important;
  gap:7px!important;
  background:none!important;
  background-color:transparent!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:none!important;
  filter:none!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
}
#slot .slot-simple-controls::before,
#slot .slot-simple-controls::after{content:none!important;display:none!important}
#slot .slot-simple-bet-row{
  width:100%!important;
  display:grid!important;
  grid-template-columns:64px minmax(0,1fr) 64px!important;
  align-items:center!important;
  gap:8px!important;
  background:none!important;
  border:0!important;
  box-shadow:none!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
}
#slot .slot-asset-button,
#slot .slot-asset-input{
  position:relative!important;
  display:grid!important;
  place-items:center!important;
  min-width:0!important;
  margin:0!important;
  padding:0!important;
  border:0!important;
  outline:0!important;
  background:none!important;
  background-color:transparent!important;
  background-image:none!important;
  box-shadow:none!important;
  filter:none!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
  overflow:visible!important;
  isolation:isolate!important;
  -webkit-tap-highlight-color:transparent!important;
}
#slot .slot-asset-button::before,
#slot .slot-asset-button::after,
#slot .slot-asset-input::before,
#slot .slot-asset-input::after{content:none!important;display:none!important}
#slot .slot-asset-button img{
  position:absolute!important;
  inset:0!important;
  z-index:0!important;
  display:block!important;
  width:100%!important;
  height:100%!important;
  object-fit:contain!important;
  pointer-events:none!important;
  filter:drop-shadow(0 10px 14px rgba(0,0,0,.52))!important;
}
#slot .slot-asset-input img{
  display:block!important;
  width:100%!important;
  height:100%!important;
  object-fit:contain!important;
  pointer-events:none!important;
  filter:drop-shadow(0 10px 14px rgba(0,0,0,.52))!important;
}
#slot .slot-asset-button>span,
#slot .slot-asset-spin .slot-spin-label{visibility:hidden!important}
#slot .slot-asset-step{
  --slot-step-x:0px;
  width:64px!important;
  height:64px!important;
  border-radius:50%!important;
  cursor:pointer!important;
  transform:translateX(var(--slot-step-x)) scale(1)!important;
  transform-origin:center!important;
  transition:transform .18s cubic-bezier(.2,.8,.2,1),filter .18s ease,opacity .18s ease!important;
}
#slot #slotBetMinus{--slot-step-x:10px}
#slot #slotBetPlus{--slot-step-x:-10px}
#slot .slot-asset-step span{
  position:absolute!important;
  inset:0!important;
  display:grid!important;
  place-items:center!important;
  color:#f1d2a5!important;
  font-size:28px!important;
  font-weight:900!important;
  line-height:1!important;
  text-shadow:0 2px 7px rgba(0,0,0,.9)!important;
  pointer-events:none!important;
}
#slot .slot-asset-input{
  width:100%!important;
  height:64px!important;
  cursor:text!important;
}
#slot .slot-asset-input input{
  position:absolute!important;
  z-index:2!important;
  left:10%!important;
  top:13%!important;
  width:80%!important;
  height:74%!important;
  margin:0!important;
  padding:0!important;
  border:0!important;
  outline:0!important;
  border-radius:0!important;
  color:#fff1df!important;
  background:none!important;
  background-color:transparent!important;
  background-image:none!important;
  box-shadow:none!important;
  filter:none!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
  appearance:none!important;
  -webkit-appearance:none!important;
  -moz-appearance:textfield!important;
  text-align:center!important;
  font-size:22px!important;
  font-weight:950!important;
  line-height:1!important;
  text-shadow:0 2px 8px rgba(0,0,0,.9)!important;
}
#slot .slot-asset-input input::-webkit-inner-spin-button,
#slot .slot-asset-input input::-webkit-outer-spin-button{-webkit-appearance:none!important;margin:0!important}
#slot .slot-asset-input small{display:none!important}
#slot .slot-asset-spin{
  width:min(76vw,300px)!important;
  height:82px!important;
  margin:-2px auto 0!important;
  border-radius:999px!important;
  cursor:pointer!important;
  transition:transform .15s ease,filter .15s ease,opacity .18s ease!important;
}
#slot .slot-asset-spin strong{
  position:absolute!important;
  z-index:2!important;
  left:50%!important;
  top:45%!important;
  transform:translate(-50%,-50%)!important;
  color:#f8dfbc!important;
  font-family:Georgia,serif!important;
  font-size:23px!important;
  font-weight:900!important;
  letter-spacing:.12em!important;
  line-height:1!important;
  text-shadow:0 2px 8px rgba(0,0,0,.92)!important;
  pointer-events:none!important;
}
#slot .slot-asset-spin .slot-spin-cost{
  position:absolute!important;
  z-index:2!important;
  left:50%!important;
  top:69%!important;
  transform:translate(-50%,-50%)!important;
  display:block!important;
  margin:0!important;
  color:rgba(248,223,188,.72)!important;
  font-size:9px!important;
  font-weight:850!important;
  letter-spacing:.10em!important;
  line-height:1!important;
  pointer-events:none!important;
}
#slot .slot-asset-spin:active{transform:scale(.96)!important;filter:brightness(.84)!important}
#slot .slot-asset-step:active{
  transform:translateX(var(--slot-step-x)) scale(.93)!important;
  filter:brightness(.88)!important;
}
#slot .slot-asset-button:disabled{opacity:.48!important;cursor:default!important;filter:saturate(.55)!important}

/* Slot keeps its uploaded control assets available for testing; this is the Crash control layout. */
#slot .slot-simple-controls{width:min(92vw,390px)!important;margin:42px auto 0!important;display:grid!important;gap:10px!important;justify-items:stretch!important}
#slot .slot-simple-bet-row{grid-template-columns:.58fr 1.84fr .58fr!important;gap:7px!important;align-items:center!important}
#slot .slot-asset-button,#slot .slot-asset-input{height:38px!important;border-radius:28px!important;background:#080808!important;color:#fff!important;box-shadow:0 12px 30px rgba(31,1,10,.32),0 0 18px rgba(69,5,26,.15),inset 3px 3px .5px -3.5px rgba(255,255,255,.10),inset -3px -3px .5px -3.5px rgba(156,38,70,.48),inset 1px 1px 1px -.5px rgba(140,29,61,.30),inset -1px -1px 1px -.5px rgba(124,22,53,.24),inset 0 0 6px 6px rgba(255,255,255,.055),inset 0 0 2px 2px rgba(255,255,255,.035)!important;overflow:hidden!important}
#slot .slot-asset-button img,#slot .slot-asset-input img{display:none!important}
#slot .slot-asset-step{width:100%!important;height:38px!important;border-radius:28px!important;transform:none!important}
#slot #slotBetMinus,#slot #slotBetPlus{--slot-step-x:0px!important}
#slot .slot-asset-button>span{position:static!important;visibility:visible!important;color:#fff!important;font-size:12px!important;font-weight:950!important;text-shadow:none!important}
#slot .slot-asset-input{width:100%!important;height:38px!important;padding:0 12px!important;display:flex!important;align-items:center!important;justify-content:center!important}
#slot .slot-asset-input input{position:static!important;width:100%!important;height:38px!important;color:#fff!important;background:transparent!important;text-align:center!important;font-size:20px!important;font-weight:950!important;text-shadow:none!important}
#slot .slot-asset-spin{width:100%!important;height:48px!important;margin:0!important;border-radius:28px!important;background:#080808!important}
#slot .slot-asset-spin .slot-spin-label{position:static!important;visibility:visible!important;transform:none!important;color:#fff!important;font-family:inherit!important;font-size:14px!important;font-weight:950!important;letter-spacing:0!important;text-shadow:none!important}
#slot .slot-asset-spin:active,#slot .slot-asset-step:active{transform:translate3d(0,1px,0) scale(.94)!important;filter:brightness(1.14) saturate(1.08)!important}
#slot .slot-asset-button:disabled{opacity:.62!important;filter:none!important}

#slot .slot-live{
  position:relative!important;
  z-index:5!important;
  display:block!important;
  visibility:visible!important;
  opacity:1!important;
  width:min(92%,408px)!important;
  margin:30px auto 28px!important;
  padding:0 10px calc(20px + env(safe-area-inset-bottom))!important;
  border:0!important;
  border-radius:0!important;
  outline:0!important;
  background:transparent!important;
  box-shadow:none!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
  overflow:visible!important;
  max-height:none!important;
}
#slot .slot-live:not(.open){max-height:none!important;padding-bottom:calc(20px + env(safe-area-inset-bottom))!important}
#slot .slot-live-head{
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  visibility:visible!important;
  opacity:1!important;
  margin:0 4px 10px!important;
  padding:0 2px!important;
  color:rgba(255,255,255,.5)!important;
  font-size:13px!important;
  font-weight:850!important;
}
#slot .slot-live-title{display:inline-flex!important;align-items:center!important;gap:7px!important;min-width:0!important;color:rgba(255,255,255,.58)!important}
#slot .slot-live-title svg{width:17px!important;height:17px!important;color:rgba(255,255,255,.55)!important}
#slot .slot-live-title svg path{fill:none!important;stroke:currentColor!important;stroke-width:1.9!important;stroke-linecap:round!important;stroke-linejoin:round!important}
#slot .slot-live-head-actions{display:flex!important;align-items:center!important;gap:8px!important}
#slot .slot-live-head b{color:rgba(255,255,255,.92)!important;font-size:13px!important;font-weight:900!important}
#slot .slot-live-toggle{
  width:28px!important;height:28px!important;padding:0!important;border:0!important;border-radius:10px!important;
  display:flex!important;align-items:center!important;justify-content:center!important;
  background:rgba(255,255,255,.055)!important;color:rgba(255,255,255,.85)!important;box-shadow:none!important;
}
#slot .slot-live-toggle svg{width:18px!important;height:18px!important;transition:transform .28s cubic-bezier(.2,.8,.2,1)!important}
#slot .slot-live.open .slot-live-toggle svg{transform:rotate(180deg)!important}
#slot .slot-live-list{
  display:grid!important;
  visibility:visible!important;
  opacity:1!important;
  pointer-events:auto!important;
  gap:6px!important;
  height:auto!important;
  max-height:none!important;
  overflow:visible!important;
  padding:2px 2px 10px!important;
  scrollbar-width:none!important;
}
#slot .slot-live-list::-webkit-scrollbar{display:none!important}
#slot .slot-live:not(.open) .slot-live-list{
  visibility:hidden!important;
  opacity:0!important;
  height:0!important;
  max-height:0!important;
  padding-top:0!important;
  padding-bottom:0!important;
  pointer-events:none!important;
  overflow:hidden!important;
}
#slot .slot-live-row{
  display:grid!important;
  grid-template-columns:minmax(0,1fr) auto!important;
  align-items:center!important;
  gap:10px!important;
  min-height:48px!important;
  height:48px!important;
  padding:6px 12px!important;
  border:0!important;
  border-radius:20px!important;
  background:rgba(13,13,13,.54)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.105),inset 0 -1px 0 rgba(255,255,255,.06),inset 0 0 22px rgba(255,255,255,.055),0 16px 36px rgba(0,0,0,.22)!important;
  backdrop-filter:blur(4px) saturate(1.08)!important;
  -webkit-backdrop-filter:blur(4px) saturate(1.08)!important;
  color:#fff!important;
  box-sizing:border-box!important;
}
#slot .slot-live-row.is-entering{animation:slotLiveRowIn .54s cubic-bezier(.2,.9,.2,1) both!important}
#slot .slot-live-user{min-width:0!important;font-size:12px!important;font-weight:900!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;color:rgba(255,255,255,.92)!important}
#slot .slot-live-result{display:inline-flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;font-size:14px!important;font-weight:930!important;color:rgba(255,255,255,.84)!important;white-space:nowrap!important}
#slot .slot-live-symbol{width:20px!important;height:20px!important;display:inline-grid!important;place-items:center!important;flex:0 0 auto!important;font-size:16px!important;line-height:1!important;animation:slotLiveSymbolPop .46s cubic-bezier(.2,.9,.2,1) both!important}
#slot .slot-live-symbol:nth-child(2){animation-delay:.05s!important}
#slot .slot-live-symbol:nth-child(3){animation-delay:.10s!important}
#slot .slot-live-symbol img{width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;pointer-events:none!important}
#slot .slot-live-symbol.has-image>span{display:none!important}
#slot .slot-live-empty{font-size:12px!important;font-weight:820!important;color:rgba(255,255,255,.45)!important;padding:14px 0!important;text-align:center!important}

@keyframes slotWinPulse{0%{transform:scale(1)}42%{transform:scale(1.018)}100%{transform:scale(1)}}
@keyframes slotLiveRowIn{0%{opacity:0;transform:translate3d(0,-12px,0) scale(.985);filter:blur(5px)}58%{opacity:1;transform:translate3d(0,2px,0) scale(1.006);filter:blur(0)}100%{opacity:1;transform:translate3d(0,0,0) scale(1);filter:blur(0)}}
@keyframes slotLiveSymbolPop{0%{opacity:0;transform:translateY(5px) scale(.72) rotate(-7deg)}70%{opacity:1;transform:translateY(-1px) scale(1.08) rotate(2deg)}100%{opacity:1;transform:translateY(0) scale(1) rotate(0)}}

@media(max-width:380px){
  #slot .slot-cabinet{width:min(94vw,356px)!important;margin:10px auto 0!important}
  #slot .slot-symbol{height:calc((min(94vw,356px) * .460 * 900 / 845) / 3)!important}
  #slot .slot-simple-controls{width:min(92vw,348px)!important;margin-top:-64px!important}
  #slot .slot-simple-bet-row{grid-template-columns:58px minmax(0,1fr) 58px!important;gap:6px!important}
  #slot .slot-asset-step{width:58px!important;height:58px!important}
  #slot .slot-asset-input{height:58px!important}
  #slot .slot-asset-input input{font-size:20px!important}
  #slot .slot-asset-spin{width:min(78vw,286px)!important;height:77px!important}
  #slot .slot-live{margin-top:30px!important;width:min(94%,370px)!important}
  #slot .slot-live-row{min-height:46px!important;height:46px!important;border-radius:19px!important;padding:5px 11px!important}
}

@media(prefers-reduced-motion:reduce){
  #slot .slot-cabinet,
  #slot .slot-live-row.is-entering,
  #slot .slot-live-symbol{animation:none!important}
  #slot .slot-symbol{transition:none!important}
}
`;
