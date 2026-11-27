import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Avatar, Button, Card, Header, Screen, Title, s, C } from '../src/components/ui';
import { useAuth } from '../src/context/AuthContext';
import { useProfile } from '../src/context/ProfileContext';
import { expireBattleInvites, respondToBattleInvite } from '../src/lib/battles';
import { supabase } from '../src/lib/supabase';

export default function Challenges(){
  const {user}=useAuth(),{profile,refreshProfile}=useProfile();
  const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(null),[online,setOnline]=useState([]);
  useEffect(()=>{
    if(!user?.id){setOnline([]);return;}
    let live=true;
    const channel=supabase.channel('egg-challenge-lobby',{config:{presence:{key:user.id}}})
      .on('presence',{event:'sync'},()=>{
        if(!live)return;
        const unique=new Map();
        Object.values(channel.presenceState()).flat().forEach(player=>{
          if(player?.user_id&&player.user_id!==user.id)unique.set(player.user_id,player);
        });
        setOnline([...unique.values()].sort((a,b)=>String(a.username||'').localeCompare(String(b.username||''))).slice(0,40));
      })
      .subscribe(status=>{
        if(status==='SUBSCRIBED')void channel.track({user_id:user.id,username:profile?.username||user.email?.split('@')[0]||'Player',avatar_url:profile?.avatar_url||null,online_at:new Date().toISOString()});
      });
    return()=>{live=false;supabase.removeChannel(channel);};
  },[user?.id,user?.email,profile?.username,profile?.avatar_url]);
  const load=useCallback(async()=>{
    if(!user?.id){setItems([]);setLoading(false);return;}
    setLoading(true);
    try{await expireBattleInvites().catch(()=>{});}catch{}
    const {data,error}=await supabase.from('game_challenges')
      .select('id,challenger_id,challenged_id,status,stake_points,challenger_stake_reserved,battle_id,created_at,expires_at,challenger:game_profiles!game_challenges_challenger_id_fkey(id,username,avatar_url),challenged:game_profiles!game_challenges_challenged_id_fkey(id,username,avatar_url)')
      .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`).order('created_at',{ascending:false}).limit(100);
    if(error)Alert.alert('Battles unavailable',error.message);
    setItems(data||[]);setLoading(false);
  },[user]);
  useFocusEffect(useCallback(()=>{load();},[load]));
  async function respond(challenge,accept){
    setBusy(challenge.id);
    try{
      const result=await respondToBattleInvite(challenge.id,accept);
      await refreshProfile().catch(()=>{});
      if(result?.expired)Alert.alert('Invitation expired','The reserved stake has been returned.');
      else if(accept&&result?.battle_id){void supabase.functions.invoke('send-battle-update',{body:{event:'accepted',challenge_id:challenge.id}}).catch(()=>{});router.push({pathname:'/battle',params:{id:result.battle_id}});}
      else if(!accept)Alert.alert('Battle declined','The challenger’s reserved points have been returned.');
      await load();
    }catch(error){Alert.alert(accept?'Could not accept battle':'Could not update invitation',error.message);}
    finally{setBusy(null);}
  }
  function enterBattle(battleId){if(battleId)router.push({pathname:'/battle',params:{id:battleId}});}
  return <Screen><Header title="Battles"/><Text style={s.muted}>Point-stake invitations. Both players commit the same stake; the winner collects the whole pot.</Text><Card style={{gap:10}}><View style={s.headerRow}><Title small>Players online now</Title><Text style={{color:C.green,fontWeight:'900'}}>{online.length} online</Text></View><Text style={s.muted}>Players appear here while they are looking for a battle. Challenge them to send a phone notification, even if they close the app.</Text>{online.length===0?<Text style={s.muted}>No other players are online right now. Keep this screen open to appear in the lobby.</Text>:online.map(player=><Pressable key={player.user_id} onPress={()=>router.push({pathname:'/profile',params:{id:player.user_id}})} style={[s.row,{paddingVertical:9,borderTopWidth:1,borderColor:C.line}]}><Avatar uri={player.avatar_url} size={42}/><View style={{flex:1}}><Text style={{fontWeight:'900',color:C.ink}}>{player.username||'Player'}</Text><Text style={s.muted}>Ready for a challenge · set your stake</Text></View><Text style={{color:C.green,fontSize:12,fontWeight:'900'}}>CHALLENGE ›</Text></Pressable>)}</Card><Card style={{gap:10}}><Title small>Invitations and battles</Title>{loading?<ActivityIndicator color={C.blue}/>:items.length===0?<Text style={s.muted}>No battles yet. Open a player profile from Rankings or the online lobby to send a point-stake invitation.</Text>:items.map(c=>{
    const incoming=c.challenged_id===user?.id,other=incoming?c.challenger:c.challenged,stake=Number(c.stake_points)||0,pot=stake*2,expired=c.status==='declined'&&c.expires_at&&new Date(c.expires_at)<new Date();
    return <Pressable key={c.id} onPress={()=>c.battle_id&&enterBattle(c.battle_id)} style={[s.row,{paddingVertical:12,borderBottomWidth:1,borderColor:C.line,alignItems:'flex-start'}]}>
      <Avatar uri={other?.avatar_url} size={46}/><View style={{flex:1,gap:4}}>
        <Text style={{fontWeight:'900',color:C.ink}}>{other?.username||'Player'}</Text>
        <Text style={s.muted}>{incoming?'Invited you to battle':'Battle invitation sent'} · {c.status==='declined'&&expired?'expired':c.status}</Text>
        <Text style={{fontWeight:'900',color:C.gold}}>{stake?`${stake.toLocaleString()} each · ${pot.toLocaleString()} point pot`:'Casual battle · no stake'}</Text>
        {c.status==='pending'&&<Text style={s.muted}>{incoming?'You must match the stake to accept.':'Your stake is reserved until the invitation is resolved.'}</Text>}
      </View>
      {c.status==='pending'?<View style={{width:112,gap:7}}>{incoming?<><Button title={busy===c.id?'…':'Accept'} onPress={()=>respond(c,true)} disabled={!!busy}/><Button title="Decline" secondary onPress={()=>respond(c,false)} disabled={!!busy}/></>:<Button title={busy===c.id?'…':'Cancel'} secondary onPress={()=>respond(c,false)} disabled={!!busy}/>}</View>:c.status==='accepted'&&c.battle_id?<Button title="Play battle" onPress={()=>enterBattle(c.battle_id)}/>:null}
    </Pressable>;
  })}</Card></Screen>;
}
