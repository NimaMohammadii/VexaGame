from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    source = p.read_text()
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one target, found {count}')
    p.write_text(source.replace(old, new, 1))


def replace_count(path: str, old: str, new: str, expected: int) -> None:
    p = Path(path)
    source = p.read_text()
    count = source.count(old)
    if count != expected:
        raise SystemExit(f'{path}: expected {expected} targets, found {count}')
    p.write_text(source.replace(old, new))

# Shared mandatory-channel config: add a single scope field and keep old configs as "both".
replace_once(
    'src/mandatory-channel.ts',
    "export type MandatoryChannelConfig = {\n  enabled: boolean;\n  chatId: string;",
    "export type MandatoryChannelSurface = 'app' | 'bot';\nexport type MandatoryChannelScope = MandatoryChannelSurface | 'both';\n\nexport type MandatoryChannelConfig = {\n  enabled: boolean;\n  scope: MandatoryChannelScope;\n  chatId: string;",
)
replace_once(
    'src/mandatory-channel.ts',
    "    return {\n      enabled: parsed.enabled === true,\n      chatId,",
    "    const scope: MandatoryChannelScope = parsed.scope === 'app' || parsed.scope === 'bot' || parsed.scope === 'both' ? parsed.scope : 'both';\n    return {\n      enabled: parsed.enabled === true,\n      scope,\n      chatId,",
)
replace_once(
    'src/mandatory-channel.ts',
    "export async function resolveMandatoryChannel(env: Env, input: string): Promise<MandatoryChannelConfig> {\n  const target = normalizeChannelInput(input);",
    "export async function setMandatoryChannelScope(env: Env, scope: MandatoryChannelScope): Promise<MandatoryChannelConfig> {\n  const current = await getMandatoryChannelConfig(env);\n  if (!current) throw new Error('ابتدا کانال را تنظیم کنید.');\n  const next = { ...current, scope, updatedAt: new Date().toISOString() };\n  await saveMandatoryChannelConfig(env, next);\n  return next;\n}\n\nexport async function resolveMandatoryChannel(env: Env, input: string): Promise<MandatoryChannelConfig> {\n  const current = await getMandatoryChannelConfig(env);\n  const target = normalizeChannelInput(input);",
)
replace_once(
    'src/mandatory-channel.ts',
    "  return {\n    enabled: true,\n    chatId,",
    "  return {\n    enabled: true,\n    scope: current?.scope ?? 'both',\n    chatId,",
)
replace_once(
    'src/mandatory-channel.ts',
    "export async function getMandatoryChannelAccess(env: Env, userId: string | number): Promise<MandatoryChannelAccess> {\n  const config = await getMandatoryChannelConfig(env);\n  if (!config?.enabled) return { required: false, joined: true, verificationError: false, channel: null };",
    "export async function getMandatoryChannelAccess(env: Env, userId: string | number, surface?: MandatoryChannelSurface): Promise<MandatoryChannelAccess> {\n  const config = await getMandatoryChannelConfig(env);\n  if (!config?.enabled) return { required: false, joined: true, verificationError: false, channel: null };\n  if (surface && config.scope !== 'both' && config.scope !== surface) {\n    return { required: false, joined: true, verificationError: false, channel: null };\n  }",
)

