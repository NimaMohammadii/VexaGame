import type { Env } from './types';
import { ensureLevelTables } from './levels';
import { ensureTonBalanceColumn } from './user-controls';
import { ensureTonTransactionsTable } from './ton-transactions';

export const LOTTERY_WINNER_COUNT = 3;
export const LOTTERY_WINNER_COOLDOWN_DAYS = 21;
const PRIZE_PERCENT_TOTAL_BPS = 10_000;
const LOTTERY_PLATFORM_FEE_BPS = 2_000;
const LOTTERY_TICKET_PRIZE_BPS = PRIZE_PERCENT_TOTAL_BPS - LOTTERY_PLATFORM_FEE_BPS;
const DEFAULT_PRIZE_BPS = [5_000, 3_000, 2_000] as const;

type PrizeRow = { rank: number; prize_bps: number; updated_at: string };
type PrizePoolRow = { status: string; ticket_pool_nano: number; adjustment_nano: number };
type WinnerRow = {
  id: string;
  round_id: string;
  rank: number;
  user_id: string;
  ticket_id: string;
  ticket_code: string;
  prize_nano: number;
  payout_status: string;
  paid_at: string | null;
  created_at: string;
  username?: string | null;
  first_name?: string | null;
  avatar_url?: string | null;
  level?: number | null;
};
type CandidateRow = { id: string; user_id: string; code: string };
type ExistingWinnerRow = { rank: number; user_id: string };
type SelectedWinnerRow = { rank: number; user_id: string };
type TicketHolderRow = { user_id: string; username?: string | null; first_name?: string | null; ticket_count: number; paid_ticket_count: number; free_ticket_count: number; first_ticket_at: string; last_ticket_at: string };
type TicketHistoryRow = { round_id: string; ticket_code?: string | null; ticket_number: string; price_nano: number; is_free: number; created_at: string };
type WinnerHistoryRow = { round_id: string; rank: number; ticket_code: string; prize_nano: number; payout_status: string; paid_at?: string | null; created_at: string };

export type LotteryPrize = {
  rank: number;
  percentBps: number;
  percent: number;
  prizeNano: number;
  updatedAt: string;
};

export type LotteryWinner = {
  id: string;
  roundId: string;
  rank: number;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  level: number;
  ticketCode: string;
  prizeNano: number;
  paid: boolean;
  createdAt: string;
};

export type LotteryRoundTicketHolder = {
  userId: string;
  displayName: string;
  username: string | null;
  ticketCount: number;
  paidTicketCount: number;
  freeTicketCount: number;
  firstTicketAt: string;
  lastTicketAt: string;
};

export type LotteryUserHistory = {
  user: LotteryRoundTicketHolder;
  totalTicketCount: number;
  totalPaidTicketCount: number;
  totalFreeTicketCount: number;
  roundsEntered: number;
  winCount: number;
  totalPrizeNano: number;
  tickets: Array<{ roundId: string; ticketCode: string; priceNano: number; isFree: boolean; createdAt: string }>;
  wins: Array<{ roundId: string; rank: number; ticketCode: string; prizeNano: number; paid: boolean; paidAt: string | null; createdAt: string }>;
};

export async function ensureLotteryPrizeTables(env: Env): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lottery_prizes (
    rank INTEGER PRIMARY KEY,
    prize_bps INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare('ALTER TABLE lottery_prizes ADD COLUMN prize_bps INTEGER NOT NULL DEFAULT 0').run().catch(() => undefined);

  const seed = DEFAULT_PRIZE_BPS.map((prizeBps, index) =>
    env.DB.prepare(`INSERT OR IGNORE INTO lottery_prizes (rank,prize_bps,updated_at)
      VALUES (?,?,CURRENT_TIMESTAMP)`).bind(index + 1, prizeBps),
  );
  await env.DB.batch(seed);
  await env.DB.prepare('DELETE FROM lottery_prizes WHERE rank > ?').bind(LOTTERY_WINNER_COUNT).run();

  const total = await env.DB.prepare('SELECT COALESCE(SUM(prize_bps),0) AS total FROM lottery_prizes WHERE rank<=?')
    .bind(LOTTERY_WINNER_COUNT).first<{ total: number }>();
  if (Math.floor(Number(total?.total || 0)) !== PRIZE_PERCENT_TOTAL_BPS) {
    await env.DB.batch(DEFAULT_PRIZE_BPS.map((prizeBps, index) =>
      env.DB.prepare('UPDATE lottery_prizes SET prize_bps=?,updated_at=CURRENT_TIMESTAMP WHERE rank=?').bind(prizeBps, index + 1),
    ));
  }

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lottery_winners (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL,
    rank INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    ticket_id TEXT NOT NULL,
    ticket_code TEXT NOT NULL,
    prize_nano INTEGER NOT NULL DEFAULT 0,
    payout_status TEXT NOT NULL DEFAULT 'pending',
    paid_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(round_id, rank),
    UNIQUE(round_id, user_id)
  )`).run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_lottery_winners_round_rank ON lottery_winners(round_id,rank)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_lottery_winners_user_round ON lottery_winners(user_id,round_id)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_lottery_winners_user_created ON lottery_winners(user_id,created_at)').run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lottery_winner_selections (
    round_id TEXT NOT NULL,
    rank INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    selected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(round_id, rank),
    UNIQUE(round_id, user_id)
  )`).run();
}

