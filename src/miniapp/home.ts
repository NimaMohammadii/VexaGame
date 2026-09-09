const HOME_BASE_STYLES = `
html body:has(#home.active){
  isolation:isolate!important;
  background:#000!important;
}
html body:has(#home.active)::before{
  content:""!important;
  display:block!important;
  position:fixed!important;
  inset:0!important;
  width:100vw!important;
  height:100dvh!important;
  z-index:-1!important;
  pointer-events:none!important;
  background-color:#000!important;
  background-image:url('/assets/Home.PNG?v=1')!important;
  background-size:cover!important;
  background-position:center top!important;
  background-repeat:no-repeat!important;
  transform:none!important;
  animation:none!important;
  filter:none!important;
  opacity:1!important;
}
html body:has(#home.active)::after,
html body:has(#home.active) .app::before,
html body:has(#home.active) .app::after{
  display:none!important;
  content:none!important;
  background:none!important;
  background-image:none!important;
}
html body:has(#home.active) .app,
html body:has(#home.active) main.app,
html body:has(#home.active) .content,
html body:has(#home.active) #home.view,
html body:has(#home.active) .top,
html body:has(#home.active) header.top{
  background:transparent!important;
  background-color:transparent!important;
  background-image:none!important;
}
#home{padding-top:4px}
#home .home-promo-carousel{
  width:100%!important;
  height:0;
  margin:0!important;
  padding:0!important;
  overflow:hidden!important;
  background:transparent!important;
  background-color:transparent!important;
  background-image:none!important;
  border:0!important;
  border-radius:0!important;
  outline:0!important;
  box-shadow:none!important;
  transition:height 1.15s cubic-bezier(.22,.61,.18,1),margin-bottom .36s ease!important;
  touch-action:pan-y!important;
}
#home .home-promo-carousel.is-ready{margin-bottom:12px!important}
#home .home-promo-track{
  width:100%!important;
  display:flex!important;
  align-items:flex-start!important;
  gap:10px!important;
  transform:translate3d(0,0,0);
  transition:transform 1.55s cubic-bezier(.22,.61,.18,1)!important;
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
}
#home .home-promo-track.is-jumping{transition:none!important}
#home .home-promo-slide{
  flex:0 0 100%!important;
  width:100%!important;
  min-width:100%!important;
  margin:0!important;
  padding:2px!important;
  position:relative!important;
  box-sizing:border-box!important;
  background:transparent!important;
  background-color:transparent!important;
  background-image:none!important;
  border:0!important;
  border-radius:22px!important;
  outline:0!important;
  box-shadow:0 16px 36px rgba(0,0,0,.30)!important;
  overflow:hidden!important;
  -webkit-backdrop-filter:blur(3px) saturate(150%)!important;
  backdrop-filter:blur(3px) saturate(150%)!important;
  isolation:isolate!important;
}
#home .home-promo-slide:before,
#home .home-promo-slide:after{
  content:none!important;
  display:none!important;
}
#home .home-promo-slide img{
  position:relative!important;
  z-index:1!important;
  display:block!important;
  width:100%!important;
  height:auto!important;
  max-width:100%!important;
  margin:0!important;
  padding:0!important;
  object-fit:contain!important;
  object-position:center top!important;
  background:transparent!important;
  border:0!important;
  border-radius:20px!important;
  outline:0!important;
  box-shadow:none!important;
  filter:none!important;
  image-rendering:auto!important;
  transform:translateZ(0)!important;
}
@media (prefers-reduced-motion:reduce){
  #home .home-promo-carousel,#home .home-promo-track{transition-duration:.01ms!important}
}
#rankPill{display:none!important}
#home #homeDrawInfoCard.home-draw-info-card,
#home .home-ticket-card{
  position:relative!important;
  overflow:hidden!important;
  border-radius:28px!important;
  background:transparent!important;
  background-color:transparent!important;
  background-image:none!important;
  border:0!important;
  outline:0!important;
  box-shadow:
    inset 3px 3px .5px -3.5px rgba(255,255,255,.10),
    inset -3px -3px .5px -3.5px rgba(156,38,70,.48),
    inset 1px 1px 1px -.5px rgba(140,29,61,.30),
    inset -1px -1px 1px -.5px rgba(124,22,53,.24),
    inset 0 0 6px 6px rgba(255,255,255,.055),
    inset 0 0 2px 2px rgba(255,255,255,.035)!important;
  backdrop-filter:blur(22px) saturate(1.40) brightness(1.05) contrast(1.04)!important;
  -webkit-backdrop-filter:blur(22px) saturate(1.40) brightness(1.05) contrast(1.04)!important;
  isolation:isolate!important;
  transform:translateZ(0)!important;
}
#home .home-ticket-card{
  margin:0!important;
  min-height:154px!important;
  padding:10px 12px!important;
  display:grid!important;
  gap:10px!important;
  align-content:space-between!important;
  box-sizing:border-box!important;
  box-shadow:
    inset 3px 3px .5px -3.5px rgba(255,255,255,.10),
    inset 1px 1px 1px -.5px rgba(140,29,61,.30),
    inset 0 0 6px 6px rgba(255,255,255,.055),
    inset 0 0 2px 2px rgba(255,255,255,.035)!important;
}
#home #homeDrawInfoCard.home-draw-info-card:before,
#home .home-ticket-card:before{
  content:''!important;
  position:absolute!important;
  inset:0!important;
  z-index:0!important;
  border-radius:inherit!important;
  display:block!important;
  pointer-events:none!important;
  background:
    radial-gradient(34px 34px at 0 0,rgba(186,53,87,.16) 0%,rgba(146,35,66,.07) 42%,rgba(104,18,44,0) 76%),
    radial-gradient(36px 36px at 100% 100%,rgba(172,46,79,.15) 0%,rgba(133,30,60,.065) 43%,rgba(94,16,39,0) 78%),
    radial-gradient(118% 76% at 10% -16%,rgba(255,255,255,.12) 0%,rgba(255,255,255,.032) 30%,rgba(255,255,255,0) 58%),
    radial-gradient(96% 72% at 102% 108%,rgba(255,255,255,.052) 0%,rgba(255,255,255,.010) 34%,rgba(255,255,255,0) 62%),
    radial-gradient(92% 78% at 88% 112%,rgba(72,5,27,.11) 0%,rgba(42,3,16,0) 60%)!important;
  box-shadow:inset 0 1px 0 rgba(112,18,49,.065),inset 0 -1px 0 rgba(88,12,37,.15)!important;
  opacity:1!important;
}
#home .home-ticket-card:before{
  background:
    radial-gradient(34px 34px at 0 0,rgba(186,53,87,.16) 0%,rgba(146,35,66,.07) 42%,rgba(104,18,44,0) 76%),
    radial-gradient(118% 76% at 10% -16%,rgba(255,255,255,.12) 0%,rgba(255,255,255,.032) 30%,rgba(255,255,255,0) 58%),
    radial-gradient(96% 72% at 102% 108%,rgba(255,255,255,.052) 0%,rgba(255,255,255,.010) 34%,rgba(255,255,255,0) 62%)!important;
  box-shadow:inset 0 1px 0 rgba(112,18,49,.065)!important;
}
#home #homeDrawInfoCard.home-draw-info-card>*,
#home .home-ticket-card>*{position:relative!important;z-index:1!important}
#home .home-ticket-card .home-ticket-stepper{
  display:grid!important;
  grid-template-columns:1fr 1fr!important;
  gap:8px!important;
}
#home .home-ticket-card .home-ticket-count{
  height:44px!important;
  width:100%!important;
  border-radius:18px!important;
  background:rgba(0,0,0,.22)!important;
  color:#fff!important;
  font-size:20px!important;
  font-weight:950!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(255,255,255,.04)!important;
}
#home .home-ticket-card .home-ticket-step,
#home .home-ticket-card .home-ticket-button{
  position:relative!important;
  overflow:hidden!important;
  height:38px!important;
  padding:0 12px!important;
  border:0!important;
  border-radius:28px!important;
  background:
    radial-gradient(34px 34px at 0 0,rgba(186,53,87,.16) 0%,rgba(146,35,66,.07) 42%,rgba(104,18,44,0) 76%),
    radial-gradient(36px 36px at 100% 100%,rgba(172,46,79,.15) 0%,rgba(133,30,60,.065) 43%,rgba(94,16,39,0) 78%),
    radial-gradient(118% 76% at 10% -16%,rgba(255,255,255,.12) 0%,rgba(255,255,255,.032) 30%,rgba(255,255,255,0) 58%),
    radial-gradient(96% 72% at 102% 108%,rgba(255,255,255,.052) 0%,rgba(255,255,255,.010) 34%,rgba(255,255,255,0) 62%),
    radial-gradient(92% 78% at 88% 112%,rgba(72,5,27,.11) 0%,rgba(42,3,16,0) 60%)!important;
  color:#fff!important;
  font-size:12px!important;
  font-weight:950!important;
  box-shadow:
    inset 3px 3px .5px -3.5px rgba(255,255,255,.10),
    inset -3px -3px .5px -3.5px rgba(156,38,70,.48),
    inset 1px 1px 1px -.5px rgba(140,29,61,.30),
    inset -1px -1px 1px -.5px rgba(124,22,53,.24),
    inset 0 0 6px 6px rgba(255,255,255,.055),
    inset 0 0 2px 2px rgba(255,255,255,.035),
    inset 0 1px 0 rgba(112,18,49,.065),
    inset 0 -1px 0 rgba(88,12,37,.15)!important;
  backdrop-filter:blur(22px) saturate(1.40) brightness(1.05) contrast(1.04)!important;
  -webkit-backdrop-filter:blur(22px) saturate(1.40) brightness(1.05) contrast(1.04)!important;
  isolation:isolate!important;
  transform:translate3d(0,0,0)!important;
  transform-origin:center!important;
  touch-action:manipulation!important;
  -webkit-tap-highlight-color:transparent!important;
  transition:transform .38s cubic-bezier(.18,.88,.24,1),filter .32s ease,opacity .32s ease!important;
}
#home .home-ticket-card .home-ticket-step:active,
#home .home-ticket-card .home-ticket-button:active{
  transform:translate3d(0,1px,0) scale(.94)!important;
  filter:brightness(1.14) saturate(1.08)!important;
  transition-duration:.11s!important;
}
#home .home-ticket-card .home-ticket-step{font-size:0!important;line-height:0!important;color:transparent!important}
#home .home-ticket-card .home-ticket-button{width:100%!important}
#home .home-ticket-card .home-ticket-step:before,
#home .home-ticket-card .home-ticket-step:after{
  content:''!important;
  position:absolute!important;
  left:50%!important;
  top:50%!important;
  width:16px!important;
  height:2.6px!important;
  border-radius:999px!important;
  background:#fff!important;
  box-shadow:none!important;
  transform:translate(-50%,-50%)!important;
  pointer-events:none!important;
}
#home .home-ticket-card .home-ticket-step[data-ticket-minus]:after{display:none!important}
#home .home-ticket-card .home-ticket-step[data-ticket-plus]:after{display:block!important;width:2.6px!important;height:16px!important}
#home #homeDrawInfoCard .home-draw-copy,
#home #homeDrawInfoCard .home-prize-copy{
  display:grid!important;
  grid-template-rows:10px 26px!important;
  align-content:center!important;
  row-gap:2px!important;
}
#home #homeDrawInfoCard .home-draw-copy{padding-left:5px!important}
#home #homeDrawInfoCard .home-draw-label,
#home #homeDrawInfoCard .home-prize-label{
  align-self:start!important;
  margin:0!important;
  transform:translateY(0)!important;
}
#home #homeDrawInfoCard .home-draw-time{
  align-self:start!important;
  height:26px!important;
  margin:0!important;
  display:flex!important;
  align-items:center!important;
}
#home #homeDrawInfoCard .home-prize-value [data-prize-pool]{
  display:inline-flex!important;
  align-items:center!important;
  direction:ltr!important;
  overflow:visible!important;
  line-height:1.08!important;
  font-variant-numeric:tabular-nums!important;
  color:transparent!important;
  background:linear-gradient(180deg,#d36b89 0%,#bd4c6d 28%,#963252 58%,#c15876 100%)!important;
  -webkit-background-clip:text!important;
  background-clip:text!important;
  -webkit-text-stroke:0!important;
  text-shadow:0 1px 0 rgba(218,104,137,.18),0 2px 2px rgba(0,0,0,.54)!important;
}
#home #homeDrawInfoCard .home-prize-digit{
  position:relative!important;
  display:inline-grid!important;
  place-items:center!important;
  flex:0 0 auto!important;
  width:auto!important;
  min-width:0!important;
  height:1.28em!important;
  margin-inline:-.06em!important;
  padding-inline:.06em!important;
  overflow:hidden!important;
  box-sizing:content-box!important;
}
#home #homeDrawInfoCard .home-prize-digit-current,
#home #homeDrawInfoCard .home-prize-digit-old,
#home #homeDrawInfoCard .home-prize-separator{
  color:transparent!important;
  background:linear-gradient(180deg,#d36b89 0%,#bd4c6d 28%,#963252 58%,#c15876 100%)!important;
  -webkit-background-clip:text!important;
  background-clip:text!important;
  -webkit-text-stroke:0!important;
  text-shadow:0 1px 0 rgba(218,104,137,.18),0 2px 2px rgba(0,0,0,.54)!important;
}
#home #homeDrawInfoCard .home-prize-digit-current{
  grid-area:1/1!important;
  display:block!important;
  width:auto!important;
  height:auto!important;
  line-height:1.08!important;
}
#home #homeDrawInfoCard .home-prize-digit-old{
  position:absolute!important;
  inset:0 .06em!important;
  display:grid!important;
  place-items:center!important;
  line-height:1.08!important;
  pointer-events:none!important;
}
#home #homeDrawInfoCard .home-prize-separator{
  display:inline-block!important;
  width:auto!important;
  height:auto!important;
  line-height:1.08!important;
}
#home .home-ticket-layout>.home-ticket-card{
  border:1px solid rgba(124,22,53,.24)!important;
  background:#070707!important;
  background-color:#070707!important;
  background-image:none!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
}
#home .home-ticket-layout>.home-ticket-card:before{
  content:''!important;
  display:block!important;
  background:
    radial-gradient(34px 34px at 0 0,rgba(186,53,87,.20) 0%,rgba(146,35,66,.09) 42%,rgba(104,18,44,0) 76%),
    radial-gradient(38px 38px at 100% 100%,rgba(156,38,70,.26) 0%,rgba(92,10,35,.12) 46%,rgba(69,5,26,0) 78%)!important;
  box-shadow:
    inset 3px 3px .5px -3.5px rgba(255,255,255,.10),
    inset -3px -3px .5px -3.5px rgba(156,38,70,.52),
    inset 1px 1px 1px -.5px rgba(140,29,61,.22),
    inset -1px -1px 1px -.5px rgba(92,10,35,.30),
    inset 6px 5px 13px -8px rgba(255,255,255,.13),
    inset -5px -4px 11px -8px rgba(255,255,255,.055),
    inset 0 0 10px rgba(69,5,26,.12)!important;
}
#home .home-ticket-card .home-ticket-count{
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.055),inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(255,255,255,.04)!important;
}
#home .home-live-winner-card{position:relative!important;overflow:hidden!important;min-height:64px!important;border:0!important;outline:0!important;border-radius:28px!important;background:transparent!important;background-color:transparent!important;background-image:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.105),inset 0 -1px 0 rgba(255,255,255,.06),inset 0 0 22px rgba(255,255,255,.055),0 16px 36px rgba(0,0,0,.22)!important;display:grid!important;grid-template-columns:42px minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;padding:11px 14px!important;backdrop-filter:blur(3px) saturate(1.04)!important;-webkit-backdrop-filter:blur(3px) saturate(1.04)!important}
#home .home-live-winner-avatar{width:42px!important;height:42px!important;border-radius:50%!important;object-fit:cover!important;display:block!important;background:transparent!important;box-shadow:none!important}
#home .home-live-winner-user{min-width:0!important;display:grid!important;gap:3px!important}
#home .home-live-winner-user strong{display:block!important;color:#fff!important;font-size:13px!important;font-weight:900!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
#home .home-live-winner-user span{display:block!important;color:rgba(255,255,255,.48)!important;font-size:10px!important;font-weight:750!important}
#home .home-live-winner-amount{color:#fff!important;font-size:13px!important;font-weight:950!important;white-space:nowrap!important}
#home .home-live-winner-card .vexa-premium-corner,#home .home-live-winner-card .vexa-bonus-premium,#home .home-live-winner-card .vexa-premium-star,#home .home-live-winner-card .vexa-bonus-star{display:none!important;content:none!important}
#home .home-ticket-finance-visual{min-height:154px!important;height:var(--home-lottery-winners-height,154px)!important;align-self:start!important;place-items:stretch!important;pointer-events:auto!important;overflow:visible!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border:0!important;outline:0!important;border-radius:0!important;padding:0!important}
#home .home-ticket-finance-visual>.home-lottery-winners{width:100%!important;height:100%!important;min-height:0!important;display:grid!important;grid-template-rows:auto minmax(0,1fr)!important;gap:7px!important;align-content:stretch!important;min-width:0!important;background:transparent!important;box-shadow:none!important;border:0!important;border-radius:0!important;overflow:visible!important;padding:0!important}
#home .home-lottery-winners-title{display:flex!important;align-items:center!important;gap:6px!important;min-height:13px!important;padding:0 4px!important;color:rgba(255,255,255,.66)!important;font-size:9px!important;font-weight:850!important;line-height:1!important;letter-spacing:-.01em!important}
#home .home-lottery-winners-title svg{width:13px!important;height:13px!important;color:#d990a5!important;flex:0 0 auto!important}
#home .home-lottery-winners-list{position:relative!important;display:grid!important;grid-template-rows:repeat(3,minmax(0,1fr))!important;align-content:stretch!important;gap:6px!important;min-height:0!important;height:100%!important;overflow:hidden!important;padding:0 2px!important;box-sizing:border-box!important;background:transparent!important;border-radius:0!important;box-shadow:none!important}
#home .home-lottery-winners-list::-webkit-scrollbar{display:none!important}
#home .home-lottery-winners-list.has-overflow:not(.is-scrolled){mask-image:linear-gradient(to bottom,#000 0,#000 calc(100% - 18px),transparent 100%)!important;-webkit-mask-image:linear-gradient(to bottom,#000 0,#000 calc(100% - 18px),transparent 100%)!important}
#home .home-lottery-winners-list.has-overflow.is-scrolled:not(.is-at-bottom){mask-image:linear-gradient(to bottom,transparent 0,#000 18px,#000 calc(100% - 18px),transparent 100%)!important;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 18px,#000 calc(100% - 18px),transparent 100%)!important}
#home .home-lottery-winners-list.has-overflow.is-at-bottom{mask-image:linear-gradient(to bottom,transparent 0,#000 18px,#000 100%)!important;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 18px,#000 100%)!important}
#home .home-lottery-winner-row{position:relative!important;overflow:hidden!important;height:auto!important;min-height:0!important;border:0!important;outline:0!important;border-radius:28px!important;background:radial-gradient(34px 34px at 0 0,rgba(186,53,87,.16) 0%,rgba(146,35,66,.07) 42%,rgba(104,18,44,0) 76%),radial-gradient(36px 36px at 100% 100%,rgba(172,46,79,.15) 0%,rgba(133,30,60,.065) 43%,rgba(94,16,39,0) 78%),radial-gradient(118% 76% at 10% -16%,rgba(255,255,255,.12) 0%,rgba(255,255,255,.032) 30%,rgba(255,255,255,0) 58%),radial-gradient(96% 72% at 102% 108%,rgba(255,255,255,.052) 0%,rgba(255,255,255,.010) 34%,rgba(255,255,255,0) 62%),radial-gradient(92% 78% at 88% 112%,rgba(72,5,27,.11) 0%,rgba(42,3,16,0) 60%),#000!important;box-shadow:inset 3px 3px .5px -3.5px rgba(255,255,255,.10),inset -3px -3px .5px -3.5px rgba(156,38,70,.48),inset 1px 1px 1px -.5px rgba(140,29,61,.30),inset -1px -1px 1px -.5px rgba(124,22,53,.24),inset 0 0 6px 6px rgba(255,255,255,.055),inset 0 0 2px 2px rgba(255,255,255,.035),inset 0 1px 0 rgba(112,18,49,.065),inset 0 -1px 0 rgba(88,12,37,.15)!important;display:grid!important;grid-template-columns:26px minmax(0,1fr) 24px!important;align-items:center!important;gap:7px!important;padding:0 10px!important;box-sizing:border-box!important;backdrop-filter:blur(22px) saturate(1.40) brightness(1.05) contrast(1.04)!important;-webkit-backdrop-filter:blur(22px) saturate(1.40) brightness(1.05) contrast(1.04)!important;isolation:isolate!important;transform:translateZ(0)!important;transform-origin:center!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Rounded","SF Pro Display","Inter","Segoe UI",sans-serif!important;transition:transform .20s cubic-bezier(.18,.88,.24,1),filter .18s ease!important}
#home .home-lottery-winner-row:active{transform:translate3d(0,1px,0) scale(.965)!important;filter:brightness(1.08)!important;transition-duration:.08s!important}
#home .home-lottery-winner-avatar{width:26px!important;height:26px!important;border-radius:50%!important;display:grid!important;place-items:center!important;overflow:hidden!important;background:rgba(255,255,255,.08)!important;color:rgba(255,255,255,.82)!important;font-size:8px!important;font-weight:900!important;line-height:1!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.11)!important}
#home .home-lottery-winner-avatar img{width:100%!important;height:100%!important;display:block!important;object-fit:cover!important}
#home .home-lottery-winner-copy{min-width:0!important;display:flex!important;align-items:center!important;gap:7px!important;overflow:hidden!important}
#home .home-lottery-winner-name{min-width:0!important;flex:1 1 auto!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#fff!important;font-family:inherit!important;font-size:9.5px!important;font-weight:800!important;line-height:1.08!important;letter-spacing:-.025em!important}
#home .home-lottery-winner-amount{flex:0 0 auto!important;margin-left:auto!important;color:#fff!important;font-family:inherit!important;font-size:9.5px!important;font-weight:850!important;line-height:1!important;letter-spacing:-.015em!important;white-space:nowrap!important}
#home .home-lottery-winner-rank{width:24px!important;height:24px!important;border-radius:50%!important;display:grid!important;place-items:center!important;align-self:center!important;justify-self:end!important;box-sizing:border-box!important;background:rgba(255,255,255,.065)!important;border:1px solid rgba(255,255,255,.08)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.10),inset 0 -1px 0 rgba(255,255,255,.035)!important;backdrop-filter:blur(8px) saturate(1.04)!important;-webkit-backdrop-filter:blur(8px) saturate(1.04)!important;color:rgba(255,255,255,.86)!important;font-family:inherit!important;font-size:9.5px!important;font-weight:850!important;line-height:1!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important}
#home .home-lottery-winners-empty{height:100%!important;display:grid!important;place-items:center!important;text-align:center!important;color:rgba(255,255,255,.34)!important;font-size:9px!important;font-weight:760!important;line-height:1.3!important;padding:0 12px!important;box-sizing:border-box!important}
`;

