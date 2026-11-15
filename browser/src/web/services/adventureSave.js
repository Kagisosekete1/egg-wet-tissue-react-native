import {supabase} from './client';
import {loadProgress} from '../progression';

const TABLE='egg_adventure_saves';

export async function loadAdventureSave(userId){
  if(!userId)throw new Error('Sign in to load account progress.');
  const {data,error}=await supabase.from(TABLE).select('progress,updated_at').eq('user_id',userId).maybeSingle();
  if(error)throw error;
  if(!data)return null;
  return {...loadProgress(JSON.stringify(data.progress)),savedAt:data.updated_at};
}

export async function saveAdventureSave(userId,progress){
  if(!userId)throw new Error('Sign in to save account progress.');
  const savedAt=new Date().toISOString();
  const snapshot={...progress,savedAt};
  const {error}=await supabase.from(TABLE).upsert({user_id:userId,progress:snapshot,updated_at:savedAt},{onConflict:'user_id'});
  if(error)throw error;
  return snapshot;
}

export function hasAdventureProgress(progress){
  if(!progress)return false;
  return Number(progress.points)>0||Number(progress.xp)>0||Number(progress.wins)>0||Number(progress.games)>0||Object.keys(progress.levels||{}).length>0||Array.isArray(progress.history)&&progress.history.length>0||Object.keys(progress.inventory||{}).length>0||Array.isArray(progress.shields)&&progress.shields.length>0;
}
