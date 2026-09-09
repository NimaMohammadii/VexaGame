import type { Env } from './types';
import { getCurrentLotteryRound, getLotteryAdminOverview, getLotterySettings, setLotteryDrawMinutesFromNow, startLotteryNow, subtractLotteryDrawMinutes, updateLotterySettings } from './lottery';
import { adjustLotteryPrizePool, clearLotteryWinnerSelections, getLotteryPrizePoolNano, getLotteryPrizes, getLotteryRoundTicketHolder, getLotteryUserHistory, getLotteryWinnerSelections, listLotteryRoundTicketHolders, LOTTERY_WINNER_COUNT, searchLotteryTicketHolders, setLotteryPrizePercentages, setLotteryWinnerSelection } from './lottery-prizes';
import { publishLotteryLiveRefresh } from './live-activity';
import { makeSimplePdf } from './telegram-pdf';
import { getTelegramMenuMessageId, setTelegramMenuMessageId, upsertTelegramTextMenu } from './telegram-menu-state';

type Message = { message_id: number; chat: { id: number }; from?: { id: number }; text?: string };
type Callback = { id: string; data?: string; from: { id: number }; message?: { message_id: number; chat: { id: number } } };
type Update = { message?: Message; callback_query?: Callback };
type Button = { text: string; callback_data: string };
type Keyboard = Button[][];
type InputMode = 'draw' | 'price' | 'limit' | 'interval' | 'prizes' | 'pooladd' | 'poolsubtract' | `winner${1 | 2 | 3}`;

const STATE_PREFIX = 'admin:lottery-input:';
const NANO = 1_000_000_000;

export async function handleLotteryAdminRequest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== 'POST' || url.pathname !== '/telegram/webhook') return null;
  const update = await request.clone().json().catch(() => null) as Update | null;
  if (!update || !env.BOT_TOKEN) return null;

  if (update.callback_query) {
    const callback = update.callback_query;
    const data = String(callback.data || '');
    if (data === 'botadmin:home') {
      if (isAdmin(env, callback.from.id)) await clearState(env, callback.from.id);
      return null;
    }
    if (!data.startsWith('botadmin:lottery:')) return null;
    if (!isAdmin(env, callback.from.id)) return ok();
    await tg(env.BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: callback.id }).catch(() => undefined);
    return handleCallback(env, callback);
  }

  if (update.message) {
    const message = update.message;
    const userId = message.from?.id;
    if (!userId || !isAdmin(env, userId)) return null;
    const mode = await getState(env, userId);
    if (!mode) return null;
    const text = String(message.text || '').trim();
    if (isAdminCommand(text)) {
      await clearState(env, userId);
      return null;
    }
    await handleInput(env, message, mode);
    return ok();
  }

  return null;
}

