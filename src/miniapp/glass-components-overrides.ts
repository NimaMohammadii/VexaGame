export const GLASS_COMPONENTS_OVERRIDES = `
button:not(.tab):not(.section-keyboard-dismiss):not(:where(.home-ticket-step,.home-ticket-button,.home-ticket-drawer-close,.home-bonus-close,.predict-zone-category-card,.predict-zone-choice,.predict-zone-bet-close,.predict-zone-bet-submit,[data-predict-bet-preset])),.primary,.secondary,.ghost,.danger,.bot-row,.voice-btn,.voice-menu,.voice-menu button,.game-open,.plinko-drop,.plinko-quick button,.risk-segment,.risk-segment button,.rows-select,.bet-quick button,.autoplay-toggle,.crash-primary,.crash-secondary,.crash-quick button,.mine-tile,#minesStart,#minesCashout,[data-mines-bet],.top-balance-pill,.credit-pill,.pill{
  border:0!important;
  outline:0!important;
  background:rgba(255,255,255,.035)!important;
  color:#fff;
  box-shadow:0 18px 42px rgba(0,0,0,.16),inset 0 1px 0 rgba(255,255,255,.16)!important;
  backdrop-filter:blur(10px) saturate(1.18)!important;
  -webkit-backdrop-filter:blur(10px) saturate(1.18)!important;
}
.primary,.plinko-drop,.crash-primary,#minesStart,.tab.active,.risk-segment button.active,.voice-menu button.active{
  background:rgba(255,255,255,.92)!important;
  color:#050505!important;
  box-shadow:0 10px 26px rgba(255,255,255,.10),inset 0 1px 0 rgba(255,255,255,.78)!important;
  text-shadow:none!important;
}
.secondary,.ghost,.danger,.bot-row,.voice-btn,.game-open,.crash-secondary,.crash-quick button,.bet-quick button,.rows-select,[data-mines-bet],#minesCashout,.credit-pill,.pill{
  text-shadow:0 1px 10px rgba(0,0,0,.28);
}
.voice-menu{
  background:rgba(255,255,255,.04)!important;
  border:0!important;
  overflow:hidden!important;
}
.voice-menu button{box-shadow:none!important;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
.voice-menu button.active{background:rgba(255,255,255,.92)!important}
input:not(.predict-zone-bet-input),select,textarea,.section-code-input,.bet-amount,.crash-amount input{
  border:0!important;
  background:rgba(255,255,255,.035)!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.10)!important;
  backdrop-filter:blur(10px) saturate(1.18)!important;
  -webkit-backdrop-filter:blur(10px) saturate(1.18)!important;
}
#predictzone .predict-zone-result-strip{
  margin:4px 0 14px!important;
  padding:0 14px!important;
}
#predictzone .predict-zone-history-track{
  gap:5px!important;
  padding:0 0 1px!important;
}
#predictzone .predict-zone-history-card{
  height:30px!important;
  min-width:74px!important;
  padding:0 10px!important;
  border-radius:18px!important;
  gap:4px!important;
  font-size:10.5px!important;
  box-shadow:0 7px 18px rgba(31,1,10,.22),inset 0 0 0 1px rgba(255,255,255,.045)!important;
}
`;
