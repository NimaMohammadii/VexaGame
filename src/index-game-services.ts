import app from './index-app-services';
import { getPlinkoControl, resetPlinkoControl, savePlinkoControl } from './plinko-control';
import { getPlinkoVirtualUsers, resetPlinkoVirtualUsers, savePlinkoVirtualUsers } from './plinko-virtual-users';
import { getCrashVirtualUsers, resetCrashVirtualUsers, saveCrashVirtualUsers } from './crash-virtual-users-config';
import { getSlotVirtualUsers, resetSlotVirtualUsers, saveSlotVirtualUsers } from './slot-virtual-users';
import { createStarsDeposit, getStarsGramRate, listUserStarsDeposits } from './stars-deposits';
import { createTonDeposit, getTonDeposit, listUserTonDeposits, verifyTonDeposit } from './ton-deposits';
import { createUsdtDeposit, verifyUsdtDeposit } from './usdt-deposits';
import { listUserTonTransactions, listUserTonWalletTransactions } from './ton-transactions';
import { createTonWithdrawal, listUserTonWithdrawals } from './ton-withdrawals';
import { setTelegramWebhook } from './telegram-game-bot';
import { registerRankCharacterRoutes } from './rank-character-routes';
import { registerPlinkoLiveRoutes, PlinkoLiveRoom } from './plinko-live';
import { settleGameTonBalanceRound } from './user-controls';
import type { Env } from './types';
import { gameBotToken, validateTelegramInitData } from './utils';
import { SHARE_INVITE_BUTTON_TEXT, VEXA_APP_DEEP_LINK, vexaTextForCountry, SHARE_INVITE_TEXT } from './miniapp/i18n';
import { getShareInviteImageFileId } from './share-invite-config';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);
const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const HOME_IMAGE_CACHE_CONTROL = 'public, max-age=300, must-revalidate';
// Ghost Run scene art is referenced by stable CSS URLs, so keep it browser-cached
// instead of re-downloading every time the user opens the game.
const GHOST_RUN_ASSET_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const GHOST_RUN_ASSET_MANIFEST_CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800';
const WALLET_HERO_IMAGE_KEY = 'wallet/hero-image';
const CRASH_TIP_IMAGE_KEY = 'crash-tip/image';
const PLINKO_CONTROL_IMAGE_KINDS = new Set(['drop', 'input', 'house']);
const GHOST_RUN_ASSET_KINDS = new Set(['background', 'background1', 'background2', 'background3', 'background4', 'background5', 'background6']);
const NANO_PER_TON = 1_000_000_000;

const TIME_ZONE_COUNTRY_OPTIONS: Readonly<Record<string, readonly string[]>> = {"Asia/Dubai":["AE","OM","RE","SC","TF"],"Pacific/Pago_Pago":["AS","UM"],"Europe/Brussels":["BE","LU","NL"],"America/Toronto":["CA","BS"],"Europe/Zurich":["CH","DE","LI"],"Africa/Abidjan":["CI","BF","GH","GM","GN","IS","ML","MR","SH","SL","SN","TG"],"Europe/Prague":["CZ","SK"],"Europe/Berlin":["DE","DK","NO","SE","SJ"],"Europe/Helsinki":["FI","AX"],"Europe/Paris":["FR","MC"],"Europe/London":["GB","GG","IM","JE"],"Pacific/Guam":["GU","MP"],"Europe/Rome":["IT","SM","VA"],"Asia/Tokyo":["JP","AU"],"Africa/Nairobi":["KE","DJ","ER","ET","KM","MG","SO","TZ","UG","YT"],"Pacific/Tarawa":["KI","MH","TV","UM","WF"],"Asia/Yangon":["MM","CC"],"Indian/Maldives":["MV","TF"],"Asia/Kuching":["MY","BN"],"Africa/Maputo":["MZ","BI","BW","CD","MW","RW","ZM","ZW"],"Africa/Lagos":["NG","AO","BJ","CD","CF","CG","CM","GA","GQ","NE"],"Pacific/Auckland":["NZ","AQ"],"America/Panama":["PA","CA","KY"],"Pacific/Port_Moresby":["PG","AQ","FM"],"America/Puerto_Rico":["PR","AG","CA","AI","AW","BL","BQ","CW","DM","GD","GP","KN","LC","MF","MS","SX","TT","VC","VG","VI"],"Asia/Qatar":["QA","BH"],"Europe/Belgrade":["RS","BA","HR","ME","MK","SI"],"Europe/Simferopol":["RU","UA"],"Asia/Riyadh":["SA","AQ","KW","YE"],"Pacific/Guadalcanal":["SB","FM"],"Asia/Singapore":["SG","AQ","MY"],"Asia/Bangkok":["TH","CX","KH","LA","VN"],"America/Phoenix":["US","CA"],"Africa/Johannesburg":["ZA","LS","SZ"]};

