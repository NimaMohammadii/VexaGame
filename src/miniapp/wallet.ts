export const WALLET_SECTION = `<div id="wallet" class="wallet-sheet" aria-hidden="true">
  <style>
    #wallet.wallet-sheet{position:fixed!important;inset:0!important;z-index:10070!important;display:block!important;pointer-events:none!important;visibility:hidden!important}
    #wallet.wallet-sheet.open{pointer-events:auto!important;visibility:visible!important}
    #wallet .wallet-sheet-backdrop{position:absolute!important;inset:0!important;background:rgba(0,0,0,.60)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;opacity:0!important;transition:opacity .26s ease!important}
    #wallet.open .wallet-sheet-backdrop{opacity:1!important}
    #wallet .wallet-sheet-panel{position:absolute!important;left:0!important;right:0!important;bottom:0!important;width:min(100%,560px)!important;height:calc(252px + env(safe-area-inset-bottom))!important;margin:0 auto!important;padding:18px 14px calc(18px + env(safe-area-inset-bottom))!important;box-sizing:border-box!important;border:1px solid rgba(255,255,255,.09)!important;border-bottom:0!important;border-radius:30px 30px 0 0!important;background:#0c0c10!important;background-image:none!important;box-shadow:0 -12px 36px rgba(0,0,0,.28)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transform:translateY(calc(100% + 28px))!important;overflow:hidden!important;will-change:transform,height!important;transition:transform .42s cubic-bezier(.16,1,.3,1),height .32s cubic-bezier(.16,1,.3,1)!important}
    #wallet .wallet-sheet-panel:before{display:block!important;content:""!important;position:absolute!important;top:8px!important;left:50%!important;width:34px!important;height:4px!important;border-radius:999px!important;background:rgba(255,255,255,.22)!important;transform:translateX(-50%)!important;pointer-events:none!important}
    #wallet.open .wallet-sheet-panel{transform:translateY(calc(0px - var(--vexa-wallet-keyboard-offset,0px)))!important}
    body.wallet-open.deposit-open #wallet .wallet-sheet-panel{height:min(420px,calc(100vh - 16px))!important;background:transparent!important;border-color:transparent!important;box-shadow:none!important}
    body.wallet-open.withdraw-open #wallet .wallet-sheet-panel{height:min(452px,calc(100vh - 16px))!important;background:transparent!important;border-color:transparent!important;box-shadow:none!important}

    body.wallet-open.deposit-open #depositSheet.deposit-sheet.open,body.wallet-open.withdraw-open #withdrawSheet.deposit-sheet.open{position:fixed!important;inset:0!important;z-index:10072!important;width:100%!important;height:100%!important;min-height:0!important;padding:0!important;margin:0!important;display:block!important;background:transparent!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important}
    body.wallet-open.deposit-open #depositSheet .deposit-backdrop,body.wallet-open.withdraw-open #withdrawSheet .deposit-backdrop{display:none!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
    body.wallet-open.deposit-open #depositSheet.deposit-sheet.open .deposit-panel{position:absolute!important;left:50%!important;right:auto!important;top:auto!important;bottom:0!important;z-index:2!important;width:min(100%,560px)!important;height:min(420px,calc(100vh - 16px))!important;max-height:min(420px,calc(100vh - 16px))!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;background-color:transparent!important;background-image:none!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;opacity:1!important;visibility:visible!important;transform:translateX(-50%)!important;animation:walletFinanceContentIn .30s .05s cubic-bezier(.16,1,.3,1) both!important;overflow:hidden!important;overscroll-behavior:none!important;touch-action:manipulation!important}
    body.wallet-open.withdraw-open #withdrawSheet.deposit-sheet.open .deposit-panel{position:absolute!important;left:50%!important;right:auto!important;top:auto!important;bottom:0!important;z-index:3!important;width:min(100%,560px)!important;height:min(452px,calc(100vh - 16px))!important;max-height:min(452px,calc(100vh - 16px))!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;background-color:transparent!important;background-image:none!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;opacity:1!important;visibility:visible!important;transform:translateX(-50%)!important;animation:walletFinanceContentIn .30s .05s cubic-bezier(.16,1,.3,1) both!important;overflow:auto!important}
    body.wallet-open.deposit-open #depositSheet .deposit-panel .pad,body.wallet-open.withdraw-open #withdrawSheet .deposit-panel .pad{padding:18px 18px calc(14px + env(safe-area-inset-bottom))!important;display:block!important;background:transparent!important}
    body.wallet-open.deposit-open #depositSheet .deposit-title{margin:0 auto 8px!important;width:min(100%,370px)!important;justify-content:space-between!important}
    body.wallet-open.deposit-open #depositSheet:not(.deposit-choosing) .deposit-title{justify-content:flex-end!important}
    body.wallet-open.deposit-open #depositSheet:not(.deposit-choosing):not(.deposit-ton-connect-required) .deposit-copy:not(.deposit-method-copy){margin-top:24px!important}
    body.wallet-open.withdraw-open #withdrawSheet .deposit-title{margin:0 auto 12px!important;width:min(100%,370px)!important}
    body.wallet-open.deposit-open #depositSheet.deposit-sheet .deposit-close,body.wallet-open.withdraw-open #withdrawSheet.deposit-sheet .deposit-close{width:44px!important;height:44px!important;min-width:44px!important;padding:0!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:50%!important;background:#16161c!important;color:#fff!important;display:grid!important;place-items:center!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
    body.wallet-open.deposit-open #depositSheet .deposit-close svg,body.wallet-open.withdraw-open #withdrawSheet.deposit-sheet .deposit-close svg{width:19px!important;height:19px!important}
    body.wallet-open.deposit-open #depositSheet .deposit-copy,body.wallet-open.withdraw-open #withdrawSheet .deposit-copy{width:min(100%,340px)!important;margin:0 auto 12px!important}
    body.wallet-open.deposit-open #depositSheet .deposit-custom-field,body.wallet-open.deposit-open #depositSheet .deposit-action-row{width:min(100%,340px)!important;max-width:340px!important;margin-left:auto!important;margin-right:auto!important}
    body.wallet-open.deposit-open #depositSheet .deposit-action-row{grid-template-columns:1fr!important;gap:0!important}
    body.wallet-open.deposit-open #depositSheet .deposit-amount-row,body.wallet-open.withdraw-open #withdrawSheet .deposit-amount-row{width:100%!important;height:48px!important;min-height:48px!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:16px!important;background:#16161c!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
    body.wallet-open.deposit-open #depositSheet .deposit-pay-button,body.wallet-open.withdraw-open #withdrawSheet .deposit-pay-button{width:min(100%,340px)!important;max-width:340px!important;margin-left:auto!important;margin-right:auto!important;height:46px!important;min-height:46px!important;border:0!important;border-radius:16px!important;background:#482432!important;color:#fff!important;font-size:13px!important;font-weight:900!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
    body.wallet-open.deposit-open #depositSheet .deposit-pay-button:active,body.wallet-open.withdraw-open #withdrawSheet .deposit-pay-button:active{background:#57303f!important;transform:scale(.992)!important}
    body.wallet-open.deposit-open #depositSheet .deposit-ton-equivalent{background:transparent!important;box-shadow:none!important;border:0!important;border-radius:0!important;padding:0!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
    body.wallet-open.deposit-open #depositSheet .deposit-method-screen{width:min(100%,370px)!important;gap:8px!important}
    body.wallet-open.deposit-open #depositSheet .deposit-method-option{min-height:68px!important;border:1px solid rgba(255,255,255,.06)!important;border-radius:18px!important;padding:10px 12px!important;background:#141419!important;background-image:none!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
    body.wallet-open.deposit-open #depositSheet .deposit-method-option:active{background:#1b1b22!important}
    body.wallet-open.deposit-open #depositSheet .wallet-withdraw-link{appearance:none!important;-webkit-appearance:none!important;width:auto!important;height:auto!important;min-width:0!important;margin:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;color:rgba(255,255,255,.82)!important;display:inline-flex!important;align-items:center!important;justify-content:flex-start!important;gap:4px!important;font-size:13px!important;line-height:1!important;font-weight:850!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
    body.wallet-open.deposit-open #depositSheet .wallet-withdraw-link span{text-decoration:none!important}
    body.wallet-open.deposit-open #depositSheet .wallet-withdraw-link svg{width:17px!important;height:17px!important;display:block!important;color:#ae8495!important;flex:0 0 auto!important}
    body.wallet-open.deposit-open #depositSheet:not(.deposit-choosing) .wallet-withdraw-link{display:none!important}

    @keyframes walletFinanceContentIn{0%{opacity:0;transform:translateX(-50%) translateY(10px) scale(.994)}100%{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
    @media(max-width:380px){body.wallet-open.deposit-open #wallet .wallet-sheet-panel{height:min(400px,calc(100vh - 14px))!important}body.wallet-open.withdraw-open #wallet .wallet-sheet-panel{height:min(430px,calc(100vh - 14px))!important}body.wallet-open.deposit-open #depositSheet.deposit-sheet.open .deposit-panel{height:min(400px,calc(100vh - 14px))!important;max-height:min(400px,calc(100vh - 14px))!important}body.wallet-open.withdraw-open #withdrawSheet.deposit-sheet.open .deposit-panel{height:min(430px,calc(100vh - 14px))!important;max-height:min(430px,calc(100vh - 14px))!important}body.wallet-open.deposit-open #depositSheet .deposit-method-option{min-height:64px!important;padding:9px 11px!important}}
    @media(prefers-reduced-motion:reduce){#wallet .wallet-sheet-backdrop,#wallet .wallet-sheet-panel{transition:none!important}body.wallet-open.deposit-open #depositSheet.deposit-sheet.open .deposit-panel,body.wallet-open.withdraw-open #withdrawSheet.deposit-sheet.open .deposit-panel{animation:none!important}}
  </style>
  <div class="wallet-sheet-backdrop" data-action="close-wallet"></div>
  <section class="wallet-sheet-panel" role="dialog" aria-modal="true" aria-label="Wallet"></section>
  <script>(function(){
    var observed=[];
    function gramify(node){
      if(!node)return;
      var walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);var text;
      while((text=walker.nextNode())){var parent=text.parentElement;if(parent&&(parent.tagName==='SCRIPT'||parent.tagName==='STYLE'))continue;var value=String(text.nodeValue||'');if(/\\bTON\\b/.test(value))text.nodeValue=value.replace(/\\bTON\\b/g,'Gram')}
      Array.prototype.forEach.call(node.querySelectorAll('[placeholder],[aria-label],[title]'),function(el){['placeholder','aria-label','title'].forEach(function(name){var value=el.getAttribute(name);if(value&&/\\bTON\\b/.test(value))el.setAttribute(name,value.replace(/\\bTON\\b/g,'Gram'))})})
    }
    function bindFinance(){
      ['depositSheet','withdrawSheet','transactionsSheet'].forEach(function(id){var sheet=document.getElementById(id);if(!sheet)return;gramify(sheet);if(observed.indexOf(sheet)>=0||!window.MutationObserver)return;observed.push(sheet);new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){var target=mutations[i].target;var el=target&&target.nodeType===3?target.parentElement:target;if(el&&el.closest&&el.closest('#depositSheet,#withdrawSheet,#transactionsSheet')){gramify(sheet);break}}}).observe(sheet,{subtree:true,childList:true,characterData:true})})
    }
    bindFinance();
  })();</script>
  <div id="depositSheet" class="deposit-sheet deposit-choosing" aria-hidden="true">
    <div class="deposit-backdrop" data-action="close-deposit"></div>
    <div class="deposit-panel card">
      <div class="pad">
        <div class="title deposit-title">
          <button class="ghost deposit-close" type="button" data-action="close-deposit" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button>
        </div>
        <p class="deposit-copy">Your balance will be charged as TON after Telegram confirms the payment</p>
        <div class="field deposit-custom-field"><label>Custom Stars Amount</label><div class="deposit-amount-row"><input id="starsAmountSheet" inputmode="numeric" placeholder="Stars amount" value="100" /><span id="starsTonEquivalent" class="deposit-ton-equivalent">≈ … Gram</span></div></div>
        <button class="primary deposit-pay-button" type="button" data-action="deposit-custom-stars-sheet">Pay With Stars</button>
        <div class="deposit-stars-logo" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="25" fill="url(#starsHalo)" opacity=".24"/><path d="M32 6.5l5.15 15.15L52.8 16.9 43.2 29.7l14.55 6.65-16.05.4 6.15 14.8L32 41.45 16.15 51.55l6.15-14.8-16.05-.4 14.55-6.65-9.6-12.8 15.65 4.75L32 6.5z" fill="url(#starsBody)"/><path d="M32 15.4l3.3 9.72 10.05-3.05-6.16 8.22 9.34 4.27-10.3.26 3.95 9.5L32 37.83l-10.18 6.49 3.95-9.5-10.3-.26 9.34-4.27-6.16-8.22 10.05 3.05L32 15.4z" fill="rgba(255,255,255,.9)"/><defs><radialGradient id="starsHalo" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(32 32) rotate(90) scale(28)"><stop stop-color="#ffeaa0"/><stop offset="1" stop-color="#ffb21f" stop-opacity="0"/></radialGradient><linearGradient id="starsBody" x1="16" y1="10" x2="48" y2="54" gradientUnits="userSpaceOnUse"><stop stop-color="#fff4b8"/><stop offset=".38" stop-color="#ffd45a"/><stop offset="1" stop-color="#ff9d18"/></linearGradient></defs></svg><span>Telegram Stars</span></div>
      </div>
    </div>
  </div>

  <script>
    (function(){
      var isTransitioning=false;
      function q(id){return document.getElementById(id)}
      function sheet(){return q('depositSheet')}
      function addStyle(){
        if(q('vexaDepositMethodPickerStyle'))return;
        var style=document.createElement('style');
        style.id='vexaDepositMethodPickerStyle';
        style.textContent='#depositSheet .deposit-method-screen{display:none!important;width:min(100%,370px)!important;margin:0 auto 2px!important;position:relative!important}#depositSheet.deposit-choosing .deposit-method-screen{display:grid!important;gap:8px!important}#depositSheet.deposit-choosing .deposit-copy:not(.deposit-method-copy),#depositSheet.deposit-choosing .deposit-custom-field,#depositSheet.deposit-choosing .deposit-action-row,#depositSheet.deposit-choosing #depositMainPayButton,#depositSheet.deposit-choosing .ton-wallet-status,#depositSheet.deposit-choosing .deposit-status-inline,#depositSheet.deposit-choosing .deposit-stars-logo{display:none!important}.deposit-method-copy{margin:0 0 10px!important;text-align:center!important;color:rgba(255,255,255,.58)!important;font-size:13px!important;font-weight:550!important;line-height:1.35!important;transition:opacity .22s ease,transform .22s ease}.deposit-method-option{appearance:none!important;-webkit-appearance:none!important;width:100%!important;min-height:68px!important;border:1px solid rgba(255,255,255,.06)!important;border-radius:18px!important;background:#141419!important;box-shadow:none!important;color:#fff!important;padding:9px 11px!important;display:grid!important;grid-template-columns:46px minmax(0,1fr) 18px!important;gap:11px!important;align-items:center!important;text-align:left!important;transform-origin:center!important;will-change:transform,opacity!important}.deposit-method-option:active{transform:scale(.992)!important;background:#1b1b22!important}.deposit-method-image{width:46px!important;height:46px!important;border-radius:0!important;display:grid!important;place-items:center!important;background:transparent!important;box-shadow:none!important;overflow:visible!important}.deposit-method-image img{width:42px!important;height:42px!important;object-fit:contain!important;display:block!important;background:transparent!important;border:0!important;box-shadow:none!important;filter:none}.deposit-method-copybox{min-width:0!important;display:grid!important;gap:4px!important}.deposit-method-copybox strong{font-size:16px!important;line-height:1!important;font-weight:750!important;letter-spacing:-.02em!important;color:#fff!important}.deposit-method-copybox span{font-size:12px!important;line-height:1.35!important;font-weight:500!important;color:rgba(255,255,255,.52)!important}.deposit-method-arrow{font-size:22px!important;line-height:1!important;color:rgba(255,255,255,.38)!important;text-align:right!important}#depositSheet .deposit-action-row{width:min(100%,340px)!important;grid-template-columns:1fr!important;margin:0 auto 18px!important}#depositSheet .deposit-action-row .deposit-pay-button,#depositSheet #depositMainPayButton{width:100%!important}.deposit-method-screen.vexa-leaving .deposit-method-copy{opacity:0!important;transform:translateY(-6px)!important}.deposit-method-screen.vexa-leaving:after{display:none!important;content:none!important}.deposit-method-option.vexa-selected{animation:vexaDepositSelect .40s cubic-bezier(.16,1,.3,1) forwards!important;z-index:4!important}.deposit-method-option.vexa-selected .deposit-method-image img{animation:vexaDepositIconFly .40s cubic-bezier(.16,1,.3,1) forwards!important}.deposit-method-option.vexa-fade{animation:vexaDepositFade .28s ease forwards!important}.deposit-transitioning .deposit-method-option{pointer-events:none!important}.deposit-paying-reveal .deposit-custom-field,.deposit-paying-reveal .deposit-action-row,.deposit-paying-reveal #depositMainPayButton,.deposit-paying-reveal .ton-wallet-status,.deposit-paying-reveal .deposit-status-inline{animation:vexaPaymentIn .34s cubic-bezier(.16,1,.3,1) both!important}@keyframes vexaDepositSelect{0%{transform:scale(1)}48%{transform:scale(1.01) translateY(-1px)}100%{transform:scale(.92) translateY(-10px);opacity:0}}@keyframes vexaDepositIconFly{0%{transform:scale(1)}100%{transform:scale(.78) translateY(-8px);opacity:0}}@keyframes vexaDepositFade{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.97) translateY(7px)}}@keyframes vexaPaymentIn{0%{opacity:0;transform:translateY(12px) scale(.985)}100%{opacity:1;transform:translateY(0) scale(1)}}';
        document.head.appendChild(style);
      }
      function methodImg(type){
        var src=type==='ton'?'/app/api/credit-icon.png':('/app/api/deposit-method-icon/'+(type==='nft'?'nft':'stars')+'.png');
        return '<img src="'+src+'" alt="" decoding="async" loading="eager">';
      }
      function ensurePicker(){
        addStyle();
        var s=sheet();if(!s)return;
        var title=s.querySelector('.deposit-title');if(!title)return;
        if(!title.querySelector('.wallet-withdraw-link')){
          var withdraw=document.createElement('button');
          withdraw.className='wallet-withdraw-link';
          withdraw.type='button';
          withdraw.setAttribute('data-action','open-withdraw');
          withdraw.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 17V7M8 11l4-4 4 4" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Withdraw</span>';
          title.insertBefore(withdraw,title.firstChild);
        }
        if(!s.querySelector('.deposit-method-screen')){
          var box=document.createElement('div');
          box.className='deposit-method-screen';
          box.innerHTML='<p class="deposit-copy deposit-method-copy">Choose how you want to deposit</p>'+
            '<button class="deposit-method-option" type="button" data-action="choose-deposit-method" data-method="stars"><span class="deposit-method-image">'+methodImg('stars')+'</span><span class="deposit-method-copybox"><strong>Deposit with Stars</strong><span>Fast Telegram Stars payment</span></span><span class="deposit-method-arrow">›</span></button>'+
            '<button class="deposit-method-option" type="button" data-action="choose-deposit-method" data-method="ton"><span class="deposit-method-image">'+methodImg('ton')+'</span><span class="deposit-method-copybox"><strong>Deposit with TON</strong><span>Deposit directly with TON wallet</span></span><span class="deposit-method-arrow">›</span></button>'+
            '<button class="deposit-method-option" type="button" data-action="choose-deposit-method" data-method="nft"><span class="deposit-method-image">'+methodImg('nft')+'</span><span class="deposit-method-copybox"><strong>NFT</strong><span>Coming Soon</span></span><span class="deposit-method-arrow">›</span></button>';
          title.insertAdjacentElement('afterend',box);
        }
        var pay=q('depositMainPayButton')||s.querySelector('[data-action="deposit-custom-stars-sheet"],[data-action="confirm-ton-payment"]');
        if(pay)pay.id='depositMainPayButton';
      }
      function resetRootNav(){
        var button=document.querySelector('#depositSheet .deposit-close');if(!button)return;
        button.setAttribute('data-action','close-deposit');button.setAttribute('aria-label','Close');
        button.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
      }
      function showPicker(){
        ensurePicker();
        var s=sheet();if(!s)return;
        resetRootNav();
        s.classList.remove('deposit-paying-reveal','deposit-ton-connect-required','deposit-usdt-mode');
        s.classList.add('deposit-choosing');
        var screen=s.querySelector('.deposit-method-screen');if(screen)screen.classList.remove('vexa-leaving');
        Array.prototype.forEach.call(s.querySelectorAll('.deposit-method-option'),function(item){item.classList.remove('vexa-selected','vexa-fade')});
        isTransitioning=false;
      }
      window.VexaShowDepositPicker=showPicker;
      function finishMode(method){
        var s=sheet();if(!s)return;
        if(typeof window.VexaDepositSelectMode!=='function'){showPicker();return;}
        window.VexaDepositSelectMode(method==='ton'?'ton':'stars');
        s.classList.remove('deposit-choosing');
        s.classList.add('deposit-paying-reveal');
        setTimeout(function(){s.classList.remove('deposit-paying-reveal');isTransitioning=false},620);
      }
      function animateMode(method,btn){
        ensurePicker();
        var s=sheet();if(!s||isTransitioning)return;
        isTransitioning=true;
        s.classList.add('deposit-transitioning');
        var screen=s.querySelector('.deposit-method-screen');if(screen)screen.classList.add('vexa-leaving');
        Array.prototype.forEach.call(s.querySelectorAll('.deposit-method-option'),function(item){
          if(item===btn)item.classList.add('vexa-selected');else item.classList.add('vexa-fade');
        });
        setTimeout(function(){s.classList.remove('deposit-transitioning');finishMode(method)},410);
      }
      function pickMode(method,btn){
        if(method==='nft'){
          btn.animate([{transform:'scale(1)'},{transform:'scale(.985)'},{transform:'scale(1)'}],{duration:220,easing:'cubic-bezier(.18,.9,.22,1.25)'});
          return;
        }
        animateMode(method,btn);
      }
      document.addEventListener('click',function(ev){
        var btn=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!btn)return;
        var action=btn.getAttribute('data-action');
        if(action==='open-deposit'||action==='connect-deposit')showPicker();
        if(action==='choose-deposit-method'){ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();pickMode(btn.getAttribute('data-method'),btn)}
        if(action==='close-deposit'){var s=sheet();if(s){s.classList.add('deposit-choosing');s.classList.remove('deposit-transitioning','deposit-paying-reveal','deposit-usdt-mode');isTransitioning=false}}
      },true);
      ensurePicker();
    })();
  </script>

  <div id="withdrawSheet" class="deposit-sheet withdraw-sheet" aria-hidden="true">
    <div class="deposit-backdrop" data-action="close-withdraw"></div>
    <div class="deposit-panel card">
      <div class="pad withdraw-content">
        <div class="title deposit-title"><div class="deposit-title-main"><span class="withdraw-title-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M24 39V15" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M14 25l10-10 10 10" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="24" r="19" stroke="currentColor" stroke-opacity=".28" stroke-width="2"/></svg></span><h3>Withdraw TON</h3></div><button class="ghost deposit-close" type="button" data-action="close-withdraw" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button></div>
        <p class="deposit-copy">Enter your TON wallet and the amount you want to withdraw</p>
        <div class="field deposit-custom-field"><label>TON Amount</label><div class="deposit-amount-row"><input id="withdrawAmountTon" inputmode="decimal" placeholder="0.00" /><span id="withdrawUsdEquivalent" class="deposit-ton-equivalent">≈ $0.00</span></div></div>
        <div class="field deposit-custom-field"><label>TON Wallet Address</label><div class="deposit-amount-row withdraw-wallet-row"><input id="withdrawWalletAddress" inputmode="text" placeholder="UQ... wallet address" /></div></div>
        <button class="primary deposit-pay-button" type="button" data-action="submit-withdraw">Confirm Withdraw</button>
        <p id="withdrawStatus" class="withdraw-status"></p>
        <div id="withdrawSuccess" class="withdraw-success" aria-hidden="true"><svg viewBox="0 0 96 96" fill="none"><circle cx="48" cy="48" r="40" fill="rgba(23,210,116,.14)"/><circle cx="48" cy="48" r="31" stroke="#19e681" stroke-width="5"/><path d="M33 48.5l10 10L64 37" stroke="#19e681" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg><strong>Request submitted</strong><span>Your withdrawal is pending review</span></div>
      </div>
    </div>
  </div>

  <div id="transactionsSheet" class="deposit-sheet transactions-sheet" aria-hidden="true">
    <div class="deposit-backdrop" data-action="close-transactions"></div>
    <div class="deposit-panel card transactions-panel">
      <div class="pad">
        <div class="title deposit-title"><div class="deposit-title-main"><span class="withdraw-title-icon transactions-title-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M14 17h20M14 24h20M14 31h12" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><rect x="8" y="8" width="32" height="32" rx="12" stroke="currentColor" stroke-opacity=".28" stroke-width="2"/></svg></span><h3>Transactions</h3></div><button class="ghost deposit-close" type="button" data-action="close-transactions" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg></button></div>
        <p class="deposit-copy transactions-copy">Your deposits and withdrawal requests are shown here</p>
        <div id="transactionsList" class="transactions-list"><div class="transactions-empty">Loading transactions</div></div>
      </div>
    </div>
  </div>
</div>`;