const HOME_MARKUP_STYLES = [
  '#home{overflow-y:auto!important;overflow-x:hidden!important;padding-bottom:calc(98px + env(safe-area-inset-bottom))!important;background:transparent!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:none!important}',
  '#homeLuckyCodeSection{display:block!important;padding:0!important;margin:0!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}',
  'body:has(#home.active) #home{overflow-y:auto!important;overflow-x:hidden!important}',
  '.home-lucky-card{background:none!important;border:0!important;box-shadow:none!important;padding:0!important;overflow:visible!important}',
  '.home-lucky-head{display:none!important}',
  '#home .home-lottery-slot-card{width:100%!important;height:88px!important;min-height:88px!important;max-height:88px!important;margin:0 0 10px!important;border:0!important;outline:0!important;border-radius:22px!important;background:transparent!important;background-color:transparent!important;background-image:none!important;box-shadow:none!important;backdrop-filter:blur(10px) saturate(1.12)!important;-webkit-backdrop-filter:blur(10px) saturate(1.12)!important;overflow:hidden!important;padding:0!important;position:relative!important;box-sizing:border-box!important}',
  '#home .home-lottery-slot-card:before,#home .home-lottery-slot-card:after{display:none!important;content:none!important}',
  '#home .home-lottery-slot-image{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;object-fit:cover!important;object-position:center!important;border:0!important;outline:0!important;border-radius:22px!important;background:transparent!important;box-shadow:none!important;opacity:1!important}',
  '#home .home-slot-number-grid{position:absolute!important;inset:0!important;z-index:2!important;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:8px!important;padding:7px 8px!important;box-sizing:border-box!important;pointer-events:none!important}',
  '#home .home-slot-number-reel{position:relative!important;display:block!important;border-radius:17px!important;overflow:hidden!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}',
  '#home .home-slot-number-reel:before{display:none!important;content:none!important}',
  '#home .home-slot-number-strip{position:absolute!important;left:0!important;right:0!important;top:50%!important;display:grid!important;grid-auto-rows:40px!important;will-change:transform!important;transition:none!important}',
  '#home .home-slot-number-reel.is-spinning .home-slot-number-strip{filter:blur(1.2px)!important}',
  '#home .home-slot-number-digit{height:40px!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#fff!important;font-size:34px!important;line-height:1!important;font-weight:950!important;letter-spacing:-.065em!important;text-shadow:0 1px 0 rgba(255,255,255,.32),0 0 16px rgba(255,86,137,.54),0 12px 26px rgba(0,0,0,.54)!important;font-variant-numeric:tabular-nums!important;background:linear-gradient(180deg,#fff 0%,#ffe9f1 42%,#d85a7a 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;color:transparent!important}',
  '.home-ticket-layout{margin-top:14px!important;display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:12px!important;align-items:stretch!important}',
  '.home-ticket-finance-visual{min-height:154px!important;height:100%!important;position:relative!important;display:grid!important;place-items:center!important;background:transparent!important;box-shadow:none!important;overflow:visible!important;pointer-events:none!important}',
  '.home-ticket-drawer-backdrop{position:fixed!important;inset:0!important;z-index:99994!important;background:transparent!important;display:none!important}.home-ticket-drawer-backdrop.is-open{display:block!important}',
  '.home-ticket-drawer{position:fixed!important;left:0!important;top:calc(120px + env(safe-area-inset-top))!important;bottom:calc(88px + env(safe-area-inset-bottom))!important;width:min(44vw,210px)!important;max-width:210px!important;z-index:99995!important;padding:24px 14px 14px!important;border-radius:0 30px 30px 0!important;color:#fff!important;transform:translate3d(-104%,0,0)!important;transition:transform .36s cubic-bezier(.18,.88,.24,1)!important;display:grid!important;grid-template-rows:auto auto minmax(0,1fr)!important;gap:14px!important;overflow:hidden!important}.home-ticket-drawer.is-open{transform:translate3d(0,0,0)!important}',
  '.home-ticket-drawer-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important}.home-ticket-drawer-head strong{font-size:16px!important;font-weight:950!important}.home-ticket-drawer-close{width:32px!important;height:32px!important;border-radius:13px!important;border:0!important;background:rgba(255,255,255,.07)!important;color:#fff!important;font-size:18px!important}',
  '.home-ticket-drawer-count{height:54px!important;border-radius:18px!important;background:rgba(0,0,0,.22)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(255,255,255,.04)!important;color:#fff!important;display:grid!important;grid-template-rows:auto auto!important;align-content:center!important;justify-items:center!important;gap:3px!important;padding:6px 10px!important;box-sizing:border-box!important}.home-ticket-drawer-count>[data-ticket-count]{display:block!important;color:#fff!important;font-size:20px!important;font-weight:950!important;line-height:1!important}.home-ticket-win-chance-text{max-width:100%!important;color:rgba(255,255,255,.58)!important;font-size:8.75px!important;font-weight:800!important;line-height:1!important;white-space:nowrap!important;text-align:center!important;transform:translateY(2px)!important}.home-ticket-win-chance-text [data-win-chance]{margin-left:3px!important;color:#fff!important;font-weight:950!important;font-variant-numeric:tabular-nums!important}.home-ticket-list{min-height:0!important;display:grid!important;align-content:start!important;gap:8px!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:none!important;padding:0 0 8px!important}.home-ticket-list::-webkit-scrollbar{display:none!important}.home-ticket-list-item{height:38px!important;border-radius:16px!important;background:rgba(255,255,255,.045)!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:space-between!important;padding:0 10px!important;font-size:12px!important;font-weight:850!important}.home-ticket-list-item span{color:rgba(255,255,255,.54)!important;font-size:11px!important}'
].join('');