function ambiguousTimeZoneIpCountry(request: Request, timeZone: string): string | null {
  const countries = TIME_ZONE_COUNTRY_OPTIONS[timeZone];
  if (!countries || countries.length < 2) return null;
  const country = String((request as Request & { cf?: { country?: unknown } }).cf?.country || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) && countries.includes(country) ? country : null;
}

registerRankCharacterRoutes(app);
registerPlinkoLiveRoutes(app);

app.get('/app/api/location-country', (c) => {
  const timeZone = String(c.req.query('timeZone') || '').trim().slice(0, 64);
  return c.json({ country: ambiguousTimeZoneIpCountry(c.req.raw, timeZone) }, 200, { 'cache-control': 'no-store' });
});

app.post('/app/api/share-invite', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as { initData?: unknown; countryCode?: unknown };
    const userId = await validateTelegramInitData(body.initData, gameBotToken(c.env));
    const photoFileId = await getShareInviteImageFileId(c.env);
    if (!photoFileId) return c.json({ error: 'The invite image has not been uploaded yet.' }, 409, { 'cache-control': 'no-store' });

    const countryCode = String(body.countryCode || '').trim().toUpperCase().slice(0, 2);
    const response = await fetch(`https://api.telegram.org/bot${gameBotToken(c.env)}/savePreparedInlineMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        user_id: Number(userId),
        result: {
          type: 'photo',
          id: 'vexa-game-invite',
          photo_file_id: photoFileId,
          caption: vexaTextForCountry(SHARE_INVITE_TEXT, countryCode),
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[{
              text: vexaTextForCountry(SHARE_INVITE_BUTTON_TEXT, countryCode),
              url: VEXA_APP_DEEP_LINK,
            }]],
          },
        },
        allow_user_chats: true,
        allow_bot_chats: true,
        allow_group_chats: true,
        allow_channel_chats: true,
      }),
    });
    const data = await response.json().catch(() => ({})) as { ok?: boolean; result?: { id?: unknown }; description?: unknown };
    const id = String(data.result?.id || '');
    if (!response.ok || !data.ok || !id) throw new Error(String(data.description || 'Could not prepare invite'));
    return c.json({ id }, 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not prepare invite' }, 400, { 'cache-control': 'no-store' });
  }
});

app.get('/app/api/plinko-control', async (c) => c.json(await getPlinkoControlPayload(c.env)));
app.post('/app/api/plinko/round', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as { initData?: unknown; amount?: unknown; rows?: unknown; risk?: unknown };
    const userId = await validateTelegramInitData(body.initData, gameBotToken(c.env));
    const amount = cleanPlinkoAmount(body.amount);
    const rows = cleanPlinkoRows(body.rows);
    const risk = cleanPlinkoRisk(body.risk);
    const control = await getPlinkoControl(c.env);
    if (control.enabled === false) throw new Error('Plinko is disabled');
    const item = control.rows[String(rows) as '8' | '12' | '16'][risk];
    const targetBinIndex = chooseWeightedIndex(item.weights);
    const path = buildPlinkoPath(rows, targetBinIndex);
    const multiplier = roundPlinkoAmount(item.multipliers[targetBinIndex] || 0);
    const total = roundPlinkoAmount(amount * multiplier);
    const roundId = 'plinko_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    const controls = await settleGameTonBalanceRound(
      c.env,
      userId,
      Math.round(amount * NANO_PER_TON),
      Math.round(total * NANO_PER_TON),
      {
        referenceId: roundId,
        referenceType: 'plinko_round',
        metadata: { section: 'plinko', rows, risk, multiplier, targetBinIndex, path: path.join(''), amount, total },
      },
    );
    return c.json({
      ok: true,
      roundId,
      targetBinIndex,
      path,
      multiplier,
      multipliers: item.multipliers,
      controlUpdatedAt: control.updatedAt,
      amount,
      total,
      tonBalanceNano: controls.tonBalanceNano,
    }, 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not play Plinko round' }, 400, { 'cache-control': 'no-store' });
  }
});
app.get('/app/api/plinko-virtual-users', async (c) => c.json(await getPlinkoVirtualUsers(c.env)));
app.get('/app/api/slot-virtual-users', async (c) => c.json(await getSlotVirtualUsers(c.env)));

app.get('/app/api/plinko-control-image/:kind', async (c) => {
  const kind = normalizePlinkoControlImageKind(c.req.param('kind'));
  const object = await c.env.ASSETS.get(plinkoControlImageKey(kind)).catch(() => null);
  if (!object) return new Response(defaultPlinkoControlImageSvg(kind), { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': HOME_IMAGE_CACHE_CONTROL } });
  return new Response(object.body, { headers: { 'content-type': object.httpMetadata?.contentType || 'image/png', 'cache-control': HOME_IMAGE_CACHE_CONTROL } });
});

app.get('/app/api/ghost-run-asset/:kind', async (c) => {
  const kind = normalizeGhostRunAssetKind(c.req.param('kind'));
  const object = await c.env.ASSETS.get(ghostRunAssetKey(kind)).catch(() => null);
  if (!object) return new Response(defaultGhostRunAssetSvg(kind), { headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': GHOST_RUN_ASSET_CACHE_CONTROL } });
  return new Response(object.body, { headers: { 'content-type': object.httpMetadata?.contentType || 'image/png', 'cache-control': GHOST_RUN_ASSET_CACHE_CONTROL } });
});

app.get('/app/api/ghost-run-assets', async (c) => {
  const manifest = await getGhostRunAssetManifest(c.env);
  return c.json(manifest, 200, { 'cache-control': GHOST_RUN_ASSET_MANIFEST_CACHE_CONTROL });
});

app.get('/app/api/main-bot', async (c) => {
  try {
    const webhook = await setTelegramWebhook(c.env).catch((error) => ({ ok: false, description: error instanceof Error ? error.message : 'Could not sync webhook' }));
    const me = await telegram<{ ok: boolean; result?: { username?: string; first_name?: string }; description?: string }>(c.env.TELEGRAM_BOT_TOKEN, 'getMe', {});
    if (!me.ok || !me.result?.username) return c.json({ error: me.description || 'Main bot username not found' }, 502);
    if (!webhook.ok) console.warn('main bot webhook sync failed before group add', webhook.description);
    return c.json({ username: me.result.username, title: me.result.first_name || 'Vexa', addGroupUrl: `https://t.me/${me.result.username}?startgroup=true`, webhook });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not load main bot' }, 502);
  }
});