export const WALLET_GLOBAL_STYLES = `
.deposit-presets b{font-family:var(--font-num);font-variant-numeric:tabular-nums lining-nums;font-feature-settings:"tnum" 1,"lnum" 1,"kern" 1}
.deposit-sheet{position:fixed;inset:0;z-index:120;display:none}.deposit-sheet.open{display:block}.deposit-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.58);backdrop-filter:none;-webkit-backdrop-filter:none}.deposit-panel{position:absolute;left:16px;right:16px;bottom:calc(14px + env(safe-area-inset-bottom));max-width:528px;margin:0 auto;padding:16px;border-radius:28px;background:#0c0c10;animation:depositIn .28s cubic-bezier(.2,.8,.2,1)}.deposit-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.deposit-head h3{margin:0;font-size:24px;font-weight:780;letter-spacing:-.055em}.deposit-close{width:38px;height:38px;border-radius:14px;background:#16161c;color:#fff;font-size:24px}.deposit-copy{color:rgba(255,255,255,.58);font-size:12.5px;line-height:1.45;margin:12px 0;font-weight:470}.deposit-presets{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.deposit-presets button{height:70px;border-radius:18px;border:1px solid rgba(255,255,255,.06);background:#141419;color:#fff}.deposit-presets b{display:block;font-size:20px;font-weight:780}.deposit-presets span{display:block;color:rgba(255,255,255,.52);font-size:11px}.deposit-custom{display:grid;grid-template-columns:1fr 86px;gap:8px;margin-top:9px}.deposit-custom input{height:50px;border-radius:16px;background:#16161c;border-color:rgba(255,255,255,.07)}.deposit-custom button{border-radius:16px;background:#482432;color:#fff;font-weight:760}.deposit-status{min-height:18px;margin:10px 2px 0;color:rgba(255,255,255,.56);font-size:11.5px}@keyframes depositIn{from{opacity:0;transform:translateY(28px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}

.deposit-panel,.deposit-close,.deposit-custom button,.deposit-presets button{
  outline:0!important;
  color:#fff;
  box-shadow:none!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
}
.deposit-panel{
  background:#0c0c10!important;
  border:1px solid rgba(255,255,255,.07)!important;
  overflow:hidden!important;
}
#depositSheet.deposit-sheet.open,#withdrawSheet.deposit-sheet.open{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  padding:20px 16px calc(92px + env(safe-area-inset-bottom))!important;
  opacity:1!important;
  visibility:visible!important;
  pointer-events:auto!important;
}
#depositSheet.deposit-sheet.open .deposit-panel,#withdrawSheet.deposit-sheet.open .deposit-panel{
  display:block!important;
  width:min(100%,528px)!important;
  height:auto!important;
  max-height:min(78vh,620px)!important;
  margin:auto!important;
  padding:0!important;
  opacity:1!important;
  visibility:visible!important;
  transform:translateY(0) scale(1)!important;
  z-index:2!important;
  background:#0c0c10!important;
  border-radius:28px!important;
  overflow:auto!important;
}
#depositSheet.deposit-sheet.open .deposit-panel .pad,#withdrawSheet.deposit-sheet.open .deposit-panel .pad{
  display:block!important;
  padding:24px 22px!important;
  opacity:1!important;
  visibility:visible!important;
}
#depositSheet .deposit-title,#withdrawSheet .deposit-title{
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:12px!important;
  margin:0 0 14px!important;
  opacity:1!important;
  visibility:visible!important;
  animation:none!important;
}
#depositSheet .deposit-title-main,#withdrawSheet .deposit-title-main{
  display:flex!important;
  align-items:center!important;
  gap:10px!important;
  min-width:0!important;
}
#depositSheet .deposit-credit-icon,#withdrawSheet .withdraw-title-icon{
  width:34px!important;
  height:34px!important;
  min-width:34px!important;
  max-width:34px!important;
  max-height:34px!important;
  border-radius:13px!important;
  object-fit:cover!important;
  display:grid!important;
  place-items:center!important;
  flex:0 0 auto!important;
  overflow:hidden!important;
  background:rgba(255,255,255,.04)!important;
  color:#fff!important;
}
#withdrawSheet .withdraw-title-icon svg{
  width:23px!important;
  height:23px!important;
  display:block!important;
}
#depositSheet .deposit-title h3,#withdrawSheet .deposit-title h3{
  margin:0!important;
  font-size:20px!important;
  line-height:1.05!important;
  font-weight:900!important;
  letter-spacing:-.045em!important;
  white-space:nowrap!important;
  color:#fff!important;
}
#depositSheet .deposit-copy,#withdrawSheet .deposit-copy{
  display:block!important;
  margin:8px auto 18px!important;
  max-width:330px!important;
  text-align:center!important;
  color:rgba(255,255,255,.68)!important;
  font-size:15px!important;
  line-height:1.4!important;
  font-weight:680!important;
  letter-spacing:-.025em!important;
  opacity:1!important;
  visibility:visible!important;
  animation:none!important;
  background:transparent!important;
  border:0!important;
  box-shadow:none!important;
  padding:0!important;
}
#depositSheet .deposit-custom-field,#withdrawSheet .deposit-custom-field{
  display:block!important;
  margin:0 auto 12px!important;
  max-width:340px!important;
  opacity:1!important;
  visibility:visible!important;
  animation:none!important;
}
#depositSheet .deposit-custom-field label,#withdrawSheet .deposit-custom-field label{
  display:block!important;
  text-align:left!important;
  color:rgba(255,255,255,.50)!important;
  font-size:10.5px!important;
  line-height:1!important;
  font-weight:780!important;
  letter-spacing:.08em!important;
  text-transform:uppercase!important;
  margin:0 0 9px!important;
}
#depositSheet .deposit-amount-row,#withdrawSheet .deposit-amount-row{
  height:50px!important;
  min-height:50px!important;
  border:1px solid rgba(255,255,255,.07)!important;
  border-radius:16px!important;
  background:#16161c!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) auto!important;
  align-items:center!important;
  gap:10px!important;
  padding:0 14px 0 16px!important;
  overflow:hidden!important;
}
#withdrawSheet .withdraw-wallet-row{
  grid-template-columns:1fr!important;
  padding-right:16px!important;
}
#depositSheet .deposit-amount-row input,#withdrawSheet .deposit-amount-row input{
  height:100%!important;
  min-width:0!important;
  background:transparent!important;
  border:0!important;
  border-radius:0!important;
  color:#fff!important;
  text-align:left!important;
  font-size:17px!important;
  font-weight:650!important;
  box-shadow:none!important;
  padding:0!important;
  letter-spacing:-.015em!important;
}
#depositSheet .deposit-ton-equivalent{
  white-space:nowrap!important;
  color:rgba(255,255,255,.62)!important;
  font-size:12px!important;
  font-weight:780!important;
  background:transparent!important;
  border:0!important;
  border-radius:0!important;
  box-shadow:none!important;
  backdrop-filter:none!important;
  -webkit-backdrop-filter:none!important;
  padding:0!important;
  line-height:1!important;
}
#depositSheet .deposit-pay-button,#withdrawSheet .deposit-pay-button{
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  width:min(100%,340px)!important;
  height:48px!important;
  margin:0 auto 10px!important;
  border-radius:16px!important;
  background:#482432!important;
  font-size:14px!important;
  font-weight:900!important;
  color:#fff!important;
  opacity:1!important;
  visibility:visible!important;
  animation:none!important;
}
#depositSheet .deposit-stars-logo{
  display:grid!important;
  justify-items:center!important;
  gap:7px!important;
  margin:4px auto 0!important;
  color:rgba(255,255,255,.50)!important;
  font-size:10.5px!important;
  font-weight:780!important;
  letter-spacing:.06em!important;
  text-transform:uppercase!important;
  opacity:1!important;
  visibility:visible!important;
  animation:none!important;
}
#depositSheet .deposit-stars-logo svg{
  width:48px!important;
  height:48px!important;
  max-width:48px!important;
  max-height:48px!important;
  display:block!important;
}
#withdrawSheet .withdraw-status{
  min-height:18px!important;
  margin:0 auto 0!important;
  max-width:340px!important;
  text-align:center!important;
  color:rgba(255,255,255,.62)!important;
  font-size:12px!important;
  font-weight:700!important;
  opacity:1!important;
  visibility:visible!important;
  animation:none!important;
}
#withdrawSheet .withdraw-success{
  display:none!important;
  opacity:0!important;
  visibility:hidden!important;
  pointer-events:none!important;
}
#withdrawSheet .withdraw-success.show{
  display:flex!important;
  align-items:center!important;
  gap:12px!important;
  margin:18px auto 0!important;
  max-width:340px!important;
  opacity:1!important;
  visibility:visible!important;
  pointer-events:auto!important;
}
#withdrawSheet .withdraw-success:not(.show){
  display:none!important;
}
#depositSheet.deposit-sheet.open .deposit-backdrop,#withdrawSheet.deposit-sheet.open .deposit-backdrop{
  z-index:0!important;
}
.deposit-backdrop{background:rgba(0,0,0,.58)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}body > #transactionsSheet.deposit-sheet,#transactionsSheet.deposit-sheet{position:fixed!important;inset:0!important;z-index:120!important;display:none;align-items:center!important;justify-content:center!important;padding:20px 16px calc(92px + env(safe-area-inset-bottom))!important}
body > #transactionsSheet.deposit-sheet.open,#transactionsSheet.deposit-sheet.open{display:flex!important}
body > #transactionsSheet .deposit-backdrop,#transactionsSheet .deposit-backdrop{position:absolute!important;inset:0!important;background:rgba(0,0,0,.58)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
body > #transactionsSheet .deposit-panel,#transactionsSheet .deposit-panel{position:relative!important;left:auto!important;right:auto!important;bottom:auto!important;width:min(100%,528px)!important;max-height:min(82vh,650px)!important;margin:auto!important;border-radius:28px!important;background:#0c0c10!important;border:1px solid rgba(255,255,255,.07)!important;box-shadow:0 24px 64px rgba(0,0,0,.42)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;overflow:auto!important;animation:depositCenterIn .34s cubic-bezier(.18,.88,.22,1.08)!important}
body > #transactionsSheet .deposit-panel .pad,#transactionsSheet .deposit-panel .pad{padding:24px 22px 24px!important}
body > #transactionsSheet .deposit-title,#transactionsSheet .deposit-title{display:flex!important;align-items:center!important;justify-content:space-between!important;margin:0 0 14px!important;gap:12px!important}
body > #transactionsSheet .deposit-title-main,#transactionsSheet .deposit-title-main{display:flex!important;align-items:center!important;gap:10px!important;min-width:0!important}
body > #transactionsSheet .transactions-title-icon,#transactionsSheet .transactions-title-icon{width:34px!important;height:34px!important;border-radius:13px!important;display:grid!important;place-items:center!important;background:rgba(255,255,255,.04)!important;color:#fff!important;flex:0 0 auto!important;filter:none!important}
body > #transactionsSheet .transactions-title-icon svg,#transactionsSheet .transactions-title-icon svg{width:23px!important;height:23px!important}
body > #transactionsSheet .deposit-title h3,#transactionsSheet .deposit-title h3{font-size:20px!important;line-height:1.05!important;font-weight:900!important;letter-spacing:-.045em!important;white-space:nowrap!important}
body > #transactionsSheet .deposit-close,#transactionsSheet .deposit-close{width:40px!important;height:40px!important;min-width:40px!important;padding:0!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:14px!important;background:#16161c!important;color:#fff!important;display:grid!important;place-items:center!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
body > #transactionsSheet .deposit-close svg,#transactionsSheet .deposit-close svg{width:19px!important;height:19px!important;display:block!important}
body > #transactionsSheet .deposit-copy,#transactionsSheet .deposit-copy{margin:8px auto 14px!important;max-width:330px!important;text-align:center!important;color:rgba(255,255,255,.66)!important;font-size:15px!important;line-height:1.4!important;font-weight:680!important;letter-spacing:-.025em!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important}
body > #transactionsSheet .transactions-list,#transactionsSheet .transactions-list{display:grid!important;gap:8px!important;max-height:390px!important;overflow:auto!important;padding:2px 2px 4px!important;scrollbar-width:none!important;opacity:0;animation:depositItemIn .42s cubic-bezier(.18,.88,.22,1.08) .29s forwards!important}
body > #transactionsSheet .transactions-list::-webkit-scrollbar,#transactionsSheet .transactions-list::-webkit-scrollbar{display:none!important}
body > #transactionsSheet .transaction-row,#transactionsSheet .transaction-row{display:grid!important;grid-template-columns:40px minmax(0,1fr) auto!important;gap:10px!important;align-items:center!important;border:1px solid rgba(255,255,255,.06)!important;border-radius:17px!important;background:#141419!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;padding:11px 11px!important;animation:depositItemIn .36s ease both!important}
body > #transactionsSheet .transaction-icon,#transactionsSheet .transaction-icon{width:40px!important;height:40px!important;border-radius:14px!important;display:grid!important;place-items:center!important;color:#fff!important;background:rgba(255,255,255,.04)!important}
body > #transactionsSheet .transaction-icon svg,#transactionsSheet .transaction-icon svg{width:22px!important;height:22px!important}
body > #transactionsSheet .transaction-icon.in,#transactionsSheet .transaction-icon.in{color:#42f594!important}
body > #transactionsSheet .transaction-icon.out,#transactionsSheet .transaction-icon.out{color:#ffcf6b!important}
body > #transactionsSheet .transaction-main,#transactionsSheet .transaction-main{min-width:0!important}
body > #transactionsSheet .transaction-main strong,#transactionsSheet .transaction-main strong{display:block!important;font-size:14px!important;font-weight:880!important;letter-spacing:-.025em!important;color:#fff!important}
body > #transactionsSheet .transaction-main span,#transactionsSheet .transaction-main span{display:block!important;margin-top:4px!important;font-size:10px!important;font-weight:680!important;color:rgba(255,255,255,.46)!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
body > #transactionsSheet .transaction-side,#transactionsSheet .transaction-side{text-align:right!important;white-space:nowrap!important}
body > #transactionsSheet .transaction-side b,#transactionsSheet .transaction-side b{display:block!important;font-size:13px!important;font-weight:880!important;color:#fff!important}
body > #transactionsSheet .transaction-side em,#transactionsSheet .transaction-side em{display:block!important;margin-top:5px!important;font-size:9px!important;font-style:normal!important;font-weight:820!important;text-transform:uppercase!important;letter-spacing:.04em!important;color:rgba(255,255,255,.52)!important}
body > #transactionsSheet .transaction-side em.completed,#transactionsSheet .transaction-side em.completed{color:#42f594!important}
body > #transactionsSheet .transaction-side em.pending,#transactionsSheet .transaction-side em.pending{color:#ffcf6b!important}
body > #transactionsSheet .transactions-empty,#transactionsSheet .transactions-empty{text-align:center!important;color:rgba(255,255,255,.58)!important;font-size:13px!important;font-weight:720!important;padding:24px 8px!important;border:1px solid rgba(255,255,255,.06)!important;border-radius:17px!important;background:#141419!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
`;

