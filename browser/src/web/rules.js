/** @typedef {{mode?: 'computer'|'friend',difficulty?:'easy'|'normal'|'hard',gameMode?:'classic'|'sudden'|'chaos'|'tour'}} GameSettings */
/** @typedef {{gameId:string,mode:'computer'|'friend',difficulty:'easy'|'normal'|'hard',gameMode:'classic'|'sudden'|'chaos'|'tour',threshold:number,damage:number,current:1|2,roll:number,lastRoll:number,sprayed:number,total:number,rounds:number,safeSprays:number,phase:'ready'|'rolling'|'spraying'|'countdown'|'waiting'|'counter'|'over',shield:boolean,double:boolean,slippery:boolean,extraTurn:boolean,card:string,history:GameState[],rewardsUsed:number,quickEscape:boolean,quickEscapeOwner:1|2|null,luckyUsed:boolean,pendingCounter:{damageBefore:number,type:'tension_boost'|'pressure_blast',target:1|2}|null,powerupNotice:string,aiPoints:number,aiBoostAttempted:boolean,lastQuickEscapeBlock:boolean,lastShieldBlock:boolean,fallVariant:string|null}} GameState */
export const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.floor(Math.random()*16);return(c==='x'?r:(r&3)|8).toString(16)});
export const TENSION_STEP = 0.7;
export const POWERUP_CATALOG = [
  { type: 'tension_boost', name: 'Tension Boost', price: 500, icon: '⚡', description: 'Leaves the opponent one safe spray before danger.' },
  { type: 'pressure_blast', name: 'Pressure Blast', price: 1000, icon: '💥', description: 'Adds two tension levels to the opponent.' },
  { type: 'emergency_stabilizer', name: 'Emergency Stabilizer', price: 750, icon: '🧊', description: 'Reduces your tension by one level.' },
  { type: 'quick_escape', name: 'Quick Escape', price: 1500, icon: '🪽', description: 'Cancels the next tension increase from a spray.' },
  { type: 'counter_attack', name: 'Counter Attack', price: 1000, icon: '🛡️', description: 'Cancels an incoming Boost or Pressure Blast.' },
  { type: 'lucky_roll', name: 'Lucky Roll', price: 750, icon: '🎲', description: 'Reroll once before your first spray.' },
];
/** @param {GameSettings} settings @returns {GameState} */
export function createGame(settings){
  const [lo,hi]=({easy:[24,30],normal:[17,23],hard:[12,17]})[settings.difficulty||'normal'];const threshold=lo+Math.random()*(hi-lo);
  return {gameId:uuid(),mode:settings.mode||'computer',difficulty:settings.difficulty||'normal',gameMode:settings.gameMode||'classic',threshold,damage:settings.gameMode==='sudden'?threshold*.72:0,current:1,roll:0,lastRoll:0,sprayed:0,total:0,rounds:0,safeSprays:0,phase:'ready',shield:false,double:false,slippery:false,extraTurn:false,card:'',history:[],rewardsUsed:0,quickEscape:false,quickEscapeOwner:null,luckyUsed:false,pendingCounter:null,powerupNotice:'',aiPoints:500,aiBoostAttempted:false,lastQuickEscapeBlock:false,lastShieldBlock:false,fallVariant:null};
}
/** Return an unbiased 1–6 roll, avoiding an identical immediately previous roll. */
export function randomDie(previous=0,random=Math.random){
  const value=1+Math.floor(random()*(previous>=1&&previous<=6?5:6));
  return previous>=1&&previous<=6&&value>=previous?value+1:value;
}
/** @param {GameState} game @param {number} value @param {()=>number} random @returns {GameState} */
export function completeRoll(game,value,random=Math.random){
  let roll=value,shield=false,double=false,slippery=false,extraTurn=false,card='';
  if(game.gameMode==='chaos'&&random()<.6){const c=Math.floor(random()*4);if(c===0){roll=Math.min(12,value*2);card='🌪️ Double sprays!'}else if(c===1){shield=true;card='🛡️ Lucky shield!'}else if(c===2){slippery=true;card='🧈 Sprays hit 50% harder!'}else{extraTurn=true;card='⚡ Extra turn after this one!'}}else{const r=random();shield=r<.15;double=r>=.15&&r<.3;card=shield?'🛡️ First spray is shielded.':double?'🔥 First spray counts twice.':'';}
  return {...game,roll,lastRoll:value,sprayed:0,phase:'spraying',shield,double,slippery,extraTurn,card};
}
/** @param {GameState} game @returns {number} */
export function sprayDamage(game){
  let hit=(game.roll<=2?.7:game.roll<=4?1:1.3)*(game.slippery?1.5:1);if(game.double)hit*=2;if(game.shield)hit=0;
  return hit;
}
/** @param {GameState} game @returns {boolean} */
export function nextSprayWouldFall(game){
  const escapeBlocks=game.quickEscape&&game.quickEscapeOwner===game.current&&sprayDamage(game)>0;
  return ['spraying','countdown'].includes(game.phase)&&game.sprayed<game.roll&&!escapeBlocks&&game.damage+sprayDamage(game)>=game.threshold-1e-9;
}
/** @param {GameState} game @param {boolean} shieldBlocksFall @returns {GameState} */
export function applySpray(game,shieldBlocksFall=false){
  if(!['spraying','countdown'].includes(game.phase)||game.sprayed>=game.roll)return game;
  const rawHit=sprayDamage(game),escapeBlocked=game.quickEscape&&game.quickEscapeOwner===game.current&&rawHit>0,hit=escapeBlocked?0:rawHit,blocked=shieldBlocksFall&&game.damage+hit>=game.threshold-1e-9;
  const damage=blocked?game.damage:game.damage+hit,sprayed=game.sprayed+1,over=!blocked&&damage>=game.threshold-1e-9;
  const snapshot={...game,history:[]};
  return {...game,damage,sprayed,total:game.total+1,safeSprays:game.safeSprays+(game.current===1&&!over?1:0),shield:false,double:false,quickEscape:escapeBlocked?false:game.quickEscape,quickEscapeOwner:escapeBlocked?null:game.quickEscapeOwner,lastQuickEscapeBlock:escapeBlocked,lastShieldBlock:blocked,history:[...game.history,snapshot].slice(-4),phase:over?'over':sprayed>=game.roll?'waiting':'spraying'};
}
/** Apply a purchased attack without ending the round. Attacks cannot cause an immediate fall. */
export function applyPowerup(game,type){
  if(game.phase!=='ready')return game;
  if(type==='emergency_stabilizer')return game.damage>0?{...game,damage:Math.max(0,game.damage-TENSION_STEP),powerupNotice:'🧊 Emergency Stabilizer · tension reduced.'}:game;
  if(type==='quick_escape')return game.quickEscape?game:{...game,quickEscape:true,quickEscapeOwner:game.current,powerupNotice:'🪽 Quick Escape ready · your next tension increase is blocked.'};
  if(type!=='tension_boost'&&type!=='pressure_blast')return game;
  const before=game.damage,minimum=game.threshold-TENSION_STEP;
  if(before>=minimum)return game;
  const target=game.current===1?2:1;
  const escaped=game.quickEscape&&game.quickEscapeOwner===target;
  const damage=escaped?before:type==='tension_boost'?Math.min(minimum,Math.max(before,game.threshold-TENSION_STEP*2)):Math.min(minimum,before+TENSION_STEP*2);
  const counterable=(game.mode==='friend'||(game.mode==='computer'&&game.current===2))&&!escaped;
  const name=type==='tension_boost'?'TENSION BOOST':'PRESSURE BLAST';
  return {...game,damage,quickEscape:escaped?false:game.quickEscape,quickEscapeOwner:escaped?null:game.quickEscapeOwner,lastQuickEscapeBlock:escaped,powerupNotice:escaped?'🪽 Quick Escape blocked the attack!':`${name}! Opponent's tissue is under pressure.`,current:target,rounds:game.rounds+(target===1?1:0),phase:counterable?'counter':'ready',pendingCounter:counterable?{damageBefore:before,type,target}:null,roll:0,sprayed:0,shield:false,double:false,slippery:false,extraTurn:false,aiBoostAttempted:game.mode==='computer'&&target===2?true:game.aiBoostAttempted,card:''};
}
export function canUsePowerup(game,type){
  if(type==='counter_attack')return game.phase==='counter'&&!!game.pendingCounter;
  if(type==='lucky_roll')return game.phase==='spraying'&&game.sprayed===0&&!game.luckyUsed;
  if(game.phase!=='ready')return false;
  if(type==='emergency_stabilizer')return game.damage>0;
  if(type==='quick_escape')return !game.quickEscape;
  if(type==='tension_boost'||type==='pressure_blast')return game.damage<game.threshold-TENSION_STEP;
  return false;
}
/** Counter only an incoming attack and restore the exact pre-attack tension. */
export function applyCounter(game){
  if(game.phase!=='counter'||!game.pendingCounter)return game;
  return {...game,damage:game.pendingCounter.damageBefore,phase:'ready',pendingCounter:null,powerupNotice:'🛡️ COUNTER ATTACK! Incoming boost cancelled.'};
}
export function declineCounter(game){
  return game.phase==='counter'?{...game,phase:'ready',pendingCounter:null,powerupNotice:'Incoming attack accepted. Your turn.'}:game;
}
/** Lucky Roll is valid only before the first spray; it reuses the existing die rules. */
export function applyLuckyRoll(game,value,random=Math.random){
  if(game.phase!=='spraying'||game.sprayed!==0||game.luckyUsed)return game;
  const next=completeRoll({...game,phase:'ready',luckyUsed:true},value,random);
  return {...next,luckyUsed:true,powerupNotice:`🎲 Lucky Roll · new result: ${next.roll}.`};
}
/** @param {GameState} game @returns {GameState} */
export function nextTurn(game){const current=game.extraTurn?game.current:game.current===1?2:1;return {...game,current,rounds:game.rounds+(!game.extraTurn&&current===1?1:0),phase:'ready',roll:0,sprayed:0,shield:false,double:false,slippery:false,extraTurn:false,lastShieldBlock:false,lastQuickEscapeBlock:false,luckyUsed:false,aiBoostAttempted:false,card:''};}
/** @param {GameState} game @returns {GameState} */
export function rewindGame(game){
  if(!game.history.length||game.rewardsUsed>=1||game.phase!=='over')return game;
  const snapshot=game.history[0],steps=game.history.length;
  // Repair the last four sprays, then resume the existing die: never grant a reroll.
  return {...game,damage:snapshot.damage,total:snapshot.total,safeSprays:snapshot.safeSprays,sprayed:Math.max(0,game.sprayed-steps),phase:'spraying',fallVariant:null,history:[],rewardsUsed:game.rewardsUsed+1,lastShieldBlock:false,lastQuickEscapeBlock:false};
}
