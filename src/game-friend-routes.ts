import type { Hono } from 'hono';
import type { Env } from './types';
import { applyGameTonBalanceDelta, debitUserTonBalanceIfEnough, getUserControls } from './user-controls';
import { gameBotToken, id, rateLimit, validateTelegramInitData } from './utils';
import {
  MinesSoloRuntimeError,
  finishMinesSoloRuntime,
  getMinesSoloRuntime,
  initMinesSoloRuntime,
  reserveMinesSoloCollect,
  revealMinesSoloRuntime,
  rollbackMinesSoloCollect,
  type MinesSoloRuntimeState,
} from './mines-solo-runtime';

type App = Hono<{ Bindings: Env }>;
type MineRoom = { id:string; host_user_id:string; host_name:string|null; guest_user_id:string|null; guest_name:string|null; status:string; current_turn_user_id:string|null; hidden_cells_json:string; revealed_cells_json:string; mine_count:number; board_size:number; round_index:number; finished_reason:string|null; host_ready:number|null; guest_ready:number|null; host_has_points:number|null; guest_has_points:number|null; host_funded:number|null; guest_funded:number|null; settled:number|null; amount_nano:number|null; created_at:string; updated_at:string; expires_at:string };
type SoloMineRound = { user_id:string; round_id:string; status:string; amount_nano:number; mine_count:number; board_size:number; mine_cells_json:string; revealed_cells_json:string; multiplier:number; payout_nano:number; created_at:string; updated_at:string };

const SOLO_RTP = 0.92;
const SOLO_MINE_COUNTS = new Set([3, 5, 7, 10]);
const SOLO_MULTIPLIER_CURVES:Record<number,readonly number[]> = {
  3:[1.05,1.09,1.15,1.22,1.37],
  5:[1.15,1.21,1.36,1.45],
  7:[1.28,1.49,1.89,2.30,2.77,3.80],
  10:[1.35,1.50,1.70,1.95,2.30,2.75,3.35,4.15,5.25,6.80,9.20,13.00,20.00,38.00,95.00],
};
let minesTablesReady: Promise<void> | null = null;