const TON_WALLET_DEPOSIT_SCRIPT = `
(function(){
  var MIN_TON_DEPOSIT=1;
  var TON_MAINNET='-239';
  var TONCONNECT_SOURCES=['https://cdn.jsdelivr.net/npm/@tonconnect/ui@3.0.2/dist/tonconnect-ui.min.js','https://unpkg.com/@tonconnect/ui@3.0.2/dist/tonconnect-ui.min.js'];
  var tonConnectUi=null;
  var tonConnectReady=null;
  var paying=false;
  var verifying=false;
  var depositMode='stars';
  var loadingTonUsd=false;
  var starsGramPerStar=0;
  var starsGramRateLoadedAt=0;
  var starsGramRatePromise=null;
  var lastPendingCheckAt=0;
  var paymentDonePending=false;
  var paymentDoneDelay=0;
  var financeCopyLang='en';
  var financeCopyRequest=null;
  var tonFlowActive=false;
  var tonConnectionReady=false;
  var tonBridgeSessionVerified=false;
  var TON_VERIFIED_SESSION_KEY='vexa:verified-ton-wallet-session';
  var tonStatusBound=false;
  var tonConnectRequest=0;
  var tg=window.Telegram&&window.Telegram.WebApp;

  function q(id){return document.getElementById(id)}
  function toast(text){var n=q('toast');if(!n)return;n.textContent=text;n.style.display='block';setTimeout(function(){n.style.display='none'},2600)}
  function ownerId(){return String((tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user&&tg.initDataUnsafe.user.id)||localStorage.getItem('ownerId')||'')}
  function telegramInitData(){return String(tg&&tg.initData||'').trim()}
  function walletAccount(ui){var account=ui&&ui.account;return account&&account.address?account:null}
  function usableWalletConnection(ui){return !!(ui&&ui.connected&&ui.wallet&&walletAccount(ui))}
  function isHttpWalletConnection(ui){return !!(usableWalletConnection(ui)&&String(ui.wallet.provider||'').toLowerCase()==='http')}
  function verifiedWalletConnection(ui){return !!(usableWalletConnection(ui)&&(!isHttpWalletConnection(ui)||tonBridgeSessionVerified))}
  function forgetVerifiedWalletSession(){tonBridgeSessionVerified=false;try{localStorage.removeItem(TON_VERIFIED_SESSION_KEY)}catch(e){}}
  function readVerifiedWalletSession(){try{var raw=localStorage.getItem(TON_VERIFIED_SESSION_KEY);var item=raw?JSON.parse(raw):null;return item&&item.sessionId&&item.address&&item.userId?item:null}catch(e){forgetVerifiedWalletSession();return null}}
  async function tonWalletSessionId(ui){var connector=ui&&ui.connector;if(!connector||typeof connector.getSessionId!=='function')return '';try{return String(await connector.getSessionId()||'').trim()}catch(e){return ''}}
  async function rememberVerifiedWalletSession(ui){if(!usableWalletConnection(ui))return false;tonBridgeSessionVerified=true;if(!isHttpWalletConnection(ui))return true;var sessionId=await tonWalletSessionId(ui);var account=walletAccount(ui);var userId=ownerId();if(sessionId&&account&&userId){try{localStorage.setItem(TON_VERIFIED_SESSION_KEY,JSON.stringify({sessionId:sessionId,address:String(account.address),userId:userId}))}catch(e){}}return true}
  async function restoreVerifiedWalletSession(ui){tonBridgeSessionVerified=false;if(!usableWalletConnection(ui))return false;if(!isHttpWalletConnection(ui))return true;var saved=readVerifiedWalletSession();var sessionId=await tonWalletSessionId(ui);var account=walletAccount(ui);var userId=ownerId();tonBridgeSessionVerified=!!(saved&&sessionId&&account&&userId&&String(saved.sessionId)===sessionId&&String(saved.address)===String(account.address)&&String(saved.userId)===userId);return tonBridgeSessionVerified}
  function isUnknownAppError(error){var code=Number(error&&error.code);var name=String(error&&error.name||'');var message=String(error&&error.message||'');return code===100||/UNKNOWN_APP_ERROR|unknown app|session.*(?:expired|revoked|unknown)/i.test(name+' '+message)}
  async function clearStaleWalletSession(ui){forgetVerifiedWalletSession();if(!ui||!ui.connected||typeof ui.disconnect!=='function')return;try{await ui.disconnect()}catch(e){}}
  function mainnetWalletAccount(ui){if(!usableWalletConnection(ui))return null;var account=walletAccount(ui);if(String(account.chain||'')!==TON_MAINNET)throw new Error('Switch your wallet to TON Mainnet');return account}
  function walletAddressForApi(account){var raw=String(account&&account.address||'').trim();if(!raw)return '';try{var convert=window.TON_CONNECT_UI&&window.TON_CONNECT_UI.toUserFriendlyAddress;return typeof convert==='function'?convert(raw,false):raw}catch(e){return raw}}
  function supportedLang(lang){lang=String(lang||'').trim().toLowerCase().split('-')[0];return ['fa','de','tr','ar','ru','uk','es','pt','id','zh','ja','ko','en'].indexOf(lang)>=0?lang:'en'}
  function isRtlLang(lang){return ['fa','ar'].indexOf(supportedLang(lang))>=0}
  var financeCopy={
    deposit:{en:'Your balance will be charged as TON after Telegram confirms the payment',fa:'پس از تأیید پرداخت در تلگرام، موجودی شما شارژ می‌شود.',de:'Dein Guthaben wird nach der Bestätigung durch Telegram gutgeschrieben.',tr:'Telegram ödemeyi onayladıktan sonra bakiyen yüklenecek.',ar:'بعد تأكيد الدفع في تيليجرام، سيتم شحن رصيدك.',ru:'Ваш баланс будет пополнен после подтверждения платежа Telegram.',uk:'Ваш баланс буде поповнено після підтвердження платежу Telegram.',es:'Tu saldo se cargará después de que Telegram confirme el pago.',pt:'Seu saldo será creditado após o Telegram confirmar o pagamento.',id:'Saldo kamu akan terisi setelah Telegram mengonfirmasi pembayaran.',zh:'Telegram 确认付款后、余额将自动充值。',ja:'Telegram の確認後、残高に反映されます。',ko:'Telegram 확인 후 잔액이 충전됩니다.'},
    withdraw:{en:'Enter your Gram wallet and withdrawal amount',fa:'آدرس کیف پول و مبلغ برداشت را وارد کنید.',de:'Gib deine Wallet-Adresse und den Auszahlungsbetrag ein.',tr:'Cüzdan adresini ve çekmek istediğin miktarı gir.',ar:'أدخل عنوان المحفظة ومبلغ السحب.',ru:'Введите адрес кошелька и сумму вывода.',uk:'Введіть адресу гаманця та суму виведення.',es:'Ingresa la dirección de tu wallet y el monto a retirar.',pt:'Insira o endereço da carteira e o valor que deseja sacar.',id:'Masukkan alamat wallet dan jumlah yang ingin kamu tarik.',zh:'输入钱包地址和提现金额。',ja:'ウォレットアドレスと出金額を入力してください。',ko:'지갑 주소와 출금할 금액을 입력하세요.'}
  };
  function applyTextDirection(node,lang){if(!node)return;lang=supportedLang(lang);node.setAttribute('lang',lang);node.setAttribute('dir',isRtlLang(lang)?'rtl':'ltr')}
  function applyWithdrawGramLabels(){var sheet=q('withdrawSheet');if(!sheet)return;var title=sheet.querySelector('.deposit-title-main h3,.deposit-title h3,h3');if(title)title.textContent=String(title.textContent||'').replace(/\\bTON\\b/g,'Gram');Array.prototype.forEach.call(sheet.querySelectorAll('label'),function(label){label.textContent=String(label.textContent||'').replace(/\\bTON\\b/g,'Gram')});Array.prototype.forEach.call(sheet.querySelectorAll('input'),function(input){if(input.placeholder)input.placeholder=String(input.placeholder).replace(/\\bTON\\b/g,'Gram')})}
  function setFinanceCopy(){var dep=document.querySelector('#depositSheet .deposit-copy:not(.transactions-copy):not(.deposit-method-copy)');var wit=document.querySelector('#withdrawSheet .deposit-copy');var lang=supportedLang(financeCopyLang);if(dep){dep.textContent=(financeCopy.deposit[lang]||financeCopy.deposit.en);applyTextDirection(dep,lang)}if(wit){wit.textContent=(financeCopy.withdraw[lang]||financeCopy.withdraw.en);applyTextDirection(wit,lang)}applyWithdrawGramLabels()}
  function loadFinanceCopy(){setFinanceCopy()}
  function setStatus(text,kind){var n=q('tonWalletDepositStatus');if(!n)return;n.textContent=text||'';n.classList.toggle('success',kind==='success');n.classList.toggle('error',kind==='error');n.classList.toggle('pending',kind==='pending')}
  function normalizeNumber(value){var text=String(value==null?'':value).trim();var fa='۰۱۲۳۴۵۶۷۸۹';var ar='٠١٢٣٤٥٦٧٨٩';text=text.replace(/[۰-۹]/g,function(d){return String(fa.indexOf(d))}).replace(/[٠-٩]/g,function(d){return String(ar.indexOf(d))});text=text.replace(/[٫٬،，,]/g,'.').replace(/[\\u200e\\u200f\\u202a-\\u202e\\s]/g,'').replace(/[^0-9.]/g,'');var first=text.indexOf('.');if(first!==-1)text=text.slice(0,first+1)+text.slice(first+1).replace(/\\./g,'');if(text.indexOf('.')===0)text='0'+text;return text}
  function parseTon(value){var raw=normalizeNumber(value);if(!raw||raw==='.')return 0;var n=Number(raw);return Number.isFinite(n)&&n>0?n:0}
  function twoDecimalText(value){var raw=normalizeNumber(value);var parts=raw.split('.');var text=parts.length>1?parts[0]+'.'+parts[1].slice(0,2):raw;var n=Number(text);return Number.isFinite(n)&&n>0?n.toFixed(2):'0.00'}
  function formatGramNano(nano){var raw=Math.max(0,Math.floor(Number(nano)||0));return (raw/1000000000).toFixed(2)+' Gram'}
  function starsEquivalent(stars){stars=Math.max(0,Math.floor(Number(stars)||0));if(!stars)return '≈ 0.00 Gram';if(!starsGramPerStar){loadStarsGramRate();return '≈ … Gram'}return '≈ '+formatGramNano(Math.floor(stars*starsGramPerStar*1000000000))}
  function loadStarsGramRate(force){var now=Date.now();if(!force&&starsGramPerStar&&now-starsGramRateLoadedAt<60000)return Promise.resolve(starsGramPerStar);if(starsGramRatePromise)return starsGramRatePromise;starsGramRatePromise=fetch('/app/api/stars/deposits',{headers:{accept:'application/json'},cache:'no-store'}).then(function(r){return r.json().then(function(data){if(!r.ok)throw new Error(data&&data.error||'Stars rate request failed');return data})}).then(function(data){var rate=data&&data.rate;var value=Number(rate&&rate.gramPerStar);if(!Number.isFinite(value)||value<=0)throw new Error('Invalid Stars rate');starsGramPerStar=value;starsGramRateLoadedAt=Date.now();syncModeUi();return value}).catch(function(){var out=q('starsTonEquivalent');if(out&&!starsGramPerStar&&depositMode==='stars')out.textContent='Rate unavailable';return starsGramPerStar||0}).finally(function(){starsGramRatePromise=null});return starsGramRatePromise}
  window.VexaStarsGramRate={format:starsEquivalent,formatNano:formatGramNano,load:loadStarsGramRate};
  async function api(path,payload){var r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload||{})});var j=await r.json().catch(function(){return{error:'Invalid response'}});if(!r.ok)throw new Error(j.error||'Request failed');return j}
  function savePending(deposit){try{localStorage.setItem('vexa:pending-ton-wallet-deposit',JSON.stringify({id:deposit.id,userId:ownerId(),amountTon:deposit.amountTon,amountNano:deposit.amountNano,wallet:deposit.wallet,status:deposit.status,createdAt:Date.now()}))}catch(e){}}
  function clearPending(){try{localStorage.removeItem('vexa:pending-ton-wallet-deposit')}catch(e){}}
  function pendingDepositId(){try{var raw=localStorage.getItem('vexa:pending-ton-wallet-deposit');var item=raw?JSON.parse(raw):null;var current=ownerId();if(!item||!item.id||!current||String(item.userId||'')!==String(current)){if(item&&item.id)clearPending();return ''}return String(item.id)}catch(e){clearPending();return ''}}

  function installDoneOverlayStyle(){var style=q('vexa-payment-done-style');if(!style){style=document.createElement('style');style.id='vexa-payment-done-style';document.head.appendChild(style)}style.textContent='.vexa-payment-done{position:fixed!important;inset:0!important;z-index:2147483000!important;display:grid!important;place-items:center!important;pointer-events:none!important;opacity:0!important;transition:opacity .24s ease!important}.vexa-payment-done.show{opacity:1!important}.vexa-payment-done-check{display:block!important;width:78px!important;height:78px!important;overflow:visible!important;opacity:0!important;transform:translateY(8px) scale(.72)!important}.vexa-payment-done.show .vexa-payment-done-check{animation:vexaDoneEnter .58s cubic-bezier(.16,1,.3,1) both!important}.vexa-payment-done-check path{fill:none!important;stroke:#58d68d!important;stroke-width:5!important;stroke-linecap:round!important;stroke-linejoin:round!important;stroke-dasharray:64!important;stroke-dashoffset:64!important}.vexa-payment-done.show .vexa-payment-done-check path{animation:vexaDoneDraw .48s cubic-bezier(.22,.78,.26,1) .14s forwards!important}@keyframes vexaDoneEnter{0%{opacity:0;transform:translateY(8px) scale(.72)}64%{opacity:1;transform:translateY(0) scale(1.06)}100%{opacity:1;transform:translateY(0) scale(1)}}@keyframes vexaDoneDraw{to{stroke-dashoffset:0}}@media (prefers-reduced-motion:reduce){.vexa-payment-done{transition-duration:.01ms!important}.vexa-payment-done.show .vexa-payment-done-check,.vexa-payment-done.show .vexa-payment-done-check path{animation-duration:.01ms!important;animation-delay:0ms!important}}'}
  function renderPaymentDone(){installDoneOverlayStyle();var old=q('vexaPaymentDone');if(old)old.remove();var overlay=document.createElement('div');overlay.id='vexaPaymentDone';overlay.className='vexa-payment-done';overlay.setAttribute('aria-hidden','true');overlay.innerHTML='<svg class="vexa-payment-done-check" viewBox="0 0 52 52" fill="none" stroke="#58d68d" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 27L22 37L41 15"/></svg>';document.body.appendChild(overlay);overlay.getBoundingClientRect();overlay.classList.add('show');setTimeout(function(){overlay.classList.remove('show')},1850);setTimeout(function(){try{overlay.remove()}catch(e){}},2300)}
  function flushPaymentDone(){if(!paymentDonePending||document.hidden)return;paymentDonePending=false;if(paymentDoneDelay){clearTimeout(paymentDoneDelay);paymentDoneDelay=0}renderPaymentDone()}
  function showPaymentDone(){paymentDonePending=true;if(paymentDoneDelay)clearTimeout(paymentDoneDelay);paymentDoneDelay=setTimeout(flushPaymentDone,500)}
  window.VexaShowPaymentDone=showPaymentDone;

  function ensureTonConnectRoot(){var root=q('vexaTonConnectRoot');if(!root){root=document.createElement('div');root.id='vexaTonConnectRoot';document.body.appendChild(root)}root.style.position='relative';root.style.zIndex='2147482500';return root}
  function applyTonConnectDarkTheme(){if(!tonConnectUi)return;try{tonConnectUi.uiOptions={uiPreferences:{theme:'DARK'}}}catch(e){}}
  function loadTonConnectScript(index){if(window.TON_CONNECT_UI&&window.TON_CONNECT_UI.TonConnectUI)return Promise.resolve(true);if(index>=TONCONNECT_SOURCES.length)return Promise.reject(new Error('Could not load TonConnect'));return new Promise(function(resolve,reject){var script=document.createElement('script');script.src=TONCONNECT_SOURCES[index];script.async=true;script.crossOrigin='anonymous';script.onload=function(){resolve(true)};script.onerror=function(){try{script.remove()}catch(e){};loadTonConnectScript(index+1).then(resolve).catch(reject)};document.head.appendChild(script)})}
  function loadTonConnect(){if(tonConnectUi){applyTonConnectDarkTheme();return Promise.resolve(tonConnectUi)};if(tonConnectReady)return tonConnectReady;tonConnectReady=new Promise(function(resolve,reject){function init(){try{var root=ensureTonConnectRoot();tonConnectUi=new window.TON_CONNECT_UI.TonConnectUI({manifestUrl:window.location.origin+'/tonconnect-manifest.json',widgetRootId:root.id,uiPreferences:{theme:'DARK'}});applyTonConnectDarkTheme();resolve(tonConnectUi)}catch(e){tonConnectReady=null;reject(e)}}if(window.TON_CONNECT_UI&&window.TON_CONNECT_UI.TonConnectUI){init();return}loadTonConnectScript(0).then(init).catch(function(error){tonConnectReady=null;reject(error)})});return tonConnectReady}
  async function waitForTonConnectionRestore(ui){var restored=ui&&ui.connectionRestored;if(restored&&typeof restored.then==='function')await restored;return restoreVerifiedWalletSession(ui)}
  function waitForWalletConnection(ui){if(verifiedWalletConnection(ui))return Promise.resolve(true);return new Promise(function(resolve,reject){var done=false;var unsubStatus=null;var unsubModal=null;var timer=setTimeout(function(){finish(false,'Wallet connection timed out')},90000);function cleanup(){clearTimeout(timer);try{if(unsubStatus)unsubStatus()}catch(e){}try{if(unsubModal)unsubModal()}catch(e){}}function finish(ok,message){if(done)return;done=true;cleanup();ok?resolve(true):reject(new Error(message||'Wallet is not connected'))}try{if(ui&&ui.onStatusChange){unsubStatus=ui.onStatusChange(function(wallet){if(wallet&&usableWalletConnection(ui)){rememberVerifiedWalletSession(ui).then(function(){finish(true)})}})}}catch(e){}try{if(ui&&ui.onModalStateChange){unsubModal=ui.onModalStateChange(function(state){var status=String((state&&state.status)||'').toLowerCase();if((status==='closed'||status==='close')&&!verifiedWalletConnection(ui))finish(false,'Wallet selection cancelled')})}}catch(e){}})}
  function closeTonConnectModal(){try{if(tonConnectUi&&typeof tonConnectUi.closeModal==='function')tonConnectUi.closeModal()}catch(e){}}
  function syncTonConnectionUi(ui){if(!tonFlowActive)return false;if(!verifiedWalletConnection(ui)){showTonConnectGate(false,'');return false}try{mainnetWalletAccount(ui);showTonPaymentForm();return true}catch(error){showTonConnectGate(false,error&&error.message?error.message:'Switch your wallet to TON Mainnet');return false}}
  function bindTonStatus(ui){if(tonStatusBound||!ui||typeof ui.onStatusChange!=='function')return;tonStatusBound=true;ui.onStatusChange(function(wallet){if(!wallet)forgetVerifiedWalletSession();if(!tonConnectionReady||!tonFlowActive)return;syncTonConnectionUi(ui)},function(error){if(!tonConnectionReady||!tonFlowActive)return;if(isUnknownAppError(error)){clearStaleWalletSession(ui).then(function(){showTonConnectGate(false,'Wallet session expired. Connect again.')});return}showTonConnectGate(false,error&&error.message?error.message:'Wallet connection failed')})}

  function readTonUsd(){var source=window.VexaTonUsdPrice;var n=Number(source&&typeof source.read==='function'?source.read():0);return Number.isFinite(n)&&n>0?n:0}
  async function loadTonUsd(){if(loadingTonUsd)return;loadingTonUsd=true;try{var source=window.VexaTonUsdPrice;var value=source&&typeof source.load==='function'?await source.load():0;if(value)syncModeUi()}catch(e){}loadingTonUsd=false}
  function starsInput(){return q('starsAmountSheet')}
  function tonInput(){return q('tonAmountSheet')}
  function ensureTonInput(){var stars=starsInput();if(!stars)return null;var ton=tonInput();if(!ton){ton=document.createElement('input');ton.id='tonAmountSheet';ton.type='text';ton.inputMode='decimal';ton.setAttribute('inputmode','decimal');ton.setAttribute('autocomplete','off');ton.setAttribute('autocorrect','off');ton.placeholder='TON amount';ton.value=String(MIN_TON_DEPOSIT);ton.style.display='none';stars.insertAdjacentElement('afterend',ton)}return ton}
  function currentTonText(){var input=ensureTonInput();return normalizeNumber(input&&input.value)}
  function setDepositNav(back){var button=document.querySelector('#depositSheet .deposit-close');if(!button)return;button.setAttribute('data-action',back?'back-to-deposit-methods':'close-deposit');button.setAttribute('aria-label',back?'Back':'Close');button.innerHTML=back?'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13.75 5.75L7.5 12l6.25 6.25M8 12h9.5" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>':'<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>'}
  function setMode(mode){depositMode=mode==='ton'?'ton':'stars';var stars=starsInput();var ton=ensureTonInput();var label=document.querySelector('#depositSheet .deposit-custom-field label');var pay=q('depositMainPayButton')||document.querySelector('#depositSheet [data-action="deposit-custom-stars-sheet"],#depositSheet [data-action="confirm-ton-payment"]');if(label)label.textContent=depositMode==='ton'?'TON Amount':'Custom Stars Amount';if(stars)stars.style.display=depositMode==='ton'?'none':'';if(ton){ton.style.display=depositMode==='ton'?'':'none';if(depositMode==='ton'&&!normalizeNumber(ton.value))ton.value=String(MIN_TON_DEPOSIT)}if(pay){pay.textContent=depositMode==='ton'?'Pay With TON':'Pay With Stars';pay.setAttribute('data-action',depositMode==='ton'?'confirm-ton-payment':'deposit-custom-stars-sheet');pay.classList.toggle('ton-mode',depositMode==='ton')}var sheet=q('depositSheet');if(sheet)sheet.classList.toggle('deposit-ton-mode',depositMode==='ton');syncModeUi();if(depositMode==='ton')loadTonUsd();else loadStarsGramRate()}
  function ensureTonConnectGate(){var gate=q('tonWalletConnectGate');if(gate)return gate;var sheet=q('depositSheet');var field=sheet&&sheet.querySelector('.deposit-custom-field');if(!sheet||!field||!field.parentNode)return null;gate=document.createElement('div');gate.id='tonWalletConnectGate';gate.className='ton-wallet-connect-gate';gate.innerHTML='<div class="ton-connect-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M5.5 8.25A2.75 2.75 0 0 1 8.25 5.5h8.5A2.75 2.75 0 0 1 19.5 8.25v7.5a2.75 2.75 0 0 1-2.75 2.75h-8.5a2.75 2.75 0 0 1-2.75-2.75v-7.5Z" stroke="currentColor" stroke-width="1.65"/><path d="M15.25 10.25H20v3.5h-4.75a1.75 1.75 0 1 1 0-3.5Z" stroke="currentColor" stroke-width="1.65" stroke-linejoin="round"/><circle cx="15.55" cy="12" r=".62" fill="currentColor"/></svg></div><strong>Connect your wallet</strong><span>Connect a wallet to continue with this payment</span><button class="primary ton-connect-button" type="button" data-action="connect-ton-wallet">Connect Wallet</button><p id="tonWalletConnectStatus" class="ton-connect-status"></p>';field.parentNode.insertBefore(gate,field);return gate}
  function setTonConnectButton(loading,label){var button=document.querySelector('#tonWalletConnectGate [data-action="connect-ton-wallet"]');if(!button)return;button.disabled=!!loading;button.textContent=label||(loading?'Checking Wallet…':'Connect Wallet')}
  function showTonConnectGate(loading,message){var gate=ensureTonConnectGate();var sheet=q('depositSheet');if(!gate||!sheet)return;sheet.classList.add('deposit-ton-connect-required');setTonConnectButton(loading,loading?'Checking Wallet…':'Connect Wallet');var status=q('tonWalletConnectStatus');if(status)status.textContent=message||''}
  function hideTonConnectGate(){var sheet=q('depositSheet');if(sheet)sheet.classList.remove('deposit-ton-connect-required');var status=q('tonWalletConnectStatus');if(status)status.textContent='';setTonConnectButton(false,'Connect Wallet')}
  function showTonPaymentForm(){if(!tonFlowActive)return;setMode('ton');hideTonConnectGate();setDepositNav(true)}
  function leaveTonFlow(){tonFlowActive=false;tonConnectRequest++;hideTonConnectGate();closeTonConnectModal()}
  async function prepareTonEntry(){var request=++tonConnectRequest;try{var ui=await loadTonConnect();bindTonStatus(ui);var restored=await waitForTonConnectionRestore(ui);if(request!==tonConnectRequest||!tonFlowActive)return;tonConnectionReady=true;if(!restored){showTonConnectGate(false,'');return}syncTonConnectionUi(ui)}catch(error){if(request!==tonConnectRequest||!tonFlowActive)return;showTonConnectGate(false,error&&error.message?error.message:'Could not load wallet connection')}}
  async function connectTonWallet(){if(!tonFlowActive)return;var request=++tonConnectRequest;showTonConnectGate(true,'');setTonConnectButton(true,'Opening Wallets…');try{var ui=await loadTonConnect();bindTonStatus(ui);var restored=await waitForTonConnectionRestore(ui);if(request!==tonConnectRequest||!tonFlowActive)return;tonConnectionReady=true;if(restored&&verifiedWalletConnection(ui)){syncTonConnectionUi(ui);return}if(isHttpWalletConnection(ui)){setTonConnectButton(true,'Refreshing Session…');await clearStaleWalletSession(ui);if(request!==tonConnectRequest||!tonFlowActive)return}setTonConnectButton(true,'Choose Wallet…');var wait=waitForWalletConnection(ui);await ui.openModal();await wait;if(request!==tonConnectRequest||!tonFlowActive)return;syncTonConnectionUi(ui)}catch(error){if(request!==tonConnectRequest||!tonFlowActive)return;var text=error&&error.message&&error.message!=='Wallet selection cancelled'?error.message:'';showTonConnectGate(false,text)}}
  function syncModeUi(){var out=q('starsTonEquivalent');if(!out)return;if(depositMode==='ton'){var amount=parseTon(currentTonText());var price=readTonUsd();if(!price&&amount)loadTonUsd();var usd=price&&amount?amount*price:0;out.textContent=price?'≈ $'+usd.toFixed(2):(amount?'≈ …':'≈ $0.00');out.classList.add('usd-mode')}else{var s=starsInput();var stars=Math.max(0,Math.floor(Number(normalizeNumber(s&&s.value))||0));out.textContent=starsEquivalent(stars);out.classList.remove('usd-mode')}}
  async function createDeposit(amount,account){var initData=telegramInitData();if(!initData)throw new Error('Open the Mini App inside Telegram');var walletAddress=walletAddressForApi(account);if(!walletAddress)throw new Error('Connected wallet address is missing');return api('/app/api/ton/deposits',{initData:initData,amountTon:twoDecimalText(amount),walletAddress:walletAddress})}
  async function verifyDeposit(id){if(!id||verifying)return;var initData=telegramInitData();if(!initData){setStatus('Open the Mini App inside Telegram','error');return}verifying=true;try{var result=await api('/app/api/ton/deposits/'+encodeURIComponent(id)+'/verify',{initData:initData});if(result&&result.status==='completed'){clearPending();setStatus('Payment received. Balance updated.','success');if(window.VexaTonBalance&&window.VexaTonBalance.load)window.VexaTonBalance.load()}else{savePending(result||{id:id});setStatus('Payment sent. Confirmation will refresh when you return to the app.','pending')}}catch(error){setStatus(error&&error.message?error.message:'Could not verify payment','error')}verifying=false}
  function verifyPendingDeposit(){var id=pendingDepositId(),now=Date.now();if(!id||verifying||now-lastPendingCheckAt<3000)return;lastPendingCheckAt=now;verifyDeposit(id)}
  async function confirmTonPayment(){if(paying)return;var ui,account;try{ui=await loadTonConnect();bindTonStatus(ui);var restored=await waitForTonConnectionRestore(ui);tonConnectionReady=true;if(!restored||!verifiedWalletConnection(ui)){tonFlowActive=true;showTonConnectGate(false,'Connect your wallet to continue');setDepositNav(true);return}account=mainnetWalletAccount(ui)}catch(error){tonFlowActive=true;showTonConnectGate(false,error&&error.message?error.message:'Could not load wallet connection');setDepositNav(true);return}if(!account){tonFlowActive=true;showTonConnectGate(false,'Connect your wallet to continue');setDepositNav(true);return}var input=ensureTonInput();var raw=twoDecimalText(input&&input.value);var amount=parseTon(raw);if(!amount){toast('Enter a valid TON amount');setStatus('Enter a valid TON amount','error');return}if(amount<MIN_TON_DEPOSIT){toast('Minimum deposit is '+MIN_TON_DEPOSIT+' TON');setStatus('Minimum deposit is '+MIN_TON_DEPOSIT+' TON','error');return}if(input)input.value=raw;paying=true;try{setStatus('Preparing payment…','pending');var deposit=await createDeposit(raw,account);var depositId=String(deposit&&deposit.id||'').trim();var nano=String(deposit&&deposit.amountNano||'').trim();var wallet=String(deposit&&deposit.wallet||'').trim();var payload=String(deposit&&deposit.payload||'').trim();if(!depositId||!/^[0-9]+$/.test(nano)||!wallet||!payload)throw new Error('Invalid payment request');savePending(deposit);await ui.sendTransaction({validUntil:Math.floor(Date.now()/1000)+300,network:TON_MAINNET,from:String(account.address),messages:[{address:wallet,amount:nano,payload:payload}]});showPaymentDone();setStatus('Payment sent. Checking confirmation…','pending');await verifyDeposit(depositId)}catch(error){if(isUnknownAppError(error)){await clearStaleWalletSession(ui);tonFlowActive=true;showTonConnectGate(false,'Wallet session expired. Connect again.');setDepositNav(true)}else{setStatus(error&&error.message?error.message:'Payment cancelled or failed','error');toast(error&&error.message?error.message:'Payment cancelled or failed')}}paying=false}

  function installStyles(){if(q('vexa-ton-wallet-deposit-style'))return;var style=document.createElement('style');style.id='vexa-ton-wallet-deposit-style';style.textContent='#depositSheet .deposit-action-row{width:min(100%,340px)!important;margin:0 auto 18px!important;display:grid!important;grid-template-columns:1fr!important;gap:0!important;align-items:center!important}#depositSheet .deposit-action-row .deposit-pay-button{width:100%!important;margin:0!important;height:46px!important;border-radius:16px!important;background:#482432!important;transition:background .22s ease,transform .22s ease,opacity .22s ease!important}#depositSheet .deposit-action-row .deposit-pay-button.ton-mode{background:#482432!important}#depositSheet .deposit-action-row .deposit-pay-button:active{background:#57303f!important;transform:scale(.992)!important}#tonAmountSheet{height:100%!important;width:100%!important;min-width:0!important;background:transparent!important;border:0!important;color:#fff!important;font:inherit!important;font-size:20px!important;font-weight:850!important;outline:0!important;padding:0!important}.ton-wallet-status{min-height:17px!important;margin:8px 0 0!important;text-align:center!important;color:rgba(255,255,255,.58)!important;font-size:11px!important;font-weight:730!important;line-height:1.35!important}.ton-wallet-status.success{color:#42f594!important}.ton-wallet-status.error{color:#ff7b9a!important}.ton-wallet-status.pending{color:#ffcf6b!important}#tonWalletConnectGate{display:none!important;width:min(100%,340px)!important;margin:30px auto 0!important;text-align:center!important;justify-items:center!important}#depositSheet.deposit-ton-connect-required #tonWalletConnectGate{display:grid!important;gap:10px!important}#depositSheet.deposit-ton-connect-required .deposit-copy:not(.deposit-method-copy),#depositSheet.deposit-ton-connect-required .deposit-custom-field,#depositSheet.deposit-ton-connect-required .deposit-action-row,#depositSheet.deposit-ton-connect-required #depositMainPayButton,#depositSheet.deposit-ton-connect-required .ton-wallet-status,#depositSheet.deposit-ton-connect-required .deposit-status-inline,#depositSheet.deposit-ton-connect-required .deposit-stars-logo{display:none!important}.ton-connect-icon{width:56px!important;height:56px!important;border-radius:18px!important;display:grid!important;place-items:center!important;color:#fff!important;background:#141419!important;border:1px solid rgba(255,255,255,.06)!important;box-shadow:none!important}.ton-connect-icon svg{width:28px!important;height:28px!important}.ton-wallet-connect-gate strong{font-size:18px!important;font-weight:900!important;letter-spacing:-.03em!important;color:#fff!important}.ton-wallet-connect-gate>span{max-width:300px!important;color:rgba(255,255,255,.56)!important;font-size:12px!important;font-weight:700!important;line-height:1.35!important}.ton-connect-button{width:100%!important;height:46px!important;margin:8px 0 0!important;border:0!important;border-radius:16px!important;background:#482432!important;color:#fff!important;font-size:13px!important;font-weight:900!important}.ton-connect-button:active{background:#57303f!important}.ton-connect-button:disabled{opacity:.58!important}.ton-connect-status{min-height:17px!important;margin:0!important;color:rgba(255,255,255,.56)!important;font-size:11px!important;font-weight:720!important;line-height:1.35!important}';document.head.appendChild(style)}
  function ensureUi(){installStyles();installDoneOverlayStyle();ensureTonInput();ensureTonConnectGate();setFinanceCopy();var pay=document.querySelector('#depositSheet [data-action="deposit-custom-stars-sheet"],#depositSheet [data-action="confirm-ton-payment"]');if(!pay)return;pay.id='depositMainPayButton';var old=q('tonWalletDepositBox');if(old)old.remove();var legacy=q('depositPaymentModeSwitch');if(legacy)legacy.remove();var row=pay.closest&&pay.closest('.deposit-action-row');if(!row){row=document.createElement('div');row.className='deposit-action-row';pay.parentNode.insertBefore(row,pay);row.appendChild(pay)}if(!q('tonWalletDepositStatus'))row.insertAdjacentHTML('afterend','<p id="tonWalletDepositStatus" class="ton-wallet-status"></p>');setMode(depositMode)}
  function selectDepositMethod(mode){ensureUi();setDepositNav(true);if(mode!=='ton'){leaveTonFlow();setMode('stars');return}tonFlowActive=true;showTonConnectGate(true,'');setMode('ton');prepareTonEntry()}
  window.VexaDepositSelectMode=selectDepositMethod;
  function syncOnAppEvent(){flushPaymentDone();if(depositMode==='ton')loadTonUsd();else loadStarsGramRate();verifyPendingDeposit()}
  function bind(){ensureUi();loadFinanceCopy();setDepositNav(false);document.addEventListener('input',function(ev){if(ev.target&&['starsAmountSheet','tonAmountSheet'].indexOf(ev.target.id)!==-1)syncModeUi()});document.addEventListener('click',function(ev){var button=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!button)return;var action=button.getAttribute('data-action');if(action==='back-to-deposit-methods'){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation&&ev.stopImmediatePropagation();leaveTonFlow();setMode('stars');if(window.VexaShowDepositPicker)window.VexaShowDepositPicker();setDepositNav(false);return}if(action==='open-deposit'){leaveTonFlow();setDepositNav(false);loadFinanceCopy();setTimeout(ensureUi,40);verifyPendingDeposit();if(depositMode==='ton')loadTonUsd();else loadStarsGramRate()}if(action==='close-deposit'){leaveTonFlow();setDepositNav(false)}if(action==='open-withdraw'){leaveTonFlow();loadFinanceCopy()}if(action==='connect-ton-wallet'){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation&&ev.stopImmediatePropagation();connectTonWallet();return}if(action==='confirm-ton-payment'){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation&&ev.stopImmediatePropagation();confirmTonPayment()}},true);document.addEventListener('visibilitychange',function(){if(!document.hidden)syncOnAppEvent()});window.addEventListener('focus',syncOnAppEvent);window.addEventListener('online',syncOnAppEvent);if(tg&&typeof tg.onEvent==='function')tg.onEvent('activated',syncOnAppEvent);setTimeout(ensureUi,220);setTimeout(ensureUi,900)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
`;
const DEPOSIT_CORE_SCRIPT = `
(function(){
  var MIN_STARS_DEPOSIT=2;
  var tonUsd=0;
  var tonUsdPromise=null;
  var tg=window.Telegram&&window.Telegram.WebApp;
  function q(id){return document.getElementById(id)}
  function ensureWallet(){return q('wallet')||(window.VexaLazySections&&window.VexaLazySections.ensure&&window.VexaLazySections.ensure('wallet'),q('wallet'))}
  function closeWallet(){setDepositKeyboard(false);setSheet('withdrawSheet',false);setSheet('depositSheet',false);if(window.VexaTonUsdPrice&&typeof window.VexaTonUsdPrice.stop==='function')window.VexaTonUsdPrice.stop();var sheet=q('wallet');document.body.classList.remove('wallet-open');if(sheet){sheet.classList.remove('open');sheet.setAttribute('aria-hidden','true')}var back=tg&&tg.BackButton;try{back&&back.offClick&&back.offClick(closeWallet)}catch(e){}try{back&&back.hide&&back.hide()}catch(e){}}
  function openWallet(){var sheet=ensureWallet();if(!sheet)return;if(sheet.parentElement!==document.body)document.body.appendChild(sheet);document.body.classList.add('wallet-open');sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');setSheet('depositSheet',true);clearDepositStatus();updateEquivalent();if(window.VexaStarsGramRate&&typeof window.VexaStarsGramRate.load==='function')window.VexaStarsGramRate.load();if(window.VexaShowDepositPicker)window.VexaShowDepositPicker();var back=tg&&tg.BackButton;try{back&&back.offClick&&back.offClick(closeWallet)}catch(e){}try{back&&back.onClick&&back.onClick(closeWallet);back&&back.show&&back.show()}catch(e){}}
  function currentUserId(){return localStorage.getItem('ownerId')||String((tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user&&tg.initDataUnsafe.user.id)||'')}
  function escapeHtml(value){return String(value||'').replace(/[&<>'\\"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\\"':'&quot;'}[c]||c})}
  function toast(text){var n=q('toast');if(!n)return;n.textContent=text;n.style.display='block';setTimeout(function(){n.style.display='none'},2600)}
  function normalizeNumericText(value){var text=String(value==null?'':value).trim();var fa='۰۱۲۳۴۵۶۷۸۹';var ar='٠١٢٣٤٥٦٧٨٩';text=text.replace(/[۰-۹]/g,function(d){return String(fa.indexOf(d))}).replace(/[٠-٩]/g,function(d){return String(ar.indexOf(d))});text=text.replace(/[٫٬،，,]/g,'.').replace(/[\\u200e\\u200f\\u202a-\\u202e\\s]/g,'').replace(/[^0-9.]/g,'');var first=text.indexOf('.');if(first!==-1)text=text.slice(0,first+1)+text.slice(first+1).replace(/\\./g,'');return text}
  function starsAmount(value){return Math.max(0,Math.floor(Number(normalizeNumericText(value))||0))}
  function tonAmount(value){var raw=normalizeNumericText(value);if(!raw||raw==='.')return 0;var n=Number(raw);return Number.isFinite(n)&&n>0?n:0}
  function setUsdEquivalent(out,amount){if(!out)return;if(!tonUsd&&amount)loadTonUsd();out.textContent=(tonUsd&&amount)?'≈ $'+(amount*tonUsd).toFixed(2):(amount?'≈ …':'≈ $0.00')}
  function publishTonUsd(){updateWithdrawEquivalent();var out=q('starsTonEquivalent');var ton=q('tonAmountSheet');if(out&&ton&&ton.style.display!=='none')setUsdEquivalent(out,tonAmount(ton.value))}
  function stopTonUsd(){}
  function loadTonUsd(){if(tonUsdPromise)return tonUsdPromise;tonUsdPromise=fetch('https://api.binance.com/api/v3/ticker/price?symbol=GRAMUSDT',{cache:'no-store'}).then(function(r){if(!r.ok)throw new Error('Binance price request failed');return r.json()}).then(function(data){var value=Number(data&&data.price);if(!Number.isFinite(value)||value<=0)throw new Error('Invalid Binance TON price');tonUsd=value;publishTonUsd();return value}).catch(function(){return tonUsd||0}).finally(function(){tonUsdPromise=null});return tonUsdPromise}
  window.VexaTonUsdPrice={read:function(){return Number.isFinite(tonUsd)&&tonUsd>0?tonUsd:0},load:loadTonUsd,stop:stopTonUsd};
  function unitText(nano,unit){var raw=Math.max(0,Math.floor(Number(nano)||0));var whole=Math.floor(raw/1000000000);var frac=String(raw%1000000000).padStart(9,'0').replace(/0+$/,'');return (frac?whole+'.'+frac:String(whole))+' '+unit}
  function tonText(nano){return unitText(nano,'TON')}
  function gramText(nano){return unitText(nano,'Gram')}
  function dateText(value){try{return new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}catch(e){return String(value||'')}}
  async function api(path,payload){var r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload||{})});var j=await r.json().catch(function(){return{error:'Invalid response'}});if(!r.ok)throw new Error(j.error||'Request failed');return j}
  async function getJson(path){var initData=String(tg&&tg.initData||'').trim();var headers={'accept':'application/json'};if(initData)headers['x-telegram-init-data']=initData;var r=await fetch(path,{headers:headers,cache:'no-store'});var j=await r.json().catch(function(){return{error:'Invalid response'}});if(!r.ok)throw new Error(j.error||'Request failed');return j}
  function polishDepositFooter(){var sheet=q('depositSheet');if(!sheet)return;var old=sheet.querySelector('.deposit-stars-logo');if(old){old.innerHTML='<span class="deposit-powered-by">Powered by Vexa</span>';old.classList.add('deposit-powered-footer')}}
  function ensureDepositStatus(){var sheet=q('depositSheet');if(!sheet)return null;var status=q('depositStatus');if(status)return status;status=document.createElement('p');status.id='depositStatus';status.className='ton-wallet-status deposit-status-inline';var row=sheet.querySelector('.deposit-action-row');var pay=sheet.querySelector('#depositMainPayButton,.deposit-pay-button');var anchor=row||pay;if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(status,anchor.nextSibling);else{var pad=sheet.querySelector('.pad');if(pad)pad.appendChild(status)}return status}
  function setDepositStatus(text,kind){var n=ensureDepositStatus();if(!n)return;n.textContent=text||'';n.classList.toggle('success',kind==='success');n.classList.toggle('error',kind==='error');n.classList.toggle('pending',kind==='pending')}
  function clearDepositStatus(){setDepositStatus('','')}
  function installSheetFixStyles(){var style=q('vexa-deposit-withdraw-sheet-fix');if(!style){style=document.createElement('style');style.id='vexa-deposit-withdraw-sheet-fix';document.head.appendChild(style)}style.textContent='#depositSheet.deposit-sheet,#withdrawSheet.deposit-sheet,#transactionsSheet.deposit-sheet{position:fixed!important;left:0!important;right:0!important;top:0!important;bottom:auto!important;height:var(--vexa-finance-sheet-height,100vh)!important;min-height:var(--vexa-finance-sheet-height,100vh)!important;z-index:10080!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0 16px!important;box-sizing:border-box!important;pointer-events:none!important;opacity:0!important;visibility:hidden!important}#depositSheet.deposit-sheet.open,#withdrawSheet.deposit-sheet.open,#transactionsSheet.deposit-sheet.open{pointer-events:auto!important;opacity:1!important;visibility:visible!important}#depositSheet .deposit-backdrop,#withdrawSheet .deposit-backdrop,#transactionsSheet .deposit-backdrop{position:absolute!important;inset:0!important;background:rgba(0,0,0,.58)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;opacity:0!important;transition:opacity .30s ease!important}#depositSheet.open .deposit-backdrop,#withdrawSheet.open .deposit-backdrop,#transactionsSheet.open .deposit-backdrop{opacity:1!important}#depositSheet .deposit-panel,#withdrawSheet .deposit-panel,#transactionsSheet .deposit-panel{position:relative!important;left:auto!important;top:auto!important;right:auto!important;bottom:auto!important;z-index:2!important;width:min(calc(100vw - 32px),528px)!important;max-height:min(82vh,680px)!important;margin:auto!important;border-radius:28px!important;background:#0c0c10!important;border:1px solid rgba(255,255,255,.07)!important;outline:0!important;box-shadow:0 24px 64px rgba(0,0,0,.42)!important;overflow:auto!important;display:block!important;opacity:0!important;visibility:visible!important;transform:translateY(14px) scale(.96)!important;transform-origin:center center!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;transition:opacity .28s ease,transform .36s cubic-bezier(.16,1,.3,1)!important}#depositSheet.open .deposit-panel,#withdrawSheet.open .deposit-panel,#transactionsSheet.open .deposit-panel{opacity:1!important;transform:translateY(0) scale(1)!important}#depositSheet.closing .deposit-panel,#withdrawSheet.closing .deposit-panel,#transactionsSheet.closing .deposit-panel{opacity:0!important;transform:translateY(-10px) scale(.97)!important}#depositSheet .deposit-panel .pad,#withdrawSheet .deposit-panel .pad,#transactionsSheet .deposit-panel .pad{padding:18px!important;display:block!important}#depositSheet .deposit-title{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:14px!important;margin-bottom:12px!important}#depositSheet .deposit-close,#withdrawSheet .deposit-close{width:40px!important;height:40px!important;min-width:40px!important;border-radius:14px!important;background:#16161c!important;border:1px solid rgba(255,255,255,.07)!important;box-shadow:none!important;color:#fff!important;display:grid!important;place-items:center!important;padding:0!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}#depositSheet .deposit-close svg,#withdrawSheet .deposit-close svg{display:block!important;width:19px!important;height:19px!important;opacity:1!important;color:currentColor!important}#depositSheet .deposit-close svg path,#withdrawSheet .deposit-close svg path{stroke:currentColor!important;stroke-width:1.8!important}#depositSheet .deposit-close[data-action="back-to-deposit-methods"] svg{width:21px!important;height:21px!important}#depositSheet .deposit-close[data-action="back-to-deposit-methods"] svg path{stroke-width:1.8!important}#depositSheet .deposit-powered-footer{margin:18px 0 0!important;display:flex!important;align-items:center!important;justify-content:center!important;height:auto!important;color:rgba(255,255,255,.34)!important;text-transform:none!important;letter-spacing:.02em!important}#depositSheet .deposit-powered-footer svg{display:none!important}#depositSheet .deposit-powered-by{display:block!important;color:rgba(255,255,255,.34)!important;font-size:10.5px!important;font-weight:760!important;letter-spacing:.02em!important;text-transform:none!important}.deposit-status-inline{min-height:18px!important;margin:10px 0 0!important;text-align:center!important;color:rgba(255,255,255,.58)!important;font-size:11px!important;font-weight:720!important;line-height:1.35!important}.deposit-status-inline.error{color:#ff7b9a!important}.deposit-status-inline.success{color:#42f594!important}.deposit-status-inline.pending{color:#ffcf6b!important}body.deposit-open .tabs,body.withdraw-open .tabs,body.transactions-open .tabs{opacity:0!important;transform:translateY(80px)!important;pointer-events:none!important}';}
  function makeSheetsGlobal(){['depositSheet','withdrawSheet','transactionsSheet'].forEach(function(id){var sheet=q(id);if(sheet&&sheet.parentElement!==document.body)document.body.appendChild(sheet)})}
  function syncOpenState(){var deposit=q('depositSheet');var withdraw=q('withdrawSheet');var transactions=q('transactionsSheet');var anyOpen=!!((deposit&&deposit.classList.contains('open'))||(withdraw&&withdraw.classList.contains('open'))||(transactions&&transactions.classList.contains('open')));document.body.classList.toggle('deposit-open',!!(deposit&&deposit.classList.contains('open')));document.body.classList.toggle('withdraw-open',!!(withdraw&&withdraw.classList.contains('open')));document.body.classList.toggle('transactions-open',!!(transactions&&transactions.classList.contains('open')));if(!anyOpen)document.documentElement.style.removeProperty('--vexa-finance-sheet-height')}
  function lockFinanceSheetHeight(){if(!document.documentElement.style.getPropertyValue('--vexa-finance-sheet-height'))document.documentElement.style.setProperty('--vexa-finance-sheet-height',Math.max(window.innerHeight||0,document.documentElement.clientHeight||0)+'px')}
  function syncDepositKeyboardPosition(){var root=document.documentElement;var viewport=window.visualViewport;var open=document.body.classList.contains('deposit-keyboard-open');var offset=0;if(open&&viewport){offset=Math.max(0,Math.round((window.innerHeight||0)-viewport.height-viewport.offsetTop))}root.style.setProperty('--vexa-wallet-keyboard-offset',offset+'px')}
  function setDepositKeyboard(open){document.body.classList.toggle('deposit-keyboard-open',!!open);syncDepositKeyboardPosition()}
  function clearFinanceInlineStyles(sheet){if(!sheet)return;sheet.removeAttribute('style');var panel=sheet.querySelector('.deposit-panel');if(panel)panel.removeAttribute('style')}
  function setSheet(id,open){installSheetFixStyles();makeSheetsGlobal();polishDepositFooter();if(open)lockFinanceSheetHeight();var sheet=q(id);if(!sheet)return;clearFinanceInlineStyles(sheet);if(open){sheet.classList.remove('closing');sheet.classList.add('open');sheet.setAttribute('aria-hidden','false');setTimeout(function(){clearFinanceInlineStyles(sheet)},30)}else{sheet.classList.add('closing');sheet.classList.remove('open');sheet.setAttribute('aria-hidden','true');setTimeout(function(){sheet.classList.remove('closing');clearFinanceInlineStyles(sheet)},420)}syncOpenState()}
  function updateEquivalent(){var input=q('starsAmountSheet');var out=q('starsTonEquivalent');if(!out)return;var ton=q('tonAmountSheet');if(ton&&ton.style.display!=='none')return;var stars=starsAmount(input&&input.value);var source=window.VexaStarsGramRate;out.textContent=source&&typeof source.format==='function'?source.format(stars):(stars?'≈ … Gram':'≈ 0.00 Gram')}
  function updateWithdrawEquivalent(){setUsdEquivalent(q('withdrawUsdEquivalent'),tonAmount(q('withdrawAmountTon')&&q('withdrawAmountTon').value))}
  async function submitStarsSheet(){var userId=currentUserId();var initData=String(tg&&tg.initData||'').trim();var input=q('starsAmountSheet');var stars=starsAmount(input&&input.value);var status=ensureDepositStatus();if(!userId){setDepositStatus('Telegram user not found','error');return}if(!initData){setDepositStatus('Open the Mini App inside Telegram','error');return}if(stars<MIN_STARS_DEPOSIT){setDepositStatus('Minimum deposit is '+MIN_STARS_DEPOSIT+' Stars','error');return}setDepositStatus('Creating secure Telegram invoice','pending');try{var d=await api('/app/api/stars/deposits',{userId:userId,initData:initData,stars:stars});var equivalent=q('starsTonEquivalent');var rateSource=window.VexaStarsGramRate;if(equivalent&&d&&d.amountNano&&rateSource&&typeof rateSource.formatNano==='function')equivalent.textContent='≈ '+rateSource.formatNano(d.amountNano);setDepositStatus('Opening Telegram Stars payment','pending');if(d.invoiceLink){if(tg&&typeof tg.openInvoice==='function'){tg.openInvoice(d.invoiceLink,function(state){setDepositStatus(state==='paid'?'Payment received. Balance will update shortly':'Payment status: '+state,state==='paid'?'success':'pending');if(state==='paid'&&window.VexaShowPaymentDone)window.VexaShowPaymentDone();if(state==='paid'&&window.VexaTonBalance&&window.VexaTonBalance.load)setTimeout(function(){window.VexaTonBalance.load()},900);if(state==='paid'&&window.VexaLevel&&window.VexaLevel.load)setTimeout(function(){window.VexaLevel.load()},1100)})}else{window.location.href=d.invoiceLink}}}catch(error){setDepositStatus(error&&error.message?error.message:'Could not create Stars deposit','error')}}
  function transactionIcon(kind,positive){if(positive)return '<svg viewBox="0 0 48 48" fill="none"><path d="M24 8v24" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M14 22l10 10 10-10" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';return '<svg viewBox="0 0 48 48" fill="none"><path d="M24 40V16" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M14 26l10-10 10 10" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'}
  function rowHtml(item){var amountNano=Math.floor(Number(item.amountNano)||0);var positive=amountNano>=0;var kind=String(item.kind||'adjustment');var title=escapeHtml(item.title||((kind==='deposit')?'TON deposit':'Gram withdrawal'));var desc=escapeHtml(item.description||(kind==='deposit'?'Deposit':'Withdraw'));var sub=desc+' • '+dateText(item.createdAt);var status=String(item.status||'completed').toLowerCase();var amount=(positive?'+':'-')+(kind==='withdraw'?gramText(Math.abs(amountNano)):tonText(Math.abs(amountNano)));return '<div class="transaction-row"><span class="transaction-icon '+(positive?'in':'out')+'">'+transactionIcon(kind,positive)+'</span><span class="transaction-main"><strong>'+title+'</strong><span>'+sub+'</span></span><span class="transaction-side"><b>'+amount+'</b><em class="'+status+'">'+escapeHtml(status)+'</em></span></div>'}
  function isWalletTransaction(item){var kind=String(item&&item.kind||'').toLowerCase();return kind==='deposit'||kind==='withdraw'}
  async function loadTransactions(){var list=q('transactionsList');if(!list)return;var initData=String(tg&&tg.initData||'').trim();if(!initData){list.innerHTML='<div class="transactions-empty">Open the Mini App inside Telegram</div>';return}list.innerHTML='<div class="transactions-empty">Loading transactions</div>';try{var result=await getJson('/app/api/ton/history?wallet=1&limit=100');var items=(result.transactions||[]).filter(isWalletTransaction);list.innerHTML=items.length?items.map(rowHtml).join(''):'<div class="transactions-empty">No deposits or withdrawals yet</div>'}catch(error){list.innerHTML='<div class="transactions-empty">'+escapeHtml(error&&error.message?error.message:'Could not load transactions')+'</div>'}}
  function openTransactions(){setSheet('transactionsSheet',true);loadTransactions()}
  function resetWithdraw(){var status=q('withdrawStatus');var success=q('withdrawSuccess');var content=document.querySelector('.withdraw-content');if(status)status.textContent='';if(success){success.classList.remove('show');success.setAttribute('aria-hidden','true')}if(content)content.classList.remove('withdraw-done')}
  async function submitWithdraw(){var initData=String(tg&&tg.initData||'').trim();var amount=q('withdrawAmountTon');var wallet=q('withdrawWalletAddress');var status=q('withdrawStatus');var success=q('withdrawSuccess');var content=document.querySelector('.withdraw-content');var requested=Number(String(amount&&amount.value||'').replace(',', '.'));if(!initData){toast('Open the Mini App inside Telegram');if(status)status.textContent='Open the Mini App inside Telegram';return}if(!Number.isFinite(requested)||requested<=0){toast('Enter a valid Gram amount');if(status)status.textContent='Enter a valid Gram amount';return}if(requested<10){toast('Minimum withdrawal is 10 Gram');if(status)status.textContent='Minimum withdrawal is 10 Gram';return}if(requested>100){toast('Maximum withdrawal is 100 Gram');if(status)status.textContent='Maximum withdrawal is 100 Gram';return}if(status)status.textContent='Submitting withdrawal request';if(success){success.classList.remove('show');success.setAttribute('aria-hidden','true')}if(content)content.classList.remove('withdraw-done');try{await api('/app/api/ton/withdrawals',{initData:initData,amountGram:amount&&amount.value,walletAddress:wallet&&wallet.value});if(status)status.textContent='';if(content)content.classList.add('withdraw-done');if(success){success.classList.add('show');success.setAttribute('aria-hidden','false')}if(window.VexaTonBalance&&window.VexaTonBalance.load)setTimeout(function(){window.VexaTonBalance.load()},500)}catch(error){if(status)status.textContent=error&&error.message?error.message:'Withdrawal failed';toast(error&&error.message?error.message:'Withdrawal failed')}}
  function bind(){installSheetFixStyles();makeSheetsGlobal();polishDepositFooter();ensureDepositStatus();updateEquivalent();syncOpenState();['depositSheet','withdrawSheet','transactionsSheet'].forEach(function(id){var sheet=q(id);if(sheet&&window.MutationObserver)new MutationObserver(syncOpenState).observe(sheet,{attributes:true,attributeFilter:['class','aria-hidden']})});document.addEventListener('input',function(ev){if(ev.target&&ev.target.id==='starsAmountSheet'){clearDepositStatus();updateEquivalent()}if(ev.target&&ev.target.id==='withdrawAmountTon'){updateWithdrawEquivalent()}});document.addEventListener('focusin',function(ev){if(ev.target&&['starsAmountSheet','tonAmountSheet','withdrawAmountTon','withdrawWalletAddress'].includes(ev.target.id))setDepositKeyboard(true)});document.addEventListener('focusout',function(ev){if(ev.target&&['starsAmountSheet','tonAmountSheet','withdrawAmountTon','withdrawWalletAddress'].includes(ev.target.id))setTimeout(function(){var a=document.activeElement;if(!a||!['starsAmountSheet','tonAmountSheet','withdrawAmountTon','withdrawWalletAddress'].includes(a.id))setDepositKeyboard(false)},80)});if(window.visualViewport){window.visualViewport.addEventListener('resize',syncDepositKeyboardPosition);window.visualViewport.addEventListener('scroll',syncDepositKeyboardPosition)}document.addEventListener('click',function(ev){var target=ev.target;var walletTarget=target&&target.closest&&target.closest('[data-view="wallet"]');if(walletTarget){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation&&ev.stopImmediatePropagation();openWallet();return}var creditTarget=target&&target.closest&&target.closest('[data-ton-balance-display],.top-balance-pill,.ton-mini-icon');if(creditTarget){ev.preventDefault();ev.stopPropagation();openTransactions();return}var closeWalletTarget=target&&target.closest&&target.closest('[data-action="close-wallet"]');if(closeWalletTarget){ev.preventDefault();ev.stopPropagation();closeWallet();return}var button=target&&target.closest?target.closest('button'):null;if(!button)return;var action=button.getAttribute('data-action');if(action==='open-deposit'){setSheet('depositSheet',true);clearDepositStatus();updateEquivalent()}if(action==='close-deposit'){closeWallet();return}if(action==='open-withdraw'){ensureWallet();resetWithdraw();setSheet('depositSheet',false);setSheet('withdrawSheet',true);updateWithdrawEquivalent();loadTonUsd()}if(action==='close-withdraw'){setDepositKeyboard(false);setSheet('withdrawSheet',false);setSheet('depositSheet',true);if(window.VexaShowDepositPicker)window.VexaShowDepositPicker()}if(action==='submit-withdraw'){submitWithdraw()}if(action==='deposit-custom-stars-sheet'){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation&&ev.stopImmediatePropagation();submitStarsSheet();return}if(action==='open-transactions'){openTransactions()}if(action==='close-transactions'){setSheet('transactionsSheet',false)}},true)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
`;

