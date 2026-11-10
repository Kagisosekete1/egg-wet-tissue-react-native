import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,BackHandler,Linking,Pressable,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import {router} from 'expo-router';
import {useAuth} from '../context/AuthContext';
import {supabase} from '../lib/supabase';
const HOST='https://egg-tissue-cartoon-play.seketefilmstv.chatgpt.site';
const trusted=url=>{try{return new URL(url).origin===HOST;}catch{return false;}};
export default function CartoonPortal(){
 const {session}=useAuth(),web=useRef(null),lastToken=useRef(''),[failed,setFailed]=useState(false),[loading,setLoading]=useState(true),[canGoBack,setCanGoBack]=useState(false);
 const syncSession=useCallback(()=>{if(!session?.access_token||!session?.refresh_token)return;lastToken.current=session.access_token;const value=JSON.stringify({access_token:session.access_token,refresh_token:session.refresh_token});web.current?.injectJavaScript(`window.eggNativeSession=${value};window.eggReceiveNativeSession?.(window.eggNativeSession);true;`);},[session]);
 useEffect(()=>{syncSession();},[syncSession]);
 useEffect(()=>{const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{if(canGoBack){web.current?.goBack();return true;}return false;});return()=>subscription.remove();},[canGoBack]);
 async function message(event){if(!trusted(event.nativeEvent.url)||event.nativeEvent.data.length>20000)return;let data;try{data=JSON.parse(event.nativeEvent.data);}catch{return;}
  if(data.type==='READY'){syncSession();return;}
  if(data.type==='SESSION'&&typeof data.access_token==='string'&&typeof data.refresh_token==='string'&&data.access_token!==lastToken.current){lastToken.current=data.access_token;await supabase.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token}).catch(()=>{});return;}
  if(data.type==='SIGN_OUT'){lastToken.current='';await supabase.auth.signOut();return;}
  if(data.type==='CHALLENGES')router.push('/challenges');
  if(data.type==='NOTIFICATIONS')router.push('/push-settings');
  if(data.type==='PROFILE'&&typeof data.id==='string'&&/^[a-f0-9-]{36}$/i.test(data.id))router.push({pathname:'/profile',params:{id:data.id}});
 }
 return <SafeAreaView edges={['top','bottom','left','right']} style={{flex:1,backgroundColor:'#fff5df'}}>{failed?<View style={{flex:1,justifyContent:'center',alignItems:'center',padding:28,gap:18}}><Text style={{fontSize:24,fontWeight:'900',color:'#39254f'}}>Your egg is waiting.</Text><Text style={{color:'#765987',textAlign:'center'}}>Connect to the internet, then try again. Your saved progress stays on this phone.</Text><Pressable accessibilityRole="button" onPress={()=>{setFailed(false);setLoading(true);}} style={{padding:16,borderRadius:16,backgroundColor:'#a1e7d7'}}><Text>Try again</Text></Pressable></View>:<WebView ref={web} source={{uri:HOST+'/online?repair=1&native=1#/home'}} originWhitelist={[HOST]} javaScriptEnabled domStorageEnabled setSupportMultipleWindows={false} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction onMessage={message} onLoadEnd={()=>{setLoading(false);syncSession();}} onError={()=>{setFailed(true);setLoading(false);}} onHttpError={event=>{if(event.nativeEvent.statusCode>=400){setFailed(true);setLoading(false);}}} onNavigationStateChange={state=>setCanGoBack(state.canGoBack)} onShouldStartLoadWithRequest={request=>{if(trusted(request.url)||request.url==='about:blank')return true;if(/^https:|^mailto:/.test(request.url))Linking.openURL(request.url).catch(()=>{});return false;}}/>}{loading&&!failed&&<View pointerEvents="none" style={{position:'absolute',inset:0,backgroundColor:'#fff5df',alignItems:'center',justifyContent:'center',gap:15}}><ActivityIndicator size="large" color="#976ec6"/><Text style={{color:'#674877',fontWeight:'800'}}>Opening your egg-venture…</Text></View>}</SafeAreaView>;
}
