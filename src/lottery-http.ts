import type { Env } from './types';
import { gameBotToken, validateTelegramInitData } from './utils';
import { LOTTERY_NEXT_ROUND_DELAY_MS, buyLotteryTickets, getLotteryUserState } from './lottery';
import { LOTTERY_WINNER_COUNT, getLotteryPrizePoolNano, getLotteryPrizes, getLotteryWinners, userWonLotteryRound } from './lottery-prizes';
import { publishLiveActivity } from './live-activity';

export async function handleLotteryRequest(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/app/api/lottery/')) return null;

  const previousWinnerAvatar = url.pathname.match(/^\/app\/api\/lottery\/previous-winner-avatar\/([1-3])$/);
  if (request.method === 'GET' && previousWinnerAvatar) {
    const object = await env.ASSETS.get(`lottery/previous-winner/${previousWinnerAvatar[1]}`).catch(() => null);
    if (!object) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
    return new Response(object.body, { headers: {
      'content-type': object.httpMetadata?.contentType || 'image/jpeg',
      'cache-control': url.searchParams.get('v') ? 'public, max-age=31536000, immutable' : 'no-store',
      'x-content-type-options': 'nosniff',
    } });
  }

  try {
    if (request.method === 'GET' && url.pathname === '/app/api/lottery/state') {
      const serverStartedAtMs = Date.now();
      const userId = await authenticatedUser(request, env);
      const state = await getLotteryUserState(env, userId);
      const round = state.round;
      const snapshotNowMs = Date.now();
      const nextRoundStartsAtMs = Date.parse(String(round?.nextRoundStartsAt || ''));
      const previousWinnersAtMs = Number.isFinite(nextRoundStartsAtMs)
        ? nextRoundStartsAtMs - LOTTERY_NEXT_ROUND_DELAY_MS
        : 0;
      const waitingForWinner = Boolean(
        round?.status === 'closed'
        && previousWinnersAtMs > snapshotNowMs,
      );
      const winnerRoundId = waitingForWinner ? '' : (state.lastDraw?.roundId || '');
      const roundStatsQuery = round
        ? env.DB.prepare(`SELECT COUNT(*) AS count,
            COALESCE(SUM(CASE WHEN user_id=? THEN 1 ELSE 0 END),0) AS user_ticket_count
            FROM lottery_tickets WHERE round_id=?`)
          .bind(userId, round.id)
          .first<{ count: number; user_ticket_count: number }>()
        : Promise.resolve(null);
      const prizePoolQuery = round ? getLotteryPrizePoolNano(env, round.id) : Promise.resolve(0);
      const [lastDrawWon, roundStatsRow, prizePoolNano, winners] = await Promise.all([
        userWonLotteryRound(env, userId, state.lastDraw?.roundId),
        roundStatsQuery,
        prizePoolQuery,
        winnerRoundId ? getLotteryWinners(env, winnerRoundId) : Promise.resolve([]),
      ]);
      const roundTicketCount = Math.max(0, Math.floor(Number(roundStatsRow?.count || 0)));
      const userTicketCount = Math.max(0, Math.floor(Number(roundStatsRow?.user_ticket_count || 0)));
      const winChancePercent = round?.status === 'open' && roundTicketCount > 0
        ? Number(((userTicketCount / roundTicketCount) * 100).toFixed(6))
        : 0;
      const prizes = await getLotteryPrizes(env, prizePoolNano);
      const serverNowMs = Date.now();
      return json({
        ok: true,
        serverStartedAtMs,
        serverNowMs,
        winnerCount: LOTTERY_WINNER_COUNT,
        ...state,
        ticketCount: userTicketCount,
        roundTicketCount,
        userTicketCount,
        prizePoolNano,
        prizes,
        lastDrawWon,
        winChancePercent,
        waitingForWinner,
        winnerDisplayAtMs: waitingForWinner ? previousWinnersAtMs : 0,
        winners,
      });
    }

    if (request.method === 'POST' && url.pathname === '/app/api/lottery/tickets') {
      const body = await request.json().catch(() => ({})) as { initData?: unknown; quantity?: unknown; purchaseId?: unknown };
      const userId = await validateTelegramInitData(body.initData, gameBotToken(env));
      const result = await buyLotteryTickets(env, userId, body.quantity, body.purchaseId);
      const poolRow = await env.DB.prepare(`SELECT COUNT(*) AS round_ticket_count
        FROM lottery_tickets WHERE round_id=?`).bind(result.round.id).first<{ round_ticket_count: number }>();
      const roundTicketCount = Math.max(0, Math.floor(Number(poolRow?.round_ticket_count || 0)));
      const prizePoolNano = await getLotteryPrizePoolNano(env, result.round.id);
      await publishLiveActivity(env, {
        kind: 'ticket',
        userId,
        amountNano: result.paidNano,
        quantity: result.tickets.length,
        section: 'home',
        roundId: result.round.id,
        prizePoolNano,
        roundTicketCount,
        key: String(body.purchaseId || result.tickets[0]?.id || ''),
        createdAt: result.tickets[0]?.createdAt,
      }).catch((error) => console.warn('ticket live activity failed', error));
      return json({ ok: true, serverNowMs: Date.now(), prizePoolNano, roundTicketCount, ...result });
    }

    return json({ error: 'Lottery endpoint not found' }, 404);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lottery request failed';
    const authError = /telegram|init data|unauthorized|auth/i.test(message);
    return json({ error: message }, authError ? 401 : 400);
  }
}

async function authenticatedUser(request: Request, env: Env): Promise<string> {
  const url = new URL(request.url);
  const initData = request.headers.get('x-telegram-init-data') || url.searchParams.get('initData') || '';
  return validateTelegramInitData(initData, gameBotToken(env));
}

function json(value: unknown, status = 200): Response {
  return Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
}