const HOME_SLOT_STYLES = [
  'body:has(#home.active) #home, #home.view.active{overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important;touch-action:pan-y!important}#home .home-bonus-list,#home .home-ticket-drawer,#home .home-ticket-list,.home-bonus-list,.home-ticket-drawer{touch-action:pan-y!important;overscroll-behavior:contain!important}',
  '#home .home-lottery-slot-card{pointer-events:auto!important}',
  '#home .home-slot-number-reel{margin:5px 13px 6px!important;border-radius:11px!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;mask-image:linear-gradient(180deg,rgba(0,0,0,.34) 0%,#000 36%,#000 64%,rgba(0,0,0,.34) 100%)!important;-webkit-mask-image:linear-gradient(180deg,rgba(0,0,0,.34) 0%,#000 36%,#000 64%,rgba(0,0,0,.34) 100%)!important;pointer-events:auto!important}',
  '#home .home-slot-number-reel:first-child{transform:translateX(1px)!important}',
  '#home .home-slot-number-reel:nth-child(2){transform:translateX(0px)!important}',
  '#home .home-slot-number-reel:nth-child(4){transform:translateX(-2px)!important}',
  '#home .home-slot-number-reel:last-child{transform:translateX(-3px)!important}',
  '#home .home-slot-number-strip{position:absolute!important;left:0!important;right:0!important;top:49%!important;display:grid!important;grid-auto-rows:34px!important;will-change:transform!important;transition:none!important;pointer-events:none!important}',
  '#home .home-slot-number-reel.is-spinning .home-slot-number-strip{filter:blur(1px)!important}',
  '#home .home-slot-number-digit{height:34px!important;display:flex!important;align-items:center!important;justify-content:center!important;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter","Segoe UI",sans-serif!important;font-size:31px!important;font-weight:900!important;letter-spacing:-.045em!important;color:transparent!important;background:linear-gradient(180deg,#fff2f4 0%,#d48994 18%,#7f182b 46%,#3b0711 72%,#b94a5d 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-stroke:.35px rgba(255,205,215,.34)!important;text-shadow:0 1px 0 rgba(255,210,218,.22),0 2px 2px rgba(0,0,0,.74),0 0 12px rgba(115,10,30,.34),0 10px 20px rgba(0,0,0,.64)!important;filter:drop-shadow(0 0 7px rgba(110,7,25,.22))!important}',
  '#home .home-draw-info-card{height:68px!important;margin:0 0 12px!important;border-radius:28px!important;padding:9px 12px!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;box-sizing:border-box!important}',
  '#home .home-draw-main{min-width:0!important;flex:1 1 auto!important;display:flex!important;align-items:center!important;gap:9px!important;overflow:hidden!important}#home .home-draw-copy{min-width:98px!important;flex:0 1 106px!important;padding-left:5px!important;box-sizing:border-box!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:2px!important;white-space:nowrap!important;overflow:visible!important}.home-draw-label,.home-prize-label{color:rgba(255,255,255,.54)!important;font-size:10px!important;line-height:1!important;font-weight:900!important;letter-spacing:-.01em!important;text-transform:none!important;transform:translateY(-2px)!important}.home-draw-time{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter","Segoe UI",sans-serif!important;color:transparent!important;background:linear-gradient(180deg,#ffffff 0%,#ffffff 26%,#d9d9dd 58%,#ffffff 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-stroke:0!important;font-size:19px!important;line-height:1.08!important;font-weight:950!important;letter-spacing:.045em!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important;text-shadow:0 1px 0 rgba(255,255,255,.12),0 2px 2px rgba(0,0,0,.62)!important;filter:none!important}',
  '#home .home-draw-divider{width:1px!important;height:36px!important;flex:0 0 1px!important;transform:translateX(3px)!important;border-radius:999px!important;background:linear-gradient(180deg,rgba(255,255,255,.03),rgba(255,255,255,.20),rgba(255,255,255,.03))!important;box-shadow:0 0 10px rgba(255,255,255,.025)!important}.home-prize-copy{min-width:0!important;flex:1 1 auto!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:2px!important;overflow:hidden!important}.home-prize-value{min-width:0!important;display:flex!important;align-items:center!important;gap:0!important;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Inter","Segoe UI",sans-serif!important;font-size:19px!important;line-height:1.08!important;font-weight:950!important;letter-spacing:0!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important}.home-prize-value [data-prize-pool]{color:transparent!important;background:linear-gradient(180deg,#9b455d 0%,#741c36 26%,#4b0b20 58%,#7d263f 100%)!important;-webkit-background-clip:text!important;background-clip:text!important;-webkit-text-stroke:0!important;text-shadow:0 1px 0 rgba(164,59,89,.18),0 2px 2px rgba(0,0,0,.66)!important;filter:none!important}.home-prize-icon{width:26px!important;height:26px!important;flex:0 0 26px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}.home-prize-icon img{width:26px!important;height:26px!important;object-fit:contain!important;transform:translateY(.5px)!important}',
  '#home .home-draw-actions{display:flex!important;align-items:center!important;gap:7px!important;flex:0 0 auto!important}.home-draw-actions .home-ticket-image-button{height:38px!important;min-width:88px!important;padding:0 12px!important;border:0!important;border-radius:18px!important;background:rgba(0,0,0,.22)!important;color:#fff!important;font-size:12px!important;font-weight:950!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(255,255,255,.04)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}.home-bonus-button{width:38px!important;height:38px!important;border:0!important;border-radius:18px!important;background:rgba(0,0,0,.22)!important;color:#fff!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(255,255,255,.04)!important;display:grid!important;place-items:center!important;padding:0!important;position:relative!important;overflow:hidden!important}.home-bonus-svg{width:27px!important;height:27px!important;display:block!important;fill:none!important;stroke-linecap:round!important;stroke-linejoin:round!important;filter:drop-shadow(0 5px 10px rgba(0,0,0,.28))!important;transform-origin:center!important}.home-bonus-svg path,.home-bonus-svg rect{stroke:currentColor!important}.home-bonus-bow{transform-box:fill-box!important;transform-origin:bottom center!important}.home-bonus-button.home-action-pop{animation:none!important}.home-bonus-button.home-action-pop .home-bonus-svg{animation:homeGiftShake 1s ease-in-out both!important}.home-bonus-button.home-action-pop .home-bonus-bow{animation:homeGiftBow .8s cubic-bezier(.34,1.4,.64,1) .16s both!important}@media(hover:hover){.home-bonus-button:hover .home-bonus-svg{animation:homeGiftShake 1s ease-in-out both!important}.home-bonus-button:hover .home-bonus-bow{animation:homeGiftBow .8s cubic-bezier(.34,1.4,.64,1) .16s both!important}}@keyframes homeGiftShake{0%{transform:rotate(0)}18%{transform:rotate(-7deg)}38%{transform:rotate(6deg)}58%{transform:rotate(-4deg)}78%{transform:rotate(3deg)}100%{transform:rotate(0)}}@keyframes homeGiftBow{0%{transform:scale(1)}31%{transform:scale(1.18)}50%{transform:scale(.96)}69%{transform:scale(1.06)}100%{transform:scale(1)}}.home-action-pop{animation:homeActionPop .42s cubic-bezier(.18,.9,.22,1.25)!important;transform-origin:center!important}@keyframes homeActionPop{0%{transform:scale(1)}34%{transform:scale(.9) translateY(1px)}68%{transform:scale(1.07) translateY(-1px)}100%{transform:scale(1)}}',
  '.home-bonus-backdrop{position:fixed!important;inset:0!important;z-index:99994!important;background:rgba(0,0,0,.24)!important;opacity:0!important;visibility:hidden!important;backdrop-filter:blur(2px)!important;-webkit-backdrop-filter:blur(2px)!important;transition:opacity .24s ease,visibility 0s linear .24s!important}.home-bonus-backdrop.is-open{opacity:1!important;visibility:visible!important;transition:opacity .24s ease!important}.home-bonus-panel{position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:99995!important;max-height:min(72dvh,620px)!important;padding:10px 16px calc(18px + env(safe-area-inset-bottom))!important;border-radius:34px 34px 0 0!important;background:rgba(14,10,12,.92)!important;color:#fff!important;box-shadow:0 -18px 54px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.12)!important;backdrop-filter:blur(18px) saturate(1.12)!important;-webkit-backdrop-filter:blur(18px) saturate(1.12)!important;transform:translate3d(0,105%,0)!important;transition:transform .34s cubic-bezier(.2,.9,.26,1)!important;display:grid!important;grid-template-rows:auto auto auto minmax(0,1fr)!important;gap:12px!important;overflow:hidden!important;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Rounded","Inter","Segoe UI",sans-serif!important;letter-spacing:-.018em!important}.home-bonus-panel.is-open{transform:translate3d(0,0,0)!important}.home-bonus-grab{width:36px!important;height:4px!important;margin:0 auto 2px!important;border-radius:999px!important;background:rgba(255,255,255,.20)!important}.home-bonus-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important}.home-bonus-title{display:flex!important;align-items:center!important;gap:9px!important;min-width:0!important}.home-bonus-title svg{width:22px!important;height:22px!important;color:#e9a6b6!important;flex:0 0 auto!important}.home-bonus-head strong{font-family:inherit!important;font-size:18px!important;font-weight:800!important;letter-spacing:-.035em!important;line-height:1!important}.home-bonus-close{width:34px!important;height:34px!important;min-width:34px!important;border-radius:999px!important;border:0!important;background:rgba(255,255,255,.045)!important;color:#fff!important;display:grid!important;place-items:center!important;padding:0!important;box-sizing:border-box!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.085),inset 0 -1px 0 rgba(255,255,255,.055),0 16px 34px rgba(0,0,0,.28)!important;backdrop-filter:blur(10px) saturate(1.12)!important;-webkit-backdrop-filter:blur(10px) saturate(1.12)!important;font-family:inherit!important;font-size:24px!important;font-weight:900!important;line-height:1!important;text-align:center!important;-webkit-tap-highlight-color:transparent!important;transition:transform .18s ease,background .18s ease!important}.home-bonus-close:active{transform:scale(.92)!important}.home-bonus-next{position:relative!important;overflow:hidden!important;min-height:48px!important;display:grid!important;grid-template-columns:26px minmax(0,1fr)!important;gap:7px!important;align-items:center!important;padding:0 10px!important;border:0!important;outline:0!important;border-radius:28px!important;background:radial-gradient(34px 34px at 0 0,rgba(186,53,87,.16) 0%,rgba(146,35,66,.07) 42%,rgba(104,18,44,0) 76%),radial-gradient(36px 36px at 100% 100%,rgba(172,46,79,.15) 0%,rgba(133,30,60,.065) 43%,rgba(94,16,39,0) 78%),radial-gradient(118% 76% at 10% -16%,rgba(255,255,255,.12) 0%,rgba(255,255,255,.032) 30%,rgba(255,255,255,0) 58%),radial-gradient(96% 72% at 102% 108%,rgba(255,255,255,.052) 0%,rgba(255,255,255,.010) 34%,rgba(255,255,255,0) 62%),radial-gradient(92% 78% at 88% 112%,rgba(72,5,27,.11) 0%,rgba(42,3,16,0) 60%),#000!important;box-sizing:border-box!important;box-shadow:inset 3px 3px .5px -3.5px rgba(255,255,255,.10),inset -3px -3px .5px -3.5px rgba(156,38,70,.48),inset 1px 1px 1px -.5px rgba(140,29,61,.30),inset -1px -1px 1px -.5px rgba(124,22,53,.24),inset 0 0 6px 6px rgba(255,255,255,.055),inset 0 0 2px 2px rgba(255,255,255,.035),inset 0 1px 0 rgba(112,18,49,.065),inset 0 -1px 0 rgba(88,12,37,.15)!important;backdrop-filter:blur(22px) saturate(1.40) brightness(1.05) contrast(1.04)!important;-webkit-backdrop-filter:blur(22px) saturate(1.40) brightness(1.05) contrast(1.04)!important;isolation:isolate!important;transform:translateZ(0)!important}.home-bonus-next>svg{width:26px!important;height:26px!important;padding:4px!important;box-sizing:border-box!important;border-radius:50%!important;background:rgba(255,255,255,.08)!important;color:rgba(255,255,255,.82)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.11)!important}.home-bonus-guide-icon svg{width:20px!important;height:20px!important;color:#e9a6b6!important}.home-bonus-next span{display:block!important;color:rgba(255,255,255,.48)!important;font-size:11px!important;font-weight:700!important;line-height:1.25!important}.home-bonus-guide-copy span{display:block!important;color:rgba(255,255,255,.48)!important;font-size:10px!important;font-weight:700!important;line-height:1.25!important}.home-bonus-next b{display:block!important;margin-top:2px!important;color:#fff!important;font-size:13px!important;font-weight:800!important;line-height:1.15!important}.home-bonus-guide{display:grid!important;gap:8px!important}.home-bonus-guide-row{display:grid!important;grid-template-columns:24px minmax(0,1fr)!important;gap:9px!important;align-items:start!important}.home-bonus-guide-icon{padding-top:1px!important}.home-bonus-guide-copy b{display:block!important;margin-bottom:2px!important;color:#fff!important;font-size:12px!important;font-weight:800!important;line-height:1.2!important}.home-bonus-list{min-height:0!important;display:grid!important;grid-auto-rows:48px!important;align-content:start!important;gap:7px!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:none!important;padding:2px 0 4px!important}.home-bonus-list::-webkit-scrollbar{display:none!important}.home-bonus-row{position:relative!important;overflow:hidden!important;height:48px!important;min-height:48px!important;border:0!important;outline:0!important;border-radius:28px!important;background:radial-gradient(34px 34px at 0 0,rgba(186,53,87,.16) 0%,rgba(146,35,66,.07) 42%,rgba(104,18,44,0) 76%),radial-gradient(36px 36px at 100% 100%,rgba(172,46,79,.15) 0%,rgba(133,30,60,.065) 43%,rgba(94,16,39,0) 78%),radial-gradient(118% 76% at 10% -16%,rgba(255,255,255,.12) 0%,rgba(255,255,255,.032) 30%,rgba(255,255,255,0) 58%),radial-gradient(96% 72% at 102% 108%,rgba(255,255,255,.052) 0%,rgba(255,255,255,.010) 34%,rgba(255,255,255,0) 62%),radial-gradient(92% 78% at 88% 112%,rgba(72,5,27,.11) 0%,rgba(42,3,16,0) 60%),#000!important;box-shadow:inset 3px 3px .5px -3.5px rgba(255,255,255,.10),inset -3px -3px .5px -3.5px rgba(156,38,70,.48),inset 1px 1px 1px -.5px rgba(140,29,61,.30),inset -1px -1px 1px -.5px rgba(124,22,53,.24),inset 0 0 6px 6px rgba(255,255,255,.055),inset 0 0 2px 2px rgba(255,255,255,.035),inset 0 1px 0 rgba(112,18,49,.065),inset 0 -1px 0 rgba(88,12,37,.15)!important;color:#fff!important;display:grid!important;grid-template-columns:26px minmax(0,1fr) auto!important;align-items:center!important;gap:7px!important;padding:0 10px!important;box-sizing:border-box!important;backdrop-filter:blur(22px) saturate(1.40) brightness(1.05) contrast(1.04)!important;-webkit-backdrop-filter:blur(22px) saturate(1.40) brightness(1.05) contrast(1.04)!important;isolation:isolate!important;transform:translateZ(0)!important}.home-bonus-rank-avatar{width:26px!important;height:26px!important;border-radius:50%!important;display:grid!important;place-items:center!important;overflow:hidden!important;background:rgba(255,255,255,.08)!important;color:rgba(255,255,255,.82)!important;font-size:10.5px!important;font-weight:800!important;line-height:1!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.11)!important}.home-bonus-row .home-live-winner-user{min-width:0!important;display:flex!important;align-items:center!important}.home-bonus-row .home-live-winner-user span{display:block!important;color:#fff!important;font-size:12px!important;font-weight:800!important;line-height:1.08!important}.home-bonus-row .home-live-winner-amount{color:rgba(255,255,255,.34)!important;font-size:12px!important;font-weight:750!important;white-space:nowrap!important}.home-bonus-prize-amount{display:inline-flex!important;align-items:center!important;gap:2px!important}.home-bonus-prize-icon{width:20px!important;height:20px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 20px!important}.home-bonus-prize-icon img{width:20px!important;height:20px!important;display:block!important;object-fit:contain!important}',
  '.home-ticket-drawer{background:rgba(13,13,13,.54)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.105),inset 0 -1px 0 rgba(255,255,255,.06),inset 0 0 22px rgba(255,255,255,.055),0 16px 36px rgba(0,0,0,.22)!important;backdrop-filter:blur(10px) saturate(1.12)!important;-webkit-backdrop-filter:blur(10px) saturate(1.12)!important}',
  '.home-ticket-list-item{height:44px!important;border-radius:18px!important;background:rgba(0,0,0,.22)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(255,255,255,.04)!important;color:#fff!important;font-weight:950!important}',
  '.vexa-confetti-layer{position:fixed!important;inset:0!important;z-index:999999!important;pointer-events:none!important;overflow:hidden!important;opacity:1!important;transition:opacity 420ms ease!important}',
  '.vexa-confetti-layer.is-ending{opacity:0!important}',
  '.vexa-confetti-piece{position:absolute!important;top:var(--y)!important;left:var(--x)!important;width:var(--w)!important;height:var(--h)!important;border-radius:var(--r)!important;background:var(--c)!important;opacity:.94;transform-origin:center!important;animation:vexaConfettiFall 6000ms linear 0ms forwards!important;box-shadow:0 0 9px rgba(255,210,90,.18)!important}',
  '@keyframes vexaConfettiFall{0%{transform:translate3d(0,-42px,0) rotate(0deg)}78%{transform:translate3d(var(--ex),172vh,0) rotate(var(--r3))}100%{transform:translate3d(var(--ex),230vh,0) rotate(var(--r3))}}'
].join('');