export async function getLotteryWinnerSelections(env: Env, roundIdInput: unknown): Promise<Array<{ rank: number; userId: string; displayName: string }>> {
  await ensureLotteryPrizeTables(env);
  const roundId = String(roundIdInput || '').trim();
  if (!roundId) return [];
  const rows = await env.DB.prepare(`SELECT s.rank,s.user_id,u.username,u.first_name
    FROM lottery_winner_selections s
    LEFT JOIN app_users u ON u.telegram_user_id=s.user_id
    WHERE s.round_id=? ORDER BY s.rank ASC`).bind(roundId).all<SelectedWinnerRow & { username?: string | null; first_name?: string | null }>();
  return (rows.results || []).map((row) => {
    const username = cleanUsername(row.username);
    const firstName = String(row.first_name || '').trim().slice(0, 80);
    return { rank: Number(row.rank), userId: String(row.user_id), displayName: firstName || (username ? `@${username}` : `ID ${row.user_id}`) };
  });
}

export async function setLotteryWinnerSelection(env: Env, roundIdInput: unknown, rankInput: unknown, userIdInput: unknown): Promise<void> {
  await ensureLotteryPrizeTables(env);
  const roundId = String(roundIdInput || '').trim();
  const userId = String(userIdInput || '').trim();
  const rank = Math.floor(Number(rankInput));
  if (!roundId || !userId || rank < 1 || rank > LOTTERY_WINNER_COUNT) throw new Error('Invalid winner selection');
  const ticket = await env.DB.prepare('SELECT id FROM lottery_tickets WHERE round_id=? AND user_id=? LIMIT 1').bind(roundId, userId).first<{ id: string }>();
  if (!ticket) throw new Error('این کاربر در راند فعلی تیکت ندارد.');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM lottery_winner_selections WHERE round_id=? AND (rank=? OR user_id=?)').bind(roundId, rank, userId),
    env.DB.prepare(`INSERT INTO lottery_winner_selections (round_id,rank,user_id,selected_at)
      VALUES (?,?,?,CURRENT_TIMESTAMP)`).bind(roundId, rank, userId),
  ]);
}

export async function clearLotteryWinnerSelections(env: Env, roundIdInput: unknown): Promise<void> {
  await ensureLotteryPrizeTables(env);
  const roundId = String(roundIdInput || '').trim();
  if (roundId) await env.DB.prepare('DELETE FROM lottery_winner_selections WHERE round_id=?').bind(roundId).run();
}

export async function searchLotteryTicketHolders(env: Env, roundIdInput: unknown, queryInput: unknown = '', limitInput: unknown = 12): Promise<Array<{ userId: string; displayName: string; username: string | null; ticketCount: number }>> {
  await ensureLotteryPrizeTables(env);
  const roundId = String(roundIdInput || '').trim();
  const query = String(queryInput || '').trim().replace(/^@/, '').slice(0, 64);
  const limit = Math.max(1, Math.min(20, Math.floor(Number(limitInput) || 12)));
  if (!roundId) return [];
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  const rows = await env.DB.prepare(`SELECT t.user_id,u.username,u.first_name,COUNT(*) AS ticket_count
    FROM lottery_tickets t LEFT JOIN app_users u ON u.telegram_user_id=t.user_id
    WHERE t.round_id=? AND (?='' OR t.user_id=? OR COALESCE(u.username,'') LIKE ? ESCAPE '\\' COLLATE NOCASE OR COALESCE(u.first_name,'') LIKE ? ESCAPE '\\' COLLATE NOCASE)
    GROUP BY t.user_id,u.username,u.first_name ORDER BY ticket_count DESC,t.user_id ASC LIMIT ?`)
    .bind(roundId, query, query, pattern, pattern, limit).all<{ user_id: string; username: string | null; first_name: string | null; ticket_count: number }>();
  return (rows.results || []).map((row) => {
    const username = cleanUsername(row.username);
    return {
      userId: String(row.user_id),
      displayName: String(row.first_name || '').trim().slice(0, 80) || (username ? `@${username}` : `ID ${row.user_id}`),
      username: username || null,
      ticketCount: Math.max(0, Math.floor(Number(row.ticket_count) || 0)),
    };
  });
}

