import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as Speech from 'expo-speech';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';

export function useGameAudio(enabled, active, gameOver) {
  const roll=useAudioPlayer(require('../../browser/assets/audio/original-roll.wav')),spray=useAudioPlayer(require('../../browser/assets/audio/original-spray.wav')),crash=useAudioPlayer(require('../../browser/assets/audio/original-crash.wav')),fall=useAudioPlayer(require('../../browser/assets/audio/original-fall.wav')),scream=useAudioPlayer(require('../../browser/assets/audio/wilhelm-scream.ogg')),win=useAudioPlayer(require('../../browser/assets/audio/original-win.wav')),lose=useAudioPlayer(require('../../browser/assets/audio/original-lose.wav')),heartbeat=useAudioPlayer(require('../../browser/assets/audio/original-heartbeat.wav')),danger=useAudioPlayer(require('../../browser/assets/audio/original-danger.wav')),mood0=useAudioPlayer(require('../../browser/assets/audio/original-mood0.wav')),mood1=useAudioPlayer(require('../../browser/assets/audio/original-mood1.wav')),mood2=useAudioPlayer(require('../../browser/assets/audio/original-mood2.wav'));
  const music1=useAudioPlayer(require('../../assets/game-music/egg-tissue-track-1.mp3'));
  const music2=useAudioPlayer(require('../../assets/game-music/egg-tissue-track-2.mp3'));
  const music3=useAudioPlayer(require('../../assets/game-music/egg-tissue-track-3.mp3'));
  const players=useMemo(()=>({roll,spray,crash,fall,scream,win,lose,heartbeat,danger,mood0,mood1,mood2}),[roll,spray,crash,fall,scream,win,lose,heartbeat,danger,mood0,mood1,mood2]);
  const musicPlayers=useMemo(()=>[music1,music2,music3],[music1,music2,music3]);
  const started=useRef(false),selectedTrack=useRef(-1);
  const audioState=useRef({enabled,active,gameOver});
  useEffect(()=>{audioState.current={enabled,active,gameOver};},[enabled,active,gameOver]);

  useEffect(()=>{
    setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:false}).catch(()=>{});
    musicPlayers.forEach(player=>{player.loop=true;player.volume=.13;});
  },[musicPlayers]);

  const startMusic=useCallback(()=>{
    const state=audioState.current;
    if(!state.enabled||!state.active||state.gameOver)return;
    let index=Math.floor(Math.random()*musicPlayers.length);
    if(index===selectedTrack.current)index=(index+1+Math.floor(Math.random()*(musicPlayers.length-1)))%musicPlayers.length;
    selectedTrack.current=index;
    musicPlayers.forEach((player,i)=>{
      player.pause();
      if(i===index){const seeking=player.seekTo(0);player.play();seeking.catch(()=>{});}
    });
  },[musicPlayers]);

  useEffect(()=>{
    if(gameOver){
      musicPlayers.forEach(player=>player.pause());
      started.current=false;
      Speech.stop().catch(()=>{});
      return;
    }
    if(!enabled||!active){
      musicPlayers.forEach(player=>player.pause());
      Object.values(players).forEach(player=>player.pause());
      Speech.stop().catch(()=>{});
      return;
    }
    if(started.current&&selectedTrack.current>=0)musicPlayers[selectedTrack.current].play();
  },[enabled,active,gameOver,musicPlayers,players]);

  const startGame=useCallback(()=>{
    if(!enabled||!active||gameOver||started.current)return;
    started.current=true;
    // Start the instrumental immediately when Play opens.
    startMusic();
  },[enabled,active,gameOver,startMusic]);

  const play=useCallback((name)=>{
    if(!enabled||!active)return;
    const player=players[name];
    if(player){
      // Seek and play in the same gesture so local sound effects stay responsive.
      const seeking=player.seekTo(0);
      player.play();
      seeking.catch(()=>{});
    }
  },[enabled,active,players]);

  return useMemo(()=>({play,startGame}),[play,startGame]);
}
