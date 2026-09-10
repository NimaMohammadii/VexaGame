import app from './index-game-services';
import { LIVE_ACTIVITY_CLIENT_SCRIPT, publishLiveActivity } from './live-activity';
import { handleCrashGhostLiveBetsAdminRequest } from './telegram-crash-ghost-live-bets-admin';
import { handleGameCardAdminRequest } from './telegram-game-card-admin';
import { handleGramWithdrawalAdminRequest, notifyAdminGramWithdrawal } from './telegram-gram-withdrawals-admin';
import { handleLotteryAdminRequest } from './telegram-lottery-admin';
import { handleOnlineCountsAdminRequest } from './telegram-online-counts-admin';
import { handlePlinkoControlAdminRequest } from './telegram-plinko-control-admin';
import { handlePlayZoneCardAdminRequest } from './telegram-play-zone-card-admin';
import { handlePredictionEventsAdminRequest } from './telegram-prediction-events-admin';
import { getPlayZoneCardVisibility, isPlayZoneVisibilityAdmin } from './play-zone-card-visibility';
import { handleLotteryRequest } from './lottery-http';
import { gameBotToken, validateTelegramInitData } from './utils';
import { handleSectionAccessAdminRequest } from './telegram-section-access-admin';
import { getSectionAccess, isMiniAppAdmin } from './section-access';
import { handleSlotLiveBetsAdminRequest } from './telegram-slot-live-bets-admin';
import { setGameMenuButton, setTelegramWebhook } from './telegram-game-bot';
import { addUserXp } from './levels';
import {
  nextCrashAutoCashoutMultiplier,
  settleDueCrashAutoCashouts,
  type CrashBetRow,
} from './crash-finance';
import type { Env } from './types';
import type { TonWithdrawal } from './ton-withdrawals';
export { SectionLockEvents } from './section-lock-events';
export { LiveActivityRoom } from './live-activity';
export { LotteryScheduler } from './lottery';
export { MinesSoloRoundRoom } from './mines-solo-runtime';

export { PlinkoLiveRoom } from './plinko-live';

const CRASH_ROOM_NAME = 'global';
const CRASH_ROUND_KEY = 'crash-live-round-v1';
const CRASH_PREVIOUS_ROUND_KEY = 'crash-live-previous-round-v1';
const CRASH_ROUND_SEQUENCE_KEY = 'crash-live-round-sequence-v1';
const CRASH_HISTORY_KEY = 'crash-live-history-v1';
const CRASH_BETTING_MS = 7_800;
const CRASH_HOLD_MS = 2_200;
const CRASH_HISTORY_LIMIT = 24;
const CRASH_MAX_MULTIPLIER = 50;
const CRASH_MAX_RUN_MS = 68_000;
const CRASH_LOW_TAIL_EXP = 1.537243573680482;
const CRASH_HIGH_TAIL_EXP = 3.26941239209809;
const DEFAULT_CRASH_HISTORY = [1.34, 2.18, 1.07, 3.42, 1.61, 1.19, 5.26, 1.83, 2.74, 1.12, 4.08, 1.47];

type CrashLivePhase = 'betting' | 'running' | 'ended';

type CrashLiveRound = {
  roundId: number;
  phase: CrashLivePhase;
  bettingStartedAt: number;
  runningStartedAt: number;
  crashAt: number;
  nextRoundAt: number;
  crashPoint: number;
  finalized?: boolean;
};

type CrashHistoryState = {
  lastRoundId: number;
  values: number[];
};

type CrashPublicState = {
  roundId: number;
  phase: CrashLivePhase;
  serverNow: number;
  bettingStartedAt: number;
  runningStartedAt: number;
  bettingMs: number;
  crashHoldMs: number;
  multiplier: number;
  crashMultiplier: number | null;
  history: number[];
};

type CrashLiveEvent = {
  roundId: number;
  userId: string;
  user: string;
  amountNano: number;
  status: 'bet' | 'cashout' | 'crashed';
  cashoutMultiplier?: number | null;
  autoCashoutMultiplier?: number | null;
  payoutNano?: number;
  isVirtual?: boolean;
  updatedAt?: string;
};

