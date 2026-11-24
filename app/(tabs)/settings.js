import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { Choice, Field, Button, Card, Screen, Title, s, Avatar, C } from '../../src/components/ui';
import CountryPicker from '../../src/components/CountryPicker';
import { useGameSettings } from '../../src/context/GameSettingsContext';
import { useAuth } from '../../src/context/AuthContext';
import { useProfile } from '../../src/context/ProfileContext';
import { supabase } from '../../src/lib/supabase';
import { savePlayerProfile, usernameFor } from '../../src/lib/profiles';

export default function Settings(){
  const {settings,update}=useGameSettings(),{user,signOut}=useAuth(),{profile,refreshProfile}=useProfile();
  const [draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[picking,setPicking]=useState(false);
  const username=draft?.username??profile?.username??usernameFor(user),country=draft?.country??profile?.country_code??user?.user_metadata?.country_code??'ZA',avatar=draft?.avatar??{uri:profile?.avatar_url||user?.user_metadata?.avatar_url||null};
  const setUsername=value=>setDraft(previous=>({...previous,username:value})),setCountry=value=>setDraft(previous=>({...previous,country:value})),setAvatar=value=>setDraft(previous=>({...previous,avatar:value}));
  useEffect(()=>{let active=true;ImagePicker.getPendingResultAsync().then(result=>{if(active&&result&&'assets' in result&&result.assets?.[0]?.uri){const asset=result.assets[0];setDraft(previous=>({...previous,avatar:{uri:asset.uri,mimeType:asset.mimeType,pending:true}}));}}).catch(()=>{});return()=>{active=false};},[]);
  async function chooseAvatar(){
    if(picking)return;setPicking(true);
    try{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],allowsEditing:true,aspect:[1,1],quality:.8});const asset=result.assets?.[0];
      if(!result.canceled&&asset?.uri)setAvatar({uri:asset.uri,mimeType:asset.mimeType,fileSize:asset.fileSize,pending:true});
    }catch(error){Alert.alert('Could not choose photo',error.message||'Please try another image.');}finally{setPicking(false);}
  }
  async function saveProfile(){
    if(!user?.id)return;setBusy(true);
    try{
      let avatarUrl=profile?.avatar_url||user.user_metadata?.avatar_url||null;
      if(avatar?.pending&&avatar.uri){
        const body=await new File(avatar.uri).arrayBuffer();
        const contentType=avatar.mimeType||'image/jpeg',ext=contentType==='image/png'?'png':contentType==='image/webp'?'webp':'jpg';
        const path=`${user.id}/avatar-${Date.now()}.${ext}`;
        const {error}=await supabase.storage.from('game-avatars').upload(path,body,{contentType,upsert:false});if(error)throw error;
        avatarUrl=supabase.storage.from('game-avatars').getPublicUrl(path).data.publicUrl;
      }
      await savePlayerProfile(user,{username:username.trim().slice(0,24)||usernameFor(user),country_code:country,avatar_url:avatarUrl});
      await update({countryCode:country});await refreshProfile();setDraft(null);Alert.alert('Profile saved','Your photo, username and country now appear across the game.');
    }catch(error){Alert.alert('Could not save profile',error.message||'Please check your connection and try again.');}finally{setBusy(false);}
  }
  async function logout(){const {error}=await signOut();if(error)Alert.alert('Could not log out',error.message);else router.replace('/auth');}
  return <Screen><Title>Settings</Title>
    <Card style={{borderColor:C.gold,borderWidth:1.5,padding:22,gap:18}}><View style={s.headerRow}><View><Text style={{color:C.gold,fontSize:11,fontWeight:'900',letterSpacing:1.8}}>YOUR NEXT GAME</Text><Title small>Game setup</Title></View><Text style={{fontSize:30}}>🎮</Text></View><Text style={s.muted}>Choose your opponent and how brave you feel.</Text>
      <Choice label="Opponent" value={settings.mode} onChange={v=>update({mode:v})} choices={ [['computer','Computer'],['friend','Pass & play']]}/>
      <Choice label="Difficulty" value={settings.difficulty} onChange={v=>update({difficulty:v})} choices={ [['easy','Easy'],['normal','Normal'],['hard','Hard']]}/>
      <Choice label="Game style" value={settings.gameMode} onChange={v=>update({gameMode:v})} choices={ [['classic','Classic'],['sudden','Sudden Death'],['chaos','Chaos Cards'],['tour','Tournament']]}/>
      <View style={{padding:14,borderRadius:16,backgroundColor:'#fff0ca',borderWidth:1,borderColor:'#e1bc79'}}><Text style={{color:C.ink,fontWeight:'800',marginBottom:4}}>{settings.gameMode==='sudden'?'A fragile start':settings.gameMode==='chaos'?'Expect surprises':settings.gameMode==='tour'?'First to two wins':'The original challenge'}</Text><Text style={s.muted}>{settings.gameMode==='sudden'?'The tissue starts wet and weak.':settings.gameMode==='chaos'?'Surprise cards can change your next spray.':settings.gameMode==='tour'?'Play a longer match with rounds.':'Roll, spray, and keep the egg safe.'}</Text></View>
      {settings.mode==='friend'&&<Field label="Player 2" value={settings.player2} onChangeText={v=>update({player2:v})} placeholder="Player 2" autoCapitalize="words"/>}
    </Card>
    <Card><Title small>Player profile</Title><Pressable onPress={chooseAvatar} disabled={picking} style={{alignItems:'center',gap:10}} accessibilityLabel="Choose profile picture"><Avatar uri={avatar?.uri} size={140} square/><Text style={{color:C.gold,fontWeight:'800'}}>{picking?'Opening photos…':avatar?.pending?'New photo selected · Save profile below':'Change profile picture'}</Text></Pressable><Field label="Username" value={username} onChangeText={setUsername} placeholder="Username"/><CountryPicker value={country} onChange={setCountry}/><Button title={busy?'Saving profile…':'Save profile'} onPress={saveProfile} disabled={busy||picking}/></Card>
    <Card><Title small>Sound</Title><Text style={s.muted}>Game music and effects</Text><Choice label="Sound effects" value={settings.soundEnabled?'on':'off'} onChange={v=>update({soundEnabled:v==='on'})} choices={ [['on','On'],['off','Off']]}/></Card>
    <Card><Title small>Challenges</Title><Button title="Open challenges" secondary onPress={()=>router.push('/challenges')}/></Card>
    <Card><Title small>Privacy and information</Title>{[['privacy','Privacy Policy'],['terms','Terms of Use'],['faq','FAQ'],['about','About Egg & Tissue'],['delete-account','Delete your account']].map(([page,label])=><Button key={page} title={label} secondary onPress={()=>router.push(`/legal/${page}`)}/>)}</Card>
    <Card><Title small>Account</Title><Text style={s.muted}>{user?.email}</Text><Button title="Log out" secondary onPress={logout}/></Card>
  </Screen>;
}
