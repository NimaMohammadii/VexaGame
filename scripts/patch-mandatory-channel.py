from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    source = p.read_text()
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one target, found {count}')
    p.write_text(source.replace(old, new, 1))


replace_once(
    'src/telegram-game-bot.ts',
    "import { getMainMenuMedia } from './share-invite-config';\n",
    "import { getMainMenuMedia } from './share-invite-config';\nimport { getMandatoryChannelAccess, MANDATORY_CHANNEL_TEXT } from './mandatory-channel';\n",
)
replace_once(
    'src/telegram-game-bot.ts',
    "  if (update.callback_query) {\n    if (await handleBotAdminCallback(env, token, update.callback_query, telegram as TelegramApi)) return;\n    if (await handleUserRegionCallback(env, token, update.callback_query)) return;\n",
    "  if (update.callback_query) {\n    if (await handleBotAdminCallback(env, token, update.callback_query, telegram as TelegramApi)) return;\n    if (await handleMandatoryChannelCallback(env, token, update.callback_query)) return;\n    if (await handleUserRegionCallback(env, token, update.callback_query)) return;\n",
)
replace_once(
    'src/telegram-game-bot.ts',
    "    await sendGameHome(env, token, message.chat.id, menuCommand ? null : undefined, telegramLanguageCode(message.from));\n    if (menuCommand) await deletePreviousMenuMessage(token, message.chat.id, previousMenuMessageId);\n",
    "    const userId = message.from?.id ?? message.chat.id;\n    const languageCode = telegramLanguageCode(message.from);\n    if (await enforceMandatoryChannelBotGate(env, token, message.chat.id, userId, menuCommand ? null : undefined, languageCode)) {\n      if (menuCommand) await deletePreviousMenuMessage(token, message.chat.id, previousMenuMessageId);\n      return;\n    }\n    await sendGameHome(env, token, message.chat.id, menuCommand ? null : undefined, languageCode);\n    if (menuCommand) await deletePreviousMenuMessage(token, message.chat.id, previousMenuMessageId);\n",
)
replace_once(
    'src/telegram-game-bot.ts',
    "  const preference = await setUserRegionPreference(env, q.from.id, countryCode);\n  await telegram(token, 'answerCallbackQuery', { callback_query_id: q.id, text: preference.mode === 'automatic' ? 'Automatic detection enabled' : 'Region updated' }).catch(() => undefined);\n  await sendGameHome(env, token, chatId, q.message?.message_id, preference.languageCode ?? telegramLanguageCode(q.from));\n  return true;\n}\n",
    "  const preference = await setUserRegionPreference(env, q.from.id, countryCode);\n  await telegram(token, 'answerCallbackQuery', { callback_query_id: q.id, text: preference.mode === 'automatic' ? 'Automatic detection enabled' : 'Region updated' }).catch(() => undefined);\n  const languageCode = preference.languageCode ?? telegramLanguageCode(q.from);\n  if (await enforceMandatoryChannelBotGate(env, token, chatId, q.from.id, q.message?.message_id, languageCode)) return true;\n  await sendGameHome(env, token, chatId, q.message?.message_id, languageCode);\n  return true;\n}\n",
)
anchor = "async function sendUserRegionMenu(env: Env, token: string, chatId: number, userId: number, messageId?: number | null): Promise<void> {\n"
insert = """async function handleMandatoryChannelCallback(env: Env, token: string, q: NonNullable<TelegramUpdate['callback_query']>): Promise<boolean> {
  if (String(q.data || '') !== 'vexa:mandatory:check') return false;
  const chatId = q.message?.chat.id ?? q.from.id;
  const languageCode = telegramLanguageCode(q.from);
  const access = await getMandatoryChannelAccess(env, q.from.id);
  const locale = localeForTelegramLanguage(languageCode);
  const copy = MANDATORY_CHANNEL_TEXT[locale] ?? MANDATORY_CHANNEL_TEXT[DEFAULT_VEXA_LOCALE];
  if (!access.required || access.joined) {
    await telegram(token, 'answerCallbackQuery', { callback_query_id: q.id, text: copy.verified }).catch(() => undefined);
    await sendGameHome(env, token, chatId, q.message?.message_id, languageCode);
    return true;
  }
  await telegram(token, 'answerCallbackQuery', { callback_query_id: q.id, text: copy.notJoined, show_alert: false }).catch(() => undefined);
  await sendMandatoryChannelPrompt(env, token, chatId, access, q.message?.message_id, languageCode);
  return true;
}

async function enforceMandatoryChannelBotGate(env: Env, token: string, chatId: number, userId: number, existingMessageId?: number | null, languageCode?: string): Promise<boolean> {
  const access = await getMandatoryChannelAccess(env, userId);
  if (!access.required || access.joined) return false;
  await sendMandatoryChannelPrompt(env, token, chatId, access, existingMessageId, languageCode);
  return true;
}

async function sendMandatoryChannelPrompt(env: Env, token: string, chatId: number, access: Awaited<ReturnType<typeof getMandatoryChannelAccess>>, existingMessageId?: number | null, languageCode?: string): Promise<void> {
  const channel = access.channel;
  if (!channel) return;
  const locale = localeForTelegramLanguage(languageCode);
  const copy = MANDATORY_CHANNEL_TEXT[locale] ?? MANDATORY_CHANNEL_TEXT[DEFAULT_VEXA_LOCALE];
  const text = [
    `📢 <b>${escapeHtml(copy.title)}</b>`,
    '',
    escapeHtml(copy.body.replace('{channel}', channel.title)),
  ].join('\\n');
  await replaceMenuMessage(env, token, chatId, {
    text,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: `📢 ${copy.join}`, url: channel.joinUrl }],
        [{ text: `✓ ${copy.check}`, callback_data: 'vexa:mandatory:check' }],
      ],
    },
  }, existingMessageId);
}

"""
replace_once('src/telegram-game-bot.ts', anchor, insert + anchor)