export async function listLotteryRoundTicketHolders(env: Env, roundIdInput: unknown, pageInput: unknown = 0, pageSizeInput: unknown = 8): Promise<{ holders: LotteryRoundTicketHolder[]; total: number; page: number; pageSize: number }> {
  await ensureLotteryPrizeTables(env);
  const roundId = String(roundIdInput || '').trim();
  const pageSize = Math.max(1, Math.min(12, Math.floor(Number(pageSizeInput) || 8)));
  const page = Math.max(0, Math.floor(Number(pageInput) || 0));
  if (!roundId) return { holders: [], total: 0, page: 0, pageSize };
  const [totalRow, rows] = await Promise.all([
    env.DB.prepare('SELECT COUNT(DISTINCT user_id) AS count FROM lottery_tickets WHERE round_id=?').bind(roundId).first<{ count: number }>(),
    env.DB.prepare(`SELECT t.user_id,u.username,u.first_name,COUNT(*) AS ticket_count,
        SUM(CASE WHEN t.is_free=0 THEN 1 ELSE 0 END) AS paid_ticket_count,
        SUM(CASE WHEN t.is_free=1 THEN 1 ELSE 0 END) AS free_ticket_count,
        MIN(t.created_at) AS first_ticket_at,MAX(t.created_at) AS last_ticket_at
      FROM lottery_tickets t LEFT JOIN app_users u ON u.telegram_user_id=t.user_id
      WHERE t.round_id=?
      GROUP BY t.user_id,u.username,u.first_name
      ORDER BY ticket_count DESC,datetime(last_ticket_at) ASC,t.user_id ASC LIMIT ? OFFSET ?`)
      .bind(roundId, pageSize, page * pageSize).all<TicketHolderRow>(),
  ]);
  return {
    holders: (rows.results || []).map(publicTicketHolder),
    total: Math.max(0, Math.floor(Number(totalRow?.count || 0))),
    page,
    pageSize,
  };
}

export async function getLotteryRoundTicketHolder(env: Env, roundIdInput: unknown, userIdInput: unknown): Promise<LotteryRoundTicketHolder | null> {
  await ensureLotteryPrizeTables(env);
  const roundId = String(roundIdInput || '').trim();
  const userId = String(userIdInput || '').trim();
  if (!roundId || !userId) return null;
  const row = await env.DB.prepare(`SELECT t.user_id,u.username,u.first_name,COUNT(*) AS ticket_count,
      SUM(CASE WHEN t.is_free=0 THEN 1 ELSE 0 END) AS paid_ticket_count,
      SUM(CASE WHEN t.is_free=1 THEN 1 ELSE 0 END) AS free_ticket_count,
      MIN(t.created_at) AS first_ticket_at,MAX(t.created_at) AS last_ticket_at
    FROM lottery_tickets t LEFT JOIN app_users u ON u.telegram_user_id=t.user_id
    WHERE t.round_id=? AND t.user_id=?
    GROUP BY t.user_id,u.username,u.first_name`).bind(roundId, userId).first<TicketHolderRow>();
  return row ? publicTicketHolder(row) : null;
}