async function handleCallback(env: Env, callback: Callback): Promise<Response> {
  const data = String(callback.data || '');
  const parts = data.split(':');
  const action = parts[2] || 'menu';
  const arg = parts[3] || '';
  const chatId = callback.message?.chat.id ?? callback.from.id;
  const messageId = callback.message?.message_id;
  await clearState(env, callback.from.id);

  try {
    if (action === 'menu' || action === 'refresh') {
      await sendLotteryMenu(env, chatId, messageId);
      return ok();
    }

    if (action === 'prizes') {
      await sendPrizeMenu(env, chatId, messageId);
      return ok();
    }

    if (action === 'winners') {
      await sendWinnerMenu(env, chatId, messageId);
      return ok();
    }

    if (action === 'holders') {
      await sendTicketHoldersMenu(env, chatId, messageId, Number(arg));
      return ok();
    }

    if (action === 'holder') {
      await sendTicketHolderDetail(env, chatId, messageId, parts[3] || '');
      return ok();
    }

    if (action === 'holderpdf') {
      await sendLotteryHistoryPdf(env, chatId, parts[3] || '');
      return ok();
    }

    if (action === 'winner') {
      const rank = Number(arg);
      if (![1, 2, 3].includes(rank)) throw new Error('رتبه نامعتبر است.');
      await sendWinnerCandidates(env, chatId, messageId, rank);
      return ok();
    }

    if (action === 'pick') {
      const rank = Number(arg);
      const userId = parts[4] || '';
      const round = await getCurrentLotteryRound(env, false);
      if (!round || round.status !== 'open') throw new Error('راند بازی وجود ندارد.');
      await setLotteryWinnerSelection(env, round.id, rank, userId);
      await sendWinnerMenu(env, chatId, messageId, `✅ برنده رتبه ${rank} ذخیره شد.`);
      return ok();
    }

    if (action === 'clearwinners') {
      const round = await getCurrentLotteryRound(env, false);
      if (round) await clearLotteryWinnerSelections(env, round.id);
      await sendWinnerMenu(env, chatId, messageId, '✅ انتخاب‌ها پاک شد؛ قرعه‌کشی کاملاً خودکار انجام می‌شود.');
      return ok();
    }

    if (action === 'searchwinner') {
      const rank = Number(arg);
      if (![1, 2, 3].includes(rank)) throw new Error('رتبه نامعتبر است.');
      await setState(env, callback.from.id, `winner${rank}` as InputMode);
      await prompt(env, chatId, messageId, `winner${rank}` as InputMode);
      return ok();
    }

    if (action === 'askprizes') {
      await setState(env, callback.from.id, 'prizes');
      await prompt(env, chatId, messageId, 'prizes');
      return ok();
    }

    if (action === 'startnow') {
      await getCurrentLotteryRound(env, false);
      const round = await startLotteryNow(env);
      const settings = await getLotterySettings(env);
      await publishLotteryRefresh(env, round.id, 'Lottery started now');
      await sendLotteryMenu(env, chatId, messageId, `🚀 Lottery از همین الان شروع شد. Draw بعدی ${formatMinutes(settings.drawIntervalMinutes)} دیگر است.\nRound: ${round.id}`);
      return ok();
    }

    if (action === 'toggle') {
      const settings = await getLotterySettings(env);
      if (arg === 'enabled') await updateLotterySettings(env, { enabled: !settings.enabled });
      else if (arg === 'sales') await updateLotterySettings(env, { salesOpen: !settings.salesOpen });
      else if (arg === 'free') await updateLotterySettings(env, { freeTicketEnabled: !settings.freeTicketEnabled });
      const round = await getCurrentLotteryRound(env, false);
      await publishLotteryRefresh(env, round?.id, 'Lottery settings updated');
      await sendLotteryMenu(env, chatId, messageId, '✅ تنظیمات ذخیره شد.');
      return ok();
    }

    if (action === 'draw') {
      const minutes = Number(arg);
      if (![60, 360, 720, 1440].includes(minutes)) throw new Error('Invalid draw time');
      await setLotteryDrawMinutesFromNow(env, minutes);
      const round = await getCurrentLotteryRound(env, true);
      await publishLotteryRefresh(env, round?.id, 'Lottery draw time updated');
      await sendLotteryMenu(env, chatId, messageId, `✅ زمان Draw روی ${formatMinutes(minutes)} از الان تنظیم شد.`);
      return ok();
    }

    if (action === 'ask') {
      const mode = normalizeMode(arg);
      if (!mode) throw new Error('Unknown Lottery setting');
      await setState(env, callback.from.id, mode);
      await prompt(env, chatId, messageId, mode);
      return ok();
    }
  } catch (error) {
    await sendLotteryMenu(env, chatId, messageId, `❌ ${error instanceof Error ? error.message : 'عملیات ناموفق بود.'}`);
  }
  return ok();
}

