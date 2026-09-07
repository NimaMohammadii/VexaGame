import type { Env } from './types';
import type { SectionLock } from './section-access';
import { getOnlineUserCountConfig, type OnlineCountAdjustment, type OnlineCountConfig } from './online-user-counts';
import { gameBotToken, validateTelegramInitData } from './utils';

type LockMessage = { type: 'section-access'; serverNow: number; locks: Record<string, SectionLock> };
type UserControlBlock = { sectionId: string; blocked: boolean; expiresAt: string | null; remainingMs: number | null };
export type RealtimeUserControls = { userId: string; sectionBlocks: UserControlBlock[] };
type UserControlsMessage = { type: 'user-controls'; controls: RealtimeUserControls };
type PredictOpsMarketState = { manualPaused: boolean; circuitOpen: boolean; circuitReason: string | null; capacityReached?: boolean };
export type PredictOpsRealtimeState = {
  emergencyPaused: boolean;
  maintenanceMessage: string;
  markets: Record<'bitcoin' | 'gold' | 'oil', PredictOpsMarketState>;
  updatedAt: string | null;
};
type PredictOpsMessage = { type: 'predict-ops'; state: PredictOpsRealtimeState; refreshRound: boolean };
type PredictOnlineMessage = { type: 'predict-online'; count: number };
type GameOnlineMessage = { type: 'game-online'; counts: Record<string, number>; config: OnlineCountConfig };
type PredictMarket = 'bitcoin' | 'gold' | 'oil';
type PredictPoolRealtime = { stakeNano: number; stakeTon: number; count: number };
type PredictRoundRealtime = {
  market: PredictMarket;
  roundId: string;
  status: string;
  result: string | null;
  endPrice: number | null;
  pools: { up: PredictPoolRealtime; down: PredictPoolRealtime };
  updatedAt: string;
};
type PredictRoundMessage = { type: 'predict-round'; round: PredictRoundRealtime };
type PredictSyncErrorMessage = { type: 'predict-sync-error'; market: PredictMarket; roundId: string };
type PredictBetRealtime = {
  id: string;
  roundId: string;
  market: PredictMarket;
  side: string;
  stakeNano: number;
  stakeTon: number;
  status: string;
  payoutNano: number;
  payoutTon: number;
  createdAt: string;
};
type PredictUserRoundRealtime = {
  userId: string;
  market: PredictMarket;
  roundId: string;
  tonBalanceNano: number;
  bet: PredictBetRealtime | null;
};
type PredictUserRoundMessage = { type: 'predict-user-round'; update: PredictUserRoundRealtime };
type RealtimeSession = { admin: boolean; userId: string; predictActive: boolean; gameActive: string };
type PredictRoundDbRow = { id: string; market: string; status: string; result: string | null; end_price: number | null };
type PredictPoolDbRow = { side: string; stakeNano: number; count: number };
type PredictUserBetDbRow = {
  id: string;
  round_id: string;
  market: string;
  user_id: string;
  side: string;
  stake_nano: number;
  status: string;
  payout_nano: number;
  created_at: string;
  ton_balance_nano: number | null;
};
type PredictRealtimeIssue = { type: string; market: PredictMarket; where: string; message: string; firstAt: string; lastAt: string };

const PREDICT_OPS_STATE_KEY = 'predict-ops:realtime-state:v1';
const PREDICT_RUNTIME_ISSUE_PREFIX = 'admin:predict-runtime-issue:v1:';
const PREDICT_REALTIME_ISSUE_TYPE = 'round_realtime_publish_failed';
const NANO = 1_000_000_000;
const GAME_IDS = new Set(['mines', 'plinko', 'wheel', 'dice', 'crash', 'hilo', 'coinflip', 'slot', 'ghostrun']);
let predictVisitorTrackingReady: Promise<void> | null = null;

function messageFor(locks: SectionLock[]): LockMessage {
  return {
    type: 'section-access',
    serverNow: Math.floor(Date.now() / 1000),
    locks: Object.fromEntries(locks.map((lock) => [lock.sectionId, lock])),
  };
}

function predictOpsMessage(state: PredictOpsRealtimeState, refreshRound = false): PredictOpsMessage {
  return { type: 'predict-ops', state, refreshRound };
}

