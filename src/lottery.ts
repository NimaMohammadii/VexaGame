import type { Env } from './types';
import { adjustUserTonBalance, assertUserNotBanned, debitUserTonBalanceIfEnough, getUserControls } from './user-controls';
import { finalizeLotteryWinners } from './lottery-prizes';

export const LOTTERY_DEFAULT_TICKET_PRICE_NANO = 150_000_000;
export const LOTTERY_DEFAULT_DRAW_INTERVAL_MINUTES = 24 * 60;
export const LOTTERY_MAX_PURCHASE_QUANTITY = 60;
export const LOTTERY_DRAW_DELAY_MS = 5_000;
export const LOTTERY_DRAW_ANIMATION_MS = 18_260;
export const LOTTERY_NEXT_ROUND_DELAY_MS = 10_000;

const LOTTERY_SCHEDULER_NAME = 'global';
const LOTTERY_SCHEDULER_RETRY_MS = 2_000;
let lotterySchedulerBootstrap: Promise<void> | null = null;

export type LotterySettings = {
  enabled: boolean;
  salesOpen: boolean;
  freeTicketEnabled: boolean;
  ticketPriceNano: number;
  maxTicketsPerUser: number;
  drawIntervalMinutes: number;
  nextDrawAt: string;
  updatedAt: string;
};

export type LotteryRound = {
  id: string;
  status: 'open' | 'closed';
  opensAt: string;
  drawAt: string;
  drawStartsAt: string;
  nextRoundStartsAt: string;
  ticketPriceNano: number;
  createdAt: string;
  updatedAt: string;
};

export type LotteryDraw = {
  roundId: string;
  winningCode: string;
  drawAt: string;
  drawnAt: string;
};

export type LotteryTicket = {
  id: string;
  roundId: string;
  ticketNumber: string;
  priceNano: number;
  isFree: boolean;
  createdAt: string;
};

export type LotteryUserState = {
  settings: LotterySettings;
  round: LotteryRound | null;
  lastDraw: LotteryDraw | null;
  tickets: LotteryTicket[];
  ticketCount: number;
  freeTicketAvailable: boolean;
  gramBalanceNano: number;
  canBuy: boolean;
  reason: string | null;
};

type SettingsRow = {
  enabled: number;
  sales_open: number;
  free_ticket_enabled: number;
  ticket_price_nano: number;
  max_tickets_per_user: number;
  draw_interval_minutes: number;
  next_draw_at: string;
  updated_at: string;
};

type RoundRow = {
  id: string;
  status: 'open' | 'closed';
  opens_at: string;
  draw_at: string;
  ticket_price_nano: number;
  winning_code?: string | null;
  drawn_at?: string | null;
  draw_lock?: string | null;
  created_at: string;
  updated_at: string;
};

type TicketRow = {
  id: string;
  round_id: string;
  ticket_number: string;
  ticket_code?: string | null;
  price_nano: number;
  is_free: number;
  created_at: string;
};

type AdminStatsRow = {
  ticket_count: number;
  player_count: number;
  paid_ticket_count: number;
  free_ticket_count: number;
  revenue_nano: number;
};

