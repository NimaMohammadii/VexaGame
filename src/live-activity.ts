import type { Env } from './types';

export type LiveActivityKind = 'deposit' | 'withdraw' | 'ticket' | 'lottery';

export type LiveActivityInput = {
  kind: LiveActivityKind;
  userId: string;
  amountNano?: number;
  section?: string | null;
  quantity?: number;
  roundId?: string | null;
  prizePoolNano?: number | null;
  roundTicketCount?: number | null;
  key?: string;
  action?: string;
  createdAt?: string;
};

export type LiveActivityEvent = {
  id: string;
  kind: LiveActivityKind;
  displayName: string;
  action: string;
  amountNano?: number | null;
  section: string | null;
  roundId?: string | null;
  prizePoolNano?: number | null;
  roundTicketCount?: number | null;
  createdAt: string;
};

type AppUserRow = { first_name: string | null; username: string | null };

const RECENT_KEY = 'live-activity:recent:v1';
const RECENT_LIMIT = 30;

export class LiveActivityRoom {
  private sessions = new Set<WebSocket>();

  constructor(private state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.headers.get('Upgrade') === 'websocket' && url.pathname === '/connect') {
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      server.accept();
      this.sessions.add(server);
      server.addEventListener('close', () => this.sessions.delete(server));
      server.addEventListener('error', () => this.sessions.delete(server));
      const stored = await this.state.storage.get<unknown>(RECENT_KEY).catch(() => []);
      const recent = filterRecentEvents(stored);
      if (Array.isArray(stored) && recent.length !== stored.length) {
        await this.state.storage.put(RECENT_KEY, recent);
      }
      safeSend(server, { type: 'live-activity:init', events: recent });
      return new Response(null, { status: 101, webSocket: client });
    }

    if (request.method === 'POST' && url.pathname === '/publish') {
      const event = await request.json().catch(() => null) as unknown;
      if (!isLiveActivityEvent(event)) return Response.json({ ok: false }, { status: 400 });
      const stored = await this.state.storage.get<unknown>(RECENT_KEY).catch(() => []);
      const current = filterRecentEvents(stored);
      if (current.some((item) => item.id === event.id)) {
        if (Array.isArray(stored) && current.length !== stored.length) await this.state.storage.put(RECENT_KEY, current);
        return Response.json({ ok: true, duplicate: true });
      }
      const next = [event, ...current].slice(0, RECENT_LIMIT);
      await this.state.storage.put(RECENT_KEY, next);
      const payload = { type: 'live-activity:event', event };
      for (const socket of [...this.sessions]) {
        if (!safeSend(socket, payload)) this.sessions.delete(socket);
      }
      return Response.json({ ok: true });
    }

    return new Response('Not found', { status: 404 });
  }
}

export async function publishLiveActivity(env: Env, input: LiveActivityInput): Promise<void> {
  const userId = cleanUserId(input.userId);
  const event = await buildEvent(env, userId, input);
  const id = env.LIVE_ACTIVITY.idFromName('global');
  const response = await env.LIVE_ACTIVITY.get(id).fetch('https://live-activity/publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!response.ok) throw new Error(`Live activity publish failed (${response.status})`);
}

export async function publishLotteryLiveRefresh(env: Env, input: {
  roundId?: string | null;
  prizePoolNano?: number | null;
  action?: string;
  key?: string;
} = {}): Promise<void> {
  await publishLiveActivity(env, {
    kind: 'lottery',
    userId: 'lottery-system',
    section: 'home',
    roundId: input.roundId || null,
    prizePoolNano: input.prizePoolNano,
    action: input.action || 'Lottery updated',
    key: input.key || `lottery_${Date.now().toString(36)}_${randomHex(10)}`,
  });
}

async function buildEvent(env: Env, userId: string, input: LiveActivityInput): Promise<LiveActivityEvent> {
  const row = await env.DB.prepare('SELECT first_name,username FROM app_users WHERE telegram_user_id=? LIMIT 1')
    .bind(userId)
    .first<AppUserRow>()
    .catch(() => null);
  const username = cleanUsername(row?.username);
  const firstName = cleanName(row?.first_name);
  const suffix = userId.slice(-4);
  const displayName = firstName || (username ? `@${username}` : `Player ${suffix || '—'}`);
  const createdAt = normalizeDate(input.createdAt);
  return {
    id: activityId(input.kind, userId, input.key, createdAt),
    kind: input.kind,
    displayName,
    action: cleanAction(input.action) || actionFor(input),
    amountNano: cleanOptionalNano(input.amountNano),
    section: cleanSection(input.section),
    roundId: cleanRoundId(input.roundId),
    prizePoolNano: cleanOptionalNano(input.prizePoolNano),
    roundTicketCount: cleanOptionalCount(input.roundTicketCount),
    createdAt,
  };
}

function actionFor(input: LiveActivityInput): string {
  const amount = Math.abs(Math.floor(Number(input.amountNano) || 0));
  if (input.kind === 'deposit') return 'Deposited';
  if (input.kind === 'withdraw') return 'Requested a withdrawal';
  if (input.kind === 'lottery') return 'Lottery updated';
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));
  if (!amount && quantity === 1) return 'Claimed a free ticket';
  return `Bought ${quantity} ticket${quantity === 1 ? '' : 's'}`;
}

