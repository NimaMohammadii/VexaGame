export const PREDICT_ZONE_SECTION = `<section id="predictzone" class="view predict-zone-view">
  <div class="predict-zone-simple-shell">
    <nav class="predict-zone-category-menu" aria-label="Predict markets">
      <button type="button" class="predict-zone-category-card active" data-vexa-predict-market="bitcoin"><span>Bitcoin</span></button>
      <button type="button" class="predict-zone-category-card" data-vexa-predict-market="oil"><span>Oil</span></button>
      <button type="button" class="predict-zone-category-card" data-vexa-predict-market="gold"><span>Gold</span></button>
      <button type="button" class="predict-zone-category-card" data-vexa-predict-market="world" data-vexa-predict-locked="1" aria-disabled="true"><span>World</span></button>
      <button type="button" class="predict-zone-category-card" data-vexa-predict-market="tech" data-vexa-predict-locked="1" aria-disabled="true"><span>Tech / AI</span></button>
      <button type="button" class="predict-zone-category-card" data-vexa-predict-market="culture" data-vexa-predict-locked="1" aria-disabled="true"><span>Culture</span></button>
    </nav>

    <article class="predict-zone-glass-card predict-zone-btc-preview-card trend-flat" data-predict-card>
      <div class="predict-zone-card-top"><span class="predict-zone-countdown-wrap"><svg class="predict-zone-timer-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><line x1="10" x2="14" y1="2" y2="2"/><line class="predict-zone-timer-hand" x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/></svg><small class="predict-zone-countdown" data-predict-countdown>--:--</small></span></div>

      <div class="predict-zone-hero">
        <span class="predict-zone-question-image" data-predict-question-image aria-hidden="true">
          <span class="predict-zone-symbol-fallback" data-predict-symbol-fallback>₿</span>
        </span>
        <div class="predict-zone-question-copy">
          <h2 class="predict-zone-question-row"><span data-predict-question>Bitcoin up or down? · 5M</span></h2>
          <div class="predict-zone-round-meta" data-predict-round-meta></div>
        </div>
      </div>

      <div class="predict-zone-live-meta" aria-label="Predict market price">
        <div><span>Start</span><strong class="predict-zone-start-price">Loading</strong></div>
        <div class="predict-zone-live-cell"><span>Live</span><strong class="predict-zone-live-price">Loading</strong></div>
      </div>

      <div class="predict-zone-chart-preview" data-predict-chart aria-label="Live chart preview">
        <div class="predict-zone-chart-grid" data-predict-grid></div>
        <div class="predict-zone-price-axis" data-predict-price-axis aria-hidden="true"></div>
        <svg viewBox="0 0 360 220" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="predictMainLine" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stop-color="rgba(255,143,48,.035)"/><stop offset="48%" stop-color="rgba(255,154,62,.96)"/><stop offset="100%" stop-color="rgba(255,184,100,.74)"/></linearGradient>
            <linearGradient id="predictMainFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="rgba(255,145,46,.17)"/><stop offset="100%" stop-color="rgba(255,145,46,0)"/></linearGradient>
          </defs>
          <path class="predict-zone-chart-fill" d=""/><path class="predict-zone-chart-line" d=""/>
        </svg>
        <div class="predict-zone-chart-loader" aria-hidden="true"><span></span></div>
        <div class="predict-zone-event-summary" data-predict-event-summary aria-live="polite"><span data-predict-event-source></span><div><small>Yes pool</small><strong data-predict-event-yes>0 GRAM</strong></div><div><small>No pool</small><strong data-predict-event-no>0 GRAM</strong></div></div>
        <span class="predict-zone-chart-dot"></span><span class="predict-zone-price-guide"></span>
        <span class="predict-zone-start-guide" data-predict-start-guide><span>Start</span></span>
        <span class="predict-zone-start-target" data-predict-start-target></span>
      </div>

      <div class="predict-zone-decision-head">
        <span>Make your prediction</span>
        <strong data-predict-trend-label>Waiting for price</strong>
      </div>
      <div class="predict-zone-actions">
        <button type="button" class="predict-zone-choice predict-zone-choice-up" data-predict-choice="up"><span class="predict-zone-choice-symbol" aria-hidden="true">↑</span><span>Up</span></button>
        <button type="button" class="predict-zone-choice predict-zone-choice-down" data-predict-choice="down"><span class="predict-zone-choice-symbol" aria-hidden="true">↓</span><span>Down</span></button>
      </div>
      <div class="predict-zone-bet-stage" data-predict-bet-stage aria-hidden="true">
        <label class="predict-zone-bet-input-wrap"><input class="predict-zone-bet-input" data-predict-bet-input type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" /><span class="predict-zone-bet-estimate" data-predict-bet-estimate></span><span class="predict-zone-bet-side"><span class="predict-zone-bet-token">GRAM</span><span class="predict-zone-bet-usd" data-predict-bet-usd>≈ $0.00</span></span></label>
        <div class="predict-zone-bet-presets"><button type="button" data-predict-bet-preset="1">1</button><button type="button" data-predict-bet-preset="5">5</button><button type="button" data-predict-bet-preset="10">10</button><button type="button" data-predict-bet-preset="25">25</button></div>
        <button type="button" class="predict-zone-bet-submit" data-predict-bet-submit>Place prediction</button>
      </div>
    </article>
    <div class="predict-zone-limit-notice" data-predict-limit-notice role="status" aria-live="assertive" aria-hidden="true">
      <span class="predict-zone-limit-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9"/><path d="M12 7.8v5.1"/><circle cx="12" cy="16.5" r=".8" fill="currentColor" stroke="none"/></svg></span>
      <span class="predict-zone-limit-copy"><strong data-predict-limit-title>Bet limit</strong><small data-predict-limit-message></small></span>
    </div>
    <div class="predict-zone-result-strip" data-predict-result></div>
  </div>
</section>`;