export class SectionLockEvents {
  private sessions = new Map<WebSocket, RealtimeSession>();
  private predictRoundSignatures = new Map<string, string>();
  private predictAdjustment: OnlineCountAdjustment = { permanent: 0 };
  private predictAdjustmentFetchedAt = 0;
  private predictOnlineRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  private onlineCountConfig: OnlineCountConfig | null = null;

  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get('Upgrade') === 'websocket' && url.pathname === '/connect') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      const admin = request.headers.get('x-section-lock-admin') === '1';
      this.sessions.set(server, { admin, userId: '', predictActive: false, gameActive: '' });
      server.addEventListener('close', () => this.removeSession(server));
      server.addEventListener('error', () => this.removeSession(server));
      server.addEventListener('message', (event) => {
        if (typeof event.data !== 'string') return;
        void this.handleSessionMessage(server, event.data);
      });
      try {
        const raw = request.headers.get('x-section-lock-initial') || '[]';
        const locks = admin ? [] : JSON.parse(raw) as SectionLock[];
        server.send(JSON.stringify(messageFor(Array.isArray(locks) ? locks : [])));
      } catch {
        server.send(JSON.stringify(messageFor([])));
      }
      const predictOpsState = await this.state.storage.get<unknown>(PREDICT_OPS_STATE_KEY).catch(() => null);
      if (isPredictOpsRealtimeState(predictOpsState)) {
        try { server.send(JSON.stringify(predictOpsMessage(predictOpsState, false))); } catch { /* socket lifecycle owns cleanup */ }
      }
      try { server.send(JSON.stringify(await this.predictOnlineMessage())); } catch { this.sessions.delete(server); }
      try { server.send(JSON.stringify(await this.gameOnlineMessage())); } catch { this.sessions.delete(server); }
      return new Response(null, { status: 101, webSocket: client });
    }
    if (request.method === 'GET' && url.pathname === '/predict-online-users') {
      return Response.json({ userIds: this.predictOnlineUserIds() });
    }
    if (request.method === 'POST' && url.pathname === '/publish') {
      const locks = await request.json().catch(() => []) as SectionLock[];
      const payload = JSON.stringify(messageFor(Array.isArray(locks) ? locks : []));
      const emptyPayload = JSON.stringify(messageFor([]));
      for (const [socket, session] of this.sessions) {
        try { socket.send(session.admin ? emptyPayload : payload); } catch { this.sessions.delete(socket); }
      }
      return Response.json({ ok: true });
    }
    if (request.method === 'POST' && url.pathname === '/publish-predict-round') {
      const body = await request.json().catch(() => null) as { market?: unknown; roundId?: unknown; userId?: unknown } | null;
      const market = cleanPredictMarket(body?.market);
      if (!market) return Response.json({ ok: false }, { status: 400 });
      const roundId = cleanPredictRoundId(body?.roundId, market);
      if (!roundId) return Response.json({ ok: false }, { status: 400 });
      try {
        await this.broadcastPredictRoundState(market, roundId, cleanUserId(body?.userId));
        await this.recoverPredictRealtimeIssue(market, roundId).catch(() => undefined);
        return Response.json({ ok: true });
      } catch (error) {
        this.broadcastPredictSyncError(market, roundId);
        return Response.json({ ok: false, error: predictSyncErrorMessage(error) }, { status: 503 });
      }
    }
    if (request.method === 'POST' && url.pathname === '/publish-online-counts') {
      const config = await request.json().catch(() => null) as OnlineCountConfig | null;
      if (!config?.ranges || !config.adjustments) return Response.json({ ok: false }, { status: 400 });
      this.onlineCountConfig = config;
      this.predictAdjustment = config.adjustments.predict || { permanent: 0 };
      this.predictAdjustmentFetchedAt = Date.now();
      await this.broadcastOnlineCounts();
      await this.broadcastPredictOnlineCount();
      return Response.json({ ok: true });
    }
    if (request.method === 'POST' && url.pathname === '/publish-predict-ops') {
      const body = await request.json().catch(() => null) as { state?: unknown; refreshRound?: unknown; userControls?: unknown } | null;
      if (!body || typeof body !== 'object') return Response.json({ ok: false }, { status: 400 });
      let handled = false;

      if (body.userControls !== undefined) {
        if (!isRealtimeUserControls(body.userControls)) return Response.json({ ok: false }, { status: 400 });
        const controls = body.userControls;
        const payload = JSON.stringify({ type: 'user-controls', controls } satisfies UserControlsMessage);
        for (const [socket, session] of this.sessions) {
          if (session.userId !== controls.userId) continue;
          try { socket.send(payload); } catch { this.sessions.delete(socket); }
        }
        handled = true;
      }

      if (body.state !== undefined) {
        if (!isPredictOpsRealtimeState(body.state)) return Response.json({ ok: false }, { status: 400 });
        const state = body.state;
        const refreshRound = body.refreshRound === true;
        await this.state.storage.put(PREDICT_OPS_STATE_KEY, state);
        const payload = JSON.stringify(predictOpsMessage(state, refreshRound));
        for (const socket of [...this.sessions.keys()]) {
          try { socket.send(payload); } catch { this.sessions.delete(socket); }
        }
        handled = true;
      }

      return handled ? Response.json({ ok: true }) : Response.json({ ok: false }, { status: 400 });
    }
    return new Response('Not found', { status: 404 });
  }

  private async handleSessionMessage(socket: WebSocket, raw: string): Promise<void> {
    let message: { type?: unknown; initData?: unknown; predictActive?: unknown; gameActive?: unknown; active?: unknown; market?: unknown; roundId?: unknown } | null = null;
    try { message = JSON.parse(raw) as { type?: unknown; initData?: unknown; predictActive?: unknown; gameActive?: unknown; active?: unknown; market?: unknown; roundId?: unknown }; } catch { return; }
    if (message?.type === 'identify') {
      await this.identifySession(socket, message);
      return;
    }
    if (message?.type === 'predict-round-sync') {
      await this.syncPredictRound(socket, message);
      return;
    }
    if (message?.type === 'game-presence') {
      const session = this.sessions.get(socket);
      if (!session || session.admin || !session.userId) return;
      const next = cleanGameId(message.gameActive);
      if (session.gameActive === next) return;
      session.gameActive = next;
      await this.broadcastOnlineCounts();
      return;
    }
    if (message?.type !== 'predict-presence') return;
    const session = this.sessions.get(socket);
    if (!session || session.admin || !session.userId) return;
    const next = message.active === true;
    if (session.predictActive === next) return;
    session.predictActive = next;
    if (next) await recordPredictVisit(this.env, session.userId).catch((error) => console.warn('record Predict visit failed', error));
    void this.broadcastPredictOnlineCount();
  }

  private async identifySession(socket: WebSocket, message: { initData?: unknown; predictActive?: unknown; gameActive?: unknown }): Promise<void> {
    const initData = String(message.initData || '');
    if (!initData) return;
    try {
      const userId = cleanUserId(await validateTelegramInitData(initData, gameBotToken(this.env)));
      const session = this.sessions.get(socket);
      if (!session || !userId) return;
      session.userId = userId;
      session.predictActive = !session.admin && message.predictActive === true;
      session.gameActive = !session.admin ? cleanGameId(message.gameActive) : '';
      if (session.predictActive) await recordPredictVisit(this.env, userId).catch((error) => console.warn('record Predict visit failed', error));
      void this.broadcastPredictOnlineCount();
      await this.broadcastOnlineCounts();
    } catch { /* invalid session cannot claim a realtime user target */ }
  }

  private async syncPredictRound(socket: WebSocket, message: { initData?: unknown; market?: unknown; roundId?: unknown }): Promise<void> {
    let session = this.sessions.get(socket);
    if (!session || session.admin) return;
    if (!session.userId && message.initData) {
      await this.identifySession(socket, { initData: message.initData, predictActive: true });
      session = this.sessions.get(socket);
    }
    if (!session || !session.userId || !session.predictActive) return;
    const market = cleanPredictMarket(message.market);
    if (!market) return;
    const roundId = cleanPredictRoundId(message.roundId, market);
    if (!roundId) return;
    try {
      await this.broadcastPredictRoundState(market, roundId, session.userId);
      await this.recoverPredictRealtimeIssue(market, roundId).catch(() => undefined);
    } catch (error) {
      await this.reportPredictRealtimeIssue(market, roundId, error).catch(() => undefined);
      this.sendPredictSyncError(socket, market, roundId);
    }
  }

  private async broadcastPredictRoundState(market: PredictMarket, roundId: string, requestUserId = ''): Promise<void> {
    let stage = 'round lookup';
    try {
      const roundRow = await this.env.DB.prepare('SELECT id, market, status, result, end_price FROM predict_rounds WHERE id = ? AND market = ? LIMIT 1')
        .bind(roundId, market)
        .first<PredictRoundDbRow>();
      if (!roundRow) return;

      stage = 'pool aggregation';
      const poolRows = await this.env.DB.prepare(`SELECT side, COALESCE(SUM(stake_nano), 0) AS stakeNano, COUNT(*) AS count
        FROM predict_bets
        WHERE round_id = ? AND status NOT IN ('failed','pending')
        GROUP BY side`)
        .bind(roundId)
        .all<PredictPoolDbRow>();
      const pools = {
        up: { stakeNano: 0, stakeTon: 0, count: 0 },
        down: { stakeNano: 0, stakeTon: 0, count: 0 },
      };
      for (const row of poolRows.results || []) {
        if (row.side !== 'up' && row.side !== 'down') continue;
        const stakeNano = normalizeNano(row.stakeNano);
        pools[row.side] = { stakeNano, stakeTon: nanoToTon(stakeNano), count: Math.max(0, Math.floor(Number(row.count) || 0)) };
      }

      const round: PredictRoundRealtime = {
        market,
        roundId,
        status: String(roundRow.status || ''),
        result: roundRow.result == null ? null : String(roundRow.result),
        endPrice: roundRow.end_price == null ? null : Number(roundRow.end_price),
        pools,
        updatedAt: new Date().toISOString(),
      };
      const signature = JSON.stringify([round.status, round.result, round.endPrice, pools.up.stakeNano, pools.up.count, pools.down.stakeNano, pools.down.count]);
      const changed = this.predictRoundSignatures.get(roundId) !== signature;
      this.predictRoundSignatures.set(roundId, signature);

      if (changed) {
        const payload = JSON.stringify({ type: 'predict-round', round } satisfies PredictRoundMessage);
        for (const [target, targetSession] of this.sessions) {
          if (targetSession.admin || !targetSession.predictActive || !targetSession.userId) continue;
          try { target.send(payload); } catch { this.sessions.delete(target); }
        }
      }

      const terminal = round.status === 'settled' || round.status === 'refunded';
      if (terminal && changed) {
        stage = 'terminal user result lookup';
        const bets = await this.env.DB.prepare(`SELECT b.id, b.round_id, b.market, b.user_id, b.side, b.stake_nano, b.status, b.payout_nano, b.created_at,
            COALESCE(u.ton_balance_nano, 0) AS ton_balance_nano
          FROM predict_bets b
          LEFT JOIN app_users u ON u.telegram_user_id = b.user_id
          WHERE b.round_id = ? AND b.status != 'failed'
          ORDER BY datetime(b.created_at) DESC`)
          .bind(roundId)
          .all<PredictUserBetDbRow>();
        for (const bet of bets.results || []) this.sendPredictUserRoundUpdate(bet);
        return;
      }

      if (!requestUserId) return;
      stage = 'user bet lookup';
      const ownBet = await this.env.DB.prepare(`SELECT b.id, b.round_id, b.market, b.user_id, b.side, b.stake_nano, b.status, b.payout_nano, b.created_at,
          COALESCE(u.ton_balance_nano, 0) AS ton_balance_nano
        FROM predict_bets b
        LEFT JOIN app_users u ON u.telegram_user_id = b.user_id
        WHERE b.round_id = ? AND b.user_id = ? AND b.status != 'failed'
        ORDER BY datetime(b.created_at) DESC LIMIT 1`)
        .bind(roundId, requestUserId)
        .first<PredictUserBetDbRow>();
      if (ownBet) {
        this.sendPredictUserRoundUpdate(ownBet);
        return;
      }
      stage = 'user balance lookup';
      const balance = await this.env.DB.prepare('SELECT ton_balance_nano FROM app_users WHERE telegram_user_id = ? LIMIT 1')
        .bind(requestUserId)
        .first<{ ton_balance_nano: number }>();
      this.sendPredictUserRoundPayload({
        userId: requestUserId,
        market,
        roundId,
        tonBalanceNano: normalizeNano(balance?.ton_balance_nano),
        bet: null,
      });
    } catch (error) {
      throw new Error(`SectionLockEvents.broadcastPredictRoundState → ${stage}: ${predictSyncErrorMessage(error)}`);
    }
  }

  private async reportPredictRealtimeIssue(market: PredictMarket, roundId: string, error: unknown): Promise<void> {
    const key = predictRealtimeIssueKey(market);
    const previous = await this.readPredictRealtimeIssue(key);
    const now = new Date().toISOString();
    const issue: PredictRealtimeIssue = {
      type: PREDICT_REALTIME_ISSUE_TYPE,
      market,
      where: 'section-lock-events.ts → WebSocket predict-round-sync → broadcastPredictRoundState',
      message: `Round ${roundId}: ${predictSyncErrorMessage(error)}`,
      firstAt: previous?.firstAt || now,
      lastAt: now,
    };
    await this.env.BOT_CACHE.put(key, JSON.stringify(issue));
    if (!previous || previous.message !== issue.message || previous.where !== issue.where) await this.notifyPredictRealtimeAdmins('error', issue);
  }

  private async recoverPredictRealtimeIssue(market: PredictMarket, roundId: string): Promise<void> {
    const key = predictRealtimeIssueKey(market);
    const previous = await this.readPredictRealtimeIssue(key);
    if (!previous) return;
    try { await this.env.BOT_CACHE.delete(key); } catch { return; }
    await this.notifyPredictRealtimeAdmins('recovered', previous, `Realtime round sync succeeded for ${roundId}.`);
  }

  private async readPredictRealtimeIssue(key: string): Promise<PredictRealtimeIssue | null> {
    const raw = await this.env.BOT_CACHE.get(key).catch(() => null);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as Partial<PredictRealtimeIssue>;
      const market = cleanPredictMarket(parsed.market);
      if (!market || parsed.type !== PREDICT_REALTIME_ISSUE_TYPE || !parsed.where || !parsed.message || !parsed.firstAt) return null;
      return {
        type: PREDICT_REALTIME_ISSUE_TYPE,
        market,
        where: String(parsed.where).replace(/\s+/g, ' ').trim().slice(0, 260),
        message: predictSyncErrorMessage(parsed.message),
        firstAt: String(parsed.firstAt).slice(0, 40),
        lastAt: String(parsed.lastAt || parsed.firstAt).slice(0, 40),
      };
    } catch { return null; }
  }

  private async notifyPredictRealtimeAdmins(status: 'error' | 'recovered', issue: PredictRealtimeIssue, recovery = ''): Promise<void> {
    const token = String(gameBotToken(this.env) || '').trim();
    const adminIds = Array.from(new Set(String(this.env.BOT_ADMIN || '').split(/[\s,;|]+/).map((value) => value.trim()).filter((value) => /^\d+$/.test(value))));
    if (!token || !adminIds.length) return;
    const now = new Date().toISOString();
    const text = status === 'error'
      ? ['🚨 Predict Runtime Alert', 'Status: ERROR', `Type: ${issue.type}`, `Market: ${predictMarketLabel(issue.market)}`, `Where: ${issue.where}`, `Root error: ${issue.message}`, `First seen: ${issue.firstAt}`, `Detected: ${now}`].join('\n').slice(0, 3800)
      : ['✅ Predict Recovered', 'Status: RECOVERED', `Type: ${issue.type}`, `Market: ${predictMarketLabel(issue.market)}`, `Where: ${issue.where}`, `Previous error: ${issue.message}`, `Started: ${issue.firstAt}`, `Recovered: ${now}`, `Result: ${recovery || 'Realtime round sync completed successfully again.'}`].join('\n').slice(0, 3800);
    await Promise.allSettled(adminIds.map(async (chatId) => {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      });
      if (!response.ok) throw new Error(`Predict realtime admin alert failed: HTTP ${response.status}`);
    }));
  }

  private sendPredictSyncError(socket: WebSocket, market: PredictMarket, roundId: string): void {
    try { socket.send(JSON.stringify({ type: 'predict-sync-error', market, roundId } satisfies PredictSyncErrorMessage)); }
    catch { this.sessions.delete(socket); }
  }

  private broadcastPredictSyncError(market: PredictMarket, roundId: string): void {
    const payload = JSON.stringify({ type: 'predict-sync-error', market, roundId } satisfies PredictSyncErrorMessage);
    for (const [socket, session] of this.sessions) {
      if (session.admin || !session.predictActive || !session.userId) continue;
      try { socket.send(payload); } catch { this.sessions.delete(socket); }
    }
  }

  private sendPredictUserRoundUpdate(row: PredictUserBetDbRow): void {
    const market = cleanPredictMarket(row.market);
    if (!market) return;
    const stakeNano = normalizeNano(row.stake_nano);
    const payoutNano = normalizeNano(row.payout_nano);
    this.sendPredictUserRoundPayload({
      userId: cleanUserId(row.user_id),
      market,
      roundId: String(row.round_id || ''),
      tonBalanceNano: normalizeNano(row.ton_balance_nano),
      bet: {
        id: String(row.id || ''),
        roundId: String(row.round_id || ''),
        market,
        side: String(row.side || ''),
        stakeNano,
        stakeTon: nanoToTon(stakeNano),
        status: String(row.status || ''),
        payoutNano,
        payoutTon: nanoToTon(payoutNano),
        createdAt: String(row.created_at || ''),
      },
    });
  }

  private sendPredictUserRoundPayload(update: PredictUserRoundRealtime): void {
    if (!update.userId) return;
    const payload = JSON.stringify({ type: 'predict-user-round', update } satisfies PredictUserRoundMessage);
    for (const [socket, session] of this.sessions) {
      if (session.admin || !session.predictActive || session.userId !== update.userId) continue;
      try { socket.send(payload); } catch { this.sessions.delete(socket); }
    }
  }

  private removeSession(socket: WebSocket): void {
    const session = this.sessions.get(socket);
    if (!session) return;
    const affectedPredictCount = !session.admin && session.predictActive && Boolean(session.userId);
    const affectedGameCount = !session.admin && Boolean(session.gameActive) && Boolean(session.userId);
    this.sessions.delete(socket);
    if (affectedPredictCount) void this.broadcastPredictOnlineCount();
    if (affectedGameCount) void this.broadcastOnlineCounts();
  }

  private async gameOnlineMessage(): Promise<GameOnlineMessage> {
    const config = this.onlineCountConfig || await getOnlineUserCountConfig(this.env);
    this.onlineCountConfig = config;
    const counts: Record<string, number> = {};
    for (const id of GAME_IDS) {
      const users = new Set<string>();
      for (const session of this.sessions.values()) if (!session.admin && session.gameActive === id && session.userId) users.add(session.userId);
      counts[id] = users.size;
    }
    return { type: 'game-online', counts, config };
  }

  private async broadcastOnlineCounts(): Promise<void> {
    const payload = JSON.stringify(await this.gameOnlineMessage());
    for (const socket of [...this.sessions.keys()]) {
      try { socket.send(payload); } catch { this.sessions.delete(socket); }
    }
  }

  private predictOnlineUserIds(): string[] {
    const users = new Set<string>();
    for (const session of this.sessions.values()) {
      if (!session.admin && session.predictActive && session.userId) users.add(session.userId);
    }
    return [...users].sort();
  }

  private async predictOnlineMessage(): Promise<PredictOnlineMessage> {
    return { type: 'predict-online', count: this.predictOnlineUserIds().length + await this.predictOnlineBoost() };
  }

  private async predictOnlineBoost(): Promise<number> {
    const now = Date.now();
    if (!this.predictAdjustmentFetchedAt || now - this.predictAdjustmentFetchedAt >= 60_000) {
      try {
        const config = await getOnlineUserCountConfig(this.env);
        this.predictAdjustment = config.adjustments.predict || { permanent: 0 };
        this.predictAdjustmentFetchedAt = now;
      } catch { /* retain the last known adjustment when settings are temporarily unavailable */ }
    }
    const permanent = Math.max(0, Math.floor(Number(this.predictAdjustment.permanent) || 0));
    const timed = this.predictAdjustment.timed;
    if (!timed || Date.parse(timed.expiresAt) <= now) return permanent;
    const min = Math.max(0, Math.floor(Number(timed.min) || 0));
    const max = Math.max(min, Math.floor(Number(timed.max) || 0));
    const width = max - min + 1;
    return permanent + min + (Math.floor(now / 90_000) * 37 % width);
  }

  private async broadcastPredictOnlineCount(): Promise<void> {
    let payload = JSON.stringify(await this.predictOnlineMessage());
    let removedActive = false;
    for (const [socket, session] of this.sessions) {
      try { socket.send(payload); }
      catch {
        if (!session.admin && session.predictActive && session.userId) removedActive = true;
        this.sessions.delete(socket);
      }
    }
    if (removedActive) {
      payload = JSON.stringify(await this.predictOnlineMessage());
      for (const [socket] of this.sessions) {
        try { socket.send(payload); } catch { this.sessions.delete(socket); }
      }
    }
    this.schedulePredictOnlineRefresh();
  }

  private schedulePredictOnlineRefresh(): void {
    if (this.predictOnlineRefreshTimer) clearTimeout(this.predictOnlineRefreshTimer);
    this.predictOnlineRefreshTimer = null;
    const hasActivePredictUser = [...this.sessions.values()].some((session) => !session.admin && session.predictActive && Boolean(session.userId));
    if (!hasActivePredictUser) return;
    const delay = 90_000 - (Date.now() % 90_000) + 120;
    this.predictOnlineRefreshTimer = setTimeout(() => {
      this.predictOnlineRefreshTimer = null;
      void this.broadcastPredictOnlineCount();
    }, delay);
  }
}

