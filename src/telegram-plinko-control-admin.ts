import type { Env } from './types';
import {
  DEFAULT_PLINKO_CONTROL,
  getPlinkoControl,
  PLINKO_RISKS,
  PLINKO_ROWS,
  resetPlinkoControl,
  savePlinkoControl,
  type PlinkoRisk,
  type PlinkoRow,
} from './plinko-control';
import { upsertTelegramTextMenu } from './telegram-menu-state';

type Message = { message_id: number; chat: { id: number }; from?: { id: number }; text?: string };
type Callback = { id: string; data?: string; from: { id: number }; message?: { message_id: number; chat: { id: number } } };
type Update = { message?: Message; callback_query?: Callback };
type Button = { text: string; callback_data: string };
type Keyboard = Button[][];
type PlinkoAdminState =
  | { mode: 'edit-all'; row: PlinkoRow; risk: PlinkoRisk }
  | { mode: 'edit-house'; row: PlinkoRow; risk: PlinkoRisk; house: number };
type PresetKind = 'balanced' | 'center' | 'edges' | 'wide';

const STATE_PREFIX = 'admin:plinko-control-input:';

export async function handlePlinkoControlAdminRequest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== 'POST' || url.pathname !== '/telegram/webhook') return null;
  const update = await request.clone().json().catch(() => null) as Update | null;
  if (!update || !env.BOT_TOKEN) return null;
  if (update.callback_query) return handleCallback(env, env.BOT_TOKEN, update.callback_query);
  if (update.message) return handleMessage(env, env.BOT_TOKEN, update.message);
  return null;
}