export async function getLotteryUserHistory(env: Env, userIdInput: unknown): Promise<LotteryUserHistory> {
  await ensureLotteryPrizeTables(env);
  const userId = String(userIdInput || '').trim();
  if (!userId) throw new Error('Missing Lottery user');
  const [profile, totals, tickets, wins] = await Promise.all([
    env.DB.prepare('SELECT telegram_user_id AS user_id,username,first_name FROM app_users WHERE telegram_user_id=? LIMIT 1').bind(userId).first<{ user_id: string; username?: string | null; first_name?: string | null }>(),
    env.DB.prepare(`SELECT COUNT(*) AS ticket_count,
        SUM(CASE WHEN is_free=0 THEN 1 ELSE 0 END) AS paid_ticket_count,
        SUM(CASE WHEN is_free=1 THEN 1 ELSE 0 END) AS free_ticket_count,
        COUNT(DISTINCT round_id) AS rounds_entered
      FROM lottery_tickets WHERE user_id=?`).bind(userId).first<{ ticket_count: number; paid_ticket_count: number; free_ticket_count: number; rounds_entered: number }>(),
    env.DB.prepare(`SELECT round_id,ticket_code,ticket_number,price_nano,is_free,created_at FROM lottery_tickets
      WHERE user_id=? ORDER BY datetime(created_at) DESC,id DESC LIMIT 1200`).bind(userId).all<TicketHistoryRow>(),
    env.DB.prepare(`SELECT round_id,rank,ticket_code,prize_nano,payout_status,paid_at,created_at FROM lottery_winners
      WHERE user_id=? ORDER BY datetime(created_at) DESC,rank ASC`).bind(userId).all<WinnerHistoryRow>(),
  ]);
  const winnerRows = wins.results || [];
  const ticketRows = tickets.results || [];
  const totalPrizeNano = winnerRows.reduce((sum, row) => sum + Math.max(0, Math.floor(Number(row.prize_nano) || 0)), 0);
  return {
    user: publicTicketHolder({
      user_id: userId,
      username: profile?.username || null,
      first_name: profile?.first_name || null,
      ticket_count: Number(totals?.ticket_count || 0),
      paid_ticket_count: Number(totals?.paid_ticket_count || 0),
      free_ticket_count: Number(totals?.free_ticket_count || 0),
      first_ticket_at: ticketRows[ticketRows.length - 1]?.created_at || '',
      last_ticket_at: ticketRows[0]?.created_at || '',
    }),
    totalTicketCount: Math.max(0, Math.floor(Number(totals?.ticket_count || 0))),
    totalPaidTicketCount: Math.max(0, Math.floor(Number(totals?.paid_ticket_count || 0))),
    totalFreeTicketCount: Math.max(0, Math.floor(Number(totals?.free_ticket_count || 0))),
    roundsEntered: Math.max(0, Math.floor(Number(totals?.rounds_entered || 0))),
    winCount: winnerRows.length,
    totalPrizeNano,
    tickets: ticketRows.map((row) => ({
      roundId: String(row.round_id || ''),
      ticketCode: String(row.ticket_code || row.ticket_number || '').replace(/[^0-9]/g, '').slice(-5).padStart(5, '0'),
      priceNano: Math.max(0, Math.floor(Number(row.price_nano) || 0)),
      isFree: Number(row.is_free || 0) === 1,
      createdAt: String(row.created_at || ''),
    })),
    wins: winnerRows.map((row) => ({
      roundId: String(row.round_id || ''),
      rank: Math.max(1, Math.floor(Number(row.rank) || 1)),
      ticketCode: String(row.ticket_code || '').replace(/[^0-9]/g, '').slice(-5).padStart(5, '0'),
      prizeNano: Math.max(0, Math.floor(Number(row.prize_nano) || 0)),
      paid: String(row.payout_status || '') === 'paid',
      paidAt: row.paid_at ? String(row.paid_at) : null,
      createdAt: String(row.created_at || ''),
    })),
  };
}

export async function getLotteryPrizePoolNano(env: Env, roundIdInput: unknown): Promise<number> {
  await ensureLotteryPrizeTables(env);
  const roundId = String(roundIdInput || '').trim();
  if (!roundId) return 0;
  const row = await env.DB.prepare(`SELECT r.status,
      COALESCE((SELECT SUM(t.price_nano) FROM lottery_tickets t WHERE t.round_id=r.id),0) AS ticket_pool_nano,
      COALESCE(r.prize_pool_adjustment_nano,0) AS adjustment_nano
    FROM lottery_rounds r WHERE r.id=? LIMIT 1`).bind(roundId).first<PrizePoolRow>();
  if (!row) return 0;
  return cleanPrizePoolTotal(ticketPrizeContributionNano(row.ticket_pool_nano) + Number(row.adjustment_nano || 0));
}

