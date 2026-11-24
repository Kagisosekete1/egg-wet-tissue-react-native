import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { updateNativeProgress } from './nativeProgress';
import { uuid } from '../game/rules';

const COINS_BY_DAY = [100, 150, 200, 250, 300, 400, 600];
const pendingKey = userId => `egg-native-pending-gift-${userId}`;
const dateKey = date => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);

function giftDay(progress, now = new Date()) {
  const gifts = progress?.progress?.gifts || {};
  const previousAt = Number(gifts.lastClaimAt) || 0;
  const elapsed = previousAt ? now.getTime() - previousAt : 0;
  const continues = previousAt && elapsed >= 24 * 60 * 60 * 1000 && elapsed < 48 * 60 * 60 * 1000;
  const streak = continues ? (Number(gifts.streak) || 0) + 1 : 1;
  return { day: (streak - 1) % 7 + 1, streak, key: dateKey(now), claimedToday: gifts.lastDate === dateKey(now) };
}

export async function loadNativeRewardStatus(userId) {
  if (!userId) return { ready: false, nextClaimAt: 0, error: 'Sign in to collect daily gifts.' };
  const { data, error } = await supabase.rpc('get_game_reward_status');
  if (error) return { ready: false, nextClaimAt: 0, error: 'Daily gifts could not load. Check your connection.' };
  return { ready: true, nextClaimAt: Date.parse(data?.next_claim_at) || 0, serverNow: Date.parse(data?.server_time) || Date.now(), checkedAt: Date.now() };
}

export async function claimNativeDailyGift(userId, onReceipt) {
  if (!userId) throw new Error('Sign in before collecting a daily gift.');
  let pending;
  try { pending = JSON.parse(await AsyncStorage.getItem(pendingKey(userId)) || 'null'); } catch { pending = null; }
  const now = new Date();
  if (!pending || !pending.request_id || !pending.key || Date.now() - Date.parse(pending.created_at) > 48 * 60 * 60 * 1000) {
    pending = { request_id: uuid(), kind: 'daily', key: dateKey(now), created_at: now.toISOString() };
    await AsyncStorage.setItem(pendingKey(userId), JSON.stringify(pending));
  }

  const { data: receipt, error } = await supabase.rpc('claim_game_reward', {
    p_request_id: pending.request_id,
    p_reward_kind: 'daily',
    p_reward_key: pending.key,
  });
  if (error) throw new Error(error.message?.includes('cooldown') ? 'A gift was already collected recently. Please come back later.' : 'Gift could not be confirmed. Please try again.');
  if (receipt?.request_id !== pending.request_id || !Date.parse(receipt.claimed_at)) throw new Error('Gift confirmation was incomplete. Please retry.');

  const giftDate = new Date(receipt.claimed_at);
  let coinsAwarded = 0;
  await updateNativeProgress(userId, current => {
    const payload = current.progress || {};
    const claimed = Array.isArray(payload.nativeGiftRequestIds) ? payload.nativeGiftRequestIds : [];
    if (claimed.includes(pending.request_id)) {
      coinsAwarded = Number(payload.nativeGiftReceipts?.[pending.request_id]) || 0;
      return null;
    }
    const gift = giftDay(current, giftDate);
    const coins = COINS_BY_DAY[gift.day - 1];
    coinsAwarded = coins;
    return {
      coins: Math.max(0, Number(current.coins) || 0) + coins,
      progress: {
        coins: Math.max(0, Number(current.coins) || 0) + coins,
        nativeGiftRequestIds: [...claimed, pending.request_id].slice(-100),
        nativeGiftReceipts: { ...payload.nativeGiftReceipts, [pending.request_id]: coins },
        gifts: { ...payload.gifts, lastDate: pending.key, lastClaimAt: giftDate.getTime(), streak: gift.streak },
      },
    };
  });
  await AsyncStorage.removeItem(pendingKey(userId));
  onReceipt?.(receipt);
  return { coins: coinsAwarded, nextClaimAt: Date.parse(receipt.next_claim_at) || 0 };
}

export { giftDay, COINS_BY_DAY };