async function handleCallback(env: Env, token: string, callback: Callback): Promise<Response | null> {
  const data = String(callback.data || '');
  if (!data.startsWith('botadmin:plinko:')) return null;
  if (!isAdmin(env, callback.from.id)) return ok();

  await tg(token, 'answerCallbackQuery', { callback_query_id: callback.id }).catch(() => undefined);
  const chatId = callback.message?.chat.id ?? callback.from.id;
  const messageId = callback.message?.message_id;
  const parts = data.split(':');
  const action = parts[2] || '';

  if (action === 'list' || action === 'refresh') {
    await clearState(env, callback.from.id);
    await sendMainMenu(env, token, chatId, messageId);
    return ok();
  }

  if (action === 'mode') {
    await clearState(env, callback.from.id);
    const row = normalizeRow(parts[3]);
    const risk = normalizeRisk(parts[4]);
    if (row && risk) await sendModeMenu(env, token, chatId, row, risk, messageId);
    return ok();
  }

  if (action === 'edit') {
    const row = normalizeRow(parts[3]);
    const risk = normalizeRisk(parts[4]);
    if (!row || !risk) return ok();
    await setState(env, callback.from.id, { mode: 'edit-all', row, risk });
    const config = await getPlinkoControl(env);
    const item = config.rows[row][risk];
    await upsertCopyBlock(
      env,
      token,
      chatId,
      messageId,
      `✏️ ویرایش همه خانه‌ها · Rows ${row} · ${riskLabel(risk)}\n\nمتن زیر را Copy کنید، تغییر بدهید و بفرستید.\nفرمت: شماره | ضریب | شانس درصد\nتعداد خطوط باید دقیقاً ${Number(row) + 1} و مجموع شانس‌ها 100% باشد.`,
      formatEditLines(item.multipliers, item.weights),
      [[{ text: '⬅️ لغو', callback_data: modeCallback(row, risk) }]],
    );
    return ok();
  }

  if (action === 'houses') {
    await clearState(env, callback.from.id);
    const row = normalizeRow(parts[3]);
    const risk = normalizeRisk(parts[4]);
    if (row && risk) await sendHousePicker(env, token, chatId, row, risk, messageId);
    return ok();
  }

  if (action === 'house') {
    const row = normalizeRow(parts[3]);
    const risk = normalizeRisk(parts[4]);
    const house = Number(parts[5]);
    if (!row || !risk || !Number.isInteger(house) || house < 0 || house > Number(row)) return ok();
    await setState(env, callback.from.id, { mode: 'edit-house', row, risk, house });
    const config = await getPlinkoControl(env);
    const item = config.rows[row][risk];
    await upsertCopyBlock(
      env,
      token,
      chatId,
      messageId,
      `✏️ ویرایش خانه #${house + 1} · Rows ${row} · ${riskLabel(risk)}\n\nخط زیر را Copy کنید، ضریب یا شانس را تغییر بدهید و بفرستید.\nفرمت: شماره | ضریب | شانس درصد\n\nبرای حفظ مجموع 100%، بعد از تغییر شانس این خانه، شانس بقیه خانه‌ها به نسبت مقدار فعلی‌شان تنظیم می‌شود. ضرایب بقیه تغییر نمی‌کنند.`,
      formatHouseLine(house, item.multipliers[house], item.weights[house]),
      [[{ text: '⬅️ انتخاب خانه', callback_data: `botadmin:plinko:houses:${row}:${risk}` }]],
    );
    return ok();
  }

  if (action === 'preset') {
    await clearState(env, callback.from.id);
    const row = normalizeRow(parts[3]);
    const risk = normalizeRisk(parts[4]);
    const preset = normalizePreset(parts[5]);
    if (!row || !risk || !preset) return ok();
    const config = await getPlinkoControl(env);
    applyPreset(config.rows[row][risk], preset);
    await savePlinkoControl(env, config);
    await sendModeMenu(env, token, chatId, row, risk, messageId, `✅ Preset ${presetLabel(preset)} اعمال شد.`);
    return ok();
  }

  if (action === 'normalize') {
    await clearState(env, callback.from.id);
    const row = normalizeRow(parts[3]);
    const risk = normalizeRisk(parts[4]);
    if (!row || !risk) return ok();
    const config = await getPlinkoControl(env);
    config.rows[row][risk].weights = normalizeWeights(config.rows[row][risk].weights);
    await savePlinkoControl(env, config);
    await sendModeMenu(env, token, chatId, row, risk, messageId, '✅ شانس‌ها روی مجموع 100% نرمال شدند.');
    return ok();
  }

  if (action === 'resetmode') {
    await clearState(env, callback.from.id);
    const row = normalizeRow(parts[3]);
    const risk = normalizeRisk(parts[4]);
    if (!row || !risk) return ok();
    if (parts[5] !== 'confirm') {
      await upsert(
        env,
        token,
        chatId,
        messageId,
        `⚠️ تنظیمات Rows ${row} · ${riskLabel(risk)} به مقدار پیش‌فرض برگردد؟`,
        [[
          { text: '✅ بله، ریست', callback_data: `botadmin:plinko:resetmode:${row}:${risk}:confirm` },
          { text: '⬅️ لغو', callback_data: modeCallback(row, risk) },
        ]],
      );
      return ok();
    }
    const config = await getPlinkoControl(env);
    config.rows[row][risk] = cloneRiskConfig(DEFAULT_PLINKO_CONTROL.rows[row][risk]);
    await savePlinkoControl(env, config);
    await sendModeMenu(env, token, chatId, row, risk, messageId, '✅ همین مود به پیش‌فرض برگشت.');
    return ok();
  }

  if (action === 'resetall') {
    await clearState(env, callback.from.id);
    if (parts[3] !== 'confirm') {
      await upsert(
        env,
        token,
        chatId,
        messageId,
        '⚠️ تمام ۹ مود Plinko به مقادیر پیش‌فرض برگردند؟',
        [[
          { text: '✅ ریست همه', callback_data: 'botadmin:plinko:resetall:confirm' },
          { text: '⬅️ لغو', callback_data: 'botadmin:plinko:list' },
        ]],
      );
      return ok();
    }
    await resetPlinkoControl(env);
    await sendMainMenu(env, token, chatId, messageId, '✅ تمام مودهای Plinko به پیش‌فرض برگشتند.');
    return ok();
  }

  return ok();
}