app.post('/app/api/stars/deposits', async (c) => {
  try {
    const body = await c.req.json() as { userId?: unknown; initData?: unknown; stars?: unknown };
    const userId = await validateTelegramInitData(body.initData, gameBotToken(c.env));
    if (userId !== String(body.userId || '').trim()) throw new Error('Telegram user mismatch');
    return c.json(await createStarsDeposit(c.env, userId, body.stars));
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not create Stars deposit' }, 400);
  }
});

app.get('/app/api/stars/deposits', async (c) => {
  try {
    const claimedUserId = String(c.req.query('userId') || '').trim();
    if (!claimedUserId) {
      return c.json({ deposits: [], rate: await getStarsGramRate() }, 200, { 'cache-control': 'no-store' });
    }
    const initData = c.req.header('x-telegram-init-data') || c.req.query('initData') || '';
    const userId = await validateTelegramInitData(initData, gameBotToken(c.env));
    if (userId !== claimedUserId) throw new Error('Telegram user mismatch');
    return c.json(await listUserStarsDeposits(c.env, userId), 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not load Stars deposits' }, 400, { 'cache-control': 'no-store' });
  }
});

app.post('/app/api/ton/withdrawals', async (c) => {
  try {
    const body = await c.req.json() as { initData?: unknown; amountGram?: unknown; amountTon?: unknown; walletAddress?: unknown };
    const userId = await validateTelegramInitData(body.initData, gameBotToken(c.env));
    return c.json(await createTonWithdrawal(c.env, userId, body.amountGram ?? body.amountTon, body.walletAddress));
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not create Gram withdrawal' }, 400);
  }
});

app.get('/app/api/ton/withdrawals', async (c) => {
  try {
    const initData = c.req.header('x-telegram-init-data') || c.req.query('initData') || '';
    const userId = await validateTelegramInitData(initData, gameBotToken(c.env));
    return c.json(await listUserTonWithdrawals(c.env, userId));
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not load Gram withdrawals' }, 400);
  }
});

app.get('/app/api/ton/history', async (c) => {
  try {
    const initData = c.req.header('x-telegram-init-data') || c.req.query('initData') || '';
    const userId = await validateTelegramInitData(initData, gameBotToken(c.env));
    const limit = Number(c.req.query('limit') || 50);
    const walletOnly = String(c.req.query('wallet') || '') === '1';
    const result = walletOnly
      ? await listUserTonWalletTransactions(c.env, userId, limit)
      : await listUserTonTransactions(c.env, userId, limit);
    return c.json(result, 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not load history' }, 400, { 'cache-control': 'no-store' });
  }
});

app.post('/app/api/ton/deposits', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as { initData?: unknown; amountTon?: unknown; walletAddress?: unknown };
    const userId = await validateTelegramInitData(body.initData, gameBotToken(c.env));
    return c.json(await createTonDeposit(c.env, userId, body.amountTon, body.walletAddress), 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not create Gram deposit' }, 400, { 'cache-control': 'no-store' });
  }
});

app.get('/app/api/ton/deposits', async (c) => {
  try {
    const initData = c.req.header('x-telegram-init-data') || c.req.query('initData') || '';
    const userId = await validateTelegramInitData(initData, gameBotToken(c.env));
    return c.json(await listUserTonDeposits(c.env, userId), 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not load Gram deposits' }, 400, { 'cache-control': 'no-store' });
  }
});

app.get('/app/api/ton/deposits/:id', async (c) => {
  try {
    const initData = c.req.header('x-telegram-init-data') || c.req.query('initData') || '';
    const userId = await validateTelegramInitData(initData, gameBotToken(c.env));
    const deposit = await getTonDeposit(c.env, userId, c.req.param('id'));
    return deposit ? c.json(deposit, 200, { 'cache-control': 'no-store' }) : c.json({ error: 'Deposit not found' }, 404, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not load Gram deposit' }, 400, { 'cache-control': 'no-store' });
  }
});

app.post('/app/api/ton/deposits/:id/verify', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as { initData?: unknown };
    const initData = body.initData || c.req.header('x-telegram-init-data') || '';
    const userId = await validateTelegramInitData(initData, gameBotToken(c.env));
    return c.json(await verifyTonDeposit(c.env, userId, c.req.param('id')), 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not verify Gram deposit' }, 400, { 'cache-control': 'no-store' });
  }
});

app.post('/app/api/usdt/deposits', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as { initData?: unknown; network?: unknown; amountUsdt?: unknown };
    const userId = await validateTelegramInitData(body.initData, gameBotToken(c.env));
    return c.json(await createUsdtDeposit(c.env, userId, body.network, body.amountUsdt), 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not create USDT deposit' }, 400, { 'cache-control': 'no-store' });
  }
});

app.post('/app/api/usdt/deposits/:id/verify', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({})) as { initData?: unknown };
    const initData = body.initData || c.req.header('x-telegram-init-data') || '';
    const userId = await validateTelegramInitData(initData, gameBotToken(c.env));
    return c.json(await verifyUsdtDeposit(c.env, userId, c.req.param('id')), 200, { 'cache-control': 'no-store' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not verify USDT deposit' }, 400, { 'cache-control': 'no-store' });
  }
});

