import type { Env } from './types';

export type MinesSoloRuntimeStatus = 'active' | 'collecting' | 'lost' | 'cashed_out';

export type MinesSoloRuntimeSeed = {
  userId: string;
  roundId: string;
  amountNano: number;
  mineCount: number;
  boardSize: number;
  mines: number[];
  revealedCells: number[];
  multipliers: number[];
  status?: 'active' | 'lost' | 'cashed_out';
  payoutNano?: number;
};

export type MinesSoloRuntimeState = {
  userId: string;
  roundId: string;
  amountNano: number;
  mineCount: number;
  boardSize: number;
  status: MinesSoloRuntimeStatus;
  revealedCells: number[];
  revealedCount: number;
  multiplier: number;
  canCollect: boolean;
  cleared: boolean;
  payoutNano: number;
  bombs: number[];
  result?: 'safe' | 'mine';
  selectedCell?: number;
  newReveal?: boolean;
};

type StoredRound = {
  userId: string;
  roundId: string;
  amountNano: number;
  mineCount: number;
  boardSize: number;
  mines: number[];
  revealedCells: number[];
  multipliers: number[];
  status: MinesSoloRuntimeStatus;
  cleared: boolean;
  payoutNano: number;
};

const ROUND_KEY = 'mines:solo:round:v1';

