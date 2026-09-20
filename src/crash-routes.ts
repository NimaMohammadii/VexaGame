import app from './index';
import type { Env } from './types';
import { ensureDailyWheelSchema } from './daily-wheel-rewards';
import { getGhostRunVirtualUsers } from './ghost-run-virtual-users-config';
import { buildCrashVirtualLiveBets, type CrashRoundSnapshot } from './crash-virtual-users';
import {
  cleanCrashAutoCashout,
  ensureCrashFinanceSchema,
  settleCrashCashoutAtomic,
  type CrashBetRow,
} from './crash-finance';
import { addUserXp, getUserLevel } from './levels';
import { gameBotToken, validateTelegramInitData } from './utils';

const CACHE_NONE = 'no-store';
const NANO = 1000000000;
const MIN_BET_NANO = 10000000;
const MAX_BET_NANO = Math.floor(Number.MAX_SAFE_INTEGER / 50);
const REVEAL_END_BEFORE_START_MS = 180;
const CRASH_ROOM_NAME = 'global';

app.get('/app/api/ghost-run-virtual-users', async (c) => {
  const [virtualConfig, realUsers] = await Promise.all([
    getGhostRunVirtualUsers(c.env),
    getGhostRunRealUsers(c.env.DB).catch((error) => { console.warn('load ghost run real users failed', error); return []; }),
  ]);
  const seen = new Set<string>();
  const users = [...realUsers, ...virtualConfig.users].filter((user) => {
    const key = String(user.name || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return c.json({ ...virtualConfig, users }, 200, {'cache-control': CACHE_NONE});
});

async function getGhostRunRealUsers(db:D1Database){
  const rows = await db.prepare(`SELECT first_name, username
    FROM app_users
    WHERE current_section = 'ghostrun'
      AND datetime(COALESCE(last_seen_at, updated_at, created_at)) >= datetime('now', '-10 minutes')
    ORDER BY datetime(COALESCE(last_seen_at, updated_at, created_at)) DESC
    LIMIT 12`).all<{first_name:string|null;username:string|null}>();
  return (rows.results || []).map((row, index) => {
    const username = String(row.username || '').replace(/^@+/, '').trim();
    const firstName = String(row.first_name || '').trim();
    return {
      name: firstName || (username ? '@' + username : 'Live Player'),
      bets: [{ amount: Number((0.12 + ((index * 7) % 28) / 10).toFixed(2)), cashoutMultiplier: Number((1.22 + ((index * 11) % 95) / 100).toFixed(2)) }],
      real: true,
    };
  });
}

type Row = CrashBetRow;
type CrashAuthorization = { ok:boolean; roundId:number; multiplier?:number; mode?:'manual'|'auto' };

app.get('/app/api/crash-live', async (c) => {
  try{
    await validateTelegramInitData(c.req.header('x-telegram-init-data') || '', gameBotToken(c.env));
  }catch(error){
    return c.json({ok:false,error:error instanceof Error?error.message:'Telegram authentication failed'},401,{'cache-control':CACHE_NONE});
  }
  await ensure(c.env);
  try{
    const state = await readCrashState(c.env);
    const roundId = state.roundId;
    const now = Date.now();
    const revealStart = Math.max(0, Number(state.bettingStartedAt)||now);
    const revealEnd = Math.max(revealStart, (Number(state.runningStartedAt)||revealStart) - REVEAL_END_BEFORE_START_MS);
    const [realRows, virtualRows] = await Promise.all([
      readRealLiveRows(c.env.DB, roundId),
      buildCrashVirtualLiveBets(c.env, roundId, state, revealStart, revealEnd, now),
    ]);
    const bets = [...realRows, ...virtualRows]
      .map(json)
      .sort((a,b)=>Number(b.amountNano||0)-Number(a.amountNano||0) || Number(a.virtualOrder||0)-Number(b.virtualOrder||0))
      .slice(0,120);
    const totalNano = bets
      .filter((bet)=>!bet.isVirtual || !bet.virtualRevealAtMs || Number(bet.virtualRevealAtMs)<=now)
      .reduce((sum,bet)=>sum+Number(bet.amountNano||0),0);
    return c.json({ok:true,roundId,totalNano,totalTon:ton(totalNano),state,bets},200,{'cache-control':CACHE_NONE});
  }catch(error){
    return c.json({ok:false,error:error instanceof Error?error.message:'Crash state unavailable'},503,{'cache-control':CACHE_NONE});
  }
});

app.post('/app/api/crash-live/bet', async (c) => {
  const receivedAt = Date.now();
  await ensure(c.env);
  const body = await c.req.json().catch(()=>({})) as Record<string,unknown>;
  let auth:{userId:string;username:string};
  try{auth=await authenticatedCrashUser(c.env,body)}catch(error){return c.json({ok:false,error:error instanceof Error?error.message:'Telegram authentication failed'},401,{'cache-control':CACHE_NONE})}
  const {userId,username}=auth;
  let roundId=0,requestedAmountNano=0,requestedAutoCashout:number|null=null;
  try{
    roundId=rid(body.roundId);
    requestedAmountNano=amt(body.amountNano);
    requestedAutoCashout=cleanCrashAutoCashout(body.autoCashoutMultiplier);
  }catch(error){
    return c.json({ok:false,error:error instanceof Error?error.message:'Invalid Crash bet'},400,{'cache-control':CACHE_NONE});
  }

  const authorization = await authorizeCrashAction(c.env,'bet',roundId,receivedAt,null).catch(()=>null);
  if(!authorization?.ok){
    return c.json({ok:false,error:'Betting window is closed'},409,{'cache-control':CACHE_NONE});
  }

  let existing = await c.env.DB.prepare('SELECT * FROM crash_live_bets WHERE round_id=? AND user_id=? AND is_virtual=0').bind(roundId,userId).first<Row>();
  if(existing?.status==='cancelled'){
    const referenceId=`crash:${roundId}:${userId}`;
    await c.env.DB.prepare("DELETE FROM crash_live_bets WHERE round_id=? AND user_id=? AND is_virtual=0 AND status='cancelled' AND NOT EXISTS(SELECT 1 FROM ton_transactions WHERE user_id=? AND reference_type='crash' AND reference_id=? AND amount_nano<0)")
      .bind(roundId,userId,userId,referenceId).run();
    existing=await c.env.DB.prepare('SELECT * FROM crash_live_bets WHERE round_id=? AND user_id=? AND is_virtual=0').bind(roundId,userId).first<Row>();
  }
  if(existing && existing.status!=='bet'){
    const state=await readCrashResponseState(c.env,userId);
    return c.json({ok:true,roundId,duplicate:true,tonBalanceNano:state.tonBalanceNano,level:state.level},200,{'cache-control':CACHE_NONE});
  }

  const amountNano=existing?.status==='bet'?amt(existing.amount_nano):requestedAmountNano;
  const autoCashoutMultiplier=existing?.status==='bet'?storedAutoCashout(existing.auto_cashout_multiplier):requestedAutoCashout;
  let placed:{duplicate:boolean;row:Row};
  try{
    placed=await placeCrashBetAtomic(c.env,userId,username,roundId,amountNano,autoCashoutMultiplier,Boolean(existing));
  }catch(error){
    const balance=await readCrashBalanceNano(c.env,userId);
    return c.json({ok:false,error:error instanceof Error?error.message:'Bet failed',tonBalanceNano:balance},400,{'cache-control':CACHE_NONE});
  }

  const xpProfile=await addUserXp(c.env,userId,2,'game-start',{section:'crash',event:'place-bet',roundId},`crash_bet_${roundId}_${userId}`)
    .then((result)=>result.profile)
    .catch((error)=>{console.warn('Crash bet XP award failed',error);return null;});
  const responseState=await readCrashResponseState(c.env,userId,xpProfile);
  if(!placed.duplicate) publishCrashLiveEvent(c.env,placed.row).catch((error)=>console.warn('Crash bet live publish failed',error));
  return c.json({
    ok:true,
    roundId,
    duplicate:placed.duplicate,
    autoCashoutMultiplier:storedAutoCashout(placed.row.auto_cashout_multiplier),
    tonBalanceNano:responseState.tonBalanceNano,
    level:responseState.level,
  },200,{'cache-control':CACHE_NONE});
});

app.post('/app/api/crash-live/cashout', async (c) => {
  const receivedAt = Date.now();
  await ensure(c.env);
  const body = await c.req.json().catch(()=>({})) as Record<string,unknown>;
  let auth:{userId:string;username:string};
  try{auth=await authenticatedCrashUser(c.env,body)}catch(error){return c.json({ok:false,error:error instanceof Error?error.message:'Telegram authentication failed'},401,{'cache-control':CACHE_NONE})}
  const userId=auth.userId;
  let roundId=0;
  try{roundId=rid(body.roundId)}catch(error){return c.json({ok:false,error:error instanceof Error?error.message:'Round is not ready'},400,{'cache-control':CACHE_NONE})}
  const row = await c.env.DB.prepare('SELECT * FROM crash_live_bets WHERE round_id=? AND user_id=? AND is_virtual=0').bind(roundId,userId).first<Row>();
  if(!row)return c.json({ok:false,error:'Bet not found'},404,{'cache-control':CACHE_NONE});
  if(!['bet','crashed','cashout_pending','cashout'].includes(row.status))return c.json({ok:false,error:'Bet is already settled'},409,{'cache-control':CACHE_NONE});

  const betReferenceId=`crash:${roundId}:${userId}`;
  const stakeLedger=await c.env.DB.prepare("SELECT id FROM ton_transactions WHERE user_id=? AND reference_type='crash' AND reference_id=? AND amount_nano<0 LIMIT 1")
    .bind(userId,betReferenceId).first<{id:string}>();
  if(!stakeLedger){
    const cashoutReferenceId=`crash:${roundId}:${userId}:cashout`;
    const existingPayout=row.status==='cashout'
      ? await c.env.DB.prepare("SELECT id FROM ton_transactions WHERE user_id=? AND reference_type='crash' AND reference_id=? AND amount_nano>0 LIMIT 1").bind(userId,cashoutReferenceId).first<{id:string}>()
      : null;
    if(!existingPayout){
      await c.env.DB.prepare("UPDATE crash_live_bets SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE round_id=? AND user_id=? AND is_virtual=0 AND status IN ('bet','crashed','cashout_pending','cashout')")
        .bind(roundId,userId).run().catch(()=>undefined);
      const balance=await readCrashBalanceNano(c.env,userId);
      return c.json({ok:false,error:'Bet funding is missing',tonBalanceNano:balance},409,{'cache-control':CACHE_NONE});
    }
  }

  let cashoutMultiplier = Number(row.cashout_multiplier);
  let payout = Math.max(0,Math.floor(Number(row.payout_nano)||0));
  const duplicate = row.status==='cashout_pending'||row.status==='cashout';

  if(row.status==='bet'||row.status==='crashed'){
    const autoCashoutMultiplier=storedAutoCashout(row.auto_cashout_multiplier);
    const authorization = await authorizeCrashAction(c.env,'cashout',roundId,receivedAt,autoCashoutMultiplier).catch(()=>null);
    if(!authorization?.ok||!Number.isFinite(Number(authorization.multiplier))){
      return c.json({ok:false,error:'Cashout window is closed'},409,{'cache-control':CACHE_NONE});
    }
    cashoutMultiplier=Math.max(1,Number(authorization.multiplier));
    payout=Math.max(0,Math.floor(Number(row.amount_nano||0)*cashoutMultiplier));
  }

  if(!Number.isFinite(cashoutMultiplier)||cashoutMultiplier<1||payout<=0){
    return c.json({ok:false,error:'Invalid locked cashout'},500,{'cache-control':CACHE_NONE});
  }

  let settled:Row;
  try{
    settled=await settleCrashCashoutAtomic(c.env,userId,roundId,cashoutMultiplier,payout);
  }catch(error){
    const balance=await readCrashBalanceNano(c.env,userId);
    return c.json({ok:false,error:error instanceof Error?error.message:'Cashout failed',tonBalanceNano:balance},500,{'cache-control':CACHE_NONE});
  }

  cashoutMultiplier=Math.max(1,Number(settled.cashout_multiplier)||1);
  payout=Math.max(0,Math.floor(Number(settled.payout_nano)||0));
  const xpAmount = cashoutMultiplier>=5?70:(cashoutMultiplier>=2?30:15);
  const xpProfile=await addUserXp(c.env,userId,xpAmount,'game-win',{section:'crash',event:'cashout',roundId,multiplier:cashoutMultiplier,payoutNano:payout},`crash_cashout_${roundId}_${userId}`)
    .then((result)=>result.profile)
    .catch((error)=>{console.warn('Crash cashout XP award failed',error);return null;});
  const responseState=await readCrashResponseState(c.env,userId,xpProfile);
  publishCrashLiveEvent(c.env,settled).catch((error)=>console.warn('Crash cashout live publish failed',error));
  return c.json({
    ok:true,
    roundId,
    duplicate,
    cashoutMultiplier,
    payoutNano:payout,
    payoutTon:ton(payout),
    tonBalanceNano:responseState.tonBalanceNano,
    level:responseState.level,
  },200,{'cache-control':CACHE_NONE});
});

async function placeCrashBetAtomic(
  env:Env,
  userId:string,
  username:string,
  roundId:number,
  amountNano:number,
  autoCashoutMultiplier:number|null,
  wasExisting:boolean,
):Promise<{duplicate:boolean;row:Row}>{
  const referenceId=`crash:${roundId}:${userId}`;
  const transactionId=`crash_bet:${roundId}:${userId}`;
  const requestNonce=crypto.randomUUID();
  const metadataJson=JSON.stringify({section:'crash',roundId,requestedDeltaNano:-amountNano,autoCashoutMultiplier,idempotencyNonce:requestNonce,source:'server'});
  const results=await env.DB.batch([
    env.DB.prepare(`INSERT INTO app_users (telegram_user_id,current_section,ton_balance_nano,last_seen_at,updated_at)
      VALUES (?,'home',0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      ON CONFLICT(telegram_user_id) DO NOTHING`).bind(userId),
    env.DB.prepare(`INSERT OR IGNORE INTO crash_live_bets(round_id,user_id,username,amount_nano,status,cashout_multiplier,auto_cashout_multiplier,payout_nano,is_virtual,created_at,updated_at)
      SELECT ?,?,?,?,'bet',NULL,?,0,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
      FROM app_users u
      WHERE u.telegram_user_id=? AND (
        u.ton_balance_nano>=? OR EXISTS(
          SELECT 1 FROM ton_transactions t
          WHERE t.user_id=? AND t.reference_type='crash' AND t.reference_id=? AND t.amount_nano<0
        )
      )`).bind(roundId,userId,username,amountNano,autoCashoutMultiplier,userId,amountNano,userId,referenceId),
    env.DB.prepare(`INSERT OR IGNORE INTO ton_transactions(
        id,user_id,kind,title,description,amount_nano,balance_after_nano,status,reference_id,reference_type,metadata_json,created_at
      )
      SELECT ?,?,'game','Crash bet',NULL,-?,u.ton_balance_nano-?,'completed',?,'crash',?,CURRENT_TIMESTAMP
      FROM app_users u
      WHERE u.telegram_user_id=? AND u.ton_balance_nano>=?
        AND EXISTS(SELECT 1 FROM crash_live_bets b WHERE b.round_id=? AND b.user_id=? AND b.is_virtual=0 AND b.status='bet')
        AND NOT EXISTS(SELECT 1 FROM ton_transactions t WHERE t.user_id=? AND t.reference_type='crash' AND t.reference_id=? AND t.amount_nano<0)`)
      .bind(transactionId,userId,amountNano,amountNano,referenceId,metadataJson,userId,amountNano,roundId,userId,userId,referenceId),
    env.DB.prepare(`UPDATE app_users
      SET ton_balance_nano=ton_balance_nano-?,bonus_balance_nano=max(0,bonus_balance_nano-?),updated_at=CURRENT_TIMESTAMP
      WHERE telegram_user_id=?
        AND EXISTS(SELECT 1 FROM ton_transactions WHERE id=? AND user_id=? AND metadata_json=?)`)
      .bind(amountNano,amountNano,userId,transactionId,userId,metadataJson),
    env.DB.prepare(`UPDATE crash_live_bets
      SET status='cancelled',updated_at=CURRENT_TIMESTAMP
      WHERE round_id=? AND user_id=? AND is_virtual=0 AND status='bet'
        AND NOT EXISTS(
          SELECT 1 FROM ton_transactions
          WHERE user_id=? AND reference_type='crash' AND reference_id=? AND amount_nano<0
        )`).bind(roundId,userId,userId,referenceId),
    env.DB.prepare(`SELECT b.*,
      CASE WHEN EXISTS(
        SELECT 1 FROM ton_transactions t
        WHERE t.user_id=b.user_id AND t.reference_type='crash'
          AND t.reference_id=('crash:' || b.round_id || ':' || b.user_id) AND t.amount_nano<0
      ) THEN 1 ELSE 0 END AS stake_funded
      FROM crash_live_bets b WHERE b.round_id=? AND b.user_id=? AND b.is_virtual=0`).bind(roundId,userId),
  ]);
  const finalRows=resultRows<Row & {stake_funded?:number}>(results[results.length-1]);
  const row=finalRows[0];
  if(row?.status==='bet'&&Number(row.stake_funded)===1){
    return{duplicate:wasExisting||(results[1]?.meta?.changes||0)<=0,row};
  }
  throw new Error('Insufficient balance');
}

async function readRealLiveRows(db:D1Database, roundId:number): Promise<Row[]>{
  const rows = await db.prepare("SELECT b.* FROM crash_live_bets b WHERE b.round_id=? AND b.is_virtual=0 AND b.status<>'cancelled' AND EXISTS(SELECT 1 FROM ton_transactions t WHERE t.user_id=b.user_id AND t.reference_type='crash' AND t.reference_id=('crash:' || b.round_id || ':' || b.user_id) AND t.amount_nano<0) ORDER BY b.amount_nano DESC, datetime(b.created_at) ASC LIMIT 120").bind(roundId).all<Row>().catch(() => ({ results: [] as Row[] }));
  return rows.results || [];
}

async function ensure(env:Env){
  await Promise.all([ensureCrashFinanceSchema(env),ensureDailyWheelSchema(env)]);
}

async function readCrashState(env:Env):Promise<CrashRoundSnapshot>{
  const id=env.CRASH_LIVE.idFromName(CRASH_ROOM_NAME);
  const response=await env.CRASH_LIVE.get(id).fetch(new Request('https://crash-live/state'));
  const payload=await response.json().catch(()=>null) as {ok?:boolean;state?:CrashRoundSnapshot}|null;
  if(!response.ok||!payload?.ok||!payload.state)throw new Error('Crash round state unavailable');
  return payload.state;
}

async function authorizeCrashAction(
  env:Env,
  action:'bet'|'cashout',
  roundId:number,
  receivedAt:number,
  autoCashoutMultiplier:number|null,
):Promise<CrashAuthorization>{
  const id=env.CRASH_LIVE.idFromName(CRASH_ROOM_NAME);
  const response=await env.CRASH_LIVE.get(id).fetch(new Request(`https://crash-live/authorize-${action}`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({roundId,receivedAt,autoCashoutMultiplier}),
  }));
  const payload=await response.json().catch(()=>null) as CrashAuthorization|null;
  return payload&&typeof payload.ok==='boolean'?payload:{ok:false,roundId};
}

async function publishCrashLiveEvent(env:Env,row:Row):Promise<void>{
  const event=json(row);
  const id=env.CRASH_LIVE.idFromName(CRASH_ROOM_NAME);
  await env.CRASH_LIVE.get(id).fetch(new Request('https://crash-live/publish-live',{
    method:'POST',
    headers:{'content-type':'application/json'},
    body:JSON.stringify({
      roundId:event.roundId,
      userId:event.userId,
      user:event.user,
      amountNano:event.amountNano,
      status:event.status,
      cashoutMultiplier:event.cashoutMultiplier,
      autoCashoutMultiplier:event.autoCashoutMultiplier,
      payoutNano:event.payoutNano,
      isVirtual:false,
      updatedAt:event.updatedAt,
    }),
  }));
}

async function authenticatedCrashUser(env:Env,body:Record<string,unknown>):Promise<{userId:string;username:string}>{
  const initData=String(body.initData||'').trim();
  const claimed=uid(body.userId);
  const verified=await validateTelegramInitData(initData,gameBotToken(env));
  if(verified!==claimed)throw new Error('Telegram user mismatch');
  const params=new URLSearchParams(initData);
  let user:{id?:unknown;first_name?:unknown;last_name?:unknown;username?:unknown}={};
  try{user=JSON.parse(String(params.get('user')||'{}')) as typeof user}catch{throw new Error('Invalid Telegram session')}
  const signedId=String(user.id??'').replace(/[^0-9]/g,'').slice(0,24);
  if(signedId!==verified)throw new Error('Telegram user mismatch');
  const display=name(user.first_name||user.username||user.last_name||verified,verified);
  return{userId:verified,username:display};
}

async function readCrashResponseState(env:Env,userId:string,preferredLevel:unknown=null):Promise<{tonBalanceNano:number|undefined;level:unknown}>{
  const [balance,level]=await Promise.all([
    readCrashBalanceNano(env,userId),
    preferredLevel?Promise.resolve(preferredLevel):getUserLevel(env,userId).catch(()=>null),
  ]);
  return{tonBalanceNano:balance,level:level||undefined};
}

async function readCrashBalanceNano(env:Env,userId:string):Promise<number|undefined>{
  const row=await env.DB.prepare('SELECT ton_balance_nano FROM app_users WHERE telegram_user_id=?').bind(userId).first<{ton_balance_nano:number}>().catch(()=>null);
  const value=Number(row?.ton_balance_nano);
  return Number.isSafeInteger(value)&&value>=0?value:undefined;
}

function json(r:Row){
  return{
    roundId:Number(r.round_id),
    userId:r.user_id,
    user:r.username,
    amountNano:Number(r.amount_nano||0),
    amountTon:ton(r.amount_nano),
    status:r.status,
    cashoutMultiplier:r.cashout_multiplier==null?null:Number(r.cashout_multiplier),
    autoCashoutMultiplier:storedAutoCashout(r.auto_cashout_multiplier),
    targetCashoutMultiplier:r.target_cashout_multiplier==null?null:Number(r.target_cashout_multiplier),
    payoutNano:Number(r.payout_nano||0),
    payoutTon:ton(r.payout_nano),
    isVirtual:Number(r.is_virtual||0)===1,
    virtualRevealAtMs:Number(r.virtual_reveal_at_ms||0),
    virtualOrder:Number(r.virtual_order||0),
    createdAt:r.created_at,
    updatedAt:r.updated_at,
  };
}

function storedAutoCashout(value:unknown):number|null{
  const n=Number(value);
  return Number.isFinite(n)&&n>=1.01&&n<=50?Math.floor(n*100)/100:null;
}
function resultRows<T>(result:D1Result<unknown>|undefined):T[]{
  return Array.isArray(result?.results)?result.results as T[]:[];
}
function rid(value:unknown){
  const n=Math.floor(Number(value));
  if(!Number.isSafeInteger(n)||n<1)throw new Error('Round is not ready');
  return n;
}
function uid(value:unknown){
  const s=String(value||'').trim().slice(0,80);
  if(!s)throw new Error('User is not ready');
  return s;
}
function name(value:unknown,fallback:string){
  let s=String(value||fallback||'User').replace(/[<>]/g,'').trim();
  if(s.startsWith('@'))s=s.slice(1);
  if(s.includes(' '))s=s.split(' ')[0];
  return s.slice(0,80)||'User';
}
function amt(value:unknown){
  const n=Number(value);
  if(!Number.isSafeInteger(n)||n<MIN_BET_NANO||n>MAX_BET_NANO)throw new Error('Invalid Crash bet');
  return n;
}
function ton(value:unknown){
  return (Math.max(0,Math.floor(Number(value)||0))/NANO).toFixed(4).replace(/\.0+$/,'').replace(/(\.\d*?)0+$/,'$1');
}