app.get('/app/api/bots/:id/groups', async (c) => {
  try {
    const userId = cleanTelegramUserId(c.req.query('userId'));
    const claim = c.req.query('claim') === '1';
    if (!userId) return c.json({ groups: [] });
    await c.env.DB.prepare('ALTER TABLE bot_groups ADD COLUMN added_by_user_id TEXT').run().catch(() => undefined);
    await c.env.DB.prepare('ALTER TABLE bot_groups ADD COLUMN added_by_username TEXT').run().catch(() => undefined);
    await c.env.DB.prepare('ALTER TABLE bot_groups ADD COLUMN added_by_first_name TEXT').run().catch(() => undefined);
    await c.env.DB.prepare('ALTER TABLE bot_groups ADD COLUMN ton_spent_nano INTEGER NOT NULL DEFAULT 0').run().catch(() => undefined);
    const rows = await c.env.DB.prepare(`SELECT chat_id AS chatId, chat_type AS type, title, username, first_seen_at AS firstSeenAt, last_seen_at AS lastSeenAt, COALESCE(ton_spent_nano, 0) AS tonSpentNano
      FROM bot_groups
      WHERE bot_id = ?
        AND (added_by_user_id = ? OR (? = 1 AND (added_by_user_id IS NULL OR added_by_user_id = '')))
      ORDER BY datetime(last_seen_at) DESC
      LIMIT 50`)
      .bind(c.req.param('id'), userId, claim ? 1 : 0)
      .all<{ chatId: string; type: string; title: string | null; username: string | null; firstSeenAt: string; lastSeenAt: string; tonSpentNano: number }>();
    return c.json({ groups: (rows.results ?? []).map((group) => ({ ...group, tonSpent: Number(group.tonSpentNano || 0) / 1_000_000_000 })) });
  } catch (error) {
    console.warn('load bot groups failed', error);
    return c.json({ groups: [], warning: 'Could not load bot groups from D1.' });
  }
});