# Admin controls: keep global on/off and add App/Bot/Both selection in the same menu.
replace_once(
    'src/telegram-mandatory-channel-admin.ts',
    "import { getMandatoryChannelConfig, resolveMandatoryChannel, saveMandatoryChannelConfig, setMandatoryChannelEnabled } from './mandatory-channel';",
    "import { getMandatoryChannelConfig, resolveMandatoryChannel, saveMandatoryChannelConfig, setMandatoryChannelEnabled, setMandatoryChannelScope } from './mandatory-channel';",
)
replace_once(
    'src/telegram-mandatory-channel-admin.ts',
    "    && data !== 'botadmin:mandatorychannel:on'\n    && data !== 'botadmin:mandatorychannel:off') return null;",
    "    && data !== 'botadmin:mandatorychannel:on'\n    && data !== 'botadmin:mandatorychannel:off'\n    && data !== 'botadmin:mandatorychannel:scope:app'\n    && data !== 'botadmin:mandatorychannel:scope:bot'\n    && data !== 'botadmin:mandatorychannel:scope:both') return null;",
)
replace_once(
    'src/telegram-mandatory-channel-admin.ts',
    "    if (data === 'botadmin:mandatorychannel:on') await setMandatoryChannelEnabled(env, true);\n    if (data === 'botadmin:mandatorychannel:off') await setMandatoryChannelEnabled(env, false);\n    await sendMenu(env, token, chatId, messageId);",
    "    if (data === 'botadmin:mandatorychannel:on') await setMandatoryChannelEnabled(env, true);\n    if (data === 'botadmin:mandatorychannel:off') await setMandatoryChannelEnabled(env, false);\n    if (data === 'botadmin:mandatorychannel:scope:app') await setMandatoryChannelScope(env, 'app');\n    if (data === 'botadmin:mandatorychannel:scope:bot') await setMandatoryChannelScope(env, 'bot');\n    if (data === 'botadmin:mandatorychannel:scope:both') await setMandatoryChannelScope(env, 'both');\n    await sendMenu(env, token, chatId, messageId);",
)
replace_once(
    'src/telegram-mandatory-channel-admin.ts',
    "  const enabled = config?.enabled === true;\n  const lines = config\n    ? [\n      `وضعیت: ${enabled ? '🟢 فعال' : '⚪️ غیرفعال'}`,\n      `کانال: ${config.title}`,\n      `آیدی: ${config.username ? '@' + config.username : config.chatId}`,\n    ]",
    "  const enabled = config?.enabled === true;\n  const scope = config?.scope ?? 'both';\n  const scopeLabel = scope === 'app' ? 'فقط Mini App' : scope === 'bot' ? 'فقط منوی ربات' : 'Mini App و ربات';\n  const lines = config\n    ? [\n      `وضعیت: ${enabled ? '🟢 فعال' : '⚪️ غیرفعال'}`,\n      `اعمال روی: ${scopeLabel}`,\n      `کانال: ${config.title}`,\n      `آیدی: ${config.username ? '@' + config.username : config.chatId}`,\n    ]",
)
replace_once(
    'src/telegram-mandatory-channel-admin.ts',
    "  if (config) rows.push([{ text: enabled ? '⏸ غیرفعال کردن' : '▶️ فعال کردن', callback_data: enabled ? 'botadmin:mandatorychannel:off' : 'botadmin:mandatorychannel:on' }]);\n  rows.push([",
    "  if (config) {\n    rows.push([\n      { text: `${scope === 'app' ? '✓ ' : ''}📱 فقط App`, callback_data: 'botadmin:mandatorychannel:scope:app' },\n      { text: `${scope === 'bot' ? '✓ ' : ''}🤖 فقط ربات`, callback_data: 'botadmin:mandatorychannel:scope:bot' },\n    ]);\n    rows.push([{ text: `${scope === 'both' ? '✓ ' : ''}🔗 هر دو`, callback_data: 'botadmin:mandatorychannel:scope:both' }]);\n    rows.push([{ text: enabled ? '⏸ غیرفعال کردن' : '▶️ فعال کردن', callback_data: enabled ? 'botadmin:mandatorychannel:off' : 'botadmin:mandatorychannel:on' }]);\n  }\n  rows.push([",
)

# Bot gate uses only the bot scope.
replace_count(
    'src/telegram-game-bot.ts',
    "getMandatoryChannelAccess(env, q.from.id)",
    "getMandatoryChannelAccess(env, q.from.id, 'bot')",
    1,
)
replace_count(
    'src/telegram-game-bot.ts',
    "getMandatoryChannelAccess(env, userId)",
    "getMandatoryChannelAccess(env, userId, 'bot')",
    1,
)

# Mini App endpoint uses only the app scope.
replace_once(
    'src/index-with-plinko-live.ts',
    "return Response.json({ ok: true, ...(await getMandatoryChannelAccess(runtimeEnv, userId)) }, { headers: { 'cache-control': 'no-store' } });",
    "return Response.json({ ok: true, ...(await getMandatoryChannelAccess(runtimeEnv, userId, 'app')) }, { headers: { 'cache-control': 'no-store' } });",
)

# Existing Mini App gate: do not silently give up on the first failed/too-early check.
replace_once(
    'src/miniapp/mandatory-channel-gate.ts',
    "  var checking=false,current=null,lastCheckAt=0;",
    "  var checking=false,current=null,lastCheckAt=0,retryTimer=null,retryCount=0;",
)
replace_once(
    'src/miniapp/mandatory-channel-gate.ts',
    "  function check(interactive){\n    var initData=String(tg&&tg.initData||'').trim();if(!initData){unlock();return Promise.resolve(false)}",
    "  function scheduleRetry(){\n    if(retryTimer)return;\n    retryCount=Math.min(retryCount+1,6);\n    var delay=Math.min(3200,300*Math.pow(1.65,retryCount-1));\n    retryTimer=setTimeout(function(){retryTimer=null;check(false)},delay);\n  }\n  function clearRetry(){retryCount=0;if(retryTimer){clearTimeout(retryTimer);retryTimer=null}}\n  function check(interactive){\n    var initData=String(tg&&tg.initData||'').trim();\n    if(!initData){\n      if(document.documentElement.classList.contains('vexa-web')){clearRetry();unlock();return Promise.resolve(false)}\n      scheduleRetry();return Promise.resolve(false)\n    }",
)
replace_once(
    'src/miniapp/mandatory-channel-gate.ts',
    "      .then(function(data){\n        if(!data||data.required!==true||data.joined===true){unlock();return true}\n        render(data);if(interactive){var c=copy[locale()]||copy.en;q('vexaMandatoryChannelStatus').textContent=c.notJoined}return false;\n      })\n      .catch(function(){\n        if(current){render(current);var c=copy[locale()]||copy.en;q('vexaMandatoryChannelStatus').textContent=c.notJoined}\n        return false;\n      })",
    "      .then(function(data){\n        clearRetry();\n        if(!data||data.required!==true||data.joined===true){unlock();return true}\n        render(data);if(interactive){var c=copy[locale()]||copy.en;q('vexaMandatoryChannelStatus').textContent=c.notJoined}return false;\n      })\n      .catch(function(){\n        scheduleRetry();\n        if(current){render(current);var c=copy[locale()]||copy.en;q('vexaMandatoryChannelStatus').textContent=c.notJoined}\n        return false;\n      })",
)