export const HOME_STYLES = HOME_BASE_STYLES + HOME_MARKUP_STYLES + HOME_SLOT_STYLES;

// Home owns its markup, styles, asset synchronization, and client behavior.
export const HOME_SECTION = `<section id="home" class="view active"><section id="homePromoCarousel" class="home-promo-carousel" aria-label="Featured"></section></section>`;

const HOME_MARKUP_SCRIPT = `
(function(){
  function q(s,r){return (r||document).querySelector(s)}
  function lotteryText(key){
    var all=window.__vexaLotteryTexts||{},tg=window.Telegram&&window.Telegram.WebApp,user=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user||{},code=String(user.language_code||navigator.language||'en').replace('_','-');
    var aliases={pt:'pt-BR','pt-PT':'pt-BR',zh:'zh-Hant','zh-TW':'zh-Hant','zh-HK':'zh-Hant','zh-MO':'zh-Hant'};
    var country=String(window.VexaDetectedCountryCode||'').trim().toUpperCase(),countryLocale=String((window.__vexaCountryLocales||{})[country]||'');
    var locale=all[countryLocale]?countryLocale:(all[code]?code:(aliases[code]||aliases[code.split('-')[0]]||code.split('-')[0]));
    return String((all[locale]&&all[locale][key])||(all.en&&all.en[key])||'');
  }
  window.VexaLotteryText=lotteryText;
  function reelY(index){return 'translate3d(0,-'+((index*40)+20)+'px,0)'}
  function reelDigitsHtml(){var html='';for(var cycle=0;cycle<4;cycle++)for(var n=0;n<10;n++)html+='<span class="home-slot-number-digit">'+n+'</span>';return html}
  function slotsHtml(){var html='';for(var i=0;i<5;i++){var v=0;html+='<div class="home-slot-number-reel" data-slot-index="'+i+'" data-slot-value="'+v+'"><div class="home-slot-number-strip" data-slot-strip style="transform:'+reelY(20+v)+'">'+reelDigitsHtml()+'</div></div>'}return '<div class="home-slot-number-grid" aria-hidden="true">'+html+'</div>'}
  function placeSection(home,sec){var promo=q('#homePromoCarousel',home),anchor=promo?promo.nextSibling:home.firstChild;if(anchor!==sec)home.insertBefore(sec,anchor)}
  function ensureDrawerPortal(sec){['homeTicketDrawerBackdrop','homeTicketDrawer'].forEach(function(id){var el=q('#'+id,sec);if(el&&el.parentNode!==document.body)document.body.appendChild(el)})}
  function setDrawer(open,sec){ensureDrawerPortal(sec);var drawer=q('#homeTicketDrawer'),backdrop=q('#homeTicketDrawerBackdrop');if(drawer)drawer.classList.toggle('is-open',!!open);if(backdrop)backdrop.classList.toggle('is-open',!!open)}
  function build(){
    var home=q('#home');if(!home)return null;
    var sec=q('#homeLuckyCodeSection',home);
    if(!sec){
      sec=document.createElement('section');
      sec.id='homeLuckyCodeSection';
      sec.innerHTML='<div class="home-ticket-drawer-backdrop" id="homeTicketDrawerBackdrop"></div><div class="home-ticket-drawer" id="homeTicketDrawer"><div class="home-ticket-drawer-head"><strong>My Tickets</strong><button class="home-ticket-drawer-close" id="homeTicketDrawerClose" type="button">×</button></div><div class="home-ticket-drawer-count"><strong data-ticket-count>0 tickets</strong><span class="home-ticket-win-chance-text"><span data-win-chance-label>Your chance to win</span><b data-win-chance>0%</b></span></div><div class="home-ticket-list" id="homeTicketList"></div></div><div class="home-lucky-card"><div class="home-lucky-head" aria-hidden="true"></div><section class="home-lottery-slot-card" aria-label="Lottery slot image"><img class="home-lottery-slot-image" src="/app/api/home-lottery-slot.png?v=home-lottery" alt="" decoding="async" loading="eager"/>'+slotsHtml()+'</section><div class="home-ticket-layout"><div class="home-ticket-card"><div class="home-ticket-count" data-ticket-count>1 ticket</div><div class="home-ticket-stepper"><button class="home-ticket-step" type="button" data-ticket-minus>-</button><button class="home-ticket-step" type="button" data-ticket-plus>+</button></div><button class="home-ticket-button" id="homeTicketButton" type="button">Get Ticket</button></div><div class="home-ticket-finance-visual" aria-hidden="true"></div></div></div>';
    }
    placeSection(home,sec);
    ensureDrawerPortal(sec);
    return sec;
  }
  function bind(sec){
    if(sec.dataset.ticketUiBound==='1')return;
    sec.dataset.ticketUiBound='1';
    sec.addEventListener('click',function(e){var t=e.target;if(t&&t.id==='homeTicketImageButton'){e.preventDefault();setDrawer(true,sec)}},true);
    document.addEventListener('click',function(e){var t=e.target;if(t&&t.id==='homeTicketDrawerClose'){e.preventDefault();setDrawer(false,sec);return}if(t&&t.id==='homeTicketDrawerBackdrop'){e.preventDefault();setDrawer(false,sec)}},true);
  }
  function init(){var sec=build();if(sec)bind(sec)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
`;