app.delete('/app/api/groups/:chatId/leave', async (c) => {
  const chatId = c.req.param('chatId');
  try {
    const body = await c.req.json().catch(() => ({})) as { userId?: unknown };
    const userId = cleanTelegramUserId(body.userId);
    if (!userId) return c.json({ error: 'Missing userId' }, 400);
    const owner = await c.env.DB.prepare("SELECT added_by_user_id FROM bot_groups WHERE bot_id = 'main' AND chat_id = ?")
      .bind(chatId)
      .first<{ added_by_user_id: string | null }>();
    if (String(owner?.added_by_user_id || '') !== userId) return c.json({ error: 'Group is not connected to this user.' }, 403);
    await telegram(c.env.TELEGRAM_BOT_TOKEN, 'leaveChat', { chat_id: chatId }).catch((error: unknown) => console.warn('main bot leave group failed', error));
    await c.env.DB.prepare("DELETE FROM bot_groups WHERE bot_id = 'main' AND chat_id = ? AND added_by_user_id = ?").bind(chatId, userId).run().catch(() => undefined);
    return c.json({ ok: true, chatId });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Could not leave group' }, 400);
  }
});

app.get('/app/api/crash-tip-image.png', async (c) => imageFromR2(c.env, CRASH_TIP_IMAGE_KEY, HOME_IMAGE_CACHE_CONTROL));
app.get('/app/api/uploaded-image/mines-safe.png', async (c) => imageFromR2(c.env, 'mines-tile/safe'));
app.get('/app/api/uploaded-image/mines-bomb.png', async (c) => imageFromR2(c.env, 'mines-tile/bomb'));

async function imageFromR2(env: Env, key: string, cacheControl = IMAGE_CACHE_CONTROL): Promise<Response> {
  const object = await env.ASSETS.get(key).catch(() => null);
  if (!object) return new Response('', { status: 204, headers: { 'cache-control': 'no-store' } });
  return new Response(object.body, { headers: { 'content-type': object.httpMetadata?.contentType || 'image/png', 'cache-control': cacheControl } });
}