async function handleMessage(env: Env, token: string, message: Message): Promise<Response | null> {
  const adminId = message.from?.id;
  if (!adminId) return null;
  const text = String(message.text || '').trim();

  if (isAdminCommand(text)) {
    await clearState(env, adminId);
    return null;
  }
  if (!isAdmin(env, adminId)) return null;

  const state = await getState(env, adminId);
  if (!state) return null;
  await tg(token, 'deleteMessage', { chat_id: message.chat.id, message_id: message.message_id }).catch(() => undefined);

  if (text === '/cancel' || text === 'لغو') {
    await clearState(env, adminId);
    await sendModeMenu(env, token, message.chat.id, state.row, state.risk);
    return ok();
  }

  if (state.mode === 'edit-all') {
    const parsed = parseEditLines(text, Number(state.row) + 1);
    if (!parsed.ok) {
      await upsert(env, token, message.chat.id, undefined,
        `❌ ${parsed.error}\n\nفرمت هر خط: شماره | ضریب | شانس درصد\n\nلیست اصلاح‌شده را دوباره بفرستید.`,
        [[{ text: '⬅️ لغو', callback_data: modeCallback(state.row, state.risk) }]],
      );
      return ok();
    }
    const total = parsed.weights.reduce((sum, value) => sum + value, 0);
    if (Math.abs(total - 100) > 0.05) {
      await upsert(env, token, message.chat.id, undefined,
        `❌ مجموع شانس‌ها ${trimNumber(total)}% است؛ باید دقیقاً 100% باشد.\n\nلیست اصلاح‌شده را دوباره بفرستید.`,
        [[{ text: '⬅️ لغو', callback_data: modeCallback(state.row, state.risk) }]],
      );
      return ok();
    }
    try {
      const config = await getPlinkoControl(env);
      config.rows[state.row][state.risk] = { multipliers: parsed.multipliers, weights: parsed.weights };
      await savePlinkoControl(env, config);
      await clearState(env, adminId);
      await sendModeMenu(env, token, message.chat.id, state.row, state.risk, undefined, '✅ ضریب‌ها و شانس‌های این مود ذخیره شدند.');
    } catch (error) {
      await upsert(env, token, message.chat.id, undefined,
        `❌ ${error instanceof Error ? error.message : 'ذخیره انجام نشد.'}\n\nلیست را دوباره بفرستید.`,
        [[{ text: '⬅️ لغو', callback_data: modeCallback(state.row, state.risk) }]],
      );
    }
    return ok();
  }

  if (state.mode === 'edit-house') {
    const parsed = parseHouseLine(text, state.house);
    if (!parsed.ok) {
      await upsert(env, token, message.chat.id, undefined,
        `❌ ${parsed.error}\n\nفرمت: شماره | ضریب | شانس درصد\n\nخط اصلاح‌شده را دوباره بفرستید.`,
        [[{ text: '⬅️ لغو', callback_data: `botadmin:plinko:houses:${state.row}:${state.risk}` }]],
      );
      return ok();
    }
    try {
      const config = await getPlinkoControl(env);
      const item = config.rows[state.row][state.risk];
      item.multipliers[state.house] = parsed.multiplier;
      item.weights = replaceHouseWeight(item.weights, state.house, parsed.weight);
      await savePlinkoControl(env, config);
      await clearState(env, adminId);
      await sendModeMenu(
        env,
        token,
        message.chat.id,
        state.row,
        state.risk,
        undefined,
        `✅ خانه #${state.house + 1} ذخیره شد. مجموع شانس‌ها همچنان 100% است.`,
      );
    } catch (error) {
      await upsert(env, token, message.chat.id, undefined,
        `❌ ${error instanceof Error ? error.message : 'ذخیره انجام نشد.'}\n\nخط را دوباره بفرستید.`,
        [[{ text: '⬅️ لغو', callback_data: `botadmin:plinko:houses:${state.row}:${state.risk}` }]],
      );
    }
    return ok();
  }

  return ok();
}

