import {read,write} from '../play-ui';
import {supabase} from './client';
import {accountRpc} from './account-rpc';
import {ResultQueue} from '../result-queue';
import {avatarSources} from '../avatars';

const number = (...values) => Math.max(0, ...values.map(v => Number(v) || 0));
export function usernameFor(user, profile) { return String(profile?.username || user?.user_metadata?.username || user?.email?.split('@')[0] || 'Player').slice(0, 24); }
export function normalizeProfile(row) {
  const stats = row.stats || row.game_stats || {};
  const categoryWins = number(row.wins_computer, row.computer_wins, stats.computer, stats.c) + number(row.wins_friend, row.wins_friends, row.friend_wins, stats.friends, stats.f) + number(row.wins_online, row.online_wins, stats.online, stats.o);
  const wins = number(row.wins, row.total_wins, categoryWins);
  const hasScore = ['points','score','total_points','total_score'].some(key=>row[key]!==undefined&&row[key]!==null);
  return { id: row.user_id || row.id, username: String(row.username || row.display_name || row.name || 'Player').slice(0,24), country_code: /^[A-Z]{2}$/i.test(row.country_code || row.country || '') ? (row.country_code || row.country).toUpperCase() : 'ZA', points: number(row.points, row.score, row.total_points, row.total_score, hasScore?0:categoryWins * 10), wins, avatar_url: avatarSources(row)[0]||null, avatar_urls:avatarSources(row), created_at: row.created_at || '' };
}
export function mergeProfiles(current, legacy) {
  const merged = new Map();
  for (const row of [...legacy, ...current]) {
    const next = normalizeProfile(row); if (!next.id) continue;
    const old = merged.get(next.id);
    // game_profiles is the live score source. Legacy profiles are loaded first
    // as a fallback, so let the newer game profile replace its score even when
    // it is lower after a loss.
    merged.set(next.id, old ? { ...old, ...next, username: next.username === 'Player' ? old.username : next.username, avatar_url: next.avatar_url || old.avatar_url,avatar_urls:[...new Set([...next.avatar_urls,...old.avatar_urls])] } : next);
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
 const [rank,current,legacy]=await Promise.all([supabase.rpc('get_game_leaderboard'),readPlayers('game_profiles'),readPlayers('profiles')]);
 if(rank.error&&current.error&&legacy.error)throw rank.error;
 const photos=new Map(mergeProfiles(current.rows||[],legacy.rows||[]).map(p=>[p.id,p]));
 const ranking=rank.error?mergeProfiles(current.rows||[],legacy.rows||[]):mergeProfiles(rank.data||[],[]);
 return ranking.map(p=>{const sources=[...new Set([...avatarSources(p),...avatarSources(photos.get(p.id))])];return {...p,avatar_url:sources[0]||null,avatar_urls:sources};});
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
  if (row) return {...row,avatar_url:row.avatar_url || (user?.id===id ? avatarSources(user.user_metadata)[0] : null)};
  if (user?.id===id) return {id,username:usernameFor(user),country_code:user.user_metadata?.country_code || 'ZA',avatar_url:avatarSources(user.user_metadata)[0]||null,points:0,wins:0};
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
export async function recordGameResult(result,expectedUserId) {
 return accountRpc('record_game_result',{p_game_id:result.gameId,p_difficulty:result.difficulty,p_game_mode:result.gameMode,p_opponent:result.mode,p_safe_sprays:result.safeSprays,p_rounds:result.rounds,p_final_roll:result.finalRoll||1,p_won:result.won},expectedUserId);
}

const resultQueue=new ResultQueue({read,write,submit:recordGameResult,notify:detail=>{window.dispatchEvent(new CustomEvent('egg-ranking-result',{detail}));}});
export function pendingResultCount(userId){return userId?resultQueue.pending(userId).length:0;}
export async function savePendingResult(userId,result){resultQueue.enqueue(userId,result);window.dispatchEvent(new Event('egg-ranking-queue'));}
export async function syncPendingResults(userId){const report=await resultQueue.flush(userId);if(report.synced.length)window.dispatchEvent(new Event('egg-account-updated'));return report;}