export async function ensureLotteryTables(env: Env): Promise<void> {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lottery_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    enabled INTEGER NOT NULL DEFAULT 1,
    sales_open INTEGER NOT NULL DEFAULT 1,
    free_ticket_enabled INTEGER NOT NULL DEFAULT 1,
    ticket_price_nano INTEGER NOT NULL DEFAULT 150000000,
    max_tickets_per_user INTEGER NOT NULL DEFAULT 0,
    draw_interval_minutes INTEGER NOT NULL DEFAULT 1440,
    next_draw_at TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lottery_rounds (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'open',
    opens_at TEXT NOT NULL,
    draw_at TEXT NOT NULL,
    ticket_price_nano INTEGER NOT NULL,
    winning_code TEXT,
    drawn_at TEXT,
    draw_lock TEXT,
    prize_pool_adjustment_nano INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
  await env.DB.prepare('ALTER TABLE lottery_rounds ADD COLUMN winning_code TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE lottery_rounds ADD COLUMN drawn_at TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE lottery_rounds ADD COLUMN draw_lock TEXT').run().catch(() => undefined);
  await env.DB.prepare('ALTER TABLE lottery_rounds ADD COLUMN prize_pool_adjustment_nano INTEGER NOT NULL DEFAULT 0').run().catch(() => undefined);

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lottery_round_free_claims (
    user_id TEXT NOT NULL,
    round_id TEXT NOT NULL,
    claim_request_id TEXT NOT NULL,
    ticket_id TEXT,
    claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(user_id, round_id)
  )`).run();
  await env.DB.prepare('DROP TABLE IF EXISTS lottery_free_claims').run().catch(() => undefined);

  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS lottery_tickets (
    id TEXT PRIMARY KEY,
    round_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    ticket_number TEXT NOT NULL UNIQUE,
    ticket_code TEXT,
    price_nano INTEGER NOT NULL DEFAULT 0,
    is_free INTEGER NOT NULL DEFAULT 0,
    purchase_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, purchase_id, id)
  )`).run();
  await env.DB.prepare('ALTER TABLE lottery_tickets ADD COLUMN ticket_code TEXT').run().catch(() => undefined);
  await env.DB.prepare(`INSERT OR IGNORE INTO lottery_round_free_claims
    (user_id,round_id,claim_request_id,ticket_id,claimed_at)
    SELECT user_id,round_id,purchase_id,id,created_at FROM lottery_tickets WHERE is_free=1`).run().catch(() => undefined);

  await env.DB.prepare(`UPDATE lottery_rounds SET status='closed',draw_lock=NULL,updated_at=CURRENT_TIMESTAMP
    WHERE status='open' AND id NOT IN (
      SELECT id FROM lottery_rounds WHERE status='open' ORDER BY datetime(created_at) DESC LIMIT 1
    )`).run().catch(() => undefined);

  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_lottery_round_status ON lottery_rounds(status, draw_at)').run();
  await env.DB.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_lottery_single_open_round ON lottery_rounds(status) WHERE status='open'").run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_lottery_tickets_user_round ON lottery_tickets(user_id, round_id, created_at)').run();
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_lottery_tickets_purchase ON lottery_tickets(user_id, purchase_id)').run();
  await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_lottery_ticket_code_round ON lottery_tickets(round_id, ticket_code) WHERE ticket_code IS NOT NULL').run();

  const existing = await env.DB.prepare('SELECT id FROM lottery_settings WHERE id = 1').first<{ id: number }>();
  if (!existing) {
    const nextDrawAt = new Date(Date.now() + LOTTERY_DEFAULT_DRAW_INTERVAL_MINUTES * 60_000).toISOString();
    await env.DB.prepare(`INSERT INTO lottery_settings
      (id,enabled,sales_open,free_ticket_enabled,ticket_price_nano,max_tickets_per_user,draw_interval_minutes,next_draw_at,updated_at)
      VALUES (1,1,1,1,150000000,0,1440,?,CURRENT_TIMESTAMP)`)
      .bind(nextDrawAt).run();
  }
}

export async function getLotterySettings(env: Env): Promise<LotterySettings> {
  await ensureLotteryTables(env);
  const row = await env.DB.prepare('SELECT * FROM lottery_settings WHERE id = 1').first<SettingsRow>();
  if (!row) throw new Error('Lottery settings are unavailable');
  return publicSettings(row);
}