export const PREDICT_ZONE_STYLES = `
html body:has(#predictzone.active){isolation:isolate!important;background:#000!important}
html body:has(#predictzone.active)::before{content:""!important;display:block!important;position:fixed!important;inset:0!important;width:100vw!important;height:100dvh!important;z-index:0!important;pointer-events:none!important;background-color:#000!important;background-image:var(--admin-predict-background-image,none),radial-gradient(circle at 50% 10%,rgba(92,10,31,.18),transparent 38%),linear-gradient(180deg,#090306 0%,#000 72%)!important;background-size:cover,cover,cover!important;background-position:center top,center,center!important;background-repeat:no-repeat!important;transform:none!important;animation:none!important;filter:none!important;opacity:1!important}
html body:has(#predictzone.active)::after,html body:has(#predictzone.active) .app::before,html body:has(#predictzone.active) .app::after{display:none!important;content:none!important;background:none!important;background-image:none!important}
html body:has(#predictzone.active) .app,html body:has(#predictzone.active) main.app,html body:has(#predictzone.active) .content,html body:has(#predictzone.active) #predictzone.predict-zone-view,html body:has(#predictzone.active) .top,html body:has(#predictzone.active) header.top{position:relative!important;z-index:1!important;background:transparent!important;background-color:transparent!important;background-image:none!important}

.predict-zone-view{padding:0 0 calc(188px + env(safe-area-inset-bottom))!important;box-sizing:border-box;overflow-y:auto!important;overflow-x:hidden!important;-webkit-overflow-scrolling:touch!important;scrollbar-width:none!important}.predict-zone-view::-webkit-scrollbar{display:none}
.predict-zone-simple-shell{position:relative;min-height:calc(100vh - 188px);display:grid;align-content:start;padding:0 0 120px;overflow:visible}

#predictzone .predict-zone-category-menu{position:relative!important;left:0!important;z-index:4!important;display:flex!important;gap:8px!important;overflow-x:auto!important;overflow-y:visible!important;width:100%!important;max-width:none!important;margin:0 0 10px!important;padding:0 16px 9px!important;box-sizing:border-box!important;scrollbar-width:none!important;-webkit-overflow-scrolling:touch!important;overscroll-behavior-x:contain!important;scroll-padding:0 16px!important;transform:translate3d(0,0,0);opacity:1;transition:opacity .28s ease,transform .42s cubic-bezier(.18,.88,.24,1)!important}#predictzone .predict-zone-category-menu::-webkit-scrollbar{display:none}#predictzone .predict-zone-category-menu:before{display:none!important;content:none!important}#predictzone .predict-zone-category-menu:after{content:""!important;flex:0 0 max(20px,env(safe-area-inset-right))!important;height:1px!important}
#predictzone .predict-zone-category-card{flex:0 0 auto!important;min-width:max-content!important;position:relative!important;overflow:hidden!important;height:38px!important;padding:0 12px!important;border:0!important;border-radius:28px!important;background:radial-gradient(34px 34px at 0 0,rgba(186,53,87,.16) 0%,rgba(146,35,66,.07) 42%,rgba(104,18,44,0) 76%),radial-gradient(36px 36px at 100% 100%,rgba(172,46,79,.15) 0%,rgba(133,30,60,.065) 43%,rgba(94,16,39,0) 78%),radial-gradient(118% 76% at 10% -16%,rgba(255,255,255,.12) 0%,rgba(255,255,255,.032) 30%,rgba(255,255,255,0) 58%),radial-gradient(96% 72% at 102% 108%,rgba(255,255,255,.052) 0%,rgba(255,255,255,.010) 34%,rgba(255,255,255,0) 62%),radial-gradient(92% 78% at 88% 112%,rgba(72,5,27,.11) 0%,rgba(42,3,16,0) 60%)!important;color:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 12px 30px rgba(31,1,10,.32),0 0 18px rgba(69,5,26,.15),inset 3px 3px .5px -3.5px rgba(255,255,255,.10),inset -3px -3px .5px -3.5px rgba(156,38,70,.48),inset 1px 1px 1px -.5px rgba(140,29,61,.30),inset -1px -1px 1px -.5px rgba(124,22,53,.24),inset 0 0 6px 6px rgba(255,255,255,.055),inset 0 0 2px 2px rgba(255,255,255,.035),inset 0 1px 0 rgba(112,18,49,.065),inset 0 -1px 0 rgba(88,12,37,.15)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;isolation:isolate!important;transform:translate3d(0,0,0)!important;transform-origin:center!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;transition:transform .38s cubic-bezier(.18,.88,.24,1),filter .32s ease,opacity .32s ease!important;opacity:.72!important}#predictzone .predict-zone-category-card span{color:rgba(255,255,255,.66)!important;font-size:12px!important;font-weight:950!important;line-height:1!important;letter-spacing:-.02em!important}#predictzone .predict-zone-category-card.active{opacity:1!important;filter:brightness(1.10) saturate(1.08)!important}#predictzone .predict-zone-category-card.active span{color:#f3d9e1!important}#predictzone .predict-zone-category-card:active{transform:translate3d(0,1px,0) scale(.94)!important;filter:brightness(1.14) saturate(1.08)!important;transition-duration:.11s!important}
#predictzone .predict-zone-category-card[data-vexa-predict-locked="1"]{cursor:not-allowed;opacity:.46!important;filter:none!important}#predictzone .predict-zone-category-card[data-vexa-predict-locked="1"] span:after{content:"";width:13px;height:13px;display:inline-block;margin-left:6px;opacity:.62;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h1Zm2 0h6V8a3 3 0 0 0-6 0v2Z'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M7 10V8a5 5 0 0 1 10 0v2h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h1Zm2 0h6V8a3 3 0 0 0-6 0v2Z'/%3E%3C/svg%3E") center/contain no-repeat}

.predict-zone-glass-card{position:relative!important;width:100%!important;height:376px!important;min-height:0!important;overflow:hidden!important;border-radius:28px!important;border:1px solid rgba(124,22,53,.24)!important;background:#070707!important;background-color:#070707!important;background-image:none!important;outline:0!important;padding:10px 12px!important;color:#fff!important;box-sizing:border-box!important;isolation:isolate!important;transform:translateZ(0)!important;box-shadow:0 12px 30px rgba(31,1,10,.32),0 0 18px rgba(69,5,26,.15),inset 3px 3px .5px -3.5px rgba(255,255,255,.10),inset 1px 1px 1px -.5px rgba(140,29,61,.30),inset 0 0 6px 6px rgba(255,255,255,.055),inset 0 0 2px 2px rgba(255,255,255,.035)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
.predict-zone-glass-card:before{content:""!important;position:absolute!important;inset:0!important;z-index:0!important;border-radius:inherit!important;display:block!important;pointer-events:none!important;background:radial-gradient(34px 34px at 0 0,rgba(186,53,87,.20) 0%,rgba(146,35,66,.09) 42%,rgba(104,18,44,0) 76%),radial-gradient(38px 38px at 100% 100%,rgba(156,38,70,.26) 0%,rgba(92,10,35,.12) 46%,rgba(69,5,26,0) 78%)!important;box-shadow:inset 3px 3px .5px -3.5px rgba(255,255,255,.10),inset -3px -3px .5px -3.5px rgba(156,38,70,.52),inset 1px 1px 1px -.5px rgba(140,29,61,.22),inset -1px -1px 1px -.5px rgba(92,10,35,.30),inset 6px 5px 13px -8px rgba(255,255,255,.13),inset -5px -4px 11px -8px rgba(255,255,255,.055),inset 0 0 10px rgba(69,5,26,.12)!important;opacity:1!important}.predict-zone-glass-card>*{position:relative!important;z-index:1!important}

.predict-zone-card-top{position:absolute!important;top:19px!important;right:13px!important;z-index:4!important}.predict-zone-countdown-wrap{display:inline-flex!important;align-items:center!important;gap:5px!important;color:rgba(255,255,255,.82)!important}.predict-zone-timer-icon{position:relative!important;top:-1px!important;width:20px!important;height:20px!important;flex:0 0 20px!important;display:block!important;stroke:currentColor!important;stroke-width:2!important;stroke-linecap:round!important;stroke-linejoin:round!important;overflow:visible!important}.predict-zone-timer-hand{transform-box:fill-box!important;transform-origin:left bottom!important}@media(hover:hover){.predict-zone-countdown-wrap:hover .predict-zone-timer-hand{animation:predictTimerHand .6s cubic-bezier(.4,0,.2,1) .1s both!important}.predict-zone-countdown-wrap:hover .predict-zone-timer-icon{animation:predictTimerBody .3s cubic-bezier(.4,0,.2,1) both!important}}@keyframes predictTimerHand{from{transform:rotate(0)}to{transform:rotate(300deg)}}@keyframes predictTimerBody{0%{transform:translateY(0) scale(1)}50%{transform:translateY(1px) scale(.9)}100%{transform:translateY(0) scale(1)}}.predict-zone-countdown{display:inline-flex!important;align-items:center!important;direction:ltr!important;overflow:visible!important;color:rgba(255,255,255,.82)!important;font-family:ui-rounded,"SF Pro Rounded","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;font-size:18px!important;font-weight:700!important;letter-spacing:-.02em!important;line-height:1!important;font-variant-numeric:tabular-nums!important}.predict-zone-countdown-digit{position:relative!important;display:inline-grid!important;place-items:center!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;height:1.28em!important;margin-inline:-.06em!important;padding-inline:.06em!important;overflow:hidden!important;box-sizing:content-box!important}.predict-zone-countdown-digit-current,.predict-zone-countdown-digit-old{grid-area:1/1!important;display:block!important;line-height:1!important}.predict-zone-countdown-separator{display:block!important;line-height:1!important}
.predict-zone-hero{display:flex;align-items:center;gap:9px;min-height:42px;padding-right:78px;transition:min-height .42s cubic-bezier(.18,.88,.24,1),padding .42s cubic-bezier(.18,.88,.24,1),transform .42s cubic-bezier(.18,.88,.24,1)}.predict-zone-question-copy{min-width:0;display:grid;align-content:center;gap:3px;transform:translateY(-2px)}.predict-zone-question-row{display:block;min-height:0;margin:0!important;padding:0!important;color:#fff;font-family:ui-rounded,"SF Pro Rounded","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;font-size:18px!important;font-weight:700!important;line-height:1.12!important;letter-spacing:-.025em!important;text-shadow:none!important;white-space:normal;transition:font-size .42s cubic-bezier(.18,.88,.24,1)}.predict-zone-round-meta{display:none;color:rgba(255,255,255,.38);font-family:ui-rounded,"SF Pro Rounded","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;font-size:9.5px;font-weight:650;line-height:1;letter-spacing:-.01em;white-space:nowrap}.predict-zone-round-meta.show{display:block}
.predict-zone-question-image{position:relative;flex:0 0 40px;width:40px;height:40px;display:grid;place-items:center;background-position:center!important;background-size:contain!important;background-repeat:no-repeat!important;background-color:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;filter:none!important;transform:translate3d(0,0,0);transition:width .42s cubic-bezier(.18,.88,.24,1),height .42s cubic-bezier(.18,.88,.24,1),flex-basis .42s cubic-bezier(.18,.88,.24,1),transform .5s cubic-bezier(.18,.88,.24,1)}.predict-zone-symbol-fallback{position:relative;z-index:1;color:#fff;font-size:18px;font-weight:950;letter-spacing:-.06em;opacity:.9}.predict-zone-question-image.has-image .predict-zone-symbol-fallback{opacity:0}
.predict-zone-glass-card.trend-up .predict-zone-question-image,.predict-zone-glass-card.trend-down .predict-zone-question-image{animation:none!important}

.predict-zone-live-meta{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:7px!important;max-height:44px;overflow:hidden;opacity:1;margin:11px 0 10px!important;transform:translate3d(0,0,0);transition:max-height .42s cubic-bezier(.18,.88,.24,1),margin .42s cubic-bezier(.18,.88,.24,1),opacity .2s ease,transform .42s cubic-bezier(.18,.88,.24,1)}.predict-zone-live-meta>div{height:44px!important;border-radius:18px!important;background:rgba(0,0,0,.22)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.055),inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(255,255,255,.04)!important;padding:7px 10px!important;display:grid!important;align-content:center!important;gap:2px!important;box-sizing:border-box!important}.predict-zone-live-meta>div>span{color:rgba(255,255,255,.35)!important;font-size:8px!important;font-weight:800!important;text-transform:uppercase!important;letter-spacing:.10em!important}.predict-zone-live-meta strong{font-family:ui-rounded,"SF Pro Rounded","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;color:#fff!important;font-size:13px!important;font-weight:700!important;letter-spacing:-.02em!important;white-space:nowrap!important;font-variant-numeric:tabular-nums!important}.predict-zone-live-meta strong.predict-zone-price-rolling{display:inline-flex!important;align-items:center!important;direction:ltr!important;overflow:visible!important;line-height:1!important}

.predict-zone-chart-preview{position:relative!important;width:100%!important;height:170px!important;border-radius:21px!important;background:rgba(0,0,0,.15)!important;overflow:hidden!important;margin:0 0 10px!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.055)!important;transform:translate3d(0,0,0) scale(1);transform-origin:center top}.predict-zone-chart-grid{position:absolute;inset:0 72px 0 0;background:linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:48px 100%;opacity:.44}.predict-zone-chart-grid span{position:absolute;left:0;right:0;height:1px;background:rgba(255,255,255,.035);transform:translateY(-50%);transition:opacity .18s ease!important;will-change:auto}.predict-zone-price-axis{position:absolute;right:7px;top:0;bottom:0;width:58px;z-index:4;pointer-events:none}.predict-zone-price-axis span{font-family:ui-rounded,"SF Pro Rounded","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;position:absolute;right:0;transform:translateY(-50%);color:rgba(255,255,255,.54);font-size:12px;font-weight:700!important;letter-spacing:-.02em!important;text-align:right;white-space:nowrap;transition:opacity .18s ease!important;will-change:auto;font-variant-numeric:tabular-nums!important}.predict-zone-chart-preview svg{position:absolute;inset:0;width:100%;height:100%;filter:none!important}.predict-zone-chart-fill{fill:url(#predictMainFill)}.predict-zone-chart-line{fill:none;stroke:url(#predictMainLine);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.predict-zone-chart-dot{position:absolute;left:0;top:0;width:7px;height:7px;border-radius:999px;background:#ff9a3e;box-shadow:0 0 0 5px rgba(255,154,62,.13),0 0 10px rgba(255,145,46,.32);transform:translate(-50%,-50%);animation:none!important;will-change:auto}.predict-zone-price-guide{position:absolute;left:0;right:64px;top:0;height:0;border-top:1px dashed rgba(255,255,255,.28);transform:translateY(-50%);pointer-events:none;opacity:.56}.predict-zone-start-guide{position:absolute;left:0;right:76px;height:0;border-top:1.5px dashed rgba(255,255,255,.46);z-index:4;opacity:0;pointer-events:none}.predict-zone-start-guide.show{opacity:1}.predict-zone-start-guide span{position:absolute;left:9px;top:-16px;font-size:9px;font-weight:850;letter-spacing:.10em;color:rgba(255,255,255,.58);text-transform:uppercase}
#predictzone .predict-zone-start-target{position:absolute;right:82px;z-index:5;display:none;align-items:center;gap:4px;height:24px;padding:0 9px;border-radius:999px;background:rgba(255,255,255,.08);box-shadow:0 10px 24px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.11);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);color:rgba(255,255,255,.82);font-size:9.5px;font-weight:900;letter-spacing:.08em;pointer-events:none}#predictzone .predict-zone-start-target.show{display:inline-flex;animation:predictStartTargetPulse 1.05s ease-in-out infinite}#predictzone .predict-zone-start-target.above{top:14px;--predict-target-shift:-5px}#predictzone .predict-zone-start-target.below{bottom:14px;--predict-target-shift:5px}@keyframes predictStartTargetPulse{0%,100%{transform:translateY(0);opacity:.72}50%{transform:translateY(var(--predict-target-shift,4px));opacity:1}}
.predict-zone-chart-loader{position:absolute;inset:0;z-index:8;display:grid;place-items:center;pointer-events:none;background:linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.12));opacity:1;transition:opacity .16s ease}@keyframes predictChartLoaderSpin{to{transform:rotate(360deg)}}.predict-zone-chart-loader span{width:42px;height:42px;border-radius:50%;border:2px solid rgba(255,255,255,.08);border-top-color:rgba(255,255,255,.75);border-right-color:rgba(255,255,255,.28);animation:predictChartLoaderSpin .8s linear infinite!important}.predict-zone-chart-preview.ready .predict-zone-chart-loader{opacity:0;visibility:hidden}

.predict-zone-decision-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 3px 7px;color:rgba(255,255,255,.40);font-size:10px;font-weight:800;max-height:24px;opacity:1;transform:translate3d(0,0,0);overflow:hidden;transition:max-height .38s cubic-bezier(.18,.88,.24,1),margin .38s cubic-bezier(.18,.88,.24,1),opacity .22s ease,transform .38s cubic-bezier(.18,.88,.24,1)}.predict-zone-decision-head strong{color:rgba(255,255,255,.68);font-size:10px;font-weight:900;white-space:nowrap}.predict-zone-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;max-height:38px;opacity:1;transform:translate3d(0,0,0);overflow:hidden;transition:max-height .4s cubic-bezier(.18,.88,.24,1),opacity .22s ease,transform .4s cubic-bezier(.18,.88,.24,1)}.predict-zone-choice{position:relative!important;overflow:hidden!important;height:38px!important;padding:0 12px!important;border:0!important;border-radius:28px!important;color:#fff!important;font-size:12px!important;font-weight:950!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;background:radial-gradient(34px 34px at 0 0,rgba(186,53,87,.16) 0%,rgba(146,35,66,.07) 42%,rgba(104,18,44,0) 76%),radial-gradient(36px 36px at 100% 100%,rgba(172,46,79,.15) 0%,rgba(133,30,60,.065) 43%,rgba(94,16,39,0) 78%),radial-gradient(118% 76% at 10% -16%,rgba(255,255,255,.12) 0%,rgba(255,255,255,.032) 30%,rgba(255,255,255,0) 58%),radial-gradient(96% 72% at 102% 108%,rgba(255,255,255,.052) 0%,rgba(255,255,255,.010) 34%,rgba(255,255,255,0) 62%),radial-gradient(92% 78% at 88% 112%,rgba(72,5,27,.11) 0%,rgba(42,3,16,0) 60%)!important;box-shadow:0 12px 30px rgba(31,1,10,.32),0 0 18px rgba(69,5,26,.15),inset 3px 3px .5px -3.5px rgba(255,255,255,.10),inset -3px -3px .5px -3.5px rgba(156,38,70,.48),inset 1px 1px 1px -.5px rgba(140,29,61,.30),inset -1px -1px 1px -.5px rgba(124,22,53,.24),inset 0 0 6px 6px rgba(255,255,255,.055),inset 0 0 2px 2px rgba(255,255,255,.035),inset 0 1px 0 rgba(112,18,49,.065),inset 0 -1px 0 rgba(88,12,37,.15)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;isolation:isolate!important;transform:translate3d(0,0,0)!important;transform-origin:center!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;transition:transform .38s cubic-bezier(.18,.88,.24,1),filter .32s ease,opacity .32s ease!important}.predict-zone-choice-symbol{display:inline-flex;align-items:center;justify-content:center;width:17px;height:17px;font-size:16px;font-weight:950;line-height:1;transform:translate3d(0,0,0)}.predict-zone-choice-up .predict-zone-choice-symbol{color:#d7e9dd}.predict-zone-choice-down .predict-zone-choice-symbol{color:#e7c9d2}.predict-zone-choice:active{transform:translate3d(0,1px,0) scale(.97)!important;filter:brightness(1.10) saturate(1.05)!important;transition-duration:.07s!important}.predict-zone-actions button.predict-zone-choice:disabled{opacity:.42!important;cursor:not-allowed!important;filter:none!important;transform:none!important}

.predict-zone-result-strip{position:relative;width:100%;max-width:100%;box-sizing:border-box;margin:10px 0 0;display:none;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}.predict-zone-result-strip::-webkit-scrollbar{display:none}.predict-zone-result-strip.show{display:block;mask-image:linear-gradient(90deg,transparent 0,#000 14px,#000 calc(100% - 14px),transparent 100%);-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 14px,#000 calc(100% - 14px),transparent 100%)}.predict-zone-history-track{display:flex;gap:6px;width:max-content;min-width:100%;padding:0 2px 1px}.predict-zone-history-track::-webkit-scrollbar{display:none}.predict-zone-history-card{flex:0 0 auto;min-width:92px;white-space:nowrap;background:#000!important}.predict-zone-history-card.history-up{color:#d7e9dd!important}.predict-zone-history-card.history-down{color:#e4a1b2!important}

.predict-zone-bet-stage{max-height:0;overflow:hidden;opacity:0;pointer-events:none;transform:translate3d(0,12px,0);transform-origin:center top;margin:0;transition:max-height .42s cubic-bezier(.18,.88,.24,1),opacity .18s ease,transform .38s cubic-bezier(.18,.88,.24,1)}
.predict-zone-bet-input-wrap{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;min-height:42px;border-radius:18px;transform:translate3d(0,0,0);will-change:auto;transition:transform .38s cubic-bezier(.18,.88,.24,1);background:rgba(0,0,0,.22)!important;box-shadow:inset 0 0 0 1px rgba(255,255,255,.055),inset 0 1px 0 rgba(255,255,255,.06),inset 0 -1px 0 rgba(255,255,255,.04)!important;padding:0 13px;margin:0 0 3px}
.predict-zone-bet-input{width:100%;min-width:0;border:0!important;outline:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;color:#fff;font-size:24px;font-weight:950;letter-spacing:-.05em;appearance:textfield}.predict-zone-bet-input::-webkit-outer-spin-button,.predict-zone-bet-input::-webkit-inner-spin-button{appearance:none;margin:0}.predict-zone-bet-estimate{color:rgba(94,168,118,.92);font-size:12px;font-weight:950;white-space:nowrap}.predict-zone-bet-side{display:grid;justify-items:end;gap:3px}.predict-zone-bet-token{font-size:12px;font-weight:900;color:rgba(255,255,255,.66)}.predict-zone-bet-usd{font-size:10px;font-weight:760;color:rgba(255,255,255,.38);white-space:nowrap}
.predict-zone-bet-presets{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:3px 0;transform:translate3d(0,0,0);will-change:auto;transition:transform .38s cubic-bezier(.18,.88,.24,1)}.predict-zone-bet-presets button,.predict-zone-bet-submit{position:relative!important;overflow:hidden!important;height:36px!important;padding:0 12px!important;border:0!important;border-radius:28px!important;background:radial-gradient(34px 34px at 0 0,rgba(186,53,87,.16) 0%,rgba(146,35,66,.07) 42%,rgba(104,18,44,0) 76%),radial-gradient(36px 36px at 100% 100%,rgba(172,46,79,.15) 0%,rgba(133,30,60,.065) 43%,rgba(94,16,39,0) 78%),radial-gradient(118% 76% at 10% -16%,rgba(255,255,255,.12) 0%,rgba(255,255,255,.032) 30%,rgba(255,255,255,0) 58%),radial-gradient(96% 72% at 102% 108%,rgba(255,255,255,.052) 0%,rgba(255,255,255,.010) 34%,rgba(255,255,255,0) 62%),radial-gradient(92% 78% at 88% 112%,rgba(72,5,27,.11) 0%,rgba(42,3,16,0) 60%)!important;color:#fff!important;font-size:12px!important;font-weight:950!important;box-shadow:0 12px 30px rgba(31,1,10,.32),0 0 18px rgba(69,5,26,.15),inset 3px 3px .5px -3.5px rgba(255,255,255,.10),inset -3px -3px .5px -3.5px rgba(156,38,70,.48),inset 1px 1px 1px -.5px rgba(140,29,61,.30),inset -1px -1px 1px -.5px rgba(124,22,53,.24),inset 0 0 6px 6px rgba(255,255,255,.055),inset 0 0 2px 2px rgba(255,255,255,.035),inset 0 1px 0 rgba(112,18,49,.065),inset 0 -1px 0 rgba(88,12,37,.15)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;isolation:isolate!important;transform:translate3d(0,0,0)!important;transform-origin:center!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;transition:transform .28s cubic-bezier(.18,.88,.24,1),filter .24s ease,opacity .24s ease!important}.predict-zone-bet-submit{width:100%!important}.predict-zone-bet-presets button:active,.predict-zone-bet-submit:active{transform:translate3d(0,1px,0) scale(.96)!important;filter:brightness(1.12) saturate(1.06)!important;transition-duration:.07s!important}.predict-zone-bet-submit:disabled{opacity:.55}.predict-zone-bet-status{display:block;min-height:0;margin:5px 0 0;text-align:center;color:rgba(255,255,255,.42);font-size:10px;font-weight:760}.predict-zone-bet-status:empty{display:none}.predict-zone-bet-status.bad{color:rgba(255,160,160,.9)}.predict-zone-bet-status.good{color:rgba(185,255,210,.9)}
.predict-zone-limit-notice{position:fixed;left:50%;bottom:calc(116px + env(safe-area-inset-bottom));z-index:70;width:min(328px,calc(100vw - 32px));box-sizing:border-box;display:flex;align-items:center;gap:11px;padding:12px 14px;border:1px solid rgba(255,255,255,.08);border-radius:18px;background:rgba(18,8,12,.80);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);box-shadow:none;opacity:0;pointer-events:none;transform:translate3d(-50%,12px,0) scale(.97);transition:opacity .2s ease,transform .32s cubic-bezier(.18,.88,.24,1)}.predict-zone-limit-notice.show{opacity:1;transform:translate3d(-50%,0,0) scale(1)}.predict-zone-limit-icon{flex:0 0 30px;width:30px;height:30px;border-radius:999px;display:grid;place-items:center;background:rgba(123,31,57,.22);color:#efdce2}.predict-zone-limit-icon svg{width:18px;height:18px;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.predict-zone-limit-copy{min-width:0;display:grid;gap:2px}.predict-zone-limit-copy strong{font-size:12px;font-weight:900;letter-spacing:-.01em;color:#fff}.predict-zone-limit-copy small{font-size:11px;font-weight:650;line-height:1.35;color:rgba(255,255,255,.64)}
.predict-zone-glass-card.bet-transition .predict-zone-live-meta,.predict-zone-glass-card.bet-transition .predict-zone-decision-head,.predict-zone-glass-card.bet-transition .predict-zone-actions,.predict-zone-glass-card.bet-transition .predict-zone-bet-stage{will-change:transform,opacity}.predict-zone-glass-card.bet-transition .predict-zone-bet-input-wrap,.predict-zone-glass-card.bet-transition .predict-zone-bet-presets{will-change:transform}

.predict-zone-glass-card.bet-mode .predict-zone-bet-input-wrap{transform:translate3d(0,-6px,0)}.predict-zone-glass-card.bet-mode .predict-zone-bet-presets{transform:translate3d(0,-3px,0)}.predict-zone-glass-card.bet-mode .predict-zone-live-meta{max-height:0;margin:0!important;opacity:0;transform:translate3d(0,-8px,0)}.predict-zone-glass-card.bet-mode .predict-zone-decision-head{max-height:0;margin:0!important;opacity:0;transform:translate3d(0,-10px,0)}.predict-zone-glass-card.bet-mode .predict-zone-actions{max-height:0;opacity:0;transform:translate3d(0,-12px,0)}.predict-zone-glass-card.bet-mode .predict-zone-bet-stage{max-height:143px;overflow:visible;opacity:1;pointer-events:auto;transform:translate3d(0,0,0)}
html body:has(#predictzone.predict-zone-keyboard-open.active) .tabs{opacity:0!important;transform:translate3d(-50%,82px,0)!important;pointer-events:none!important}

@media(max-width:380px){.predict-zone-view{padding-left:0!important;padding-right:0!important}#predictzone .predict-zone-category-menu{left:0!important;width:100%!important;padding-left:16px!important;padding-right:16px!important}.predict-zone-glass-card{height:364px!important;min-height:0!important;padding:10px 12px!important}.predict-zone-card-top{top:18px!important;right:12px!important}.predict-zone-countdown{font-size:18px!important}.predict-zone-hero{padding-right:72px}.predict-zone-question-row{font-size:17px!important}.predict-zone-question-image{flex-basis:38px;width:38px;height:38px}.predict-zone-live-meta>div{height:44px!important;padding:6px 8px!important}.predict-zone-live-meta strong{font-size:12px!important}.predict-zone-chart-preview{height:158px!important;border-radius:20px!important}}
.predict-zone-event-summary{display:none;position:absolute;inset:18px 18px 14px;align-content:center;grid-template-columns:1fr 1fr;gap:10px;padding:14px;border-radius:16px;background:linear-gradient(145deg,rgba(62,15,29,.34),rgba(12,5,8,.76));border:1px solid rgba(255,255,255,.08);box-sizing:border-box}.predict-zone-event-summary>span{grid-column:1/-1;color:rgba(255,255,255,.55);font-size:11px;font-weight:800;letter-spacing:.02em;text-transform:uppercase}.predict-zone-event-summary>div{padding:12px;border-radius:12px;background:rgba(0,0,0,.3)}.predict-zone-event-summary small{display:block;color:rgba(255,255,255,.52);font-size:11px}.predict-zone-event-summary strong{display:block;margin-top:4px;color:#fff;font-size:16px}.predict-zone-chart-preview.event-mode .predict-zone-chart-grid,.predict-zone-chart-preview.event-mode svg,.predict-zone-chart-preview.event-mode .predict-zone-chart-loader,.predict-zone-chart-preview.event-mode .predict-zone-chart-dot,.predict-zone-chart-preview.event-mode .predict-zone-price-guide,.predict-zone-chart-preview.event-mode .predict-zone-start-guide,.predict-zone-chart-preview.event-mode .predict-zone-start-target,.predict-zone-chart-preview.event-mode .predict-zone-price-axis{display:none!important}.predict-zone-chart-preview.event-mode .predict-zone-event-summary{display:grid}

@media(prefers-reduced-motion:reduce){.predict-zone-question-image,.predict-zone-live-price,.predict-zone-choice-symbol,.predict-zone-chart-loader span,.predict-zone-start-target{animation:none!important}.predict-zone-category-card,.predict-zone-choice,.predict-zone-glass-card,.predict-zone-live-meta,.predict-zone-chart-preview,.predict-zone-bet-stage,.predict-zone-bet-presets button,.predict-zone-bet-submit,.predict-zone-chart-grid span,.predict-zone-price-axis span,.predict-zone-limit-notice{transition:none!important}}
`;