replace_once(
    'src/telegram-section-access-admin.ts',
    "      [{ text: '📨 ارسال پیام به کانال', callback_data: 'botadmin:channelpost' }],\n",
    "      [{ text: '📨 ارسال پیام به کانال', callback_data: 'botadmin:channelpost' }],\n      [{ text: '📢 عضویت اجباری کانال', callback_data: 'botadmin:mandatorychannel' }],\n",
)

replace_once(
    'src/index-with-plinko-live.ts',
    "import { handleOnlineCountsAdminRequest } from './telegram-online-counts-admin';\n",
    "import { handleOnlineCountsAdminRequest } from './telegram-online-counts-admin';\nimport { handleMandatoryChannelAdminRequest } from './telegram-mandatory-channel-admin';\nimport { getMandatoryChannelAccess } from './mandatory-channel';\n",
)
replace_once(
    'src/index-with-plinko-live.ts',
    "    if (request.method === 'GET' && url.pathname === '/app/api/crash/live/ws') {\n",
    "    if (request.method === 'POST' && url.pathname === '/app/api/mandatory-channel/status') {\n      try {\n        const body = await request.json().catch(() => ({})) as { initData?: unknown };\n        const userId = await validateTelegramInitData(String(body.initData || ''), gameBotToken(runtimeEnv));\n        return Response.json({ ok: true, ...(await getMandatoryChannelAccess(runtimeEnv, userId)) }, { headers: { 'cache-control': 'no-store' } });\n      } catch (error) {\n        return Response.json({ error: error instanceof Error ? error.message : 'Could not verify channel membership' }, { status: 401, headers: { 'cache-control': 'no-store' } });\n      }\n    }\n    if (request.method === 'GET' && url.pathname === '/app/api/crash/live/ws') {\n",
)
replace_once(
    'src/index-with-plinko-live.ts',
    "    const predictionEventsAdminResponse = await handlePredictionEventsAdminRequest(request, runtimeEnv);\n",
    "    const mandatoryChannelAdminResponse = await handleMandatoryChannelAdminRequest(request, runtimeEnv);\n    if (mandatoryChannelAdminResponse) return mandatoryChannelAdminResponse;\n\n    const predictionEventsAdminResponse = await handlePredictionEventsAdminRequest(request, runtimeEnv);\n",
)

replace_once(
    'src/miniapp/shell.ts',
    "import { SECTION_ACCESS_STYLES } from './section-access-styles';\n",
    "import { SECTION_ACCESS_STYLES } from './section-access-styles';\nimport { MANDATORY_CHANNEL_GATE_SCRIPT, MANDATORY_CHANNEL_GATE_STYLES } from './mandatory-channel-gate';\n",
)
replace_once(
    'src/miniapp/shell.ts',
    "  SECTION_ACCESS_STYLES,\n].join('');\n",
    "  SECTION_ACCESS_STYLES,\n  MANDATORY_CHANNEL_GATE_STYLES,\n].join('');\n",
)
replace_once(
    'src/miniapp/shell.ts',
    "    MINIAPP_SCRIPT,\n    ACTIVITY_SCRIPT,\n",
    "    MINIAPP_SCRIPT,\n    MANDATORY_CHANNEL_GATE_SCRIPT,\n    ACTIVITY_SCRIPT,\n",
)