async function handleInput(env: Env, message: Message, mode: InputMode): Promise<void> {
  const text = String(message.text || '').trim();
  const userId = message.from?.id as number;
  const menuMessageId = await getTelegramMenuMessageId(env, message.chat.id);
  await tg(env.BOT_TOKEN, 'deleteMessage', { chat_id: message.chat.id, message_id: message.message_id }).catch(() => undefined);
  try {
    if (text === '/cancel' || text === 'لغو') {
      await clearState(env, userId);
      if (mode === 'prizes') await sendPrizeMenu(env, message.chat.id, menuMessageId);
      else if (mode.startsWith('winner')) await sendWinnerMenu(env, message.chat.id, menuMessageId);
      else await sendLotteryMenu(env, message.chat.id, menuMessageId);
      return;
    }

    if (mode === 'prizes') {
      const percentBps = parsePrizePercentages(text);
      await setLotteryPrizePercentages(env, percentBps);
      const round = await getCurrentLotteryRound(env, false);
      await publishLotteryRefresh(env, round?.id, 'Lottery prize split updated');
      await finishInput(env, userId);
      await sendPrizeMenu(env, message.chat.id, menuMessageId, '✅ تقسیم Prize Pool برای سه برنده ذخیره شد.');
      return;
    }

    if (mode === 'pooladd' || mode === 'poolsubtract') {
      const round = await getCurrentLotteryRound(env, false);
      if (!round || round.status !== 'open') throw new Error('راند باز Lottery وجود ندارد.');
      const amountNano = parsePrizePoolAmountNano(text);
      const nextPoolNano = await adjustLotteryPrizePool(env, round.id, mode === 'pooladd' ? amountNano : -amountNano);
      await publishLotteryRefresh(env, round.id, 'Lottery prize pool updated', nextPoolNano);
      await finishInput(env, userId);
      await sendLotteryMenu(env, message.chat.id, menuMessageId, `✅ Prize Pool ${mode === 'pooladd' ? 'افزایش' : 'کاهش'} یافت.\nمقدار جدید: ${formatPrizePoolGram(nextPoolNano)} GRAM`);
      return;
    }

    if (mode.startsWith('winner')) {
      const rank = Number(mode.slice(-1));
      const round = await getCurrentLotteryRound(env, false);
      if (!round || round.status !== 'open') throw new Error('راند بازی وجود ندارد.');
      const matches = await searchLotteryTicketHolders(env, round.id, text, 12);
      await finishInput(env, userId);
      await sendWinnerCandidates(env, message.chat.id, menuMessageId, rank, text, matches);
      return;
    }

    if (mode === 'draw') {
      if (!/^-?\d+$/.test(text) || Number(text) === 0) throw new Error('تعداد دقیقه را به‌صورت عدد صحیح مثبت یا منفی بفرستید.');
      const minutes = Number(text);
      if (minutes < 0) await subtractLotteryDrawMinutes(env, Math.abs(minutes));
      else await setLotteryDrawMinutesFromNow(env, minutes);
      const round = await getCurrentLotteryRound(env, true);
      await publishLotteryRefresh(env, round?.id, 'Lottery draw time updated');
      await finishInput(env, userId);
      await sendLotteryMenu(env, message.chat.id, menuMessageId, minutes < 0
        ? `✅ ${formatMinutes(Math.abs(minutes))} از زمان باقی‌مانده Draw کم شد.`
        : `✅ Draw برای ${formatMinutes(minutes)} دیگر تنظیم شد.`);
      return;
    }

    if (mode === 'price') {
      const gram = Number(text.replace(',', '.'));
      if (!Number.isFinite(gram) || gram <= 0 || gram > 1000) throw new Error('قیمت معتبر GRAM بفرستید. مثال: 0.15');
      const nano = Math.round(gram * NANO);
      await updateLotterySettings(env, { ticketPriceNano: nano });
      const round = await getCurrentLotteryRound(env, false);
      await publishLotteryRefresh(env, round?.id, 'Lottery ticket price updated');
      await finishInput(env, userId);
      await sendLotteryMenu(env, message.chat.id, menuMessageId, `✅ قیمت هر تیکت روی ${formatGram(nano)} GRAM تنظیم شد.`);
      return;
    }

    if (mode === 'limit') {
      if (!/^\d+$/.test(text)) throw new Error('یک عدد صحیح بفرستید. 0 یعنی بدون محدودیت.');
      const limit = Number(text);
      await updateLotterySettings(env, { maxTicketsPerUser: limit });
      const round = await getCurrentLotteryRound(env, false);
      await publishLotteryRefresh(env, round?.id, 'Lottery ticket limit updated');
      await finishInput(env, userId);
      await sendLotteryMenu(env, message.chat.id, menuMessageId, `✅ سقف تیکت هر کاربر ${limit === 0 ? 'برداشته شد' : `روی ${limit} قرار گرفت`}.`);
      return;
    }

    if (mode === 'interval') {
      if (!/^\d+$/.test(text)) throw new Error('فاصله Draw را به دقیقه بفرستید. مثال: 1440');
      const minutes = Number(text);
      await updateLotterySettings(env, { drawIntervalMinutes: minutes });
      const round = await getCurrentLotteryRound(env, false);
      await publishLotteryRefresh(env, round?.id, 'Lottery draw interval updated');
      await finishInput(env, userId);
      await sendLotteryMenu(env, message.chat.id, menuMessageId, `✅ فاصله پیش‌فرض Draw روی ${formatMinutes(minutes)} تنظیم شد.`);
    }
  } catch (error) {
    await prompt(env, message.chat.id, menuMessageId, mode, `❌ ${error instanceof Error ? error.message : 'مقدار نامعتبر است.'}`);
  }
}

