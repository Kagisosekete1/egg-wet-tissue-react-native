import { supabase } from './supabase';

export const SHIELD_CATALOG = [
  { type: 'basic', name: 'Bubble Shield', price: 5000, hits: 1, icon: '🛡️', tone: '#69c9ff', description: 'Blocks one fall or hit.' },
  { type: 'golden', name: 'Golden Shield', price: 10000, hits: 2, icon: '✨', tone: '#ffd34f', description: 'Golden protection for two hits.' },
  { type: 'super', name: 'Rainbow Shield', price: 20000, hits: 3, icon: '💎', tone: '#c38aff', description: 'A strong force field for three hits.' },
];

export async function loadShieldInventory(userId) {
  if (!userId) return [];
  const { data, error } = await supabase.from('game_shields')
    .select('id,shield_type,max_hits,remaining_hits,equipped,created_at')
    .eq('user_id', userId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function loadEquippedShield(userId) {
  if (!userId) return null;
  const { data, error } = await supabase.from('game_shields')
    .select('id,shield_type,max_hits,remaining_hits,equipped')
    .eq('user_id', userId).eq('equipped', true).maybeSingle();
  if (error) throw error;
  return data;
}

export async function purchaseShield(shieldType, requestId) {
  const { data, error } = await supabase.rpc('purchase_game_shield', {
    p_shield_type: shieldType,
    p_request_id: requestId,
  });
  if (error) throw error;
  return data;
}

export async function equipShield(shieldId) {
  const { data, error } = await supabase.rpc('equip_game_shield', { p_shield_id: shieldId || null });
  if (error) throw error;
  return data;
}

export async function consumeShieldHit(shieldId, eventId) {
  const { data, error } = await supabase.rpc('consume_game_shield_hit', {
    p_shield_id: shieldId,
    p_event_id: eventId,
  });
  if (error) throw error;
  return data;
}
