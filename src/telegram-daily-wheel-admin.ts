import type { Env } from './types';
import { listDailyWheelAdminSpins } from './daily-wheel-rewards';
import { setTelegramMenuMessageId, upsertTelegramTextMenu } from './telegram-menu-state';

type Callback = { id: string; data?: string; from: { id: number }; message?: { message_id: number; chat: { id: number } } };
type Update = { callback_query?: Callback };

export async function handleDailyWheelAdminRequest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method !== 'POST' || url.pathname !== '/telegram/webhook') return null;
  const update = await request.clone().json().catch(() => null) as Update | null;
  const callback = update?.callback_query;
  if (!callback || !String(callback.data || '').startsWith('botadmin:dailywheel:')) return null;
  if (!isAdmin(env, callback.from.id)) return Response.json({ ok: true });
  await telegram(env.BOT_TOKEN, 'answerCallbackQuery', { callback_query_id: callback.id }).catch(() => undefined);
  const page = Math.max(0, Math.floor(Number(String(callback.data || '').split(':')[2]) || 0));
  await sendDailyWheelMenu(env, callback.message?.chat.id ?? callback.from.id, callback.message?.message_id, page);
  return Response.json({ ok: true });
}

async function sendDailyWheelMenu(env: Env, chatId: number, messageId: number | undefined, requestedPage: number): Promise<void> {
  const data = await listDailyWheelAdminSpins(env, requestedPage, 8);
  const lastPage = Math.max(0, Math.ceil(data.total / data.pageSize) - 1);
  const lines = [
    '🎡 Daily Wheel',
    '',
    `Total spins: ${data.total.toLocaleString()}`,
    `Page: ${data.page + 1}/${lastPage + 1}`,
    '',
    ...(data.spins.length ? data.spins.map((spin) => {
      const name = spin.username ? `@${spin.username}` : spin.firstName || spin.userId;
      return `• ${name} (${spin.userId})\n  ${spin.prizeLabel} · ${formatDate(spin.createdAt)} · ${spin.status}`;
    }) : ['No Daily Wheel spins yet.']),
  ];
  const rows: Array<Array<{ text: string; callback_data: string }>> = [];
  const pages: Array<{ text: string; callback_data: string }> = [];
  if (data.page > 0) pages.push({ text: '⬅️ Previous', callback_data: `botadmin:dailywheel:${data.page - 1}` });
  if (data.page < lastPage) pages.push({ text: 'Next ➡️', callback_data: `botadmin:dailywheel:${data.page + 1}` });
  if (pages.length) rows.push(pages);
  rows.push([{ text: '🔄 Refresh', callback_data: `botadmin:dailywheel:${data.page}` }]);
  rows.push([{ text: '⬅️ Main menu', callback_data: 'botadmin:home' }]);
  const active = await upsertTelegramTextMenu(env, env.BOT_TOKEN, telegram, chatId, messageId, {
    text: lines.join('\n'),
    reply_markup: { inline_keyboard: rows },
  });
  if (active) await setTelegramMenuMessageId(env, chatId, active);
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : value;
}

function isAdmin(env: Env, userId: unknown): boolean {
  return String(env.BOT_ADMIN || '').split(/[\s,;|]+/).map((value) => value.trim()).filter(Boolean).includes(String(userId || ''));
}

async function telegram(token: string, method: string, payload: unknown): Promise<unknown> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`Telegram ${method} failed (${response.status})`);
  return response.json().catch(() => null);
}