async function sendLotteryMenu(env: Env, chatId: number, messageId?: number, notice = ''): Promise<void> {
  const overview = await getLotteryAdminOverview(env);
  const { settings, round, stats } = overview;
  const prizePoolNano = round ? await getLotteryPrizePoolNano(env, round.id) : 0;
  const drawMs = round?.status === 'open' ? Date.parse(round.drawAt) - Date.now() : 0;
  const text = [
    notice,
    '🎟 Lottery Control',
    '',
    `وضعیت Lottery: ${settings.enabled ? 'فعال ✅' : 'غیرفعال ❌'}`,
    `فروش تیکت: ${settings.salesOpen ? 'باز ✅' : 'بسته ❌'}`,
    `تیکت رایگان هر Round: ${settings.freeTicketEnabled ? 'فعال ✅' : 'غیرفعال ❌'}`,
    `قیمت هر تیکت: ${formatGram(settings.ticketPriceNano)} GRAM`,
    `برنده در هر Round: ${LOTTERY_WINNER_COUNT} نفر`,
    `سقف هر کاربر: ${settings.maxTicketsPerUser > 0 ? settings.maxTicketsPerUser : 'بدون محدودیت'}`,
    `فاصله پیش‌فرض Draw: ${formatMinutes(settings.drawIntervalMinutes)}`,
    '',
    `Round: ${round ? round.id : '—'}`,
    `Round status: ${round?.status || '—'}`,
    `Next Draw: ${round?.status === 'open' ? formatRemaining(drawMs) : 'Round closed'}`,
    `🏆 Prize Pool: ${formatPrizePoolGram(prizePoolNano)} GRAM`,
    '',
    `🎫 Tickets: ${stats.ticketCount.toLocaleString()}`,
    `👥 Players: ${stats.playerCount.toLocaleString()}`,
    `🆓 Free: ${stats.freeTicketCount.toLocaleString()}`,
    `💳 Paid: ${stats.paidTicketCount.toLocaleString()}`,
    `💰 Revenue: ${formatGram(stats.revenueNano)} GRAM`,
  ].filter(Boolean).join('\n');

  const rows: Keyboard = [
    [{ text: '🚀 Start Now', callback_data: 'botadmin:lottery:startnow' }],
    [{ text: '🎯 تعیین ۳ برنده راند بعدی', callback_data: 'botadmin:lottery:winners' }],
    [{ text: '👥 کاربران و تیکت‌های راند', callback_data: 'botadmin:lottery:holders:0' }],
    [{ text: '🏆 تقسیم Prize Pool برای ۳ برنده', callback_data: 'botadmin:lottery:prizes' }],
    [
      { text: '➕ افزایش Prize Pool', callback_data: 'botadmin:lottery:ask:pooladd' },
      { text: '➖ کاهش Prize Pool', callback_data: 'botadmin:lottery:ask:poolsubtract' },
    ],
    [{ text: settings.enabled ? '❌ خاموش کردن Lottery' : '✅ روشن کردن Lottery', callback_data: 'botadmin:lottery:toggle:enabled' }],
    [
      { text: settings.salesOpen ? '⏸ توقف فروش' : '▶️ شروع فروش', callback_data: 'botadmin:lottery:toggle:sales' },
      { text: settings.freeTicketEnabled ? '🎁 حذف رایگان' : '🎁 فعال کردن رایگان', callback_data: 'botadmin:lottery:toggle:free' },
    ],
    [
      { text: '💎 قیمت تیکت', callback_data: 'botadmin:lottery:ask:price' },
      { text: '👤 سقف کاربر', callback_data: 'botadmin:lottery:ask:limit' },
    ],
    [
      { text: '⏱ +1h', callback_data: 'botadmin:lottery:draw:60' },
      { text: '⏱ +6h', callback_data: 'botadmin:lottery:draw:360' },
      { text: '⏱ +12h', callback_data: 'botadmin:lottery:draw:720' },
      { text: '⏱ +24h', callback_data: 'botadmin:lottery:draw:1440' },
    ],
    [
      { text: '🕒 زمان دلخواه Draw', callback_data: 'botadmin:lottery:ask:draw' },
      { text: '🔁 فاصله Draw', callback_data: 'botadmin:lottery:ask:interval' },
    ],
    [
      { text: '🔄 بروزرسانی', callback_data: 'botadmin:lottery:refresh' },
      { text: '⬅️ منوی اصلی', callback_data: 'botadmin:home' },
    ],
  ];
  const active = await upsert(env, env.BOT_TOKEN, chatId, messageId, text, rows);
  if (active) await setTelegramMenuMessageId(env, chatId, active);
}

