import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Avatar, Button, Flag, Screen, Title, s, C } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { loadLeaderboard } from '../../src/lib/profiles';
import { loadNativeProgress } from '../../src/lib/nativeProgress';
import LineIcon from '../../src/components/LineIcon';

export default function Leaderboard() {
  const { user } = useAuth();
  const userId = user?.id;
  const { height } = useWindowDimensions();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const ranked = await loadLeaderboard();
      if (userId) {
        const saved = await loadNativeProgress(userId);
        setRows(ranked.map(row => row.id === userId ? { ...row, wins: Number(saved.wins) || 0, level: row.level ?? (Number(saved.level) || 1) } : row));
      } else setRows(ranked);
    }
    catch { setError('Could not load players. Please try again.'); }
    finally { setLoading(false); }
  }, [userId]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  const myIndex = rows.findIndex(row => row.id === user?.id);
  const me = rows[myIndex];

  return <Screen>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Pressable onPress={() => router.back()} accessibilityLabel="Back" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 15, borderWidth: 1.5, borderColor: C.line, backgroundColor: '#eadcf8' }}><Text style={{ fontSize: 27, lineHeight: 31, color: C.ink }}>‹</Text></Pressable>
      <View style={{ flex: 1 }}><Text style={{ color: C.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.8 }}>EGG & WET TISSUE</Text><Title>The egg hall of fame</Title></View>
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Flag code="ZA"/><Text style={s.muted}>Worldwide players · Tap a player to view their profile</Text></View>

    {me && <View style={{ padding: 18, gap: 10, borderRadius: 26, borderWidth: 1.5, borderColor: '#c9acd9', backgroundColor: '#f4e8f6', alignItems: 'center' }}>
      <LineIcon name="rankings" size={55} color={C.ink}/>
      <Text style={{ color: C.muted, fontWeight: '900', letterSpacing: 1.6, fontSize: 11 }}>THE ORIGINAL WORLDWIDE LEADERBOARD</Text>
      <Text style={{ color: C.ink, fontSize: 22, fontWeight: '900' }}>Every egg. Every point.</Text>
      <Text style={[s.muted, { textAlign: 'center' }]}>You’re #{myIndex + 1} with {Number(me.points || 0).toLocaleString()} points. Your wins are saved with your account.</Text>
      <Button title="Refresh rankings" onPress={load} disabled={loading}/>
    </View>}

    <View style={{ height: Math.max(400, height * .56), gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Title small>Rankings</Title><Pressable onPress={load} accessibilityRole="button" accessibilityLabel="Refresh rankings"><Text style={{ color: C.ink, fontWeight: '900', padding: 8 }}>Refresh</Text></Pressable></View>
      {loading && rows.length === 0 ? <ActivityIndicator color={C.ink}/> : null}
      {error ? <View><Text style={s.muted}>{error}</Text><Button title="Try again" secondary onPress={load}/></View> : null}
      {!loading && rows.length === 0 && !error ? <Text style={s.muted}>Players will appear here once their profiles are available.</Text> : null}
      <ScrollView nestedScrollEnabled style={{ flex: 1 }} contentContainerStyle={{ gap: 9, paddingBottom: 16 }}>
        {rows.map((row, index) => <Pressable key={row.id} onPress={() => router.push({ pathname: '/profile', params: { id: row.id } })} style={({ pressed }) => ({ minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 22, borderWidth: 1.5, borderColor: row.id === user?.id ? '#9460bd' : C.line, backgroundColor: row.id === user?.id ? '#efdefa' : '#fffaf0', opacity: pressed ? .78 : 1 })}>
          <View style={{ width: 35, alignItems: 'center' }}><Text style={{ color: index < 3 ? '#9163ae' : C.muted, fontWeight: '900', fontSize: 15 }}>{index < 3 ? '🏆' : `#${index + 1}`}</Text><Text style={{ color: C.muted, fontWeight: '800', fontSize: 11 }}>#{index + 1}</Text></View>
          <Avatar uri={row.avatar_url} size={48}/>
          <View style={{ flex: 1, gap: 3 }}><Text numberOfLines={1} style={{ fontWeight: '900', fontSize: 14, color: C.ink }}>{row.username}{row.id === user?.id ? ' · You' : ''}</Text><View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Flag code={row.country_code}/><Text style={{ color: C.muted, fontSize: 12, fontWeight: '700' }}>{row.wins} wins · Level {row.level ?? '—'}</Text></View></View>
          <Text style={{ fontWeight: '900', color: C.ink, textAlign: 'right', fontSize: 18 }}>{Number(row.points || 0).toLocaleString()}<Text style={{ fontSize: 10, color: C.muted }}>{'\n'}POINTS</Text></Text>
        </Pressable>)}
      </ScrollView>
    </View>
  </Screen>;
}
