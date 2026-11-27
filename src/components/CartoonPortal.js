import {readInbox,subscribeInbox} from '../lib/inbox';
import mobileAds,{RewardedAd,AdEventType,RewardedAdEventType,TestIds} from 'react-native-google-mobile-ads';
import {USE_TEST_ADS} from '../lib/monetization';
import {RewardedAdSession} from '../lib/rewardedAdSession';
import React,{useCallback,useEffect,useRef,useState} from 'react';
import {ActivityIndicator,BackHandler,Linking,Pressable,Text,View,Vibration} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {WebView} from 'react-native-webview';
import {router} from 'expo-router';
import {useAuth} from '../context/AuthContext';
import {supabase} from '../lib/supabase';
const HOST='https://egg-tissue-cartoon-play.seketefilmstv.chatgpt.site';
const GAME_URL='file:///android_asset/egg-game/online-native.html?repair=1&native=1#/home';
const trusted=url=>url.startsWith('file:///android_asset/egg-game/')||(()=>{try{return new URL(url).origin===HOST;}catch{return false;}})();
export default function CartoonPortal(){
 const {session,loading:authLoading}=useAuth(),web=useRef(null),lastToken=useRef(''),sessionSync=useRef(new Map()),adSession=useRef(null),[failed,setFailed]=useState(false),[loading,setLoading]=useState(true),[canGoBack,setCanGoBack]=useState(false);
 const syncSession=useCallback(()=>{if(!web.current)return;if(!session?.access_token||!session?.refresh_token){lastToken.current='';web.current.injectJavaScript('window.eggNativeSession=null;window.eggReceiveNativeSession?.(null);true;');return;}lastToken.current=session.access_token;const value=JSON.stringify({access_token:session.access_token,refresh_token:session.refresh_token});web.current.injectJavaScript(`window.eggNativeSession=${value};window.eggReceiveNativeSession?.(window.eggNativeSession);true;`);},[session]);
 useEffect(()=>{syncSession();},[syncSession]);
 useEffect(()=>{const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{if(canGoBack){web.current?.goBack();return true;}return false;});return()=>subscription.remove();},[canGoBack]);
 useEffect(()=>()=>adSession.current?.destroy(),[]);
 function rewarded(){if(!adSession.current)adSession.current=new RewardedAdSession({initialize:()=>mobileAds().initialize(),createAd:()=>RewardedAd.createForAdRequest(USE_TEST_ADS?TestIds.REWARDED:'ca-app-pub-3333777272750017/5128419119'),events:{loaded:[AdEventType.LOADED,RewardedAdEventType.LOADED],earned:RewardedAdEventType.EARNED_REWARD,closed:AdEventType.CLOSED,error:AdEventType.ERROR},emit:value=>web.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('egg-rewarded-ad',{detail:${JSON.stringify(value)}}));true;`)});return adSession.current;}
 const sendInbox=useCallback(items=>{web.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('egg-native-inbox',{detail:${JSON.stringify({userId:session?.user?.id,items})}}));true;`);},[session?.user?.id]);
 useEffect(()=>subscribeInbox(sendInbox),[sendInbox]);
 async function message(event){if(!trusted(event.nativeEvent.url)||event.nativeEvent.data.length>20000)return;let data;try{data=JSON.parse(event.nativeEvent.data);}catch{return;}
  if(data.type==='WATCH_AD'&&typeof data.requestId==='string'&&data.requestId.length<=100&&typeof data.gameId==='string'&&/^[a-f0-9-]{36}$/i.test(data.gameId)){void rewarded().request({requestId:data.requestId,gameId:data.gameId});return;}
  if(data.type==='CANCEL_WATCH_AD'&&typeof data.requestId==='string'){adSession.current?.cancel(data.requestId);return;}
  if(data.type==='READY'){syncSession();readInbox().then(sendInbox).catch(()=>{});return;}
  if(data.type==='GET_INBOX'){readInbox().then(sendInbox).catch(()=>{});return;}
  if(data.type==='VIBRATE'){const pattern=Array.isArray(data.pattern)?data.pattern.slice(0,10).map(n=>Math.max(0,Math.min(200,Number(n)||0))):Math.max(0,Math.min(200,Number(data.pattern)||0));if(data.pattern===0)Vibration.cancel();else Vibration.vibrate(Array.isArray(pattern)?[0,...pattern]:pattern);return;}
  if(data.type==='SESSION'&&typeof data.access_token==='string'&&typeof data.refresh_token==='string'&&typeof data.requestId==='string'&&data.requestId.length<=100){
   const reply=(ok,userId=null)=>web.current?.injectJavaScript(`window.dispatchEvent(new CustomEvent('egg-native-session-result',{detail:${JSON.stringify({requestId:data.requestId,ok,userId,message:ok?null:'Could not securely save your sign-in on this phone. Please try again.'})}}));true;`);
   try{
    let pending=sessionSync.current.get(data.access_token);
    if(!pending){pending=(async()=>{
     if(data.access_token!==lastToken.current){const {data:result,error}=await supabase.auth.setSession({access_token:data.access_token,refresh_token:data.refresh_token});if(error)throw error;if(!result.session?.user?.id)throw new Error('session not returned');}
     const {data:stored,error:readError}=await supabase.auth.getSession();if(readError)throw readError;
     if(!stored.session?.user?.id)throw new Error('session not persisted');
     lastToken.current=stored.session.access_token;
     return stored.session.user.id;
    })();sessionSync.current.set(data.access_token,pending);pending.finally(()=>{if(sessionSync.current.get(data.access_token)===pending)sessionSync.current.delete(data.access_token);}).catch(()=>{});}
    reply(true,await pending);
   }catch{console.warn('Native sign-in persistence failed.');reply(false);}
   return;
  }
  if(data.type==='SIGN_OUT'){lastToken.current='';await supabase.auth.signOut();return;}
  if(data.type==='CHALLENGES')router.push('/challenges');
  if(data.type==='NOTIFICATIONS')router.push('/push-settings');
  if(data.type==='PROFILE'&&typeof data.id==='string'&&/^[a-f0-9-]{36}$/i.test(data.id))router.push({pathname:'/profile',params:{id:data.id}});
 }
 return <SafeAreaView edges={['top','bottom','left','right']} style={{flex:1,backgroundColor:'#fff5df'}}>{failed?<View style={{flex:1,justifyContent:'center',alignItems:'center',padding:28,gap:18}}><Text style={{fontSize:24,fontWeight:'900',color:'#39254f'}}>Your egg is waiting.</Text><Text style={{color:'#765987',textAlign:'center'}}>Connect to the internet, then try again. Your saved progress stays in your account.</Text><Pressable accessibilityRole="button" onPress={()=>{setFailed(false);setLoading(true);}} style={{padding:16,borderRadius:16,backgroundColor:'#a1e7d7'}}><Text>Try again</Text></Pressable></View>:!authLoading&&<WebView ref={web} source={{uri:GAME_URL}} originWhitelist={['*']} javaScriptEnabled domStorageEnabled allowFileAccess allowFileAccessFromFileURLs allowUniversalAccessFromFileURLs setSupportMultipleWindows={false} allowsInlineMediaPlayback mediaPlaybackRequiresUserAction onMessage={message} onLoadEnd={()=>{setLoading(false);syncSession();}} onError={()=>{setFailed(true);setLoading(false);}} onHttpError={event=>{if(event.nativeEvent.statusCode>=400){setFailed(true);setLoading(false);}}} onNavigationStateChange={state=>setCanGoBack(state.canGoBack)} onShouldStartLoadWithRequest={request=>{if(trusted(request.url)||request.url==='about:blank')return true;if(/^https:|^mailto:/.test(request.url))Linking.openURL(request.url).catch(()=>{});return false;}}/>}{(loading||authLoading)&&!failed&&<View pointerEvents="none" style={{position:'absolute',inset:0,backgroundColor:'#fff5df',alignItems:'center',justifyContent:'center',gap:15}}><ActivityIndicator size="large" color="#976ec6"/><Text style={{color:'#674877',fontWeight:'800'}}>{authLoading?'Loading your account…':'Opening your egg-venture…'}</Text></View>}</SafeAreaView>;
}
