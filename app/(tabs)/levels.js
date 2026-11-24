import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Button, Screen, Title, s, C } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { loadNativeProgress } from '../../src/lib/nativeProgress';
import { levelAt } from '../../browser/src/web/progression';
import { worldAt } from '../../browser/src/web/worlds';

const styleName = mode => ({ classic: 'Classic', sudden: 'Sudden Death', chaos: 'Chaos Cards', tour: 'Tournament' }[mode] || 'Classic');

export default function Levels() {
  const { user } = useAuth();
  const userId = user?.id;
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    if (!userId) { setProgress(null); setLoading(false); return; }
    try { setProgress(await loadNativeProgress(userId)); }
    catch { setError('Your levels could not sync. Please try again.'); }
    finally { setLoading(false); }
  }, [userId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const current = Math.max(1, Number(progress?.level) || 1);
  const last = Math.max(20, current + 10);
  const worldIndex = Math.floor((current - 1) / 10);
  const currentWorld = worldAt(worldIndex);
  const levelRows = Array.from({ length: last }, (_, i) => i + 1);

  return <Screen>
    <View style={{ gap: 3 }}><Text style={{ color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>YOUR ADVENTURE · LEVEL {current}</Text><Title>{currentWorld.name}</Title><Text style={s.muted}>A winding trail of egg-ventures. Win a level to move ahead.</Text></View>
    <View style={{ padding: 17, borderRadius: 24, borderWidth: 1.5, borderColor: '#b997cc', backgroundColor: '#efdefa', gap: 8 }}>
      <Text style={{ color: '#8a4bb0', fontWeight: '900', letterSpacing: 1.4, fontSize: 11 }}>YOUR CURRENT LEVEL</Text>
      <Text style={{ color: C.ink, fontSize: 23, fontWeight: '900' }}>{currentWorld.name}</Text>
      <Text style={s.muted}>Level {current} · {(Number(progress?.wins) || 0).toLocaleString()} wins · {(Number(progress?.coins) || 0).toLocaleString()} coins</Text>
      {error ? <Text style={{ color: C.red, fontWeight: '800' }}>{error}</Text> : null}
      {user ? <Button title="Find my level" secondary onPress={() => router.push({ pathname: '/game', params: { level: String(current) } })}/> : <Button title="Sign in to see saved levels" onPress={() => router.push('/auth')}/>}
    </View>
    {!user ? <Text style={s.muted}>Sign in to load your saved adventure and unlock levels.</Text> : null}
    {loading ? <ActivityIndicator color={C.ink}/> : levelRows.map(level => {
      const unlocked = level <= current;
      const active = level === current;
      const worldIndexForLevel = Math.floor((level - 1) / 10);
      const world = worldAt(worldIndexForLevel);
      const levelData = levelAt(level);
      const surface = world.sky?.[1] || '#f4e8f6';
      return <React.Fragment key={level}>
        {level % 10 === 1 && <View style={{ marginTop: level === 1 ? 4 : 10, padding: 13, borderRadius: 18, borderWidth: 1.5, borderColor: world.middle || C.line, backgroundColor: surface }}><Text style={{ color: C.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 }}>WORLD {world.number}</Text><Text style={{ color: C.ink, fontSize: 19, fontWeight: '900' }}>{world.name}</Text><Text style={s.muted}>{worldIndexForLevel === 0 ? 'Start small. Splash big.' : 'A fresh setting. Ten new challenges.'}</Text></View>}
        <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 10, minHeight: 102 }}>
        <View style={{ width: 34, alignItems: 'center' }}><View style={{ width: 3, flex: 1, backgroundColor: level === 1 ? 'transparent' : '#d8bce7' }}/><View style={{ position: 'absolute', top: 12, width: 31, height: 31, borderRadius: 12, borderWidth: 2, borderColor: active ? C.ink : '#9e7caf', alignItems: 'center', justifyContent: 'center', backgroundColor: active ? C.gold : unlocked ? '#78ddbf' : '#eee5f0' }}><Text style={{ color: C.ink, fontSize: 13, fontWeight: '900' }}>{level}</Text></View><View style={{ width: 3, flex: 1, backgroundColor: '#d8bce7' }}/></View>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !unlocked }} disabled={!unlocked} onPress={() => router.push({ pathname: '/game', params: { level: String(level) } })} style={({ pressed }) => ({ flex: 1, marginBottom: 8, padding: 12, borderRadius: 21, borderWidth: active ? 2 : 1.2, borderColor: active ? '#9560b9' : '#bfd9d1', backgroundColor: active ? '#f3e4f9' : unlocked ? surface : '#fffaf0', opacity: pressed ? .8 : unlocked ? 1 : .58, justifyContent: 'center' })}>
          <Text style={{ color: active ? '#8a4bb0' : C.muted, fontWeight: '900', fontSize: 10, letterSpacing: 1.3 }}>{active ? `LEVEL ${level} · YOU ARE HERE` : `LEVEL ${level}`}</Text>
          <Text style={{ color: C.ink, fontWeight: '900', fontSize: 16 }}>{levelData.title}</Text>
          <Text style={{ color: C.muted, fontSize: 12 }}>{styleName(levelData.gameMode)} · {levelData.difficulty}{level % 10 === 0 ? ' · World champion' : ''}</Text>
          <Text style={{ color: C.muted, fontSize: 11 }}>{unlocked ? level === current ? 'You are here · Play this level' : 'Win: first-clear coin bonus + next level' : 'Clear the previous level first'}</Text>
        </Pressable>
        </View>
      </React.Fragment>;
    })}
    <Text style={[s.muted, { textAlign: 'center', paddingBottom: 8 }]}>There is no final world. Win to advance. Every tenth level brings a tougher challenge.</Text>
  </Screen>;
}
