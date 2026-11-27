import { supabase } from './supabase';
import { uuid } from '../game/rules';

export async function createBattleInvite(opponentId, stakePoints) {
  const { data, error } = await supabase.rpc('create_staked_battle_invite', {
    p_opponent_id: opponentId,
    p_stake_points: stakePoints,
    p_request_id: uuid(),
  });
  if (error) throw error;
  return data;
}

export async function respondToBattleInvite(challengeId, accept) {
  const { data, error } = await supabase.rpc('respond_staked_battle_invite', {
    p_challenge_id: challengeId,
    p_accept: accept,
  });
  if (error) throw error;
  return data;
}

export async function expireBattleInvites() {
  const { error } = await supabase.rpc('expire_staked_battle_invites');
  if (error) throw error;
}

export async function loadBattle(battleId) {
  const { data, error } = await supabase
    .from('game_battles')
    .select('*, player_one_profile:game_profiles!game_battles_player_one_fkey(id,username,country_code,avatar_url), player_two_profile:game_profiles!game_battles_player_two_fkey(id,username,country_code,avatar_url)')
    .eq('id', battleId)
    .single();
  if (error) throw error;
  return data;
}

export async function rollBattle(battleId) {
  const { data, error } = await supabase.rpc('battle_roll', { p_battle_id: battleId });
  if (error) throw error;
  return data;
}

export async function sprayBattle(battleId) {
  const { data, error } = await supabase.rpc('battle_spray', { p_battle_id: battleId });
  if (error) throw error;
  return data;
}

export async function useBattlePowerup(battleId, powerupType, actionId) {
  const { data, error } = await supabase.rpc('battle_use_powerup', {
    p_battle_id: battleId,
    p_powerup_type: powerupType,
    p_action_id: actionId,
  });
  if (error) throw error;
  return data;
}

export async function forfeitBattle(battleId) {
  const { data, error } = await supabase.rpc('battle_forfeit', { p_battle_id: battleId });
  if (error) throw error;
  return data;
}