export function registerFriendGameRoutes(app: App): void {
  app.post('/app/api/mines/solo/state', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
      const userId = await soloUser(c.env, body.initData);
      const accessControls = await assertMinesAccess(c.env, userId);
      await ensureTables(c.env);
      let round = await soloRound(c.env, userId);
      if (!round) return c.json({ ok: true, active: false });
      let controls = accessControls;
      if (round.status === 'pending') {
        const activated = await activateSoloRound(c.env, round);
        round = activated.round;
        controls = activated.controls;
      } else if (round.status === 'cashed_out') {
        controls = await settleSoloPayout(c.env, round);
        await finishMinesSoloRuntime(c.env, userId, round.round_id, 'cashed_out', Number(round.payout_nano)||0).catch(()=>undefined);
      } else if (round.status === 'lost') {
        await finishMinesSoloRuntime(c.env, userId, round.round_id, 'lost').catch(()=>undefined);
      }
      if (round.status !== 'active') return c.json({ ok: true, active: false, tonBalanceNano: controls.tonBalanceNano });

      const runtime = await runtimeForRound(c.env, userId, round);
      if (runtime.status === 'lost') {
        await persistSoloRuntimeLoss(c.env, runtime);
        return c.json(soloRuntimeState(runtime, controls.tonBalanceNano));
      }
      if (runtime.status === 'collecting' || runtime.status === 'cashed_out') {
        const settled = await settleSoloRuntimeCollect(c.env, runtime);
        return c.json(soloState(settled.round, settled.controls.tonBalanceNano));
      }
      return c.json(soloRuntimeState(runtime, controls.tonBalanceNano));
    } catch (e) { return fail(c, e, 'Could not restore Mines round.'); }
  });

  app.post('/app/api/mines/solo/start', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
      const userId = await soloUser(c.env, body.initData);
      const accessControls = await assertMinesAccess(c.env, userId);
      const mineCount = soloMineCount(body.mineCount);
      if (!mineCount) return c.json({ error: 'Invalid mine count' }, 400);
      const amountNano = soloAmount(body.amountNano, mineCount);
      if (!amountNano) return c.json({ error: 'Invalid point amount' }, 400);
      await ensureTables(c.env);

      let current = await soloRound(c.env, userId);
      if (current?.status === 'pending') {
        const activated = await activateSoloRound(c.env, current);
        current = activated.round;
      }
      if (current?.status === 'active') {
        const runtime = await runtimeForRound(c.env, userId, current);
        if (runtime.status === 'lost') {
          await persistSoloRuntimeLoss(c.env, runtime);
          current = await soloRound(c.env, userId);
        } else if (runtime.status === 'collecting' || runtime.status === 'cashed_out') {
          const settled = await settleSoloRuntimeCollect(c.env, runtime);
          current = settled.round;
        } else {
          const controls = await getUserControls(c.env, userId);
          return c.json({ ...soloRuntimeState(runtime, controls.tonBalanceNano), started: false });
        }
      }
      if (current?.status === 'cashed_out') await settleSoloPayout(c.env, current);

      const roundId = id('mines_solo');
      const mineCells = secureHiddenCells(25, mineCount);
      await c.env.DB.prepare(`INSERT INTO mines_solo_rounds (
        user_id, round_id, status, amount_nano, mine_count, board_size, mine_cells_json,
        revealed_cells_json, multiplier, payout_nano, created_at, updated_at
      ) VALUES (?, ?, 'pending', ?, ?, 25, ?, '[]', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        round_id=excluded.round_id,
        status='pending',
        amount_nano=excluded.amount_nano,
        mine_count=excluded.mine_count,
        board_size=25,
        mine_cells_json=excluded.mine_cells_json,
        revealed_cells_json='[]',
        multiplier=1,
        payout_nano=0,
        created_at=CURRENT_TIMESTAMP,
        updated_at=CURRENT_TIMESTAMP
      WHERE mines_solo_rounds.status NOT IN ('pending','active')`)
        .bind(userId, roundId, amountNano, mineCount, JSON.stringify(mineCells)).run();

      current = await soloRound(c.env, userId);
      if (!current) throw new Error('Could not create Mines round');
      const createdHere = current.round_id === roundId;
      let controls = accessControls;
      if (current.status === 'pending') {
        const activated = await activateSoloRound(c.env, current);
        current = activated.round;
        controls = activated.controls;
      } else {
        controls = await getUserControls(c.env, userId);
      }
      if (current.status !== 'active') throw new Error('Could not activate Mines round');
      const runtime = await runtimeForRound(c.env, userId, current);
      return c.json({ ...soloRuntimeState(runtime, controls.tonBalanceNano), started: createdHere });
    } catch (e) { return fail(c, e, 'Could not start Mines round.'); }
  });

  app.post('/app/api/mines/solo/reveal', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
      const userId = await soloUser(c.env, body.initData);
      const roundId = clean(body.roundId, 'Round not found');
      const cell = clampInt(body.cell, 0, 24, -1);
      if (cell < 0) return c.json({ error: 'Invalid cell' }, 400);

      let runtime: MinesSoloRuntimeState;
      try {
        runtime = await revealMinesSoloRuntime(c.env, userId, roundId, cell);
      } catch (error) {
        if (!runtimeMissing(error)) throw error;
        await hydrateSoloRuntime(c.env, userId, roundId);
        runtime = await revealMinesSoloRuntime(c.env, userId, roundId, cell);
      }

      if (runtime.cleared && runtime.status === 'active' && runtime.newReveal !== false) {
        const reserved = await reserveMinesSoloCollect(c.env, userId, roundId, minSafePicksForCollect(runtime.mineCount));
        const settled = await settleSoloRuntimeCollect(c.env, reserved);
        return c.json({ ...soloState(settled.round, settled.controls.tonBalanceNano), result: 'safe', selectedCell: cell, newReveal: true });
      }
      return c.json(soloRuntimeState(runtime));
    } catch (e) { return fail(c, e, 'Could not select tile.'); }
  });

  app.post('/app/api/mines/solo/collect', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
      const userId = await soloUser(c.env, body.initData);
      const roundId = clean(body.roundId, 'Round not found');
      let runtime: MinesSoloRuntimeState;
      try {
        runtime = await reserveMinesSoloCollect(c.env, userId, roundId, 1);
      } catch (error) {
        if (!runtimeMissing(error)) throw error;
        const hydrated = await hydrateSoloRuntime(c.env, userId, roundId);
        runtime = await reserveMinesSoloCollect(c.env, userId, roundId, minSafePicksForCollect(hydrated.mineCount));
      }
      if (runtime.revealedCount < minSafePicksForCollect(runtime.mineCount)) {
        if (runtime.status === 'collecting') await rollbackMinesSoloCollect(c.env, userId, roundId).catch(()=>undefined);
        return c.json({ error: 'Open more safe tiles before collecting' }, 409);
      }
      const settled = await settleSoloRuntimeCollect(c.env, runtime);
      return c.json(soloState(settled.round, settled.controls.tonBalanceNano));
    } catch (e) { return fail(c, e, 'Could not collect Mines reward.'); }
  });

  app.post('/app/api/mines/friend/rooms', async (c) => {
    try {
      const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
      const userId = await friendUser(c, body.userId);
      if (!(await limited(c.env,`mines-room:${userId}`))) return c.json({ error:'Too many friend rooms. Try again later.' },429);
      await ensureTables(c.env);
      const mineCount=soloMineCount(body.mineCount),amount=friendAmount(body.amountNano);
      if(!mineCount)return c.json({error:'Invalid mine count'},400);
      if(!amount)return c.json({error:'Invalid point amount'},400);
      const roomId=id('mines');
      await c.env.DB.prepare("INSERT INTO mines_friend_rooms (id,host_user_id,host_name,status,current_turn_user_id,hidden_cells_json,revealed_cells_json,mine_count,board_size,amount_nano,host_ready,guest_ready,host_has_points,guest_has_points,host_funded,guest_funded,settled,expires_at) VALUES (?,?,?,'waiting',?,?,'[]',?,25,?,0,0,NULL,NULL,0,0,0,?)")
        .bind(roomId,userId,name(body.name,'Host'),userId,JSON.stringify(secureHiddenCells(25,mineCount)),mineCount,amount,new Date(Date.now()+86400000).toISOString()).run();
      return c.json(await minesState(c.env,roomId,userId));
    } catch (e) { return fail(c,e,'Could not create Mines friend room.'); }
  });

  app.post('/app/api/mines/friend/rooms/:roomId/share', async (c) => {
    try {
      const body=await c.req.json().catch(() => ({})) as Record<string,unknown>,roomId=clean(c.req.param('roomId'),'Room not found'),userId=await friendUser(c,body.userId);
      const room=await mineRoom(c.env,roomId);
      if(!room)return c.json({error:'Room not found'},404);
      if(expired(room.expires_at)){await expireFriendRoom(c.env,room);return c.json({error:'Room expired'},410);}
      if(mineRole(room,userId)==='spectator')return c.json({error:'You are not in this room'},403);
      return c.json({ok:true,...(await invite(c.env,roomId,userId,name(body.name,'Player')))});
    } catch(e){return fail(c,e,'Could not prepare invite');}
  });

  app.post('/app/api/mines/friend/rooms/:roomId/join', async (c) => {
    try {
      const body=await c.req.json().catch(() => ({})) as Record<string,unknown>,roomId=clean(c.req.param('roomId'),'Room not found'),userId=await friendUser(c,body.userId);
      let room=await mineRoom(c.env,roomId);
      if(!room)return c.json({error:'Room not found'},404);
      if(expired(room.expires_at)){await expireFriendRoom(c.env,room);return c.json({error:'Room expired'},410);}
      if(room.host_user_id!==userId&&room.guest_user_id&&room.guest_user_id!==userId)return c.json({error:'Room already has two players'},409);
      if(!room.guest_user_id&&room.host_user_id!==userId){
        await c.env.DB.prepare("UPDATE mines_friend_rooms SET guest_user_id=?,guest_name=?,status='waiting',updated_at=CURRENT_TIMESTAMP WHERE id=? AND guest_user_id IS NULL AND status='waiting'").bind(userId,name(body.name,'Friend'),roomId).run();
        room=await mineRoom(c.env,roomId) as MineRoom;
      }
      return c.json(await minesState(c.env,roomId,userId));
    } catch(e){return fail(c,e,'Could not join room');}
  });

  app.get('/app/api/mines/friend/rooms/:roomId', async (c) => {
    try{
      const userId=await friendUser(c,c.req.query('userId'));
      return c.json(await minesState(c.env,clean(c.req.param('roomId'),'Room not found'),userId));
    } catch(e){return fail(c,e,'Could not load room');}
  });

  app.post('/app/api/mines/friend/rooms/:roomId/ready', async (c) => {
    try {
      const body=await c.req.json().catch(() => ({})) as Record<string,unknown>,roomId=clean(c.req.param('roomId'),'Room not found'),userId=await friendUser(c,body.userId);
      let room=await mineRoom(c.env,roomId);if(!room)return c.json({error:'Room not found'},404);
      if(expired(room.expires_at)){await expireFriendRoom(c.env,room);return c.json({error:'Room expired'},410);}
      const playerRole=mineRole(room,userId);if(playerRole==='spectator')return c.json({error:'You are not in this room'},403);
      if(room.status==='finished'||room.status==='expired')return c.json(await minesState(c.env,roomId,userId));
      const playerName=name(body.name,'Player');
      if(playerRole==='host')await c.env.DB.prepare('UPDATE mines_friend_rooms SET host_name=?,host_ready=1,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(playerName,roomId).run();
      else await c.env.DB.prepare('UPDATE mines_friend_rooms SET guest_name=?,guest_ready=1,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(playerName,roomId).run();
      room=await mineRoom(c.env,roomId) as MineRoom;
      if(room?.guest_user_id)await fundReadyFriendPlayers(c.env,room);
      return c.json(await minesState(c.env,roomId,userId));
    } catch(e){return fail(c,e,'Could not save ready state');}
  });

  app.post('/app/api/mines/friend/rooms/:roomId/start', async (c) => {
    try {
      const body=await c.req.json().catch(() => ({})) as Record<string,unknown>,roomId=clean(c.req.param('roomId'),'Room not found'),userId=await friendUser(c,body.userId);
      let room=await mineRoom(c.env,roomId);if(!room)return c.json({error:'Room not found'},404);
      if(mineRole(room,userId)!=='host')return c.json({error:'Only the host can start a new round'},403);
      if(!room.guest_user_id)return c.json({error:'Waiting for friend'},409);
      if(room.status==='finished'){
        await settleFriendRoom(c.env,room);
        await c.env.DB.prepare("UPDATE mines_friend_rooms SET status='waiting',current_turn_user_id=host_user_id,hidden_cells_json=?,revealed_cells_json='[]',finished_reason=NULL,host_ready=0,guest_ready=0,host_has_points=NULL,guest_has_points=NULL,host_funded=0,guest_funded=0,settled=0,round_index=round_index+1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='finished'")
          .bind(JSON.stringify(secureHiddenCells(25,Number(room.mine_count)||3)),roomId).run();
        room=await mineRoom(c.env,roomId) as MineRoom;
      }
      return c.json(await minesState(c.env,roomId,userId));
    } catch(e){return fail(c,e,'Could not start round');}
  });

  app.post('/app/api/mines/friend/rooms/:roomId/reveal', async (c) => {
    try {
      const body=await c.req.json().catch(() => ({})) as Record<string,unknown>,roomId=clean(c.req.param('roomId'),'Room not found'),userId=await friendUser(c,body.userId),cell=clampInt(body.cell,0,24,-1);
      if(cell<0)return c.json({error:'Invalid cell'},400);
      let room=await mineRoom(c.env,roomId);if(!room)return c.json({error:'Room not found'},404);
      if(expired(room.expires_at)){await expireFriendRoom(c.env,room);return c.json({error:'Room expired'},410);}
      if(mineRole(room,userId)==='spectator')return c.json({error:'You are not in this room'},403);
      if(room.status!=='active')return c.json({error:'Round is not active'},409);
      if(room.host_funded!==1||room.guest_funded!==1)return c.json({error:'Round points are not funded'},409);
      if(room.current_turn_user_id!==userId)return c.json({error:'Friend turn'},409);
      const mines=parseNums(room.hidden_cells_json),revealed=parseRevealed(room.revealed_cells_json);
      if(revealed.some((item)=>item.cell===cell))return c.json(await minesState(c.env,roomId,userId));
      const hit=mines.includes(cell);revealed.push({cell,byUserId:userId,result:hit?'hidden':'safe'});
      const finished=hit||revealed.filter((item)=>item.result==='safe').length>=Number(room.board_size||25)-Number(room.mine_count||mines.length||3);
      const next=finished?null:(userId===room.host_user_id?room.guest_user_id:room.host_user_id);
      const result=await c.env.DB.prepare("UPDATE mines_friend_rooms SET status=?,current_turn_user_id=?,revealed_cells_json=?,finished_reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='active' AND current_turn_user_id=? AND revealed_cells_json=? AND host_funded=1 AND guest_funded=1")
        .bind(finished?'finished':'active',next,JSON.stringify(revealed),finished?(hit?'hidden':'cleared'):null,roomId,userId,room.revealed_cells_json).run();
      if(Number(result.meta?.changes||0)<=0)return c.json(await minesState(c.env,roomId,userId));
      room=await mineRoom(c.env,roomId) as MineRoom;
      if(finished&&room)await settleFriendRoom(c.env,room);
      return c.json(await minesState(c.env,roomId,userId));
    } catch(e){return fail(c,e,'Could not select tile');}
  });
}

async function ensureTables(env:Env){
  if(!minesTablesReady){
    minesTablesReady=(async()=>{
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS mines_friend_rooms (id TEXT PRIMARY KEY,host_user_id TEXT NOT NULL,host_name TEXT,guest_user_id TEXT,guest_name TEXT,status TEXT NOT NULL DEFAULT 'waiting',current_turn_user_id TEXT,hidden_cells_json TEXT NOT NULL DEFAULT '[]',revealed_cells_json TEXT NOT NULL DEFAULT '[]',mine_count INTEGER NOT NULL DEFAULT 3,board_size INTEGER NOT NULL DEFAULT 25,round_index INTEGER NOT NULL DEFAULT 1,finished_reason TEXT,host_ready INTEGER,guest_ready INTEGER,host_has_points INTEGER,guest_has_points INTEGER,host_funded INTEGER NOT NULL DEFAULT 0,guest_funded INTEGER NOT NULL DEFAULT 0,settled INTEGER NOT NULL DEFAULT 0,amount_nano INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,expires_at TEXT NOT NULL)").run();
      await env.DB.prepare('ALTER TABLE mines_friend_rooms ADD COLUMN host_funded INTEGER NOT NULL DEFAULT 0').run().catch(()=>undefined);
      await env.DB.prepare('ALTER TABLE mines_friend_rooms ADD COLUMN guest_funded INTEGER NOT NULL DEFAULT 0').run().catch(()=>undefined);
      await env.DB.prepare('ALTER TABLE mines_friend_rooms ADD COLUMN settled INTEGER NOT NULL DEFAULT 0').run().catch(()=>undefined);
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS mines_solo_rounds (user_id TEXT PRIMARY KEY,round_id TEXT NOT NULL UNIQUE,status TEXT NOT NULL DEFAULT 'pending',amount_nano INTEGER NOT NULL,mine_count INTEGER NOT NULL,board_size INTEGER NOT NULL DEFAULT 25,mine_cells_json TEXT NOT NULL DEFAULT '[]',revealed_cells_json TEXT NOT NULL DEFAULT '[]',multiplier REAL NOT NULL DEFAULT 1,payout_nano INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)").run();
      await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_mines_solo_round_id ON mines_solo_rounds(round_id)').run();
    })().catch((error)=>{minesTablesReady=null;throw error;});
  }
  await minesTablesReady;
}

async function soloUser(env:Env,initData:unknown){return validateTelegramInitData(String(initData||''),gameBotToken(env));}
async function friendUser(c:any,claimed:unknown){const userId=await validateTelegramInitData(String(c.req.header('x-telegram-init-data')||''),gameBotToken(c.env));const claim=String(claimed??'').replace(/[^0-9A-Za-z_-]/g,'').slice(0,80);if(claim&&claim!==userId)throw new Error('Telegram user mismatch');await assertMinesAccess(c.env,userId);return userId;}
async function assertMinesAccess(env:Env,userId:string){const controls=await getUserControls(env,userId);if(controls.banned||controls.blockedSections.includes('mines'))throw new Error('Mines is blocked for this account');return controls;}
async function soloRound(env:Env,userId:string){return env.DB.prepare('SELECT * FROM mines_solo_rounds WHERE user_id=? LIMIT 1').bind(userId).first<SoloMineRound>();}
async function activateSoloRound(env:Env,round:SoloMineRound){
  if(round.status!=='pending')return{round,controls:await getUserControls(env,round.user_id)};
  let controls;
  try{
    controls=await debitUserTonBalanceIfEnough(env,round.user_id,Number(round.amount_nano),{kind:'game',title:'Mines bet',referenceId:round.round_id,referenceType:'mines_solo_bet',roundId:round.round_id,metadata:{game:'mines',mineCount:Number(round.mine_count)}});
  }catch(error){
    await env.DB.prepare("UPDATE mines_solo_rounds SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND round_id=? AND status='pending'").bind(round.user_id,round.round_id).run().catch(()=>undefined);
    throw error;
  }
  const active=await env.DB.prepare("UPDATE mines_solo_rounds SET status='active',updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND round_id=? AND status='pending' RETURNING *").bind(round.user_id,round.round_id).first<SoloMineRound>();
  if(active)return{round:active,controls};
  const current=await soloRound(env,round.user_id);if(!current)throw new Error('Round not found');
  return{round:current,controls};
}
async function settleSoloPayout(env:Env,round:SoloMineRound){
  const payout=Math.floor(Number(round.payout_nano)||0);
  if(round.status!=='cashed_out'||!Number.isSafeInteger(payout)||payout<=0)return getUserControls(env,round.user_id);
  return applyGameTonBalanceDelta(env,round.user_id,payout,{kind:'game',title:'Mines reward',referenceId:round.round_id,referenceType:'mines_solo_payout',roundId:round.round_id,metadata:{game:'mines',mineCount:Number(round.mine_count),multiplier:Number(round.multiplier)||1}});
}
function soloState(round:SoloMineRound,tonBalanceNano?:number){
  const revealed=parseNums(round.revealed_cells_json),mines=parseNums(round.mine_cells_json),mineCount=Number(round.mine_count)||3,boardSize=Number(round.board_size)||25,status=String(round.status||'');
  const finished=status==='lost'||status==='cashed_out';
  const multiplier=status==='active'?soloMultiplier(mineCount,revealed.length,boardSize):Math.max(1,Number(round.multiplier)||1);
  const payload:Record<string,unknown>={ok:true,active:status==='active',roundId:round.round_id,status,amountNano:Math.max(1,Number(round.amount_nano)||1),mineCount,boardSize,revealedCells:revealed,revealedCount:revealed.length,multiplier,canCollect:status==='active'&&revealed.length>=minSafePicksForCollect(mineCount),payoutNano:Math.max(0,Number(round.payout_nano)||0),bombs:finished?mines:[]};
  if(Number.isFinite(Number(tonBalanceNano)))payload.tonBalanceNano=Math.max(0,Number(tonBalanceNano)||0);
  return payload;
}
function soloRuntimeState(runtime:MinesSoloRuntimeState,tonBalanceNano?:number){
  const status=runtime.status==='collecting'?'active':runtime.status;
  const payload:Record<string,unknown>={ok:true,active:status==='active',roundId:runtime.roundId,status,amountNano:runtime.amountNano,mineCount:runtime.mineCount,boardSize:runtime.boardSize,revealedCells:runtime.revealedCells,revealedCount:runtime.revealedCount,multiplier:runtime.multiplier,canCollect:status==='active'&&runtime.revealedCount>=minSafePicksForCollect(runtime.mineCount),payoutNano:runtime.payoutNano,bombs:runtime.bombs};
  if(runtime.result)payload.result=runtime.result;
  if(Number.isInteger(runtime.selectedCell))payload.selectedCell=runtime.selectedCell;
  if(typeof runtime.newReveal==='boolean')payload.newReveal=runtime.newReveal;
  if(Number.isFinite(Number(tonBalanceNano)))payload.tonBalanceNano=Math.max(0,Number(tonBalanceNano)||0);
  return payload;
}
function soloRuntimeSeed(round:SoloMineRound){
  const mineCount=Number(round.mine_count)||3,boardSize=Number(round.board_size)||25;
  return{userId:round.user_id,roundId:round.round_id,amountNano:Number(round.amount_nano),mineCount,boardSize,mines:parseNums(round.mine_cells_json),revealedCells:parseNums(round.revealed_cells_json),multipliers:Array.from({length:Math.max(0,boardSize-mineCount)},(_,index)=>soloMultiplier(mineCount,index+1,boardSize)),status:round.status==='lost'?'lost' as const:round.status==='cashed_out'?'cashed_out' as const:'active' as const,payoutNano:Number(round.payout_nano)||0};
}
async function runtimeForRound(env:Env,userId:string,round:SoloMineRound){
  try{const runtime=await getMinesSoloRuntime(env,userId);if(runtime.roundId===round.round_id)return runtime;}catch(error){if(!runtimeMissing(error))throw error;}
  return initMinesSoloRuntime(env,soloRuntimeSeed(round));
}
async function hydrateSoloRuntime(env:Env,userId:string,roundId:string){
  await ensureTables(env);
  let round=await soloRound(env,userId);
  if(!round||round.round_id!==roundId)throw new Error('Round not found');
  if(round.status==='pending')round=(await activateSoloRound(env,round)).round;
  if(!['active','lost','cashed_out'].includes(round.status))throw new Error('Round already ended');
  return runtimeForRound(env,userId,round);
}
async function persistSoloRuntimeLoss(env:Env,runtime:MinesSoloRuntimeState){
  await env.DB.prepare(`UPDATE mines_solo_rounds SET status='lost',revealed_cells_json=?,multiplier=?,payout_nano=0,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND round_id=? AND status='active'`)
    .bind(JSON.stringify(runtime.revealedCells),runtime.multiplier,runtime.userId,runtime.roundId).run();
  await finishMinesSoloRuntime(env,runtime.userId,runtime.roundId,'lost').catch(()=>undefined);
}
async function settleSoloRuntimeCollect(env:Env,runtime:MinesSoloRuntimeState){
  if(runtime.status==='lost')throw new MinesSoloRuntimeError('Round already ended',409);
  const payout=runtime.status==='cashed_out'&&runtime.payoutNano>0?runtime.payoutNano:soloPayout(runtime.amountNano,runtime.multiplier);
  let round:SoloMineRound|null=null;
  try{
    round=await env.DB.prepare(`UPDATE mines_solo_rounds SET status='cashed_out',revealed_cells_json=?,multiplier=?,payout_nano=?,updated_at=CURRENT_TIMESTAMP WHERE user_id=? AND round_id=? AND status='active' RETURNING *`)
      .bind(JSON.stringify(runtime.revealedCells),runtime.multiplier,payout,runtime.userId,runtime.roundId).first<SoloMineRound>();
  }catch(error){if(runtime.status==='collecting')await rollbackMinesSoloCollect(env,runtime.userId,runtime.roundId).catch(()=>undefined);throw error;}
  if(!round)round=await soloRound(env,runtime.userId);
  if(!round||round.round_id!==runtime.roundId){if(runtime.status==='collecting')await rollbackMinesSoloCollect(env,runtime.userId,runtime.roundId).catch(()=>undefined);throw new Error('Round not found');}
  if(round.status==='lost'){await finishMinesSoloRuntime(env,runtime.userId,runtime.roundId,'lost').catch(()=>undefined);throw new MinesSoloRuntimeError('Round already ended',409);}
  if(round.status!=='cashed_out'){if(runtime.status==='collecting')await rollbackMinesSoloCollect(env,runtime.userId,runtime.roundId).catch(()=>undefined);throw new Error('Round is not active');}
  await finishMinesSoloRuntime(env,runtime.userId,runtime.roundId,'cashed_out',Number(round.payout_nano)||payout).catch(()=>undefined);
  const controls=await settleSoloPayout(env,round);
  return{round,controls};
}
function runtimeMissing(error:unknown){return error instanceof MinesSoloRuntimeError&&error.status===404;}
function minSafePicksForCollect(mineCount:number){return mineCount<=5?2:1;}
function soloMineCount(value:unknown){const n=Math.floor(Number(value));return SOLO_MINE_COUNTS.has(n)?n:0;}
function soloAmount(value:unknown,mineCount:number){const amount=Math.floor(Number(value));if(!Number.isSafeInteger(amount)||amount<=0)return 0;const maxMultiplier=soloMultiplier(mineCount,25-mineCount,25),maxAmount=Math.floor(Number.MAX_SAFE_INTEGER/maxMultiplier);return amount<=maxAmount?amount:0;}
function soloPayout(amount:number,multiplier:number){const payout=Math.floor(amount*multiplier);if(!Number.isSafeInteger(payout)||payout<=0)throw new Error('Invalid Mines payout');return payout;}
function probabilityMultiplier(mineCount:number,picks:number,size:number){
  let probability=1;for(let i=0;i<picks;i++)probability*=((size-mineCount-i)/(size-i));
  return probability>0?Math.max(1,SOLO_RTP/probability):1;
}
function soloMultiplier(mineCount:number,picks:number,size:number){
  const safePicks=Math.max(0,Math.min(Math.floor(Number(picks)||0),size-mineCount));if(!safePicks)return 1;
  const curve=SOLO_MULTIPLIER_CURVES[mineCount];if(!curve||!curve.length)return probabilityMultiplier(mineCount,safePicks,size);
  if(safePicks<=curve.length)return curve[safePicks-1];
  const anchorPicks=curve.length,anchor=curve[anchorPicks-1],baseAtAnchor=probabilityMultiplier(mineCount,anchorPicks,size),baseAtPicks=probabilityMultiplier(mineCount,safePicks,size);
  if(baseAtAnchor<=0)return anchor;
  return Math.max(anchor,Math.round((anchor*(baseAtPicks/baseAtAnchor))*100)/100);
}
function friendAmount(value:unknown){const amount=Math.floor(Number(value));return Number.isSafeInteger(amount)&&amount>0&&amount<=Math.floor(Number.MAX_SAFE_INTEGER/2)?amount:0;}
async function mineRoom(env:Env,id:string){await ensureTables(env);return env.DB.prepare('SELECT * FROM mines_friend_rooms WHERE id=?').bind(id).first<MineRoom>();}
async function fundReadyFriendPlayers(env:Env,input:MineRoom){
  let room=input;if(!room.guest_user_id||room.status!=='waiting'||!room.host_ready||!room.guest_ready)return room;
  const amount=friendAmount(room.amount_nano);if(!amount)throw new Error('Invalid point amount');
  const players:[string,'host'|'guest',number][]=[[room.host_user_id,'host',Number(room.host_funded||0)],[room.guest_user_id,'guest',Number(room.guest_funded||0)]];
  for(const [userId,role,funded] of players){
    if(funded===1)continue;
    let ok=0;
    try{
      await assertMinesAccess(env,userId);
      await debitUserTonBalanceIfEnough(env,userId,amount,{kind:'game',title:'Mines friend bet',referenceId:`${room.id}:${room.round_index}:${role}`,referenceType:'mines_friend_bet',metadata:{game:'mines',roomId:room.id,roundIndex:Number(room.round_index),role}});
      ok=1;
    }catch{ok=0;}
    const column=role==='host'?'host_funded':'guest_funded';
    await env.DB.prepare(`UPDATE mines_friend_rooms SET ${column}=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='waiting'`).bind(ok,room.id).run();
  }
  room=await mineRoom(env,room.id) as MineRoom;if(!room)throw new Error('Room not found');
  if(room.host_funded===1&&room.guest_funded===1){
    await env.DB.prepare("UPDATE mines_friend_rooms SET status='active',current_turn_user_id=host_user_id,host_has_points=1,guest_has_points=1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='waiting' AND host_funded=1 AND guest_funded=1").bind(room.id).run();
    room=await mineRoom(env,room.id) as MineRoom;
  }
  return room;
}
async function settleFriendRoom(env:Env,input:MineRoom){
  let room=input;if(room.status!=='finished'||room.settled===1||room.host_funded!==1||room.guest_funded!==1||!room.guest_user_id)return room;
  const amount=friendAmount(room.amount_nano);if(!amount)throw new Error('Invalid point amount');
  const outcome=friendOutcome(room);
  if(outcome.isDraw){
    await applyGameTonBalanceDelta(env,room.host_user_id,amount,{kind:'game',title:'Mines friend draw refund',referenceId:`${room.id}:${room.round_index}:host`,referenceType:'mines_friend_draw',metadata:{game:'mines',roomId:room.id,roundIndex:Number(room.round_index),result:'draw'}});
    await applyGameTonBalanceDelta(env,room.guest_user_id,amount,{kind:'game',title:'Mines friend draw refund',referenceId:`${room.id}:${room.round_index}:guest`,referenceType:'mines_friend_draw',metadata:{game:'mines',roomId:room.id,roundIndex:Number(room.round_index),result:'draw'}});
  }else if(outcome.winnerRole){
    const winner=outcome.winnerRole==='host'?room.host_user_id:room.guest_user_id;
    await applyGameTonBalanceDelta(env,winner,amount*2,{kind:'game',title:'Mines friend reward',referenceId:`${room.id}:${room.round_index}:${outcome.winnerRole}`,referenceType:'mines_friend_payout',metadata:{game:'mines',roomId:room.id,roundIndex:Number(room.round_index),winnerRole:outcome.winnerRole}});
  }else throw new Error('Could not settle Mines friend round');
  await env.DB.prepare("UPDATE mines_friend_rooms SET settled=1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='finished'").bind(room.id).run();
  room=await mineRoom(env,room.id) as MineRoom;return room;
}
async function expireFriendRoom(env:Env,input:MineRoom){
  let room=input;
  if(room.status==='finished')return settleFriendRoom(env,room);
  await env.DB.prepare("UPDATE mines_friend_rooms SET status='expired',current_turn_user_id=NULL,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status NOT IN ('finished','expired')").bind(room.id).run();
  room=await mineRoom(env,room.id) as MineRoom;if(!room)throw new Error('Room not found');
  if(room.status==='finished')return settleFriendRoom(env,room);
  if(room.status!=='expired'||room.settled===1)return room;
  const amount=friendAmount(room.amount_nano);if(!amount)throw new Error('Invalid point amount');
  if(room.host_funded===1)await applyGameTonBalanceDelta(env,room.host_user_id,amount,{kind:'adjustment',title:'Mines friend refund',referenceId:`${room.id}:${room.round_index}:host`,referenceType:'mines_friend_expired',metadata:{game:'mines',roomId:room.id,roundIndex:Number(room.round_index),reason:'expired'}});
  if(room.guest_user_id&&room.guest_funded===1)await applyGameTonBalanceDelta(env,room.guest_user_id,amount,{kind:'adjustment',title:'Mines friend refund',referenceId:`${room.id}:${room.round_index}:guest`,referenceType:'mines_friend_expired',metadata:{game:'mines',roomId:room.id,roundIndex:Number(room.round_index),reason:'expired'}});
  await env.DB.prepare("UPDATE mines_friend_rooms SET settled=1,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='expired'").bind(room.id).run();
  return (await mineRoom(env,room.id)) as MineRoom;
}
async function minesState(env:Env,roomId:string,userId:string){
  let room=await mineRoom(env,roomId);if(!room)throw new Error('Room not found');
  if(expired(room.expires_at)&&room.status!=='finished')room=await expireFriendRoom(env,room);
  if(room.status==='finished'&&room.settled!==1)room=await settleFriendRoom(env,room);
  const playerRole=mineRole(room,userId),mines=parseNums(room.hidden_cells_json),revealed=parseRevealed(room.revealed_cells_json),finished=room.status==='finished'||room.status==='expired',hostReady=Boolean(room.host_ready),guestReady=Boolean(room.guest_ready),outcome=finished?friendOutcome(room):{winnerRole:null as 'host'|'guest'|null,isDraw:false},controls=await getUserControls(env,userId);
  return {ok:true,tonBalanceNano:controls.tonBalanceNano,youReady:playerRole==='host'?hostReady:playerRole==='guest'?guestReady:false,friendReady:playerRole==='host'?guestReady:playerRole==='guest'?hostReady:false,youHavePoints:playerRole==='host'?(hostReady?room.host_funded===1:null):playerRole==='guest'?(guestReady?room.guest_funded===1:null):null,friendHasPoints:playerRole==='host'?(guestReady?room.guest_funded===1:null):playerRole==='guest'?(hostReady?room.host_funded===1:null):null,amountNano:Math.max(1,Number(room.amount_nano)||10000000),room:{id:room.id,status:room.status,hostName:room.host_name||'Host',guestName:room.guest_name||null,hasGuest:Boolean(room.guest_user_id),currentTurnRole:room.current_turn_user_id===room.host_user_id?'host':room.current_turn_user_id===room.guest_user_id?'guest':null,isYourTurn:Boolean(userId&&room.current_turn_user_id===userId&&room.status==='active'),boardSize:Number(room.board_size||25),mineCount:Number(room.mine_count||mines.length||3),amountNano:Math.max(1,Number(room.amount_nano)||10000000),roundIndex:Number(room.round_index||1),finishedReason:room.finished_reason,winnerRole:outcome.winnerRole,isDraw:outcome.isDraw,settled:room.settled===1,createdAt:room.created_at,updatedAt:room.updated_at,expiresAt:room.expires_at},player:{role:playerRole},board:{revealed:revealed.map((item)=>({cell:item.cell,result:item.result,byRole:item.byUserId===room.host_user_id?'host':item.byUserId===room.guest_user_id?'guest':null})),hiddenCells:finished?mines:[]}};
}
function friendOutcome(room:MineRoom):{winnerRole:'host'|'guest'|null;isDraw:boolean}{
  const revealed=parseRevealed(room.revealed_cells_json),last=revealed[revealed.length-1];
  if(last&&last.result==='hidden'&&last.byUserId)return{winnerRole:last.byUserId===room.host_user_id?'guest':'host',isDraw:false};
  let hostSafe=0,guestSafe=0;for(const item of revealed){if(item.result!=='safe')continue;if(item.byUserId===room.host_user_id)hostSafe++;else if(item.byUserId===room.guest_user_id)guestSafe++;}
  if(hostSafe===guestSafe)return{winnerRole:null,isDraw:true};return{winnerRole:hostSafe>guestSafe?'host':'guest',isDraw:false};
}
async function invite(env:Env,roomId:string,userId:string,displayName:string){
  const numeric=Number(userId);if(!env.BOT_TOKEN||!Number.isSafeInteger(numeric)||numeric<=0)throw new Error('Telegram share is available only inside Telegram.');
  const username=await botUsername(env),short=String(env.MINI_APP_SHORT_NAME||'').replace(/[^0-9A-Za-z_]/g,''),start=`minesroom_${roomId}`,url=`https://t.me/${username}${short?`/${short}`:''}?startapp=${encodeURIComponent(start)}`;
  const fallbackText=`🎮 ${displayName} invited you to a Mines friend round.`;
  const response=await telegram<{ok:boolean;result?:{id?:string};description?:string}>(env.BOT_TOKEN,'savePreparedInlineMessage',{user_id:numeric,result:{type:'article',id:`mines_invite_${roomId}`.slice(0,64),title:'Mines Friend Round',description:'Join a private game in Vexa.',input_message_content:{message_text:fallbackText,disable_web_page_preview:true},reply_markup:{inline_keyboard:[[{text:'🎮 Join Friend Round',url}]]}},allow_user_chats:true,allow_bot_chats:false,allow_group_chats:true,allow_channel_chats:false});
  if(!response.ok||!response.result?.id)throw new Error(response.description||'Telegram could not prepare invite');return{preparedMessageId:response.result.id,inviteUrl:url,fallbackText};
}
async function botUsername(env:Env){const key=`telegram:bot-username:${env.BOT_TOKEN.split(':')[0]||'default'}`,cached=await env.BOT_CACHE.get(key).catch(()=>null);if(cached)return cached;const data=await telegram<{ok:boolean;result?:{username?:string};description?:string}>(env.BOT_TOKEN,'getMe',{}),username=String(data.result?.username||'').replace(/^@/,'').replace(/[^0-9A-Za-z_]/g,'');if(!data.ok||!username)throw new Error(data.description||'Telegram bot username is unavailable');await env.BOT_CACHE.put(key,username,{expirationTtl:86400}).catch(()=>undefined);return username;}
async function telegram<T>(token:string,method:string,payload:Record<string,unknown>){const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});return response.json() as Promise<T>;}
async function limited(env:Env,key:string){try{return await rateLimit(env.RATE_LIMITS,key,20,3600);}catch{return true;}}
function mineRole(room:MineRoom,userId:string){return room.host_user_id===userId?'host':room.guest_user_id===userId?'guest':'spectator';}
function expired(value:string){return Date.parse(value)<=Date.now();}
function clean(value:unknown,error:string){const result=String(value??'').replace(/[^0-9A-Za-z_-]/g,'').slice(0,80);if(!result)throw new Error(error);return result;}
function name(value:unknown,fallback:string){return String(value||fallback).replace(/[<>]/g,'').trim().slice(0,80)||fallback;}
function clampInt(value:unknown,min:number,max:number,fallback:number){const number=Math.floor(Number(value));return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback;}
function secureHiddenCells(size:number,count:number){
  const pool=Array.from({length:size},(_,index)=>index);
  for(let i=pool.length-1;i>0;i--){const range=i+1,limit=Math.floor(0x100000000/range)*range;let value=0;do{const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);value=bytes[0];}while(value>=limit);const j=value%range;[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,Math.min(size-1,count)).sort((a,b)=>a-b);
}
function parseNums(value:string){try{const parsed=JSON.parse(value);return Array.isArray(parsed)?Array.from(new Set(parsed.map(Number).filter((n)=>Number.isInteger(n)&&n>=0&&n<25))).sort((a,b)=>a-b):[];}catch{return[];}}
function parseRevealed(value:string):Array<{cell:number;byUserId:string;result:'safe'|'hidden'}>{try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.map((item)=>({cell:Number(item.cell),byUserId:String(item.byUserId||''),result:item.result==='hidden'?'hidden' as const:'safe' as const})).filter((item)=>Number.isInteger(item.cell)&&item.cell>=0&&item.cell<25):[];}catch{return[];}}
function fail(c:any,error:unknown,fallback:string){const message=error instanceof Error?error.message:fallback;const status=error instanceof MinesSoloRuntimeError&&error.status>0?error.status:message==='Room not found'||message==='Round not found'?404:/blocked|not in this room|Only the host/i.test(message)?403:/Telegram user mismatch|init data|authentication/i.test(message)?401:/already ended|not active|Open more safe/i.test(message)?409:400;return c.json({error:message},status);}