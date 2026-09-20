import type { Hono } from 'hono';
import type { Env } from './types';
import { adjustUserTonBalance, debitUserTonBalanceIfEnough, getUserControls } from './user-controls';
import { gameBotToken, validateTelegramInitData } from './utils';
import { completeDailyWheelSpin, createDailyWheelSpin, getDailyWheelState, grantDailyWheelEffect, type DailyWheelSpin } from './daily-wheel-rewards';
import { grantLotteryRewardTickets } from './lottery';

type App = Hono<{ Bindings: Env }>;

const WHEEL_HOUSE_EDGE = 0.96;
const WHEEL_MIN_CHANCE = 4;
const WHEEL_MAX_CHANCE = 96;
const WHEEL_MAX_BET_NANO = Math.floor(Number.MAX_SAFE_INTEGER / 25);

export function registerWheelRoutes(app: App): void {
  app.post('/app/api/wheel/daily/state', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({})) as { userId?: unknown; initData?: unknown };
      const claimedUserId = cleanWheelUserId(body.userId);
      const userId = await validateTelegramInitData(body.initData, gameBotToken(c.env));
      if (userId !== claimedUserId) throw new Error('Telegram user mismatch');
      const admin = isWheelAdmin(c.env, userId);
      let state = await getDailyWheelState(c.env, userId, admin);
      for (const spin of state.pending) await settleDailySpin(c.env, spin).catch((error) => console.warn('Daily wheel pending settlement failed', error));
      state = await getDailyWheelState(c.env, userId, admin);
      const controls = await getUserControls(c.env, userId);
      return c.json({ ok: true, ...state, tonBalanceNano: controls.tonBalanceNano }, 200, { 'cache-control': 'no-store' });
    } catch (error) {
      return c.json({ error: error instanceof Error ? error.message : 'Could not load Daily Wheel' }, 400, { 'cache-control': 'no-store' });
    }
  });

  app.post('/app/api/wheel/daily/spin', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({})) as { userId?: unknown; initData?: unknown };
      const claimedUserId = cleanWheelUserId(body.userId);
      const userId = await validateTelegramInitData(body.initData, gameBotToken(c.env));
      if (userId !== claimedUserId) throw new Error('Telegram user mismatch');
      const controls = await getUserControls(c.env, userId);
      if (controls.banned) throw new Error('Your access to all sections is blocked.');
      if (controls.blockedSections.includes('wheel')) throw new Error('Wheel is blocked for this account.');
      const admin = isWheelAdmin(c.env, userId);
      const spin = await createDailyWheelSpin(c.env, userId, admin);
      let rewardStatus = 'completed';
      await settleDailySpin(c.env, spin).catch((error) => {
        rewardStatus = 'pending';
        console.warn('Daily wheel reward settlement failed', error);
      });
      const state = await getDailyWheelState(c.env, userId, admin);
      const finalControls = await getUserControls(c.env, userId);
      return c.json({ ok: true, spinId: spin.id, prizeKey: spin.prizeKey, prizeLabel: spin.prizeLabel, prizeIndex: spin.prizeIndex, rewardStatus, nextSpinAt: state.nextSpinAt, remainingMs: state.remainingMs, tonBalanceNano: finalControls.tonBalanceNano }, 200, { 'cache-control': 'no-store' });
    } catch (error) {
      const nextSpinAt = error instanceof Error && 'nextSpinAt' in error ? String((error as Error & { nextSpinAt?: string }).nextSpinAt || '') : undefined;
      return c.json({ error: error instanceof Error ? error.message : 'Could not spin Daily Wheel', nextSpinAt }, 400, { 'cache-control': 'no-store' });
    }
  });

  app.post('/app/api/wheel/spin', async (c) => {
    let userId = '';
    let amountNano = 0;
    let spinId = '';
    let debited = false;
    let settled = false;

    try {
      const body = await c.req.json().catch(() => ({})) as {
        userId?: unknown;
        initData?: unknown;
        amountNano?: unknown;
        chance?: unknown;
      };

      const claimedUserId = cleanWheelUserId(body.userId);
      userId = await validateTelegramInitData(body.initData, gameBotToken(c.env));
      if (userId !== claimedUserId) throw new Error('Telegram user mismatch');
      amountNano = cleanWheelAmount(body.amountNano);
      const chance = cleanWheelChance(body.chance);
      const multiplier = wheelMultiplier(chance);
      const controls = await getUserControls(c.env, userId);
      spinId = 'wheel_' + crypto.randomUUID().replace(/-/g, '').slice(0, 24);

      if (controls.banned) throw new Error('Your access to all sections is blocked.');
      if (controls.blockedSections.includes('wheel')) throw new Error('Wheel is blocked for this account.');

      const afterBet = await debitUserTonBalanceIfEnough(c.env, userId, amountNano, {
        kind: 'game',
        title: 'Wheel bet',
        referenceType: 'wheel_spin',
        referenceId: `${spinId}:bet`,
        metadata: { section: 'wheel', spinId, chance, multiplier },
      });
      debited = true;

      const win = secureRandomUnit() * 100 < chance;
      const targetAngleDeg = pickWheelTargetAngle(win, chance);
      let payoutNano = 0;
      let finalControls = afterBet;

      if (win) {
        payoutNano = Math.floor(amountNano * multiplier);
        finalControls = await adjustUserTonBalance(c.env, userId, payoutNano, {
          kind: 'game',
          title: 'Wheel reward',
          referenceType: 'wheel_spin',
          referenceId: `${spinId}:reward`,
          metadata: { section: 'wheel', spinId, chance, multiplier, result: 'win' },
        });
      }

      settled = true;
      return c.json({
        ok: true,
        spinId,
        win,
        chance,
        targetAngleDeg,
        multiplier,
        payoutNano,
        tonBalanceNano: finalControls.tonBalanceNano,
      }, 200, { 'cache-control': 'no-store' });
    } catch (error) {
      if (debited && !settled && userId && amountNano > 0 && spinId) {
        await adjustUserTonBalance(c.env, userId, amountNano, {
          kind: 'adjustment',
          title: 'Wheel spin refund',
          referenceType: 'wheel_spin',
          referenceId: `${spinId}:refund`,
          metadata: { section: 'wheel', spinId, reason: 'spin-failed' },
        }).catch(() => undefined);
      }
      return c.json(
        { error: error instanceof Error ? error.message : 'Could not spin wheel' },
        400,
        { 'cache-control': 'no-store' },
      );
    }
  });
}