export async function ensurePredictVisitorTracking(env: Env): Promise<void> {
  if (!predictVisitorTrackingReady) {
    predictVisitorTrackingReady = (async () => {
      await env.DB.prepare('ALTER TABLE app_users ADD COLUMN predict_first_seen_at TEXT').run().catch(() => undefined);
      await env.DB.prepare('ALTER TABLE app_users ADD COLUMN predict_last_seen_at TEXT').run().catch(() => undefined);
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_app_users_predict_last_seen ON app_users(predict_last_seen_at)').run();
      await env.DB.prepare(`UPDATE app_users
        SET predict_first_seen_at = COALESCE(predict_first_seen_at, (SELECT MIN(pb.created_at) FROM predict_bets pb WHERE pb.user_id = app_users.telegram_user_id)),
            predict_last_seen_at = COALESCE(predict_last_seen_at, (SELECT MAX(pb.created_at) FROM predict_bets pb WHERE pb.user_id = app_users.telegram_user_id))
        WHERE EXISTS (SELECT 1 FROM predict_bets pb WHERE pb.user_id = app_users.telegram_user_id)`).run().catch(() => undefined);
      await env.DB.prepare(`UPDATE app_users
        SET predict_first_seen_at = COALESCE(predict_first_seen_at, last_seen_at, CURRENT_TIMESTAMP),
            predict_last_seen_at = CASE
              WHEN predict_last_seen_at IS NULL THEN COALESCE(last_seen_at, CURRENT_TIMESTAMP)
              WHEN last_seen_at IS NOT NULL AND datetime(last_seen_at) > datetime(predict_last_seen_at) THEN last_seen_at
              ELSE predict_last_seen_at
            END
        WHERE current_section = 'predictzone'`).run().catch(() => undefined);
    })().catch((error) => {
      predictVisitorTrackingReady = null;
      throw error;
    });
  }
  await predictVisitorTrackingReady;
}

