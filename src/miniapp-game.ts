import { miniAppShellHtml } from './miniapp/shell';

const EMPTY_HOME_SLOT_IMAGE = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const DEFAULT_PAYMENT_METHOD_IMAGES = {
  stars: '/app/api/deposit-method-icon/stars.png',
  gram: '/app/api/credit-icon.png',
  nft: '/app/api/deposit-method-icon/nft.png',
} as const;

type PaymentMethodImageUrls = Partial<Record<'stars' | 'gram' | 'usdt' | 'nft', string>>;

function safeSingleQuotedJs(value: string): string {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const USDT_NOTE_STYLE_ANCHOR = '.usdt-note{margin:9px auto 0!important;max-width:330px!important;text-align:center!important;color:rgba(255,255,255,.48)!important;font-size:10px!important;font-weight:700!important;line-height:1.35!important}';
const USDT_REFERENCE_STYLES = `
#depositSheet.deposit-usdt-mode .deposit-panel:before{content:""!important;position:absolute!important;top:9px!important;left:50%!important;width:54px!important;height:5px!important;border-radius:999px!important;background:rgba(255,255,255,.18)!important;transform:translateX(-50%)!important;z-index:6!important}
body.wallet-open.deposit-open #depositSheet.deposit-sheet.deposit-usdt-mode.open .deposit-panel{height:min(560px,calc(100vh - 12px))!important;max-height:min(560px,calc(100vh - 12px))!important;overflow:auto!important}
body.wallet-open.deposit-open:has(#depositSheet.deposit-usdt-mode) #wallet .wallet-sheet-panel:before{height:min(560px,calc(100vh - 12px))!important}
#depositSheet.deposit-usdt-mode .deposit-title{width:min(100%,380px)!important;margin:8px auto 0!important;position:relative!important;z-index:7!important}
#depositSheet.deposit-usdt-mode .deposit-close{width:42px!important;height:42px!important;min-width:42px!important;border-radius:50%!important;background:rgba(255,255,255,.055)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.08)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
.usdt-deposit-screen{width:min(100%,380px)!important;padding:4px 2px 10px!important;box-sizing:border-box!important}
.usdt-create{display:block!important}
.usdt-deposit-head{display:grid!important;grid-template-columns:58px minmax(0,1fr)!important;gap:13px!important;align-items:center!important;text-align:left!important;margin:0 0 18px!important;padding:0 2px!important}
.usdt-head-icon{width:56px!important;height:56px!important;border-radius:18px!important;display:grid!important;place-items:center!important;color:#ff4b78!important;background:rgba(255,49,103,.12)!important;border:1px solid rgba(255,75,120,.24)!important;box-shadow:0 8px 22px rgba(255,37,92,.10)!important}
.usdt-head-icon svg{width:30px!important;height:30px!important;display:block!important}
.usdt-head-copy{min-width:0!important;display:block!important}
.usdt-head-copy strong{display:block!important;color:#fff!important;font-size:24px!important;line-height:1!important;font-weight:900!important;letter-spacing:-.045em!important}
.usdt-head-copy strong em{font:inherit!important;font-style:normal!important;color:#ff4b78!important}
.usdt-head-copy>span{display:block!important;margin-top:7px!important;color:rgba(255,255,255,.52)!important;font-size:11.5px!important;line-height:1.35!important;font-weight:650!important;letter-spacing:-.012em!important}
.usdt-network-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin:0 0 12px!important}
.usdt-network-button{height:72px!important;padding:10px 11px!important;border:1px solid rgba(255,255,255,.07)!important;border-radius:18px!important;background:rgba(8,8,10,.62)!important;color:#fff!important;display:grid!important;grid-template-columns:40px minmax(0,1fr) 21px!important;gap:9px!important;align-items:center!important;text-align:left!important;box-shadow:none!important;transform:none!important;opacity:1!important;transition:border-color .22s ease,background .22s ease,box-shadow .22s ease,transform .14s ease!important}
.usdt-network-button.selected{border-color:#ff3d73!important;background:rgba(255,45,102,.065)!important;color:#fff!important;box-shadow:0 0 0 1px rgba(255,61,115,.20),0 10px 26px rgba(255,31,86,.10)!important;transform:none!important}
.usdt-network-button:active{transform:scale(.982)!important;opacity:1!important}
.usdt-network-logo{width:40px!important;height:40px!important;border-radius:50%!important;display:grid!important;place-items:center!important;overflow:hidden!important}
.usdt-network-logo svg{width:40px!important;height:40px!important;display:block!important}
.usdt-network-copy{min-width:0!important;display:block!important}
.usdt-network-copy strong{display:block!important;color:rgba(255,255,255,.94)!important;font-size:13px!important;line-height:1.05!important;font-weight:850!important;letter-spacing:-.02em!important}
.usdt-network-copy span{display:block!important;margin-top:5px!important;color:rgba(255,255,255,.38)!important;font-size:9.5px!important;line-height:1!important;font-weight:650!important;white-space:nowrap!important}
.usdt-network-check{width:20px!important;height:20px!important;border-radius:50%!important;border:2px solid rgba(255,255,255,.22)!important;display:grid!important;place-items:center!important;color:transparent!important;box-sizing:border-box!important;transition:all .2s ease!important}
.usdt-network-check span{font-size:11px!important;line-height:1!important;font-weight:950!important;transform:translateY(-.5px)!important}
.usdt-network-button.selected .usdt-network-check{border-color:#ff3d73!important;background:#ff3d73!important;color:#fff!important;box-shadow:0 4px 12px rgba(255,45,102,.28)!important}
.usdt-amount-field{height:58px!important;display:grid!important;grid-template-columns:40px minmax(0,1fr) auto!important;align-items:center!important;gap:10px!important;padding:0 15px 0 11px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:18px!important;background:rgba(5,5,7,.64)!important;box-shadow:none!important}
.usdt-amount-logo{width:38px!important;height:38px!important;border-radius:50%!important;display:grid!important;place-items:center!important;overflow:hidden!important}
.usdt-amount-logo svg{width:38px!important;height:38px!important;display:block!important}
.usdt-amount-field input{width:100%!important;height:100%!important;border:0!important;outline:0!important;background:transparent!important;color:#fff!important;font-size:19px!important;font-weight:820!important;letter-spacing:-.025em!important;padding:0!important}
.usdt-amount-unit{color:rgba(255,255,255,.46)!important;font-size:14px!important;font-weight:850!important;letter-spacing:-.01em!important}
.usdt-presets{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:8px!important;margin:10px 0 0!important}
.usdt-preset{height:42px!important;border:1px solid rgba(255,255,255,.065)!important;border-radius:14px!important;background:rgba(255,255,255,.04)!important;color:rgba(255,255,255,.82)!important;font-size:13px!important;font-weight:850!important;box-shadow:none!important;transition:border-color .2s ease,background .2s ease,color .2s ease,transform .14s ease!important}
.usdt-preset.selected{border-color:#ff3d73!important;background:rgba(255,45,102,.075)!important;color:#fff!important;box-shadow:0 0 0 1px rgba(255,61,115,.13)!important}
.usdt-preset:active{transform:scale(.97)!important}
.usdt-primary{width:100%!important;height:58px!important;margin:12px 0 0!important;padding:0 10px 0 14px!important;border:0!important;border-radius:20px!important;background:linear-gradient(100deg,#f52057 0%,#ff416c 100%)!important;color:#fff!important;display:grid!important;grid-template-columns:34px minmax(0,1fr) 46px!important;align-items:center!important;gap:5px!important;font-size:15px!important;font-weight:900!important;letter-spacing:-.02em!important;box-shadow:0 12px 28px rgba(245,32,87,.18)!important}
.usdt-primary-bolt{font-size:22px!important;line-height:1!important;text-align:center!important;color:#fff!important}
.usdt-primary-arrow{width:44px!important;height:44px!important;border-radius:15px!important;display:grid!important;place-items:center!important;background:rgba(91,12,40,.38)!important;font-size:22px!important;line-height:1!important;font-weight:500!important}
.usdt-security{min-height:62px!important;margin:14px 0 0!important;padding:10px 12px!important;border:1px solid rgba(255,255,255,.065)!important;border-radius:18px!important;background:rgba(255,255,255,.025)!important;display:grid!important;grid-template-columns:38px minmax(0,1fr)!important;gap:10px!important;align-items:center!important;box-sizing:border-box!important}
.usdt-security-icon{width:36px!important;height:36px!important;border-radius:12px!important;display:grid!important;place-items:center!important;background:rgba(255,255,255,.06)!important;color:#fff!important}
.usdt-security-icon svg{width:21px!important;height:21px!important;display:block!important}
.usdt-security-copy{min-width:0!important;display:block!important}
.usdt-security-copy strong{display:block!important;color:rgba(255,255,255,.90)!important;font-size:11.5px!important;font-weight:820!important;line-height:1.1!important}
.usdt-security-copy span{display:block!important;margin-top:5px!important;color:rgba(255,255,255,.38)!important;font-size:9.5px!important;font-weight:620!important;line-height:1.25!important}
.usdt-deposit-status{margin:8px 0 0!important}
@media(max-width:380px){body.wallet-open.deposit-open #depositSheet.deposit-sheet.deposit-usdt-mode.open .deposit-panel{height:min(545px,calc(100vh - 10px))!important;max-height:min(545px,calc(100vh - 10px))!important}.usdt-deposit-head{grid-template-columns:52px minmax(0,1fr)!important;gap:11px!important;margin-bottom:14px!important}.usdt-head-icon{width:50px!important;height:50px!important;border-radius:16px!important}.usdt-head-copy strong{font-size:22px!important}.usdt-network-button{height:68px!important;padding:9px!important}.usdt-network-copy span{font-size:9px!important}.usdt-security{margin-top:10px!important}}
`;

const OLD_USDT_CREATE_MARKUP = '<div class="usdt-create"><div class="usdt-deposit-head"><strong>Deposit USDT</strong><span>Choose the network and amount. Vexa will generate the exact amount to send.</span></div><div class="usdt-network-grid"><button class="usdt-network-button" type="button" data-action="select-usdt-network" data-network="bep20">BEP20</button><button class="usdt-network-button" type="button" data-action="select-usdt-network" data-network="trc20">TRC20</button></div><div class="usdt-amount-field"><input id="usdtAmountInput" type="text" inputmode="decimal" autocomplete="off" placeholder="10.00" value="10.00"><span>USDT</span></div><button id="usdtCreateDeposit" class="usdt-primary" type="button" data-action="create-usdt-deposit">Create Deposit</button></div>';

const USDT_TETHER_ICON = '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="#36b8a3"/><path d="M10.5 10.5h19M20 10.5v18.5M13.8 16.2c3.9 2 8.5 2 12.4 0M12.4 21.5c4.8 2.4 10.4 2.4 15.2 0" stroke="white" stroke-width="2.6" stroke-linecap="round"/></svg>';
const USDT_TRON_ICON = '<svg viewBox="0 0 40 40" fill="none" aria-hidden="true"><circle cx="20" cy="20" r="20" fill="#ef1738"/><path d="M10.5 10.5l19 3.2-8.7 16.1-10.3-19.3Zm0 0 10.3 19.3 1-13.1 7.7-3M11.6 11.1l10.2 5.6" stroke="white" stroke-width="1.7" stroke-linejoin="round"/></svg>';
const USDT_HEAD_ICON = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M7 10.5h16.5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H8.5a3 3 0 0 1-3-3v-11a2 2 0 0 1 1.5-2Z" stroke="currentColor" stroke-width="2"/><path d="M20.5 15.5h7v6h-7a3 3 0 1 1 0-6Z" stroke="currentColor" stroke-width="2"/><circle cx="21" cy="18.5" r="1" fill="currentColor"/></svg>';
const USDT_SHIELD_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5 19 6v5.4c0 4.1-2.5 7.5-7 9.1-4.5-1.6-7-5-7-9.1V6l7-2.5Z" fill="currentColor"/><path d="m8.8 12 2 2 4.4-4.5" stroke="#16161a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const NEW_USDT_CREATE_MARKUP = `<div class="usdt-create"><div class="usdt-deposit-head"><span class="usdt-head-icon">${USDT_HEAD_ICON}</span><span class="usdt-head-copy"><strong>Deposit <em>USDT</em></strong><span>Choose the network and amount. Vexa will generate the exact amount to send.</span></span></div><div class="usdt-network-grid"><button class="usdt-network-button" type="button" data-action="select-usdt-network" data-network="bep20"><span class="usdt-network-logo">${USDT_TETHER_ICON}</span><span class="usdt-network-copy"><strong>BEP20</strong><span>BNB Smart Chain</span></span><span class="usdt-network-check"><span>✓</span></span></button><button class="usdt-network-button" type="button" data-action="select-usdt-network" data-network="trc20"><span class="usdt-network-logo">${USDT_TRON_ICON}</span><span class="usdt-network-copy"><strong>TRC20</strong><span>Tron Network</span></span><span class="usdt-network-check"><span>✓</span></span></button></div><div class="usdt-amount-field"><span class="usdt-amount-logo">${USDT_TETHER_ICON}</span><input id="usdtAmountInput" type="text" inputmode="decimal" autocomplete="off" placeholder="10.00" value="10.00"><span class="usdt-amount-unit">USDT</span></div><div class="usdt-presets"><button class="usdt-preset selected" type="button" data-action="set-usdt-preset" data-value="10">10</button><button class="usdt-preset" type="button" data-action="set-usdt-preset" data-value="20">20</button><button class="usdt-preset" type="button" data-action="set-usdt-preset" data-value="50">50</button><button class="usdt-preset" type="button" data-action="set-usdt-preset" data-value="100">100</button></div><button id="usdtCreateDeposit" class="usdt-primary" type="button" data-action="create-usdt-deposit"><span class="usdt-primary-bolt">ϟ</span><span>Create Deposit</span><span class="usdt-primary-arrow">→</span></button><div class="usdt-security"><span class="usdt-security-icon">${USDT_SHIELD_ICON}</span><span class="usdt-security-copy"><strong>Secure &amp; Encrypted</strong><span>Your deposit is protected and processed automatically.</span></span></div></div>`;

const USDT_AMOUNT_INPUT_ANCHOR = "if(ev.target&&ev.target.id==='usdtAmountInput'){ev.target.value=normalizeAmount(ev.target.value);status('')}";
const USDT_AMOUNT_INPUT_REPLACEMENT = "if(ev.target&&ev.target.id==='usdtAmountInput'){ev.target.value=normalizeAmount(ev.target.value);Array.prototype.forEach.call(document.querySelectorAll('#usdtDepositScreen [data-action=\"set-usdt-preset\"]'),function(preset){preset.classList.toggle('selected',preset.getAttribute('data-value')===ev.target.value)});status('')}";
const USDT_NETWORK_CLICK_ANCHOR = "if(action==='select-usdt-network'){ev.preventDefault();selectNetwork(button.getAttribute('data-network'));return}";
const USDT_NETWORK_CLICK_REPLACEMENT = "if(action==='select-usdt-network'){ev.preventDefault();selectNetwork(button.getAttribute('data-network'));return}if(action==='set-usdt-preset'){ev.preventDefault();var input=q('usdtAmountInput');if(input){input.value=button.getAttribute('data-value')||'';input.dispatchEvent(new Event('input',{bubbles:true}))}return}";

export function miniAppHtml(homeSlotImageUrl = EMPTY_HOME_SLOT_IMAGE, paymentMethodImageUrls: PaymentMethodImageUrls = {}): string {
  const starsUrl = paymentMethodImageUrls.stars || DEFAULT_PAYMENT_METHOD_IMAGES.stars;
  const gramUrl = paymentMethodImageUrls.gram || DEFAULT_PAYMENT_METHOD_IMAGES.gram;
  const usdtUrl = paymentMethodImageUrls.usdt || '';
  const nftUrl = paymentMethodImageUrls.nft || DEFAULT_PAYMENT_METHOD_IMAGES.nft;
  const walletSource = "var src=type==='ton'?'/app/api/credit-icon.png':('/app/api/deposit-method-icon/'+(type==='nft'?'nft':'stars')+'.png');";
  const walletResolvedSource = `var src=type==='ton'?'${safeSingleQuotedJs(gramUrl)}':(type==='nft'?'${safeSingleQuotedJs(nftUrl)}':'${safeSingleQuotedJs(starsUrl)}');`;
  let shell = miniAppShellHtml()
    .replace(
      'src="/app/api/home-lottery-slot.png?v=home-lottery"',
      `src="${homeSlotImageUrl}"`,
    )
    .replace(
      /<span class="ton-mini-icon"><img src="[^"]+" alt="" decoding="async"\/><\/span>/,
      `<span class="ton-mini-icon"><img src="${gramUrl}" alt="" decoding="async"/></span>`,
    )
    .replace(walletSource, walletResolvedSource)
    .replace(USDT_NOTE_STYLE_ANCHOR, USDT_NOTE_STYLE_ANCHOR + USDT_REFERENCE_STYLES)
    .replace(OLD_USDT_CREATE_MARKUP, NEW_USDT_CREATE_MARKUP)
    .replace(USDT_AMOUNT_INPUT_ANCHOR, USDT_AMOUNT_INPUT_REPLACEMENT)
    .replace(USDT_NETWORK_CLICK_ANCHOR, USDT_NETWORK_CLICK_REPLACEMENT);

  if (usdtUrl) {
    shell = shell.replace(
      /<svg class="usdt-method-icon" viewBox="0 0 48 48"[\s\S]*?<\/svg>/,
      `<img src="${usdtUrl}" alt="" decoding="async" loading="eager">`,
    );
  }


  const headExtras: string[] = [];
  headExtras.push(`<script>(function(){if(!document.documentElement.classList.contains('vexa-web'))return;var w=Number(screen&&screen.width)||innerWidth||0;var h=Number(screen&&screen.height)||innerHeight||0;if(Math.min(w,h)>=600)document.documentElement.classList.add('vexa-web-large')})()</script>`);
  headExtras.push(`<style>
    .vexa-large-web-gate{display:none}
    html.vexa-web-large body{background:#000!important}
    html.vexa-web-large .vexa-boot,html.vexa-web-large main.app,html.vexa-web-large #toast{display:none!important}
    html.vexa-web-large .vexa-large-web-gate{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:32px;background:radial-gradient(circle at 50% 30%,rgba(92,10,35,.18),transparent 38%),#000;color:#fff;font-family:"SF Pro Rounded","SF Pro Text",Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center}
    .vexa-large-web-gate-card{width:min(100%,520px);padding:42px 34px;border:1px solid rgba(255,255,255,.09);border-radius:30px;background:rgba(255,255,255,.035);box-shadow:0 28px 80px rgba(0,0,0,.45);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
    .vexa-large-web-gate-mark{width:58px;height:58px;margin:0 auto 22px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(145deg,#71102d,#31030f);font-size:28px;font-weight:900;letter-spacing:-.05em;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 14px 40px rgba(73,5,24,.34)}
    .vexa-large-web-gate h1{margin:0;color:#fff;font-size:30px;font-weight:850;letter-spacing:-.045em}
    .vexa-large-web-gate p{margin:14px auto 0;max-width:430px;color:rgba(255,255,255,.68);font-size:16px;font-weight:600;line-height:1.6;letter-spacing:-.015em}
    .vexa-large-web-gate small{display:block;margin-top:22px;color:rgba(255,255,255,.38);font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
  </style>`);

  shell = shell.replace('<body>', `<body><section class="vexa-large-web-gate" aria-label="Vexa Game larger screen availability"><div class="vexa-large-web-gate-card"><div class="vexa-large-web-gate-mark" aria-hidden="true">V</div><h1>Vexa Game</h1><p>Tablet &amp; desktop support is coming soon.<br/>For now, please open Vexa Game on your phone.</p><small>Mobile version available now</small></div></section>`);
  if (headExtras.length) shell = shell.replace('</head>', `${headExtras.join('')}</head>`);
  return shell;
}