import { supabase } from './supabase';

const TABLE = 'egg_native_progress';
const COLUMNS = 'user_id,level,coins,xp,wins,games,safe_sprays,best,progress,revision,updated_at';

/** Apply an account-owned progress update using the same revision guard as results. */
export async function updateNativeProgress(userId, update) {
  if (!userId || typeof update !== 'function') throw new Error('A signed-in account is required.');
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const current = await loadNativeProgress(userId);
    const payload = current.progress && typeof current.progress === 'object' && !Array.isArray(current.progress) ? current.progress : {};
    const patch = update({ ...current, progress: payload });
    if (!patch) return current;
    const revision = Math.max(0, Number(current.revision) || 0) + 1;
    const updatedAt = new Date().toISOString();
    const next = { ...current, ...patch, user_id: userId, revision, updated_at: updatedAt, _missing: false };
    next.progress = { ...payload, ...(patch.progress || {}), ownerId: userId, revision, savedAt: updatedAt };
    delete next._missing;
    if (current._missing) {
      const { data, error } = await supabase.from(TABLE).insert(next).select('user_id').maybeSingle();
      if (!error && data) return next;
      if (error?.code === '23505') continue;
      if (error) throw error;
      continue;
    }
    const { data, error } = await supabase.from(TABLE).update(next).eq('user_id', userId).eq('revision', Number(current.revision) || 0).select('user_id').maybeSingle();
    if (error) throw error;
    if (data) return next;
  }
  throw new Error('Progress changed at the same time; please try again.');
}

export async function loadNativeProgress(userId) {
  if (!userId) throw new Error('Sign in to load progress.');
  const { data, error } = await supabase.from(TABLE).select(COLUMNS).eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data ? { ...data, _missing: false } : { user_id: userId, level: 1, coins: 0, xp: 0, wins: 0, games: 0, safe_sprays: 0, best: 0, progress: {}, revision: 0, _missing: true };
}

// Idempotent per game ID and revision-checked so retries cannot double-award stats.
export async function saveNativeGameResult(userId, result) {
  if (!userId || !result?.gameId) throw new Error('A signed-in account and game ID are required.');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await loadNativeProgress(userId);
    const saved = current.progress && typeof current.progress === 'object' && !Array.isArray(current.progress) ? current.progress : {};
    const ids = Array.isArray(saved.nativeGameIds) ? saved.nativeGameIds : [];
    if (ids.includes(result.gameId)) return current;
    const wins = Math.max(0, Number(current.wins) || 0) + (result.won ? 1 : 0);
    const games = Math.max(0, Number(current.games) || 0) + 1;
    const xp = Math.max(0, Number(current.xp) || 0) + (result.won ? 60 : 0);
    const oldLevel = Math.max(1, Number(current.level) || 1);
    const playedLevel = Math.max(1, Number(result.level) || oldLevel);
    const levels = saved.levels && typeof saved.levels === 'object' && !Array.isArray(saved.levels) ? { ...saved.levels } : {};
    const firstClear = !!result.won && !Object.prototype.hasOwnProperty.call(levels, String(playedLevel));
    const oldStars = Number(levels[String(playedLevel)]) || 0;
    const earnedStars = result.won ? (Number(result.safeSprays) >= 8 ? 3 : Number(result.safeSprays) >= 4 ? 2 : 1) : 0;
    if (result.won) levels[String(playedLevel)] = Math.max(oldStars, earnedStars);
    const baseCoins = result.difficulty === 'easy' ? 120 : result.difficulty === 'hard' ? 240 : 180;
    const skillCoins = result.won ? Math.min(60, Math.max(0, Number(result.safeSprays) || 0) * 5) : 0;
    const clearCoins = firstClear ? 200 + Math.min(300, playedLevel * 10) : 0;
    const worldCoins = firstClear && playedLevel % 10 === 0 ? 500 : 0;
    const lossPenalty = result.difficulty === 'easy' ? 40 : result.difficulty === 'hard' ? 80 : 60;
    const coinDelta = result.won ? baseCoins + skillCoins + clearCoins + worldCoins : -Math.min(Math.max(0, Number(current.coins) || 0), lossPenalty);
    const coins = Math.max(0, (Number(current.coins) || 0) + coinDelta);
    const level = Math.max(oldLevel, result.won && result.gameMode !== 'tour' && playedLevel === oldLevel ? oldLevel + 1 : oldLevel);
    const revision = Math.max(0, Number(current.revision) || 0) + 1;
    const updatedAt = new Date().toISOString();
    const nextProgress = { ...saved, points: coins, coins, levels, level, wins, games, xp, nativeGameIds: [...ids, result.gameId].slice(-200), ownerId: userId, revision, savedAt: updatedAt };
    const row = {
      user_id: userId,
      level,
      coins,
      xp,
      wins,
      games,
      safe_sprays: Math.max(0, Number(current.safe_sprays) || 0) + Math.max(0, Number(result.safeSprays) || 0),
      best: Math.max(0, Number(current.best) || 0, result.won ? Number(result.safeSprays) || 0 : 0),
      progress: nextProgress,
      revision,
      updated_at: updatedAt,
    };
    if (current._missing) {
      const { data, error } = await supabase.from(TABLE).insert(row).select('user_id').maybeSingle();
      if (!error && data) return row;
      if (error?.code === '23505') continue;
      if (error) throw error;
      continue;
    }
    let query = supabase.from(TABLE).update(row).eq('user_id', userId);
    if (Number(current.revision) > 0) query = query.eq('revision', current.revision);
    else query = query.eq('revision', 0);
    const { data, error } = await query.select('user_id').maybeSingle();
    if (error) throw error;
    if (data) return { ...row };
    if (!current.revision) {
      const retry = await loadNativeProgress(userId);
      if (!retry.revision) throw new Error('Progress row is not initialized for this account.');
    }
  }
  throw new Error('Progress changed at the same time; please try syncing again.');
}