export async function adjustLotteryPrizePool(env: Env, roundIdInput: unknown, deltaNanoInput: unknown): Promise<number> {
  await ensureLotteryPrizeTables(env);
  const roundId = String(roundIdInput || '').trim();
  const deltaNano = cleanPrizePoolDelta(deltaNanoInput);
  if (!roundId) throw new Error('راند Lottery موجود نیست.');
  const current = await env.DB.prepare(`SELECT r.status,
      COALESCE((SELECT SUM(t.price_nano) FROM lottery_tickets t WHERE t.round_id=r.id),0) AS ticket_pool_nano,
      COALESCE(r.prize_pool_adjustment_nano,0) AS adjustment_nano
    FROM lottery_rounds r WHERE r.id=? LIMIT 1`).bind(roundId).first<PrizePoolRow>();
  if (!current || current.status !== 'open') throw new Error('فقط Prize Pool راند باز قابل تغییر است.');
  const ticketContributionNano = ticketPrizeContributionNano(current.ticket_pool_nano);
  const currentTotal = cleanPrizePoolTotal(ticketContributionNano + Number(current.adjustment_nano || 0));
  if (currentTotal + deltaNano < 0) throw new Error('Prize Pool نمی‌تواند کمتر از صفر شود.');
  const nextAdjustment = Number(current.adjustment_nano || 0) + deltaNano;
  if (!Number.isSafeInteger(nextAdjustment)) throw new Error('مقدار Prize Pool بیش از حد بزرگ است.');
  const updated = await env.DB.prepare(`UPDATE lottery_rounds
    SET prize_pool_adjustment_nano=COALESCE(prize_pool_adjustment_nano,0)+?,updated_at=CURRENT_TIMESTAMP
    WHERE id=? AND status='open'
      AND COALESCE(prize_pool_adjustment_nano,0) + ? + ? >= 0`)
    .bind(deltaNano, roundId, deltaNano, ticketContributionNano).run();
  if (Number(updated.meta?.changes || 0) <= 0) throw new Error('Prize Pool تغییر نکرد؛ دوباره تلاش کنید.');
  return getLotteryPrizePoolNano(env, roundId);
}

export async function getLotteryPrizes(env: Env, prizePoolNanoInput: unknown = 0): Promise<LotteryPrize[]> {
  await ensureLotteryPrizeTables(env);
  const rows = await env.DB.prepare('SELECT rank,prize_bps,updated_at FROM lottery_prizes ORDER BY rank ASC')
    .all<PrizeRow>();
  const configured = (rows.results || []).slice(0, LOTTERY_WINNER_COUNT).map((row) => ({
    rank: Math.max(1, Math.min(LOTTERY_WINNER_COUNT, Math.floor(Number(row.rank) || 1))),
    percentBps: cleanPrizeBps(row.prize_bps),
    updatedAt: String(row.updated_at || ''),
  }));
  const amounts = allocatePrizePool(prizePoolNanoInput, configured.map((item) => item.percentBps));
  return configured.map((item, index) => ({ ...item, percent: item.percentBps / 100, prizeNano: amounts[index] || 0 }));
}

export async function setLotteryPrizePercentages(env: Env, percentBpsInput: unknown[]): Promise<LotteryPrize[]> {
  await ensureLotteryPrizeTables(env);
  if (!Array.isArray(percentBpsInput) || percentBpsInput.length !== LOTTERY_WINNER_COUNT) throw new Error('Exactly three prize percentages are required');
  const percentBps = percentBpsInput.map(cleanPrizeBps);
  if (percentBps.reduce((sum, value) => sum + value, 0) !== PRIZE_PERCENT_TOTAL_BPS) throw new Error('Prize percentages must total 100%');
  await env.DB.batch(percentBps.map((value, index) =>
    env.DB.prepare('UPDATE lottery_prizes SET prize_bps=?,updated_at=CURRENT_TIMESTAMP WHERE rank=?').bind(value, index + 1),
  ));
  return getLotteryPrizes(env);
}

export async function getLotteryWinners(env: Env, roundIdInput?: unknown): Promise<LotteryWinner[]> {
  await ensureLotteryPrizeTables(env);
  await ensureLevelTables(env);
  await ensureLotteryWinnerProfileColumn(env);
  let roundId = String(roundIdInput || '').trim();
  if (!roundId) {
    const latest = await env.DB.prepare(`SELECT round_id FROM lottery_winners
      ORDER BY datetime(created_at) DESC, rank ASC LIMIT 1`).first<{ round_id: string }>();
    roundId = String(latest?.round_id || '');
  }
  if (!roundId) return [];

  const rows = await env.DB.prepare(`SELECT w.*,u.username,u.first_name,u.avatar_url,l.level
    FROM lottery_winners w
    LEFT JOIN app_users u ON u.telegram_user_id=w.user_id
    LEFT JOIN user_levels l ON l.user_id=w.user_id
    WHERE w.round_id=?
    ORDER BY w.rank ASC
    LIMIT ?`).bind(roundId, LOTTERY_WINNER_COUNT).all<WinnerRow>();
  return (rows.results || []).map(publicWinner);
}

export async function userWonLotteryRound(env: Env, userIdInput: unknown, roundIdInput: unknown): Promise<boolean> {
  await ensureLotteryPrizeTables(env);
  const userId = String(userIdInput || '').trim();
  const roundId = String(roundIdInput || '').trim();
  if (!userId || !roundId) return false;
  const row = await env.DB.prepare('SELECT id FROM lottery_winners WHERE user_id=? AND round_id=? LIMIT 1')
    .bind(userId, roundId).first<{ id: string }>();
  return Boolean(row?.id);
}

