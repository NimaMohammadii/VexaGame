export const TELEGRAM_BACK_BUTTON_SCRIPT = `
(function(){
  function setup(){
    var tg=window.Telegram&&window.Telegram.WebApp;
    if(!tg||!tg.BackButton||window.__vexaTelegramBackReady)return;
    window.__vexaTelegramBackReady=true;
    var back=tg.BackButton;
    var originalShow=back.show&&back.show.bind(back);
    var originalHide=back.hide&&back.hide.bind(back);
    var viewObserver=window.MutationObserver?new MutationObserver(sync):null;
    var observed=typeof WeakSet==='function'?new WeakSet():null;
    var observedList=[];
    function isActive(id){var n=document.getElementById(id);return !!(n&&n.classList.contains('active'))}
    function show(){try{if(originalShow)originalShow();else back.show()}catch(e){}}
    function hide(){try{if(originalHide)originalHide();else back.hide()}catch(e){}}
    function goPlayZone(){var tab=document.querySelector('button[data-view="playzone"],.tab[data-view="playzone"]');if(tab&&typeof tab.click==='function'){tab.click();return true}return false}
    function shouldShow(){
      var games=['crash','plinko','mines','slot','wheel','dice','ghostrun','coinflip','shellgame'];
      for(var i=0;i<games.length;i++)if(isActive(games[i]))return true;
      var p=document.getElementById('predictzone');
      return !!(p&&p.classList.contains('active')&&(p.classList.contains('predict-market-detail-mode')||p.classList.contains('football-match-detail-open')));
    }
    if(originalHide&&!back.__vexaBackHideGuarded){
      back.__vexaBackHideGuarded=true;
      back.hide=function(){if(shouldShow())return;return originalHide()};
    }
    function goBack(){
      var p=document.getElementById('predictzone');
      if(p&&p.classList.contains('active')&&(p.classList.contains('predict-market-detail-mode')||p.classList.contains('football-match-detail-open'))){
        if(window.VexaPredictBack){try{if(window.VexaPredictBack()){setTimeout(sync,60);return}}catch(e){}}
        if(window.VexaFootballPredictBack){try{if(window.VexaFootballPredictBack()){setTimeout(sync,60);return}}catch(e){}}
        sync();return;
      }
      var games=['crash','plinko','mines','slot','wheel','dice','ghostrun','coinflip','shellgame'];
      for(var i=0;i<games.length;i++){if(isActive(games[i])){if(goPlayZone()){setTimeout(sync,0);return}sync();return}}
      sync();
    }
    function sync(){shouldShow()?show():hide()}
    function observeView(node){
      if(!viewObserver||!node||!node.classList||!node.classList.contains('view'))return;
      if(observed){if(observed.has(node))return;observed.add(node)}else{if(observedList.indexOf(node)>=0)return;observedList.push(node)}
      viewObserver.observe(node,{attributes:true,attributeFilter:['class']});
    }
    try{back.onClick(goBack)}catch(e){}
    document.querySelectorAll('.view').forEach(observeView);
    window.addEventListener('vexa:section-mounted',function(ev){var id=ev&&ev.detail&&ev.detail.id;observeView(id&&document.getElementById(id));sync()});
    window.addEventListener('vexa:view-changed',sync);
    window.addEventListener('focus',sync);
    document.addEventListener('visibilitychange',sync);
    sync();setTimeout(sync,200);setTimeout(sync,500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
`;