async function recordPredictVisit(env: Env, userIdInput: unknown): Promise<void> {
  const userId = cleanUserId(userIdInput);
  if (!userId) return;
  await ensurePredictVisitorTracking(env);
  await env.DB.prepare(`INSERT INTO app_users (telegram_user_id, predict_first_seen_at, predict_last_seen_at)
    VALUES (?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(telegram_user_id) DO UPDATE SET
      predict_first_seen_at = COALESCE(app_users.predict_first_seen_at, CURRENT_TIMESTAMP),
      predict_last_seen_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP`)
    .bind(userId)
    .run();
}

export async function getPredictOnlineUserIds(env: Env): Promise<string[]> {
  const id = env.SECTION_LOCK_EVENTS.idFromName('global');
  const response = await env.SECTION_LOCK_EVENTS.get(id).fetch('https://section-lock-events/predict-online-users');
  if (!response.ok) throw new Error('Could not load Predict online users.');
  const body = await response.json().catch(() => null) as { userIds?: unknown } | null;
  if (!Array.isArray(body?.userIds)) return [];
  return [...new Set(body.userIds.map((value) => cleanUserId(value)).filter(Boolean))];
}

function cleanGameId(value: unknown): string {
  const id = String(value || '').trim().toLowerCase();
  return GAME_IDS.has(id) ? id : '';
}