export class CrashLiveRoom {
  constructor(private state: DurableObjectState, private env: Env) {
    this.state.blockConcurrencyWhile(async () => {
      const existing = await this.state.storage.get<CrashLiveRound>(CRASH_ROUND_KEY).catch(() => null);
      if (!existing) await this.createRound(Date.now());
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && request.headers.get('Upgrade') === 'websocket' && url.pathname === '/connect') {
      return this.connect();
    }
    if (request.method === 'GET' && url.pathname === '/state') {
      const now = Date.now();
      const round = await this.advance(now);
      return Response.json({ ok: true, state: await this.publicState(round, Date.now()) });
    }
    if (request.method === 'POST' && url.pathname === '/authorize-bet') {
      const body = await request.json().catch(() => null) as { roundId?: unknown; receivedAt?: unknown } | null;
      const roundId = Math.floor(Number(body?.roundId));
      const receivedAt = Math.floor(Number(body?.receivedAt));
      if (!Number.isFinite(roundId) || !Number.isFinite(receivedAt)) return Response.json({ ok: false }, { status: 400 });
      await this.advance(Date.now());
      const round = await this.roundById(roundId);
      const allowed = Boolean(round && receivedAt >= round.bettingStartedAt && receivedAt < round.runningStartedAt);
      return Response.json({ ok: allowed, roundId });
    }
    if (request.method === 'POST' && url.pathname === '/authorize-cashout') {
      const body = await request.json().catch(() => null) as { roundId?: unknown; receivedAt?: unknown; autoCashoutMultiplier?: unknown } | null;
      const roundId = Math.floor(Number(body?.roundId));
      const receivedAt = Math.floor(Number(body?.receivedAt));
      const autoCashoutMultiplier = cleanCrashAutoTarget(body?.autoCashoutMultiplier);
      if (!Number.isFinite(roundId) || !Number.isFinite(receivedAt)) return Response.json({ ok: false }, { status: 400 });
      await this.advance(Date.now());
      const round = await this.roundById(roundId);
      if (!round) return Response.json({ ok: false, roundId });

      if (autoCashoutMultiplier && autoCashoutMultiplier < round.crashPoint) {
        const autoAt = round.runningStartedAt + crashTimeMs(autoCashoutMultiplier);
        if (receivedAt >= autoAt) {
          return Response.json({ ok: true, roundId, multiplier: autoCashoutMultiplier, mode: 'auto' });
        }
      }

      const allowed = receivedAt >= round.runningStartedAt && receivedAt < round.crashAt;
      if (!allowed) return Response.json({ ok: false, roundId });
      const multiplier = floorCrashMultiplier(Math.min(round.crashPoint, crashMultiplierAt((receivedAt - round.runningStartedAt) / 1000)));
      return Response.json({ ok: true, roundId, multiplier, mode: 'manual' });
    }
    if (request.method === 'POST' && url.pathname === '/publish-live') {
      const event = await request.json().catch(() => null) as CrashLiveEvent | null;
      if (!validCrashLiveEvent(event)) return Response.json({ ok: false }, { status: 400 });
      this.broadcast({ type: 'crash-live-event', event });
      return Response.json({ ok: true });
    }
    return new Response('Not found', { status: 404 });
  }

  async alarm(): Promise<void> {
    try {
      await this.advance(Date.now());
    } catch (error) {
      console.warn('Crash alarm failed', error);
      await this.state.storage.setAlarm(Date.now() + 2_000).catch(() => undefined);
    }
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') return;
    let parsed: { type?: unknown; clientSentAt?: unknown } | null = null;
    try { parsed = JSON.parse(message) as { type?: unknown; clientSentAt?: unknown }; } catch { return; }
    if (parsed?.type !== 'sync') return;
    await this.sendState(socket, Number(parsed.clientSentAt) || null);
  }

  webSocketClose(socket: WebSocket, code: number, reason: string): void {
    try { socket.close(code, reason); } catch { /* runtime may already have closed it */ }
  }

  webSocketError(_socket: WebSocket, error: unknown): void {
    console.warn('Crash WebSocket error', error);
  }

  private async connect(): Promise<Response> {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.state.acceptWebSocket(server);
    await this.sendState(server, null);
    return new Response(null, { status: 101, webSocket: client });
  }

  private async sendState(socket: WebSocket, clientSentAt: number | null): Promise<void> {
    const now = Date.now();
    const round = await this.advance(now);
    safeCrashSend(socket, {
      type: 'crash-state',
      clientSentAt,
      state: await this.publicState(round, Date.now()),
    });
  }

  private async advance(now: number): Promise<CrashLiveRound> {
    let round = await this.state.storage.get<CrashLiveRound>(CRASH_ROUND_KEY).catch(() => null);
    if (!round) round = await this.createRound(now);

    for (let step = 0; step < 6; step += 1) {
      if (round.phase === 'betting' && now >= round.runningStartedAt) {
        round = { ...round, phase: 'running', finalized: false };
        await this.state.storage.put(CRASH_ROUND_KEY, round);
        await this.publishState(round, now);
        continue;
      }

      if (round.phase === 'running') {
        if (now < round.crashAt) {
          await this.settleAutoCashouts(round, now).catch((error) => console.warn('Crash auto cashout settlement failed', error));
          break;
        }
        round = { ...round, phase: 'ended', finalized: false };
        await this.state.storage.put(CRASH_ROUND_KEY, round);
        await this.publishState(round, now);
        continue;
      }

      if (round.phase === 'ended' && round.finalized !== true) {
        const finalized = await this.finalizeRound(round).catch((error) => {
          console.warn('Crash round finalization failed', error);
          return false;
        });
        if (!finalized) break;
        await this.pushHistory(round.roundId, round.crashPoint);
        round = { ...round, finalized: true };
        await this.state.storage.put(CRASH_ROUND_KEY, round);
        await this.publishState(round, now);
        this.state.waitUntil(this.awardRoundXp(round.roundId).catch((error) => console.warn('Crash XP settlement failed', error)));
        continue;
      }

      if (round.phase === 'ended' && round.finalized === true && now >= round.nextRoundAt) {
        const previousRound = round;
        await this.state.storage.put(CRASH_PREVIOUS_ROUND_KEY, previousRound);
        round = await this.createRound(Math.max(now, round.nextRoundAt));
        await this.publishState(round, now);
        continue;
      }

      break;
    }

    await this.scheduleAlarm(round, now);
    return round;
  }

  private async createRound(startAt: number): Promise<CrashLiveRound> {
    const previous = Number(await this.state.storage.get<number>(CRASH_ROUND_SEQUENCE_KEY).catch(() => 0)) || 0;
    const roundId = previous > 0 ? previous + 1 : Math.max(1, Math.floor(startAt / 1000));
    const crashPoint = secureCrashPoint();
    const runningStartedAt = startAt + CRASH_BETTING_MS;
    const crashAt = runningStartedAt + crashTimeMs(crashPoint);
    const round: CrashLiveRound = {
      roundId,
      phase: 'betting',
      bettingStartedAt: startAt,
      runningStartedAt,
      crashAt,
      nextRoundAt: crashAt + CRASH_HOLD_MS,
      crashPoint,
      finalized: false,
    };
    await this.state.storage.put(CRASH_ROUND_SEQUENCE_KEY, roundId);
    await this.state.storage.put(CRASH_ROUND_KEY, round);
    return round;
  }

  private async roundById(roundId: number): Promise<CrashLiveRound | null> {
    const current = await this.state.storage.get<CrashLiveRound>(CRASH_ROUND_KEY).catch(() => null);
    if (current?.roundId === roundId) return current;
    const previous = await this.state.storage.get<CrashLiveRound>(CRASH_PREVIOUS_ROUND_KEY).catch(() => null);
    return previous?.roundId === roundId ? previous : null;
  }

  private async publicState(round: CrashLiveRound, now: number): Promise<CrashPublicState> {
    const multiplier = round.phase === 'running'
      ? floorCrashMultiplier(Math.min(round.crashPoint, crashMultiplierAt((now - round.runningStartedAt) / 1000)))
      : round.phase === 'ended'
        ? floorCrashMultiplier(round.crashPoint)
        : 1;
    return {
      roundId: round.roundId,
      phase: round.phase,
      serverNow: now,
      bettingStartedAt: round.bettingStartedAt,
      runningStartedAt: round.runningStartedAt,
      bettingMs: CRASH_BETTING_MS,
      crashHoldMs: CRASH_HOLD_MS,
      multiplier,
      crashMultiplier: round.phase === 'ended' ? floorCrashMultiplier(round.crashPoint) : null,
      history: await this.history(),
    };
  }

  private async publishState(round: CrashLiveRound, now: number): Promise<void> {
    this.broadcast({ type: 'crash-state', clientSentAt: null, state: await this.publicState(round, now) });
  }

  private broadcast(payload: unknown): void {
    for (const socket of this.state.getWebSockets()) safeCrashSend(socket, payload);
  }

  private async settleAutoCashouts(round: CrashLiveRound, now: number): Promise<void> {
    const current = Math.min(round.crashPoint, crashMultiplierAt(Math.max(0, now - round.runningStartedAt) / 1000));
    const rows = await settleDueCrashAutoCashouts(this.env, round.roundId, current, round.crashPoint);
    for (const row of rows) this.broadcastCrashRow(row);
  }

  private async finalizeRound(round: CrashLiveRound): Promise<boolean> {
    const autoRows = await settleDueCrashAutoCashouts(this.env, round.roundId, round.crashPoint, round.crashPoint);
    for (const row of autoRows) this.broadcastCrashRow(row);
    await this.markRoundCrashed(round.roundId);
    return true;
  }

  private broadcastCrashRow(row: CrashBetRow): void {
    this.broadcast({
      type: 'crash-live-event',
      event: {
        roundId: Number(row.round_id),
        userId: row.user_id,
        user: row.username,
        amountNano: Number(row.amount_nano || 0),
        status: 'cashout',
        cashoutMultiplier: row.cashout_multiplier == null ? null : Number(row.cashout_multiplier),
        autoCashoutMultiplier: row.auto_cashout_multiplier == null ? null : Number(row.auto_cashout_multiplier),
        payoutNano: Number(row.payout_nano || 0),
        isVirtual: false,
        updatedAt: row.updated_at,
      } satisfies CrashLiveEvent,
    });
  }

  private async scheduleAlarm(round: CrashLiveRound, now: number): Promise<void> {
    let next: number;
    if (round.phase === 'betting') {
      next = round.runningStartedAt;
    } else if (round.phase === 'running') {
      next = round.crashAt;
      try {
        const target = await nextCrashAutoCashoutMultiplier(this.env, round.roundId, round.crashPoint);
        if (target) next = Math.min(next, round.runningStartedAt + crashTimeMs(target));
      } catch (error) {
        console.warn('Crash auto cashout schedule lookup failed', error);
        next = Math.min(next, now + 2_000);
      }
    } else if (round.finalized !== true) {
      next = now + 2_000;
    } else {
      next = round.nextRoundAt;
    }
    await this.state.storage.setAlarm(Math.max(now + 25, next + 10));
  }

  private async history(): Promise<number[]> {
    const saved = await this.state.storage.get<CrashHistoryState | number[]>(CRASH_HISTORY_KEY).catch(() => null);
    if (Array.isArray(saved)) return saved.filter((value) => Number.isFinite(value)).slice(0, CRASH_HISTORY_LIMIT);
    if (saved && Array.isArray(saved.values)) return saved.values.filter((value) => Number.isFinite(value)).slice(0, CRASH_HISTORY_LIMIT);
    return DEFAULT_CRASH_HISTORY.slice();
  }

  private async pushHistory(roundId: number, multiplier: number): Promise<void> {
    const saved = await this.state.storage.get<CrashHistoryState | number[]>(CRASH_HISTORY_KEY).catch(() => null);
    if (!Array.isArray(saved) && saved?.lastRoundId === roundId) return;
    const values = Array.isArray(saved)
      ? saved.filter((value) => Number.isFinite(value))
      : saved?.values?.filter((value) => Number.isFinite(value)) || DEFAULT_CRASH_HISTORY.slice();
    await this.state.storage.put(CRASH_HISTORY_KEY, {
      lastRoundId: roundId,
      values: [floorCrashMultiplier(multiplier), ...values].slice(0, CRASH_HISTORY_LIMIT),
    } satisfies CrashHistoryState);
  }

  private async markRoundCrashed(roundId: number): Promise<void> {
    await this.env.DB.prepare(`UPDATE crash_live_bets
      SET status='crashed', updated_at=CURRENT_TIMESTAMP
      WHERE round_id=? AND is_virtual=0 AND status='bet'
        AND EXISTS(
          SELECT 1 FROM ton_transactions t
          WHERE t.user_id=crash_live_bets.user_id
            AND t.reference_type='crash'
            AND t.reference_id=('crash:' || crash_live_bets.round_id || ':' || crash_live_bets.user_id)
            AND t.amount_nano<0
        )`).bind(roundId).run();
  }

  private async awardRoundXp(roundId: number): Promise<void> {
    const rows = await this.env.DB.prepare(`SELECT user_id,status,cashout_multiplier,payout_nano
      FROM crash_live_bets
      WHERE round_id=? AND is_virtual=0 AND status IN ('cashout','crashed')`)
      .bind(roundId).all<{ user_id: string; status: string; cashout_multiplier: number | null; payout_nano: number }>();
    const bets = rows.results || [];
    for (let offset = 0; offset < bets.length; offset += 25) {
      const chunk = bets.slice(offset, offset + 25);
      await Promise.allSettled(chunk.map((row) => {
        if (row.status === 'cashout') {
          const multiplier = Math.max(1, Number(row.cashout_multiplier) || 1);
          const xp = multiplier >= 5 ? 70 : multiplier >= 2 ? 30 : 15;
          return addUserXp(
            this.env,
            row.user_id,
            xp,
            'game-win',
            { section: 'crash', event: 'cashout', roundId, multiplier, payoutNano: Number(row.payout_nano || 0) },
            `crash_cashout_${roundId}_${row.user_id}`,
          );
        }
        return addUserXp(
          this.env,
          row.user_id,
          5,
          'game-lose',
          { section: 'crash', event: 'crash', roundId },
          `crash_loss_${roundId}_${row.user_id}`,
        );
      }));
    }
  }
}

function secureCrashPoint(): number {
  const r = Math.max(0.000001, secureCrashUnit());
  let raw: number;
  if (r < 0.0005) raw = CRASH_MAX_MULTIPLIER;
  else if (r < 0.01) raw = 20 * Math.pow(0.01 / r, 1 / CRASH_HIGH_TAIL_EXP);
  else raw = Math.pow(1 / r, 1 / CRASH_LOW_TAIL_EXP);
  return floorCrashMultiplier(Math.max(1, Math.min(CRASH_MAX_MULTIPLIER, raw)));
}

function secureCrashUnit(): number {
  const data = new Uint32Array(1);
  crypto.getRandomValues(data);
  return data[0] / 4_294_967_296;
}

function crashMultiplierAt(seconds: number): number {
  return Math.exp(Math.max(0, Number(seconds) || 0) * 0.06);
}

function crashTimeMs(crashPoint: number): number {
  let low = 0;
  let high = CRASH_MAX_RUN_MS;
  for (let i = 0; i < 28; i += 1) {
    const mid = (low + high) / 2;
    if (crashMultiplierAt(mid / 1000) >= crashPoint) high = mid;
    else low = mid;
  }
  return Math.max(25, Math.floor(high));
}

function floorCrashMultiplier(value: number): number {
  return Math.max(1, Math.min(CRASH_MAX_MULTIPLIER, Math.floor((Number(value) || 1) * 100) / 100));
}

function cleanCrashAutoTarget(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1.01 && n <= CRASH_MAX_MULTIPLIER ? Math.floor(n * 100) / 100 : null;
}

function validCrashLiveEvent(event: CrashLiveEvent | null): event is CrashLiveEvent {
  if (!event || !Number.isFinite(Number(event.roundId)) || !String(event.userId || '').trim()) return false;
  return event.status === 'bet' || event.status === 'cashout' || event.status === 'crashed';
}

function safeCrashSend(socket: WebSocket, payload: unknown): boolean {
  try {
    socket.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

const GHOST_ROOM_NAME = 'global';
const GHOST_ROUND_KEY = 'ghost-live-round-v3';
const GHOST_ROUND_SEQUENCE_KEY = 'ghost-live-round-sequence-v3';
const GHOST_HISTORY_KEY = 'ghost-live-history-v3';
const GHOST_BETTING_MS = 6500;
const GHOST_RESTART_MS = 4400;
const GHOST_HISTORY_LIMIT = 24;
const DEFAULT_GHOST_HISTORY = [1.18, 1.47, 2.03, 1.09, 3.26, 1.72, 1.31, 2.54, 1.15, 4.08];

type GhostLivePhase = 'betting' | 'running' | 'ended';

type GhostLiveRound = {
  roundId: number;
  phase: GhostLivePhase;
  bettingStartedAt: number;
  runningStartedAt: number;
  crashAt: number;
  nextRoundAt: number;
  crashPoint: number;
};

type GhostPublicState = {
  roundId: number;
  phase: GhostLivePhase;
  serverNow: number;
  bettingStartedAt: number;
  runningStartedAt: number;
  bettingMs: number;
  restartMs: number;
  multiplier: number;
  crashMultiplier: number | null;
  history: number[];
};

export class GhostRunLiveRoom {
  private sockets = new Set<WebSocket>();

  constructor(private state: DurableObjectState) {
    this.state.blockConcurrencyWhile(async () => {
      const existing = await this.state.storage.get<GhostLiveRound>(GHOST_ROUND_KEY).catch(() => null);
      if (!existing) await this.createRound(Date.now());
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && request.headers.get('Upgrade') === 'websocket' && url.pathname === '/connect') {
      return this.connect();
    }
    return new Response('Not found', { status: 404 });
  }

  async alarm(): Promise<void> {
    await this.advance(Date.now());
  }

  private async connect(): Promise<Response> {
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    server.accept();
    this.sockets.add(server);
    server.addEventListener('close', () => this.sockets.delete(server));
    server.addEventListener('error', () => this.sockets.delete(server));
    server.addEventListener('message', (event) => {
      if (typeof event.data !== 'string') return;
      let message: { type?: unknown; clientSentAt?: unknown } | null = null;
      try { message = JSON.parse(event.data) as { type?: unknown; clientSentAt?: unknown }; } catch { return; }
      if (message?.type !== 'sync') return;
      this.sendState(server, Number(message.clientSentAt) || null).catch(() => undefined);
    });

    await this.sendState(server, null);
    return new Response(null, { status: 101, webSocket: client });
  }

  private async sendState(socket: WebSocket, clientSentAt: number | null): Promise<void> {
    const now = Date.now();
    const round = await this.advance(now);
    safeGhostSend(socket, {
      type: 'ghost-state',
      clientSentAt,
      state: await this.publicState(round, Date.now()),
    });
  }

  private async advance(now: number): Promise<GhostLiveRound> {
    let round = await this.state.storage.get<GhostLiveRound>(GHOST_ROUND_KEY).catch(() => null);
    if (!round) round = await this.createRound(now);

    for (let step = 0; step < 4; step += 1) {
      if (round.phase === 'betting' && now >= round.runningStartedAt) {
        round = { ...round, phase: 'running' };
        await this.state.storage.put(GHOST_ROUND_KEY, round);
        await this.publish(round, now);
        continue;
      }

      if (round.phase === 'running' && now >= round.crashAt) {
        round = { ...round, phase: 'ended' };
        await this.state.storage.put(GHOST_ROUND_KEY, round);
        await this.pushHistory(round.crashPoint);
        await this.publish(round, now);
        continue;
      }

      if (round.phase === 'ended' && now >= round.nextRoundAt) {
        const startAt = now - round.nextRoundAt > 60_000 ? now : round.nextRoundAt;
        round = await this.createRound(startAt);
        await this.publish(round, now);
        continue;
      }

      break;
    }

    await this.scheduleAlarm(round, now);
    return round;
  }

  private async createRound(startAt: number): Promise<GhostLiveRound> {
    const previous = Number(await this.state.storage.get<number>(GHOST_ROUND_SEQUENCE_KEY).catch(() => 0)) || 0;
    const roundId = previous + 1;
    const crashPoint = secureGhostCrashPoint();
    const runningStartedAt = startAt + GHOST_BETTING_MS;
    const crashAt = runningStartedAt + ghostCrashTimeMs(crashPoint);
    const round: GhostLiveRound = {
      roundId,
      phase: 'betting',
      bettingStartedAt: startAt,
      runningStartedAt,
      crashAt,
      nextRoundAt: crashAt + GHOST_RESTART_MS,
      crashPoint,
    };
    await this.state.storage.put(GHOST_ROUND_SEQUENCE_KEY, roundId);
    await this.state.storage.put(GHOST_ROUND_KEY, round);
    return round;
  }

  private async publicState(round: GhostLiveRound, now: number): Promise<GhostPublicState> {
    return {
      roundId: round.roundId,
      phase: round.phase,
      serverNow: now,
      bettingStartedAt: round.bettingStartedAt,
      runningStartedAt: round.runningStartedAt,
      bettingMs: GHOST_BETTING_MS,
      restartMs: GHOST_RESTART_MS,
      multiplier: round.phase === 'running'
        ? ghostDisplayMultiplier(round, now)
        : round.phase === 'ended'
          ? floorGhostMultiplier(round.crashPoint)
          : 1,
      crashMultiplier: round.phase === 'ended' ? floorGhostMultiplier(round.crashPoint) : null,
      history: await this.history(),
    };
  }

  private async publish(round: GhostLiveRound, now: number): Promise<void> {
    const payload = { type: 'ghost-state', clientSentAt: null, state: await this.publicState(round, now) };
    for (const socket of [...this.sockets]) {
      if (!safeGhostSend(socket, payload)) this.sockets.delete(socket);
    }
  }

  private async scheduleAlarm(round: GhostLiveRound, now: number): Promise<void> {
    const next = round.phase === 'betting' ? round.runningStartedAt : round.phase === 'running' ? round.crashAt : round.nextRoundAt;
    await this.state.storage.setAlarm(Math.max(now + 25, next + 10)).catch(() => undefined);
  }

  private async history(): Promise<number[]> {
    const saved = await this.state.storage.get<number[]>(GHOST_HISTORY_KEY).catch(() => null);
    return Array.isArray(saved) && saved.length
      ? saved.filter((value) => Number.isFinite(value)).slice(0, GHOST_HISTORY_LIMIT)
      : DEFAULT_GHOST_HISTORY.slice();
  }

  private async pushHistory(multiplier: number): Promise<void> {
    const history = await this.history();
    const next = [floorGhostMultiplier(multiplier), ...history].slice(0, GHOST_HISTORY_LIMIT);
    await this.state.storage.put(GHOST_HISTORY_KEY, next);
  }
}

function secureGhostCrashPoint(): number {
  const r = secureGhostUnit();
  const n = secureGhostUnit();
  const value = r < 0.84
    ? 1.08 + Math.pow(n, 0.82) * 0.92
    : r < 0.97
      ? 2.02 + Math.pow(n, 1.55) * 2.2
      : 4.25 + Math.pow(n, 2.3) * 5.75;
  return floorGhostMultiplier(value);
}

function secureGhostUnit(): number {
  const data = new Uint32Array(1);
  crypto.getRandomValues(data);
  return data[0] / 4_294_967_296;
}

function ghostMultiplierAt(seconds: number): number {
  const t = Math.max(0, Number(seconds) || 0);
  return 1 + t * 0.038 + Math.pow(t, 1.12) * 0.020;
}

function ghostDisplayMultiplier(round: GhostLiveRound, now: number): number {
  if (round.phase === 'betting') return 1;
  if (round.phase === 'ended' || now >= round.crashAt) return floorGhostMultiplier(round.crashPoint);
  return floorGhostMultiplier(ghostMultiplierAt((now - round.runningStartedAt) / 1000));
}

function ghostCrashTimeMs(crashPoint: number): number {
  let low = 0;
  let high = 180_000;
  for (let i = 0; i < 28; i += 1) {
    const mid = (low + high) / 2;
    if (ghostMultiplierAt(mid / 1000) >= crashPoint) high = mid;
    else low = mid;
  }
  return Math.max(800, Math.floor(high));
}

function floorGhostMultiplier(value: number): number {
  return Math.max(1, Math.floor((Number(value) || 1) * 100) / 100);
}

function safeGhostSend(socket: WebSocket, payload: unknown): boolean {
  try {
    socket.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Older game/admin modules still receive compatibility aliases, but both are
    // derived only from the single external BOT_TOKEN binding.
    const runtimeEnv = Object.assign(Object.create(env), env, {
      TELEGRAM_BOT_TOKEN: env.BOT_TOKEN,
      GAME_BOT_TOKEN: env.BOT_TOKEN,
    }) as Env;

    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/app/api/crash/live/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return Response.json({ error: 'Expected websocket.' }, { status: 426, headers: { 'cache-control': 'no-store' } });
      }
      try {
        await validateTelegramInitData(url.searchParams.get('initData') || '', gameBotToken(runtimeEnv));
        const id = runtimeEnv.CRASH_LIVE.idFromName(CRASH_ROOM_NAME);
        return runtimeEnv.CRASH_LIVE.get(id).fetch(new Request('https://crash-live/connect', {
          method: 'GET',
          headers: request.headers,
        }));
      } catch {
        return new Response('Unauthorized', { status: 401 });
      }
    }
    if (request.method === 'GET' && url.pathname === '/app/api/ghost-run/live/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return Response.json({ error: 'Expected websocket.' }, { status: 426, headers: { 'cache-control': 'no-store' } });
      }
      try {
        await validateTelegramInitData(url.searchParams.get('initData') || '', gameBotToken(runtimeEnv));
        const id = runtimeEnv.GHOST_RUN_LIVE.idFromName(GHOST_ROOM_NAME);
        return runtimeEnv.GHOST_RUN_LIVE.get(id).fetch(new Request('https://ghost-run-live/connect', {
          method: 'GET',
          headers: request.headers,
        }));
      } catch {
        return new Response('Unauthorized', { status: 401 });
      }
    }
    if (request.method === 'GET' && url.pathname === '/app/api/section-access/live' && request.headers.get('Upgrade') === 'websocket') {
      try {
        const userId = await validateTelegramInitData(url.searchParams.get('initData') || '', gameBotToken(runtimeEnv));
        const locks = await getSectionAccess(runtimeEnv);
        const headers = new Headers(request.headers);
        headers.set('x-section-lock-admin', isMiniAppAdmin(runtimeEnv, userId) ? '1' : '0');
        headers.set('x-section-lock-initial', JSON.stringify(locks));
        const id = runtimeEnv.SECTION_LOCK_EVENTS.idFromName('global');
        return runtimeEnv.SECTION_LOCK_EVENTS.get(id).fetch(new Request('https://section-lock-events/connect', { headers }));
      } catch {
        return new Response('Unauthorized', { status: 401 });
      }
    }
    if (request.method === 'GET' && url.pathname === '/app/api/live-activity/ws') {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return Response.json({ error: 'Expected websocket.' }, { status: 426, headers: { 'cache-control': 'no-store' } });
      }
      try {
        await validateTelegramInitData(url.searchParams.get('initData') || '', gameBotToken(runtimeEnv));
        const id = runtimeEnv.LIVE_ACTIVITY.idFromName('global');
        return runtimeEnv.LIVE_ACTIVITY.get(id).fetch(new Request('https://live-activity/connect', {
          method: 'GET',
          headers: request.headers,
        }));
      } catch {
        return new Response('Unauthorized', { status: 401 });
      }
    }
    if (request.method === 'POST' && url.pathname === '/app/api/play-zone-card-visibility') {
      try {
        const body = await request.json().catch(() => ({})) as { initData?: unknown };
        const userId = await validateTelegramInitData(body.initData, gameBotToken(runtimeEnv));
        const state = await getPlayZoneCardVisibility(runtimeEnv);
        return Response.json({ ok: true, admin: isPlayZoneVisibilityAdmin(runtimeEnv, userId), hiddenIds: state.hiddenIds }, { headers: { 'cache-control': 'no-store' } });
      } catch {
        return Response.json({ ok: false, hiddenIds: [] }, { status: 401, headers: { 'cache-control': 'no-store' } });
      }
    }
    if (request.method === 'GET' && url.pathname === '/setup-webhook') {
      const [webhook, menu] = await Promise.all([
        setTelegramWebhook(env),
        setGameMenuButton(env),
      ]);
      return Response.json(
        {
          ok: Boolean(webhook.ok && menu.ok),
          tokenBinding: 'BOT_TOKEN',
          tokenConfigured: Boolean(String(env.BOT_TOKEN ?? '').trim()),
          webhook,
          menu,
          webhookUrl: `${url.origin}/telegram/webhook`,
          miniApp: `${url.origin}/app`,
        },
        { headers: { 'cache-control': 'no-store' } },
      );
    }

    const lotteryResponse = await handleLotteryRequest(request, runtimeEnv);
    if (lotteryResponse) return lotteryResponse;

    const predictionEventsAdminResponse = await handlePredictionEventsAdminRequest(request, runtimeEnv);
    if (predictionEventsAdminResponse) return predictionEventsAdminResponse;

    const crashGhostLiveBetsAdminResponse = await handleCrashGhostLiveBetsAdminRequest(request, runtimeEnv);
    if (crashGhostLiveBetsAdminResponse) return crashGhostLiveBetsAdminResponse;

    const slotLiveBetsAdminResponse = await handleSlotLiveBetsAdminRequest(request, runtimeEnv);
    if (slotLiveBetsAdminResponse) return slotLiveBetsAdminResponse;

    const onlineCountsAdminResponse = await handleOnlineCountsAdminRequest(request, runtimeEnv);
    if (onlineCountsAdminResponse) return onlineCountsAdminResponse;

    const plinkoControlAdminResponse = await handlePlinkoControlAdminRequest(request, runtimeEnv);
    if (plinkoControlAdminResponse) return plinkoControlAdminResponse;

    const gramWithdrawalAdminResponse = await handleGramWithdrawalAdminRequest(request, runtimeEnv);
    if (gramWithdrawalAdminResponse) return gramWithdrawalAdminResponse;

    const lotteryAdminResponse = await handleLotteryAdminRequest(request, runtimeEnv);
    if (lotteryAdminResponse) return lotteryAdminResponse;

    const sectionAccessAdminResponse = await handleSectionAccessAdminRequest(request, runtimeEnv);
    if (sectionAccessAdminResponse) return sectionAccessAdminResponse;

    const playZoneCardAdminResponse = await handlePlayZoneCardAdminRequest(request, runtimeEnv);
    if (playZoneCardAdminResponse) return playZoneCardAdminResponse;

    const gameCardAdminResponse = await handleGameCardAdminRequest(request, runtimeEnv);
    if (gameCardAdminResponse) return gameCardAdminResponse;

    const isNewGramWithdrawal = request.method === 'POST' && url.pathname === '/app/api/ton/withdrawals';
    const response = await app.fetch(request, runtimeEnv as never, ctx);
    if (isNewGramWithdrawal && response.ok) {
      const withdrawal = await response.clone().json().catch(() => null) as TonWithdrawal | null;
      if (withdrawal?.id) {
        await Promise.all([
          notifyAdminGramWithdrawal(runtimeEnv, withdrawal).catch((error) => console.warn('Gram withdrawal notification failed', error)),
          publishLiveActivity(runtimeEnv, {
            kind: 'withdraw',
            userId: withdrawal.userId,
            amountNano: withdrawal.amountNano,
            key: withdrawal.id,
            createdAt: withdrawal.createdAt,
          }).catch((error) => console.warn('Gram withdrawal live activity failed', error)),
        ]);
      }
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;
    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'no-store');
    return new Response(html.replace('</body>', `${LIVE_ACTIVITY_CLIENT_SCRIPT}</body>`), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};