const HOME_SLOT_SCRIPT = `
(function(){
  var busy=false,row=34,restLoop=20,spinLoops=25,totalSpinMs=6000,reelStopGapMs=3000;
  function q(s,r){return (r||document).querySelector(s)}
  function qa(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))}
  function y(i){return 'translate3d(0,-'+((i*row)+(row/2))+'px,0)'}
  function digits(){var h='';for(var c=0;c<90;c++)for(var n=0;n<10;n++)h+='<span class="home-slot-number-digit">'+n+'</span>';return h}
  function indexFor(v,loop){return loop*10+Math.max(0,Math.min(9,Math.floor(Number(v)||0)))}
  function enableHomeScroll(){var h=q('#home');document.body.classList.remove('home-scroll-locked');if(h){h.style.removeProperty('overflow-y');h.style.removeProperty('touch-action');h.scrollLeft=0}}
  function drawInfoHtml(){return '<div class="home-draw-info-card" id="homeDrawInfoCard"><div class="home-draw-main"><div class="home-draw-copy"><span class="home-draw-label">Next Draw in</span><strong class="home-draw-time" data-draw-time>00:00:00</strong></div><span class="home-draw-divider" aria-hidden="true"></span><div class="home-prize-copy"><span class="home-prize-label">Prize Pool</span><strong class="home-prize-value"><span data-prize-pool>0.00</span><span class="home-prize-icon ton-mini-icon"><img data-prize-pool-icon alt="" aria-hidden="true" style="display:none"></span></strong></div></div><div class="home-draw-actions" id="homeDrawActions"><button class="home-ticket-image-button" id="homeTicketImageButton" type="button">My Tickets</button><button class="home-bonus-button" id="homeBonusButton" type="button" aria-label="Lottery"><svg class="home-bonus-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="8" width="18" height="4" rx="1" stroke="currentColor" stroke-width="1.65"/><path d="M12 8v13" stroke="currentColor" stroke-width="1.65"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" stroke="currentColor" stroke-width="1.65"/><g class="home-bonus-bow"><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" stroke="currentColor" stroke-width="1.65"/></g></svg></button></div></div>'}
  function ensureBonusPanel(){
    if(q('#homeBonusPanel'))return;
    var wrap=document.createElement('div');
    wrap.innerHTML='<div class="home-bonus-backdrop" id="homeBonusBackdrop"></div><section class="home-bonus-panel" id="homeBonusPanel" role="dialog" aria-modal="true" aria-label="Lottery"><div class="home-bonus-grab" aria-hidden="true"></div><header class="home-bonus-head"><div class="home-bonus-title"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9h12v10H6zM4 6h16v3H4zM12 6v13M11.8 5.9C9 5.7 7.2 4.4 7.2 2.9c0-1.1.9-1.8 1.9-1.6 1.5.3 2.4 1.9 2.7 4.6ZM12.2 5.9c2.8-.2 4.6-1.5 4.6-3 0-1.1-.9-1.8-1.9-1.6-1.5.3-2.4 1.9-2.7 4.6Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><strong data-lottery-title></strong></div><button class="home-bonus-close" id="homeBonusClose" type="button" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style="width:18px;height:18px;display:block"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></header><div class="home-bonus-next"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" stroke-width="1.7"/><path d="M8 3v4m8-4v4M4 10h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><div><span data-lottery-draw-label></span><b data-lottery-draw-at>—</b></div></div><div class="home-bonus-guide"><div class="home-bonus-guide-row"><div class="home-bonus-guide-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="home-bonus-guide-copy"><b data-lottery-how-title></b><span data-lottery-ticket-note></span></div></div><div class="home-bonus-guide-row"><div class="home-bonus-guide-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 14.5 8l5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></div><div class="home-bonus-guide-copy"><b data-lottery-prize-title></b><span data-lottery-prize-note></span></div></div></div><div class="home-bonus-list" aria-live="polite"></div></section>';
    while(wrap.firstChild)document.body.appendChild(wrap.firstChild);
  }
  function setBonusPanel(open){ensureBonusPanel();var d=q('#homeBonusPanel'),b=q('#homeBonusBackdrop');if(d)d.classList.toggle('is-open',!!open);if(b)b.classList.toggle('is-open',!!open)}
  function tapAction(el){if(!el)return;el.classList.remove('home-action-pop');void el.offsetWidth;el.classList.add('home-action-pop');setTimeout(function(){try{el.classList.remove('home-action-pop')}catch(e){}},440)}
  function ensureDrawInfoCard(){var slot=q('#home .home-lottery-slot-card');if(!slot)return;var card=q('#homeDrawInfoCard');if(!card)slot.insertAdjacentHTML('beforebegin',drawInfoHtml());ensureBonusPanel()}
  function prepare(){
    enableHomeScroll();ensureDrawInfoCard();
    qa('#home .home-slot-number-reel').forEach(function(reel){
      var strip=q('[data-slot-strip]',reel);if(!strip)return;
      if(strip.dataset.tuned!=='3'){strip.innerHTML=digits();strip.dataset.tuned='3'}
      var v=Math.max(0,Math.min(9,Math.floor(Number(reel.getAttribute('data-slot-value')||'0'))));
      strip.style.setProperty('transition','none','important');strip.style.transform=y(indexFor(v,restLoop));strip.style.willChange='auto';
    });
  }
  function confetti(){
    var old=q('.vexa-confetti-layer');if(old)old.remove();
    var layer=document.createElement('div');layer.className='vexa-confetti-layer';document.body.appendChild(layer);
    var colors=['#ffd36a','#f5b33d','#ffe9a8','#c7892f','#fff4cf','#e0a43a'];
    for(var i=0;i<72;i++){
      var p=document.createElement('i');p.className='vexa-confetti-piece';
      var x=Math.random()*100,wind=(Math.random()*64)-32,w=3+Math.random()*9,h=5+Math.random()*14;
      p.style.setProperty('--y',(-8-Math.random()*150)+'vh');p.style.setProperty('--x',x+'vw');p.style.setProperty('--w',w+'px');p.style.setProperty('--h',h+'px');p.style.setProperty('--r',(Math.random()>.72?'999px':'2px'));p.style.setProperty('--c',colors[Math.floor(Math.random()*colors.length)]);p.style.setProperty('--ex',wind+'vw');p.style.setProperty('--r3',(960+Math.random()*960)+'deg');
      layer.appendChild(p);
    }
    setTimeout(function(){layer.classList.add('is-ending')},3500);
    setTimeout(function(){layer.remove()},4000);
  }
  function cleanSpinCode(code){var value=String(code||'').replace(/[^0-9]/g,'');return value.length===5?value:''}
  function setCode(code){
    var clean=cleanSpinCode(code);if(!clean||busy)return false;prepare();
    qa('#home .home-slot-number-reel').slice(0,5).forEach(function(reel,i){var strip=q('[data-slot-strip]',reel);if(!strip)return;var final=Number(clean.charAt(i));reel.setAttribute('data-slot-value',String(final));strip.style.setProperty('transition','none','important');strip.style.transform=y(indexFor(final,restLoop));strip.style.willChange='auto';reel.classList.remove('is-spinning')});
    return true;
  }
  function spin(targetCode,onComplete){
    if(busy)return false;prepare();busy=true;
    var clean=cleanSpinCode(targetCode);
    var reels=qa('#home .home-slot-number-reel').slice(0,5),pending=reels.length;
    if(!pending){busy=false;return false}
    reels.forEach(function(reel,i){
      var strip=q('[data-slot-strip]',reel);if(!strip){pending--;return}
      var current=Math.max(0,Math.min(9,Math.floor(Number(reel.getAttribute('data-slot-value')||'0'))));
      var final=clean?Number(clean.charAt(i)):Math.floor(Math.random()*10),loops=spinLoops+i*2,finalIndex=indexFor(final,restLoop+loops);
      reel.setAttribute('data-slot-value',String(final));
      strip.style.setProperty('transition','none','important');strip.style.transform=y(indexFor(current,restLoop));strip.style.willChange='transform';reel.classList.add('is-spinning');
      setTimeout(function(){strip.style.setProperty('transition','transform '+(totalSpinMs+i*reelStopGapMs)+'ms linear','important');strip.style.transform=y(finalIndex)},30+i*60);
      setTimeout(function(){strip.style.setProperty('transition','none','important');strip.style.transform=y(indexFor(final,restLoop));strip.style.willChange='auto';reel.classList.remove('is-spinning');pending--;if(pending<=0){busy=false;if(typeof onComplete==='function'){try{onComplete()}catch(e){}}}},totalSpinMs+i*reelStopGapMs+260);
    });
    return true;
  }
  window.VexaLotteryWinnerEffect=confetti;
  window.VexaLotterySlotEngine={spinTo:spin,setCode:setCode,durationMs:totalSpinMs+(4*reelStopGapMs)+260};
  document.addEventListener('click',function(e){
    var t=e.target,my=t&&t.closest&&t.closest('#homeTicketImageButton');
    if(my)tapAction(my);
    var bonus=t&&t.closest&&t.closest('#homeBonusButton');
    if(bonus){tapAction(bonus);e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();setBonusPanel(true);return}
    var close=t&&t.closest&&t.closest('#homeBonusClose');
    if(close){e.preventDefault();setBonusPanel(false);return}
    if(t&&t.id==='homeBonusBackdrop'){e.preventDefault();setBonusPanel(false)}
  },true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',prepare,{once:true});else prepare();
  window.addEventListener('focus',prepare);
})();
`;

const HOME_ASSET_SCRIPT = `
(function(){
  var tonLogoAppliedUrl='';
  var tonLogoInFlight=null;
  var tonLogoCheckedAt=0;
  var META_CACHE_MS=300000;
  var TON_META_KEY='vexaTonLogoMeta:v1';
  var promoTimer=0,promoLoopTimer=0,promoIndex=0,promoCount=0,promoHost=null,promoTrack=null,promoLoaded=false,promoInFlight=null;
  function applyTonLogo(url){if(!url)return;tonLogoAppliedUrl=url;var icons=document.querySelectorAll('.ton-mini-icon img');for(var i=0;i<icons.length;i++){if(icons[i].getAttribute('src')!==url)icons[i].setAttribute('src',url)}}
  function readMeta(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch(e){return null}}
  function saveMeta(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch(e){}}
  function loadTonLogo(force){
    try{
      var cached=readMeta(TON_META_KEY);if(cached&&cached.url){applyTonLogo(cached.url);tonLogoCheckedAt=Math.max(tonLogoCheckedAt,Number(cached.checkedAt)||0)}
      var now=Date.now();if(!force&&tonLogoAppliedUrl&&tonLogoCheckedAt&&now-tonLogoCheckedAt<META_CACHE_MS)return Promise.resolve(cached);
      if(tonLogoInFlight)return tonLogoInFlight;
      tonLogoInFlight=fetch('/app/api/uploaded-images?context=home',{cache:'no-store',headers:{'accept':'application/json'}})
        .then(function(r){return r.ok?r.json():null})
        .then(function(meta){tonLogoCheckedAt=Date.now();if(meta&&meta.tonIconUrl){var next={url:meta.tonIconUrl,checkedAt:tonLogoCheckedAt};saveMeta(TON_META_KEY,next);applyTonLogo(meta.tonIconUrl);return next}return meta})
        .catch(function(){return cached})
        .finally(function(){tonLogoInFlight=null});
      return tonLogoInFlight;
    }catch(e){return Promise.resolve(null)}
  }
  function clearPromoTimer(){if(promoTimer){clearTimeout(promoTimer);promoTimer=0}}
  function clearPromoLoopTimer(){if(promoLoopTimer){clearTimeout(promoLoopTimer);promoLoopTimer=0}}
  function promoImageUrl(slot){return '/app/api/section-background/promo-'+slot+'.png'}
  function loadPromoImage(slot){
    return new Promise(function(resolve){
      var img=new Image();
      img.alt='';img.decoding='async';img.loading='eager';img.draggable=false;
      try{img.fetchPriority=slot===1?'high':'auto'}catch(e){}
      var done=false,finish=function(value){if(done)return;done=true;resolve(value)};
      img.addEventListener('load',function(){finish(img)},{once:true});
      img.addEventListener('error',function(){finish(null)},{once:true});
      img.src=promoImageUrl(slot);
    });
  }
  function syncPromoHeight(){
    if(!promoHost||!promoTrack||!promoCount)return;
    var slide=promoTrack.children[Math.min(promoIndex,promoCount)]||promoTrack.children[0];
    if(!slide)return;
    var h=Math.ceil(slide.getBoundingClientRect().height||0);
    if(h>0)promoHost.style.height=h+'px';
  }
  function setPromoTransform(animate){
    if(!promoTrack)return;
    if(animate)promoTrack.classList.remove('is-jumping');else promoTrack.classList.add('is-jumping');
    var slide=promoTrack.children[Math.min(promoIndex,promoTrack.children.length-1)]||promoTrack.children[0];
    var offset=slide?Math.round(Number(slide.offsetLeft)||0):0;
    promoTrack.style.transform='translate3d(-'+offset+'px,0,0)';
    syncPromoHeight();
    if(!animate){var track=promoTrack;void track.offsetWidth;(window.requestAnimationFrame||function(cb){return setTimeout(cb,0)})(function(){if(promoTrack===track)track.classList.remove('is-jumping')})}
  }
  function finishPromoLoop(){
    clearPromoLoopTimer();
    if(!promoTrack||promoCount<2||promoIndex!==promoCount)return;
    promoIndex=0;setPromoTransform(false);
  }
  function schedulePromo(){
    clearPromoTimer();
    if(!promoTrack||promoCount<2||document.hidden)return;
    promoTimer=setTimeout(function(){
      promoTimer=0;if(!promoTrack||document.hidden)return;
      promoIndex+=1;setPromoTransform(true);
      if(promoIndex===promoCount){
        var track=promoTrack,onEnd=function(event){if(event&&event.target!==track)return;track.removeEventListener('transitionend',onEnd);if(promoTrack===track)finishPromoLoop()};
        track.addEventListener('transitionend',onEnd);
        clearPromoLoopTimer();promoLoopTimer=setTimeout(function(){try{track.removeEventListener('transitionend',onEnd)}catch(e){}finishPromoLoop()},1800);
      }
      schedulePromo();
    },10000);
  }
  function renderHomePromos(images){
    clearPromoTimer();clearPromoLoopTimer();
    promoHost=document.getElementById('homePromoCarousel');if(!promoHost)return;
    var available=(Array.isArray(images)?images:[]).filter(function(img){return !!img}).slice(0,3);
    promoHost.innerHTML='';promoIndex=0;promoCount=available.length;promoTrack=null;
    if(!promoCount){promoHost.classList.remove('is-ready');promoHost.style.height='0px';return}
    var track=document.createElement('div');track.className='home-promo-track';
    available.forEach(function(img){var slide=document.createElement('div');slide.className='home-promo-slide';slide.appendChild(img);track.appendChild(slide)});
    if(promoCount>1){var first=track.firstElementChild,clone=first&&first.cloneNode(true);if(clone){clone.setAttribute('aria-hidden','true');track.appendChild(clone)}}
    promoTrack=track;promoHost.appendChild(track);promoHost.classList.add('is-ready');
    (window.requestAnimationFrame||function(cb){return setTimeout(cb,0)})(function(){syncPromoHeight();schedulePromo()});
  }
  function loadHomePromos(force){
    if(promoInFlight)return promoInFlight;
    if(promoLoaded&&!force)return Promise.resolve(true);
    promoInFlight=Promise.all([1,2,3].map(loadPromoImage)).then(function(images){promoLoaded=true;renderHomePromos(images);return true}).catch(function(){promoLoaded=true;renderHomePromos([]);return false}).finally(function(){promoInFlight=null});
    return promoInFlight;
  }
  function apply(){loadTonLogo(false);loadHomePromos(false)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
  document.addEventListener('visibilitychange',function(){if(document.hidden){clearPromoTimer();clearPromoLoopTimer()}else schedulePromo()});
  window.addEventListener('resize',function(){(window.requestAnimationFrame||function(cb){return setTimeout(cb,0)})(function(){setPromoTransform(false)})},{passive:true});
  window.VexaRefreshHomeLotteryChrome=apply;window.VexaRefreshTonLogo=function(){return loadTonLogo(true)};
})();
`;

