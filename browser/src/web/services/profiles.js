import {read,write} from '../play-ui';
const AsyncStorage={getItem:async key=>read(key,null),setItem:async(key,value)=>write(key,value)};
import { supabase } from './client';

const number = (...values) => Math.max(0, ...values.map(v => Number(v) || 0));
export function usernameFor(user, profile) { return String(profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Player').slice(0, 24); }
export function normalizeProfile(row) {
  const stats = row.stats || row.game_stats || {};
  const categoryWins = number(row.wins_computer, row.computer_wins, stats.computer, stats.c) + number(row.wins_friend, row.wins_friends, row.friend_wins, stats.friends, stats.f) + number(row.wins_online, row.online_wins, stats.online, stats.o);
  const wins = number(row.wins, row.total_wins, categoryWins);
  const hasScore = ['points','score','total_points','total_score'].some(key=>row[key]!==undefined&&row[key]!==null);
  return { id: row.user_id || row.id, username: String(row.username || row.display_name || row.name || 'Player').slice(0,24), country_code: /^[A-Z]{2}$/i.test(row.country_code || row.country || '') ? (row.country_code || row.country).toUpperCase() : 'ZA', points: number(row.points, row.score, row.total_points, row.total_score, hasScore?0:categoryWins * 10), wins, avatar_url: row.avatar_url || row.profile_photo_url || row.photo_url || row.profile_picture || null, created_at: row.created_at || '' };
}
export function mergeProfiles(current, legacy) {
  const merged = new Map();
  for (const row of [...legacy, ...current]) {
    const next = normalizeProfile(row); if (!next.id) continue;
    const old = merged.get(next.id);
    // game_profiles is the live score source. Legacy profiles are loaded first
    // as a fallback, so let the newer game profile replace its score even when
    // it is lower after a loss.
    merged.set(next.id, old ? { ...old, ...next, username: next.username === 'Player' ? old.username : next.username, avatar_url: next.avatar_url || old.avatar_url } : next);
  }
  return [...merged.values()].sort((a,b) => b.points-a.points || b.wins-a.wins || a.created_at.localeCompare(b.created_at) || a.username.localeCompare(b.username));
}
async function readPlayers(table) {
  const rows = [];
  for (let offset=0; offset<10000; offset+=500) {
    const {data,error} = await supabase.from(table).select('*').range(offset,offset+499);
    if (error) return { rows, error };
    rows.push(...(data || [])); if (!data || data.length < 500) break;
  }
  return {rows,error:null};
}
export async function loadLeaderboard() {
  const {data:ranked,error:rankError}=await supabase.rpc('get_game_leaderboard');
  if(!rankError)return mergeProfiles(ranked||[],[]);
  const [current, legacy] = await Promise.all([readPlayers('game_profiles'), readPlayers('profiles')]);
  if (current.error && legacy.error) throw current.error;
  const rows = mergeProfiles(current.rows, legacy.rows);
  return rows;
}
export async function ensureGameProfile(user) {
  if (!user?.id) return;
  const {data,error:readError} = await supabase.from('game_profiles').select('id').eq('id',user.id).maybeSingle();
  if (readError) throw readError; if (data) return;
  const {error} = await supabase.from('game_profiles').insert({id:user.id,username:usernameFor(user),country_code:user.user_metadata?.country_code || 'ZA'});
  if (error && error.code !== '23505') throw error;
}
export async function loadProfile(id, user) {
  const [current,legacy] = await Promise.all([supabase.from('game_profiles').select('*').eq('id',id).maybeSingle(),supabase.from('profiles').select('*').eq('id',id).maybeSingle()]);
  const rows = mergeProfiles(current.data ? [current.data] : [], legacy.data ? [legacy.data] : []);
  const row = rows[0];
  if (row) return {...row,avatar_url:row.avatar_url || (user?.id===id ? user.user_metadata?.avatar_url : null)};
  if (user?.id===id) return {id,username:usernameFor(user),country_code:user.user_metadata?.country_code || 'ZA',avatar_url:user.user_metadata?.avatar_url || null,points:0,wins:0};
  return null;
}
export async function savePlayerProfile(user, patch) {
  if (!user?.id) throw new Error('Please sign in again to save your profile.');
  await ensureGameProfile(user);
  // UPDATE avoids the older INSERT grant rejecting avatar_url in an upsert.
  let {error} = await supabase.rpc('save_game_profile',{p_username:patch.username,p_country_code:patch.country_code,p_avatar_url:patch.avatar_url});
  if(error?.code==='PGRST202')({error}=await supabase.from('game_profiles').update({...patch,updated_at:new Date().toISOString()}).eq('id',user.id));
  if (error) throw error;
  const {error:authError} = await supabase.auth.updateUser({data:patch}); if (authError) throw authError;
}
/** @param {{difficulty?:string,safeSprays?:number,rounds?:number,won?:boolean,finalRoll?:number}} params */
export function gamePoints({difficulty='normal',safeSprays=0,rounds=0,won=false}) {
  const multiplier=({easy:1,normal:1.5,hard:2}[difficulty]||1);
  const base=Math.min(60,Math.max(0,safeSprays)*2)+Math.min(20,Math.max(0,rounds)*2)+20;
  const points=Math.floor(base*multiplier);
  return won ? points : -points;
}
export async function recordGameResult(result) {
  const {data,error} = await supabase.rpc('record_game_result',{p_game_id:result.gameId,p_difficulty:result.difficulty,p_game_mode:result.gameMode,p_opponent:result.mode,p_safe_sprays:result.safeSprays,p_rounds:result.rounds,p_final_roll:result.finalRoll||1,p_won:result.won});
  if (error) throw error; return data;
}
export async function savePendingResult(userId,result) {
  const key=`egg-pending-results-${userId}`; const pending=JSON.parse(await AsyncStorage.getItem(key)||'[]');
  if (!pending.some(p=>p.gameId===result.gameId)) await AsyncStorage.setItem(key,JSON.stringify([...pending,result]));
}
export async function syncPendingResults(userId) {
  const key=`egg-pending-results-${userId}`; const pending=JSON.parse(await AsyncStorage.getItem(key)||'[]'); const remaining=[];
  for(const result of pending) { try { await recordGameResult(result); } catch { remaining.push(result); } }
  await AsyncStorage.setItem(key,JSON.stringify(remaining));
}
