from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    source = p.read_text()
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one target, found {count}')
    p.write_text(source.replace(old, new, 1))


# Let the existing checker represent an enabled App gate even before Telegram
# initData is available. This keeps the same single membership path.
replace_once(
    'src/mandatory-channel.ts',
    "export async function getMandatoryChannelAccess(env: Env, userId: string | number, surface?: MandatoryChannelSurface): Promise<MandatoryChannelAccess> {",
    "export async function getMandatoryChannelAccess(env: Env, userId: string | number | null | undefined, surface?: MandatoryChannelSurface): Promise<MandatoryChannelAccess> {",
)
replace_once(
    'src/mandatory-channel.ts',
    "  const channel = { title: config.title, username: config.username, joinUrl: config.joinUrl };\n  try {\n    const member = await telegramResult<TelegramMemberInfo>(env, 'getChatMember', {\n      chat_id: telegramChatTarget(config.chatId),\n      user_id: Number(userId),\n    });",
    "  const channel = { title: config.title, username: config.username, joinUrl: config.joinUrl };\n  const numericUserId = Number(userId);\n  if (!Number.isSafeInteger(numericUserId) || numericUserId <= 0) {\n    return { required: true, joined: false, verificationError: true, channel };\n  }\n  try {\n    const member = await telegramResult<TelegramMemberInfo>(env, 'getChatMember', {\n      chat_id: telegramChatTarget(config.chatId),\n      user_id: numericUserId,\n    });",
)

# Keep the same endpoint. If Telegram session verification is temporarily not
# ready, return the actual App requirement fail-closed instead of a silent 401.
replace_once(
    'src/index-with-plinko-live.ts',
    "      } catch (error) {\n        return Response.json({ error: error instanceof Error ? error.message : 'Could not verify channel membership' }, { status: 401, headers: { 'cache-control': 'no-store' } });\n      }",
    "      } catch {\n        return Response.json({ ok: true, ...(await getMandatoryChannelAccess(runtimeEnv, null, 'app')) }, { headers: { 'cache-control': 'no-store' } });\n      }",
)

# The existing gate must never silently unlock just because initData is late or
# the Telegram WebView was classified as ordinary web during startup.
replace_once(
    'src/miniapp/mandatory-channel-gate.ts',
    "  function check(interactive){\n    var initData=String(tg&&tg.initData||'').trim();\n    if(!initData){\n      if(document.documentElement.classList.contains('vexa-web')){clearRetry();unlock();return Promise.resolve(false)}\n      scheduleRetry();return Promise.resolve(false)\n    }\n    if(checking)return Promise.resolve(false);",
    "  function check(interactive){\n    var initData=String(tg&&tg.initData||'').trim();\n    if(!initData)scheduleRetry();\n    if(checking)return Promise.resolve(false);",
)
replace_once(
    'src/miniapp/mandatory-channel-gate.ts',
    "      .then(function(data){\n        clearRetry();\n        if(!data||data.required!==true||data.joined===true){unlock();return true}\n        render(data);if(interactive){var c=copy[locale()]||copy.en;q('vexaMandatoryChannelStatus').textContent=c.notJoined}return false;\n      })",
    "      .then(function(data){\n        if(data&&data.verificationError===true)scheduleRetry();else clearRetry();\n        if(!data||data.required!==true||data.joined===true){unlock();return true}\n        render(data);if(interactive){var c=copy[locale()]||copy.en;q('vexaMandatoryChannelStatus').textContent=c.notJoined}return false;\n      })",
)