const HOME_LOTTERY_CLIENT_SCRIPT = `
(function(){
  var state=null,busy=false,loading=false,quantity=1,MAX_QTY=60,serverOffsetMs=0,clockTimer=0,drawRefreshPending=false;
  var lifecycleTimer=0,lifecycleRetryMs=800,lastLoadAt=0;
  var winnerEffectDrawId='',drawSpinTimer=0,scheduledDrawId='',resultResetTimer=0;
  var officialSpinActive=false,suppressedWindowFocus=false;
  var ticketAudioCtx=null;
  var heightObserver=null,observedTicket=null,renderedWinnersList=null,renderedWinnersHtml='';
  var prizePoolAnimations=[],prizePoolAnimationTargetNano=0,prizePoolPendingNano=null,displayedPrizePoolNano=0,displayedPrizePoolReady=false,displayedPrizePoolRoundId='';
  var DRAW_DELAY_MS=5000,DRAW_ANIMATION_MS=18260,NEXT_ROUND_DELAY_MS=10000;
  var initialHydrationPending=true,INITIAL_STATE_TIMEOUT_MS=6000;
  function q(s,r){return (r||document).querySelector(s)}
  function initData(){var tg=window.Telegram&&window.Telegram.WebApp;return String(tg&&tg.initData||'')}
  function markHomeHydrated(status){
    if(!initialHydrationPending)return;
    initialHydrationPending=false;
    window.__vexaHomeHydrated=true;
    window.__vexaHomeHydrationStatus=String(status||'ready');
    try{window.dispatchEvent(new CustomEvent('vexa:home-hydrated',{detail:{status:window.__vexaHomeHydrationStatus}}))}catch(e){}
  }
  function requestLotteryState(data){
    var controller=typeof AbortController==='function'?new AbortController():null;
    var options={cache:'no-store',headers:{'accept':'application/json','x-telegram-init-data':data}};
    if(controller)options.signal=controller.signal;
    if(!initialHydrationPending)return fetch('/app/api/lottery/state',options);
    var timer=0;
    var deadline=new Promise(function(resolve,reject){timer=setTimeout(function(){try{if(controller)controller.abort()}catch(e){}reject(new Error('Lottery unavailable'))},INITIAL_STATE_TIMEOUT_MS)});
    return Promise.race([fetch('/app/api/lottery/state',options),deadline]).finally(function(){if(timer)clearTimeout(timer)});
  }
  function gram(nano){var value=Math.max(0,Number(nano)||0)/1000000000;return value.toFixed(2).replace(/\\.00$/,'').replace(/(\\.\\d)0$/,'$1')}
  function winnerGram(nano){var value=Math.max(0,Number(nano)||0)/1000000000;if(value>=1000)return value.toLocaleString('en-US',{maximumFractionDigits:1});if(value>=10)return value.toFixed(1).replace(/\\.0$/,'');return value.toFixed(2).replace(/0+$/,'').replace(/\\.$/,'')}
  function gramPrice(nano){var value=Math.max(0,Number(nano)||0)/1000000000,text=value.toFixed(4).replace(/0+$/,'');var dot=text.indexOf('.');if(dot<0)return text+'.00';var decimals=text.length-dot-1;if(decimals===0)return text+'00';if(decimals===1)return text+'0';return text}
  function esc(v){return String(v==null?'':v).replace(/[&<>\"]/g,function(c){return c==='&'?'&amp;':c==='<'?'&lt;':c==='>'?'&gt;':'&quot;'})}
  function cleanWinnerCount(value){var count=Math.floor(Number(value)||0);return Math.max(0,Math.min(3,count))}
  function winnerMap(winners,count){var map={},limit=cleanWinnerCount(count);(Array.isArray(winners)?winners:[]).forEach(function(item){var rank=Math.floor(Number(item&&item.rank)||0);if(rank>=1&&rank<=limit)map[rank]=item});return map}
  function displayName(item){var name=String(item&&item.displayName||'').trim();return esc(name||'Player')}
  function winnerAvatar(item,rank){var raw=String(item&&item.avatarUrl||'').trim(),url='';try{var parsed=new URL(raw);if(parsed.protocol==='https:')url=parsed.href}catch(e){}return '<div class="home-lottery-winner-avatar">'+(url?'<img src="'+esc(url)+'" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':esc('#'+rank))+'</div>'}
  function winnerRow(rank,item,waiting){var name,amount,face;if(waiting){name='Waiting for draw';amount='—';face='<div class="home-lottery-winner-avatar">#'+rank+'</div>'}else if(!item){name='No results this round';amount='—';face='<div class="home-lottery-winner-avatar">#'+rank+'</div>'}else{name=displayName(item);amount='+'+winnerGram(item.prizeNano)+' GRAM';face=winnerAvatar(item,rank)}return '<article class="home-lottery-winner-row">'+face+'<div class="home-lottery-winner-copy"><div class="home-lottery-winner-name">'+name+'</div><div class="home-lottery-winner-amount">'+esc(amount)+'</div></div><div class="home-lottery-winner-rank">'+rank+'</div></article>'}
  function winnersHost(){return q('#home .home-ticket-finance-visual')}
  function syncWinnerHeight(){var card=winnersHost(),ticket=q('#home .home-ticket-layout>.home-ticket-card:not(.home-ticket-finance-visual)');if(!card||!ticket)return;var h=Math.ceil(ticket.getBoundingClientRect().height||0);if(h>0)card.style.setProperty('--home-lottery-winners-height',Math.max(154,h)+'px')}
  function watchWinnerHeight(){var ticket=q('#home .home-ticket-layout>.home-ticket-card:not(.home-ticket-finance-visual)');if(!ticket)return;if(observedTicket===ticket){syncWinnerHeight();return}if(heightObserver){heightObserver.disconnect();heightObserver=null}observedTicket=ticket;syncWinnerHeight();if(window.ResizeObserver){heightObserver=new ResizeObserver(function(){syncWinnerHeight()});heightObserver.observe(ticket)}}
  function updateWinnerFade(list){if(!list)return;var max=Math.max(0,list.scrollHeight-list.clientHeight),overflow=max>2;list.classList.toggle('has-overflow',overflow);list.classList.toggle('is-scrolled',overflow&&list.scrollTop>2);list.classList.toggle('is-at-bottom',overflow&&list.scrollTop>=max-2)}
  function ensureWinnersSurface(){var card=winnersHost();if(!card)return null;card.removeAttribute('aria-hidden');card.classList.remove('home-ticket-card');var surface=q(':scope>.home-lottery-winners',card);if(!surface){card.innerHTML='<section class="home-lottery-winners" aria-label="Lottery results"><div class="home-lottery-winners-title"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" stroke="currentColor" stroke-width="1.8"/><path d="M8 6H5v1a4 4 0 0 0 4 4M16 6h3v1a4 4 0 0 1-4 4M12 13v4M8.5 20h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span data-lottery-winners-title>Previous Winners</span></div><div class="home-lottery-winners-list"></div></section>';surface=q(':scope>.home-lottery-winners',card)}var list=surface&&q('.home-lottery-winners-list',surface);if(list&&list.dataset.winnersScrollBound!=='1'){list.dataset.winnersScrollBound='1';list.addEventListener('scroll',function(){updateWinnerFade(list)},{passive:true})}watchWinnerHeight();return list}
  function renderWinners(){var list=ensureWinnersSurface();if(!list)return;if((state&&state.waitingForWinner)||officialSpinActive||scheduledDrawId){updateWinnerFade(list);return}var limit=cleanWinnerCount(state&&state.winnerCount),map=winnerMap(state&&state.winners,limit),html='',waiting=false;for(var rank=1;rank<=limit;rank++)html+=winnerRow(rank,map[rank],waiting);if(renderedWinnersList===list&&renderedWinnersHtml===html){updateWinnerFade(list);return}list.innerHTML=html;renderedWinnersList=list;renderedWinnersHtml=html;(window.requestAnimationFrame||function(cb){return setTimeout(cb,0)})(function(){updateWinnerFade(list)})}
  function purchaseId(){
    try{if(crypto&&crypto.randomUUID)return 'lp_'+crypto.randomUUID().replace(/-/g,'')}catch(e){}
    try{var bytes=new Uint8Array(12);crypto.getRandomValues(bytes);return 'lp_'+Array.prototype.map.call(bytes,function(v){return v.toString(16).padStart(2,'0')}).join('')}catch(e){}
    return 'lp_'+Date.now().toString(36)
  }
  function haptic(kind){try{var tg=window.Telegram&&window.Telegram.WebApp;if(tg&&tg.HapticFeedback){if(kind==='success'||kind==='error')tg.HapticFeedback.notificationOccurred(kind);else tg.HapticFeedback.impactOccurred(kind||'light')}}catch(e){}}
  function ticketAudio(){try{var AudioCtor=window.AudioContext||window.webkitAudioContext;if(!AudioCtor)return null;if(!ticketAudioCtx)ticketAudioCtx=new AudioCtor({latencyHint:'interactive'});if(ticketAudioCtx.state==='suspended')ticketAudioCtx.resume().catch(function(){});return ticketAudioCtx}catch(e){return null}}
  function ticketTone(fromHz,toHz,delayMs,durationMs,peak){var ctx=ticketAudio();if(!ctx)return;try{var start=ctx.currentTime+(Math.max(0,Number(delayMs)||0)/1000),duration=Math.max(.045,(Number(durationMs)||82)/1000),end=start+duration,attack=Math.min(.014,duration*.28);var osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.setValueAtTime(Math.max(40,Number(fromHz)||680),start);osc.frequency.exponentialRampToValueAtTime(Math.max(40,Number(toHz)||760),end);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.008,Number(peak)||.034),start+attack);gain.gain.exponentialRampToValueAtTime(.0001,end);osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(end+.014)}catch(e){}}
  function ticketSound(kind){if(kind==='plus'){ticketTone(680,820,0,82,.038);return}if(kind==='minus'){ticketTone(640,540,0,84,.036);return}ticketTone(650,780,0,86,.034);ticketTone(780,920,64,96,.030)}
  function openTicketWallet(){var trigger=document.querySelector('[data-view="wallet"]');if(trigger&&typeof trigger.click==='function'){trigger.click();return true}return false}
  function syncServerClock(payload,requestStartedAt,receivedAt){var serverNow=Number(payload&&payload.serverNowMs);if(!Number.isFinite(serverNow)||serverNow<=0)return;var started=Number(requestStartedAt)||receivedAt,total=Math.max(0,receivedAt-started),serverStarted=Number(payload&&payload.serverStartedAtMs);var processing=Number.isFinite(serverStarted)&&serverStarted>0?Math.max(0,serverNow-serverStarted):0;var transitRtt=Math.max(0,total-processing);serverOffsetMs=(serverNow+(transitRtt/2))-receivedAt;window.VexaLotteryServerOffsetMs=serverOffsetMs}
  function liveServerNow(){return Date.now()+serverOffsetMs}
  function roundTime(name,fallback){var round=state&&state.round,raw=round&&round[name],value=Date.parse(String(raw||''));if(Number.isFinite(value))return value;var drawAt=Date.parse(String(round&&round.drawAt||''));return Number.isFinite(drawAt)?drawAt+(Number(fallback)||0):0}
  function formatCountdown(ms){var s=Math.max(0,Math.floor(ms/1000)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0')}
  function lifecycleDueTime(){var round=state&&state.round;if(!round)return 0;if(round.status==='open')return roundTime('drawAt',0);var winnerAt=Math.max(0,Number(state&&state.winnerDisplayAtMs)||0);if(state&&state.waitingForWinner&&winnerAt)return winnerAt;return roundTime('nextRoundStartsAt',DRAW_DELAY_MS+DRAW_ANIMATION_MS+NEXT_ROUND_DELAY_MS)}
  function clearLifecycleTimer(){if(lifecycleTimer){clearTimeout(lifecycleTimer);lifecycleTimer=0}}
  function scheduleLifecycleRefresh(delay){clearLifecycleTimer();lifecycleTimer=setTimeout(function(){lifecycleTimer=0;refreshLifecycle()},Math.max(80,Math.floor(Number(delay)||0)))}
  function armLifecycle(){clearLifecycleTimer();var due=lifecycleDueTime();if(!due)return;var now=liveServerNow();if(due>now){lifecycleRetryMs=800;scheduleLifecycleRefresh(due-now+80);return}scheduleLifecycleRefresh(lifecycleRetryMs)}
  function refreshLifecycle(){if(drawRefreshPending||busy||loading){if(!lifecycleTimer)scheduleLifecycleRefresh(lifecycleRetryMs);return}drawRefreshPending=true;load(true).finally(function(){drawRefreshPending=false})}
  function updateCountdown(){var round=state&&state.round,time=q('#homeDrawInfoCard [data-draw-time]'),now=liveServerNow();if(!round){if(time)time.textContent='00:00:00';return}var drawAt=roundTime('drawAt',0);if(round.status==='open'){if(drawAt&&now<drawAt){if(time)time.textContent=formatCountdown(drawAt-now);return}if(time)time.textContent='00:00:00';if(!lifecycleTimer&&!drawRefreshPending&&!loading)scheduleLifecycleRefresh(80);return}if(time)time.textContent='00:00:00';var due=lifecycleDueTime();if(due&&now>=due&&!lifecycleTimer&&!drawRefreshPending&&!loading)scheduleLifecycleRefresh(80)}
  function listHtml(tickets){if(!tickets||!tickets.length)return '<div class="home-ticket-list-item"><b>No tickets</b><span>empty</span></div>';return tickets.map(function(ticket){var label=ticket.isFree?'FREE':gram(ticket.priceNano)+' GRAM';return '<div class="home-ticket-list-item"><b>#'+String(ticket.ticketNumber||'').padStart(5,'0').slice(-5)+'</b><span>'+label+'</span></div>'}).join('')}
  function purchaseCostNano(){if(!state)return 0;var free=state.freeTicketAvailable?1:0;return Math.max(0,quantity-free)*Math.max(0,Number(state.settings&&state.settings.ticketPriceNano)||150000000)}
  function remainingLimit(){if(!state||!state.settings)return MAX_QTY;var limit=Math.max(0,Number(state.settings.maxTicketsPerUser)||0);if(!limit)return MAX_QTY;return Math.max(0,limit-Math.max(0,Number(state.ticketCount)||0))}
  function maxSelectable(){return Math.max(1,Math.min(MAX_QTY,remainingLimit()||1))}
  function balanceIconSrc(){var img=q('.top-balance-pill .ton-mini-icon img');return String(img&&(img.getAttribute('src')||img.src)||'')}
  function paidButtonHtml(cost){var src=balanceIconSrc(),icon=src?'<img src="'+src+'" alt="" aria-hidden="true" style="width:28px;height:28px;display:block;object-fit:contain;transform:translateY(1px)">':'';return '<span style="display:flex;width:100%;align-items:center;justify-content:center;gap:1px"><span style="font-size:calc(1em + 3px);line-height:1">'+gramPrice(cost)+'</span>'+icon+'</span>'}
  function prizeIconHtml(){var src=balanceIconSrc();if(!src)return '';return '<span class="home-bonus-prize-icon"><img src="'+String(src).replace(/"/g,'&quot;')+'" alt="" aria-hidden="true"></span>'}
  function prizePoolNano(){return Math.max(0,Math.floor(Number(state&&state.prizePoolNano)||0))}
  function prizePoolText(nano){return (Math.max(0,Number(nano)||0)/1000000000).toFixed(2)}
  function prizePoolChar(ch){return ch===' '?'&nbsp;':esc(ch)}
  function prizePoolStaticHtml(text){var html='';for(var i=0;i<text.length;i++){var ch=text.charAt(i);html+=ch==='.'?'<span class="home-prize-separator" aria-hidden="true">.</span>':'<span class="home-prize-digit" aria-hidden="true"><span class="home-prize-digit-current">'+prizePoolChar(ch)+'</span></span>'}return html}
  function setPrizePoolText(nano){var value=q('#homeDrawInfoCard [data-prize-pool]');if(!value)return;var text=prizePoolText(nano);value.setAttribute('aria-label',text);value.innerHTML=prizePoolStaticHtml(text)}
  function cancelPrizePoolAnimations(){for(var i=0;i<prizePoolAnimations.length;i++){try{prizePoolAnimations[i].onfinish=null;prizePoolAnimations[i].oncancel=null;prizePoolAnimations[i].cancel()}catch(e){}}prizePoolAnimations=[];prizePoolPendingNano=null;prizePoolAnimationTargetNano=displayedPrizePoolNano}
  function prizePoolReducedMotion(){try{return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}catch(e){return false}}
  function finishPrizePoolAnimation(target){prizePoolAnimations=[];displayedPrizePoolNano=target;prizePoolAnimationTargetNano=target;setPrizePoolText(target);var pending=prizePoolPendingNano;prizePoolPendingNano=null;if(pending!==null&&Math.abs(pending-target)>.5)animatePrizePool(pending)}
  function animatePrizePool(target){var value=q('#homeDrawInfoCard [data-prize-pool]');target=Math.max(0,Number(target)||0);if(prizePoolAnimations.length){if(Math.abs(target-prizePoolAnimationTargetNano)>.5)prizePoolPendingNano=target;return}var previous=displayedPrizePoolNano;if(Math.abs(target-previous)<=.5){displayedPrizePoolNano=target;setPrizePoolText(target);return}if(!value||document.hidden||!q('#home.active')||prizePoolReducedMotion()||typeof value.animate!=='function'){displayedPrizePoolNano=target;prizePoolAnimationTargetNano=target;setPrizePoolText(target);return}var oldText=prizePoolText(previous),newText=prizePoolText(target),len=Math.max(oldText.length,newText.length),oldPad=oldText.padStart(len,' '),newPad=newText.padStart(len,' '),rollRank={},rank=0,html='',changed=0;for(var scan=len-1;scan>=0;scan--){var oldScan=oldPad.charAt(scan),newScan=newPad.charAt(scan);if(newScan==='.'||oldScan==='.'||oldScan===newScan)continue;rollRank[scan]=rank++}for(var i=0;i<len;i++){var oldChar=oldPad.charAt(i),newChar=newPad.charAt(i);if(newChar==='.'||oldChar==='.'){html+='<span class="home-prize-separator" aria-hidden="true">.</span>';continue}if(oldChar!==newChar){var delay=Math.max(0,Number(rollRank[i])||0)*115;html+='<span class="home-prize-digit" aria-hidden="true" data-prize-roll="1" data-prize-delay="'+delay+'"><span class="home-prize-digit-current">'+prizePoolChar(newChar)+'</span><span class="home-prize-digit-old">'+prizePoolChar(oldChar)+'</span></span>';changed++}else html+='<span class="home-prize-digit" aria-hidden="true"><span class="home-prize-digit-current">'+prizePoolChar(newChar)+'</span></span>'}value.setAttribute('aria-label',newText);value.innerHTML=html;if(!changed){displayedPrizePoolNano=target;setPrizePoolText(target);return}prizePoolAnimationTargetNano=target;var cells=value.querySelectorAll('[data-prize-roll="1"]'),pending=cells.length,finished=false;var finishOne=function(){if(finished)return;pending--;if(pending<=0){finished=true;finishPrizePoolAnimation(target)}};for(var j=0;j<cells.length;j++){var cell=cells[j],next=q('.home-prize-digit-current',cell),old=q('.home-prize-digit-old',cell),delay=Math.max(0,Number(cell.getAttribute('data-prize-delay'))||0);if(!next||!old||typeof next.animate!=='function'){finishOne();continue}try{var options={duration:820,delay:delay,easing:'cubic-bezier(.16,.84,.24,1)',fill:'both'},incoming=next.animate([{transform:'translate3d(0,-112%,0)',opacity:.08,offset:0},{transform:'translate3d(0,3%,0)',opacity:1,offset:.88},{transform:'translate3d(0,0,0)',opacity:1,offset:1}],options),outgoing=old.animate([{transform:'translate3d(0,0,0)',opacity:1,offset:0},{transform:'translate3d(0,112%,0)',opacity:.06,offset:1}],options);prizePoolAnimations.push(incoming,outgoing);incoming.onfinish=finishOne;incoming.oncancel=function(){};outgoing.oncancel=function(){}}catch(e){finishOne()}}if(pending<=0&&!finished){finished=true;finishPrizePoolAnimation(target)}}
  function renderPrizePool(){var icon=q('#homeDrawInfoCard [data-prize-pool-icon]'),target=prizePoolNano(),roundId=String(state&&state.round&&state.round.id||'');if(!displayedPrizePoolReady||displayedPrizePoolRoundId!==roundId){cancelPrizePoolAnimations();displayedPrizePoolReady=true;displayedPrizePoolRoundId=roundId;displayedPrizePoolNano=target;prizePoolAnimationTargetNano=target;setPrizePoolText(target)}else if(Math.abs(target-displayedPrizePoolNano)>.5)animatePrizePool(target);if(icon){var src=balanceIconSrc();if(src){if(icon.getAttribute('src')!==src)icon.setAttribute('src',src);icon.style.display='block'}else icon.style.display='none'}}
  function winChanceText(value){var chance=Math.max(0,Math.min(100,Number(value)||0));if(chance<=0)return '0%';if(chance<.01)return '<0.01%';if(chance>=99.995)return '100%';if(chance<1)return chance.toFixed(2)+'%';return chance.toFixed(1).replace(/\\.0$/,'')+'%'}
  function renderWinChanceText(){var value=q('#homeTicketDrawer [data-win-chance]'),chance=Math.max(0,Math.min(100,Number(state&&state.winChancePercent)||0));if(value)value.textContent=winChanceText(chance)}
  function winnerCount(){return Math.max(0,Math.min(3,Math.floor(Number(state&&state.winnerCount)||0)))}
  function prizeRowsHtml(prizes){var rows=Array.isArray(prizes)?prizes:[],html='',limit=winnerCount();for(var i=0;i<limit;i++){var prize=rows[i]||{rank:i+1,prizeNano:0,percent:0},rank=i+1,percent=Math.max(0,Number(prize.percent)||0);html+='<article class="home-bonus-row"><div class="home-bonus-rank-avatar">#'+rank+'</div><div class="home-live-winner-user"><span>'+percent.toLocaleString(undefined,{maximumFractionDigits:2})+'%</span></div><div class="home-live-winner-amount home-bonus-prize-amount"><span>'+gram(prize.prizeNano)+'</span>'+prizeIconHtml()+'</div></article>'}return html}
  function lotteryCopy(){var set=function(selector,key){var el=q(selector);if(el)el.textContent=String(window.VexaLotteryText&&window.VexaLotteryText(key)||'')};set('[data-lottery-title]','lottery');set('[data-lottery-draw-label]','drawAt');set('[data-lottery-how-title]','howItWorks');set('[data-lottery-ticket-note]','ticketNote');set('[data-lottery-prize-title]','prizeSplit');set('[data-lottery-prize-note]','threeWinners');set('[data-win-chance-label]','winChance');var draw=q('[data-lottery-draw-at]'),drawAt=Date.parse(String(state&&state.round&&state.round.drawAt||''));if(draw)draw.textContent=Number.isFinite(drawAt)?new Intl.DateTimeFormat(undefined,{weekday:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(drawAt)):'—'}
  function renderPrizePanel(){var list=q('#homeBonusPanel .home-bonus-list');if(list&&state&&Array.isArray(state.prizes))list.innerHTML=prizeRowsHtml(state.prizes);lotteryCopy()}
  function render(){var cardCount=q('#home .home-ticket-card [data-ticket-count]'),drawerCount=q('#homeTicketDrawer [data-ticket-count]'),list=q('#homeTicketList'),button=q('#homeTicketButton');var count=Math.max(0,Number(state&&state.ticketCount)||0),limitReached=!!(state&&state.settings&&Number(state.settings.maxTicketsPerUser)>0&&remainingLimit()<=0);var max=maxSelectable();if(quantity>max)quantity=max;if(quantity<1)quantity=1;if(cardCount)cardCount.textContent=quantity+' ticket'+(quantity===1?'':'s');if(drawerCount)drawerCount.textContent=count+' ticket'+(count===1?'':'s');if(list)list.innerHTML=listHtml(state&&state.tickets||[]);var minus=q('#home [data-ticket-minus]'),plus=q('#home [data-ticket-plus]');if(minus)minus.disabled=busy||quantity<=1||limitReached;if(plus)plus.disabled=busy||quantity>=max||!state||!state.canBuy||limitReached;if(button){var cost=purchaseCostNano();if(busy){button.textContent='Getting Ticket…';button.removeAttribute('aria-label')}else if(limitReached){button.textContent='Ticket limit reached';button.removeAttribute('aria-label')}else if(state&&state.canBuy&&cost<=0){button.textContent='Get Free Ticket';button.setAttribute('aria-label','Get Free Ticket')}else if(state&&state.canBuy){button.innerHTML=paidButtonHtml(cost);button.setAttribute('aria-label',gramPrice(cost)+' GRAM')}else if(state&&state.reason){button.textContent=state.reason;button.removeAttribute('aria-label')}else if(!initData()){button.textContent='Open in Telegram';button.removeAttribute('aria-label')}button.disabled=busy||!state||!state.canBuy||!initData()||limitReached}renderWinners();renderWinChanceText();renderPrizePool();renderPrizePanel();updateCountdown()}
  function slotEngine(){return window.VexaLotterySlotEngine||null}
  function replaySuppressedFocus(){if(!suppressedWindowFocus)return;suppressedWindowFocus=false;setTimeout(function(){try{window.dispatchEvent(new Event('focus'))}catch(e){try{var event=document.createEvent('Event');event.initEvent('focus',false,false);window.dispatchEvent(event)}catch(x){}}},0)}
  function setOfficialSpinActive(active){officialSpinActive=!!active;if(!officialSpinActive)replaySuppressedFocus()}
  function guardOfficialSpinFocus(event){if(!officialSpinActive||event&&event.target!==window)return;suppressedWindowFocus=true;if(event&&typeof event.stopImmediatePropagation==='function')event.stopImmediatePropagation()}
  function setStaticCode(code){var engine=slotEngine();if(!engine||typeof engine.setCode!=='function')return;try{engine.setCode(code)}catch(e){}}
  function cancelScheduledDraw(){if(drawSpinTimer){clearTimeout(drawSpinTimer);drawSpinTimer=0}scheduledDrawId=''}
  function cancelResultReset(){if(resultResetTimer){clearTimeout(resultResetTimer);resultResetTimer=0}}
  function setIdleCode(){if(!officialSpinActive)setStaticCode('00000')}
  function scheduleIdleCode(){cancelResultReset();resultResetTimer=setTimeout(function(){resultResetTimer=0;setIdleCode()},900)}
  function winnerEffectAlreadyShown(drawId){try{return localStorage.getItem('vexaLotteryWinnerEffect:'+drawId)==='1'}catch(e){return false}}
  function markWinnerEffectShown(drawId){try{localStorage.setItem('vexaLotteryWinnerEffect:'+drawId,'1')}catch(e){}}
  function drawSpinAlreadyShown(drawId){try{return sessionStorage.getItem('vexaLotterySpin:'+drawId)==='1'}catch(e){return false}}
  function markDrawSpinShown(drawId){try{sessionStorage.setItem('vexaLotterySpin:'+drawId,'1')}catch(e){}}
  function playWinnerEffect(){try{if(typeof window.VexaLotteryWinnerEffect==='function')window.VexaLotteryWinnerEffect()}catch(e){}}
  function triggerWinnerEffect(drawId){if(!drawId||winnerEffectDrawId===drawId||winnerEffectAlreadyShown(drawId))return;winnerEffectDrawId=drawId;markWinnerEffectShown(drawId);haptic('success');playWinnerEffect()}
  function scheduleLiveDraw(drawId,code,won,startAt){if(!drawId||!/^\\d{5}$/.test(String(code||''))||scheduledDrawId===drawId||drawSpinAlreadyShown(drawId))return;cancelResultReset();scheduledDrawId=drawId;if(drawSpinTimer)clearTimeout(drawSpinTimer);var run=function(){drawSpinTimer=0;var engine=slotEngine();if(!engine||typeof engine.spinTo!=='function'){scheduledDrawId='';return}setOfficialSpinActive(true);var started=false;try{started=engine.spinTo(code,function(){scheduledDrawId='';setOfficialSpinActive(false);haptic('success');if(won)triggerWinnerEffect(drawId);scheduleIdleCode();renderWinners();load(true).catch(function(){})})}catch(e){started=false}if(started){markDrawSpinShown(drawId);return}setOfficialSpinActive(false);scheduledDrawId='';setIdleCode()};drawSpinTimer=setTimeout(run,Math.max(0,(Number(startAt)||liveServerNow())-liveServerNow()))}
  function applyDrawResult(){var round=state&&state.round,draw=state&&state.lastDraw,drawId=draw&&String(draw.roundId||''),code=draw&&String(draw.winningCode||''),won=!!(state&&state.lastDrawWon),now=liveServerNow();if(!round||round.status==='open'){cancelScheduledDraw();cancelResultReset();setIdleCode();return}if(!drawId||!/^\\d{5}$/.test(code)){cancelScheduledDraw();cancelResultReset();setIdleCode();return}var sameClosedRound=round.status==='closed'&&String(round.id||'')===drawId;if(!sameClosedRound){cancelScheduledDraw();cancelResultReset();setIdleCode();return}var startAt=roundTime('drawStartsAt',DRAW_DELAY_MS);var engine=slotEngine(),duration=engine&&Number(engine.durationMs)>0?Number(engine.durationMs):DRAW_ANIMATION_MS;var animationEndsAt=startAt?startAt+duration:0;if(startAt&&now<startAt){cancelResultReset();setIdleCode();scheduleLiveDraw(drawId,code,won,startAt);return}if(!drawSpinAlreadyShown(drawId)&&(animationEndsAt&&now<animationEndsAt||state&&state.waitingForWinner)){if(!officialSpinActive&&scheduledDrawId!==drawId)scheduleLiveDraw(drawId,code,won,now);return}if(!drawSpinAlreadyShown(drawId)){scheduleLiveDraw(drawId,code,won,now);return}cancelScheduledDraw();cancelResultReset();setIdleCode();if(won)triggerWinnerEffect(drawId)}
  function handleLivePrizePool(event){var item=event&&event.detail;if(!item)return;if(item.kind==='lottery'){if(busy||loading)scheduleLifecycleRefresh(100);else load(true);return}if(item.kind!=='ticket'||item.prizePoolNano===null||item.prizePoolNano===undefined||!state||!state.round)return;if(String(item.roundId||'')!==String(state.round.id||''))return;var target=Math.max(0,Math.floor(Number(item.prizePoolNano)||0)),current=Math.max(0,Math.floor(Number(state.prizePoolNano)||0));if(target>=current){state.prizePoolNano=target;renderPrizePool()}var total=Math.max(0,Math.floor(Number(item.roundTicketCount)||0)),known=Math.max(0,Math.floor(Number(state.roundTicketCount)||0));if(!busy&&state.round.status==='open'&&total>0&&total>=known){var mine=Math.max(0,Math.floor(Number(state.userTicketCount)||0));state.roundTicketCount=total;state.winChancePercent=mine>0?Math.max(0,Math.min(100,(mine/total)*100)):0;renderWinChanceText()}}
  function emptyState(reason,free){return {winnerCount:0,ticketCount:0,roundTicketCount:0,userTicketCount:0,winChancePercent:0,prizePoolNano:0,tickets:[],round:null,lastDraw:null,lastDrawWon:false,freeTicketAvailable:!!free,canBuy:false,reason:reason||'',prizes:[],waitingForWinner:false,winnerDisplayAtMs:0,winners:[],settings:{ticketPriceNano:150000000,maxTicketsPerUser:0,drawIntervalMinutes:1440}}}
  async function load(force){if(loading)return false;var now=Date.now();if(!force&&now-lastLoadAt<500)return false;var data=initData();if(!data){state=emptyState('Open in Telegram',true);clearLifecycleTimer();render();cancelResultReset();setIdleCode();markHomeHydrated('fallback');return false}loading=true;lastLoadAt=now;var started=Date.now();var hydrationStatus='error';try{var response=await requestLotteryState(data);var payload=await response.json().catch(function(){return null}),received=Date.now();if(!response.ok)throw new Error(payload&&payload.error||'Could not load Lottery');syncServerClock(payload,started,received);state=payload;applyDrawResult();render();var due=lifecycleDueTime();if(due&&due<=liveServerNow())lifecycleRetryMs=Math.min(5000,Math.max(800,Math.round(lifecycleRetryMs*1.7)));else lifecycleRetryMs=800;armLifecycle();hydrationStatus='ready';return true}catch(error){state=emptyState(String(error&&error.message||'Lottery unavailable'),false);render();cancelResultReset();setIdleCode();lifecycleRetryMs=Math.min(15000,Math.max(1200,Math.round(lifecycleRetryMs*1.8)));if(q('#home.active')&&!document.hidden)scheduleLifecycleRefresh(lifecycleRetryMs);return false}finally{loading=false;markHomeHydrated(hydrationStatus)}}
  async function buy(){if(busy||!state||!state.canBuy||!initData()||remainingLimit()<=0&&Number(state.settings&&state.settings.maxTicketsPerUser)>0)return;var cost=purchaseCostNano(),balance=Math.max(0,Number(state.gramBalanceNano)||0);if(cost>balance){haptic('error');openTicketWallet();return}busy=true;render();try{var response=await fetch('/app/api/lottery/tickets',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({initData:initData(),quantity:quantity,purchaseId:purchaseId()})});var payload=await response.json().catch(function(){return null});if(!response.ok)throw new Error(payload&&payload.error||'Could not get ticket');if(window.VexaTonBalance&&typeof window.VexaTonBalance.write==='function'&&payload.gramBalanceNano!==undefined)window.VexaTonBalance.write(Number(payload.gramBalanceNano)||0,0);if(state&&payload.prizePoolNano!==undefined&&(!payload.round||!state.round||String(payload.round.id||'')===String(state.round.id||''))){state.prizePoolNano=Math.max(Number(state.prizePoolNano)||0,Number(payload.prizePoolNano)||0);renderPrizePool()}quantity=1;haptic('success');await load(true)}catch(error){var message=String(error&&error.message||'Could not get ticket');haptic('error');if(/insufficient balance/i.test(message)){openTicketWallet();return}var button=q('#homeTicketButton');if(button){button.textContent=message;setTimeout(render,1200)}}finally{busy=false;setTimeout(render,0)}}
  function handleTicketControls(event){var target=event.target&&event.target.closest?event.target.closest('#homeTicketButton,#home [data-ticket-plus],#home [data-ticket-minus]'):null;if(!target)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();if(target.id==='homeTicketButton'){ticketSound('buy');buy();return}if(busy||!state||!state.canBuy||remainingLimit()<=0&&Number(state.settings.maxTicketsPerUser)>0)return;if(target.hasAttribute('data-ticket-plus')){quantity=Math.min(maxSelectable(),quantity+1);ticketSound('plus')}if(target.hasAttribute('data-ticket-minus')){quantity=Math.max(1,quantity-1);ticketSound('minus')}haptic('light');render()}
  function handleSmartRefresh(event){var target=event.target&&event.target.closest?event.target:null;if(!target)return;var homeLink=target.closest('[data-view="home"]'),bonus=target.closest('#homeBonusButton');if(homeLink)setTimeout(function(){if(q('#home.active')&&!busy){startClock();load(false)}},60);else if(bonus)setTimeout(function(){if(q('#home.active')&&!busy)load(false)},0)}
  function stopClock(){if(clockTimer){clearTimeout(clockTimer);clockTimer=0}}
  function startClock(){if(clockTimer||document.hidden||!q('#home.active'))return;var tick=function(){clockTimer=0;updateCountdown();if(document.hidden||!q('#home.active'))return;var next=1000-(Math.floor(liveServerNow())%1000)+16;clockTimer=setTimeout(tick,Math.max(120,next))};tick()}
  function refreshWhenVisible(){if(!document.hidden&&q('#home.active')&&!busy){startClock();load(false)}else stopClock()}
  function handleResize(){syncWinnerHeight();updateWinnerFade(ensureWinnersSurface())}
  function init(){lotteryCopy();document.addEventListener('click',handleTicketControls,true);document.addEventListener('click',handleSmartRefresh,true);window.addEventListener('vexa:live-activity',handleLivePrizePool);window.addEventListener('resize',handleResize,{passive:true});load(true);startClock();window.VexaLotteryRefresh=function(){return load(true)}}
  window.addEventListener('focus',guardOfficialSpinFocus,true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('focus',refreshWhenVisible);
  window.addEventListener('vexa-country-detected',lotteryCopy);
  document.addEventListener('visibilitychange',refreshWhenVisible);
})();
`;

export const HOME_SCRIPT = HOME_ASSET_SCRIPT + HOME_MARKUP_SCRIPT + HOME_SLOT_SCRIPT + HOME_LOTTERY_CLIENT_SCRIPT;