export class MinesSoloRuntimeError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export class MinesSoloRoundRoom {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/init') {
      const body = await request.json().catch(() => null) as MinesSoloRuntimeSeed | null;
      const next = normalizeSeed(body);
      if (!next) return Response.json({ error: 'Invalid Mines round state' }, { status: 400 });
      const current = await this.state.storage.get<StoredRound>(ROUND_KEY).catch(() => null);
      if (current?.roundId === next.roundId && current.userId === next.userId) {
        return Response.json(toRuntimeState(current));
      }
      await this.state.storage.put(ROUND_KEY, next);
      return Response.json(toRuntimeState(next));
    }

    if (request.method === 'POST' && url.pathname === '/state') {
      const current = await this.state.storage.get<StoredRound>(ROUND_KEY).catch(() => null);
      if (!current) return Response.json({ error: 'Round not found' }, { status: 404 });
      return Response.json(toRuntimeState(current));
    }

    if (request.method === 'POST' && url.pathname === '/reveal') {
      const body = await request.json().catch(() => null) as { roundId?: unknown; cell?: unknown } | null;
      const roundId = cleanId(body?.roundId);
      const cell = Math.floor(Number(body?.cell));
      if (!roundId || !Number.isInteger(cell) || cell < 0 || cell >= 25) {
        return Response.json({ error: 'Invalid cell' }, { status: 400 });
      }
      const current = await this.state.storage.get<StoredRound>(ROUND_KEY).catch(() => null);
      if (!current || current.roundId !== roundId) return Response.json({ error: 'Round not found' }, { status: 404 });
      if (current.status !== 'active' || current.cleared) {
        return Response.json({ ...toRuntimeState(current), newReveal: false });
      }
      if (current.revealedCells.includes(cell)) {
        return Response.json({ ...toRuntimeState(current), result: 'safe', selectedCell: cell, newReveal: false });
      }

      if (current.mines.includes(cell)) {
        current.status = 'lost';
        current.cleared = false;
        current.payoutNano = 0;
        await this.state.storage.put(ROUND_KEY, current);
        this.state.waitUntil(this.persistLoss(current));
        return Response.json({ ...toRuntimeState(current), result: 'mine', selectedCell: cell, newReveal: true });
      }

      current.revealedCells = [...current.revealedCells, cell].sort((a, b) => a - b);
      current.cleared = current.revealedCells.length >= current.boardSize - current.mineCount;
      await this.state.storage.put(ROUND_KEY, current);
      return Response.json({ ...toRuntimeState(current), result: 'safe', selectedCell: cell, newReveal: true });
    }

    if (request.method === 'POST' && url.pathname === '/reserve-collect') {
      const body = await request.json().catch(() => null) as { roundId?: unknown; minSafePicks?: unknown } | null;
      const roundId = cleanId(body?.roundId);
      const minSafePicks = Math.max(1, Math.floor(Number(body?.minSafePicks) || 1));
      const current = await this.state.storage.get<StoredRound>(ROUND_KEY).catch(() => null);
      if (!current || current.roundId !== roundId) return Response.json({ error: 'Round not found' }, { status: 404 });
      if (current.status === 'lost') return Response.json({ error: 'Round already ended' }, { status: 409 });
      if (current.status === 'cashed_out') return Response.json(toRuntimeState(current));
      if (current.status === 'collecting') return Response.json({ error: 'Collect already in progress' }, { status: 409 });
      if (current.revealedCells.length < minSafePicks) {
        return Response.json({ error: 'Open more safe tiles before collecting' }, { status: 409 });
      }
      current.status = 'collecting';
      await this.state.storage.put(ROUND_KEY, current);
      return Response.json(toRuntimeState(current));
    }

    if (request.method === 'POST' && url.pathname === '/rollback-collect') {
      const body = await request.json().catch(() => null) as { roundId?: unknown } | null;
      const roundId = cleanId(body?.roundId);
      const current = await this.state.storage.get<StoredRound>(ROUND_KEY).catch(() => null);
      if (!current || current.roundId !== roundId) return Response.json({ error: 'Round not found' }, { status: 404 });
      if (current.status === 'collecting') {
        current.status = 'active';
        await this.state.storage.put(ROUND_KEY, current);
      }
      return Response.json(toRuntimeState(current));
    }

    if (request.method === 'POST' && url.pathname === '/finish') {
      const body = await request.json().catch(() => null) as { roundId?: unknown; status?: unknown; payoutNano?: unknown } | null;
      const roundId = cleanId(body?.roundId);
      const status = body?.status === 'lost' ? 'lost' : body?.status === 'cashed_out' ? 'cashed_out' : null;
      const current = await this.state.storage.get<StoredRound>(ROUND_KEY).catch(() => null);
      if (!current || current.roundId !== roundId) return Response.json({ error: 'Round not found' }, { status: 404 });
      if (!status) return Response.json({ error: 'Invalid round status' }, { status: 400 });
      current.status = status;
      current.cleared = status === 'cashed_out' ? current.cleared : false;
      current.payoutNano = status === 'cashed_out' ? Math.max(0, Math.floor(Number(body?.payoutNano) || 0)) : 0;
      await this.state.storage.put(ROUND_KEY, current);
      return Response.json(toRuntimeState(current));
    }

    return new Response('Not found', { status: 404 });
  }

  private async persistLoss(round: StoredRound): Promise<void> {
    try {
      await this.env.DB.prepare(`UPDATE mines_solo_rounds
        SET status='lost', revealed_cells_json=?, multiplier=?, payout_nano=0, updated_at=CURRENT_TIMESTAMP
        WHERE user_id=? AND round_id=? AND status='active'`)
        .bind(JSON.stringify(round.revealedCells), currentMultiplier(round), round.userId, round.roundId)
        .run();
    } catch (error) {
      console.warn('Mines loss persistence failed', error);
    }
  }
}

export async function initMinesSoloRuntime(env: Env, seed: MinesSoloRuntimeSeed): Promise<MinesSoloRuntimeState> {
  return runtimeRequest(env, seed.userId, '/init', seed);
}

export async function getMinesSoloRuntime(env: Env, userId: string): Promise<MinesSoloRuntimeState> {
  return runtimeRequest(env, userId, '/state', {});
}

export async function revealMinesSoloRuntime(env: Env, userId: string, roundId: string, cell: number): Promise<MinesSoloRuntimeState> {
  return runtimeRequest(env, userId, '/reveal', { roundId, cell });
}

export async function reserveMinesSoloCollect(env: Env, userId: string, roundId: string, minSafePicks: number): Promise<MinesSoloRuntimeState> {
  return runtimeRequest(env, userId, '/reserve-collect', { roundId, minSafePicks });
}