export const PREDICT_ZONE_SCRIPT = `
(function(){
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  ready(function(){
    var root=document.getElementById('predictzone');
    if(!root||root.dataset.predictRuntimeReady==='1')return;
    root.dataset.predictRuntimeReady='1';

    var MARKETS={
      bitcoin:{label:'Bitcoin',question:'Bitcoin up or down? · 5M',stream:'wss://fstream.asterdex.com/ws/btcusdt@markPrice@1s',decimals:0,step:5,axisStep:20,symbol:'₿'},
      oil:{label:'Oil',question:'Oil this month: up or down?',stream:'wss://fstream.asterdex.com/ws/clusdt@markPrice@1s',decimals:2,step:.05,symbol:'Oil'},
      gold:{label:'Gold',question:'Gold this month: up or down?',stream:'wss://fstream.asterdex.com/ws/xauusdt@markPrice@1s',decimals:2,step:.5,symbol:'Au'}
    };
    var EVENT_CATEGORIES={world:1,tech:1,culture:1},LOCKED_CATEGORIES={world:1,tech:1,culture:1},market='bitcoin',eventMode=false,currentEvent=null,eventDeadline=0,ws=null,reconnectTimer=0,feedWatchdog=0,reconnectDelay=6000,chartMotionRaf=0,chartMotionFrame=0,clockTimer=0,seq=0,values=[],sampleTimes=[],historyValues=[],current=0,last=0,raw=0,priceFrom=0,priceTarget=0,priceAnimStarted=0,scaleMin=0,scaleMax=0,scaleFrameAt=0,readyPrice=false,entry=0,lastPointAt=0,currentRound=null,roundLockDeadline=0,balanceNano=0,balanceKnown=false,gramUsd=0,side='up',busy=false,images={},trend='flat',runtimeSuspended=true,runtimeStarted=false;
    var W=360,H=220,L=0,R=64,P=18,HISTORY=23,SAMPLE_MS=2800;
    var requestFrame=window.requestAnimationFrame?window.requestAnimationFrame.bind(window):function(cb){return setTimeout(function(){cb(Date.now())},16)};
    var cancelFrame=window.cancelAnimationFrame?window.cancelAnimationFrame.bind(window):function(id){clearTimeout(id)};
    var menu=root.querySelector('.predict-zone-category-menu'),card=root.querySelector('[data-predict-card]'),cardTop=root.querySelector('.predict-zone-card-top'),chart=root.querySelector('[data-predict-chart]'),line=chart&&chart.querySelector('.predict-zone-chart-line'),fill=chart&&chart.querySelector('.predict-zone-chart-fill'),dot=chart&&chart.querySelector('.predict-zone-chart-dot'),guide=chart&&chart.querySelector('.predict-zone-price-guide'),axisLayer=chart&&chart.querySelector('[data-predict-price-axis]'),gridLayer=chart&&chart.querySelector('[data-predict-grid]'),startGuide=chart&&chart.querySelector('[data-predict-start-guide]'),startTarget=chart&&chart.querySelector('[data-predict-start-target]');
    var question=root.querySelector('[data-predict-question]'),roundMeta=root.querySelector('[data-predict-round-meta]'),questionImage=root.querySelector('[data-predict-question-image]'),symbolFallback=root.querySelector('[data-predict-symbol-fallback]'),countdown=root.querySelector('[data-predict-countdown]'),live=root.querySelector('.predict-zone-live-price'),start=root.querySelector('.predict-zone-start-price'),trendLabel=root.querySelector('[data-predict-trend-label]'),result=root.querySelector('[data-predict-result]');
    var betStage=root.querySelector('[data-predict-bet-stage]'),betInput=root.querySelector('[data-predict-bet-input]'),betUsd=root.querySelector('[data-predict-bet-usd]'),betEstimate=root.querySelector('[data-predict-bet-estimate]'),betStatus=root.querySelector('[data-predict-bet-status]'),betSubmit=root.querySelector('[data-predict-bet-submit]'),eventSummary=root.querySelector('[data-predict-event-summary]'),eventSource=root.querySelector('[data-predict-event-source]'),eventYes=root.querySelector('[data-predict-event-yes]'),eventNo=root.querySelector('[data-predict-event-no]'),startLabel=root.querySelector('.predict-zone-live-meta>div:first-child span'),liveLabel=root.querySelector('.predict-zone-live-cell span'),limitNotice=root.querySelector('[data-predict-limit-notice]'),limitTitle=root.querySelector('[data-predict-limit-title]'),limitMessage=root.querySelector('[data-predict-limit-message]');
    var betOpen=false,betCloseTimer=0,keyboardCloseTimer=0,betAnimating=false,betAnimationTimer=0,limitNoticeTimer=0,countdownAnimations=[],countdownPendingText=null,displayedCountdownText='',countdownAnimationTargetText='',countdownTextReady=false,startPriceRoll={animations:[],pending:null,displayed:'',target:'',ready:false},livePriceRoll={animations:[],pending:null,displayed:'',target:'',ready:false};
    var PREDICT_IMAGE_META_KEY='vexaPredictMarketImages:v2',PREDICT_IMAGE_CACHE='vexa-predict-images-v1',PREDICT_IMAGE_META_TTL=300000,imageSources={},imageObjectUrls={};

    function setChoiceLabels(events){root.querySelectorAll('[data-predict-choice]').forEach(function(btn){var isFirst=btn.getAttribute('data-predict-choice')==='up'||btn.getAttribute('data-predict-choice')==='yes',label=btn.querySelector('span:last-child');btn.setAttribute('data-predict-choice',events?(isFirst?'yes':'no'):(isFirst?'up':'down'));if(label)label.textContent=events?(isFirst?'Yes':'No'):(isFirst?'Up':'Down')})}
    function cfg(){return MARKETS[market]||MARKETS.bitcoin}
    function isActive(){return root.classList.contains('active')&&!document.hidden}
    function uid(){var tg=window.Telegram&&window.Telegram.WebApp,u=tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user;return String((u&&u.id)||localStorage.getItem('ownerId')||'').trim()}
    function telegramInitData(){var tg=window.Telegram&&window.Telegram.WebApp;return tg?String(tg.initData||''):''}
    function formatPrice(v){var n=Number(v),c=cfg();return !isFinite(n)||n<=0?'Loading':'$'+n.toLocaleString('en-US',{minimumFractionDigits:c.decimals,maximumFractionDigits:c.decimals})}
    function formatCardPrice(v){var n=Number(v),c=cfg(),decimals=market==='bitcoin'?2:c.decimals;return !isFinite(n)||n<=0?'Loading':'$'+n.toLocaleString('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})}
    function formatTon(v){return Number(v||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:4})}
    function formatEstimate(v){return Number(v||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:8})}
    function timeLeft(ms){var s=Math.max(0,Math.ceil(ms/1000));if(s>=86400){var d=Math.floor(s/86400),h=Math.floor((s%86400)/3600);return d+'d '+String(h).padStart(2,'0')+'h'}if(s>=3600){var hours=Math.floor(s/3600),m=Math.floor((s%3600)/60);return hours+'h '+String(m).padStart(2,'0')+'m'}return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0')}
    function userTimeZone(){var zone='';try{zone=String(Intl.DateTimeFormat().resolvedOptions().timeZone||'')}catch(e){}return zone}
    function regionName(code){var value=String(code||'').trim().toUpperCase();if(!value)return'';if(value==='GLOBAL')return'Global';try{if(Intl.DisplayNames)return new Intl.DisplayNames(['en'],{type:'region'}).of(value)||value}catch(e){}return value}
    function roundMetaText(round){
      if(!round||eventMode||market!=='bitcoin')return'';
      var starts=Date.parse(round.startsAt||''),ends=Date.parse(round.endsAt||'');if(!isFinite(starts)||!isFinite(ends))return'';
      var zone=userTimeZone(),timeOptions={hour:'2-digit',minute:'2-digit',hourCycle:'h23'},dateOptions={month:'short',day:'numeric'},from='',to='',date='';
      if(zone){timeOptions.timeZone=zone;dateOptions.timeZone=zone}
      try{from=new Intl.DateTimeFormat('en-GB',timeOptions).format(new Date(starts));to=new Intl.DateTimeFormat('en-GB',timeOptions).format(new Date(ends));date=new Intl.DateTimeFormat('en-US',dateOptions).format(new Date(starts))}catch(e){return''}
      var region=regionName(window.VexaDetectedCountryCode||'');return date+' · '+from+'–'+to+(region?' · '+region:'')
    }
    function renderRoundMeta(round){if(!roundMeta)return;var text=roundMetaText(round);if(roundMeta.textContent!==text)roundMeta.textContent=text;roundMeta.classList.toggle('show',!!text)}
    function clearRoundMeta(){if(!roundMeta)return;if(roundMeta.textContent)roundMeta.textContent='';roundMeta.classList.remove('show')}
    function countdownChar(ch){return ch===' '?'&nbsp;':ch==='&'?'&amp;':ch==='<'?'&lt;':ch==='>'?'&gt;':ch}
    function countdownStaticHtml(text){var html='';for(var i=0;i<text.length;i++){var ch=text.charAt(i);html+=/[0-9]/.test(ch)?'<span class="predict-zone-countdown-digit" aria-hidden="true"><span class="predict-zone-countdown-digit-current">'+countdownChar(ch)+'</span></span>':'<span class="predict-zone-countdown-separator" aria-hidden="true">'+countdownChar(ch)+'</span>'}return html}
    function setCountdownText(text){if(!countdown)return;var value=String(text||'');countdown.setAttribute('aria-label',value);countdown.innerHTML=countdownStaticHtml(value)}
    function countdownReducedMotion(){try{return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}catch(e){return false}}
    function cancelCountdownAnimations(){for(var i=0;i<countdownAnimations.length;i++){try{countdownAnimations[i].onfinish=null;countdownAnimations[i].oncancel=null;countdownAnimations[i].cancel()}catch(e){}}countdownAnimations=[];countdownPendingText=null;countdownAnimationTargetText=displayedCountdownText}
    function finishCountdownAnimation(target){countdownAnimations=[];displayedCountdownText=target;countdownAnimationTargetText=target;setCountdownText(target);var pending=countdownPendingText;countdownPendingText=null;if(pending!==null&&pending!==target)animateCountdown(pending)}
    function animateCountdown(target){
      if(!countdown)return;target=String(target||'');
      if(countdownAnimations.length){if(target!==countdownAnimationTargetText)countdownPendingText=target;return}
      var previous=displayedCountdownText;
      if(target===previous){setCountdownText(target);return}
      if(document.hidden||!root.classList.contains('active')||countdownReducedMotion()||typeof countdown.animate!=='function'){displayedCountdownText=target;countdownAnimationTargetText=target;setCountdownText(target);return}
      var len=Math.max(previous.length,target.length),oldPad=previous.padStart(len,' '),newPad=target.padStart(len,' '),rollRank={},rank=0,html='',changed=0,scan,i;
      for(scan=len-1;scan>=0;scan--){var oldScan=oldPad.charAt(scan),newScan=newPad.charAt(scan);if(!/[0-9]/.test(newScan)||!/[0-9]/.test(oldScan)||oldScan===newScan)continue;rollRank[scan]=rank++}
      for(i=0;i<len;i++){
        var oldChar=oldPad.charAt(i),newChar=newPad.charAt(i);
        if(/[0-9]/.test(newChar)&&/[0-9]/.test(oldChar)&&oldChar!==newChar){var delay=Math.max(0,Number(rollRank[i])||0)*115;html+='<span class="predict-zone-countdown-digit" aria-hidden="true" data-countdown-roll="1" data-countdown-delay="'+delay+'"><span class="predict-zone-countdown-digit-current">'+countdownChar(newChar)+'</span><span class="predict-zone-countdown-digit-old">'+countdownChar(oldChar)+'</span></span>';changed++}
        else if(/[0-9]/.test(newChar))html+='<span class="predict-zone-countdown-digit" aria-hidden="true"><span class="predict-zone-countdown-digit-current">'+countdownChar(newChar)+'</span></span>';
        else html+='<span class="predict-zone-countdown-separator" aria-hidden="true">'+countdownChar(newChar)+'</span>'
      }
      countdown.setAttribute('aria-label',target);countdown.innerHTML=html;
      if(!changed){displayedCountdownText=target;countdownAnimationTargetText=target;setCountdownText(target);return}
      countdownAnimationTargetText=target;
      var cells=countdown.querySelectorAll('[data-countdown-roll="1"]'),pending=cells.length,finished=false;
      function finishOne(){if(finished)return;pending--;if(pending<=0){finished=true;finishCountdownAnimation(target)}}
      for(var j=0;j<cells.length;j++){
        var cell=cells[j],next=cell.querySelector('.predict-zone-countdown-digit-current'),old=cell.querySelector('.predict-zone-countdown-digit-old'),cellDelay=Math.max(0,Number(cell.getAttribute('data-countdown-delay'))||0);
        if(!next||!old){finishOne();continue}
        try{
          var options={duration:820,delay:cellDelay,easing:'cubic-bezier(.16,.84,.24,1)',fill:'both'},incoming=next.animate([{transform:'translate3d(0,-112%,0)',opacity:.08,offset:0},{transform:'translate3d(0,3%,0)',opacity:1,offset:.88},{transform:'translate3d(0,0,0)',opacity:1,offset:1}],options),outgoing=old.animate([{transform:'translate3d(0,0,0)',opacity:1,offset:0},{transform:'translate3d(0,112%,0)',opacity:.06,offset:1}],options);countdownAnimations.push(incoming,outgoing);outgoing.onfinish=finishOne;outgoing.oncancel=finishOne
        }catch(e){finishOne()}
      }
    }
    function renderCountdownText(text){if(!countdown)return;var target=String(text||'');if(!countdownTextReady){countdownTextReady=true;displayedCountdownText=target;countdownAnimationTargetText=target;setCountdownText(target);return}if(target!==displayedCountdownText)animateCountdown(target)}
    function resetCountdownText(text){cancelCountdownAnimations();countdownTextReady=true;displayedCountdownText=String(text||'');countdownAnimationTargetText=displayedCountdownText;setCountdownText(displayedCountdownText)}
    function priceRollState(el){return el===live?livePriceRoll:el===start?startPriceRoll:null}
    function setPriceRollText(el,text,state){if(!el||!state)return;var value=String(text||'');el.classList.add('predict-zone-price-rolling');el.setAttribute('aria-label',value);el.innerHTML=countdownStaticHtml(value);state.displayed=value;state.target=value}
    function cancelPriceRoll(state){if(!state)return;for(var i=0;i<state.animations.length;i++){try{state.animations[i].onfinish=null;state.animations[i].oncancel=null;state.animations[i].cancel()}catch(e){}}state.animations=[];state.pending=null;state.target=state.displayed}
    function finishPriceRoll(el,state,target){state.animations=[];state.displayed=target;state.target=target;setPriceRollText(el,target,state);var pending=state.pending;state.pending=null;if(pending!==null&&pending!==target)animatePriceRoll(el,pending,state)}
    function animatePriceRoll(el,target,state){
      if(!el||!state)return;target=String(target||'');
      if(state.animations.length){if(target!==state.target)state.pending=target;return}
      var previous=state.displayed;
      if(target===previous){setPriceRollText(el,target,state);return}
      if(document.hidden||!root.classList.contains('active')||countdownReducedMotion()||typeof el.animate!=='function'){setPriceRollText(el,target,state);return}
      var len=Math.max(previous.length,target.length),oldPad=previous.padStart(len,' '),newPad=target.padStart(len,' '),rollRank={},rank=0,html='',changed=0,scan,i;
      for(scan=len-1;scan>=0;scan--){var oldScan=oldPad.charAt(scan),newScan=newPad.charAt(scan);if(!/[0-9]/.test(newScan)||!/[0-9]/.test(oldScan)||oldScan===newScan)continue;rollRank[scan]=rank++}
      for(i=0;i<len;i++){
        var oldChar=oldPad.charAt(i),newChar=newPad.charAt(i);
        if(/[0-9]/.test(newChar)&&/[0-9]/.test(oldChar)&&oldChar!==newChar){var delay=Math.max(0,Number(rollRank[i])||0)*115;html+='<span class="predict-zone-countdown-digit" aria-hidden="true" data-price-roll="1" data-price-delay="'+delay+'"><span class="predict-zone-countdown-digit-current">'+countdownChar(newChar)+'</span><span class="predict-zone-countdown-digit-old">'+countdownChar(oldChar)+'</span></span>';changed++}
        else if(/[0-9]/.test(newChar))html+='<span class="predict-zone-countdown-digit" aria-hidden="true"><span class="predict-zone-countdown-digit-current">'+countdownChar(newChar)+'</span></span>';
        else html+='<span class="predict-zone-countdown-separator" aria-hidden="true">'+countdownChar(newChar)+'</span>'
      }
      el.classList.add('predict-zone-price-rolling');el.setAttribute('aria-label',target);el.innerHTML=html;
      if(!changed){setPriceRollText(el,target,state);return}
      state.target=target;
      var cells=el.querySelectorAll('[data-price-roll="1"]'),pending=cells.length,finished=false;
      function finishOne(){if(finished)return;pending--;if(pending<=0){finished=true;finishPriceRoll(el,state,target)}}
      for(var j=0;j<cells.length;j++){
        var cell=cells[j],next=cell.querySelector('.predict-zone-countdown-digit-current'),old=cell.querySelector('.predict-zone-countdown-digit-old'),cellDelay=Math.max(0,Number(cell.getAttribute('data-price-delay'))||0);
        if(!next||!old){finishOne();continue}
        try{
          var options={duration:820,delay:cellDelay,easing:'cubic-bezier(.16,.84,.24,1)',fill:'both'},incoming=next.animate([{transform:'translate3d(0,-112%,0)',opacity:.08,offset:0},{transform:'translate3d(0,3%,0)',opacity:1,offset:.88},{transform:'translate3d(0,0,0)',opacity:1,offset:1}],options),outgoing=old.animate([{transform:'translate3d(0,0,0)',opacity:1,offset:0},{transform:'translate3d(0,112%,0)',opacity:.06,offset:1}],options);state.animations.push(incoming,outgoing);outgoing.onfinish=finishOne;outgoing.oncancel=finishOne
        }catch(e){finishOne()}
      }
    }
    function renderMarketPrice(el,value){if(!el)return;var target=formatCardPrice(value),state=priceRollState(el);if(market!=='bitcoin'||!state){if(state){cancelPriceRoll(state);state.ready=false;state.displayed='';state.target=''}el.classList.remove('predict-zone-price-rolling');el.removeAttribute('aria-label');if(el.textContent!==target)el.textContent=target;return}if(!state.ready){state.ready=true;setPriceRollText(el,target,state);return}if(target!==state.displayed)animatePriceRoll(el,target,state)}
    function resetMarketPrice(el,text){var state=priceRollState(el),value=String(text||'');if(state){cancelPriceRoll(state);state.ready=false;state.displayed='';state.target=''}if(el){el.classList.remove('predict-zone-price-rolling');el.removeAttribute('aria-label');if(el.textContent!==value)el.textContent=value}}
    function roundMonthName(round){var ts=Date.parse(round&&round.startsAt||'');return isFinite(ts)?new Date(ts).toLocaleString('en-US',{month:'long',timeZone:'UTC'}):''}
    function renderMarketPeriod(round){if(eventMode||market==='bitcoin'||!round)return;var month=roundMonthName(round);if(month&&question){var q=cfg().label+' in '+month+': up or down?';if(question.textContent!==q)question.textContent=q}if(startLabel&&startLabel.textContent!=='Month start')startLabel.textContent='Month start'}
    function readGramUsd(){var source=window.VexaTonUsdPrice,value=source&&typeof source.read==='function'?Number(source.read()):0;return isFinite(value)&&value>0?value:0}
    function loadGramUsd(){var source=window.VexaTonUsdPrice,current=readGramUsd();if(current>0){gramUsd=current;updateEstimate();return Promise.resolve(current)}if(!source||typeof source.load!=='function')return Promise.resolve(0);return Promise.resolve(source.load()).then(function(value){var price=Number(value)||readGramUsd();if(isFinite(price)&&price>0){gramUsd=price;updateEstimate();return price}return 0}).catch(function(){return 0})}
    function currentBetBlockReason(){
      if(!balanceKnown)return 'Loading balance';
      if(balanceNano<=0)return 'Add GRAM to predict';
      if(eventMode)return !currentEvent||currentEvent.locked?'Prediction closed':'';
      if(!currentRound)return 'Loading round';
      if(String(currentRound.status||'')!=='open'||(roundLockDeadline&&Date.now()>=roundLockDeadline))return 'Prediction closed';
      var bets=Array.isArray(currentRound.userBets)?currentRound.userBets:[];
      if(bets.some(function(b){return b&&String(b.status||'')!=='failed'}))return 'Prediction already placed';
      return ''
    }
    function visibleBetBlockReason(reason){return reason==='Loading balance'||reason==='Loading round'?'':reason}
    function syncBetAvailability(){var reason=currentBetBlockReason(),visible=visibleBetBlockReason(reason);root.querySelectorAll('button[data-predict-choice]').forEach(function(btn){btn.disabled=!!reason&&reason!=='Add GRAM to predict'});if(visible&&trendLabel)trendLabel.textContent=visible}
    function isBetLimitMessage(message){return /maximum prediction|daily Predict limit/i.test(String(message||''))}
    function showBetLimitNotice(message){if(!limitNotice||!limitMessage)return;if(limitNoticeTimer){clearTimeout(limitNoticeTimer);limitNoticeTimer=0}var daily=/daily Predict limit/i.test(String(message||''));if(limitTitle)limitTitle.textContent=daily?'Daily limit':'Bet limit';limitMessage.textContent=String(message||'Prediction limit reached.');limitNotice.setAttribute('aria-hidden','false');limitNotice.classList.add('show');limitNoticeTimer=setTimeout(function(){limitNoticeTimer=0;limitNotice.classList.remove('show');limitNotice.setAttribute('aria-hidden','true')},4200)}
    function y(v,scale){return P+((scale.max-v)/(scale.max-scale.min||1))*(H-P*2)}
    function path(points){if(!points.length)return'';var d='M'+points[0].x.toFixed(1)+' '+points[0].y.toFixed(1);for(var i=0;i<points.length-1;i++){var a=points[i],b=points[i+1],mx=(a.x+b.x)/2;d+=' C '+mx.toFixed(1)+' '+a.y.toFixed(1)+' '+mx.toFixed(1)+' '+b.y.toFixed(1)+' '+b.x.toFixed(1)+' '+b.y.toFixed(1)}return d}
    function niceTickStep(span,count){if(!isFinite(span)||span<=0)return 1;var rough=span/Math.max(1,count),power=Math.pow(10,Math.floor(Math.log(rough)/Math.LN10)),error=rough/power,factor=error>=Math.sqrt(50)?10:error>=Math.sqrt(10)?5:error>=Math.sqrt(2)?2:1;return factor*power}
    function axisPixelHeight(){var height=chart&&chart.clientHeight?chart.clientHeight:170;return Math.max(1,height*(H-P*2)/H)}
    function axisMinGap(){return 36}
    function axisCapacity(){return 4}
    function priceTicks(scale){
      var c=cfg(),maxCount=axisCapacity(),span=scale.max-scale.min,fixedStep=Number(c.axisStep||0),quantum=Math.max(c.step,Math.pow(10,-Math.max(0,c.decimals))),precision=Math.max(0,c.decimals+4),plotPx=axisPixelHeight(),minGap=axisMinGap(),minStepByPixels=span*(minGap/Math.max(1,plotPx)),step,first,v,ticks=[],attempt;
      if(fixedStep>0){
        step=fixedStep;
        first=Math.ceil(scale.min/step)*step;ticks=[];
        for(v=first;v<=scale.max+step*1e-9&&ticks.length<64;v+=step)ticks.push(Number(v.toFixed(precision)));
        if(ticks.length>maxCount){
          var target=Number(current||last||((scale.min+scale.max)/2)),best=0,bestDistance=Infinity;
          for(var i=0;i<=ticks.length-maxCount;i++){
            var distance=Math.abs((ticks[i]+ticks[i+maxCount-1])/2-target);
            if(distance<bestDistance){bestDistance=distance;best=i}
          }
          ticks=ticks.slice(best,best+maxCount)
        }
        return ticks;
      }
      step=Math.max(quantum,niceTickStep(span,Math.max(1,maxCount-1)),minStepByPixels);step=Math.ceil((step-1e-12)/quantum)*quantum;
      for(attempt=0;attempt<8;attempt++){
        first=Math.ceil(scale.min/step)*step;ticks=[];
        for(v=first;v<=scale.max+step*1e-9&&ticks.length<32;v+=step)ticks.push(Number(v.toFixed(precision)));
        if(ticks.length>=2&&ticks.length<=maxCount)return ticks;
        step=Math.ceil((step*1.35-1e-12)/quantum)*quantum;
      }
      return ticks.slice(0,maxCount);
    }
    function autoScale(prices){
      var frameNow=motionNow(),elapsed=scaleFrameAt?Math.min(64,Math.max(0,frameNow-scaleFrameAt)):32;scaleFrameAt=frameNow;
      var c=cfg(),fixedStep=Number(c.axisStep||0),valid=prices.filter(function(v){return isFinite(v)&&v>0}),precision=Math.pow(10,-Math.max(0,c.decimals)),minSpan,min,max,span,mid,pad,targetMin,targetMax,outward,alpha,actualSpan,axisSpan,price,innerMin,innerMax,nextMin;
      if(fixedStep>0){
        axisSpan=fixedStep*axisCapacity();price=Number(current||last||0);
        if(!isFinite(price)||price<=0)price=Number(valid[valid.length-1]||1);
        if(!scaleMin||!scaleMax){nextMin=Math.floor((price-axisSpan/2)/fixedStep)*fixedStep;scaleMin=nextMin;scaleMax=nextMin+axisSpan;return{min:scaleMin,max:scaleMax}}
        innerMin=scaleMin+axisSpan*.25;innerMax=scaleMax-axisSpan*.25;
        if(price<innerMin||price>innerMax){nextMin=Math.floor((price-axisSpan/2)/fixedStep)*fixedStep;scaleMin+=(nextMin-scaleMin)*(1-Math.exp(-elapsed/180));scaleMax=scaleMin+axisSpan}
        return{min:scaleMin,max:scaleMax}
      }
      minSpan=Math.max(c.step*8,precision*8);
      if(!valid.length)valid.push(Number(current||last||1));
      min=Math.min.apply(Math,valid);max=Math.max.apply(Math,valid);span=max-min;
      if(!isFinite(span)||span<minSpan){mid=(min+max)/2;min=mid-minSpan/2;max=mid+minSpan/2;span=minSpan}
      pad=Math.max(span*.22,c.step*1.15);targetMin=min-pad;targetMax=max+pad;
      if(!scaleMin||!scaleMax){scaleMin=targetMin;scaleMax=targetMax;return{min:scaleMin,max:scaleMax}}
      outward=targetMin<scaleMin||targetMax>scaleMax;alpha=1-Math.exp(-elapsed/(outward?300:1260));
      scaleMin+=(targetMin-scaleMin)*alpha;scaleMax+=(targetMax-scaleMax)*alpha;
      actualSpan=scaleMax-scaleMin;
      if(!isFinite(actualSpan)||actualSpan<minSpan){mid=(scaleMin+scaleMax)/2;scaleMin=mid-minSpan/2;scaleMax=mid+minSpan/2}
      return{min:scaleMin,max:scaleMax}
    }
    function renderPriceTicks(scale,ticks){
      if(!axisLayer||!gridLayer)return;
      var max=4,label,lineEl,i,top,text;
      while(axisLayer.children.length<max){label=document.createElement('span');label.style.opacity='0';axisLayer.appendChild(label)}
      while(gridLayer.children.length<max){lineEl=document.createElement('span');lineEl.style.opacity='0';gridLayer.appendChild(lineEl)}
      for(i=0;i<max;i++){
        label=axisLayer.children[i];lineEl=gridLayer.children[i];
        if(i<ticks.length){top=y(ticks[i],scale)/H*100+'%';text=formatPrice(ticks[i]);if(label.textContent!==text)label.textContent=text;if(label.style.top!==top)label.style.top=top;if(lineEl.style.top!==top)lineEl.style.top=top;if(label.style.opacity!=='1')label.style.opacity='1';if(lineEl.style.opacity!=='1')lineEl.style.opacity='1'}
        else{if(label.style.opacity!=='0')label.style.opacity='0';if(lineEl.style.opacity!=='0')lineEl.style.opacity='0'}
      }
    }
    function updateStartMarker(scale){
      if(!startGuide||!startTarget)return;
      if(!entry||!scale){startGuide.classList.remove('show');startTarget.classList.remove('show','above','below');startTarget.textContent='';return}
      if(entry<=scale.max&&entry>=scale.min){var top=y(entry,scale)/H*100+'%';if(startGuide.style.top!==top)startGuide.style.top=top;startGuide.classList.add('show');startTarget.classList.remove('show','above','below');startTarget.textContent='';return}
      startGuide.classList.remove('show');startTarget.classList.add('show');
      if(entry>scale.max){startTarget.classList.add('above');startTarget.classList.remove('below');startTarget.textContent='START ↑'}else{startTarget.classList.add('below');startTarget.classList.remove('above');startTarget.textContent='START ↓'}
    }
    function clipVisible(points,right){
      var out=[],first=0,a,b,t,i;
      while(first<points.length&&points[first].x<L)first++;
      if(first>0&&first<points.length){a=points[first-1];b=points[first];t=(L-a.x)/((b.x-a.x)||1);out.push({x:L,v:a.v+(b.v-a.v)*t})}
      else if(first===0&&points.length){out.push({x:L,v:points[0].v})}
      for(i=first;i<points.length;i++){if(points[i].x<=right&&(!out.length||points[i].x>out[out.length-1].x+.001))out.push(points[i])}
      if(out.length&&points.length&&points[points.length-1].x===right&&out[out.length-1].x===right)out[out.length-1]=points[points.length-1];
      return out.length>=2?out:points.slice(-2);
    }
    function setTrend(next){var n=next==='up'?'up':next==='down'?'down':'flat';if(trend===n&&card&&card.classList.contains('trend-'+n))return;trend=n;if(card){card.classList.remove('trend-up','trend-down','trend-flat');card.classList.add('trend-'+n)}if(trendLabel)trendLabel.textContent=n==='up'?'Above start':n==='down'?'Below start':'At start'}
    function syncTrend(){var blocked=currentBetBlockReason();if(blocked){setTrend('flat');if(trendLabel)trendLabel.textContent=visibleBetBlockReason(blocked)||'Waiting for price';return}var p=Number(raw||current||last||0),base=Number(entry||0);if(!p||!base){setTrend('flat');if(trendLabel)trendLabel.textContent='Waiting for price';return}var delta=p-base,epsilon=Math.max(base*.0000005,Math.pow(10,-Math.max(0,cfg().decimals))*0.25);setTrend(delta>epsilon?'up':delta<-epsilon?'down':'flat')}
    function showLoading(){readyPrice=false;priceFrom=0;priceTarget=0;priceAnimStarted=0;scaleMin=0;scaleMax=0;setTrend('flat');if(chart)chart.classList.remove('ready');resetMarketPrice(live,'Loading');resetMarketPrice(start,'Loading');if(trendLabel)trendLabel.textContent='Waiting for price';if(axisLayer)axisLayer.textContent='';if(gridLayer)gridLayer.textContent='';if(startGuide)startGuide.classList.remove('show');if(startTarget){startTarget.classList.remove('show','above','below');startTarget.textContent=''}syncBetAvailability()}
    function seed(price){var i;values=(historyValues||[]).map(Number).filter(function(v){return isFinite(v)&&v>0}).slice(-HISTORY);if(!values.length){for(i=0;i<HISTORY;i++)values.push(price)}current=price;last=price;raw=price;priceFrom=price;priceTarget=price;priceAnimStarted=0;scaleMin=0;scaleMax=0;lastPointAt=Date.now();sampleTimes=values.map(function(_,i){return lastPointAt-(values.length-i)*SAMPLE_MS})}
    function draw(){
      if(!readyPrice||!values.length||!line||!fill||eventMode)return;
      var right=W-R,step=(W-L-R)/HISTORY,now=Date.now(),rawPts=values.map(function(v,i){return{x:right-(now-sampleTimes[i])/SAMPLE_MS*step,v:v}});
      rawPts.push({x:right,v:current});
      var visibleRaw=clipVisible(rawPts,right),scale=autoScale(visibleRaw.map(function(p){return p.v})),ticks=priceTicks(scale),visible=visibleRaw.map(function(p){return{x:p.x,y:y(p.v,scale),v:p.v}}),d=path(visible),first=visible[0],lastPoint=visible[visible.length-1],xp=lastPoint.x/W*100,yp=lastPoint.y/H*100;
      line.setAttribute('d',d);fill.setAttribute('d',d+' L '+lastPoint.x.toFixed(1)+' '+H+' L '+first.x.toFixed(1)+' '+H+' Z');
      if(dot){var left=xp+'%',top=yp+'%';if(dot.style.left!==left)dot.style.left=left;if(dot.style.top!==top)dot.style.top=top}
      if(guide){var guideTop=yp+'%';if(guide.style.top!==guideTop)guide.style.top=guideTop}
      renderPriceTicks(scale,ticks);
      updateStartMarker(scale);
      if(start&&entry)renderMarketPrice(start,entry)
    }
    function cancelDraw(){stopChartMotion()}
    function queueDraw(){startChartMotion()}
    function motionNow(){return window.performance&&typeof window.performance.now==='function'?window.performance.now():Date.now()}
    function updateChartPrice(ts){
      if(!priceTarget||priceTarget<=0)return;
      if(!priceAnimStarted){current=priceTarget;return}
      var t=Math.min(1,Math.max(0,(ts-priceAnimStarted)/560)),eased=1-Math.pow(1-t,3);current=priceFrom+(priceTarget-priceFrom)*eased;if(t>=1){current=priceTarget;priceFrom=priceTarget;priceAnimStarted=0}
    }
    function stopChartMotion(){if(chartMotionRaf){cancelFrame(chartMotionRaf);chartMotionRaf=0}chartMotionFrame=0}
    function startChartMotion(){
      if(chartMotionRaf||!readyPrice||!isActive()||eventMode||betAnimating)return;
      function step(ts){
        chartMotionRaf=0;
        if(!isActive()||eventMode||!readyPrice||betAnimating){chartMotionFrame=0;return}
        var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if(!chartMotionFrame||ts-chartMotionFrame>=32){chartMotionFrame=ts;updateChartPrice(ts);draw()}
        if(!reduced)chartMotionRaf=requestFrame(step)
      }
      chartMotionRaf=requestFrame(step)
    }
    function setChartPriceTarget(target){
      var to=Number(target);if(!isFinite(to)||to<=0)return;
      var reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(reduced){priceFrom=to;priceTarget=to;priceAnimStarted=0;current=to;queueDraw();return}
      if(betAnimating){priceFrom=Number(current||to);priceTarget=to;priceAnimStarted=0;return}
      priceFrom=Number(current||to);priceTarget=to;priceAnimStarted=motionNow();startChartMotion()
    }
    function applyPrice(value,my,id){
      if(my!==seq||id!==market||eventMode)return false;
      var p=Number(value);if(!isFinite(p)||p<=0)return false;
      var firstPrice=!readyPrice,previous=Number(raw||current||0),now=Date.now(),sampled=false,changed=firstPrice||p!==previous;raw=p;last=p;
      if(firstPrice){readyPrice=true;seed(p);if(chart)chart.classList.add('ready');startChartMotion()}
      else{
        if(!lastPointAt||now-lastPointAt>=SAMPLE_MS){
          values.push(p);sampleTimes.push(now);
          if(values.length>HISTORY){values.shift();sampleTimes.shift()}
          lastPointAt=now;sampled=true;
        }
        if(changed)setChartPriceTarget(p)
      }
      if(changed&&!betAnimating&&live)renderMarketPrice(live,p)
      if(changed&&!betAnimating)syncTrend();if(firstPrice||(!changed&&sampled))queueDraw();
      return true;
    }
    function clearReconnect(){if(reconnectTimer){clearTimeout(reconnectTimer);reconnectTimer=0}}
    function clearFeedWatchdog(){if(feedWatchdog){clearTimeout(feedWatchdog);feedWatchdog=0}}
    function armFeedWatchdog(my,id,socket){
      clearFeedWatchdog();if(my!==seq||id!==market||eventMode||!isActive()||ws!==socket)return;
      feedWatchdog=setTimeout(function(){
        feedWatchdog=0;if(my!==seq||id!==market||eventMode||!isActive()||ws!==socket)return;
        reconnectDelay=1000;try{socket.close()}catch(e){if(ws===socket){ws=null;scheduleReconnect(my,id)}}
      },7000);
    }
    function stopFeed(){seq++;clearReconnect();clearFeedWatchdog();stopChartMotion();if(ws){try{ws.onopen=null;ws.onmessage=null;ws.onclose=null;ws.onerror=null;ws.close()}catch(e){}ws=null}}
    function scheduleReconnect(my,id){clearReconnect();if(my!==seq||id!==market||eventMode||!isActive())return;var delay=reconnectDelay;reconnectDelay=Math.min(60000,reconnectDelay*2);reconnectTimer=setTimeout(function(){reconnectTimer=0;if(my===seq&&id===market&&isActive()&&!eventMode)connectFeed(my,id)},delay)}
    function connectFeed(my,id){
      if(my!==seq||id!==market||eventMode||!isActive())return;
      var c=MARKETS[id]||cfg();clearReconnect();clearFeedWatchdog();
      if(!c.stream)return;
      try{
        var socket=new WebSocket(c.stream);ws=socket;
        socket.onopen=function(){if(my!==seq||id!==market||ws!==socket)return;armFeedWatchdog(my,id,socket)};
        socket.onmessage=function(e){if(my!==seq||id!==market||ws!==socket)return;try{var j=JSON.parse(e.data);if(j&&j.p!==undefined&&applyPrice(j.p,my,id)){reconnectDelay=6000;armFeedWatchdog(my,id,socket)}}catch(_){}};
        socket.onclose=function(){if(my!==seq||id!==market||ws!==socket)return;ws=null;clearFeedWatchdog();scheduleReconnect(my,id)};
        socket.onerror=function(){try{socket.close()}catch(e){}};
      }catch(e){scheduleReconnect(my,id)}
    }
    function renderImage(){if(!questionImage)return;var url=images[market]||'';questionImage.style.backgroundImage=url?'url("'+url.replace(/"/g,'')+'")':'';questionImage.classList.toggle('has-image',!!url);if(symbolFallback)symbolFallback.textContent=cfg().symbol||''}
    function useCachedImage(id,sourceUrl){
      if(!id||!sourceUrl)return Promise.resolve(false);
      if(imageSources[id]===sourceUrl&&images[id])return Promise.resolve(true);
      imageSources[id]=sourceUrl;
      if(!('caches'in window)||!window.URL||typeof window.URL.createObjectURL!=='function'){images[id]=sourceUrl;if(id===market)renderImage();return Promise.resolve(true)}
      var req;try{req=new Request(sourceUrl,{cache:'force-cache'})}catch(e){images[id]=sourceUrl;if(id===market)renderImage();return Promise.resolve(false)}
      return caches.open(PREDICT_IMAGE_CACHE).then(function(cache){
        return cache.match(req).then(function(hit){
          if(hit)return hit;
          return fetch(req).then(function(res){if(!res||!res.ok)throw new Error('Predict image unavailable');cache.put(req,res.clone()).catch(function(){});return res})
        })
      }).then(function(res){return res.blob()}).then(function(blob){
        var old=imageObjectUrls[id];if(old){try{URL.revokeObjectURL(old)}catch(e){}}
        var objectUrl=URL.createObjectURL(blob);imageObjectUrls[id]=objectUrl;images[id]=objectUrl;if(id===market)renderImage();return true
      }).catch(function(){if(!images[id]){images[id]=sourceUrl;if(id===market)renderImage()}return false})
    }
    function applyImageManifest(map,saveLocal){
      var savedMap={},jobs=[];
      ['bitcoin','oil','gold'].forEach(function(id){var item=map&&map[id],u=String(typeof item==='string'?item:(item&&item.imageUrl||'')).trim();if(!u)return;savedMap[id]=u;jobs.push(useCachedImage(id,u))});
      if(saveLocal&&Object.keys(savedMap).length){try{localStorage.setItem(PREDICT_IMAGE_META_KEY,JSON.stringify({images:savedMap,updatedAt:Date.now()}))}catch(e){}}
      if(jobs.length)Promise.all(jobs).then(renderImage).catch(function(){});else renderImage()
    }
    function loadImages(){
      var saved=null;try{saved=JSON.parse(localStorage.getItem(PREDICT_IMAGE_META_KEY)||'null')}catch(e){}
      if(saved&&saved.images)applyImageManifest(saved.images,false);
      if(saved&&saved.updatedAt&&Date.now()-Number(saved.updatedAt)<PREDICT_IMAGE_META_TTL)return;
      fetch('/app/api/predict-markets',{cache:'default'}).then(function(r){return r.ok?r.json():null}).then(function(d){applyImageManifest(d&&d.markets||{},true)}).catch(function(){})
    }
    function renderHistory(round){if(!result||!round)return;var all=[];(round.userBets||[]).forEach(function(b){all.push(b)});(round.recentUserBets||[]).forEach(function(b){if(!all.some(function(x){return x.id===b.id}))all.push(b)});var list=all.filter(function(b){return b&&b.status}).sort(function(a,b){var at=Date.parse(a&&a.createdAt||'')||0,bt=Date.parse(b&&b.createdAt||'')||0;return bt-at}).slice(0,25);result.className='predict-zone-result-strip';if(!list.length){result.innerHTML='';return}var html='<div class="predict-zone-history-track">';list.forEach(function(b){var st=String(b.status||''),stake=Number(b.stakeTon||0),pay=Number(b.payoutTon||0),kind=st==='won'?'win':st==='lost'?'loss':st==='refunded'?'refund':'active',amount=st==='won'?('+'+formatTon(pay)):st==='lost'?('-'+formatTon(stake)):formatTon(pay||stake),isDown=String(b.side||'').toLowerCase()==='down',label=isDown?'Down':'Up',direction=isDown?'history-down':'history-up';html+='<span class="predict-zone-history-card predict-zone-choice '+kind+' '+direction+'">'+label+' '+amount+'</span>'});result.innerHTML=html+'</div>';result.classList.add('show')}
    function requestRoundRealtime(roundId,id){var rid=String(roundId||'').trim(),m=String(id||market||'').toLowerCase();if(!rid||eventMode||(m!=='bitcoin'&&m!=='gold'&&m!=='oil'))return;try{window.dispatchEvent(new CustomEvent('vexa:predict-round-sync-request',{detail:{market:m,roundId:rid}}))}catch(e){}}
    function mergeRealtimeBet(list,bet){var out=Array.isArray(list)?list.slice():[],found=false;for(var i=0;i<out.length;i++){if(out[i]&&String(out[i].id||'')===String(bet&&bet.id||'')){out[i]=bet;found=true;break}}if(!found&&bet)out.unshift(bet);return out.slice(0,25)}
    function applyRealtimeRound(event){var round=event&&event.detail;if(eventMode||!round||String(round.market||'')!==market||!currentRound)return;if(String(round.roundId||'')!==String(currentRound.id||''))return;if(round.pools)currentRound.pools=round.pools;if(round.status&&!(String(currentRound.status||'')==='locked'&&round.status==='open'))currentRound.status=round.status;if(round.result!==undefined)currentRound.result=round.result;if(round.endPrice!==undefined)currentRound.endPrice=round.endPrice;updateEstimate();syncBetAvailability();syncTrend()}
    function applyRealtimeUserRound(event){var update=event&&event.detail;if(!update||String(update.userId||'')!==uid())return;balanceNano=Math.max(0,Math.floor(Number(update.tonBalanceNano)||0));balanceKnown=true;var bet=update.bet;if(!bet||String(bet.market||'')!==market||!currentRound){syncBetAvailability();return}if(String(currentRound.id||'')===String(bet.roundId||''))currentRound.userBets=mergeRealtimeBet(currentRound.userBets,bet);currentRound.recentUserBets=mergeRealtimeBet(currentRound.recentUserBets,bet);renderHistory(currentRound);syncBetAvailability();updateEstimate()}
    function updateBalance(payload){var controls=payload&&payload.userControls;if(!controls||controls.tonBalanceNano===undefined)return;balanceNano=Math.max(0,Number(controls.tonBalanceNano)||0);balanceKnown=true;syncBetAvailability();try{if(window.VexaTonBalance&&window.VexaTonBalance.write)window.VexaTonBalance.write(balanceNano,0,false);else window.dispatchEvent(new CustomEvent('vexa-ton-balance-game-change',{detail:{tonBalanceNano:balanceNano}}))}catch(e){}}
    function syncRound(my,id){
      var previousRoundId=currentRound&&String(currentRound.id||'')||'',userId=uid(),initData=telegramInitData(),headers={};if(userId&&initData)headers['x-telegram-init-data']=initData;
      return fetch('/app/api/predict-round?market='+encodeURIComponent(id)+'&userId='+encodeURIComponent(userId),{cache:'no-store',headers:headers}).then(function(r){return r.json().then(function(j){if(!r.ok)throw new Error((j&&j.error)||'Could not load prediction round');return j})}).then(function(d){
        if(my!==seq||id!==market||eventMode)return false;
        historyValues=(Array.isArray(d&&d.history)?d.history:[]).map(Number).filter(function(v){return isFinite(v)&&v>0}).slice(-HISTORY);
        var round=d&&d.round;if(!round)throw new Error('Prediction round unavailable');
        var cachedGramUsd=readGramUsd();if(cachedGramUsd>0)gramUsd=cachedGramUsd;currentRound=round;roundLockDeadline=Date.now()+Math.max(0,Number(round.lockRemainingMs||0));updateBalance(d);renderHistory(round);renderRoundMeta(round);if(Number(round.startPrice)>0){entry=Number(round.startPrice);if(start)renderMarketPrice(start,entry)}
        if(market!=='bitcoin')renderMarketPeriod(round);
        var initialPrice=Number(round.livePrice||round.startPrice||0);if(!readyPrice&&initialPrice>0)applyPrice(initialPrice,my,id);else if(readyPrice){queueDraw()}
        if(market==='bitcoin'&&countdown&&Number(round.remainingMs)>=0){var text=timeLeft(Number(round.remainingMs));renderCountdownText(text)}syncBetAvailability();syncTrend();updateEstimate();loadGramUsd();if(previousRoundId&&previousRoundId!==String(round.id||''))requestRoundRealtime(previousRoundId,id);requestRoundRealtime(round.id,id);return true;
      }).catch(function(){if(my!==seq||id!==market||eventMode)return false;currentRound=null;roundLockDeadline=0;clearRoundMeta();syncBetAvailability();if(trendLabel)trendLabel.textContent='Price unavailable';return false})
    }
    function estimate(amount){var pools=currentRound&&currentRound.pools;if(!amount||!pools)return 0;var chosen=eventMode?(side==='no'?'no':'yes'):(side==='down'?'down':'up'),other=eventMode?(chosen==='yes'?'no':'yes'):(chosen==='up'?'down':'up'),own=Number(pools[chosen]&&pools[chosen].stakeTon||0),opp=Number(pools[other]&&pools[other].stakeTon||0);if(opp<=0)return 0;return(amount/(own+amount))*(opp*.95)}
    function updateEstimate(){var amount=Number(betInput&&betInput.value||0),liveGramUsd=readGramUsd();if(liveGramUsd>0)gramUsd=liveGramUsd;if(betUsd){betUsd.textContent=amount<=0?'≈ $0.00':gramUsd>0?'≈ $'+(amount*gramUsd).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'≈ …'}if(betEstimate)betEstimate.textContent=amount>0?'+'+formatEstimate(estimate(amount)):''}
    function setStatus(text,type){if(!betStatus)return;betStatus.textContent=text||'';betStatus.classList.toggle('bad',type==='bad');betStatus.classList.toggle('good',type==='good')}
    function openCreditWallet(message){var guard=window.VexaCreditGuard;if(!guard||typeof guard.insufficient!=='function')return false;return guard.insufficient({source:'predict',message:message||'Insufficient balance'})}
    function finishBetClose(){if(betCloseTimer){clearTimeout(betCloseTimer);betCloseTimer=0}if(betOpen)return;if(card)card.classList.remove('bet-mode');if(betStage)betStage.setAttribute('aria-hidden','true')}
    function pauseChartDuringBetTransition(){betAnimating=true;cancelDraw();stopChartMotion();if(card)card.classList.add('bet-transition');if(betAnimationTimer)clearTimeout(betAnimationTimer);betAnimationTimer=setTimeout(function(){betAnimating=false;betAnimationTimer=0;if(card)card.classList.remove('bet-transition');if(!eventMode){if(raw>0&&live)renderMarketPrice(live,raw);syncTrend();if(priceTarget>0&&current!==priceTarget){priceFrom=Number(current||priceTarget);priceAnimStarted=motionNow()}if(readyPrice)startChartMotion();queueDraw()}},440)}
    function setKeyboardOpen(next){if(keyboardCloseTimer){clearTimeout(keyboardCloseTimer);keyboardCloseTimer=0}root.classList.toggle('predict-zone-keyboard-open',!!next)}
    function focusBetInput(){if(!betInput)return;betInput.disabled=false;betInput.readOnly=false;try{betInput.focus({preventScroll:true})}catch(_){try{betInput.focus()}catch(__){}}}
    function openBet(nextSide){var blocked=currentBetBlockReason();if(blocked){if(blocked==='Add GRAM to predict')openCreditWallet('Insufficient balance');if(trendLabel)trendLabel.textContent=visibleBetBlockReason(blocked)||'Waiting for price';return}side=eventMode?(nextSide==='no'?'no':'yes'):(nextSide==='down'?'down':'up');if(betInput)betInput.value='';loadGramUsd();updateEstimate();setStatus('','');if(betCloseTimer){clearTimeout(betCloseTimer);betCloseTimer=0}pauseChartDuringBetTransition();betOpen=true;if(card)card.classList.add('bet-mode');if(betStage)betStage.setAttribute('aria-hidden','false')}
    function closeBet(immediate){if(!betOpen&&!immediate)return;if(betInput&&document.activeElement===betInput)betInput.blur();var tg=window.Telegram&&window.Telegram.WebApp;if(tg&&typeof tg.hideKeyboard==='function'){try{tg.hideKeyboard()}catch(_){}}betOpen=false;if(immediate){if(betCloseTimer){clearTimeout(betCloseTimer);betCloseTimer=0}if(betAnimationTimer){clearTimeout(betAnimationTimer);betAnimationTimer=0}betAnimating=false;if(card){card.classList.remove('bet-mode');card.classList.remove('bet-transition')}if(betStage)betStage.setAttribute('aria-hidden','true');if(isActive()&&!eventMode&&readyPrice)startChartMotion();return}pauseChartDuringBetTransition();if(card)card.classList.remove('bet-mode');betCloseTimer=setTimeout(finishBetClose,440)}
    function submitBet(){if(busy)return;var amount=Number(betInput&&betInput.value||0),id=uid(),initData=telegramInitData(),blocked=currentBetBlockReason();if(blocked){if(blocked==='Add GRAM to predict')openCreditWallet('Insufficient balance');setStatus(visibleBetBlockReason(blocked)||'Waiting for price','bad');return}if(!id||!initData){setStatus('Open the Mini App inside Telegram.','bad');return}if(!amount||amount<=0){setStatus('Enter a valid GRAM amount.','bad');focusBetInput();return}if(Math.floor(amount*1000000000)>balanceNano){setStatus('Insufficient balance','bad');openCreditWallet('Insufficient balance');return}busy=true;if(betSubmit){betSubmit.disabled=true;betSubmit.textContent='Placing...'}setStatus('Checking balance...','');fetch(eventMode?'/app/api/prediction-events/bet':'/app/api/predict-bet',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(eventMode?{userId:id,initData:initData,eventId:currentEvent&&currentEvent.id,pick:side,stakeTon:amount}:{userId:id,initData:initData,market:market,side:side,stakeTon:amount,tonUsdSnapshot:readGramUsd()||gramUsd})}).then(function(r){return r.json().then(function(j){return{ok:r.ok,json:j}})}).then(function(x){if(!x.ok||!x.json||x.json.ok===false)throw new Error((x.json&&x.json.error)||'Could not place prediction');updateBalance(x.json);updateEstimate();setStatus('Prediction placed.','good');if(eventMode&&x.json.event){renderEvent(x.json.event)}else if(x.json.round&&x.json.round.round){currentRound=x.json.round.round;roundLockDeadline=Date.now()+Math.max(0,Number(currentRound.lockRemainingMs||0));renderHistory(currentRound);renderRoundMeta(currentRound);if(market!=='bitcoin')renderMarketPeriod(currentRound);syncBetAvailability();syncTrend()}setTimeout(closeBet,450)}).catch(function(e){var message=e&&e.message?e.message:'Could not place prediction.';if(/insufficient balance/i.test(message))openCreditWallet(message);if(isBetLimitMessage(message))showBetLimitNotice(message);setStatus(message,'bad')}).finally(function(){busy=false;if(betSubmit){betSubmit.disabled=false;betSubmit.textContent='Place prediction'}})}
    function updateMenu(){menu.querySelectorAll('[data-vexa-predict-market]').forEach(function(btn){btn.classList.toggle('active',btn.getAttribute('data-vexa-predict-market')===market)})}
    function stopClock(){if(clockTimer){clearTimeout(clockTimer);clockTimer=0}}
    function clockDelay(remaining){
      var ms=Math.max(0,Number(remaining)||0);
      if(ms>3600000){
        var seconds=Math.ceil(ms/1000),fraction=ms-(seconds-1)*1000,minuteDelay=fraction+(seconds%60)*1000+24;
        return Math.min(Math.max(250,minuteDelay),Math.max(250,ms-3600000+24));
      }
      return Math.max(250,1000-(Date.now()%1000)+24);
    }
    function renderClock(){
      stopClock();if(!isActive())return;
      var now=Date.now(),remaining=0;
      if(eventMode){
        if(!currentEvent||eventDeadline<=0)return;
        remaining=Math.max(0,eventDeadline-now);var eventText=timeLeft(remaining);renderCountdownText(eventText);if(eventSource){var sourceText=String(currentEvent.category||'Vexa event')+' • closes '+eventText;if(eventSource.textContent!==sourceText)eventSource.textContent=sourceText}if(remaining<=0)return;
      }else{
        if(!currentRound)return;
        var ends=Date.parse(currentRound.endsAt||'');if(!isFinite(ends)||ends<=0)return;
        remaining=Math.max(0,ends-now);if(roundLockDeadline&&now>=roundLockDeadline)syncBetAvailability();if(remaining<=0){syncRound(seq,market).then(function(ok){if(ok&&isActive()&&!eventMode)startClock()});return}if(market==='bitcoin'){var roundText=timeLeft(remaining);renderCountdownText(roundText)}else renderMarketPeriod(currentRound);
      }
      clockTimer=setTimeout(renderClock,clockDelay(remaining));
    }
    function startClock(){stopClock();if(isActive())renderClock()}
    function renderEvent(event){currentEvent=event;eventDeadline=Date.now()+Math.max(0,Number(event.remainingMs||0));currentRound={pools:event.pools||{yes:{stakeTon:0},no:{stakeTon:0}}};clearRoundMeta();if(question)question.textContent=event.question||'Prediction';if(eventYes)eventYes.textContent=formatTon(event.pools&&event.pools.yes&&event.pools.yes.stakeTon||0)+' GRAM';if(eventNo)eventNo.textContent=formatTon(event.pools&&event.pools.no&&event.pools.no.stakeTon||0)+' GRAM';if(start)start.textContent=formatTon(event.pools&&event.pools.yes&&event.pools.yes.stakeTon||0)+' GRAM';if(live)live.textContent=formatTon(event.pools&&event.pools.no&&event.pools.no.stakeTon||0)+' GRAM';if(trendLabel)trendLabel.textContent=event.locked?'Prediction closed':'';if(eventSummary)eventSummary.style.display='';if(card)card.classList.toggle('event-locked',!!event.locked);syncBetAvailability();startClock()}
    function selectEventCategory(category){stopFeed();cancelDraw();stopClock();market=category;eventMode=true;currentEvent=null;eventDeadline=0;currentRound=null;roundLockDeadline=0;readyPrice=false;clearRoundMeta();if(cardTop)cardTop.style.display='';updateMenu();setChoiceLabels(true);if(card)card.classList.remove('trend-up','trend-down','trend-flat');if(card)card.classList.add('event-mode');if(questionImage){questionImage.style.backgroundImage='';questionImage.classList.remove('has-image')}if(chart)chart.classList.add('event-mode');if(question)question.textContent='Loading '+category+' prediction...';if(symbolFallback)symbolFallback.textContent=category==='tech'?'✦':category==='culture'?'★':'◉';if(startLabel)startLabel.textContent='Yes pool';if(liveLabel)liveLabel.textContent='No pool';resetMarketPrice(start,'Loading');resetMarketPrice(live,'Loading');if(trendLabel)trendLabel.textContent='Choose Yes or No';resetCountdownText('--:--');syncBetAvailability();var id=uid(),headers={},my=seq;if(id&&telegramInitData())headers['x-telegram-init-data']=telegramInitData();fetch('/app/api/prediction-events?userId='+encodeURIComponent(id),{cache:'no-store',headers:headers}).then(function(r){return r.json()}).then(function(d){if(my!==seq||market!==category||!eventMode)return;var events=(d&&d.events||[]).filter(function(e){return e&&e.category===category&&(e.status==='open'||e.status==='locked')});if(!events.length)throw new Error('No live prediction');renderEvent(events[0]);updateBalance(d)}).catch(function(){if(my!==seq||market!==category||!eventMode)return;if(question)question.textContent='No live '+category+' prediction yet';if(trendLabel)trendLabel.textContent='Check back after an admin publishes one';if(eventSummary)eventSummary.style.display='none';if(category==='world')selectMarket('bitcoin')})}
    function selectMarket(id){if(LOCKED_CATEGORIES[id])return;if(EVENT_CATEGORIES[id]){selectEventCategory(id);return}if(!MARKETS[id])return;stopFeed();cancelDraw();stopClock();market=id;eventMode=false;currentEvent=null;eventDeadline=0;clearRoundMeta();if(cardTop)cardTop.style.display=id==='bitcoin'?'':'none';if(card)card.classList.remove('event-mode');if(chart)chart.classList.remove('event-mode');if(eventSummary)eventSummary.style.display='none';setChoiceLabels(false);if(startLabel)startLabel.textContent=id==='bitcoin'?'Start':'Month start';if(liveLabel)liveLabel.textContent='Live';values=[];historyValues=[];current=0;last=0;raw=0;priceFrom=0;priceTarget=0;priceAnimStarted=0;scaleMin=0;scaleMax=0;entry=0;readyPrice=false;currentRound=null;roundLockDeadline=0;lastPointAt=0;reconnectDelay=6000;showLoading();updateMenu();if(question)question.textContent=cfg().question;renderImage();if(result){result.className='predict-zone-result-strip';result.innerHTML=''}var my=seq,selectedMarket=market;connectFeed(my,selectedMarket);syncRound(my,selectedMarket).then(function(ok){if(ok&&my===seq&&selectedMarket===market&&!eventMode)startClock()})}
    function suspend(){if(runtimeSuspended)return;runtimeSuspended=true;stopClock();cancelDraw();stopFeed();setKeyboardOpen(false);closeBet(true)}
    function resume(){
      if(!isActive())return;
      var wasSuspended=runtimeSuspended;runtimeSuspended=false;
      if(!runtimeStarted){runtimeStarted=true;loadImages();loadGramUsd();selectMarket('bitcoin');return}
      if(eventMode){if(wasSuspended&&(!currentEvent||eventDeadline<=Date.now())){selectEventCategory(market);return}if(currentEvent&&!clockTimer)startClock();return}
      if(wasSuspended){var my=seq,id=market;if(!ws&&!reconnectTimer)connectFeed(my,id);syncRound(my,id).then(function(ok){if(ok&&my===seq&&id===market&&!eventMode)startClock()});queueDraw()}
      if(readyPrice)startChartMotion();if(!clockTimer&&currentRound)startClock();if(!wasSuspended&&!ws&&!reconnectTimer)connectFeed(seq,market);
    }
    function syncActiveState(){if(isActive())resume();else suspend()}

    menu.addEventListener('click',function(e){var btn=e.target&&e.target.closest&&e.target.closest('[data-vexa-predict-market]');if(!btn)return;var id=btn.getAttribute('data-vexa-predict-market');if(!MARKETS[id]&&!EVENT_CATEGORIES[id])return;e.preventDefault();e.stopPropagation();if(btn.getAttribute('data-vexa-predict-locked')==='1'||LOCKED_CATEGORIES[id])return;selectMarket(id)},true);
    root.addEventListener('input',function(e){if(e.target===betInput)updateEstimate()},true);
    root.addEventListener('focusin',function(e){if(e.target===betInput)setKeyboardOpen(true)},true);
    root.addEventListener('focusout',function(e){if(e.target!==betInput)return;if(keyboardCloseTimer)clearTimeout(keyboardCloseTimer);keyboardCloseTimer=setTimeout(function(){keyboardCloseTimer=0;if(document.activeElement!==betInput)setKeyboardOpen(false)},260)},true);
    root.addEventListener('click',function(e){var target=e.target;if(!target)return;var preset=target.closest&&target.closest('[data-predict-bet-preset]');if(preset&&betInput){e.preventDefault();betInput.value=preset.getAttribute('data-predict-bet-preset')||'';updateEstimate();return}var choice=target.closest&&target.closest('[data-predict-choice]');if(choice){e.preventDefault();openBet(choice.getAttribute('data-predict-choice'));return}var submit=target.closest&&target.closest('[data-predict-bet-submit]');if(submit&&betOpen){e.preventDefault();submitBet()}},true);
    window.addEventListener('vexa:predict-round-live',applyRealtimeRound);
    window.addEventListener('vexa:predict-user-round-live',applyRealtimeUserRound);
    window.addEventListener('vexa-country-detected',function(){if(currentRound&&!eventMode&&market==='bitcoin')renderRoundMeta(currentRound)});
    document.addEventListener('visibilitychange',syncActiveState);
    window.addEventListener('focus',syncActiveState);window.addEventListener('pageshow',syncActiveState);
    document.addEventListener('click',function(e){var target=e.target;if(betOpen&&card&&target&&!card.contains(target))closeBet()},true);
    if(window.MutationObserver)new MutationObserver(syncActiveState).observe(root,{attributes:true,attributeFilter:['class']});
    window.VexaPredictBack=function(){if(betOpen){closeBet();return true}return false};
    if(window.VexaUploadedImages&&window.VexaUploadedImages.load){try{window.VexaUploadedImages.load()}catch(e){}}
    if(window.VexaTonBalance&&window.VexaTonBalance.render){try{window.VexaTonBalance.render()}catch(e){}}
    syncActiveState();
  });
})();
`;