function isLiveActivityKind(value: unknown): value is LiveActivityKind {
  return value === 'deposit' || value === 'withdraw' || value === 'ticket' || value === 'lottery';
}

function isLiveActivityEvent(value: unknown): value is LiveActivityEvent {
  if (!value || typeof value !== 'object') return false;
  const event = value as Partial<LiveActivityEvent>;
  return Boolean(String(event.id || '').trim()) && isLiveActivityKind(event.kind);
}

function filterRecentEvents(value: unknown): LiveActivityEvent[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isLiveActivityEvent).slice(0, RECENT_LIMIT);
}

function activityId(kind: LiveActivityKind, userId: string, key: string | undefined, createdAt: string): string {
  if (key) {
    const stable = `${kind}_${userId}_${key}`.replace(/[^0-9A-Za-z_-]/g, '').slice(0, 110);
    if (stable) return `la_${stable}`;
  }
  return `la_${kind}_${Date.parse(createdAt) || Date.now()}_${randomHex(10)}`;
}

function safeSend(socket: WebSocket, payload: unknown): boolean {
  try { socket.send(JSON.stringify(payload)); return true; } catch { return false; }
}

function normalizeDate(value: unknown): string {
  const parsed = Date.parse(String(value || ''));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

function cleanUserId(value: unknown): string {
  const id = String(value || '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 80);
  if (!id) throw new Error('Missing live activity user');
  return id;
}

function cleanUsername(value: unknown): string {
  return String(value || '').replace(/^@+/, '').replace(/[^0-9A-Za-z_]/g, '').slice(0, 64);
}

function cleanName(value: unknown): string {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, 48);
}

function cleanAction(value: unknown): string {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, 120);
}

function cleanSection(value: unknown): string | null {
  const section = String(value || '').toLowerCase().replace(/[^0-9a-z_-]/g, '').slice(0, 32);
  return section || null;
}

function cleanRoundId(value: unknown): string | null {
  const roundId = String(value || '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 96);
  return roundId || null;
}

function cleanOptionalNano(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const amount = Math.floor(Number(value));
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

function cleanOptionalCount(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const count = Math.floor(Number(value));
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

function randomHex(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, '0')).join('').slice(0, length);
}

// Compatibility export used by the app shell. This is transport-only: it does
// not mount, style, render, or refresh any Live Activity UI.
export const LIVE_ACTIVITY_CLIENT_SCRIPT = `
<script>
(function(){
  var tg=window.Telegram&&window.Telegram.WebApp;
  var socket=null;
  var reconnectTimer=0;
  var reconnectAttempt=0;
  function allowed(event){return !!event&&!!event.id&&(event.kind==='deposit'||event.kind==='withdraw'||event.kind==='ticket'||event.kind==='lottery')}
  function broadcast(event){try{window.dispatchEvent(new CustomEvent('vexa:live-activity',{detail:event}))}catch(e){}}
  function delay(){return Math.min(30000,900*Math.pow(2,Math.min(reconnectAttempt++,5)))}
  function connect(){
    if(socket||!window.WebSocket)return;
    var initData=String((tg&&tg.initData)||'');if(!initData)return;
    var proto=location.protocol==='https:'?'wss:':'ws:';
    try{
      socket=new WebSocket(proto+'//'+location.host+'/app/api/live-activity/ws?initData='+encodeURIComponent(initData));
      socket.onopen=function(){reconnectAttempt=0};
      socket.onmessage=function(message){
        try{
          var data=JSON.parse(message.data);
          if(data&&data.type==='live-activity:event'&&allowed(data.event))broadcast(data.event);
        }catch(e){}
      };
      socket.onclose=function(){socket=null;clearTimeout(reconnectTimer);if(!document.hidden)reconnectTimer=setTimeout(connect,delay())};
      socket.onerror=function(){try{socket&&socket.close()}catch(e){}};
    }catch(e){socket=null;clearTimeout(reconnectTimer);reconnectTimer=setTimeout(connect,delay())}
  }
  function init(){connect()}
  document.addEventListener('visibilitychange',function(){if(document.hidden){clearTimeout(reconnectTimer)}else if(!socket)connect()});
  window.addEventListener('online',function(){if(!socket)connect()});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
</script>
`;
