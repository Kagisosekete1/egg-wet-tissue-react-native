import {supabase} from './client';
import {uuid} from '../rules';
async function rpc(name,args){const {data,error}=await supabase.rpc(name,args);if(error)throw error;return data;}
export const createInvite=(opponentId,stakePoints,requestId=uuid())=>rpc('create_staked_battle_invite',{p_opponent_id:opponentId,p_stake_points:stakePoints,p_request_id:requestId});
export const respondInvite=(id,accept)=>rpc('respond_staked_battle_invite',{p_challenge_id:id,p_accept:accept});
export const rollBattle=id=>rpc('battle_roll',{p_battle_id:id});
export const sprayBattle=id=>rpc('battle_spray',{p_battle_id:id});
export const forfeitBattle=id=>rpc('battle_forfeit',{p_battle_id:id});
export async function loadInvites(userId){try{await supabase.rpc('expire_staked_battle_invites');}catch{};const {data,error}=await supabase.from('game_challenges').select('*,challenger:game_profiles!game_challenges_challenger_id_fkey(id,username,avatar_url,country_code),challenged:game_profiles!game_challenges_challenged_id_fkey(id,username,avatar_url,country_code)').or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`).order('created_at',{ascending:false}).limit(60);if(error)throw error;return data||[];}
export async function loadBattle(id){const {data,error}=await supabase.from('game_battles').select('*,player_one_profile:game_profiles!game_battles_player_one_fkey(id,username,country_code,avatar_url),player_two_profile:game_profiles!game_battles_player_two_fkey(id,username,country_code,avatar_url)').eq('id',id).single();if(error)throw error;return data;}
export async function notifyInvite(id){const {data,error}=await supabase.functions.invoke('send-challenge',{body:{challenge_id:id}});return !error&&data?.delivered===true;}
export async function notifyBattle(event,values){const {data,error}=await supabase.functions.invoke('send-battle-update',{body:{event,...values}});return !error&&data?.delivered===true;}