export async function rollbackMinesSoloCollect(env: Env, userId: string, roundId: string): Promise<void> {
  await runtimeRequest(env, userId, '/rollback-collect', { roundId });
}

export async function finishMinesSoloRuntime(env: Env, userId: string, roundId: string, status: 'lost' | 'cashed_out', payoutNano = 0): Promise<MinesSoloRuntimeState> {
  return runtimeRequest(env, userId, '/finish', { roundId, status, payoutNano });
}

async function runtimeRequest(env: Env, userId: string, path: string, body: unknown): Promise<MinesSoloRuntimeState> {
  const id = env.MINES_SOLO_ROUND.idFromName(userId);
  const response = await env.MINES_SOLO_ROUND.get(id).fetch(`https://mines-solo${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({ error: 'Invalid Mines runtime response' })) as MinesSoloRuntimeState & { error?: string };
  if (!response.ok) throw new MinesSoloRuntimeError(String(data.error || 'Mines runtime failed'), response.status);
  return data;
}

function normalizeSeed(seed: MinesSoloRuntimeSeed | null): StoredRound | null {
  if (!seed) return null;
  const userId = cleanId(seed.userId);
  const roundId = cleanId(seed.roundId);
  const boardSize = Math.floor(Number(seed.boardSize));
  const mineCount = Math.floor(Number(seed.mineCount));
  const amountNano = Math.floor(Number(seed.amountNano));
  if (!userId || !roundId || boardSize !== 25 || ![3, 5, 7, 10].includes(mineCount) || !Number.isSafeInteger(amountNano) || amountNano <= 0) return null;
  const mines = cleanCells(seed.mines, boardSize);
  const revealedCells = cleanCells(seed.revealedCells, boardSize).filter((cell) => !mines.includes(cell));
  const multipliers = Array.isArray(seed.multipliers)
    ? seed.multipliers.slice(0, boardSize - mineCount).map(Number).filter((value) => Number.isFinite(value) && value >= 1)
    : [];
  if (mines.length !== mineCount || multipliers.length !== boardSize - mineCount) return null;
  const status: MinesSoloRuntimeStatus = seed.status === 'lost' ? 'lost' : seed.status === 'cashed_out' ? 'cashed_out' : 'active';
  return {
    userId,
    roundId,
    amountNano,
    mineCount,
    boardSize,
    mines,
    revealedCells,
    multipliers,
    status,
    cleared: status !== 'lost' && revealedCells.length >= boardSize - mineCount,
    payoutNano: status === 'cashed_out' ? Math.max(0, Math.floor(Number(seed.payoutNano) || 0)) : 0,
  };
}

function toRuntimeState(round: StoredRound): MinesSoloRuntimeState {
  const terminal = round.status === 'lost' || round.status === 'cashed_out';
  return {
    userId: round.userId,
    roundId: round.roundId,
    amountNano: round.amountNano,
    mineCount: round.mineCount,
    boardSize: round.boardSize,
    status: round.status,
    revealedCells: round.revealedCells.slice(),
    revealedCount: round.revealedCells.length,
    multiplier: currentMultiplier(round),
    canCollect: round.status === 'active' && round.revealedCells.length >= (round.mineCount <= 5 ? 2 : 1),
    cleared: round.cleared,
    payoutNano: round.payoutNano,
    bombs: terminal ? round.mines.slice() : [],
  };
}

function currentMultiplier(round: StoredRound): number {
  if (!round.revealedCells.length) return 1;
  const value = Number(round.multipliers[round.revealedCells.length - 1]);
  return Number.isFinite(value) && value >= 1 ? value : 1;
}

function cleanCells(value: unknown, boardSize: number): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(Number).filter((cell) => Number.isInteger(cell) && cell >= 0 && cell < boardSize))).sort((a, b) => a - b);
}

function cleanId(value: unknown): string {
  return String(value ?? '').replace(/[^0-9A-Za-z_-]/g, '').slice(0, 96);
}