export async function getCurrentLotteryRound(env: Env, createIfMissing = true): Promise<LotteryRound | null> {
  await ensureLotteryTables(env);
  const now = Date.now();
  let row = await env.DB.prepare("SELECT * FROM lottery_rounds WHERE status='open' ORDER BY datetime(created_at) DESC LIMIT 1").first<RoundRow>();

  if (row) {
    const drawAtMs = Date.parse(row.draw_at);
    if (Number.isFinite(drawAtMs) && now < drawAtMs) return publicRound(row);
    if (Number.isFinite(drawAtMs) && now >= drawAtMs) {
      await finalizeLotteryRound(env, row);
      const after = await env.DB.prepare('SELECT * FROM lottery_rounds WHERE id=?').bind(row.id).first<RoundRow>();
      if (after?.status === 'open') return publicRound(after);
      row = null;
    }
  }

  const latestClosed = await env.DB.prepare("SELECT * FROM lottery_rounds WHERE status='closed' ORDER BY datetime(COALESCE(drawn_at,updated_at)) DESC LIMIT 1").first<RoundRow>();
  if (!createIfMissing) return latestClosed ? publicRound(latestClosed) : null;

  const settings = await getLotterySettings(env);
  if (!settings.enabled) return latestClosed ? publicRound(latestClosed) : null;

  if (latestClosed) {
    const nextRoundStartsAtMs = roundNextStartsAtMs(latestClosed);
    if (Number.isFinite(nextRoundStartsAtMs) && now < nextRoundStartsAtMs) return publicRound(latestClosed);
  }

  const opensAtMs = now;
  const opensAt = new Date(opensAtMs).toISOString();
  let drawAtMs = opensAtMs + settings.drawIntervalMinutes * 60_000;
  if (!latestClosed) {
    const configured = Date.parse(settings.nextDrawAt);
    if (Number.isFinite(configured) && configured > opensAtMs + 5_000) drawAtMs = configured;
  }
  const drawAt = new Date(drawAtMs).toISOString();

  if (drawAt !== settings.nextDrawAt) {
    await env.DB.prepare('UPDATE lottery_settings SET next_draw_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=1').bind(drawAt).run();
  }

  const id = roundId();
  try {
    await env.DB.prepare(`INSERT INTO lottery_rounds
      (id,status,opens_at,draw_at,ticket_price_nano,winning_code,drawn_at,draw_lock,created_at,updated_at)
      VALUES (?,'open',?,?,?,NULL,NULL,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
      .bind(id, opensAt, drawAt, settings.ticketPriceNano).run();
  } catch {
    // A concurrent request may have created the single open round first.
  }

  row = await env.DB.prepare("SELECT * FROM lottery_rounds WHERE status='open' ORDER BY datetime(created_at) DESC LIMIT 1").first<RoundRow>();
  return row ? publicRound(row) : (latestClosed ? publicRound(latestClosed) : null);
}

export async function startLotteryNow(env: Env): Promise<LotteryRound> {
  await ensureLotteryTables(env);
  const current = await getLotterySettings(env);
  const now = new Date().toISOString();
  const drawAt = new Date(Date.now() + current.drawIntervalMinutes * 60_000).toISOString();

  await env.DB.prepare(`UPDATE lottery_settings
    SET enabled=1,sales_open=1,next_draw_at=?,updated_at=CURRENT_TIMESTAMP WHERE id=1`).bind(drawAt).run();

  let row = await env.DB.prepare("SELECT * FROM lottery_rounds WHERE status='open' ORDER BY datetime(created_at) DESC LIMIT 1").first<RoundRow>();
  if (row) {
    await env.DB.prepare(`UPDATE lottery_rounds
      SET opens_at=?,draw_at=?,ticket_price_nano=?,winning_code=NULL,drawn_at=NULL,draw_lock=NULL,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND status='open'`)
      .bind(now, drawAt, current.ticketPriceNano, row.id).run();
  } else {
    const id = roundId();
    try {
      await env.DB.prepare(`INSERT INTO lottery_rounds
        (id,status,opens_at,draw_at,ticket_price_nano,winning_code,drawn_at,draw_lock,created_at,updated_at)
        VALUES (?,'open',?,?,?,NULL,NULL,NULL,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`)
        .bind(id, now, drawAt, current.ticketPriceNano).run();
    } catch {
      // A concurrent admin action may have created the round first.
    }
  }

  row = await env.DB.prepare("SELECT * FROM lottery_rounds WHERE status='open' ORDER BY datetime(created_at) DESC LIMIT 1").first<RoundRow>();
  if (!row) throw new Error('Could not start Lottery round');
  await syncLotteryScheduler(env);
  return publicRound(row);
}

export async function getLatestLotteryDraw(env: Env): Promise<LotteryDraw | null> {
  await ensureLotteryTables(env);
  const row = await env.DB.prepare(`SELECT * FROM lottery_rounds
    WHERE status='closed' AND winning_code IS NOT NULL AND winning_code!=''
    ORDER BY datetime(COALESCE(drawn_at,updated_at)) DESC LIMIT 1`).first<RoundRow>();
  return row ? publicDraw(row) : null;
}

export async function getLotteryUserState(env: Env, userId: string): Promise<LotteryUserState> {
  const id = cleanUserId(userId);
  await assertUserNotBanned(env, id);
  const settings = await getLotterySettings(env);
  const round = await getCurrentLotteryRound(env, true);
  const lastDraw = await getLatestLotteryDraw(env);
  const openRound = round?.status === 'open' && Date.parse(round.drawAt) > Date.now() ? round : null;
  const displayRound = round;
  const tickets = displayRound ? await listLotteryTickets(env, id, displayRound.id, 100) : [];
  const freeTicketAvailable = Boolean(settings.freeTicketEnabled && openRound && !(await hasClaimedFreeTicket(env, id, openRound.id)));
  const controls = await getUserControls(env, id);
  await ensureLotterySchedulerStarted(env).catch((error) => console.warn('Lottery scheduler bootstrap failed', error));
  const reason = !settings.enabled ? 'Lottery is disabled'
    : !settings.salesOpen ? 'Ticket sales are paused'
      : !openRound ? 'This round is closed'
        : null;
  return {
    settings,
    round,
    lastDraw,
    tickets,
    ticketCount: tickets.length,
    freeTicketAvailable,
    gramBalanceNano: controls.tonBalanceNano,
    canBuy: !reason,
    reason,
  };
}

export async function listLotteryTickets(env: Env, userId: string, roundId?: string, limit = 100): Promise<LotteryTicket[]> {
  await ensureLotteryTables(env);
  const id = cleanUserId(userId);
  const max = Math.max(1, Math.min(250, Math.floor(Number(limit) || 100)));
  const rows = roundId
    ? await env.DB.prepare(`SELECT id,round_id,ticket_number,ticket_code,price_nano,is_free,created_at FROM lottery_tickets
        WHERE user_id=? AND round_id=? ORDER BY datetime(created_at) DESC LIMIT ?`).bind(id, roundId, max).all<TicketRow>()
    : await env.DB.prepare(`SELECT id,round_id,ticket_number,ticket_code,price_nano,is_free,created_at FROM lottery_tickets
        WHERE user_id=? ORDER BY datetime(created_at) DESC LIMIT ?`).bind(id, max).all<TicketRow>();
  return (rows.results || []).map(publicTicket);
}

export async function buyLotteryTickets(env: Env, userId: string, quantityInput: unknown, purchaseIdInput: unknown): Promise<{
  tickets: LotteryTicket[];
  ticketCount: number;
  freeTicketAvailable: boolean;
  paidNano: number;
  gramBalanceNano: number;
  round: LotteryRound;
}> {
  const user = cleanUserId(userId);
  const quantity = cleanQuantity(quantityInput);
  const purchaseId = cleanPurchaseId(purchaseIdInput);
  await assertUserNotBanned(env, user);
  await ensureLotteryTables(env);

  const existing = await ticketsForPurchase(env, user, purchaseId);
  if (existing.length) {
    const existingRoundId = existing[0].roundId;
    const roundRow = await env.DB.prepare('SELECT * FROM lottery_rounds WHERE id=?').bind(existingRoundId).first<RoundRow>();
    if (!roundRow) throw new Error('Lottery round is unavailable');
    const current = publicRound(roundRow);
    const all = await listLotteryTickets(env, user, existingRoundId, 250);
    const controls = await getUserControls(env, user);
    const settings = await getLotterySettings(env);
    return {
      tickets: existing,
      ticketCount: all.length,
      freeTicketAvailable: settings.freeTicketEnabled && current.status === 'open' && Date.parse(current.drawAt) > Date.now() && !(await hasClaimedFreeTicket(env, user, existingRoundId)),
      paidNano: existing.reduce((sum, ticket) => sum + ticket.priceNano, 0),
      gramBalanceNano: controls.tonBalanceNano,
      round: current,
    };
  }

  const settings = await getLotterySettings(env);
  if (!settings.enabled) throw new Error('Lottery is disabled');
  if (!settings.salesOpen) throw new Error('Ticket sales are paused');
  const round = await getCurrentLotteryRound(env, true);
  if (!round || round.status !== 'open' || Date.parse(round.drawAt) <= Date.now()) throw new Error('This lottery round is closed');

  const currentCountRow = await env.DB.prepare('SELECT COUNT(*) AS count FROM lottery_tickets WHERE user_id=? AND round_id=?')
    .bind(user, round.id).first<{ count: number }>();
  const currentCount = Number(currentCountRow?.count || 0);
  if (settings.maxTicketsPerUser > 0 && currentCount + quantity > settings.maxTicketsPerUser) {
    throw new Error(`Maximum ${settings.maxTicketsPerUser} tickets per user for this round`);
  }

  let freeReserved = false;
  if (settings.freeTicketEnabled) {
    const claim = await env.DB.prepare(`INSERT OR IGNORE INTO lottery_round_free_claims
      (user_id,round_id,claim_request_id,ticket_id,claimed_at)
      VALUES (?,?,?,NULL,CURRENT_TIMESTAMP)`).bind(user, round.id, purchaseId).run();
    freeReserved = Number(claim.meta?.changes || 0) > 0;
  }

  const paidQuantity = Math.max(0, quantity - (freeReserved ? 1 : 0));
  const paidNano = paidQuantity * settings.ticketPriceNano;
  let debited = false;
  let balanceNano = (await getUserControls(env, user)).tonBalanceNano;

  try {
    if (paidNano > 0) {
      const balance = await debitUserTonBalanceIfEnough(env, user, paidNano, {
        kind: 'adjustment',
        title: `Lottery ticket${quantity === 1 ? '' : 's'}`,
        metadata: { section: 'home', feature: 'lottery', currency: 'GRAM', quantity, paidQuantity, roundId: round.id, purchaseId },
      });
      balanceNano = balance.tonBalanceNano;
      debited = true;
    }

    let inserted: LotteryTicket[] = [];
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 8 && !inserted.length; attempt += 1) {
      const codes = ticketCodes(quantity);
      const drafts = Array.from({ length: quantity }, (_, index) => ({
        id: ticketId(),
        internalNumber: internalTicketNumber(),
        ticketCode: codes[index],
        isFree: freeReserved && index === 0,
        priceNano: freeReserved && index === 0 ? 0 : settings.ticketPriceNano,
      }));
      try {
        const statements = drafts.map((ticket) => env.DB.prepare(`INSERT INTO lottery_tickets
          (id,round_id,user_id,ticket_number,ticket_code,price_nano,is_free,purchase_id,created_at)
          VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)`)
          .bind(ticket.id, round.id, user, ticket.internalNumber, ticket.ticketCode, ticket.priceNano, ticket.isFree ? 1 : 0, purchaseId));
        await env.DB.batch(statements);
        inserted = await ticketsForPurchase(env, user, purchaseId);
        if (inserted.length !== quantity) throw new Error('Ticket purchase was not fully saved');
        if (freeReserved) {
          const freeTicket = inserted.find((ticket) => ticket.isFree);
          await env.DB.prepare(`UPDATE lottery_round_free_claims SET ticket_id=?
            WHERE user_id=? AND round_id=? AND claim_request_id=?`)
            .bind(freeTicket?.id || null, user, round.id, purchaseId).run();
        }
      } catch (error) {
        lastError = error;
        await env.DB.prepare('DELETE FROM lottery_tickets WHERE user_id=? AND purchase_id=?').bind(user, purchaseId).run().catch(() => undefined);
      }
    }
    if (!inserted.length) throw (lastError instanceof Error ? lastError : new Error('Could not create lottery tickets'));

    const countRow = await env.DB.prepare('SELECT COUNT(*) AS count FROM lottery_tickets WHERE user_id=? AND round_id=?')
      .bind(user, round.id).first<{ count: number }>();
    return {
      tickets: inserted,
      ticketCount: Number(countRow?.count || 0),
      freeTicketAvailable: settings.freeTicketEnabled && !(await hasClaimedFreeTicket(env, user, round.id)),
      paidNano,
      gramBalanceNano: balanceNano,
      round,
    };
  } catch (error) {
    if (debited && paidNano > 0) {
      await adjustUserTonBalance(env, user, paidNano, {
        kind: 'adjustment', title: 'Lottery ticket refund',
        metadata: { section: 'home', feature: 'lottery', currency: 'GRAM', roundId: round.id, purchaseId },
      }).catch(() => undefined);
    }
    if (freeReserved) {
      await env.DB.prepare(`DELETE FROM lottery_round_free_claims
        WHERE user_id=? AND round_id=? AND claim_request_id=? AND ticket_id IS NULL`)
        .bind(user, round.id, purchaseId).run().catch(() => undefined);
    }
    throw error;
  }
}

export async function getLotteryAdminOverview(env: Env): Promise<{
  settings: LotterySettings;
  round: LotteryRound | null;
  stats: { ticketCount: number; playerCount: number; paidTicketCount: number; freeTicketCount: number; revenueNano: number };
}> {
  const settings = await getLotterySettings(env);
  const round = await getCurrentLotteryRound(env, true);
  let row: AdminStatsRow | null = null;
  if (round) {
    row = await env.DB.prepare(`SELECT
      COUNT(*) AS ticket_count,
      COUNT(DISTINCT user_id) AS player_count,
      SUM(CASE WHEN is_free=0 THEN 1 ELSE 0 END) AS paid_ticket_count,
      SUM(CASE WHEN is_free=1 THEN 1 ELSE 0 END) AS free_ticket_count,
      COALESCE(SUM(price_nano),0) AS revenue_nano
      FROM lottery_tickets WHERE round_id=?`).bind(round.id).first<AdminStatsRow>();
  }
  await syncLotteryScheduler(env);
  return {
    settings,
    round,
    stats: {
      ticketCount: Number(row?.ticket_count || 0),
      playerCount: Number(row?.player_count || 0),
      paidTicketCount: Number(row?.paid_ticket_count || 0),
      freeTicketCount: Number(row?.free_ticket_count || 0),
      revenueNano: Number(row?.revenue_nano || 0),
    },
  };
}

export async function updateLotterySettings(env: Env, patch: Partial<{
  enabled: boolean;
  salesOpen: boolean;
  freeTicketEnabled: boolean;
  ticketPriceNano: number;
  maxTicketsPerUser: number;
  drawIntervalMinutes: number;
  nextDrawAt: string;
}>): Promise<LotterySettings> {
  const current = await getLotterySettings(env);
  const nextInterval = patch.drawIntervalMinutes === undefined ? current.drawIntervalMinutes : cleanInterval(patch.drawIntervalMinutes);
  const next: LotterySettings = {
    ...current,
    enabled: patch.enabled ?? current.enabled,
    salesOpen: patch.salesOpen ?? current.salesOpen,
    freeTicketEnabled: patch.freeTicketEnabled ?? current.freeTicketEnabled,
    ticketPriceNano: patch.ticketPriceNano === undefined ? current.ticketPriceNano : cleanPrice(patch.ticketPriceNano),
    maxTicketsPerUser: patch.maxTicketsPerUser === undefined ? current.maxTicketsPerUser : cleanMaxTickets(patch.maxTicketsPerUser),
    drawIntervalMinutes: nextInterval,
    nextDrawAt: patch.nextDrawAt === undefined ? current.nextDrawAt : normalizeFutureDate(patch.nextDrawAt, nextInterval),
    updatedAt: new Date().toISOString(),
  };
  await env.DB.prepare(`UPDATE lottery_settings SET
    enabled=?,sales_open=?,free_ticket_enabled=?,ticket_price_nano=?,max_tickets_per_user=?,draw_interval_minutes=?,next_draw_at=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=1`)
    .bind(next.enabled ? 1 : 0, next.salesOpen ? 1 : 0, next.freeTicketEnabled ? 1 : 0, next.ticketPriceNano, next.maxTicketsPerUser, next.drawIntervalMinutes, next.nextDrawAt)
    .run();
  if (patch.nextDrawAt !== undefined) {
    await env.DB.prepare("UPDATE lottery_rounds SET draw_at=?,draw_lock=NULL,updated_at=CURRENT_TIMESTAMP WHERE status='open'").bind(next.nextDrawAt).run();
  }
  const updated = await getLotterySettings(env);
  await syncLotteryScheduler(env);
  return updated;
}

export async function setLotteryDrawMinutesFromNow(env: Env, minutesInput: unknown): Promise<LotterySettings> {
  const minutes = cleanInterval(minutesInput);
  const nextDrawAt = new Date(Date.now() + minutes * 60_000).toISOString();
  return updateLotterySettings(env, { nextDrawAt });
}

async function finalizeLotteryRound(env: Env, round: RoundRow): Promise<LotteryDraw | null> {
  if (round.status !== 'open') return null;
  const drawAtMs = Date.parse(round.draw_at);
  if (!Number.isFinite(drawAtMs) || Date.now() < drawAtMs) return null;

  const lock = `draw_${randomHex(24)}`;
  const acquired = await env.DB.prepare(`UPDATE lottery_rounds SET draw_lock=?,updated_at=CURRENT_TIMESTAMP
    WHERE id=? AND status='open' AND (draw_lock IS NULL OR draw_lock='' OR datetime(updated_at)<=datetime('now','-60 seconds'))`)
    .bind(lock, round.id).run();
  if (Number(acquired.meta?.changes || 0) <= 0) {
    const stored = await env.DB.prepare('SELECT * FROM lottery_rounds WHERE id=?').bind(round.id).first<RoundRow>();
    return stored?.status === 'closed' && stored.winning_code ? publicDraw(stored) : null;
  }

  try {
    const winners = await finalizeLotteryWinners(env, round.id);
    const winningCode = winners[0]?.ticketCode || null;
    const drawnAt = new Date().toISOString();
    await env.DB.prepare(`UPDATE lottery_rounds
      SET status='closed',winning_code=?,drawn_at=?,draw_lock=NULL,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND status='open' AND draw_lock=?`)
      .bind(winningCode, drawnAt, round.id, lock).run();
  } catch (error) {
    await env.DB.prepare(`UPDATE lottery_rounds SET draw_lock=NULL,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND status='open' AND draw_lock=?`).bind(round.id, lock).run().catch(() => undefined);
    throw error;
  }

  const stored = await env.DB.prepare('SELECT * FROM lottery_rounds WHERE id=?').bind(round.id).first<RoundRow>();
  return stored?.winning_code ? publicDraw(stored) : null;
}

async function hasClaimedFreeTicket(env: Env, userId: string, roundIdValue: string): Promise<boolean> {
  const row = await env.DB.prepare(`SELECT user_id FROM lottery_round_free_claims
    WHERE user_id=? AND round_id=? LIMIT 1`).bind(userId, roundIdValue).first<{ user_id: string }>();
  return Boolean(row?.user_id);
}

async function ticketsForPurchase(env: Env, userId: string, purchaseId: string): Promise<LotteryTicket[]> {
  const rows = await env.DB.prepare(`SELECT id,round_id,ticket_number,ticket_code,price_nano,is_free,created_at FROM lottery_tickets
    WHERE user_id=? AND purchase_id=? ORDER BY datetime(created_at) ASC`).bind(userId, purchaseId).all<TicketRow>();
  return (rows.results || []).map(publicTicket);
}

function publicSettings(row: SettingsRow): LotterySettings {
  return {
    enabled: Number(row.enabled || 0) === 1,
    salesOpen: Number(row.sales_open || 0) === 1,
    freeTicketEnabled: Number(row.free_ticket_enabled || 0) === 1,
    ticketPriceNano: Math.max(0, Math.floor(Number(row.ticket_price_nano) || LOTTERY_DEFAULT_TICKET_PRICE_NANO)),
    maxTicketsPerUser: Math.max(0, Math.floor(Number(row.max_tickets_per_user) || 0)),
    drawIntervalMinutes: Math.max(1, Math.floor(Number(row.draw_interval_minutes) || LOTTERY_DEFAULT_DRAW_INTERVAL_MINUTES)),
    nextDrawAt: String(row.next_draw_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

function publicRound(row: RoundRow): LotteryRound {
  const drawAtMs = Date.parse(row.draw_at);
  const drawStartsAtMs = Number.isFinite(drawAtMs) ? drawAtMs + LOTTERY_DRAW_DELAY_MS : 0;
  const nextRoundStartsAtMs = Number.isFinite(drawAtMs)
    ? drawAtMs + LOTTERY_DRAW_DELAY_MS + LOTTERY_DRAW_ANIMATION_MS + LOTTERY_NEXT_ROUND_DELAY_MS
    : 0;
  return {
    id: row.id,
    status: row.status,
    opensAt: row.opens_at,
    drawAt: row.draw_at,
    drawStartsAt: drawStartsAtMs ? new Date(drawStartsAtMs).toISOString() : '',
    nextRoundStartsAt: nextRoundStartsAtMs ? new Date(nextRoundStartsAtMs).toISOString() : '',
    ticketPriceNano: Math.max(0, Math.floor(Number(row.ticket_price_nano) || 0)),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function publicDraw(row: RoundRow): LotteryDraw {
  const code = String(row.winning_code || '').replace(/[^0-9]/g, '').slice(-5).padStart(5, '0');
  return {
    roundId: row.id,
    winningCode: code,
    drawAt: row.draw_at,
    drawnAt: String(row.drawn_at || row.updated_at || ''),
  };
}

function publicTicket(row: TicketRow): LotteryTicket {
  const rawCode = String(row.ticket_code || row.ticket_number || '').replace(/[^0-9]/g, '');
  return {
    id: row.id,
    roundId: row.round_id,
    ticketNumber: rawCode.slice(-5).padStart(5, '0'),
    priceNano: Math.max(0, Math.floor(Number(row.price_nano) || 0)),
    isFree: Number(row.is_free || 0) === 1,
    createdAt: row.created_at,
  };
}

function cleanUserId(value: unknown): string {
  const id = String(value ?? '').replace(/[^0-9A-Za-z_-]/g, '').trim().slice(0, 80);
  if (!id) throw new Error('Missing Telegram user');
  return id;
}

function cleanQuantity(value: unknown): number {
  const quantity = Math.floor(Number(value) || 1);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > LOTTERY_MAX_PURCHASE_QUANTITY) throw new Error(`Choose 1-${LOTTERY_MAX_PURCHASE_QUANTITY} tickets`);
  return quantity;
}

function cleanPurchaseId(value: unknown): string {
  const id = String(value || '').trim().replace(/[^0-9A-Za-z_-]/g, '').slice(0, 80);
  if (!id) throw new Error('Missing purchase id');
  return id;
}

function cleanPrice(value: unknown): number {
  const amount = Math.floor(Number(value));
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1_000_000_000_000) throw new Error('Invalid ticket price');
  return amount;
}

function cleanMaxTickets(value: unknown): number {
  const amount = Math.floor(Number(value));
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > 1_000_000) throw new Error('Invalid ticket limit');
  return amount;
}

function cleanInterval(value: unknown): number {
  const amount = Math.floor(Number(value));
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 525_600) throw new Error('Time must be between 1 minute and 1 year');
  return amount;
}

function normalizeFutureDate(value: unknown, fallbackMinutes: number): string {
  const parsed = new Date(String(value || ''));
  if (Number.isFinite(parsed.getTime()) && parsed.getTime() > Date.now() + 5_000) return parsed.toISOString();
  return new Date(Date.now() + Math.max(1, fallbackMinutes) * 60_000).toISOString();
}

function roundNextStartsAtMs(round: RoundRow): number {
  const drawAtMs = Date.parse(round.draw_at);
  if (!Number.isFinite(drawAtMs)) return 0;
  return drawAtMs + LOTTERY_DRAW_DELAY_MS + LOTTERY_DRAW_ANIMATION_MS + LOTTERY_NEXT_ROUND_DELAY_MS;
}

function roundId(): string {
  return `lr_${Date.now().toString(36)}_${randomHex(8)}`;
}

function ticketId(): string {
  return `lt_${randomHex(24)}`;
}

function internalTicketNumber(): string {
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((value) => String(value).padStart(3, '0')).join('');
}

function ticketCodes(quantity: number): string[] {
  const values = new Set<string>();
  while (values.size < quantity) values.add(secureFiveDigitCode());
  return Array.from(values);
}

function secureFiveDigitCode(): string {
  return String(secureRandomIndex(100_000)).padStart(5, '0');
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

export async function syncLotteryScheduler(env: Env): Promise<void> {
  const id = env.LOTTERY_SCHEDULER.idFromName(LOTTERY_SCHEDULER_NAME);
  const response = await env.LOTTERY_SCHEDULER.get(id).fetch('https://lottery-scheduler/sync', { method: 'POST' });
  if (!response.ok) throw new Error(`Lottery scheduler sync failed (${response.status})`);
}

async function ensureLotterySchedulerStarted(env: Env): Promise<void> {
  if (!lotterySchedulerBootstrap) {
    lotterySchedulerBootstrap = syncLotteryScheduler(env).catch((error) => {
      lotterySchedulerBootstrap = null;
      throw error;
    });
  }
  return lotterySchedulerBootstrap;
}

export class LotteryScheduler {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/sync') return new Response('Not found', { status: 404 });
    const nextAlarmAt = await this.synchronize();
    return Response.json({ ok: true, nextAlarmAt });
  }

  async alarm(): Promise<void> {
    try {
      await this.synchronize();
    } catch (error) {
      console.warn('Lottery scheduler alarm failed', error);
      await this.state.storage.setAlarm(Date.now() + LOTTERY_SCHEDULER_RETRY_MS).catch(() => undefined);
    }
  }

  private async synchronize(): Promise<number | null> {
    const settings = await getLotterySettings(this.env);
    if (!settings.enabled) {
      await this.state.storage.deleteAlarm();
      return null;
    }

    const round = await getCurrentLotteryRound(this.env, true);
    const target = round?.status === 'open'
      ? Date.parse(round.drawAt)
      : Date.parse(String(round?.nextRoundStartsAt || settings.nextDrawAt || ''));
    if (!Number.isFinite(target) || target <= 0) {
      await this.state.storage.deleteAlarm();
      return null;
    }

    const nextAlarmAt = Math.max(Date.now(), target);
    const currentAlarmAt = await this.state.storage.getAlarm();
    if (currentAlarmAt !== nextAlarmAt) await this.state.storage.setAlarm(nextAlarmAt);
    return nextAlarmAt;
  }
}
