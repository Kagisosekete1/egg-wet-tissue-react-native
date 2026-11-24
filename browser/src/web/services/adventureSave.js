import {supabase} from './client';
import {loadProgress,unlockedLevel} from '../progression';

// This is the existing per-account table also used by the Android client.
// Ranking points remain in game_profiles; adventure coins live in `coins`.
const TABLE='egg_native_progress';

export async function loadAdventureSave(userId){
  if(!userId)throw new Error('Sign in to load account progress.');
  const {data,error}=await supabase.from(TABLE).select('progress,level,coins,xp,wins,games,safe_sprays,best,revision,updated_at').eq('user_id',userId).maybeSingle();
  if(error)throw error;
  if(!data)return null;
  const stored=validObject(data.progress)?data.progress:{};
  const restored={
    version:1,
    ...stored,
    points:numberOr(stored.points,data.coins),
    xp:numberOr(stored.xp,data.xp),
    wins:numberOr(stored.wins,data.wins),
    games:numberOr(stored.games,data.games),
    safeSprays:numberOr(stored.safeSprays,data.safe_sprays),
    best:numberOr(stored.best,data.best),
  };
  return {...loadProgress(JSON.stringify(restored)),revision:Number(data.revision)||0,savedAt:data.updated_at};
}

// Clear receipts are the durable level record. The native progress row is
// queried too so a restored snapshot and the visible level cannot disagree.
export async function loadAdventureLevel(userId){
  if(!userId)throw new Error('Sign in to load account progress.');
  const [{data:native,error:nativeError},{data:levels,error:levelError}]=await Promise.all([
    supabase.from(TABLE).select('level').eq('user_id',userId).maybeSingle(),
    supabase.rpc('get_egg_adventure_levels'),
  ]);
  if(nativeError)throw nativeError;
  if(levelError&&levelError.code!=='PGRST202'&&levelError.status!==404)throw levelError;
  const row=(Array.isArray(levels)?levels:[]).find(item=>item.user_id===userId);
  return Math.max(1,Number(native?.level)||1,Number(row?.adventure_level)||1);
}

export async function saveAdventureSave(userId,progress){
  if(!userId)throw new Error('Sign in to save account progress.');
  const savedAt=new Date().toISOString();
  const {data:current,error:readError}=await supabase.from(TABLE).select('revision').eq('user_id',userId).maybeSingle();
  if(readError)throw readError;
  const revision=Math.max(Number(current?.revision)||0,Number(progress.revision)||0)+1;
  const snapshot={...progress,ownerId:userId,revision,savedAt};
  const {error}=await supabase.from(TABLE).upsert({
    user_id:userId,
    level:unlockedLevel(snapshot),
    coins:Math.max(0,Number(snapshot.points)||0),
    xp:Math.max(0,Number(snapshot.xp)||0),
    wins:Math.max(0,Number(snapshot.wins)||0),
    games:Math.max(0,Number(snapshot.games)||0),
    safe_sprays:Math.max(0,Number(snapshot.safeSprays)||0),
    best:Math.max(0,Number(snapshot.best)||0),
    progress:snapshot,
    revision,
    updated_at:savedAt,
  },{onConflict:'user_id'});
  if(error)throw error;
  return snapshot;
}

function validObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function numberOr(value,fallback){const n=Number(value);return Number.isFinite(n)?n:Number(fallback)||0;}

export function hasAdventureProgress(progress){
  if(!progress)return false;
  return Number(progress.points)>0||Number(progress.xp)>0||Number(progress.wins)>0||Number(progress.games)>0||Number(progress.safeSprays)>0||Number(progress.best)>0||Number(progress.winStreak)>0||Object.keys(progress.levels||{}).length>0||Array.isArray(progress.history)&&progress.history.length>0||Object.keys(progress.inventory||{}).length>0||Array.isArray(progress.shields)&&progress.shields.length>0||Array.isArray(progress.milestones)&&progress.milestones.length>0||Number(progress.welcomeClaimed)>0||Object.keys(progress.gifts||{}).length>0;
}