export async function publishSectionAccess(env: Env, locks: SectionLock[]): Promise<void> {
  const id = env.SECTION_LOCK_EVENTS.idFromName('global');
  await env.SECTION_LOCK_EVENTS.get(id).fetch('https://section-lock-events/publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(locks),
  });
}

export async function publishUserControls(env: Env, controls: RealtimeUserControls): Promise<void> {
  const id = env.SECTION_LOCK_EVENTS.idFromName('global');
  const response = await env.SECTION_LOCK_EVENTS.get(id).fetch('https://section-lock-events/publish-predict-ops', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ userControls: controls }),
  });
  if (!response.ok) throw new Error('Could not publish user access state.');
}

export async function publishPredictOpsState(env: Env, state: PredictOpsRealtimeState, refreshRound = false): Promise<void> {
  const id = env.SECTION_LOCK_EVENTS.idFromName('global');
  const response = await env.SECTION_LOCK_EVENTS.get(id).fetch('https://section-lock-events/publish-predict-ops', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ state, refreshRound }),
  });
  if (!response.ok) throw new Error('Could not publish Predict Ops state.');
}

export async function publishPredictRoundState(env: Env, marketInput: unknown, roundIdInput: unknown, userIdInput: unknown = ''): Promise<void> {
  const market = cleanPredictMarket(marketInput);
  if (!market) throw new Error('Invalid Predict market.');
  const roundId = cleanPredictRoundId(roundIdInput, market);
  if (!roundId) throw new Error('Invalid Predict round.');
  const id = env.SECTION_LOCK_EVENTS.idFromName('global');
  const response = await env.SECTION_LOCK_EVENTS.get(id).fetch('https://section-lock-events/publish-predict-round', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ market, roundId, userId: cleanUserId(userIdInput) }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: unknown } | null;
    const detail = String(body?.error || `HTTP ${response.status}`).replace(/\s+/g, ' ').trim().slice(0, 320);
    throw new Error(`SectionLockEvents /publish-predict-round: ${detail || `HTTP ${response.status}`}`);
  }
}

