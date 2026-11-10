import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Avatar, Button, Card, Flag, Screen, Title, Header, s, C } from '../../src/components/ui';
import { useAuth } from '../../src/context/AuthContext';
import { loadLeaderboard } from '../../src/lib/profiles';

export default function Leaderboard(){
  const {user}=useAuth(),{height}=useWindowDimensions();const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const load=useCallback(async()=>{setLoading(true);setError('');try{setRows(await loadLeaderboard());}catch{setError('Could not load players. Please try again.');}finally{setLoading(false);}},[]);
  useFocusEffect(useCallback(()=>{load();},[load]));const myIndex=rows.findIndex(r=>r.id===user?.id),me=rows[myIndex];
  return <Screen><Header title="Leaderboard" back={false}/><Text style={s.muted}>Every player. Every point. Tap a player to see their profile.</Text>{me&&<Card style={{borderColor:C.gold}}><Title small>Your position · #{myIndex+1}</Title><Text style={{color:C.gold,fontWeight:'900',fontSize:22}}>{me.points} points <Text style={s.muted}> · {me.wins} wins</Text></Text></Card>}
    <Card style={{height:Math.max(480,height*.72),padding:14}}><View style={s.headerRow}><Title small>Worldwide players</Title><Pressable onPress={load} accessibilityLabel="Refresh leaderboard"><Text style={{color:C.gold,fontWeight:'800'}}>Refresh</Text></Pressable></View>{loading&&rows.length===0?<ActivityIndicator color={C.gold}/>:null}{error?<View><Text style={s.muted}>{error}</Text><Button title="Try again" secondary onPress={load}/></View>:null}{!loading&&rows.length===0&&!error?<Text style={s.muted}>Players will appear here once their profiles are available.</Text>:null}<ScrollView nestedScrollEnabled style={{flex:1}}>{rows.map((r,i)=><Pressable key={r.id} onPress={()=>router.push({pathname:'/profile',params:{id:r.id}})} style={[s.row,{paddingVertical:14,borderBottomWidth:1,borderColor:C.line,backgroundColor:r.id===user?.id?'#ebdfff':'transparent',borderRadius:12,paddingHorizontal:4}]}><Text style={{width:30,fontWeight:'900',color:i<3?C.gold:C.muted}}>#{i+1}</Text><Avatar uri={r.avatar_url} size={44}/><View style={{flex:1,gap:3}}><Text style={{fontWeight:'900',fontSize:15,color:C.ink}}>{r.username}</Text><View style={s.row}><Flag code={r.country_code}/><Text style={s.muted}>{r.wins} wins</Text></View></View><Text style={{fontWeight:'900',color:C.gold}}>{r.points}{'\n'}<Text style={{fontSize:11}}>POINTS</Text></Text></Pressable>)}</ScrollView></Card>
  </Screen>;
}
