export const PLAY_ZONE_STYLES = `
html:not(.play-zone-visibility-ready) #playzone [data-play-zone-card-id]{display:none!important}
#playzone [data-play-zone-card-id][hidden]{display:none!important}
.app{padding-top:calc(40px + env(safe-area-inset-top))!important}
.content{height:calc(100dvh - 92px - 20px - env(safe-area-inset-top) - env(safe-area-inset-bottom))!important;overflow:hidden!important;scrollbar-width:none!important;-ms-overflow-style:none!important}
.content::-webkit-scrollbar,.play-zone-view::-webkit-scrollbar,.play-zone-stage::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}
.tabs{background:rgba(255,255,255,.055)!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:999px!important;box-shadow:0 18px 46px rgba(0,0,0,.2),inset 0 1px 0 rgba(255,255,255,.2),inset 0 -1px 0 rgba(255,255,255,.05)!important;-webkit-backdrop-filter:blur(34px) saturate(210%)!important;backdrop-filter:blur(34px) saturate(210%)!important;isolation:isolate!important;overflow:hidden!important}
.tabs:before,.tabs:after{content:none!important;display:none!important}
.tab{background:transparent!important;border:0!important;color:rgba(255,255,255,.62)!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
.tab.active{background:rgba(255,255,255,.9)!important;color:#050505!important;box-shadow:0 8px 24px rgba(255,255,255,.14),inset 0 1px 0 rgba(255,255,255,.72)!important}
.play-zone-view{padding:6px 0 calc(150px + env(safe-area-inset-bottom))!important;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-y:contain!important;scrollbar-width:none!important;-ms-overflow-style:none!important}
.play-zone-stage{--play-card-gap:6px;display:flex!important;flex-direction:column!important;gap:10px!important;padding:0 0 96px!important;position:relative!important;overflow:visible!important;width:100%!important;max-width:none!important;scrollbar-width:none!important;-ms-overflow-style:none!important}
.play-zone-hero{display:none!important}
.play-zone-section-head{width:max-content!important;min-width:138px!important;max-width:calc(100% - 32px)!important;height:38px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:0!important;margin:2px auto 8px!important;padding:0 18px!important;border-radius:999px!important;background:linear-gradient(180deg,rgba(255,255,255,.105),rgba(255,255,255,.045))!important;border:1px solid rgba(255,255,255,.10)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.20),0 12px 28px rgba(0,0,0,.12)!important;-webkit-backdrop-filter:blur(3px)!important;backdrop-filter:blur(3px)!important;text-align:center!important}
.play-zone-section-head strong{font-size:13px!important;font-weight:850!important;letter-spacing:.045em!important;text-transform:uppercase!important;color:rgba(255,255,255,.64)!important;text-align:center!important;text-shadow:none!important;filter:none!important;line-height:1.18!important;padding:2px 1px 3px!important;overflow:visible!important}
.play-zone-section-head strong:before,.play-zone-section-head strong:after{content:none!important;display:none!important}
.play-zone-section-head span{display:none!important}
.play-zone-featured-row,.play-zone-upcoming-row,.play-zone-triangle,.play-zone-triangle-row,.play-zone-triangle-row-3,.play-zone-triangle-row-2,.play-zone-triangle-row-1{display:flex!important;flex-direction:column!important;grid-template-columns:none!important;gap:10px!important;padding:0!important;margin:0!important;justify-content:stretch!important;perspective:none!important;position:relative!important;z-index:2!important;width:100%!important;max-width:none!important}
.game-card-shell{width:100%!important;max-width:none!important;display:block!important;position:relative!important;margin:0!important;padding:0!important;transform:none!important;animation:none!important;box-shadow:none!important;background:transparent!important;border:0!important}
.game-card{width:100%!important;max-width:none!important;min-width:0!important;height:calc((100vw - (var(--play-card-gap) * 2)) / 3 + (var(--play-card-gap) * 2))!important;min-height:128px!important;max-height:180px!important;border:1px solid rgba(255,255,255,.10)!important;border-radius:22px!important;background:linear-gradient(180deg,rgba(255,255,255,.105),rgba(255,255,255,.045))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.20),0 14px 34px rgba(0,0,0,.16)!important;padding:0!important;display:block!important;position:relative!important;color:#fff!important;text-align:left!important;overflow:hidden!important;scroll-snap-align:start!important;-webkit-backdrop-filter:blur(3px)!important;backdrop-filter:blur(3px)!important;transition:transform .18s ease!important}
.game-card:active{transform:scale(.985)!important}
.game-card-live{background:linear-gradient(180deg,rgba(255,255,255,.105),rgba(255,255,255,.045))!important;background-color:rgba(255,255,255,.06)!important;border:1px solid rgba(255,255,255,.10)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.20),0 14px 34px rgba(0,0,0,.16)!important;padding:0!important;border-radius:22px!important;overflow:hidden!important;filter:none!important;-webkit-backdrop-filter:blur(3px)!important;backdrop-filter:blur(3px)!important}
.game-card-live:before,.game-card-live:after,.play-zone-featured-card:before,.play-zone-featured-card:after{content:none!important;display:none!important;background:none!important;box-shadow:none!important;border:0!important}
.game-card-live .game-info,.game-card-live .game-open{display:none!important}
.game-image{position:absolute!important;inset:var(--play-card-gap)!important;width:auto!important;height:auto!important;aspect-ratio:3/1!important;border-radius:16px!important;background:transparent!important;display:block!important;place-items:unset!important;overflow:hidden!important;border:0!important;outline:0!important;box-shadow:none!important;padding:0!important;z-index:1!important}
.game-image img{display:block!important;width:100%!important;height:100%!important;object-position:center!important;border-radius:16px!important;background:transparent!important;border:0!important;outline:0!important;box-shadow:none!important;image-rendering:auto!important;transform:translateZ(0)!important;backface-visibility:hidden!important}
.game-card-live .game-image{position:absolute!important;inset:var(--play-card-gap)!important;border:0!important;outline:0!important;border-radius:16px!important;box-shadow:none!important;background:transparent!important;overflow:hidden!important;padding:0!important}
.game-card-live .game-image:after{content:none!important;display:none!important}
.game-info{display:none!important}
.game-badge{display:none!important}
.game-info strong{font-size:15px!important;font-weight:930!important;letter-spacing:-.045em!important;line-height:1!important;color:#fff!important}
.game-info small{color:rgba(255,255,255,.50)!important;font-size:10px!important;font-weight:700!important;line-height:1.18!important;display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important}
.game-footer{position:absolute!important;left:18px!important;right:18px!important;bottom:12px!important;z-index:4!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;min-width:0!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0!important;pointer-events:none!important}
.game-footer-live:before,.game-footer-live:after{content:none!important;display:none!important}
.game-players{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;min-width:0!important;color:rgba(255,255,255,.90)!important;font-size:10.5px!important;font-weight:900!important;letter-spacing:-.02em!important;white-space:nowrap!important;background:rgba(0,0,0,.18)!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:999px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.10)!important;padding:5px 10px!important;margin:0!important;-webkit-backdrop-filter:blur(3px)!important;backdrop-filter:blur(3px)!important}
.game-players:before,.game-players:after{content:none!important;display:none!important}
.game-players i{width:8px!important;height:8px!important;border-radius:50%!important;background:#18b96a!important;box-shadow:0 0 0 1px rgba(24,185,106,.16),0 0 8px rgba(24,185,106,.22),inset 0 1px 0 rgba(255,255,255,.24)!important;flex:0 0 auto!important;position:relative!important;animation:liveDotSoft 2.8s ease-in-out infinite!important}
.game-players i:before{content:''!important;position:absolute!important;inset:-2px!important;border-radius:inherit!important;border:1px solid rgba(24,185,106,.24)!important;opacity:.26!important;animation:liveDotRing 2.8s ease-in-out infinite!important}
.game-players i:after{content:none!important;display:none!important}
.game-players b{display:inline-block!important;min-width:23px!important;font-size:10.5px!important;font-weight:900!important;color:rgba(255,255,255,.90)!important;text-shadow:0 6px 14px rgba(0,0,0,.56),0 0 10px rgba(255,255,255,.08)!important;font-variant-numeric:tabular-nums!important;transition:opacity .14s ease,filter .18s ease!important}
.game-players em{font-style:normal!important;color:rgba(255,255,255,.58)!important;font-size:8.6px!important;font-weight:800!important;text-transform:none!important;letter-spacing:.02em!important;margin-left:1px!important}
.game-players b.is-counting{opacity:.66!important;filter:brightness(1.22)!important}
.game-open{display:none!important}
.play-zone-featured-card,.play-zone-featured-card.game-card-live,.play-zone-featured-card-2,.play-zone-featured-card-3,.play-zone-triangle-card{position:relative!important;transform:none!important;animation:none!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.20),0 14px 34px rgba(0,0,0,.16)!important;background:linear-gradient(180deg,rgba(255,255,255,.105),rgba(255,255,255,.045))!important;border:1px solid rgba(255,255,255,.10)!important;-webkit-backdrop-filter:blur(3px)!important;backdrop-filter:blur(3px)!important}
.play-zone-center-image{width:100%!important;height:auto!important;max-height:none!important;display:block!important;object-fit:contain!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;filter:none!important;animation:none!important;transform:none!important;margin:0!important;padding:0!important;position:static!important;z-index:auto!important;flex:0 0 auto!important;line-height:0!important}
.play-zone-center-image.is-empty{display:none!important}
.play-zone-plinko-showcase{display:none!important}
@keyframes liveDotSoft{0%,100%{opacity:.66;transform:scale(.96)}50%{opacity:.96;transform:scale(1.04)}}
@keyframes liveDotRing{0%,100%{opacity:.08;transform:scale(.86)}50%{opacity:.20;transform:scale(1.02)}}
@media(max-width:380px){
  .app{padding-top:calc(36px + env(safe-area-inset-top))!important}
  .content{height:calc(100dvh - 88px - 18px - env(safe-area-inset-top) - env(safe-area-inset-bottom))!important}
  .play-zone-view{padding-bottom:calc(138px + env(safe-area-inset-bottom))!important}
  .play-zone-stage{--play-card-gap:6px;gap:9px!important;padding:0 0 90px!important}
  .play-zone-section-head{height:36px!important;min-width:126px!important;margin:2px auto 8px!important;padding:0 16px!important}
  .play-zone-section-head strong{font-size:12px!important;color:rgba(255,255,255,.60)!important}
  .game-card,.game-card-live{height:calc((100vw - (var(--play-card-gap) * 2)) / 3 + (var(--play-card-gap) * 2))!important;min-height:118px!important;max-height:150px!important;border-radius:20px!important;padding:0!important}
  .game-image,.game-card-live .game-image{inset:var(--play-card-gap)!important;border-radius:14px!important;aspect-ratio:3/1!important;border:0!important;outline:0!important;box-shadow:none!important}
  .game-image img{border-radius:14px!important;border:0!important;outline:0!important;box-shadow:none!important}
  .game-footer{bottom:11px!important;left:16px!important;right:16px!important}
  .game-players{gap:4px!important;padding:5px 9px!important}
  .game-players i{width:7px!important;height:7px!important}
  .game-players b{font-size:9.4px!important;min-width:20px!important}
  .game-players em{font-size:7.8px!important}
}
`;