export async function finalizeLotteryWinners(env: Env, roundIdInput: unknown): Promise<LotteryWinner[]> {
  await ensureLotteryPrizeTables(env);
  const roundId = String(roundIdInput || '').trim();
  if (!roundId) throw new Error('Missing Lottery round');

  const prizes = await getLotteryPrizes(env, await getLotteryPrizePoolNano(env, roundId));
  const existingRows = await env.DB.prepare(`SELECT rank,user_id FROM lottery_winners
    WHERE round_id=? ORDER BY rank ASC`).bind(roundId).all<ExistingWinnerRow>();
  const existing = existingRows.results || [];
  const selectedUsers = existing.map((row) => String(row.user_id || '')).filter(Boolean);
  const occupiedRanks = new Set(existing.map((row) => Math.floor(Number(row.rank) || 0)));
  const configuredRows = await env.DB.prepare(`SELECT rank,user_id FROM lottery_winner_selections
    WHERE round_id=? ORDER BY rank ASC`).bind(roundId).all<SelectedWinnerRow>();
  const configured = new Map((configuredRows.results || []).map((row) => [Number(row.rank), String(row.user_id)]));

  for (let rank = 1; rank <= LOTTERY_WINNER_COUNT; rank += 1) {
    if (occupiedRanks.has(rank)) continue;
    const selectedUser = configured.get(rank);
    let candidate = selectedUser && !selectedUsers.includes(selectedUser)
      ? await randomCandidateForUser(env, roundId, selectedUser)
      : null;
    if (!candidate) candidate = await randomCandidate(env, roundId, selectedUsers);
    if (!candidate) break;
    const prizeNano = Math.max(0, Math.floor(Number(prizes[rank - 1]?.prizeNano) || 0));
    const winnerId = `lw_${randomHex(24)}`;
    const result = await env.DB.prepare(`INSERT OR IGNORE INTO lottery_winners
      (id,round_id,rank,user_id,ticket_id,ticket_code,prize_nano,payout_status,paid_at,created_at)
      VALUES (?,?,?,?,?,?,?,'pending',NULL,CURRENT_TIMESTAMP)`)
      .bind(winnerId, roundId, rank, candidate.user_id, candidate.id, candidate.code, prizeNano).run();
    if (Number(result.meta?.changes || 0) > 0) {
      selectedUsers.push(candidate.user_id);
      occupiedRanks.add(rank);
    } else {
      const saved = await env.DB.prepare('SELECT rank,user_id FROM lottery_winners WHERE round_id=? AND rank=? LIMIT 1')
        .bind(roundId, rank).first<ExistingWinnerRow>();
      if (saved?.user_id && !selectedUsers.includes(saved.user_id)) selectedUsers.push(saved.user_id);
      if (saved?.rank) occupiedRanks.add(Number(saved.rank));
    }
  }

  await payPendingLotteryWinners(env, roundId);
  return getLotteryWinners(env, roundId);
}

async function randomCandidateForUser(env: Env, roundId: string, userId: string): Promise<CandidateRow | null> {
  const rows = await env.DB.prepare(`SELECT id,user_id,COALESCE(NULLIF(ticket_code,''),substr(ticket_number,-5)) AS code
    FROM lottery_tickets WHERE round_id=? AND user_id=?
    AND COALESCE(NULLIF(ticket_code,''),substr(ticket_number,-5))!=''
    ORDER BY datetime(created_at) ASC,id ASC`)
    .bind(roundId, userId).all<CandidateRow>();
  const candidates = rows.results || [];
  if (!candidates.length) return null;
  const row = candidates[secureRandomIndex(candidates.length)];
  const code = String(row.code || '').replace(/[^0-9]/g, '').slice(-5).padStart(5, '0');
  return /^\d{5}$/.test(code) ? { id: row.id, user_id: row.user_id, code } : null;
}