async function sendMainMenu(env: Env, token: string, chatId: number, messageId?: number, notice = ''): Promise<void> {
  const config = await getPlinkoControl(env);
  const rows: Keyboard = PLINKO_ROWS.map((row) => PLINKO_RISKS.map((risk) => ({
    text: `${row} · ${riskLabel(risk)}`,
    callback_data: modeCallback(row, risk),
  })));
  rows.push([{ text: '♻️ ریست همه مودها', callback_data: 'botadmin:plinko:resetall' }]);
  rows.push([
    { text: '🔄 بروزرسانی', callback_data: 'botadmin:plinko:refresh' },
    { text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' },
  ]);
  const updated = config.updatedAt ? `\nآخرین تغییر: ${formatUpdatedAt(config.updatedAt)}` : '';
  await upsert(
    env,
    token,
    chatId,
    messageId,
    `${notice ? notice + '\n\n' : ''}🎯 Plinko Control\n\nهر ۹ ترکیب Rows و Risk مستقل هستند. مود موردنظر را مستقیم انتخاب کنید.${updated}`,
    rows,
  );
}

async function sendModeMenu(
  env: Env,
  token: string,
  chatId: number,
  row: PlinkoRow,
  risk: PlinkoRisk,
  messageId?: number,
  notice = '',
): Promise<void> {
  const config = await getPlinkoControl(env);
  const item = config.rows[row][risk];
  const total = item.weights.reduce((sum, value) => sum + value, 0);
  const expected = expectedReturn(item.multipliers, item.weights);
  const houses = item.multipliers.map((multiplier, index) =>
    `#${index + 1}  ${trimNumber(multiplier)}x · ${trimNumber(item.weights[index])}%`
  ).join('\n');
  await upsert(
    env,
    token,
    chatId,
    messageId,
    `${notice ? notice + '\n\n' : ''}🎯 Rows ${row} · ${riskLabel(risk)}\n\n${houses}\n\nمجموع شانس: ${trimNumber(total)}%\nExpected Return: ${expected.toFixed(4)}x`,
    [
      [{ text: '✏️ ویرایش همه خانه‌ها', callback_data: `botadmin:plinko:edit:${row}:${risk}` }],
      [{ text: '🏠 ویرایش یک خانه', callback_data: `botadmin:plinko:houses:${row}:${risk}` }],
      [
        { text: '⚖️ Balanced', callback_data: `botadmin:plinko:preset:${row}:${risk}:balanced` },
        { text: '🎯 More Center', callback_data: `botadmin:plinko:preset:${row}:${risk}:center` },
      ],
      [
        { text: '↔️ More Edges', callback_data: `botadmin:plinko:preset:${row}:${risk}:edges` },
        { text: '🪽 Wider Edges', callback_data: `botadmin:plinko:preset:${row}:${risk}:wide` },
      ],
      [
        { text: '🧮 Normalize 100%', callback_data: `botadmin:plinko:normalize:${row}:${risk}` },
        { text: '♻️ ریست این مود', callback_data: `botadmin:plinko:resetmode:${row}:${risk}` },
      ],
      [{ text: '⬅️ همه مودها', callback_data: 'botadmin:plinko:list' }],
    ],
  );
}

async function sendHousePicker(
  env: Env,
  token: string,
  chatId: number,
  row: PlinkoRow,
  risk: PlinkoRisk,
  messageId?: number,
): Promise<void> {
  const config = await getPlinkoControl(env);
  const item = config.rows[row][risk];
  const buttons = item.multipliers.map((multiplier, house) => ({
    text: `#${house + 1} · ${trimNumber(multiplier)}x · ${trimNumber(item.weights[house])}%`,
    callback_data: `botadmin:plinko:house:${row}:${risk}:${house}`,
  }));
  const keyboard: Keyboard = [];
  for (let index = 0; index < buttons.length; index += 2) keyboard.push(buttons.slice(index, index + 2));
  keyboard.push([{ text: '⬅️ برگشت به مود', callback_data: modeCallback(row, risk) }]);
  await upsert(
    env,
    token,
    chatId,
    messageId,
    `🏠 ویرایش یک خانه · Rows ${row} · ${riskLabel(risk)}\n\nخانه موردنظر را انتخاب کنید:`,
    keyboard,
  );
}

async function sendImagesReturn(token: string, chatId: number, text: string): Promise<void> {
  await tg(token, 'sendMessage', {
    chat_id: chatId,
    text,
    reply_markup: { inline_keyboard: [[
      { text: '🖼 تصاویر و ظاهر', callback_data: 'botadmin:imagesmenu' },
      { text: '🎯 Plinko Control', callback_data: 'botadmin:plinko:list' },
    ]] },
  }).catch(() => undefined);
}

function formatEditLines(multipliers: number[], weights: number[]): string {
  return multipliers.map((multiplier, index) => `${index + 1} | ${trimNumber(multiplier)} | ${trimNumber(weights[index])}`).join('\n');
}

function formatHouseLine(house: number, multiplier: number, weight: number): string {
  return `${house + 1} | ${trimNumber(multiplier)} | ${trimNumber(weight)}`;
}

function parseEditLines(text: string, expected: number):
  | { ok: true; multipliers: number[]; weights: number[] }
  | { ok: false; error: string } {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length !== expected) return { ok: false, error: `باید دقیقاً ${expected} خط بفرستید؛ الان ${lines.length} خط دریافت شد.` };
  const multipliers: number[] = [];
  const weights: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const parts = lines[index].split('|').map((part) => part.trim());
    if (parts.length !== 3) return { ok: false, error: `خط ${index + 1} سه بخش ندارد.` };
    const lineNumber = Number(parts[0]);
    const multiplier = Number(parts[1]);
    const weight = Number(parts[2].replace('%', ''));
    if (lineNumber !== index + 1) return { ok: false, error: `شماره خط ${index + 1} باید ${index + 1} باشد.` };
    if (!Number.isFinite(multiplier) || multiplier < 0.01 || multiplier > 1000) return { ok: false, error: `ضریب خط ${index + 1} باید بین 0.01 و 1000 باشد.` };
    if (!Number.isFinite(weight) || weight < 0 || weight > 100) return { ok: false, error: `شانس خط ${index + 1} باید بین 0 و 100 باشد.` };
    multipliers.push(roundValue(multiplier, 6));
    weights.push(roundValue(weight, 10));
  }
  return { ok: true, multipliers, weights };
}