const USDT_DEPOSIT_SCRIPT = `
(function(){
  var STORAGE_KEY='vexa:pending-usdt-deposit';
  var selectedNetwork='';
  var creating=false;
  var verifying=false;
  var lastVerifyAt=0;
  var tg=window.Telegram&&window.Telegram.WebApp;
  function q(id){return document.getElementById(id)}
  function sheet(){return q('depositSheet')}
  function ownerId(){return String((tg&&tg.initDataUnsafe&&tg.initDataUnsafe.user&&tg.initDataUnsafe.user.id)||localStorage.getItem('ownerId')||'')}
  function telegramInitData(){return String(tg&&tg.initData||'').trim()}
  async function api(path,payload){var r=await fetch(path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload||{})});var j=await r.json().catch(function(){return{error:'Invalid response'}});if(!r.ok)throw new Error(j.error||'Request failed');return j}
  function formatGram(nano){var value=Math.max(0,Math.floor(Number(nano)||0))/1000000000;return value.toFixed(2).replace(/\\.00$/,'')+' Gram'}
  function normalizeAmount(value){var text=String(value==null?'':value).trim().replace(',','.').replace(/[^0-9.]/g,'');var first=text.indexOf('.');if(first>=0)text=text.slice(0,first+1)+text.slice(first+1).replace(/\\./g,'');if(text.indexOf('.')===0)text='0'+text;var parts=text.split('.');return parts.length>1?parts[0]+'.'+parts[1].slice(0,2):text}
  function setBackButton(){var button=document.querySelector('#depositSheet .deposit-close');if(!button)return;button.setAttribute('data-action','back-from-usdt');button.setAttribute('aria-label','Back');button.innerHTML='<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13.75 5.75L7.5 12l6.25 6.25M8 12h9.5" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/></svg>'}
  function pendingItem(){try{var raw=localStorage.getItem(STORAGE_KEY);var item=raw?JSON.parse(raw):null;var userId=ownerId();if(!item||!item.id||!userId||String(item.userId||'')!==userId){if(item)clearPending();return null}return item}catch(e){clearPending();return null}}
  function savePending(deposit){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({id:String(deposit.id||''),userId:ownerId(),network:String(deposit.network||''),amount:String(deposit.requestedAmountUsdt||''),createdAt:Date.now()}))}catch(e){}}
  function clearPending(){try{localStorage.removeItem(STORAGE_KEY)}catch(e){}}
  function status(text,kind){var n=q('usdtDepositStatus');if(!n)return;n.textContent=text||'';n.classList.toggle('success',kind==='success');n.classList.toggle('error',kind==='error');n.classList.toggle('pending',kind==='pending')}
  function setBusy(busy){var create=q('usdtCreateDeposit');var check=q('usdtCheckPayment');if(create)create.disabled=!!busy;if(check)check.disabled=!!busy}
  function installStyles(){if(q('vexa-usdt-deposit-style'))return;var style=document.createElement('style');style.id='vexa-usdt-deposit-style';style.textContent='#depositSheet.deposit-usdt-enabled.deposit-choosing .deposit-method-option{min-height:60px!important;padding:7px 10px!important;grid-template-columns:46px minmax(0,1fr) 20px!important;gap:10px!important}#depositSheet.deposit-usdt-enabled.deposit-choosing .deposit-method-image{width:46px!important;height:46px!important}#depositSheet.deposit-usdt-enabled.deposit-choosing .deposit-method-image img{width:44px!important;height:44px!important}#depositSheet.deposit-usdt-enabled.deposit-choosing .deposit-method-copybox strong{font-size:15.5px!important}#depositSheet.deposit-usdt-enabled.deposit-choosing .deposit-method-copybox span{font-size:10.5px!important}#depositSheet.deposit-usdt-enabled.deposit-choosing .deposit-method-copy{margin-bottom:8px!important}.usdt-method-icon{width:44px!important;height:44px!important;display:block!important;color:#fff!important}.usdt-deposit-screen{display:none!important;width:min(100%,360px)!important;margin:0 auto!important}.deposit-usdt-mode .usdt-deposit-screen{display:block!important}#depositSheet.deposit-usdt-mode .deposit-method-screen,#depositSheet.deposit-usdt-mode .deposit-copy:not(.deposit-method-copy),#depositSheet.deposit-usdt-mode .deposit-custom-field,#depositSheet.deposit-usdt-mode .deposit-action-row,#depositSheet.deposit-usdt-mode #depositMainPayButton,#depositSheet.deposit-usdt-mode .ton-wallet-status,#depositSheet.deposit-usdt-mode .deposit-status-inline,#depositSheet.deposit-usdt-mode .deposit-stars-logo,#depositSheet.deposit-usdt-mode #tonWalletConnectGate{display:none!important}.usdt-deposit-head{text-align:center!important;margin:0 0 14px!important}.usdt-deposit-head strong{display:block!important;font-size:18px!important;font-weight:750!important;letter-spacing:-.02em!important;color:#fff!important}.usdt-deposit-head span{display:block!important;margin-top:5px!important;font-size:11px!important;font-weight:700!important;line-height:1.35!important;color:rgba(255,255,255,.54)!important}.usdt-network-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin:0 0 10px!important}.usdt-network-button{height:42px!important;border:1px solid rgba(255,255,255,.06)!important;border-radius:14px!important;background:#141419!important;color:rgba(255,255,255,.68)!important;font-size:12px!important;font-weight:850!important;box-shadow:none!important}.usdt-network-button.selected{background:#482432!important;border-color:#482432!important;color:#fff!important;box-shadow:none!important}.usdt-amount-field{height:48px!important;display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;padding:0 15px!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:16px!important;background:#16161c!important;box-shadow:none!important}.usdt-amount-field input{width:100%!important;height:100%!important;border:0!important;outline:0!important;background:transparent!important;color:#fff!important;font-size:17px!important;font-weight:800!important}.usdt-amount-field span{font-size:12px!important;font-weight:850!important;color:rgba(255,255,255,.60)!important}.usdt-primary{width:100%!important;height:46px!important;margin:10px 0 0!important;border:0!important;border-radius:16px!important;background:#482432!important;color:#fff!important;font-size:13px!important;font-weight:900!important}.usdt-primary:active{background:#57303f!important;transform:scale(.992)!important}.usdt-primary:disabled,.usdt-copy-button:disabled{opacity:.55!important}.usdt-deposit-status{min-height:17px!important;margin:8px 0 0!important;text-align:center!important;font-size:11px!important;font-weight:730!important;color:rgba(255,255,255,.56)!important}.usdt-deposit-status.pending{color:#ffcf6b!important}.usdt-deposit-status.success{color:#42f594!important}.usdt-deposit-status.error{color:#ff7b9a!important}.usdt-quote{display:none!important}.usdt-deposit-screen.has-quote .usdt-create{display:none!important}.usdt-deposit-screen.has-quote .usdt-quote{display:block!important}.usdt-quote-amount{text-align:center!important;margin:0 0 10px!important}.usdt-quote-amount small{display:block!important;color:rgba(255,255,255,.46)!important;font-size:10px!important;font-weight:780!important;text-transform:uppercase!important;letter-spacing:.07em!important}.usdt-quote-amount strong{display:block!important;margin-top:4px!important;color:#fff!important;font-size:25px!important;font-weight:900!important;letter-spacing:-.04em!important;font-variant-numeric:tabular-nums!important}.usdt-quote-amount span{display:block!important;margin-top:3px!important;color:rgba(255,255,255,.52)!important;font-size:11px!important;font-weight:730!important}.usdt-address-box{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;align-items:center!important;padding:10px 10px 10px 12px!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:16px!important;background:#16161c!important;box-shadow:none!important}.usdt-address-text{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:rgba(255,255,255,.82)!important;font-size:11px!important;font-weight:730!important;font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important}.usdt-copy-button{height:34px!important;padding:0 12px!important;border:1px solid rgba(126,31,55,.15)!important;border-radius:11px!important;background:#1b1b22!important;color:#fff!important;font-size:10px!important;font-weight:850!important}.usdt-copy-button:active{background:#1b0b12!important}.usdt-quote-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin-top:8px!important}.usdt-note{margin:9px auto 0!important;max-width:330px!important;text-align:center!important;color:rgba(255,255,255,.46)!important;font-size:10px!important;font-weight:680!important;line-height:1.35!important}';document.head.appendChild(style)}
  function usdtIcon(){return '<svg class="usdt-method-icon" viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="20" fill="rgba(89,17,40,.24)"/><path d="M15 15h18M24 15v19M18 21.5c3.7 2 8.3 2 12 0" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M16.5 27c4.7 2.35 10.3 2.35 15 0" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" opacity=".7"/></svg>'}
  function ensureMethod(){installStyles();var s=sheet();if(!s)return false;var screen=s.querySelector('.deposit-method-screen');if(!screen)return false;s.classList.add('deposit-usdt-enabled');if(!screen.querySelector('[data-action="choose-usdt-deposit"]')){var button=document.createElement('button');button.className='deposit-method-option';button.type='button';button.setAttribute('data-action','choose-usdt-deposit');button.innerHTML='<span class="deposit-method-image">'+usdtIcon()+'</span><span class="deposit-method-copybox"><strong>Deposit with USDT</strong><span>BEP20 or TRC20 transfer</span></span><span class="deposit-method-arrow">›</span>';var nft=screen.querySelector('[data-method="nft"]');if(nft)screen.insertBefore(button,nft);else screen.appendChild(button)}return true}
  function ensureScreen(){installStyles();var s=sheet();if(!s)return null;var screen=q('usdtDepositScreen');if(screen)return screen;var pad=s.querySelector('.deposit-panel .pad');if(!pad)return null;screen=document.createElement('div');screen.id='usdtDepositScreen';screen.className='usdt-deposit-screen';screen.innerHTML='<div class="usdt-create"><div class="usdt-deposit-head"><strong>Deposit USDT</strong><span>Choose the network and amount. Vexa will generate the exact amount to send.</span></div><div class="usdt-network-grid"><button class="usdt-network-button" type="button" data-action="select-usdt-network" data-network="bep20">BEP20</button><button class="usdt-network-button" type="button" data-action="select-usdt-network" data-network="trc20">TRC20</button></div><div class="usdt-amount-field"><input id="usdtAmountInput" type="text" inputmode="decimal" autocomplete="off" placeholder="10.00" value="10.00"><span>USDT</span></div><button id="usdtCreateDeposit" class="usdt-primary" type="button" data-action="create-usdt-deposit">Create Deposit</button></div><div class="usdt-quote"><div class="usdt-quote-amount"><small id="usdtQuoteNetwork">USDT</small><strong id="usdtQuoteAmount">—</strong><span id="usdtQuoteGram">—</span></div><div class="usdt-address-box"><span id="usdtQuoteAddress" class="usdt-address-text">—</span><button class="usdt-copy-button" type="button" data-action="copy-usdt-address">Copy</button></div><div class="usdt-quote-actions"><button class="usdt-copy-button" type="button" data-action="copy-usdt-amount">Copy Amount</button><button id="usdtCheckPayment" class="usdt-primary" style="margin:0!important;height:34px!important;border-radius:12px!important" type="button" data-action="check-usdt-payment">Check Payment</button></div><p class="usdt-note">Send only USDT on the selected network and send the exact amount shown.</p></div><p id="usdtDepositStatus" class="usdt-deposit-status"></p>';var methods=s.querySelector('.deposit-method-screen');if(methods&&methods.parentNode)methods.insertAdjacentElement('afterend',screen);else pad.appendChild(screen);return screen}
  function selectNetwork(network){selectedNetwork=network==='bep20'?'bep20':network==='trc20'?'trc20':'';Array.prototype.forEach.call(document.querySelectorAll('#usdtDepositScreen [data-action="select-usdt-network"]'),function(button){button.classList.toggle('selected',button.getAttribute('data-network')===selectedNetwork)});status('')}
  function showCreate(){var screen=ensureScreen();if(!screen)return;screen.classList.remove('has-quote');screen.removeAttribute('data-deposit-id');screen.removeAttribute('data-exact-amount');status('');setBusy(false)}
  function renderDeposit(deposit){var screen=ensureScreen();if(!screen)return;var state=String(deposit&&deposit.status||'pending').toLowerCase();var input=q('usdtAmountInput');if(input&&deposit&&deposit.requestedAmountUsdt)input.value=normalizeAmount(deposit.requestedAmountUsdt);if(deposit&&deposit.network)selectNetwork(String(deposit.network).toLowerCase());if(state==='completed'){clearPending();screen.classList.remove('has-quote');screen.removeAttribute('data-deposit-id');screen.removeAttribute('data-exact-amount');status('Payment received. Balance updated.','success');if(window.VexaShowPaymentDone)window.VexaShowPaymentDone();if(window.VexaTonBalance&&window.VexaTonBalance.load)window.VexaTonBalance.load();if(window.VexaLevel&&window.VexaLevel.load)window.VexaLevel.load();return}if(state==='expired'){clearPending();screen.classList.remove('has-quote');screen.removeAttribute('data-deposit-id');screen.removeAttribute('data-exact-amount');status('Deposit expired. Create a new deposit.','error');return}if(state!=='pending'&&state!=='crediting'){clearPending();screen.classList.remove('has-quote');screen.removeAttribute('data-deposit-id');screen.removeAttribute('data-exact-amount');status('Deposit is no longer active. Create a new deposit.','error');return}savePending(deposit);screen.classList.add('has-quote');var amount=q('usdtQuoteAmount');var network=q('usdtQuoteNetwork');var gram=q('usdtQuoteGram');var address=q('usdtQuoteAddress');if(amount)amount.textContent=String(deposit.expectedAmountUsdt||'')+' USDT';if(network)network.textContent='USDT • '+String(deposit.networkLabel||'').toUpperCase();if(gram)gram.textContent='≈ '+formatGram(deposit.amountNano);if(address){address.textContent=String(deposit.treasuryAddress||'');address.setAttribute('data-full-address',String(deposit.treasuryAddress||''))}screen.setAttribute('data-deposit-id',String(deposit.id||''));screen.setAttribute('data-exact-amount',String(deposit.expectedAmountUsdt||''));status('Waiting for your transfer. Valid for 15 minutes.','pending')}
  async function loadPending(){var item=pendingItem();if(!item||!item.id)return false;var initData=telegramInitData();if(!initData){status('Open the Mini App inside Telegram','error');return false}var input=q('usdtAmountInput');if(input&&item.amount)input.value=normalizeAmount(item.amount);if(item.network)selectNetwork(String(item.network).toLowerCase());try{var deposit=await api('/app/api/usdt/deposits/'+encodeURIComponent(item.id)+'/verify',{initData:initData});renderDeposit(deposit);var state=String(deposit&&deposit.status||'').toLowerCase();return state==='pending'||state==='crediting'}catch(error){status(error&&error.message?error.message:'Could not load pending deposit','error');return false}}
  function showUsdt(){ensureMethod();var screen=ensureScreen();var s=sheet();if(!screen||!s)return;s.classList.remove('deposit-choosing','deposit-ton-connect-required');s.classList.add('deposit-usdt-mode');setBackButton();showCreate();loadPending()}
  function leaveUsdt(){var s=sheet();if(s)s.classList.remove('deposit-usdt-mode');selectedNetwork='';var screen=q('usdtDepositScreen');if(screen)screen.classList.remove('has-quote');status('');setBusy(false)}
  async function createDeposit(){if(creating)return;var initData=telegramInitData();if(!initData){status('Open the Mini App inside Telegram','error');return}if(!selectedNetwork){status('Choose BEP20 or TRC20.','error');return}var input=q('usdtAmountInput');var amount=normalizeAmount(input&&input.value);if(!amount||Number(amount)<1){status('Minimum USDT amount is 1.','error');return}if(input)input.value=amount;creating=true;setBusy(true);status('Creating your deposit request…','pending');try{var deposit=await api('/app/api/usdt/deposits',{initData:initData,network:selectedNetwork,amountUsdt:amount});renderDeposit(deposit)}catch(error){status(error&&error.message?error.message:'Could not create USDT deposit','error')}creating=false;setBusy(false)}
  async function verifyDeposit(id,silent){if(!id||verifying)return;var initData=telegramInitData();if(!initData){if(!silent)status('Open the Mini App inside Telegram','error');return}verifying=true;setBusy(true);if(!silent)status('Checking blockchain confirmation…','pending');try{var deposit=await api('/app/api/usdt/deposits/'+encodeURIComponent(id)+'/verify',{initData:initData});renderDeposit(deposit);if(String(deposit&&deposit.status||'')==='pending'&&!silent)status('Not confirmed yet. Check again after the transfer confirms.','pending')}catch(error){if(!silent)status(error&&error.message?error.message:'Could not verify payment','error')}verifying=false;setBusy(false)}
  async function copyText(value,label){var text=String(value||'').trim();if(!text)return;try{if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(text);else{var input=document.createElement('textarea');input.value=text;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();document.execCommand('copy');input.remove()}status(label+' copied.','success')}catch(e){status('Could not copy.','error')}}
  function verifyPendingOnActivation(){var item=pendingItem();var now=Date.now();if(!item||!item.id||verifying||now-lastVerifyAt<3000)return;lastVerifyAt=now;verifyDeposit(String(item.id),true)}
  function bind(){ensureMethod();ensureScreen();document.addEventListener('input',function(ev){if(ev.target&&ev.target.id==='usdtAmountInput'){ev.target.value=normalizeAmount(ev.target.value);status('')}});document.addEventListener('click',function(ev){var button=ev.target&&ev.target.closest?ev.target.closest('button'):null;if(!button)return;var action=button.getAttribute('data-action');if(action==='choose-usdt-deposit'){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation&&ev.stopImmediatePropagation();showUsdt();return}if(action==='back-from-usdt'){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation&&ev.stopImmediatePropagation();var screen=q('usdtDepositScreen');if(screen&&screen.classList.contains('has-quote')){showCreate();setBackButton();return}leaveUsdt();if(window.VexaShowDepositPicker)window.VexaShowDepositPicker();return}if(action==='select-usdt-network'){ev.preventDefault();selectNetwork(button.getAttribute('data-network'));return}if(action==='create-usdt-deposit'){ev.preventDefault();createDeposit();return}if(action==='check-usdt-payment'){ev.preventDefault();var screen=q('usdtDepositScreen');verifyDeposit(String(screen&&screen.getAttribute('data-deposit-id')||''),false);return}if(action==='copy-usdt-address'){ev.preventDefault();var address=q('usdtQuoteAddress');copyText(address&&address.getAttribute('data-full-address'),'Address');return}if(action==='copy-usdt-amount'){ev.preventDefault();var screen=q('usdtDepositScreen');copyText(screen&&screen.getAttribute('data-exact-amount'),'Amount');return}},true);document.addEventListener('visibilitychange',function(){if(!document.hidden)verifyPendingOnActivation()});window.addEventListener('focus',verifyPendingOnActivation);window.addEventListener('online',verifyPendingOnActivation);if(tg&&typeof tg.onEvent==='function')tg.onEvent('activated',verifyPendingOnActivation)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
})();
`;

export const DEPOSIT_ENHANCEMENTS_SCRIPT = DEPOSIT_CORE_SCRIPT + TON_WALLET_DEPOSIT_SCRIPT + USDT_DEPOSIT_SCRIPT;