async function randomCandidate(env: Env, roundId: string, excludedUsers: string[]): Promise<CandidateRow | null> {
  const exclusion = excludedUsers.length ? ` AND user_id NOT IN (${excludedUsers.map(() => '?').join(',')})` : '';
  const countSql = `SELECT COUNT(*) AS count FROM lottery_tickets
    WHERE round_id=? AND COALESCE(NULLIF(ticket_code,''),substr(ticket_number,-5))!=''
    AND NOT EXISTS (SELECT 1 FROM lottery_winners w WHERE w.user_id=lottery_tickets.user_id AND w.created_at>?)${exclusion}`;
  const cooldownCutoff = lotteryWinnerCooldownCutoff();
  const countRow = await env.DB.prepare(countSql).bind(roundId, cooldownCutoff, ...excludedUsers).first<{ count: number }>();
  const count = Math.max(0, Math.floor(Number(countRow?.count || 0)));
  if (!count) return null;

  const offset = secureRandomIndex(count);
  const rowSql = `SELECT id,user_id,COALESCE(NULLIF(ticket_code,''),substr(ticket_number,-5)) AS code
    FROM lottery_tickets
    WHERE round_id=? AND COALESCE(NULLIF(ticket_code,''),substr(ticket_number,-5))!=''
    AND NOT EXISTS (SELECT 1 FROM lottery_winners w WHERE w.user_id=lottery_tickets.user_id AND w.created_at>?)${exclusion}
    ORDER BY datetime(created_at) ASC,id ASC LIMIT 1 OFFSET ?`;
  const row = await env.DB.prepare(rowSql).bind(roundId, cooldownCutoff, ...excludedUsers, offset).first<CandidateRow>();
  if (!row) return null;
  const code = String(row.code || '').replace(/[^0-9]/g, '').slice(-5).padStart(5, '0');
  if (!/^\d{5}$/.test(code)) return null;
  return { id: row.id, user_id: row.user_id, code };
}

function lotteryWinnerCooldownCutoff(): string {
  return new Date(Date.now() - LOTTERY_WINNER_COOLDOWN_DAYS * 24 * 60 * 60_000).toISOString();
}

async function payPendingLotteryWinners(env: Env, roundId: string): Promise<void> {
  await ensureTonBalanceColumn(env);
  await ensureTonTransactionsTable(env);
  const rows = await env.DB.prepare(`SELECT * FROM lottery_winners
    WHERE round_id=? AND payout_status='pending' ORDER BY rank ASC`)
    .bind(roundId).all<WinnerRow>();

  for (const row of rows.results || []) {
    const amount = Math.max(0, Math.floor(Number(row.prize_nano) || 0));
    if (amount <= 0) {
      await env.DB.prepare(`UPDATE lottery_winners SET payout_status='paid',paid_at=CURRENT_TIMESTAMP
        WHERE id=? AND payout_status='pending'`).bind(row.id).run();
      continue;
    }

    const txnId = `txn_${randomHex(22)}`;
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO app_users (telegram_user_id,current_section,ton_balance_nano,last_seen_at,updated_at)
        VALUES (?,'home',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
        ON CONFLICT(telegram_user_id) DO NOTHING`).bind(row.user_id),
      env.DB.prepare(`UPDATE app_users SET ton_balance_nano=ton_balance_nano+?,updated_at=CURRENT_TIMESTAMP
        WHERE telegram_user_id=? AND EXISTS (
          SELECT 1 FROM lottery_winners WHERE id=? AND payout_status='pending'
        )`).bind(amount, row.user_id, row.id),
      env.DB.prepare(`INSERT INTO ton_transactions
        (id,user_id,kind,title,description,amount_nano,balance_after_nano,status,reference_id,reference_type,metadata_json,created_at)
        SELECT ?,?,'adjustment',?,NULL,?,u.ton_balance_nano,'completed',?,'lottery_prize',?,CURRENT_TIMESTAMP
        FROM app_users u
        WHERE u.telegram_user_id=? AND EXISTS (
          SELECT 1 FROM lottery_winners WHERE id=? AND payout_status='pending'
        )`).bind(
          txnId,
          row.user_id,
          `Lottery prize #${row.rank}`,
          amount,
          row.id,
          JSON.stringify({ section: 'home', feature: 'lottery', currency: 'GRAM', roundId, rank: row.rank, ticketCode: row.ticket_code }),
          row.user_id,
          row.id,
        ),
      env.DB.prepare(`UPDATE lottery_winners SET payout_status='paid',paid_at=CURRENT_TIMESTAMP
        WHERE id=? AND payout_status='pending'`).bind(row.id),
    ]);
  }
}