function parseHouseLine(text: string, house: number):
  | { ok: true; multiplier: number; weight: number }
  | { ok: false; error: string } {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length !== 1) return { ok: false, error: 'فقط همان یک خط خانه را بفرستید.' };
  const parts = lines[0].split('|').map((part) => part.trim());
  if (parts.length !== 3) return { ok: false, error: 'خط باید سه بخش داشته باشد.' };
  const lineNumber = Number(parts[0]);
  const multiplier = Number(parts[1]);
  const weight = Number(parts[2].replace('%', ''));
  if (lineNumber !== house + 1) return { ok: false, error: `شماره خانه باید ${house + 1} باشد.` };
  if (!Number.isFinite(multiplier) || multiplier < 0.01 || multiplier > 1000) return { ok: false, error: 'ضریب باید بین 0.01 و 1000 باشد.' };
  if (!Number.isFinite(weight) || weight < 0 || weight > 100) return { ok: false, error: 'شانس باید بین 0 و 100 باشد.' };
  return { ok: true, multiplier: roundValue(multiplier, 6), weight: roundValue(weight, 10) };
}

function replaceHouseWeight(weights: number[], house: number, nextWeight: number): number[] {
  const result = weights.map((value) => Math.max(0, Number(value) || 0));
  const remaining = roundValue(100 - nextWeight, 10);
  const otherTotal = result.reduce((sum, value, index) => index === house ? sum : sum + value, 0);
  const otherCount = Math.max(1, result.length - 1);
  for (let index = 0; index < result.length; index += 1) {
    if (index === house) result[index] = nextWeight;
    else result[index] = roundValue(otherTotal > 0 ? result[index] * remaining / otherTotal : remaining / otherCount, 10);
  }
  const difference = roundValue(100 - result.reduce((sum, value) => sum + value, 0), 10);
  const correctionIndex = house === result.length - 1 ? 0 : result.length - 1;
  result[correctionIndex] = roundValue(result[correctionIndex] + difference, 10);
  return result;
}

function applyPreset(item: { multipliers: number[]; weights: number[] }, kind: PresetKind): void {
  const count = item.weights.length;
  const center = (count - 1) / 2;
  item.weights = item.weights.map((_, index) => {
    const distance = Math.abs(index - center) / (center || 1);
    if (kind === 'center') return (1 - distance) * 24 + 2;
    if (kind === 'edges') return distance * 22 + 2;
    if (kind === 'wide') return distance > 0.75 ? 18 : distance > 0.45 ? 7 : 2;
    return 100 / count;
  });
  item.weights = normalizeWeights(item.weights);
  if (kind === 'wide') {
    item.multipliers = item.multipliers.map((multiplier, index) => {
      const distance = Math.abs(index - center) / (center || 1);
      return distance > 0.75 ? Math.max(Number(multiplier) || 0.01, 5) : multiplier;
    });
  }
}

function normalizeWeights(weights: number[]): number[] {
  const positive = weights.map((value) => Math.max(0, Number(value) || 0));
  const sum = positive.reduce((total, value) => total + value, 0);
  const normalized = sum > 0
    ? positive.map((value) => roundValue(value * 100 / sum, 10))
    : positive.map(() => roundValue(100 / positive.length, 10));
  const difference = roundValue(100 - normalized.reduce((total, value) => total + value, 0), 10);
  let index = normalized.length - 1;
  while (index > 0 && normalized[index] <= 0) index -= 1;
  if (index >= 0) normalized[index] = roundValue(normalized[index] + difference, 10);
  return normalized;
}

function expectedReturn(multipliers: number[], weights: number[]): number {
  const total = weights.reduce((sum, value) => sum + Number(value || 0), 0) || 1;
  return multipliers.reduce((sum, multiplier, index) => sum + Number(multiplier || 0) * Number(weights[index] || 0), 0) / total;
}