async function sendTicketHoldersMenu(env: Env, chatId: number, messageId: number | undefined, requestedPage = 0): Promise<void> {
  const round = await getCurrentLotteryRound(env, false);
  if (!round || round.status !== 'open') {
    await sendLotteryMenu(env, chatId, messageId, 'راند باز Lottery وجود ندارد.');
    return;
  }
  const pageSize = 8;
  const initial = await listLotteryRoundTicketHolders(env, round.id, requestedPage, pageSize);
  const lastPage = Math.max(0, Math.ceil(initial.total / pageSize) - 1);
  const data = initial.page > lastPage ? await listLotteryRoundTicketHolders(env, round.id, lastPage, pageSize) : initial;
  const text = [
    '👥 کاربران راند فعلی',
    '',
    `Round: ${round.id}`,
    `کاربران: ${data.total.toLocaleString()} · صفحه ${data.total ? data.page + 1 : 0} از ${Math.max(1, lastPage + 1)}`,
    '',
    data.holders.length ? 'هر ردیف: جزئیات کاربر و دانلود PDF تاریخچهٔ لاتاری.' : 'هنوز تیکتی برای این راند خریده نشده است.',
  ].join('\n');
  const rows: Keyboard = data.holders.map((holder) => [
    { text: `${clip(holder.displayName, 24)} · ${holder.ticketCount} 🎫`, callback_data: `botadmin:lottery:holder:${holder.userId}` },
    { text: '📄 PDF', callback_data: `botadmin:lottery:holderpdf:${holder.userId}` },
  ]);
  if (lastPage > 0) {
    const pages: Button[] = [];
    if (data.page > 0) pages.push({ text: '⬅️ قبلی', callback_data: `botadmin:lottery:holders:${data.page - 1}` });
    if (data.page < lastPage) pages.push({ text: 'بعدی ➡️', callback_data: `botadmin:lottery:holders:${data.page + 1}` });
    if (pages.length) rows.push(pages);
  }
  rows.push([{ text: '⬅️ Lottery Control', callback_data: 'botadmin:lottery:menu' }]);
  const active = await upsert(env, env.BOT_TOKEN, chatId, messageId, text, rows);
  if (active) await setTelegramMenuMessageId(env, chatId, active);
}

async function sendTicketHolderDetail(env: Env, chatId: number, messageId: number | undefined, userId: string): Promise<void> {
  const user = await getLotteryUserHistory(env, userId);
  const round = await getCurrentLotteryRound(env, false);
  const current = round ? await getLotteryRoundTicketHolder(env, round.id, user.user.userId) : null;
  const text = [
    '👤 جزئیات کاربر Lottery',
    '',
    `نام: ${user.user.displayName}`,
    `ID: ${user.user.userId}`,
    `Username: ${user.user.username ? `@${user.user.username}` : '—'}`,
    '',
    `تیکت راند فعلی: ${current?.ticketCount || 0}`,
    `Paid / Free: ${current?.paidTicketCount || 0} / ${current?.freeTicketCount || 0}`,
    `کل تیکت‌ها: ${user.totalTicketCount}`,
    `تعداد راندها: ${user.roundsEntered}`,
    `بردها: ${user.winCount}`,
    `جایزهٔ کل: ${formatPrizePoolGram(user.totalPrizeNano)} GRAM`,
    `آخرین تیکت: ${user.user.lastTicketAt || '—'}`,
  ].join('\n');
  const rows: Keyboard = [
    [{ text: '📄 دانلود تاریخچهٔ Lottery (PDF)', callback_data: `botadmin:lottery:holderpdf:${user.user.userId}` }],
    [{ text: '⬅️ کاربران راند', callback_data: 'botadmin:lottery:holders:0' }],
  ];
  const active = await upsert(env, env.BOT_TOKEN, chatId, messageId, text, rows);
  if (active) await setTelegramMenuMessageId(env, chatId, active);
}

