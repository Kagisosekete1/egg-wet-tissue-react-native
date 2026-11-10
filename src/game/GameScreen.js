import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import mobileAds, { TestIds, useRewardedAd } from 'react-native-google-mobile-ads';
import GameScene from '../../Scene.native';
import DicePreview from '../components/DicePreview';
import { Avatar, C } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useGameSettings } from '../context/GameSettingsContext';
import { gamePoints, recordGameResult, savePendingResult, usernameFor } from '../lib/profiles';
import { USE_TEST_ADS } from '../lib/monetization';
import { consumeShieldHit, loadEquippedShield } from '../lib/shields';
import { applyCounter, applyLuckyRoll, applyPowerup, applySpray, canUsePowerup, completeRoll, createGame, declineCounter, nextTurn, nextSprayWouldFall, POWERUP_CATALOG, randomDie, rewindGame, uuid } from './rules';
import { consumePowerup, loadPowerupInventory } from '../lib/powerups';
import { useGameAudio } from './useGameAudio';

const lines=[['Looking good!','Nice and dry 😎','Spray away!'],['Is it sagging?','Gulp…','I don’t like this'],['Nooo! Please!','I’m too young to splat!','Mommy!']];
function Chip({label,onPress,disabled=false,gold=false}){return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({pressed})=>[styles.chip,gold&&styles.gold,disabled&&{opacity:.45},pressed&&{transform:[{scale:.94}],opacity:.85}]}><Text style={[styles.chipText,gold&&{color:'#07336b'}]}>{label}</Text></Pressable>;}