async function getPlinkoControlPayload(env: Env) {
  return getPlinkoControl(env);
}

function cleanPlinkoAmount(value: unknown): number {
  const amount = roundPlinkoAmount(value);
  if (!Number.isFinite(amount) || amount < 0.01) throw new Error('Minimum amount is 0.01');
  if (amount > 1_000_000) throw new Error('Invalid Plinko amount');
  return amount;
}

function roundPlinkoAmount(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round((Math.max(0, number) + Number.EPSILON) * 100) / 100;
}

function cleanPlinkoRows(value: unknown): 8 | 12 | 16 {
  const rows = Number(value);
  if (rows !== 8 && rows !== 12 && rows !== 16) throw new Error('Invalid Plinko rows');
  return rows;
}

function cleanPlinkoRisk(value: unknown): 'low' | 'medium' | 'high' {
  const risk = String(value || '').trim().toLowerCase();
  if (risk === 'easy' || risk === 'low') return 'low';
  if (risk === 'medium') return 'medium';
  if (risk === 'hard' || risk === 'high') return 'high';
  throw new Error('Invalid Plinko risk');
}

function chooseWeightedIndex(weights: number[]): number {
  const safeWeights = Array.isArray(weights) ? weights.map((value) => Math.max(0, Number(value) || 0)) : [];
  const total = safeWeights.reduce((sum, value) => sum + value, 0);
  if (!safeWeights.length || total <= 0) throw new Error('Invalid Plinko configuration');
  let roll = secureRandomUnit() * total;
  for (let index = 0; index < safeWeights.length; index += 1) {
    roll -= safeWeights[index];
    if (roll <= 0) return index;
  }
  return safeWeights.length - 1;
}

function buildPlinkoPath(rows: 8 | 12 | 16, targetBinIndex: number): number[] {
  if (!Number.isInteger(targetBinIndex) || targetBinIndex < 0 || targetBinIndex > rows) {
    throw new Error('Invalid Plinko target');
  }

  const path: number[] = [];
  let rightsRemaining = targetBinIndex;
  for (let step = 0; step < rows; step += 1) {
    const stepsRemaining = rows - step;
    const goRight = rightsRemaining > 0 && secureRandomInt(stepsRemaining) < rightsRemaining;
    path.push(goRight ? 1 : 0);
    if (goRight) rightsRemaining -= 1;
  }
  return path;
}

function secureRandomUnit(): number {
  const values = new Uint32Array(2);
  crypto.getRandomValues(values);
  return (values[0] * 2_097_152 + (values[1] >>> 11)) / 9_007_199_254_740_992;
}

function secureRandomInt(maxExclusive: number): number {
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 4_294_967_296) {
    throw new Error('Invalid secure random range');
  }
  const limit = Math.floor(4_294_967_296 / maxExclusive) * maxExclusive;
  const values = new Uint32Array(1);
  do {
    crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return values[0] % maxExclusive;
}

function normalizePlinkoControlImageKind(value: string): 'drop' | 'input' | 'house' {
  const clean = String(value || '').replace(/\.png$/i, '');
  return PLINKO_CONTROL_IMAGE_KINDS.has(clean) ? clean as 'drop' | 'input' | 'house' : 'drop';
}

function plinkoControlImageKey(kind: 'drop' | 'input' | 'house'): string {
  return `plinko-control/${kind}`;
}