async function sendLotteryHistoryPdf(env: Env, chatId: number, userId: string): Promise<void> {
  const history = await getLotteryUserHistory(env, userId);
  const lines = [
    'Vexa Game - Lottery User History',
    `Generated at: ${new Date().toISOString()}`,
    `User ID: ${history.user.userId}`,
    `Name: ${history.user.displayName}`,
    `Username: ${history.user.username ? `@${history.user.username}` : ''}`,
    '',
    `Total tickets: ${history.totalTicketCount}`,
    `Paid tickets: ${history.totalPaidTicketCount}`,
    `Free tickets: ${history.totalFreeTicketCount}`,
    `Rounds entered: ${history.roundsEntered}`,
    `Wins: ${history.winCount}`,
    `Total prize: ${formatPrizePoolGram(history.totalPrizeNano)} GRAM`,
    `Ticket records in this file: ${history.tickets.length} of ${history.totalTicketCount}`,
    '',
    'Wins:',
    ...(history.wins.length ? history.wins.map((win) => `${win.createdAt} | Round ${win.roundId} | Rank ${win.rank} | Ticket ${win.ticketCode} | ${formatPrizePoolGram(win.prizeNano)} GRAM | ${win.paid ? 'paid' : 'pending'}`) : ['No lottery wins']),
    '',
    'Tickets:',
    ...(history.tickets.length ? history.tickets.map((ticket) => `${ticket.createdAt} | Round ${ticket.roundId} | Ticket ${ticket.ticketCode} | ${ticket.isFree ? 'free' : `${formatPrizePoolGram(ticket.priceNano)} GRAM`}`) : ['No lottery tickets']),
  ];
  const form = new FormData();
  form.append('chat_id', String(chatId));
  form.append('caption', `📄 Lottery history - ${history.user.userId}`);
  form.append('document', new Blob([makeSimplePdf(lines, 1_500)], { type: 'application/pdf' }), `lottery-user-${history.user.userId}.pdf`);
  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendDocument`, { method: 'POST', body: form });
  const result = await response.json().catch(() => ({})) as { ok?: boolean; description?: string };
  if (!response.ok || !result.ok) throw new Error(result.description || 'ارسال PDF ناموفق بود.');
}

async function sendWinnerMenu(env: Env, chatId: number, messageId?: number, notice = ''): Promise<void> {
  const round = await getCurrentLotteryRound(env, true);
  const selections = round ? await getLotteryWinnerSelections(env, round.id) : [];
  const byRank = new Map(selections.map((item) => [item.rank, item]));
  const text = [
    notice,
    '🎯 برنده‌های راند بعدی',
    '',
    `Round: ${round?.id || '—'}`,
    ...Array.from({ length: LOTTERY_WINNER_COUNT }, (_, index) => {
      const rank = index + 1;
      const selected = byRank.get(rank);
      return `#${rank}: ${selected ? `${selected.displayName} (${selected.userId})` : 'خودکار بر اساس شانس تیکت‌ها'}`;
    }),
    '',
    'فقط کاربران دارای تیکت قابل انتخاب‌اند. رتبه‌های انتخاب‌نشده هنگام Draw با قرعه‌کشی وزنی تیکت‌ها پر می‌شوند.',
  ].filter(Boolean).join('\n');
  const rows: Keyboard = Array.from({ length: LOTTERY_WINNER_COUNT }, (_, index) => [{
    text: `👤 انتخاب برنده رتبه ${index + 1}`,
    callback_data: `botadmin:lottery:winner:${index + 1}`,
  }]);
  rows.push([{ text: '🧹 پاک‌کردن همه (حالت خودکار)', callback_data: 'botadmin:lottery:clearwinners' }]);
  rows.push([{ text: '⬅️ Lottery Control', callback_data: 'botadmin:lottery:menu' }]);
  const active = await upsert(env, env.BOT_TOKEN, chatId, messageId, text, rows);
  if (active) await setTelegramMenuMessageId(env, chatId, active);
}

async function sendWinnerCandidates(env: Env, chatId: number, messageId: number | undefined, rank: number, query = '', provided?: Awaited<ReturnType<typeof searchLotteryTicketHolders>>): Promise<void> {
  const round = await getCurrentLotteryRound(env, false);
  const candidates = provided || (round ? await searchLotteryTicketHolders(env, round.id, query, 12) : []);
  const text = [
    `👤 انتخاب برنده رتبه ${rank}`,
    '',
    query ? `نتایج جستجو برای: ${query}` : 'کاربران دارای تیکت (بیشترین تیکت در بالا)',
    candidates.length ? 'یک کاربر را انتخاب کنید:' : 'کاربری پیدا نشد.',
  ].join('\n');
  const rows: Keyboard = candidates.map((candidate) => [{
    text: `${candidate.displayName} · ${candidate.ticketCount} 🎫`,
    callback_data: `botadmin:lottery:pick:${rank}:${candidate.userId}`,
  }]);
  rows.push([{ text: '🔎 جستجوی یوزرنیم یا ID', callback_data: `botadmin:lottery:searchwinner:${rank}` }]);
  rows.push([{ text: '⬅️ برنده‌های راند', callback_data: 'botadmin:lottery:winners' }]);
  const active = await upsert(env, env.BOT_TOKEN, chatId, messageId, text, rows);
  if (active) await setTelegramMenuMessageId(env, chatId, active);
}