async function settleDailySpin(env: Env, spin: DailyWheelSpin): Promise<void> {
  if (spin.prizeKey === 'gram_4' || spin.prizeKey === 'gram_05' || spin.prizeKey === 'gram_01') {
    const amountNano = spin.prizeKey === 'gram_4' ? 4_000_000_000 : spin.prizeKey === 'gram_05' ? 500_000_000 : 100_000_000;
    await adjustUserTonBalance(env, spin.userId, amountNano, {
      kind: 'adjustment',
      title: 'Daily Wheel reward',
      referenceType: 'daily_wheel',
      referenceId: spin.id,
      metadata: { section: 'wheel', feature: 'daily', prizeKey: spin.prizeKey },
    });
  } else if (spin.prizeKey === 'lottery_5') {
    await grantLotteryRewardTickets(env, spin.userId, 5, 'daily_wheel_' + spin.id);
  } else {
    await grantDailyWheelEffect(env, spin);
  }
  await completeDailyWheelSpin(env, spin.id);
}

function isWheelAdmin(env: Env, userId: string): boolean {
  return String(env.BOT_ADMIN || '').split(/[\s,;|]+/).map((value) => value.trim()).filter(Boolean).includes(userId);
}

function cleanWheelUserId(value: unknown): string {
  const userId = String(value ?? '').replace(/[^0-9A-Za-z_-]/g, '').trim().slice(0, 80);
  if (!userId) throw new Error('Missing user id');
  return userId;
}

function cleanWheelAmount(value: unknown): number {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > WHEEL_MAX_BET_NANO) throw new Error('Invalid wheel bet');
  return amount;
}

function cleanWheelChance(value: unknown): number {
  const chance = Math.round(Number(value));
  if (!Number.isFinite(chance) || chance < WHEEL_MIN_CHANCE || chance > WHEEL_MAX_CHANCE) throw new Error('Invalid win chance');
  return chance;
}

function wheelMultiplier(chance: number): number {
  return Math.max(1.01, Math.floor((100 / chance) * WHEEL_HOUSE_EDGE * 100) / 100);
}

function secureRandomUnit(): number {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 4294967296;
}

function pickWheelTargetAngle(win: boolean, chance: number): number {
  const winArc = chance * 3.6;
  const start = win ? 0 : winArc;
  const end = win ? winArc : 360;
  const arc = Math.max(0.01, end - start);
  const margin = Math.min(6, Math.max(1.25, arc * 0.08));
  const safeStart = start + margin;
  const safeEnd = end - margin;
  if (safeEnd <= safeStart) return start + arc / 2;
  return safeStart + secureRandomUnit() * (safeEnd - safeStart);
}