function isRealtimeUserControls(value: unknown): value is RealtimeUserControls {
  if (!value || typeof value !== 'object') return false;
  const controls = value as Partial<RealtimeUserControls>;
  const userId = cleanUserId(controls.userId);
  if (!userId || !Array.isArray(controls.sectionBlocks)) return false;
  return controls.sectionBlocks.every((item) => {
    if (!item || typeof item !== 'object') return false;
    const block = item as Partial<UserControlBlock>;
    if (!String(block.sectionId || '').trim() || typeof block.blocked !== 'boolean') return false;
    if (block.expiresAt !== null && typeof block.expiresAt !== 'string') return false;
    return block.remainingMs === null || (typeof block.remainingMs === 'number' && Number.isFinite(block.remainingMs) && block.remainingMs >= 0);
  });
}

function cleanPredictMarket(value: unknown): PredictMarket | null {
  const market = String(value || '').trim().toLowerCase();
  return market === 'bitcoin' || market === 'gold' || market === 'oil' ? market : null;
}

function cleanPredictRoundId(value: unknown, market: PredictMarket): string {
  const roundId = String(value || '').trim();
  return new RegExp(`^pr_${market}_\\d+$`).test(roundId) ? roundId : '';
}

function normalizeNano(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.floor(n));
}

function nanoToTon(value: number): number {
  return Math.floor(Number(value) || 0) / NANO;
}