function publicWinner(row: WinnerRow): LotteryWinner {
  const username = cleanUsername(row.username);
  const firstName = String(row.first_name || '').trim().slice(0, 80);
  const suffix = String(row.user_id || '').slice(-4);
  const displayName = firstName || (username ? `@${username}` : `Player ${suffix || '—'}`);
  const code = String(row.ticket_code || '').replace(/[^0-9]/g, '').slice(-5).padStart(5, '0');
  return {
    id: row.id,
    roundId: row.round_id,
    rank: Math.max(1, Math.min(LOTTERY_WINNER_COUNT, Math.floor(Number(row.rank) || 1))),
    displayName,
    username: username || null,
    avatarUrl: cleanAvatarUrl(row.avatar_url) || (username ? `https://t.me/i/userpic/320/${encodeURIComponent(username)}.jpg` : null),
    level: Math.max(1, Math.floor(Number(row.level) || 1)),
    ticketCode: code,
    prizeNano: Math.max(0, Math.floor(Number(row.prize_nano) || 0)),
    paid: String(row.payout_status || '') === 'paid',
    createdAt: String(row.created_at || ''),
  };
}

function publicTicketHolder(row: TicketHolderRow): LotteryRoundTicketHolder {
  const username = cleanUsername(row.username);
  const firstName = String(row.first_name || '').trim().slice(0, 80);
  return {
    userId: String(row.user_id || ''),
    displayName: firstName || (username ? `@${username}` : `ID ${row.user_id}`),
    username: username || null,
    ticketCount: Math.max(0, Math.floor(Number(row.ticket_count) || 0)),
    paidTicketCount: Math.max(0, Math.floor(Number(row.paid_ticket_count) || 0)),
    freeTicketCount: Math.max(0, Math.floor(Number(row.free_ticket_count) || 0)),
    firstTicketAt: String(row.first_ticket_at || ''),
    lastTicketAt: String(row.last_ticket_at || ''),
  };
}

async function ensureLotteryWinnerProfileColumn(env: Env): Promise<void> {
  await env.DB.prepare('ALTER TABLE app_users ADD COLUMN avatar_url TEXT').run().catch(() => undefined);
}

function cleanAvatarUrl(value: unknown): string | null {
  const candidate = String(value || '').trim();
  if (!candidate || candidate.length > 1_500) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function cleanPrizeBps(value: unknown): number {
  const bps = Math.floor(Number(value));
  if (!Number.isSafeInteger(bps) || bps < 0 || bps > PRIZE_PERCENT_TOTAL_BPS) throw new Error('Invalid Lottery prize percentage');
  return bps;
}

function cleanPrizePoolTotal(value: unknown): number {
  const total = Math.floor(Number(value));
  if (!Number.isSafeInteger(total)) throw new Error('مقدار Prize Pool بیش از حد بزرگ است.');
  return Math.max(0, total);
}

function cleanPrizePoolDelta(value: unknown): number {
  const delta = Math.trunc(Number(value));
  if (!Number.isSafeInteger(delta) || delta === 0) throw new Error('مقدار تغییر Prize Pool نامعتبر است.');
  return delta;
}

function applyBpsFloor(value: unknown, bpsInput: unknown): number {
  const total = cleanPrizePoolTotal(value);
  const bps = cleanPrizeBps(bpsInput);
  const whole = Math.floor(total / PRIZE_PERCENT_TOTAL_BPS);
  const remainder = total % PRIZE_PERCENT_TOTAL_BPS;
  return whole * bps + Math.floor(remainder * bps / PRIZE_PERCENT_TOTAL_BPS);
}

function ticketPrizeContributionNano(ticketRevenueNano: unknown): number {
  return applyBpsFloor(ticketRevenueNano, LOTTERY_TICKET_PRIZE_BPS);
}

function allocatePrizePool(prizePoolNanoInput: unknown, percentBps: number[]): number[] {
  const pool = Math.max(0, Math.floor(Number(prizePoolNanoInput) || 0));
  const amounts = percentBps.map((bps) => Math.floor(pool * cleanPrizeBps(bps) / PRIZE_PERCENT_TOTAL_BPS));
  let remainder = pool - amounts.reduce((sum, amount) => sum + amount, 0);
  for (let index = 0; remainder > 0 && index < amounts.length; index += 1, remainder -= 1) amounts[index] += 1;
  return amounts;
}

function cleanUsername(value: unknown): string {
  return String(value || '').replace(/^@+/, '').replace(/[^0-9A-Za-z_]/g, '').slice(0, 64);
}

function secureRandomIndex(maxExclusive: number): number {
  const maxValue = Math.floor(Number(maxExclusive));
  if (!Number.isSafeInteger(maxValue) || maxValue <= 0 || maxValue > 0x1_0000_0000) throw new Error('Invalid random range');
  const range = 0x1_0000_0000;
  const limit = Math.floor(range / maxValue) * maxValue;
  const bytes = new Uint32Array(1);
  let value = 0;
  do {
    crypto.getRandomValues(bytes);
    value = bytes[0];
  } while (value >= limit);
  return value % maxValue;
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, '0')).join('').slice(0, length);
}
