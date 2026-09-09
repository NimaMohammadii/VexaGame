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
#home .homem«ëŒ+Š×®º+º$zzb¥â×F–6¶WBÖ6&Bæ†öÖR×F–6¶WBÖ'WGFöã¦7F—fW°¢G&ç6f÷&Ó§G&ç6ÆFS6BƒÃ‚Ã’66ÆR‚ã“B’–×÷'FçC°¢f–ÇFW#¦'&–v‡FæW72ƒãB’6GW&FRƒã‚’–×÷'FçC°¢G&ç6—F–öâÖGW&F–öã¢ã2–×÷'FçC°§Ğ¢6†öÖRæ†öÖR×F–6¶WBÖ6&Bæ†öÖR×F–6¶WB×7FW¶föçB×6—¦S£–×÷'FçC¶Æ–æRÖ†V–v‡C£–×÷'FçC¶6öÆ÷#§G&ç7&VçB–×÷'FçGĞ¢6†öÖRæ†öÖR×F–6¶WBÖ6&Bæ†öÖR×F–6¶WBÖ'WGFöç·v–GFƒ£R–×÷'FçGĞ¢6†öÖRæ†öÖR×F–6¶WBÖ6&Bæ†öÖR×F–6¶WB×7FW¦&Vf÷&RÀ¢6†öÖRæ†öÖR×F–6¶WBÖ6&Bæ†öÖR×F–6¶WB×7FW¦gFW'°¢6öçFVçC¢rr–×÷'FçC°¢÷6—F–öã¦'6öÇWFR–×÷'FçC°¢ÆVgC£SR–×÷'FçC°¢F÷£SR–×÷'FçC°¢v–GFƒ£g‚–×÷'FçC°¢†V–v‡C£"ãg‚–×÷'FçC°¢&÷&FW"×&F—W3£““—‚–×÷'FçC°¢&6¶w&÷VæC¢6ffb–×÷'FçC°¢&÷‚×6†F÷s¦æöæR–×÷'FçC°¢G&ç6f÷&Ó§G&ç6ÆFR‚ÓSRÂÓSR’–×÷'FçC°¢ö–çFW"ÖWfVçG3¦æöæR–×÷'FçC°§Ğ¢6†öÖRæ†öÖR×F–6¶WBÖ6&Bæ†öÖR×F–6¶WB×7FW¶FF×F–6¶WBÖÖ–çW5Ó¦gFW'¶F—7Æ“¦æöæR–×÷'FçGĞ¢6†öÖRæ†öÖR×F–6¶WBÖ6&Bæ†öÖR×F–6¶WB×7FW¶FF×F–6¶WB×ÇW5Ó¦gFW'¶F—7Æ“¦&Æö6²–×÷'FçC·v–GFƒ£"ãg‚–×÷'FçC¶†V–v‡C£g‚–×÷'FçGĞ¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖRÖG&rÖ6÷’À¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖR×&—¦RÖ6÷—°¢F—7Æ“¦w&–B–×÷'FçC°¢w&–B×FV×ÆFR×&÷w3£‚#g‚–×÷'FçC°¢Æ–vâÖ6öçFVçC¦6VçFW"–×÷'FçC°¢&÷rÖv£'‚–×÷'FçC°§Ğ¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖRÖG&rÖ6÷—·FF–ærÖÆVgC£W‚–×÷'FçGĞ¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖRÖG&rÖÆ&VÂÀ¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖR×&—¦RÖÆ&VÇ°¢Æ–vâ×6VÆc§7F'B–×÷'FçC°¢Ö&v–ã£–×÷'FçC°¢G&ç6f÷&Ó§G&ç6ÆFU’ƒ’–×÷'FçC°§Ğ¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖRÖG&r×F–ÖW°¢Æ–vâ×6VÆc§7F'B–×÷'FçC°¢†V–v‡C£#g‚–×÷'FçC°¢Ö&v–ã£–×÷'FçC°¢F—7Æ“¦fÆW‚–×÷'FçC°¢Æ–vâÖ—FV×3¦6VçFW"–×÷'FçC°§Ğ¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖR×&—¦R×fÇVR¶FF×&—¦R×ööÅ×°¢F—7Æ“¦–æÆ–æRÖfÆW‚–×÷'FçC°¢Æ–vâÖ—FV×3¦6VçFW"–×÷'FçC°¢F—&V7F–öã¦ÇG"–×÷'FçC°¢÷fW&fÆ÷s§f—6–&ÆR–×÷'FçC°¢Æ–æRÖ†V–v‡C£ã‚–×÷'FçC°¢föçB×f&–çBÖçVÖW&–3§F'VÆ"ÖçV×2–×÷'FçC°¢6öÆ÷#§G&ç7&VçB–×÷'FçC°¢&6¶w&÷VæC¦Æ–æV"Öw&F–VçBƒƒFVrÂ6C3f#ƒ’RÂ6&CF3fB#‚RÂ3“c3#S"S‚RÂ63SƒsbR’–×÷'FçC°¢×vV&¶—BÖ&6¶w&÷VæBÖ6Æ—§FW‡B–×÷'FçC°¢&6¶w&÷VæBÖ6Æ—§FW‡B–×÷'FçC°¢×vV&¶—B×FW‡B×7G&ö¶S£–×÷'FçC°¢FW‡B×6†F÷s£‚&v&ƒ#‚ÃBÃ3rÂã‚’Ã'‚'‚&v&ƒÃÃÂãSB’–×÷'FçC°§Ğ¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖR×&—¦RÖF–v—G°¢÷6—F–öã§&VÆF—fR–×÷'FçC°¢F—7Æ“¦–æÆ–æRÖw&–B–×÷'FçC°¢Æ6RÖ—FV×3¦6VçFW"–×÷'FçC°¢fÆWƒ£WFò–×÷'FçC°¢v–GFƒ¦WFò–×÷'FçC°¢Ö–â×v–GFƒ£–×÷'FçC°¢†V–v‡C£ã#†VÒ–×÷'FçC°¢Ö&v–âÖ–æÆ–æS¢ÒãfVÒ–×÷'FçC°¢FF–ærÖ–æÆ–æS¢ãfVÒ–×÷'FçC°¢÷fW&fÆ÷s¦†–FFVâ–×÷'FçC°¢&÷‚×6—¦–æs¦6öçFVçBÖ&÷‚–×÷'FçC°§Ğ¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖR×&—¦RÖF–v—BÖ7W'&VçBÀ¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖR×&—¦RÖF–v—BÖöÆBÀ¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖR×&—¦R×6W&F÷'°¢6öÆ÷#§G&ç7&VçB–×÷'FçC°¢&6¶w&÷VæC¦Æ–æV"Öw&F–VçBƒƒFVrÂ6C3f#ƒ’RÂ6&CF3fB#‚RÂ3“c3#S"S‚RÂ63SƒsbR’–×÷'FçC°¢×vV&¶—BÖ&6¶w&÷VæBÖ6Æ—§FW‡B–×÷'FçC°¢&6¶w&÷VæBÖ6Æ—§FW‡B–×÷'FçC°¢×vV&¶—B×FW‡B×7G&ö¶S£–×÷'FçC°¢FW‡B×6†F÷s£‚&v&ƒ#‚ÃBÃ3rÂã‚’Ã'‚'‚&v&ƒÃÃÂãSB’–×÷'FçC°§Ğ¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖR×&—¦RÖF–v—BÖ7W'&VçG°¢w&–BÖ&V£ó–×÷'FçC°¢F—7Æ“¦&Æö6²–×÷'FçC°¢v–GFƒ¦WFò–×÷'FçC°¢†V–v‡C¦WFò–×÷'FçC°¢Æ–æRÖ†V–v‡C£ã‚–×÷'FçC°§Ğ¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖR×&—¦RÖF–v—BÖöÆG°¢÷6—F–öã¦'6öÇWFR–×÷'FçC°¢–ç6WC£ãfVÒ–×÷'FçC°¢F—7Æ“¦w&–B–×÷'FçC°¢Æ6RÖ—FV×3¦6VçFW"–×÷'FçC°¢Æ–æRÖ†V–v‡C£ã‚–×÷'FçC°¢ö–çFW"ÖWfVçG3¦æöæR–×÷'FçC°§Ğ¢6†öÖR6†öÖTG&t–æfô6&Bæ†öÖR×&—¦R×6W&F÷'°¢F—7Æ“¦–æÆ–æRÖ&Æö6²–×÷'FçC°¢v–GFƒ¦WFò–×÷'FçC°¢†V–v‡C¦WFò–×÷'FçC°¢Æ–æRÖ†V–v‡C£ã‚–×÷'FçC°§Ğ¢6†öÖRæ†öÖR×F–6¶WBÖÆ–÷WCâæ†öÖR×F–6¶WBÖ6&G°¢&÷&FW#£‚6öÆ–B&v&ƒ#BÃ#"ÃS2Âã#B’–×÷'FçC°¢&6¶w&÷VæC¢3ssr–×÷'FçC°¢&6¶w&÷VæBÖ6öÆ÷#¢3ssr–×÷'FçC°¢&6¶w&÷VæBÖ–ÖvS¦æöæR–×÷'FçC°¢&6¶G&÷Öf–ÇFW#¦æöæR–×÷'FçC°¢×vV&¶—BÖ&6¶G&÷Öf–ÇFW#¦æöæR–×÷'FçC°§Ğ¢6†öÖRæ†öÖR×F–6¶WBÖÆ–÷WCâæ†öÖR×F–6¶WBÖ6&C¦&Vf÷&W°¢6öçFVçC¢rr–×÷'FçC°¢F—7Æ“¦&Æö6²–×÷'FçC°¢&6¶w&÷VæC ¢&F–ÂÖw&F–VçBƒ3G‚3G‚BÇ&v&ƒƒbÃS2ÃƒrÂã#’RÇ&v&ƒCbÃ3RÃcbÂã’’C"RÇ&v&ƒBÃ‚ÃCBÃ’sbR’À¢&F–ÂÖw&F–VçBƒ3‡‚3‡‚BRRÇ&v&ƒSbÃ3‚ÃsÂã#b’RÇ&v&ƒ“"ÃÃ3RÂã"’CbRÇ&v&ƒc’ÃRÃ#bÃ’s‚R’–×÷'FçC°¢&÷‚×6†F÷s ¢–ç6WB7‚7‚ãW‚Ó2ãW‚&v&ƒ#SRÃ#SRÃ#SRÂã’À¢–ç6WBÓ7‚Ó7‚ãW‚Ó2ãW‚&v&ƒSbÃ3‚ÃsÂãS"’À¢–ç6WB‚‚‚ÒãW‚&v&ƒCÃ#’ÃcÂã#"’À¢–ç6WBÓ‚Ó‚‚ÒãW‚&v&ƒ“"ÃÃ3RÂã3’À¢–ç6WBg‚W‚7‚Ó‡‚&v&ƒ#SRÃ#SRÃ#SRÂã2’À¢–ç6WBÓW‚ÓG‚‚Ó‡‚&v&ƒ#SRÃ#SRÃ#SRÂãSR’À¢–ç6WB‚&v&ƒc’ÃRÃ#bÂã"’–×÷'FçC°§Ğ¢6†öÖRæ†öÖR×F–6¶WBÖ6&Bæ†öÖR×F–6¶WBÖ6÷VçG°¢&÷‚×6†F÷s¦–ç6WB‚&v&ƒ#SRÃ#SRÃ#SRÂãSR’Æ–ç6WB‚&v&ƒ#SRÃ#SRÃ#SRÂãb’Æ–ç6WBÓ‚&v&ƒ#SRÃ#SRÃ#SRÂãB’–×÷'FçC°§Ğ¢6†öÖRæ†öÖRÖÆ—fR×v–ææW"Ö6&G·÷6—F–öã§&VÆF—fR–×÷'FçC¶÷fW&fÆ÷s¦†–FFVâ–×÷'FçC¶Ö–âÖ†V–v‡C£cG‚–×÷'FçC¶&÷&FW#£–×÷'FçC¶÷WFÆ–æS£–×÷'FçC¶&÷&FW"×&F—W3£#‡‚–×÷'FçC¶&6¶w&÷VæC§G&ç7&VçB–×÷'FçC¶&6¶w&÷VæBÖ6öÆ÷#§G&ç7&VçB–×÷'FçC¶&6¶w&÷VæBÖ–ÖvS¦æöæR–×÷'FçC¶&÷‚×6†F÷s¦–ç6WB‚&v&ƒ#SRÃ#SRÃ#SRÂãR’Æ–ç6WBÓ‚&v&ƒ#SRÃ#SRÃ#SRÂãb’Æ–ç6WB#'‚&v&ƒ#SRÃ#SRÃ#SRÂãSR’Ãg‚3g‚&v&ƒÃÃÂã#"’–×÷'FçC¶F—7Æ“¦w&–B–×÷'FçC¶w&–B×FV×ÆFRÖ6öÇVÖç3£C'‚Ö–æÖ‚ƒÃg"’WFò–×÷'FçC¶Æ–vâÖ—FV×3¦6VçFW"–×÷'FçC¶v£‚–×÷'FçC·FF–æs£‚G‚–×÷'FçC¶&6¶G&÷Öf–ÇFW#¦&ÇW"ƒ7‚’6GW&FRƒãB’–×÷'FçC²×vV&¶—BÖ&6¶G&÷Öf–ÇFW#¦&ÇW"ƒ7‚’6GW&FRƒãB’–×÷'FçGĞ¢6†öÖRæ†öÖRÖÆ—fR×v–ææW"ÖfF'·v–GFƒ£C'‚–×÷'FçC¶†V–v‡C£C'‚–×÷'FçC¶&÷&FW"×&F—W3£SR–×÷'FçC¶ö&¦V7BÖf—C¦6÷fW"–×÷'FçC¶F—7Æ“¦&Æö6²–×÷'FçC¶&6¶w&÷VæC§G&ç7&VçB–×÷'FçC¶&÷‚×6†F÷s¦æöæR–×÷'FçGĞ¢6†öÖRæ†öÖRÖÆ—fR×v–ææW"×W6W'¶Ö–â×v–GFƒ£–×÷'FçC¶F—7Æ“¦w&–B–×÷'FçC¶v£7‚–×÷'FçGĞ¢6†öÖRæ†öÖRÖÆ—fR×v–ææW"×W6W"7G&öæw¶F—7Æ“¦&Æö6²–×÷'FçC¶6öÆ÷#¢6ffb–×÷'FçC¶föçB×6—¦S£7‚–×÷'FçC¶föçB×vV–v‡C£“–×÷'FçC·v†—FR×76S¦æ÷w&–×÷'FçC¶÷fW&fÆ÷s¦†–FFVâ–×÷'FçC·FW‡BÖ÷fW&fÆ÷s¦VÆÆ—6—2–×÷'FçGĞ¢6†öÖRæ†öÖRÖÆ—fR×v–ææW"×W6W"7ç¶F—7Æ“¦&Æö6²–×÷'FçC¶6öÆ÷#§&v&ƒ#SRÃ#SRÃ#SRÂãC‚’–×÷'FçC¶föçB×6—¦S£‚–×÷'FçC¶föçB×vV–v‡C£sS–×÷'FçGĞ¢6†öÖRæ†öÖRÖÆ—fR×v–ææW"ÖÖ÷VçG¶6öÆ÷#¢6ffb–×÷'FçC¶föçB×6—¦S£7‚–×÷'FçC¶föçB×vV–v‡C£“S–×÷'FçC·v†—FR×76S¦æ÷w&–×÷'FçGĞ¢6†öÖRæ†öÖRÖÆ—fR×v–ææW"Ö6&BçfW†×&VÖ—VÒÖ6÷&æW"Â6†öÖRæ†öÖRÖÆ—fR×v–ææW"Ö6&BçfW†Ö&öçW2×&VÖ—VÒÂ6†öÖRæ†öÖRÖÆ—fR×v–ææW"Ö6&BçfW†×&VÖ—VÒ×7F"Â6†öÖRæ†öÖRÖÆ—fR×v–ææW"Ö6&BçfW†Ö&öçW2×7F'¶F—7Æ“¦æöæR–×÷'FçC¶6öçFVçC¦æöæR–×÷'FçGĞ¢6†öÖRæ†öÖR×F–6¶WBÖf–ææ6R×f—7VÇ¶Ö–âÖ†V–v‡C£SG‚–×÷'FçC¶†V–v‡C§f"‚ÒÖ†öÖRÖÆ÷GFW'’×v–ææW'2Ö†V–v‡BÃSG‚’–×÷'FçC¶Æ–vâ×6VÆc§7F'B–×÷'FçC·Æ6RÖ—FV×3§7G&WF6‚–×÷'FçC·ö–çFW"ÖWfVçG3¦WFò–×÷'FçC¶÷fW&fÆ÷s§f—6–&ÆR–×÷'FçC¶&6¶w&÷VæC§G&ç7&VçB–×÷'FçC¶&÷‚×6†F÷s¦æöæR–×÷'FçC¶&6¶G&÷Öf–ÇFW#¦æöæR–×÷'FçC²×vV&¶—BÖ&6¶G&÷Öf–ÇFW#¦æöæR–×÷'FçC¶&÷&FW#£–×÷'FçC¶÷WFÆ–æS£–×÷'FçC¶&÷&FW"×&F—W3£–×÷'FçC·FF–æs£–×÷'FçGĞ¢6†öÖRæ†öÖR×F–6¶WBÖf–ææ6R×f—7VÃâæ†öÖRÖÆ÷GFW'’×v–ææW'7·v–GFƒ£R–×÷'FçC¶†V–v‡C£R–×÷'FçC¶Ö–âÖ†V–v‡C£–×÷'FçC¶F—7Æ“¦w&–B–×÷'FçC¶w&–B×FV×ÆFR×&÷w3¦WFòÖ–æÖ‚ƒÃg"’–×÷'FçC¶v£w‚–×÷'FçC¶Æ–vâÖ6öçFVçC§7G&WF6‚–×÷'FçC¶Ö–â×v–GFƒ£–×÷'FçC¶&6¶w&÷VæC§G&ç7&VçB–×÷'FçC¶&÷‚×6†F÷s¦æöæR–×÷'FçC¶&÷&FW#£–×÷'FçC¶&÷&FW"×&F—W3£–×÷'FçC¶÷fW&fÆ÷s§f—6–&ÆR–×÷'FçC·FF–æs£–×÷'FçGĞ¢6†öÖRæ†öÖRÖÆ÷GFW'’×v–ææW'2×F—FÆW¶F—7Æ“¦fÆW‚–×÷'FçC¶Æ–vâÖ—FV×3¦6VçFW"–×÷'FçC¶v£g‚–×÷'FçC¶Ö–âÖ†V–v‡C£7‚–×÷'FçC·FF–æs£G‚–×÷'FçC¶6öÆ÷#§&v&ƒ#SRÃ#SRÃ#SRÂãcb’–×÷'FçC¶föçB×6—¦S£—‚–×÷'FçC¶föçB×vV–v‡C£ƒS–×÷'FçC¶Æ–æRÖ†V–v‡C£–×÷'FçC¶ÆWGFW"×76–æs¢ÒãVÒ–×÷'FçGĞ¢6†öÖRæ†öÖRÖÆ÷GFW'’×v–ææW'2×F—FÆR7fw·v–GFƒ£7‚–×÷'FçC¶†V–v‡C£7‚–×÷'FçC¶6öÆ÷#¢6C““R–×÷'FçC¶fÆWƒ£WFò–×÷'FçGĞ¢6†öÖRæ†öÖRÖÆ÷GFW'’×v–ææW'2ÖÆ—7G·÷6—F–öã§&VÆF—fR–×÷'FçC¶F—7Æ“¦w&–B–×÷'FçC¶w&–B×FV×ÆFR×&÷w3§&WVBƒ2ÆÖ–æÖ‚ƒÃg"’’–×÷'FçC¶Æ–vâÖ6öçFVçC§7G&WF6‚–×÷'FçC¶v£g‚–×÷'FçC¶Ö–âÖ†V–v‡C£–×÷'FçC¶†V–v‡C£R–×÷'FçC¶÷fW&fÆ÷s¦†–FFVâ–×÷'FçC·FF–æs£'‚–×÷'FçC¶&÷‚×6—¦–æs¦&÷&FW"Ö&÷‚–×÷'FçC¶&6¶w&÷VæC§G&ç7&VçB–×÷'FçC¶&÷&FW"×&F—W3£–×÷'FçC¶&÷‚×6†F÷s¦æöæR–×÷'FçGĞ¢6†öÖRæ†öÖRÖÆ÷GFW'’×v–ææW'2ÖÆ—7C£¢×vV&¶—B×67&öÆÆ&'¶F—7Æ“¦æöæR–×÷'FçGĞ¢6†öÖRæ†öÖRÖÆ÷GFW'’×v–ææW'2ÖÆ—7Bæ†2Ö÷fW&fÆ÷s¦æ÷B‚æ—2×67&öÆÆVB—¶Ö6²Ö–ÖvS¦Æ–æV"Öw&F–VçB‡Fò&÷GFöÒÂ3Â36Æ2ƒRÒ‡‚’ÇG&ç7&VçBR’–×÷'FçC²×vV&¶—BÖÖ6²Ö–ÖvS¦Æ–æV"Öw&F–VçB‡Fò&÷GFöÒÂ3Â36Æ2ƒRÒ‡‚’ÇG&ç7&VçBR’–×÷'FçGĞ¢6†öÖRæ†öÖRÖÆ÷GFW'’×v–ææW'2ÖÆ—7Bæ†2Ö÷fW&fÆ÷ræ—2×67&öÆÆVC¦æ÷B‚æ—2ÖBÖ&÷GFöÒ—¶Ö6²Ö–ÖvS¦Æ–æV"Öw&F–VçB‡Fò&÷GFöÒÇG&ç7&VçBÂ3‡‚Â36Æ2ƒRÒ‡‚’ÇG&ç7&VçBR’–×÷'FçC²×vV&¶—BÖÖ6²Ö–ÖvS¦Æ–æV"Öw&F–VçB‡Fò&÷GFöÒÇG&ç7&VçBÂ3‡‚Â36Æ2ƒRÒ‡‚’ÇG&ç7&VçBR’–×÷'FçGĞ¢6†öÖRæ†öÖRÖÆ÷GFW'’×v–ææW'2ÖÆ—7Bæ†2Ö÷fW&fÆ÷ræ—2ÖBÖ&÷GFö×¶Ö6²Ö–ÖvS¦Æ–æÚ±î¸Â¸­yêë¢°k¢G§¦*^ear-gradient(to bottom,transparent 0,#000 18px,#000 100%)!important;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 18px,#000 100%)!important}
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
  '.home-ticket-drawer{position:fixed!important;left:0!important;top:calc(120px + env(safe-area-inset-top))!important;bottom:calc(88px + env(safe-area-inset-bottom))!important;width:min(44vw,210px)!important;max-width:210px!important;z-index:99995!important;padding:24px 14px 14px!important;border-radius:0 30px 30px 0!important;color:#fff!important;transform:translate3d(-104%,0,0)!important;transition:transform .36s cubic-bezier(.18,.88,.24,1)!m«ëŒ+Š×®º+º$zzb¥æÚ±î¸Â¸­yêë¢°k¢G§¦*^important;display:grid!important;grid-template-rows:auto auto minmax(0,1fr)!important;gap:14px!important;overflow:hidden!important}.home-ticket-drawer.is-open{transform:translate3d(0,0,0)!important}',
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
  '.home-bonus-backdrop{position:fixed!important;inset:0!important;z-index:99994!important;background:rgba(0,0,0,.24)!important;opacity:0!important;visibility:hidden!important;backdrop-filter:blur(2px)!important;-webkit-backdrop-filter:blur(2px)!important;transition:opacity .24s ease,visibility 0s linear .24s!important}.home-bonus-backdrop.is-open{opacity:1!important;visibility:visible!important;transition:opacity .24s ease!important}.home-bonus-panel{position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:99995!important;max-height:min(72dvh,620px)!important;padding:10px 16px calc(18px + env(safe-area-inset-bottom))!important;border-radius:34px 34px 0 0!important;background:rgba(14,10,12,.92)!important;color:#fff!important;box-shadow:0 -18px 54px rgba(0,0,0,.36),inset 0 1px 0 rgba(255,255,255,.12)!important;backdrop-filter:blur(18px) saturate(1.12)!important;-webkit-backdrop-filter:blur(18px) saturate(1.12)!important;transform:translate3d(0,105%,0)!important;transition:transform .34s cubic-bezier(.2,.9,.26,1)!important;display:grid!important;grid-template-rows:auto auto auto minmax(0,1fr)!important;gap:12px!important;overflow:hidden!important;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Rounded","Inter","Segoe UI",sans-serif!important;letter-spacing:-.018em!important}.home-bonus-panel.is-open{transform:translate3d(0,0,0)!important}.home-bonus-grab{width:36px!important;height:4px!important;margin:0 auto 2px!important;border-radius:999px!important;background:rgba(255,255,255,.20)!important}.home-bonus-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important}.home-bonus-title{display:flex!important;align-items:center!important;gap:9px!important;min-width:0!important}.home-bonus-title svg{width:22px!important;height:22px!important;color:#e9a6b6!important;flex:0 0 auto!important}.home-bonus-head strong{font-family:inherit!important;font-size:18px!important;font-weight:800!important;letter-spacing:-.035em!important;line-height:1!important}.home-bonus-close{width:34px!important;height:34px!important;min-width:34px!important;border-radius:999px!important;border:0!important;background:rgba(255,255,255,.045)!important;color:#fff!important;display:grid!important;place-items:center!important;padding:0!important;box-sizing:border-box!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.085),inset 0 -1px 0 rgba(255,255,255,.055),0 16px 34px rgba(0,0,0,.28)!important;backdrop-filter:blur(10px) saturate(1.12)!important;-webkit-backdrop-filter:blur(10px) saturate(1.12)!important;font-family:inherit!important;font-size:24px!important;font-weight:900!important;line-height:1!important;text-align:center!important;-webkit-tap-highlight-color:transparent!important;transition:transform .18s ease,background .18s ease!important}.home-bonus-close:active{transform:scale(.92)!important}.home-bonus-next{position:relative!important;overflow:hidden!important;min-height:48px!important;display:grid!important;grid-template-columns:26px minmax(0,1fr)!important;gap:7px!important;align-items:center!important;padding:0 10px!important;border:0!important;outline:0!important;border-radius:28px!important;background:radial-gradient(34px 34px at 0 0,rgba(186,53,87,.16) 0%,rgba(146,35,66,.07) 42%,rgba(104,18,44,0) 76%),radial-gradient(36px 36px at 100% 100%,rgba(172,46,79,.15) 0%,rgba(133,30,60,.065) 43%,rgba(94,16,39,0) 78%),radial-gradient(118% 76% at 10% -16%,rgba(255,255,255,.12) 0%,rgba(255,255,255,.032) 30%,rgba(255,255,255,0) 58%),radial-gradient(96% 72% at 102% 108%,rgba(255,255,255,.052) 0%,rgba(255,255,255,.010) 34%,rgba(255,255,255,0) 62%),radial-gradient(92% 78% at 88% 112%,rgba(72,5,27,.11) 0%,rgba(42,3,16,0) 60%),#000!important;box-sizing:border-box!important;box-shadow:inset 3px 3px .5px -3.5px rgba(255,255,255,.10),inset -3px -3px .5px -3.5px rgba(156,38,70,.48),inset 1px 1px 1px -.5px rgba(140,29,61,.30),inset -1px -1px 1px -.5px rgba(124,22,53,.24),inset 0 0 6px 6px rgba(255,255,255,.055),inset 0 0 2px 2px rgba(255,255,255,.035),inset 0 1px 0 rgba(112,18,49,.065),inset 0 -1px 0 rgba(88,12,37,.15)!important;backdrop-filter:blur(22px) saturate(1.40) brightness(1.05) contrast(1.04)!important;-webkit-backdrop-filter:blur(22px) saturate(1.40) brightness(1.05) contrast(1.04)!important;isolation:isolate!important;transform:translateZ(0)!important}.home-bonus-next>svg{width:26px!important;height:26px!important;padding:4px!important;box-sizing:border-box!important;border-radius:50%!important;background:rgba(255,255,255,.08)!important;color:rgba(255,255,255,.82)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.11)!important}.home-bonus-guide-icon svg{width:20px!important;height:20px!important;color:#e9a6b6!important}.home-bonus-next span{display:block!important;color:rgba(255,255,255,.48)!important;font-size:11px!important;font-weight:700!important;line-height:1.25!important}.home-bonus-guide-copy span{display:block!important;color:rgba(255,255,255,.48)!important;font-size:10px!important;font-weight:700!important;line-height:1.25!important}.home-bonus-next b{display:block!important;margin-top:2px!important;color:#fff!important;font-size:13px!important;font-weight:800!important;line-height:1.15!important}.home-bonus-guide{display:grid!important;gap:8px!important}.home-bonus-guide-row{display:grid!important;grid-template-columns:24px minmax(0,1fr)!important;gap:9px!important;align-items:start!important}.home-bonus-guide-icon{padding-top:1px!important}.home-bonus-guide-copy b{display:block!important;margin-bottom:2px!important;color:#fff!important;font-size:12px!important;font-weight:800!important;line-height:1.2!important}.home-bonus-list{min-height:0!important;display:grid!important;grid-auto-rows:48px!important;align-content:start!important;gap:7px!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:none!important;padding:2px 0 4px!important}.home-bonus-list::-webkit-scrollbar{display:none!important}.home-bonus-row{position:relative!important;overflow:hidden!important;height:48px!important;min-height:48px!important;border:0!important;outline:0!important;border-radius:28px!important;background:radial-gradient(34px 34px at 0 0,rgba(186,53,87,.16) 0%,rgba(146,35,66,.07) 42%,rgba(104,18,44,0) 76%),radial-gradient(36px 36px at 100% 100%,rgba(172,46,79,.15) 0%,rgba(133,30,60,.065) 43%,rgba(94,16,39,0) 78%),radial-gradient(118% 76% at 10% -16%,rgba(255,255,255,.12) 0%,rgba(255,255,255,.032) 30%,rgba(255,255,255,0) 58%),radial-gradient(96% 72% at 102% 108%,rgba(255,255,255,.052) 0%,rgba(255,255,255,.010) 34%,rgba(255,255,255,0) 62%),radial-gradient(92% 78% at 88% 112%,rgba(72,5,27,.11) 0%,rgba(42,3,16,0) 60%),#000!important;box-shadow:inset 3px 3px .5px -3.5px rgba(255,255,255,.10),inset -3px -3px .5px -3.5px rgba(156,38,70,.48),inset 1px 1px 1px -.5px rgba(140,29,61,.30),inset -1px -1px 1px -.5px rgba(124,22,53,.24),inset 0 0 6px 6px rgba(255,255,255,.055),inset 0 0 2px 2px rgba(255,255,255,.035),inset 0 1px 0 rgba(112,18,49,.065),inset 0 -1px 0 rgba(88,12,37,.15)!important;color:#fff!important;display:grid!important;grid-template-columns:26px minmax(0,1fr) auto!important;align-items:center!important;gap:7px!important;padding:0 10px!important;box-sizing:border-box!important;backdrop-filter:blur(22px) saturate(1.40) brightness(1.05) contrast(1.04)!important;-m«ëŒ+Š×®º+º$zzb¥çvV&¶—BÖ&6¶G&÷Öf–ÇFW#¦&ÇW"ƒ#'‚’6GW&FRƒãC’'&–v‡FæW72ƒãR’6öçG&7BƒãB’–×÷'FçC¶—6öÆF–öã¦—6öÆFR–×÷'FçC·G&ç6f÷&Ó§G&ç6ÆFU¢ƒ’–×÷'FçGÒæ†öÖRÖ&öçW2×&æ²ÖfF'·v–GFƒ£#g‚–×÷'FçC¶†V–v‡C£#g‚–×÷'FçC¶&÷&FW"×&F—W3£SR–×÷'FçC¶F—7Æ“¦w&–B–×÷'FçC·Æ6RÖ—FV×3¦6VçFW"–×÷'FçC¶÷fW&fÆ÷s¦†–FFVâ–×÷'FçC¶&6¶w&÷VæC§&v&ƒ#SRÃ#SRÃ#SRÂã‚’–×÷'FçC¶6öÆ÷#§&v&ƒ#SRÃ#SRÃ#SRÂãƒ"’–×÷'FçC¶föçB×6—¦S£ãW‚–×÷'FçC¶föçB×vV–v‡C£ƒ–×÷'FçC¶Æ–æRÖ†V–v‡C£–×÷'FçC¶&÷‚×6†F÷s¦–ç6WB‚&v&ƒ#SRÃ#SRÃ#SRÂã’–×÷'FçGÒæ†öÖRÖ&öçW2×&÷ræ†öÖRÖÆ—fR×v–ææW"×W6W'¶Ö–â×v–GFƒ£–×÷'FçC¶F—7Æ“¦fÆW‚–×÷'FçC¶Æ–vâÖ—FV×3¦6VçFW"–×÷'FçGÒæ†öÖRÖ&öçW2×&÷ræ†öÖRÖÆ—fR×v–ææW"×W6W"7ç¶F—7Æ“¦&Æö6²–×÷'FçC¶6öÆ÷#¢6ffb–×÷'FçC¶föçB×6—¦S£'‚–×÷'FçC¶föçB×vV–v‡C£ƒ–×÷'FçC¶Æ–æRÖ†V–v‡C£ã‚–×÷'FçGÒæ†öÖRÖ&öçW2×&÷ræ†öÖRÖÆ—fR×v–ææW"ÖÖ÷VçG¶6öÆ÷#§&v&ƒ#SRÃ#SRÃ#SRÂã3B’–×÷'FçC¶föçB×6—¦S£'‚–×÷'FçC¶föçB×vV–v‡C£sS–×÷'FçC·v†—FR×76S¦æ÷w&–×÷'FçGÒæ†öÖRÖ&öçW2×&—¦RÖÖ÷VçG¶F—7Æ“¦–æÆ–æRÖfÆW‚–×÷'FçC¶Æ–vâÖ—FV×3¦6VçFW"–×÷'FçC¶v£'‚–×÷'FçGÒæ†öÖRÖ&öçW2×&—¦RÖ–6öç·v–GFƒ£#‚–×÷'FçC¶†V–v‡C£#‚–×÷'FçC¶F—7Æ“¦–æÆ–æRÖfÆW‚–×÷'FçC¶Æ–vâÖ—FV×3¦6VçFW"–×÷'FçC¶§W7F–g’Ö6öçFVçC¦6VçFW"–×÷'FçC¶fÆWƒ£#‚–×÷'FçGÒæ†öÖRÖ&öçW2×&—¦RÖ–6öâ–Öw·v–GFƒ£#‚–×÷'FçC¶†V–v‡C£#‚–×÷'FçC¶F—7Æ“¦&Æö6²–×÷'FçC¶ö&¦V7BÖf—C¦6öçF–â–×÷'FçGÒrÀ¢ræ†öÖR×F–6¶WBÖG&vW'¶&6¶w&÷VæC§&v&ƒ2Ã2Ã2ÂãSB’–×÷'FçC¶&÷‚×6†F÷s¦–ç6WB‚&v&ƒ#SRÃ#SRÃ#SRÂãR’Æ–ç6WBÓ‚&v&ƒ#SRÃ#SRÃ#SRÂãb’Æ–ç6WB#'‚&v&ƒ#SRÃ#SRÃ#SRÂãSR’Ãg‚3g‚&v&ƒÃÃÂã#"’–×÷'FçC¶&6¶G&÷Öf–ÇFW#¦&ÇW"ƒ‚’6GW&FRƒã"’–×÷'FçC²×vV&¶—BÖ&6¶G&÷Öf–ÇFW#¦&ÇW"ƒ‚’6GW&FRƒã"’–×÷'FçGÒrÀ¢ræ†öÖR×F–6¶WBÖÆ—7BÖ—FV×¶†V–v‡C£CG‚–×÷'FçC¶&÷&FW"×&F—W3£‡‚–×÷'FçC¶&6¶w&÷VæC§&v&ƒÃÃÂã#"’–×÷'FçC¶&÷‚×6†F÷s¦–ç6WB‚&v&ƒ#SRÃ#SRÃ#SRÂãb’Æ–ç6WBÓ‚&v&ƒ#SRÃ#SRÃ#SRÂãB’–×÷'FçC¶6öÆ÷#¢6ffb–×÷'FçC¶föçB×vV–v‡C£“S–×÷'FçGÒrÀ¢rçfW†Ö6öæfWGF’ÖÆ–W'·÷6—F–öã¦f—†VB–×÷'FçC¶–ç6WC£–×÷'FçC·¢Ö–æFWƒ£“““““’–×÷'FçC·ö–çFW"ÖWfVçG3¦æöæR–×÷'FçC¶÷fW&fÆ÷s¦†–FFVâ–×÷'FçC¶÷6—G“£–×÷'FçC·G&ç6—F–öã¦÷6—G’C#×2V6R–×÷'FçGÒrÀ¢rçfW†Ö6öæfWGF’ÖÆ–W"æ—2ÖVæF–æw¶÷6—G“£–×÷'FçGÒrÀ¢rçfW†Ö6öæfWGF’×–V6W·÷6—F–öã¦'6öÇWFR–×÷'FçC·F÷§f"‚Ò×’’–×÷'FçC¶ÆVgC§f"‚Ò×‚’–×÷'FçC·v–GFƒ§f"‚Ò×r’–×÷'FçC¶†V–v‡C§f"‚ÒÖ‚’–×÷'FçC¶&÷&FW"×&F—W3§f"‚Ò×"’–×÷'FçC¶&6¶w&÷VæC§f"‚ÒÖ2’–×÷'FçC¶÷6—G“¢ã“C·G&ç6f÷&ÒÖ÷&–v–ã¦6VçFW"–×÷'FçC¶æ–ÖF–öã§fW†6öæfWGF”fÆÂc×2Æ–æV"×2f÷'v&G2–×÷'FçC¶&÷‚×6†F÷s£—‚&v&ƒ#SRÃ#Ã“Âã‚’–×÷'FçGÒrÀ¢t¶W–g&ÖW2fW†6öæfWGF”fÆÇ³W·G&ç6f÷&Ó§G&ç6ÆFS6BƒÂÓC'‚Ã’&÷FFRƒFVr—Ós‚W·G&ç6f÷&Ó§G&ç6ÆFS6B‡f"‚ÒÖW‚’Ãs'f‚Ã’&÷FFR‡f"‚Ò×#2’—ÓW·G&ç6f÷&Ó§G&ç6ÆFS6B‡f"‚ÒÖW‚’Ã#3f‚Ã’&÷FFR‡f"‚Ò×#2’—×Òp¥Òæ¦ö–â‚rr“° ¦W‡÷'B6öç7B„ôÔUõ5E”ÄU2Ò„ôÔUô$4Uõ5E”ÄU2²„ôÔUôÔ$µUõ5E”ÄU2²„ôÔUõ4ÄõEõ5E”ÄU3° ¢òò†öÖR÷vç2—G2Ö&·WÂ7G–ÆW2Â76WB7–æ6‡&öæ—¦F–öâÂæB6Æ–VçB&V†f–÷"à¦W‡÷'B6öç7B„ôÔUõ4T5D”ôâÒÇ6V7F–öâ–CÒ&†öÖR"6Æ73Ò'f–Wr7F—fR#ãÇ6V7F–öâ–CÒ&†öÖU&öÖô6&÷W6VÂ"6Æ73Ò&†öÖR×&öÖòÖ6&÷W6VÂ"&–ÖÆ&VÃÒ$fVGW&VB#ãÂ÷6V7F–öããÂ÷6V7F–öãæ° ¦6öç7B„ôÔUôÔ$µUõ45$•BÒ ¢†gVæ7F–öâ‚—°¢gVæ7F–öâ‡2Ç"—·&WGW&â‡'ÇÆFö7VÖVçB’çVW'•6VÆV7F÷"‡2—Ğ¢gVæ7F–öâÆ÷GFW'•FW‡B†¶W’—°¢f"ÆÃ×v–æF÷råõ÷fW†Æ÷GFW'•FW‡G7ÇÇ·ÒÇFs×v–æF÷råFVÆVw&Òbgv–æF÷råFVÆVw&ÒåvV$ÇW6W#×FrbgFræ–æ—DFFVç6fRbgFræ–æ—DFFVç6fRçW6W'ÇÇ·ÒÆ6öFSÕ7G&–ær‡W6W"æÆæwVvUö6öFWÇÆæf–vF÷"æÆæwVvWÇÂvVâr’ç&WÆ6R‚uòrÂrÒr“°¢f"Æ–6W3×·C¢wBÔ%"rÂwBÕBs¢wBÔ%"rÇ¦ƒ¢w¦‚Ô†çBrÂw¦‚ÕErs¢w¦‚Ô†çBrÂw¦‚Ô„²s¢w¦‚Ô†çBrÂw¦‚ÔÔòs¢w¦‚Ô†çBwÓ°¢f"6÷VçG'“Õ7G&–ær‡v–æF÷råfW†FWFV7FVD6÷VçG'”6öFWÇÂrr’çG&–Ò‚’çFõWW$66R‚’Æ6÷VçG'”Æö6ÆSÕ7G&–ær‚‡v–æF÷råõ÷fW†6÷VçG'”Æö6ÆW7ÇÇ·Ò•¶6÷VçG'•×ÇÂrr“°¢f"Æö6ÆSÖÆÅ¶6÷VçG'”Æö6ÆUÓö6÷VçG'”Æö6ÆS¢†ÆÅ¶6öFUÓö6öFS¢†Æ–6W5¶6öFU×ÇÆÆ–6W5¶6öFRç7Æ—B‚rÒr•³Õ×ÇÆ6öFRç7Æ—B‚rÒr•³Ò’“°¢&WGW&â7G&–ær‚†ÆÅ¶Æö6ÆUÒbfÆÅ¶Æö6ÆUÕ¶¶W•Ò—ÇÂ†ÆÂæVâbfÆÂæVå¶¶W•Ò—ÇÂrr“°¢Ğ¢v–æF÷råfW†Æ÷GFW'•FW‡CÖÆ÷GFW'•FW‡C°¢gVæ7F–öâ&VVÅ’†–æFW‚—·&WGW&âwG&ç6ÆFS6BƒÂÒr²‚†–æFW‚£C’³#’²w‚Ã’wĞ¢gVæ7F–öâ&VVÄF–v—G4‡FÖÂ‚—·f"‡FÖÃÒrs¶f÷"‡f"7–6ÆSÓ¶7–6ÆSÃC¶7–6ÆR²²–f÷"‡f"ãÓ¶ãÃ¶â²²–‡FÖÂ³ÒsÇ7â6Æ73Ò&†öÖR×6Æ÷BÖçVÖ&W"ÖF–v—B#âr¶â²sÂ÷7ãâs·&WGW&â‡FÖÇĞ¢gVæ7F–öâ6Æ÷G4‡FÖÂ‚—·f"‡FÖÃÒrs¶f÷"‡f"“Ó¶“ÃS¶’²²—·f"cÓ¶‡FÖÂ³ÒsÆF—b6Æ73Ò&†öÖR×6Æ÷BÖçVÖ&W"×&VVÂ"FF×6Æ÷BÖ–æFWƒÒ"r¶’²r"FF×6Æ÷B×fÇVSÒ"r·b²r#ãÆF—b6Æ73Ò&†öÖR×6Æ÷BÖçVÖ&W"×7G&—"FF×6Æ÷B×7G&—7G–ÆSÒ'G&ç6f÷&Ó¢r·&VVÅ’ƒ#·b’²r#âr·&VVÄF–v—G4‡FÖÂ‚’²sÂöF—cãÂöF—câw×&WGW&âsÆF—b6Æ73Ò&†öÖR×6Æ÷BÖçVÖ&W"Öw&–B"&–Ö†–FFVãÒ'G'VR#âr¶‡FÖÂ²sÂöF—câwĞ¢gVæ7F–öâÆ6U6V7F–öâ††öÖRÇ6V2—·f"&öÖó×‚r6†öÖU&öÖô6&÷W6VÂrÆ†öÖR’Ææ6†÷#×&öÖó÷&öÖòææW‡E6–&Æ–æs¦†öÖRæf—'7D6†–ÆC¶–b†æ6†÷"Ó×6V2–†öÖRæ–ç6W'D&Vf÷&R‡6V2Ææ6†÷"—Ğ¢gVæ7F–öâVç7W&TG&vW%÷'FÂ‡6V2—µ²v†öÖUF–6¶WDG&vW$&6¶G&÷rÂv†öÖUF–6¶WDG&vW"uÒæf÷$V6‚†gVæ7F–öâ†–B—·f"VÃ×‚r2r¶–BÇ6V2“¶–b†VÂbfVÂç&VçDæöFRÓÖFö7VÖVçBæ&öG’–Fö7VÖVçBæ&öG’æVæD6†–ÆB†VÂ—Ò—Ğ¢gVæ7F–öâ6WDG&vW"†÷VâÇ6V2—¶Vç7W&TG&vW%÷'FÂ‡6V2“·f"G&vW#×‚r6†öÖUF–6¶WDG&vW"r’Æ&6¶G&÷×‚r6†öÖUF–6¶WDG&vW$&6¶G&÷r“¶–b†G&vW"–G&vW"æ6Æ74Æ—7BçFövvÆR‚v—2Ö÷VârÂ÷Vâ“¶–b†&6¶G&÷–&6¶G&÷æ6Æ74Æ—7BçFövvÆR‚v—2Ö÷VârÂ÷Vâ—Ğ¢gVæ7F–öâ'V–ÆB‚—°¢f"†öÖS×‚r6†öÖRr“¶–b‚†öÖR—&WGW&âçVÆÃ°¢f"6V3×‚r6†öÖTÇV6·”6öFU6V7F–öârÆ†öÖR“°¢–b‚6V2—°¢6V3ÖFö7VÖVçBæ7&VFTVÆVÖVçB‚w6V7F–öâr“°¢6V2æ–CÒv†öÖTÇV6·”6öFU6V7F–öâs°¢6V2æ–ææW$…DÔÃÒsÆF—b6Æ73Ò&†öÖR×F–6¶WBÖG&vW"Ö&6¶G&÷"–CÒ&†öÖUF–6¶WDG&vW$&6¶G&÷#ãÂöF—cãÆF—b6Æ73Ò&†öÖR×F–6¶WBÖG&vW""–CÒ&†öÖUF–6¶WDG&vW"#ãÆF—b6Æ73Ò&†öÖR×F–6¶WBÖG&vW"Ö†VB#ãÇ7G&öæsä×’F–6¶WG3Â÷7G&öæsãÆ'WGFöâ6Æ73Ò&†öÖR×F–6¶WBÖG&vW"Ö6Æ÷6R"–CÒ&†öÖUF–6¶WDG&vW$6Æ÷6R"G—SÒ&'WGFöâ#ì9sÂö'WGFöããÂöF—cãÆF—b6Æ73Ò&†öÖR×F–6¶WBÖG&vW"Ö6÷VçB#ãÇ7G&öærFF×F–6¶WBÖ6÷VçCãF–6¶WG3Â÷7G&öæsãÇ7â6Æ73Ò&†öÖR×F–6¶WB×v–âÖ6†æ6R×FW‡B#ãÇ7âFF×v–âÖ6†æ6RÖÆ&VÃå–÷W"6†æ6RFòv–ãÂ÷7ããÆ"FF×v–âÖ6†æ6SãSÂö#ãÂ÷7ããÂöF—cãÆF—b6Æ73Ò&†öÖR×F–6¶WBÖÆ—7B"–CÒ&†öÖUF–6¶WDÆ—7B#ãÂöF—cãÂöF—cãÆF—b6Æ73Ò&†öÖRÖÇV6·’Ö6&B#ãÆF—b6Æ73Ò&†öÖRÖÇV6·’Ö†VB"&–Ö†–FFVãÒ'G'VR#ãÂöF—cãÇ6V7F–öâ6Æ73Ò&†öÖRÖÆ÷GFW'’×6Æ÷BÖ6&B"&–ÖÆ&VÃÒ$Æ÷GFW'’6Æ÷B–ÖvR#ãÆ–Ör6Æ73Ò&†öÖRÖÆ÷GFW'’×6Æ÷BÖ–ÖvR"7&3Ò"öö’ö†öÖRÖÆ÷GFW'’×6Æ÷Bçæs÷cÖ†öÖRÖÆ÷GFW'’"ÇCÒ""FV6öF–æsÒ&7–æ2"ÆöF–æsÒ&VvW""óâr·6Æ÷G4‡FÖÂ‚’²sÂ÷6V7F–öããÆF—b6Æ73Ò&†öÖR×F–6¶WBÖÆ–÷WB#ãÆF—b6Æ73Ò&†öÖR×F–6¶WBÖ6&B#ãÆF—b6Æ73Ò&†öÖR×F–6¶WBÖ6÷VçB"FF×F–6¶WBÖ6÷VçCãF–6¶WCÂöF—cãÆF—b6Æ73Ò&†öÖR×F–6¶WB×7FWW"#ãÆ'WGFöâ6Æ73Ò&†öÖR×F–6¶WB×7FW"G—SÒ&'WGFöâ"FF×F–6¶WBÖÖ–çW3âÓÂö'WGFöããÆ'WGFöâ6Æ73Ò&†öÖR×F–6¶WB×7FW"G—SÒ&'WGFöâ"FF×F–6¶WB×ÇW3â³Âö'WGFöããÂöF—cãÆ'WGFöâ6Æ73Ò&†öÖR×F–6¶WBÖ'WGFöâ"–CÒ&†öÖUF–6¶WD'WGFöâ"G—SÒ&'WGFöâ#ävWBF–6¶WCÂö'WGFöããÂöF—cãÆF—b6Æ73Ò&†öÖR×F–6¶WBÖf–ææ6R×f—7VÂ"&–Ö†–FFVãÒ'G'VR#ãÂöF—cãÂöF—cãÂöF—câs°¢Ğ¢Æ6U6V7F–öâ††öÖRÇ6V2“°¢Vç7W&TG&vW%÷'FÂ‡6V2“°¢&WGW&â6V3°¢Ğ¢gVæ7F–öâ&–æB‡6V2—°¢–b‡6V2æFF6WBçF–6¶WEV”&÷VæCÓÓÒsr—&WGW&ã°¢6V2æFF6WBçF–6¶WEV”&÷VæCÒss°¢6V2æFDWfVçDÆ—7FVæW"‚v6Æ–6²rÆgVæ7F–öâ†R—·f"CÖRçF&vWC¶–b‡BbgBæ–CÓÓÒv†öÖUF–6¶WD–ÖvT'WGFöâr—¶Rç&WfVçDFVfVÇB‚“·6WDG&vW"‡G'VRÇ6V2—×ÒÇG'VR“°¢Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚v6Æ–6²rÆgVæ7F–öâ†R—·f"CÖRçF&vWC¶–b‡BbgBæ–CÓÓÒv†öÖUF–6¶WDG&vW$6Æ÷6Rr—¶Rç&WfVçDFVfVÇB‚“·6WDG&vW"†fÇ6RÇ6V2“·&WGW&çÖ–b‡BbgBæ–CÓÓÒv†öÖUF–6¶WDG&vW$&6¶G&÷r—¶Rç&WfVçDFVfVÇB‚“·6WDG&vW"†fÇ6RÇ6V2—×ÒÇG'VR“°¢Ğ¢gVæ7F–öâ–æ—B‚—·f"6V3Ö'V–ÆB‚“¶–b‡6V2–&–æB‡6V2—Ğ¢–b†Fö7VÖVçBç&VG•7FFSÓÓÒvÆöF–ærr–Fö7VÖVçBæFDWfVçDÆ—7FVæW"‚tDôÔ6öçFVçDÆöFVBrÆ–æ—BÇ¶öæ6S§G'VWÒ“¶VÇ6R–æ—B‚“°§Ò’‚“°¦° ¦6öç7B„ôÔUõ4ÄõEõ45$•BÒ ¢†gVæ7F–öâ‚—°¢f"'W7“ÖfÇ6RÇ&÷sÓ3BÇ&W7DÆö÷Ó#Ç7–äÆö÷3Ó#RÇF÷FÅ7–ä×3ÓcÇ&VVÅ7F÷v×3Ó3°¢gVæ7F–öâ‡2Ç"—·&WGW&â‡'ÇÆFö7VÖVçB’çVW'•6VÆV7F÷"‡2—Ğ¢gVæ7F–öâ‡2Ç"—·&WGW&â'&’ç&÷F÷G—Rç6Æ–6Ræ6ÆÂ‚‡'ÇÆFö7VÖVçB’çVW'•6VÆV7F÷$ÆÂ‡2’—Ğ¢gVæ7F–öâ’†’—·&WGW&âwG&ç6ÆFS6BƒÂÒr²‚†’§&÷r’²‡&÷ró"’’²w‚Ã’wĞ¢gVæ7F–öâF–v—G2‚—·f"ƒÒrs¶f÷"‡f"3Ó¶3Ã“¶2²²–f÷"‡f"ãÓ¶ãÃ¶â²²–‚³ÒsÇ7â6Æ73Ò&†öÖR×6Æ÷BÖçVÖ&W"ÖF–v—B#âr¶â²sÂ÷7ãâs·&WGW&â‡Ğ¢gVæ7F–öâ–æFW„f÷"‡bÆÆö÷—·&WGW&âÆö÷£´ÖF‚æÖ‚ƒÄÖF‚æÖ–âƒ’ÄÖF‚æfÆö÷"„çVÖ&W"‡b—ÇÃ’’—Ğ¢gVæ7F–öâVæ&ÆT†öÖU67&öÆÂ‚—·f"ƒ×‚r6†öÖRr“¶Fö7VÖVçBæ&öG’æ6Æ74Æ—7Bç&VÖ÷fR‚v†öÖR×67&öÆÂÖÆö6¶VBr“¶–b†‚—¶‚ç7G–ÆRç&VÖ÷fU&÷W'G’‚v÷fW&fÆ÷r×’r“¶‚ç7G–ÆRç&VÖ÷fU&÷W'G’‚wF÷V6‚Ö7F–öâr“¶‚ç67&öÆÄÆVgCÓ×Ğ¢gVæ7F–öâG&t–æfô‡FÖÂ‚—·&WGW&âsÆF—b6Æ73Ò&†öÖRÖG&rÖ–æfòÖ6&B"–CÒ&†öÖTG&t–æfô6&B#ãÆF—b6Æ73Ò&†öÖRÖG&rÖÖ–â#ãÆF—b6Æ73Ò&†öÖRÖG&rÖ6÷’#ãÇ7â6Æ73Ò&†öÖRÖG&rÖÆ&VÂ#äæW‡BG&r–ãÂ÷7ããÇ7G&öær6Æ73Ò&†öÖRÖG&r×F–ÖR"FFÖG&r×F–ÖSã££Â÷7G&öæsãÂöF—cãÇ7â6Æ73Ò&†öÖRÖG&rÖF—f–FW""&–Ö†–FFVãÒ'G'VR#ãÂ÷7ããÆF—b6Æ73Ò&†öÖR×&—¦RÖ6÷’#ãÇ7â6Æ73Ò&†öÖR×&—¦RÖÆ&VÂ#å&—¦RööÃÂ÷7ããÇ7G&öær6Æ73Ò&†öÖR×&—¦R×fÇVR#ãÇ7âFF×&—¦R×ööÃããÂ÷7ããÇ7â6Æ73Ò&†öÖR×&—¦RÖ–6öâFöâÖÖ–æ’Ö–6öâ#ãÆ–ÖrFF×&—¦R×ööÂÖ–6öâÇCÒ""&–Ö†–FFVãÒ'G'VR"7G–ÆSÒ&F—7Æ“¦æöæR#ãÂ÷7ããÂ÷7G&öæsãÂöF—cãÂöF—cãÆF—b6Æ73Ò&†öÖRÖG&rÖ7F–öç2&Ú±î¸Â¸­yêë¢°k¢G§¦*^){var html='';for(var cycle=0;cycle<4;cycle++)for(var n=0;n<10;n++)html+='<span class="home-slot-number-digit">'+n+'</span>';return html}
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
      sec.innerHTML='<div class="home-ticket-drawer-backdrop" id="homeTicketDrawerBackdrop"></div><div class="home-ticket-drawer" id="homeTicketDrawer"><div class="home-ticket-drawer-head"><strong>My Tickets</strong><button class="home-ticket-drawer-close" id="homeTicketDrawerClose" type="button">Ã—</button></div><div class="home-ticket-drawer-count"><strong data-ticket-count>0 tickets</strong><span class="home-ticket-win-chance-text"><span data-win-chance-label>Your chance to win</span><b data-win-chance>0%</b></span></div><div class="home-ticket-list" id="homeTicketList"></div></div><div class="home-lucky-card"><div class="home-lucky-head" aria-hidden="true"></div><section class="home-lottery-slot-card" aria-label="Lottery slot image"><img class="home-lottery-slot-image" src="/app/api/home-lottery-slot.png?v=home-lottery" alt="" decoding="async" loading="eager"/>'+slotsHtml()+'</section><div class="home-ticket-layout"><div class="home-ticket-card"><div class="home-ticket-count" data-ticket-count>1 ticket</div><div class="home-ticket-stepper"><button class="home-ticket-step" type="button" data-ticket-minus>-</button><button class="home-ticket-step" type="button" data-ticket-plus>+</button></div><button class="home-ticket-button" id="homeTicketButton" type="button">Get Ticket</button></div><div class="home-ticket-finance-visual" aria-hidden="true"></div></div></div>';
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
    wrap.innerHTML='<div class="home-bonus-backdrop" id="homeBonusBackdrop"></div><section class="home-bonus-panel" id="homeBonusPanel" role="dialog" aria-modal="true" aria-label="Lottery"><div class="home-bonus-grab" aria-hidden="true"></div><header class="home-bonus-head"><div class="home-bonus-title"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9h12v10H6zM4 6h16v3H4zM12 6v13M11.8 5.9C9 5.7 7.2 4.4 7.2 2.9c0-1.1.9-1.8 1.9-1.6 1.5.3 2.4 1.9 2.7 4.6ZM12.2 5.9c2.8-.2 4.6-1.5 4.6-3 0-1.1-.9-1.8-1.9-1.6-1.5.3-2.4 1.9-2.7 4.6Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><strong data-lottery-title></strong></div><button class="home-bonus-close" id="homeBonusClose" type="button" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true" style="width:18px;height:18px;display:block"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button></header><div class="home-bonus-next"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="3" stroke="currentColor" stroke-width="1.7"/><path d="M8 3v4m8-4v4M4 10h16" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><div><span data-lottery-draw-label></span><b data-lottery-draw-at>â€”</b></div></div><div class="home-bonus-guide"><div class="home-bonus-guide-row"><div class="home-bonus-guide-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></div><div class="home-bonus-guide-copy"><b data-lottery-how-title></b><span data-lottery-ticket-note></span></div></div><div class="home-bonus-guide-row"><div class="home-bonus-guide-icon"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 14.5 8l5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9 5.5-.8L12 3Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></div><div class="home-bonus-guide-copy"><b data-lottery-prize-title></b><span data-lottery-prize-note></span></div></div></div><div class="home-bonus-list" aria-live="polite"></div></section>';
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
      var v=Math.max(0,Math.min(9,Math.floor(Number(m«ëŒ+Š×®º+º$zzb¥æÚ±î¸Â¸­yêë¢°k¢G§¦*^reel.getAttribute('data-slot-value')||'0'))));
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