import type { Hono } from 'hono';
import type { Env } from './types';
import { id, rateLimit } from './utils';

type App = Hono<{ Bindings: Env }>;
type MineRoom = { id:string; host_user_id:string; host_name:string|null; guest_user_id:string|null; guest_name:string|null; status:string; current_turn_user_id:string|null; hidden_cells_json:string; revealed_cells_json:string; mine_count:number; board_size:number; round_index:number; finished_reason:string|null; host_ready:number|null; guest_ready:number|null; host_has_points:number|null; guest_has_points:number|null; amount_nano:number|null; created_at:string; updated_at:string; expires_at:string };

export function registerFriendGameRoutes(app: App): void {
  app.post('/app/api/mines/friend/rooms', async (c) => {
    try {
      const body = await c.req.json() as Record<string, unknown>;
      const userId = clean(body.userId,'Telegram user not found');
      if (!(await limited(c.env,`mines-room:${userId}`))) return c.json({ error:'Too many friend rooms. Try again later.' },429);
      await ensureTables(c.env);
      const roomId=id('mines'), mineCount=clampInt(body.mineCount,1,20,3), amount=clampInt(body.amountNano,1,Number.MAX_SAFE_INTEGER,10000000);
      await c.env.DB.prepare("INSERT INTO mines_friend_rooms (id,host_user_id,host_name,status,current_turn_user_id,hidden_cells_json,revealed_cells_json,mine_count,board_size,amount_nano,expires_at) VALUES (?,?,?,'waiting',?,?,'[]',?,25,?,?)")
        .bind(roomId,userId,name(body.name,'Host'),userId,JSON.stringify(hiddenCells(25,mineCount)),mineCount,amount,new Date(Date.now()+86400000).toISOString()).run();
      return c.json(await minesState(c.env,roomId,userId));
    } catch (e) { return fail(c,e,'Could not create Mines friend room.'); }
  });

  app.post('/app/api/mines/friend/rooms/:roomId/share', async (c) => {
    try {
      const body=await c.req.json() as Record<string,unknown>, roomId=clean(c.req.param('roomId'),'Room not found'), userId=clean(body.userId,'Telegram user not found');
      const room=await mineRoom(c.env,roomId);
      if(!room)return c.json({error:'Room not found'},404);
      if(expired(room.expires_at))return c.json({error:'Room expired'},410);
      if(mineRole(room,userId)==='spectator')return c.json({error:'You are not in this room'},403);
      return c.json({ok:true,...(await invite(c.env,roomId,userId,name(body.name,'Player')))});
    } catch(e){return fail(c,e,'Could not prepare invite');}
  });

  app.post('/app/api/mines/friend/rooms/:roomId/join', async (c) => {
    try {
      const body=await c.req.json() as Record<string,unknown>, roomId=clean(c.req.param('roomId'),'Room not found'), userId=clean(body.userId,'Telegram user not found');
      const room=await mineRoom(c.env,roomId);
      if(!room)return c.json({error:'Room not found'},404);
      if(expired(room.expires_at)){await expire(c.env,'mines_friend_rooms',roomId);return c.json({error:'Room expired'},410);}
      if(room.host_user_id!==userId&&room.guest_user_id&&room.guest_user_id!==userId)return c.json({error:'Room already has two players'},409);
      if(!room.guest_user_id&&room.host_user_id!==userId)await c.env.DB.prepare("UPDATE mines_friend_rooms SET guest_user_id=?,guest_name=?,status='active',updated_at=CURRENT_TIMESTAMP WHERE id=? AND guest_user_id IS NULL").bind(userId,name(body.name,'Friend'),roomId).run();
      return c.json(await minesState(c.env,roomId,userId));
    } catch(e){return fail(c,e,'Could not join room');}
  });

  app.get('/app/api/mines/friend/rooms/:roomId', async (c) => {
    try{return c.json(await minesState(c.env,clean(c.req.param('roomId'),'Room not found'),clean(c.req.query('userId'),'Telegram user not found')));}
    catch(e){return fail(c,e,'Could not load room');}
  });

  app.post('/app/api/mines/friend/rooms/:roomId/ready', async (c) => {
    try {
      const body=await c.req.json() as Record<string,unknown>, roomId=clean(c.req.param('roomId'),'Room not found'), userId=clean(body.userId,'Telegram user not found');
      const room=await mineRoom(c.env,roomId); if(!room)return c.json({error:'Room not found'},404);
      const playerRole=mineRole(room,userId); if(playerRole==='spectator')return c.json({error:'You are not in this room'},403);
      const ready=body.hasPoints===true?1:0, amount=clampInt(body.amountNano,1,Number.MAX_SAFE_INTEGER,10000000), playerName=name(body.name,'Player');
      if(playerRole==='host')await c.env.DB.prepare('UPDATE mines_friend_rooms SET host_name=?,host_ready=1,host_has_points=?,amount_nano=COALESCE(amount_nano,?),updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(playerName,ready,amount,roomId).run();
      else await c.env.DB.prepare('UPDATE mines_friend_rooms SET guest_name=?,guest_ready=1,guest_has_points=?,amount_nano=COALESCE(amount_nano,?),updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(playerName,ready,amount,roomId).run();
      return c.json(await minesState(c.env,roomId,userId));
    } catch(e){return fail(c,e,'Could not save ready state');}
  });

  app.post('/app/api/mines/friend/rooms/:roomId/start', async (c) => {
    try {
      const body=await c.req.json() as Record<string,unknown>, roomId=clean(c.req.param('roomId'),'Room not found'), userId=clean(body.userId,'Telegram user not found');
      const room=await mineRoom(c.env,roomId); if(!room)return c.json({error:'Room not found'},404);
      if(mineRole(room,userId)==='spectator')return c.json({error:'You are not in this room'},403);
      if(!room.guest_user_id)return c.json({error:'Waiting for friend'},409);
      if(room.status==='finished')await c.env.DB.prepare("UPDATE mines_friend_rooms SET status='active',current_turn_user_id=host_user_id,hidden_cells_json=?,revealed_cells_json='[]',finished_reason=NULL,round_index=round_index+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(JSON.stringify(hiddenCells(25,Number(room.mine_count)||3)),roomId).run();
      else if(room.status==='waiting')await c.env.DB.prepare("UPDATE mines_friend_rooms SET status='active',current_turn_user_id=host_user_id,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(roomId).run();
      return c.json(await minesState(c.env,roomId,userId));
    } catch(e){return fail(c,e,'Could not start round');}
  });

  app.post('/app/api/mines/friend/rooms/:roomId/reveal', async (c) => {
    try {
      const body=await c.req.json() as Record<string,unknown>, roomId=clean(c.req.param('roomId'),'Room not found'), userId=clean(body.userId,'Telegram user not found'), cell=clampInt(body.cell,0,24,-1);
      if(cell<0)return c.json({error:'Invalid cell'},400);
      const room=await mineRoom(c.env,roomId); if(!room)return c.json({error:'Room not found'},404);
      if(mineRole(room,userId)==='spectator')return c.json({error:'You are not in this room'},403);
      if(room.status!=='active')return c.json({error:'Round is not active'},409);
      if(room.current_turn_user_id!==userId)return c.json({error:'Friend turn'},409);
      const hidden=parseNums(room.hidden_cells_json), revealed=parseRevealed(room.revealed_cells_json);
      if(revealed.some((item)=>item.cell===cell))return c.json(await minesState(c.env,roomId,userId));
      const hit=hidden.includes(cell); revealed.push({cell,byUserId:userId,result:hit?'hidden':'safe'});
      const finished=hit||revealed.filter((item)=>item.result==='safe').length>=Number(room.board_size||25)-Number(room.mine_count||hidden.length||3);
      const next=finished?null:(userId===room.host_user_id?room.guest_user_id:room.host_user_id);
      await c.env.DB.prepare("UPDATE mines_friend_rooms SET status=?,current_turn_user_id=?,revealed_cells_json=?,finished_reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='active'").bind(finished?'finished':'active',next,JSON.stringify(revealed),finished?(hit?'hidden':'cleared'):null,roomId).run();
      return c.json(await minesState(c.env,roomId,userId));
    } catch(e){return fail(c,e,'Could not select tile');}
  });
}

async function ensureTables(env:Env){
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS mines_friend_rooms (id TEXT PRIMARY KEY,host_user_id TEXT NOT NULL,host_name TEXT,guest_user_id TEXT,guest_name TEXT,status TEXT NOT NULL DEFAULT 'waiting',current_turn_user_id TEXT,hidden_cells_json TEXT NOT NULL DEFAULT '[]',revealed_cells_json TEXT NOT NULL DEFAULT '[]',mine_count INTEGER NOT NULL DEFAULT 3,board_size INTEGER NOT NULL DEFAULT 25,round_index INTEGER NOT NULL DEFAULT 1,finished_reason TEXT,host_ready INTEGER,guest_ready INTEGER,host_has_points INTEGER,guest_has_points INTEGER,amount_nano INTEGER,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,expires_at TEXT NOT NULL)").run();
}
async function mineRoom(env:Env,id:string){await ensureTables(env);return env.DB.prepare('SELECT * FROM mines_friend_rooms WHERE id=?').bind(id).first<MineRoom>();}
async function minesState(env:Env,roomId:string,userId:string){
  const room=await mineRoom(env,roomId);if(!room)throw new Error('Room not found');if(expired(room.expires_at)&&room.status!=='finished'){await expire(env,'mines_friend_rooms',roomId);room.status='expired';}
  const playerRole=mineRole(room,userId),hidden=parseNums(room.hidden_cells_json),revealed=parseRevealed(room.revealed_cells_json),finished=room.status==='finished'||room.status==='expired',hostReady=Boolean(room.host_ready),guestReady=Boolean(room.guest_ready);
  return {ok:true,youReady:playerRole==='host'?hostReady:playerRole==='guest'?guestReady:false,friendReady:playerRole==='host'?guestReady:playerRole==='guest'?hostReady:false,youHavePoints:playerRole==='host'?(hostReady?Boolean(room.host_has_points):null):playerRole==='guest'?(guestReady?Boolean(room.guest_has_points):null):null,friendHasPoints:playerRole==='host'?(guestReady?Boolean(room.guest_has_points):null):playerRole==='guest'?(hostReady?Boolean(room.host_has_points):null):null,amountNano:Math.max(1,Number(room.amount_nano)||10000000),room:{id:room.id,status:room.status,hostName:room.host_name||'Host',guestName:room.guest_name||null,hasGuest:Boolean(room.guest_user_id),currentTurnRole:room.current_turn_user_id===room.host_user_id?'host':room.current_turn_user_id===room.guest_user_id?'guest':null,isYourTurn:Boolean(userId&&room.current_turn_user_id===userId&&room.status==='active'),boardSize:Number(room.board_size||25),mineCount:Number(room.mine_count||hidden.length||3),amountNano:Math.max(1,Number(room.amount_nano)||10000000),roundIndex:Number(room.round_index||1),finishedReason:room.finished_reason,createdAt:room.created_at,updatedAt:room.updated_at,expiresAt:room.expires_at},player:{role:playerRole},board:{revealed:revealed.map((item)=>({cell:item.cell,result:item.result,byRole:item.byUserId===room.host_user_id?'host':item.byUserId===room.guest_user_id?'guest':null})),hiddenCells:finished?hidden:[]}};
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
async function expire(env:Env,table:string,roomId:string){await env.DB.prepare(`UPDATE ${table} SET status='expired',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status!='finished'`).bind(roomId).run();}
function mineRole(room:MineRoom,userId:string){return room.host_user_id===userId?'host':room.guest_user_id===userId?'guest':'spectator';}
function expired(value:string){return Date.parse(value)<=Date.now();}
function clean(value:unknown,error:string){const result=String(value??'').replace(/[^0-9A-Za-z_-]/g,'').slice(0,80);if(!result)throw new Error(error);return result;}
function name(value:unknown,fallback:string){return String(value||fallback).replace(/[<>]/g,'').trim().slice(0,80)||fallback;}
function clampInt(value:unknown,min:number,max:number,fallback:number){const number=Math.floor(Number(value));return Number.isFinite(number)?Math.max(min,Math.min(max,number)):fallback;}
function hiddenCells(size:number,count:number){const set=new Set<number>();while(set.size<Math.min(size-1,count))set.add(Math.floor(Math.random()*size));return[...set].sort((a,b)=>a-b);}
function parseNums(value:string){try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.map(Number).filter((n)=>Number.isInteger(n)&&n>=0&&n<25):[];}catch{return[];}}
function parseRevealed(value:string):Array<{cell:number;byUserId:string;result:'safe'|'hidden'}>{try{const parsed=JSON.parse(value);return Array.isArray(parsed)?parsed.map((item)=>({cell:Number(item.cell),byUserId:String(item.byUserId||''),result:item.result==='hidden'?'hidden' as const:'safe' as const})).filter((item)=>Number.isInteger(item.cell)&&item.cell>=0&&item.cell<25):[];}catch{return[];}}
function fail(c:any,error:unknown,fallback:string){const message=error instanceof Error?error.message:fallback;return c.json({error:message},message==='Room not found'?404:400);}