function cleanUserId(value: unknown): string {
  return String(value ?? '').replace(/[^0-9A-Za-z_-]/g, '').trim().slice(0, 80);
}

function predictSyncErrorMessage(error: unknown): string {
  return (error instanceof Error ? error.message : String(error || 'Unknown Predict realtime error')).replace(/\s+/g, ' ').trim().slice(0, 320) || 'Unknown Predict realtime error';
}

function predictRealtimeIssueKey(market: PredictMarket): string {
  return `${PREDICT_RUNTIME_ISSUE_PREFIX}${market}:${PREDICT_REALTIME_ISSUE_TYPE}`;
}

function predictMarketLabel(market: PredictMarket): string {
  return market === 'bitcoin' ? 'Bitcoin' : market === 'gold' ? 'Gold' : 'Oil';
}

function isPredictOpsRealtimeState(value: unknown): value is PredictOpsRealtimeState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<PredictOpsRealtimeState>;
  if (typeof state.emergencyPaused !== 'boolean' || typeof state.maintenanceMessage !== 'string' || !state.markets || typeof state.markets !== 'object') return false;
  for (const market of ['bitcoin', 'gold', 'oil'] as const) {
    const item = state.markets[market] as PredictOpsMarketState | undefined;
    if (!item || typeof item.manualPaused !== 'boolean' || typeof item.circuitOpen !== 'boolean') return false;
    if (item.circuitReason !== null && typeof item.circuitReason !== 'string') return false;
    if (item.capacityReached !== undefined && typeof item.capacityReached !== 'boolean') return false;
  }
  return state.updatedAt === null || typeof state.updatedAt === 'string';
}