async function sendPrizeMenu(env: Env, chatId: number, messageId?: number, notice = ''): Promise<void> {
  const prizes = await getLotteryPrizes(env);
  const lines = prizes.map((item) => `#${item.rank}: ${formatPercent(item.percentBps)}`);
  const text = [
    notice,
    '🏆 Lottery Prizes',
    '',
    'در هر Round دقیقاً سه پلیر واقعی و متفاوت برنده می‌شوند.',
    'Prize Pool با همین درصدها بین رتبه‌های اول تا سوم تقسیم می‌شود.',
    '',
    ...lines,
  ].filter(Boolean).join('\n');

  const rows: Keyboard = [[{ text: '✏️ تنظیم درصد رتبه‌ها', callback_data: 'botadmin:lottery:askprizes' }]];
  rows.push([{ text: '⬅️ Lottery Control', callback_data: 'botadmin:lottery:menu' }]);

  const active = await upsert(env, env.BOT_TOKEN, chatId, messageId, text, rows);
  if (active) await setTelegramMenuMessageId(env, chatId, active);
}

async function prompt(env: Env, chatId: number, messageId: number | undefined, mode: InputMode, notice = ''): Promise<void> {
  const text = mode.startsWith('winner')
    ? `🔎 جستجوی برنده رتبه ${mode.slice(-1)}\n\nیوزرنیم (با یا بدون @) یا Telegram ID کاربر دارای تیکت را بفرستید.`
    : mode === 'prizes'
    ? '🏆 تقسیم Prize Pool\n\nدرصد رتبه اول، دوم و سوم را به‌ترتیب بفرستید.\nمثال: 50,30,20\nمجموع باید دقیقاً 100 باشد.'
    : mode === 'pooladd'
      ? '➕ افزایش Prize Pool\n\nمقداری که می‌خواهید به Prize Pool همین راند اضافه شود را به GRAM بفرستید.\nمثال: 25 یا 0.5'
      : mode === 'poolsubtract'
        ? '➖ کاهش Prize Pool\n\nمقداری که می‌خواهید از Prize Pool همین راند کم شود را به GRAM بفرستید.\nمقدار نهایی نمی‌تواند کمتر از صفر شود.'
        : mode === 'draw'
          ? '🕒 زمان Draw\n\nعدد مثبت: زمان Draw از الان تنظیم می‌شود.\nعدد منفی: از زمان باقی‌مانده کم می‌شود.\nمثال: 90 یعنی یک ساعت و نیم دیگر؛ -60 یعنی ۶۰ دقیقه کمتر.'
          : mode === 'price'
            ? '💎 قیمت تیکت\n\nقیمت هر تیکت را به GRAM بفرستید.\nمثال: 0.15'
            : mode === 'limit'
              ? '👤 سقف تیکت هر کاربر\n\nیک عدد صحیح بفرستید.\n0 یعنی بدون محدودیت.'
              : '🔁 فاصله پیش‌فرض Draw\n\nتعداد دقیقه را بفرستید.\nمثال: 1440 یعنی 24 ساعت.';
  const back = mode === 'prizes' ? 'botadmin:lottery:prizes' : mode.startsWith('winner') ? `botadmin:lottery:winner:${mode.slice(-1)}` : 'botadmin:lottery:menu';
  const active = await upsert(env, env.BOT_TOKEN, chatId, messageId, `${notice ? notice + '\n\n' : ''}${text}\n\n/cancel برای لغو`, [[{ text: '⬅️ بازگشت', callback_data: back }]]);
  if (active) await setTelegramMenuMessageId(env, chatId, active);
}

async function finishInput(env: Env, userId: number): Promise<void> {
  await clearState(env, userId);
}

