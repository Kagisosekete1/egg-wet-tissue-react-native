import React,{useEffect,useRef,useState} from 'react';
import {G} from 'react-native-svg';
import Bottle from './Bottle';
import SprayerHand from './SprayerHand';
import {SPRAYER} from '../layout';
import {Scheduler} from '../../../web/scheduler';

/** A few pause-aware events per spray; never a React animation frame loop. */
export default function SprayerRig({ready=false,sprayToken=0,resetToken=0,paused=false,onSpray}){
 const [pose,setPose]=useState('away'),[pulse,setPulse]=useState(0);
 const phase=useRef('away'),due=useRef(ready),active=useRef(false),last=useRef(sprayToken),reset=useRef(resetToken),emit=useRef(onSpray),[clock]=useState(()=>new Scheduler());
 due.current=ready;emit.current=onSpray;
 const change=next=>{phase.current=next;setPose(next);};
 function enter(){clock.clear();change('entering');clock.schedule(190,()=>change('ready'));}
 function leave(){clock.clear();change('leave');clock.schedule(200,()=>change('away'));}
 function press(token){active.current=true;setPulse(token);change('pump');clock.schedule(60,()=>emit.current?.(token));clock.schedule(310,()=>{active.current=false;if(due.current)change('ready');else leave();});}
 useEffect(()=>{if(paused)clock.pause();else clock.resume();},[paused,clock]);
 useEffect(()=>{if(reset.current===resetToken)return;reset.current=resetToken;clock.clear();active.current=false;last.current=sprayToken;change('away');if(due.current)enter();},[resetToken,clock]);
 useEffect(()=>{if(last.current===sprayToken)return;last.current=sprayToken;clock.clear();active.current=true;const token=sprayToken;if(['away','leave','entering'].includes(phase.current)){change('entering');clock.schedule(190,()=>press(token));}else press(token);},[sprayToken,clock]);
 useEffect(()=>{if(active.current)return;if(ready){if(phase.current==='away'||phase.current==='leave')enter();}else if(phase.current!=='away')leave();},[ready,clock]);
 useEffect(()=>()=>clock.clear(),[clock]);
 const pressing=pose==='pump',away=pose==='away'||pose==='leave';
 return <G id="sprayer-rig" data-pose={pose} className="sprayer-rig" transform={away?'translate(460 -135)':'translate(0 0)'} opacity={pose==='away'?0:1}>
  <G transform={`translate(${SPRAYER.x} ${SPRAYER.y}) rotate(${SPRAYER.angle}) scale(${-SPRAYER.scale} ${SPRAYER.scale})`}>
   <G className={`${pressing?'sprayer-recoil':''} ${pulse%2?'':'pulse-even'}`}>
    <SprayerHand part="back" placed/>
    <Bottle placed pressing={pressing}/>
    <SprayerHand placed pressing={pressing}/>
   </G>
  </G>
 </G>;
}