function cloneRiskConfig(value: { multipliers: number[]; weights: number[] }): { multipliers: number[]; weights: number[] } {
  return { multipliers: value.multipliers.slice(), weights: value.weights.slice() };
}

function normalizeRow(value: unknown): PlinkoRow | null {
  const row = String(value || '') as PlinkoRow;
  return PLINKO_ROWS.includes(row) ? row : null;
}

function normalizeRisk(value: unknown): PlinkoRisk | null {
  const risk = String(value || '').toLowerCase() as PlinkoRisk;
  return PLINKO_RISKS.includes(risk) ? risk : null;
}

function normalizePreset(value: unknown): PresetKind | null {
  const preset = String(value || '').toLowerCase();
  return preset === 'balanced' || preset === 'center' || preset === 'edges' || preset === 'wide' ? preset : null;
}

function riskLabel(risk: PlinkoRisk): string {
  return risk === 'low' ? 'Easy' : risk === 'high' ? 'Hard' : 'Medium';
}

function presetLabel(kind: PresetKind): string {
  return kind === 'center' ? 'More Center' : kind === 'edges' ? 'More Edges' : kind === 'wide' ? 'Wider Edges' : 'Balanced';
}

function modeCallback(row: PlinkoRow, risk: PlinkoRisk): string {
  return `botadmin:plinko:mode:${row}:${risk}`;
}

function trimNumber(value: unknown): string {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return String(Number(number.toFixed(10)));
}

function roundValue(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : value;
}

async function clearOtherAdminStates(env: Env, adminId: number): Promise<void> {
  await Promise.all([
    env.BOT_CACHE.delete(`admin:crash-ghost-live-bets-input:${adminId}`).catch(() => undefined),
    env.BOT_CACHE.delete(`admin:slot-live-bets-input:${adminId}`).catch(() => undefined),
    env.BOT_CACHE.delete(`admin:online-count-input:${adminId}`).catch(() => undefined),
    env.BOT_CACHE.delete(`admin:section-access-input:${adminId}`).catch(() => undefined),
    env.BOT_CACHE.delete(`admin:game-card-upload:${adminId}`).catch(() => undefined),
    env.BOT_CACHE.delete(`botadmin:state:${adminId}`).catch(() => undefined),
  ]);
}

async function getState(env: Env, adminId: number): Promise<PlinkoAdminState | null> {
  const state = await env.BOT_CACHE.get(stateKey(adminId), 'json').catch(() => null) as PlinkoAdminState | null;
  if (!state || (state.mode !== 'edit-all' && state.mode !== 'edit-house')) return null;
  return state;
}

async function setState(env: Env, adminId: number, state: PlinkoAdminState): Promise<void> {
  await clearOtherAdminStates(env, adminId);
  await env.BOT_CACHE.put(stateKey(adminId), JSON.stringify(state), { expirationTtl: 900 });
}

function clearState(env: Env, adminId: number): Promise<void> {
  return env.BOT_CACHE.delete(stateKey(adminId)).catch(() => undefined);
}

function stateKey(adminId: number): string {
  return `${STATE_PREFIX}${adminId}`;
}

function isAdmin(env: Env, adminId: unknown): boolean {
  return String(env.BOT_ADMIN || '').split(/[\s,;]+/).map((value) => value.trim()).filter(Boolean).includes(String(adminId || ''));
}

function isAdminCommand(text: string): boolean {
  const value = text.trim().toLowerCase();
  return value === 'admin' || value === 'ادمین' || /^\/admin(?:@[-_a-z0-9]+)?$/.test(value);
}

async function upsert(env: Env, token: string, chatId: number, messageId: number | undefined, text: string, keyboard: Keyboard): Promise<void> {
  await upsertTelegramTextMenu(env, token, tg, chatId, messageId, {
    text,
    reply_markup: { inline_keyboard: keyboard },
    disable_web_page_preview: true,
  });
}

async function upsertCopyBlock(
  env: Env,
  token: string,
  chatId: number,
  messageId: number | undefined,
  text: string,
  copyText: string,
  keyboard: Keyboard,
): Promise<void> {
  await upsertTelegramTextMenu(env, token, tg, chatId, messageId, {
    text: `${escapeHtml(text)}\n\n<pre>${escapeHtml(copyText)}</pre>`,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard },
    disable_web_page_preview: true,
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function tg<T = unknown>(token: string, method: string, payload: unknown): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({})) as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || !data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result as T;
}

function ok(): Response {
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}