export default function GameScreen(){
  const {settings}=useGameSettings(),{user}=useAuth(),{profile,refreshProfile}=useProfile(),{width,height}=useWindowDimensions();
  const userId=user?.id;
  const [game,setGame]=useState(()=>createGame(settings)),gameRef=useRef(game);
  const [rematchedGameId,setRematchedGameId]=useState(null);
  const [active,setActive]=useState(false),[face,setFace]=useState(1),[sprayToken,setSprayToken]=useState(0),[resetToken,setResetToken]=useState(0),[speech,setSpeech]=useState(''),[result,setResult]=useState(null),[adPaused,setAdPaused]=useState(false),[adsReady,setAdsReady]=useState(false),[adInitError,setAdInitError]=useState(''),[equippedShield,setEquippedShield]=useState(null),[shieldMessage,setShieldMessage]=useState(''),[shieldProcessing,setShieldProcessing]=useState(false),[powerInventory,setPowerInventory]=useState(/** @type {Record<string,number>} */ ({})),[powerInventoryLoaded,setPowerInventoryLoaded]=useState(false),[powerBusy,setPowerBusy]=useState(false),[powerupsOpen,setPowerupsOpen]=useState(false);
  const pendingReward=useRef(false),submitted=useRef(new Map()),lastMood=useRef(0),tournamentGames=useRef(new Set()),rematchedGames=useRef(new Set()),powerBusyRef=useRef(false),pendingPowerActions=useRef(new Map());
  const shieldRef=useRef(null),sprayBusy=useRef(false);
  const [tournament,setTournament]=useState([0,0]);
  const commit=useCallback(next=>{gameRef.current=next;setGame(next);},[]);
  const name1=usernameFor(user,profile),name2=game.mode==='computer'?'Computer':settings.player2||'Player 2';
  const danger=Math.min(1.2,game.damage/game.threshold),over=game.phase==='over',won=over&&game.current===2,mood=over?3:danger>.85?2:danger>.55?1:0;
  const strength=Math.max(0,100-danger*100),points=gamePoints({difficulty:game.difficulty,safeSprays:game.safeSprays,rounds:game.rounds,finalRoll:game.roll||1,won:won||!over});
  const {play,startGame}=useGameAudio(settings.soundEnabled!==false,active&&!adPaused,over);
  const {status:adStatus,show:showAd,load:loadAd,retry:retryAd,earnedReward,error:adError}=useRewardedAd({adUnitId:USE_TEST_ADS?TestIds.REWARDED:'ca-app-pub-3333777272750017/5128419119',autoLoad:adsReady&&active});
  useEffect(()=>{mobileAds().initialize().then(()=>setAdsReady(true)).catch(error=>{setAdInitError(error?.message||'Ad service could not start.');setAdsReady(true);});},[]);
  useFocusEffect(useCallback(()=>{setActive(true);return()=>setActive(false);},[]));
  useEffect(()=>{if(!active||over)return;const frame=requestAnimationFrame(()=>startGame());return()=>cancelAnimationFrame(frame);},[active,over,startGame]);
  useEffect(()=>{
    let current=true;
    if(!userId){setPowerInventory({});setPowerInventoryLoaded(true);return()=>{current=false;};}
    if(!active){setPowerInventoryLoaded(false);return()=>{current=false;};}
    loadEquippedShield(userId).then(value=>{if(current){shieldRef.current=value;setEquippedShield(value);}}).catch(()=>{});
    loadPowerupInventory(userId).then(value=>{if(current)setPowerInventory(value);}).catch(()=>{}).finally(()=>{if(current)setPowerInventoryLoaded(true);});
    return()=>{current=false;};
  },[active,userId]);
  const finalize=useCallback(g=>{
    if(g.phase!=='over'||!userId)return Promise.resolve();if(submitted.current.has(g.gameId))return submitted.current.get(g.gameId);
    const task=(async()=>{const score={gameId:g.gameId,difficulty:g.difficulty,gameMode:g.gameMode,mode:g.mode,safeSprays:g.safeSprays,rounds:g.rounds,finalRoll:g.roll||1,won:g.current===2};
      try{const saved=await recordGameResult(score);if(gameRef.current.gameId===g.gameId)setResult({points:saved.points_awarded,synced:true});await refreshProfile();}
      catch{await savePendingResult(userId,score);if(gameRef.current.gameId===g.gameId)setResult({points:gamePoints(score),synced:false});}
    })();submitted.current.set(g.gameId,task);return task;
  },[userId,refreshProfile]);
  useEffect(()=>{if(over)void finalize(gameRef.current);},[over,game.gameId,finalize]);
  useEffect(()=>{
    // An AI attack opens a short counter response phase. If this account has no
    // counter available (or is playing offline), resolve the response at once
    // so the game never appears to wait for an impossible action.
    if(!active||game.phase!=='counter'||!game.pendingCounter||!powerInventoryLoaded)return;
    if((powerInventory.counter_attack||0)>0)return;
    const timer=setTimeout(()=>{
      const current=gameRef.current;
      if(current.gameId!==game.gameId||current.phase!=='counter'||!current.pendingCounter)return;
      commit(declineCounter(current));
      setSpeech('Computer attack resolved. Your turn—roll the dice!');
    },350);
    return()=>clearTimeout(timer);
  },[active,game,game.gameId,powerInventory,powerInventoryLoaded,commit]);
  const reset=useCallback(()=>{const previous=gameRef.current;if(previous.phase==='over')finalize(previous);commit(createGame(settings));setTournament(scores=>settings.gameMode!=='tour'||scores.some(n=>n>=2)?[0,0]:scores);setSpeech('');setResult(null);setFace(1);pendingReward.current=false;setAdPaused(false);setResetToken(v=>v+1);lastMood.current=0;},[commit,settings,finalize]);
  const rematch=useCallback(()=>{const previous=gameRef.current;if(previous.phase!=='over'||rematchedGames.current.has(previous.gameId))return;rematchedGames.current.add(previous.gameId);setRematchedGameId(previous.gameId);reset();},[reset]);
  const configKey=`${settings.mode}|${settings.difficulty}|${settings.gameMode}`;
  const previousConfig=useRef(configKey);
  useEffect(()=>{if(previousConfig.current!==configKey){previousConfig.current=configKey;reset();}},[configKey,reset]);
  const roll=useCallback((computerAction=false)=>{const g=gameRef.current,computerTurn=g.mode==='computer'&&g.current===2;if(g.phase!=='ready'||(computerTurn!==computerAction))return;startGame();play('roll');Haptics.selectionAsync().catch(()=>{});commit({...g,phase:'rolling'});},[commit,play,startGame]);
  const runPowerup=useCallback(async(type)=>{
    const g=gameRef.current;
    const allowed=canUsePowerup(g,type)&&(type==='counter_attack'||g.current===1||g.mode==='friend');
    if(!allowed||!userId||powerBusyRef.current||(powerInventory[type]||0)<=0)return;
    powerBusyRef.current=true;setPowerBusy(true);
    try{
      const actionKey=`${g.gameId}:${type}`;
      const actionId=pendingPowerActions.current.get(actionKey)||uuid();
      pendingPowerActions.current.set(actionKey,actionId);
      await consumePowerup(type,g.gameId,actionId);
      pendingPowerActions.current.delete(actionKey);
      setPowerInventory(current=>({...current,[type]:Math.max(0,(current[type]||0)-1)}));
      let next=g;
      if(type==='counter_attack')next=applyCounter(g);
      else if(type==='lucky_roll'){
        play('roll');
        next=applyLuckyRoll(g,randomDie(g.lastRoll));
        setFace(Math.min(next.roll,6));
      }else next=applyPowerup(g,type);
      if(next===g){setSpeech('This power-up is not available in the current game state.');return;}
      commit(next);setPowerupsOpen(false);setSpeech(next.powerupNotice||'Power-up ready!');Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(()=>{});
    }catch(error){
      setSpeech(error?.message||'That power-up could not be used.');
      loadPowerupInventory(userId).then(setPowerInventory).catch(()=>{});
    }finally{powerBusyRef.current=false;setPowerBusy(false);}
  },[commit,play,userId,powerInventory]);
  const spray=useCallback(async(computerAction=false)=>{
    if(sprayBusy.current)return;
    const g=gameRef.current;
    const computerTurn=g.mode==='computer'&&g.current===2;
    if(computerTurn!==computerAction)return;
    if(!['spraying','countdown'].includes(g.phase)||g.sprayed>=g.roll)return;
    let blocked=false;
    const shield=shieldRef.current;
    const humanCanBlock=g.current===1||(g.mode==='computer'&&g.current===2);
    if(userId&&humanCanBlock&&shield?.remaining_hits>0&&nextSprayWouldFall(g)){
      sprayBusy.current=true;setShieldProcessing(true);
      try{
        const consumed=await consumeShieldHit(shield.id,uuid());
        if(consumed?.blocked){
          blocked=true;
          const nextShield=consumed.remaining_hits>0?{...shield,remaining_hits:consumed.remaining_hits,equipped:consumed.equipped!==false}:null;
          shieldRef.current=nextShield;setEquippedShield(nextShield);
          setShieldMessage(`${shield.shield_type[0].toUpperCase()+shield.shield_type.slice(1)} Shield blocked the fall${consumed.remaining_hits>0?` · ${consumed.remaining_hits} hit${consumed.remaining_hits===1?'':'s'} left`: ' · shield broken'}.`);
        }
      }catch{
        setShieldMessage('Shield could not sync, so the normal game rules applied.');
      }finally{sprayBusy.current=false;setShieldProcessing(false);}
      if(gameRef.current!==g)return;
    }
    const next=applySpray(g,blocked);if(next===g)return;if(next.phase==='over')next.fallVariant=['wobble','spin','bounce','dizzy','confetti'][Math.floor(Math.random()*5)];commit(next);setSprayToken(v=>v+1);play(next.phase==='over'?'scream':'spray');Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{});
    const d=next.damage/next.threshold,m=d>.85?2:d>.55?1:0;const phrases=lines[m];setSpeech(next.lastShieldBlock?'🛡️ Shield blocked the fall!':next.phase==='over'?'AAAAAH!':phrases[Math.floor(Math.random()*phrases.length)]);if(d>.6)play('danger');
  },[commit,play,userId]);
  function sprayPressed(){const g=gameRef.current;if(g.phase!=='spraying'||(g.mode==='computer'&&g.current===2))return;if(g.damage/g.threshold>.6){commit({...g,phase:'countdown'});play('heartbeat');}else spray();}
  useEffect(()=>{
    if(!active||adPaused)return;
    if(game.phase==='rolling'){
      // Keep the die's spin in the 3D scene. Avoid nine full-screen React renders
      // during one roll; that was stuttering the spray canvas on lower-end phones.
      const timer=setTimeout(()=>{const next=completeRoll(gameRef.current,randomDie(gameRef.current.lastRoll));commit(next);setFace(Math.min(next.roll,6));},420);return()=>clearTimeout(timer);
    }
    if(game.phase==='waiting'){const waitingGame=game;const timer=setTimeout(()=>{const current=gameRef.current;if(current.gameId!==waitingGame.gameId||current.phase!=='waiting')return;commit(nextTurn(current));setFace(1);},300);return()=>clearTimeout(timer);}
    if(game.phase==='countdown'){const beat=setTimeout(()=>play('heartbeat'),450),timer=setTimeout(spray,950);return()=>{clearTimeout(beat);clearTimeout(timer)};}
    if(game.current===2&&game.mode==='computer'&&game.phase==='ready'&&!game.aiBoostAttempted&&game.rounds>=1&&game.aiPoints>=500){
      const timer=setTimeout(()=>{
        const current=gameRef.current;
        if(current.current!==2||current.mode!=='computer'||current.phase!=='ready'||current.aiBoostAttempted)return;
        const attempted={...current,aiBoostAttempted:true};
        if(canUsePowerup(current,'tension_boost')&&Math.random()<({easy:.12,normal:.24,hard:.36}[current.difficulty]||.24)){
          const attacked=applyPowerup(attempted,'tension_boost');
          if(attacked!==attempted){const protectedByEscape=attacked.lastQuickEscapeBlock;commit({...attacked,aiPoints:current.aiPoints-500,powerupNotice:protectedByEscape?'🪽 Quick Escape blocked the Computer Boost!':'🤖 COMPUTER BOOST! Counter it or take your turn.'});setSpeech(protectedByEscape?'🪽 Quick Escape blocked the attack!':'🤖 COMPUTER BOOST!');play('danger');return;}
        }
        commit(attempted);
      },0);return()=>clearTimeout(timer);
    }
    if(game.current===2&&game.mode==='computer'&&['ready','spraying'].includes(game.phase)){
      const aiTurn={gameId:game.gameId,phase:game.phase,sprayed:game.sprayed};
      const timer=setTimeout(()=>{
        const current=gameRef.current;
        if(current.gameId!==aiTurn.gameId||current.mode!=='computer'||current.current!==2||current.phase!==aiTurn.phase||current.sprayed!==aiTurn.sprayed)return;
        if(aiTurn.phase==='ready')roll(true);else spray(true);
      },game.phase==='ready'?500:game.sprayed===0?400:350);
      return()=>clearTimeout(timer);
    }
  },[game,active,adPaused,commit,roll,spray,play]);
  useEffect(()=>{if(mood<3&&mood!==lastMood.current)play(`mood${mood}`);lastMood.current=mood;},[mood,play]);
  useEffect(()=>{if(!over||!active||adPaused)return;const timer=setTimeout(()=>play(won?'win':'lose'),1500);return()=>clearTimeout(timer);},[over,won,active,adPaused,play]);
  useEffect(()=>{if(!speech)return;const timer=setTimeout(()=>setSpeech(''),1600);return()=>clearTimeout(timer);},[speech,sprayToken]);
  useEffect(()=>{
    if(earnedReward&&pendingReward.current){pendingReward.current=false;const g=gameRef.current,count=Math.min(4,g.history.length);if(count&&g.rewardsUsed===0){commit(rewindGame(g));setResetToken(v=>v+1);setResult(null);setSpeech(`${count} sprays back!`);}setAdPaused(adStatus!=='closed');}
    if(['closed','error','no-fill'].includes(adStatus)){pendingReward.current=false;setAdPaused(false);}
  },[adStatus,earnedReward,commit]);
  useEffect(()=>{if(adStatus==='closed'){const timer=setTimeout(loadAd,500);return()=>clearTimeout(timer);}},[adStatus,loadAd]);
  function reward(){if(!game.history.length||won||game.rewardsUsed>=1)return;if(adStatus!=='loaded'){if(['error','no-fill'].includes(adStatus))retryAd();else loadAd();return;}pendingReward.current=true;setAdPaused(true);showAd();}
  const impact=useCallback(()=>{play('crash');const g=gameRef.current;if(g.phase==='over'&&g.gameMode==='tour'&&!tournamentGames.current.has(g.gameId)){tournamentGames.current.add(g.gameId);setTournament(scores=>[scores[0]+(g.current===2?1:0),scores[1]+(g.current===1?1:0)]);}},[play]);
  const playerTurn=game.current===1||game.mode==='friend',rewardBlocked=won||(over&&!!result)||game.rewardsUsed>=1||!game.history.length||['rolling','countdown'].includes(game.phase)||(!playerTurn&&!over)||adPaused;
  const rewardLabel=!game.history.length?'Play a turn to unlock the advert':adStatus==='loaded'?'▶  Watch advert · 4 moves back':adStatus==='loading'||!adsReady?'Loading reward advert…':['error','no-fill'].includes(adStatus)?'↻  Retry reward advert':adStatus==='showing'?'Advert playing…':'Prepare reward advert';
  const adMessage=adInitError?`Reward advert service could not start. ${adInitError}`:['error','no-fill'].includes(adStatus)?`Advert ${adStatus==='no-fill'?'inventory is empty right now':`failed to load${adError?.message?`: ${adError.message}`:''}`}. Tap retry.`:'';
  const message=over?`💥 Splat! ${game.current===1?name1:name2} made the egg fall. ${game.current===1?name2:name1} wins!`:game.phase==='counter'?`${game.current===1?name1:name2} can counter this incoming ${game.pendingCounter?.type==='pressure_blast'?'Pressure Blast':'Tension Boost'} or continue.`:game.phase==='countdown'?'😬 3… 2… 1…':game.phase==='rolling'?'Rolling…':game.phase==='waiting'?'Turn complete. The tissue survived… barely.':game.phase==='ready'?(game.current===2&&game.mode==='computer'?'Computer is thinking…':'Roll the dice to begin.'):`${game.current===1?name1:name2} sprays! (${game.sprayed} of ${game.roll}) ${game.card}`;
  return <SafeAreaView edges={['top','left','right']} style={styles.safe}><StatusBar style="light"/>
    <Modal visible={powerupsOpen} transparent animationType="fade" onRequestClose={()=>setPowerupsOpen(false)}>
      <View style={styles.modalBackdrop}><View style={[styles.modalCard,{maxHeight:Math.min(height*.9,width>600?720:760)}]}>
        <View style={styles.modalHeader}><View><Text style={styles.powerTitle}>⚡ Power-ups</Text><Text style={styles.powerHint}>Points · {(Number(profile?.points)||0).toLocaleString()}</Text></View><Chip label="Close" onPress={()=>setPowerupsOpen(false)}/></View>
        <ScrollView contentContainerStyle={{gap:10,paddingBottom:12}} showsVerticalScrollIndicator>
          {game.phase==='counter'&&game.pendingCounter&&<View style={styles.counterPanel}><Text style={styles.strong}>🛡️ Incoming {game.pendingCounter.type==='pressure_blast'?'Pressure Blast':'Tension Boost'}</Text><Text style={styles.hint}>Use a Counter Attack to cancel it, or continue your turn.</Text><View style={styles.actions}><Chip label={`Counter · ${powerInventory.counter_attack||0}`} gold onPress={()=>runPowerup('counter_attack')} disabled={powerBusy||!userId||(powerInventory.counter_attack||0)<1}/><Chip label="Continue turn" onPress={()=>{commit(declineCounter(gameRef.current));setPowerupsOpen(false);}} disabled={powerBusy}/></View></View>}
          {POWERUP_CATALOG.map(item=>{
            const owned=powerInventory[item.type]||0;
            const allowed=canUsePowerup(game,item.type)&&(item.type==='counter_attack'||game.current===1||game.mode==='friend');
            const available=!!userId&&owned>0&&allowed&&!powerBusy;
            return <View key={item.type} style={styles.powerupItem}>
              <View style={styles.powerupIcon}><Text style={{fontSize:26}}>{item.icon}</Text></View>
              <View style={{flex:1,gap:3}}><Text style={styles.strong}>{item.name}</Text><Text style={styles.hint}>{item.description}</Text><Text style={styles.powerHint}>Owned · {owned}</Text></View>
              <Chip label={powerBusy?'…':available?'Use':'Unavailable'} gold={available} onPress={()=>runPowerup(item.type)} disabled={!available}/>
            </View>;
          })}
          {!userId&&<Text style={styles.hint}>Sign in to use saved power-ups.</Text>}
        </ScrollView>
      </View></View>
    </Modal>
    <ScrollView contentContainerStyle={styles.scroll}><Text style={styles.title}>Egg & Wet Tissue</Text><View style={styles.panel}>
    <View style={styles.scoreLine}><Avatar uri={profile?.avatar_url} size={30}/><Text style={styles.turn}>{over?`🏆 ${won?name1:name2} wins!`:`${game.current===2&&game.mode==='computer'?'🤖':'🔵'} ${game.current===1?name1:name2}’s turn`}</Text><Text style={styles.status}>{over?'Splat!':strength>65?'Egg is safe… for now':strength>30?'Tissue is weakening!':'Danger zone!'}</Text></View>
    <View style={[styles.scene,{height:Math.min(560,Math.max(300,(Math.min(width,540)-48)*1.2))},danger>.85&&!over&&{borderColor:'#ff3b3b'}]}><GameScene danger={danger} sprayToken={sprayToken} falling={over} fallVariant={game.fallVariant} resetToken={resetToken} paused={!active||adPaused} onImpact={impact}/>{!!userId&&!!equippedShield&&<View pointerEvents="none" style={styles.shieldBadge}><Text style={{color:'#08336e',fontWeight:'900',fontSize:12}}>{SHIELD_ICON[equippedShield.shield_type]||'🛡️'} {equippedShield.remaining_hits}/{equippedShield.max_hits}</Text></View>}{!!game.lastShieldBlock&&<View pointerEvents="none" style={styles.shieldFlash}><Text style={{fontSize:36}}>🛡️</Text><Text style={{color:'#fff',fontWeight:'900'}}>BLOCKED!</Text></View>}{!!speech&&<View style={styles.speech}><Text style={{fontSize:12,fontWeight:'900',color:'#2b2146'}}>{speech}</Text></View>}</View>
    {!!shieldMessage&&<Text accessibilityLiveRegion="polite" style={styles.shieldMessage}>{shieldMessage}</Text>}
    {!!game.quickEscape&&<Text accessibilityLiveRegion="polite" style={styles.powerNotice}>🪽 QUICK ESCAPE READY · {game.quickEscapeOwner===1?name1:name2}&apos;s next tension increase is blocked.</Text>}
    <View style={styles.controls}><View style={styles.box}><Text style={styles.label}>Dice roll</Text><View style={{alignItems:'center'}}><DicePreview face={Math.min(game.roll||face,6)} rolling={game.phase==='rolling'}/><Text style={styles.strong}>{game.roll?`${game.roll} spray${game.roll===1?'':'s'}`:'Ready to roll?'}</Text><Text style={styles.hint}>{game.roll?'Spray to finish your turn':'1–6 sprays per turn'}</Text></View></View><View style={styles.box}><Text style={styles.label}>Tissue tension</Text><View style={styles.meter}><View style={{height:'100%',width:`${100-strength}%`,backgroundColor:C.gold}}/></View><Text style={styles.strong}>{strength>70?'Strong':strength>40?'Getting weak':strength>15?'Very fragile':'About to snap!'}</Text><Text style={styles.hint}>{game.total} sprays · {game.rounds} rounds</Text><Text style={{fontSize:21,color:points<0?'#ff9090':C.gold,fontWeight:'900',marginTop:12}}>{points>0?'+':''}{points} <Text style={styles.hint}>round points</Text></Text></View></View>
    <View style={styles.actions}><Chip label={game.phase==='rolling'?'🎲 Rolling…':'🎲 Roll the dice'} gold onPress={()=>roll()} disabled={game.phase!=='ready'||!playerTurn||adPaused||powerBusy}/><Chip label="💦 Spray tissue" onPress={sprayPressed} disabled={game.phase!=='spraying'||!playerTurn||adPaused||shieldProcessing||powerBusy}/></View>
    <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text>
    <View style={styles.reward}><View style={{flex:1}}><Text style={{color:C.gold,fontWeight:'900'}}>🥚 Save the tissue</Text><Text style={styles.hint}>{game.rewardsUsed?'Reward used for this game.':!game.history.length?'Play your first turn to unlock one four-spray rewind.':'Watch an advert to rewind up to four sprays (once per game).'}</Text>{!!adMessage&&<Text style={styles.hint}>{adMessage}</Text>}</View><Pressable accessibilityRole="button" onPress={reward} disabled={rewardBlocked||adStatus==='loading'||!adsReady} style={[styles.rewardButton,(rewardBlocked||!adsReady)&&{opacity:.45}]}><Text style={{color:'#07336b',fontWeight:'900',fontSize:12,textAlign:'center'}}>{rewardLabel}</Text></Pressable></View>
    {game.phase==='counter'&&<View style={styles.counterPanel}><Text style={styles.strong}>🛡️ Respond to the incoming attack</Text><Text style={styles.hint}>Counter it with one saved Counter Attack, or continue your turn.</Text><View style={styles.actions}><Chip label={`Counter · ${powerInventory.counter_attack||0}`} gold onPress={()=>runPowerup('counter_attack')} disabled={powerBusy||!userId||(powerInventory.counter_attack||0)<1}/><Chip label="Continue turn" onPress={()=>commit(declineCounter(gameRef.current))} disabled={powerBusy}/></View></View>}
    {game.gameMode==='tour'&&<Text style={styles.strong}>🏆 Tournament {tournament[0]}–{tournament[1]} · {tournament.some(n=>n>=2)?`${tournament[0]>tournament[1]?name1:name2} is champion!`:'First to 2 wins'}</Text>}
    {over&&<View style={styles.result}><Text style={styles.strong}>{won?'🏆 You kept the egg safe!':'A brave round!'}</Text><Text style={{fontSize:22,fontWeight:'900',color:(result?.points??points)<0?'#ff9090':C.gold}}>{(result?.points??points)>0?'+':''}{result?.points??points} points</Text><Text style={styles.hint}>{game.safeSprays} safe sprays · {game.rounds} rounds · {game.difficulty} difficulty</Text>{result&&!result.synced&&<Text style={styles.hint}>Saved on this phone. Waiting to sync.</Text>}<Chip label="View leaderboard" onPress={async()=>{await finalize(gameRef.current);router.push('/(tabs)/leaderboard')}}/></View>}
    <View style={styles.actions}><Chip label="🔁 Rematch" onPress={rematch} disabled={game.phase!=='over'||rematchedGameId===game.gameId}/><Chip label="⚡ Power-ups" onPress={()=>setPowerupsOpen(true)} disabled={powerBusy}/></View><Text style={styles.hint}>Roll 1–6, then spray that many times. Every spray weakens the tissue. The player who makes the egg fall loses.</Text>
  </View></ScrollView></SafeAreaView>;
}
const SHIELD_ICON={basic:'🛡️',golden:'✨',super:'💎'};
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#504078'},scroll:{padding:12,paddingTop:6,paddingBottom:20,width:'100%',maxWidth:540,alignSelf:'center'},title:{fontSize:26,fontWeight:'900',letterSpacing:-.6,color:'#f5f9ff',marginBottom:8},panel:{backgroundColor:'#71539a',borderWidth:1,borderColor:'#39254f',borderRadius:16,padding:10,gap:8},scoreLine:{flexDirection:'row',alignItems:'center',gap:7},turn:{flex:1,fontSize:13,fontWeight:'900',color:'#fff'},status:{fontSize:11,fontWeight:'800',color:'#58d6a7',maxWidth:'32%',textAlign:'right'},scene:{width:'100%',position:'relative',borderRadius:24,overflow:'hidden',borderWidth:2,borderColor:'#39254f',backgroundColor:'#9fe6ff'},mood:{position:'absolute',top:7,left:10,fontSize:32},speech:{position:'absolute',left:54,top:12,maxWidth:'70%',alignSelf:'flex-start',backgroundColor:'#fff',borderRadius:4,padding:5},shieldBadge:{position:'absolute',right:8,top:8,zIndex:4,backgroundColor:'#e9f8ff',borderColor:'#68d6ff',borderWidth:2,borderRadius:16,paddingHorizontal:10,paddingVertical:6},shieldFlash:{...StyleSheet.absoluteFill,zIndex:3,alignItems:'center',justifyContent:'center',borderWidth:5,borderColor:'#8ee8ff',borderRadius:22,backgroundColor:'#0a9be044'},shieldMessage:{color:'#91eaff',fontWeight:'900',backgroundColor:'#59417f',padding:9,borderRadius:10},powerNotice:{color:'#fff0a3',fontWeight:'900',backgroundColor:'#59417f',padding:9,borderRadius:10},modalBackdrop:{flex:1,backgroundColor:'#001633bb',justifyContent:'center',alignItems:'center',padding:14},modalCard:{width:'100%',maxWidth:620,backgroundColor:'#504078',borderColor:C.gold,borderWidth:2,borderRadius:28,padding:16,gap:12,elevation:18},modalHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12},powerupItem:{flexDirection:'row',alignItems:'center',gap:10,padding:11,borderRadius:18,borderWidth:1,borderColor:'#65caff77',backgroundColor:'#71539a'},powerupIcon:{width:46,height:46,borderRadius:15,alignItems:'center',justifyContent:'center',backgroundColor:'#59417f',borderColor:C.gold,borderWidth:1},counterPanel:{gap:8,padding:12,borderRadius:18,borderWidth:1.5,borderColor:C.gold,backgroundColor:'#59417f'},powerTitle:{color:C.gold,fontWeight:'900',fontSize:16},powerHint:{color:'#c3ddff',fontWeight:'800',fontSize:11},controls:{flexDirection:'row',gap:8},box:{flex:1,minWidth:0,padding:9,borderWidth:1,borderColor:'#39254f',borderRadius:12,backgroundColor:'#8665ac'},label:{color:'#c3ddff',fontWeight:'800',fontSize:12,marginBottom:7},strong:{color:'#fff',fontWeight:'900',fontSize:13},hint:{color:'#c3ddff',fontSize:11,lineHeight:16},meter:{height:14,backgroundColor:'#ffffff38',borderRadius:4,overflow:'hidden',marginBottom:9},actions:{flexDirection:'row',gap:8},chip:{flex:1,minWidth:'30%',minHeight:48,paddingHorizontal:9,paddingVertical:10,borderRadius:18,borderWidth:3,borderColor:'#39254f',backgroundColor:'#8665ac',justifyContent:'center',alignItems:'center'},gold:{backgroundColor:'#ffd34f',borderColor:'#39254f'},chipText:{fontSize:12,fontWeight:'900',color:'#f5f9ff',textAlign:'center'},message:{padding:10,borderLeftWidth:5,borderLeftColor:'#ffd34f',backgroundColor:'#8665ac',fontSize:13,fontWeight:'800',color:'#f5f9ff'},reward:{flexDirection:'row',alignItems:'center',gap:8,borderWidth:1.5,borderColor:'#ffd34f',borderRadius:12,padding:10,backgroundColor:'#59417f'},rewardButton:{backgroundColor:'#ffd34f',borderRadius:10,padding:10,maxWidth:'46%',minHeight:46,justifyContent:'center'},result:{backgroundColor:'#59417f',padding:14,borderRadius:14,gap:8}});

