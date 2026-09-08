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
    .replace(walletSource, walletResolvedSource);

  if (usdtUrl) {
    shell = shell.replace(
      /<svg class="usdt-method-icon" viewBox="0 0 48 48"[\s\S]*?<\/svg>/,
      `<img src="${usdtUrl}" alt="" decoding="async" loading="eager">`,
    );
  }

  const headExtras: string[] = [];
  const paymentPreloads = Array.from(new Set([starsUrl, gramUrl, usdtUrl, nftUrl].filter(Boolean)));
  paymentPreloads.forEach((url) => {
    if (url) headExtras.push(`<link rel="preload" as="image" href="${url}">`);
  });

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