function normalizeMode(value: string): InputMode | null {
  return value === 'draw' || value === 'price' || value === 'limit' || value === 'interval' || value === 'prizes' || value === 'pooladd' || value === 'poolsubtract' || /^winner[123]$/.test(value) ? value as InputMode : null;
}
function parsePrizePercentages(value: string): number[] {
  const parts = value.replace(/٪/g, '%').split(/[،,;|/\s]+/).map((item) => item.replace('%', '').trim()).filter(Boolean);
  if (parts.length !== LOTTERY_WINNER_COUNT) throw new Error('درصد سه رتبه را به ترتیب بفرستید. مثال: 50,30,20');
  const percentBps = parts.map((item) => {
    const percent = Number(item);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) throw new Error('هر درصد باید بین 0 تا 100 باشد.');
    return Math.round(percent * 100);
  });
  if (percentBps.reduce((sum, item) => sum + item, 0) !== 10_000) throw new Error('مجموع درصدها باید دقیقاً 100 باشد.');
  return percentBps;
}
function parsePrizePoolAmountNano(value: string): number {
  const gram = Number(value.trim().replace(',', '.'));
  const nano = Math.round(gram * NANO);
  if (!Number.isFinite(gram) || gram <= 0 || !Number.isSafeInteger(nano) || nano <= 0) throw new Error('یک مقدار مثبت و معتبر GRAM بفرستید.');
  return nano;
}
function stateKey(userId: number): string { return `${STATE_PREFIX}${userId}`; }
async function getState(env: Env, userId: number): Promise<InputMode | null> {
  const value = await env.BOT_CACHE.get(stateKey(userId)).catch(() => null);
  return normalizeMode(String(value || ''));
}
function setState(env: Env, userId: number, mode: InputMode): Promise<void> {
  return env.BOT_CACHE.put(stateKey(userId), mode, { expirationTtl: 900 });
}
function clearState(env: Env, userId: number): Promise<void> {
  return env.BOT_CACHE.delete(stateKey(userId)).catch(() => undefined);
}
function isAdmin(env: Env, userId: unknown): boolean {
  return String(env.BOT_ADMIN || '').split(/[\s,;]+/).map((value) => value.trim()).filter(Boolean).includes(String(userId || ''));
}
function isAdminCommand(text: string): boolean {
  const value = text.trim().toLowerCase();
  return value === 'admin' || value === 'ادمین' || /^\/admin(?:@[-_a-z0-9]+)?$/.test(value);
}
function formatGram(nano: number): string {
  return (Math.max(0, Number(nano) || 0) / NANO).toFixed(4).replace(/0+$/,'').replace(/\.$/,'') || '0';
}
function formatPrizePoolGram(nano: number): string {
  return (Math.max(0, Number(nano) || 0) / NANO).toFixed(9).replace(/0+$/,'').replace(/\.$/,'') || '0';
}
function formatPercent(bps: number): string { return `${(Math.max(0, Number(bps) || 0) / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}%`; }
function formatMinutes(minutes: number): string {
  const value = Math.max(1, Math.floor(Number(minutes) || 1));
  if (value < 60) return `${value} دقیقه`;
  const hours = Math.floor(value / 60), rest = value % 60;
  if (hours < 24) return rest ? `${hours} ساعت و ${rest} دقیقه` : `${hours} ساعت`;
  const days = Math.floor(hours / 24), remainingHours = hours % 24;
  return remainingHours ? `${days} روز و ${remainingHours} ساعت` : `${days} روز`;
}
function formatRemaining(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'الان';
  return formatMinutes(Math.max(1, Math.ceil(ms / 60_000)));
}
function clip(value: unknown, maxLength: number): string {
  const text = String(value || '').trim();
  const max = Math.max(1, Math.floor(Number(maxLength) || 1));
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
}
async function publishLotteryRefresh(env: Env, roundId?: string | null, action = 'Lottery updated', prizePoolNano?: number): Promise<void> {
  await publishLotteryLiveRefresh(env, { roundId, prizePoolNano, action })
    .catch((error) => console.warn('Lottery live refresh failed', error));
}
async function upsert(env: Env, token: string, chatId: number, messageId: number | undefined, text: string, keyboard: Keyboard): Promise<number | undefined> {
  return upsertTelegramTextMenu(env, token, tg, chatId, messageId, {
    text,
    reply_markup: { inline_keyboard: keyboard },
    disable_web_page_preview: true,
  });
}
async function tg<T = unknown>(token: string, method: string, payload: unknown): Promise<T> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({})) as { ok?: boolean; result?: T; description?: string };
  if (!response.ok || !data.ok) throw new Error(data.description || `Telegram ${method} failed`);
  return data.result as T;
}
function ok(): Response { return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } }); }