function defaultPlinkoControlImageSvg(kind: 'drop' | 'input' | 'house'): string {
  if (kind === 'house') {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 748 96"><rect width="748" height="96" fill="none"/><g fill="none" stroke="#ffffff" stroke-opacity=".34" stroke-width="3"><rect x="2" y="6" width="50" height="84" rx="16"/><rect x="55" y="6" width="50" height="84" rx="16"/><rect x="108" y="6" width="50" height="84" rx="16"/><rect x="161" y="6" width="50" height="84" rx="16"/><rect x="214" y="6" width="50" height="84" rx="16"/><rect x="267" y="6" width="50" height="84" rx="16"/><rect x="320" y="6" width="50" height="84" rx="16"/><rect x="373" y="6" width="50" height="84" rx="16"/><rect x="426" y="6" width="50" height="84" rx="16"/><rect x="479" y="6" width="50" height="84" rx="16"/><rect x="532" y="6" width="50" height="84" rx="16"/><rect x="585" y="6" width="50" height="84" rx="16"/><rect x="638" y="6" width="50" height="84" rx="16"/><rect x="691" y="6" width="50" height="84" rx="16"/></g></svg>';
  }
  if (kind === 'input') {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 748 96"><rect width="748" height="96" fill="none"/><rect x="0" y="0" width="170" height="96" rx="30" fill="#1d1d1d" stroke="#565656" stroke-width="3"/><rect x="190" y="0" width="368" height="96" rx="30" fill="#343434" stroke="#6a6a6a" stroke-width="3"/><rect x="578" y="0" width="170" height="96" rx="30" fill="#1d1d1d" stroke="#565656" stroke-width="3"/><text x="85" y="58" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="800">1/2</text><text x="374" y="58" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="800">1</text><text x="663" y="58" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="800">2x</text></svg>';
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 748 96"><rect width="748" height="96" fill="none"/><rect x="0" y="0" width="748" height="96" rx="30" fill="#191919" stroke="#4d4d4d" stroke-width="3"/><text x="374" y="59" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="34" font-weight="800">Drop Ball</text></svg>';
}

function cleanTelegramUserId(value: unknown): string {
  return String(value || '').replace(/[^0-9]/g, '').slice(0, 32);
}

async function telegram<T>(token: string, method: string, payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return await response.json() as T;
}

export { PlinkoLiveRoom };

export default app;

function normalizeGhostRunAssetKind(value: string): string {
  const clean = String(value || '').replace(/\.png$/i, '').trim().toLowerCase();
  if (!GHOST_RUN_ASSET_KINDS.has(clean)) throw new Error('Invalid Ghost Run asset kind.');
  return clean;
}

function ghostRunAssetKey(kind: string): string {
  return `ghost-run-assets/${kind}`;
}

async function getGhostRunAssetManifest(env: Env): Promise<{ ok: true; urls: Record<string, string> }> {
  const kinds = Array.from(GHOST_RUN_ASSET_KINDS);
  const heads = await Promise.all(kinds.map((kind) => env.ASSETS.head(ghostRunAssetKey(kind)).catch(() => null)));
  const urls: Record<string, string> = {};
  kinds.forEach((kind, index) => {
    const head = heads[index];
    const version = head?.customMetadata?.version || head?.uploaded?.getTime?.() || 'default';
    urls[kind] = `/app/api/ghost-run-asset/${kind}.png?v=${encodeURIComponent(String(version))}`;
  });
  return { ok: true, urls };
}

function defaultGhostRunAssetSvg(kind: string): string {
  if (kind === 'background' || kind === 'background1') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#05030a"/><stop offset=".58" stop-color="#100611"/><stop offset="1" stop-color="#030102"/></linearGradient><radialGradient id="r" cx="50%" cy="18%" r="58%"><stop stop-color="#4b0819" stop-opacity=".46"/><stop offset="1" stop-color="#4b0819" stop-opacity="0"/></radialGradient></defs><rect width="900" height="520" fill="url(#g)"/><rect width="900" height="520" fill="url(#r)"/><g fill="#fff" opacity=".36"><circle cx="72" cy="84" r="1.2"/><circle cx="156" cy="49" r="1.5"/><circle cx="263" cy="116" r="1.3"/><circle cx="369" cy="62" r="1.1"/><circle cx="522" cy="136" r="1.4"/><circle cx="684" cy="52" r="1.2"/><circle cx="819" cy="109" r="1.5"/></g></svg>`;
  if (kind === 'background2' || kind === 'background3' || kind === 'background4' || kind === 'background5' || kind === 'background6') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 520" preserveAspectRatio="xMidYMid slice"><rect width="900" height="520" fill="transparent"/></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 220"></svg>`;
}
