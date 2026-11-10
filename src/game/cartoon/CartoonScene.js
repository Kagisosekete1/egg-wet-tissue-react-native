import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, View } from 'react-native';
import Svg, { ClipPath, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { tissueShape, tissueTopAt, tissueBottomAt, sprayDrops } from './layout';
import { outline } from './palette';
import Egg from './characters/Egg';
import Bottle from './characters/Bottle';
import Landscape from './environments/Landscape';
import Star from './effects/Star';
const emotion=ratio=>ratio>=.8?4:ratio>=.5?3:ratio>=.25?2:ratio>=.06?1:0;
const clamp=n=>Math.max(0,Math.min(1,n));

/** Independent SVG layers/parts; bounded 30fps clock only while visible and unpaused. */
export default function CartoonScene({danger=0,sprayToken=0,falling=false,fallVariant='wobble',resetToken=0,paused=false,onImpact}){
  const [time,setTime]=useState(0),[reduced,setReduced]=useState(false),[foreground,setForeground]=useState(true);
  const [sprayedAt,setSprayedAt]=useState({at:-10,reset:resetToken}),[fellAt,setFellAt]=useState(null);
  const clock=useRef(0),impacted=useRef(false),callback=useRef(onImpact),previousSpray=useRef(sprayToken);
  useEffect(()=>{callback.current=onImpact;},[onImpact]);
  useEffect(()=>{let mounted=true;AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(mounted)setReduced(v);}).catch(()=>{});const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);const app=AppState.addEventListener('change',s=>setForeground(s==='active'));return()=>{mounted=false;sub.remove();app.remove();};},[]);
  useEffect(()=>{if(paused||!foreground)return;let last=Date.now();const id=setInterval(()=>{const now=Date.now();clock.current+=Math.min((now-last)/1000,.1);last=now;setTime(clock.current);},1000/30);return()=>clearInterval(id);},[paused,foreground]);
  useEffect(()=>{if(previousSpray.current!==sprayToken){previousSpray.current=sprayToken;setSprayedAt({at:clock.current,reset:resetToken});}},[sprayToken,resetToken]);
  useEffect(()=>{setFellAt(falling?clock.current:null);impacted.current=false;},[falling,resetToken]);
  useEffect(()=>{if(fellAt!==null&&time-fellAt>=.9&&!impacted.current){impacted.current=true;callback.current?.();}},[time,fellAt]);
  const ratio=clamp(danger),sag=ratio*100,age=sprayedAt.reset===resetToken?time-sprayedAt.at:10,spray=age>=0&&age<.75,fallAge=fellAt===null?0:time-fellAt;
  const drop=falling?clamp((fallAge-.2)/.7):0,landed=drop===1,bob=reduced?0:Math.sin(time*2.6)*5,wobble=reduced?0:Math.sin(time*(ratio>.5?12:6))*Math.max(0,ratio-.06)*8;
  const wet=ratio>0||spray,drops=spray?sprayDrops(age,sag,reduced):[];
  const eggY=760+sag*.5+drop*(1080-760-sag*.5),scaleY=landed?1-Math.sin(clamp((fallAge-.9)/.22)*Math.PI)*.2:1;
  return <View style={{flex:1,backgroundColor:'#91e1e7'}} accessible accessibilityLabel={`Cartoon egg ${falling?'has fallen':ratio>.8?'looks frightened':'balances on the tissue'}`}><Svg width="100%" height="100%" viewBox="0 0 1080 1300" preserveAspectRatio="xMidYMid slice">
  <Defs>
  <LinearGradient id="sky" x2="0" y2="1"><Stop stopColor="#4dc9e4"/><Stop offset="1" stopColor="#ecf4ba"/></LinearGradient>
  <LinearGradient id="shell" x2="1" y2="1"><Stop stopColor="#fffdf1"/><Stop offset=".55" stopColor="#ffecc0"/><Stop offset="1" stopColor="#efa665"/></LinearGradient>
  <LinearGradient id="bottle" x2="1" y2="1"><Stop stopColor="#ff98bd"/><Stop offset="1" stopColor="#dc4d94"/></LinearGradient>
  <LinearGradient id="leaf" x2="1" y2="1"><Stop stopColor="#a0dc77"/><Stop offset="1" stopColor="#47a793"/></LinearGradient>
  <LinearGradient id="table" x2="0" y2="1"><Stop stopColor="#ffd39a"/><Stop offset="1" stopColor="#eaa180"/></LinearGradient>
  <LinearGradient id="wet-tissue" x2="0" y2="1"><Stop stopColor="#a3f0f5"/><Stop offset="1" stopColor="#53bedc"/></LinearGradient>
  <ClipPath id="tissue-clip"><Path d={tissueShape(sag)}/></ClipPath>
  </Defs>
  <Landscape time={reduced?0:time}/>
  <G {...outline}>{[170,863].map(x=><G key={x}><Rect x={x} y="734" width="47" height="359" rx="23" fill="#c89b79"/><Path d={`M${x+14} 779v260M${x+32} 803v190`} stroke="#ecd0a1" strokeWidth="5" strokeLinecap="round"/><Ellipse cx={x+23.5} cy="748" rx="29" ry="14" fill="#eac99c" strokeWidth="5"/></G>)}
  {!falling?<Path d={tissueShape(sag)} fill="#f6fcff" strokeWidth="4" strokeLinejoin="round"/>:<G><G className="torn-tissue" strokeWidth="4" strokeLinejoin="round"><Path d="M190 750Q300 763 385 842Q429 881 447 925Q450 940 434 930L419 936 406 926 392 932Q368 913 350 896Q265 828 190 806Q180 781 190 750Z" fill="#d0f3f5"/><Path d="M890 750Q787 760 705 842Q660 886 636 927Q630 939 647 932L661 941 675 931 689 937Q715 918 735 897Q812 829 890 807Q903 781 890 750Z" fill="#d0f3f5"/><Path d="M211 775Q310 804 390 893M871 776Q780 806 697 895" fill="none" stroke="#99d2dc" strokeWidth="5"/><Path d="M399 924l-3 12m19-7 3 14m15-12 6 9m223-5-4 12m15-12 3 13" stroke="#eefeff" strokeWidth="3" strokeLinecap="round"/></G></G>}</G>
  {!falling&&<G clipPath="url(#tissue-clip)" opacity=".22">{Array.from({length:18},(_,i)=><Path key={i} d={`M${220+i*36} 755q-8 20 3 48`} stroke="#8ba9b4" strokeWidth="2" fill="none"/>)}<Path d={`M209 789Q540 ${802+sag} 878 789`} stroke="#9ebdc8" strokeWidth="3" fill="none" strokeDasharray="4 9"/></G>}
  {!falling&&wet&&<G id="wet-tissue-layer">
    <G clipPath="url(#tissue-clip)"><Path d={tissueShape(sag)} fill="url(#wet-tissue)" opacity={Math.min(.86,ratio*.9+(spray?.12:0))}/>
    {Array.from({length:8},(_,i)=>{const x=[720,650,580,800,500,420,340,270][i],y=(tissueTopAt(x,sag)+tissueBottomAt(x,sag))/2,visible=i<Math.max(1,Math.ceil(ratio*8));return visible?<G key={i}><Ellipse cx={x} cy={y} rx={16+ratio*31} ry={8+ratio*7} fill="#2faad3" opacity={.35+ratio*.35}/><Path d={`M${x-8} ${y-3}Q${x} ${y-7} ${x+8} ${y-3}`} fill="none" stroke="#eaffff" strokeWidth="4" strokeLinecap="round"/></G>:null;})}</G>
    {[350,580,775].map((x,i)=>{const phase=reduced?.25:(time*.72+i*.33)%1,y=tissueBottomAt(x,sag)+10+(ratio>.25?phase*70:0);return <G key={x} opacity={ratio>.12?(.65+ratio*.25)*(ratio>.25?1-phase*.6:1):0}><Path d={`M${x} ${y-13}C${x-4} ${y-4} ${x-13} ${y+4} ${x-10} ${y+10}C${x-6} ${y+22} ${x+11} ${y+19} ${x+11} ${y+9}C${x+11} ${y+2} ${x+4} ${y-5} ${x} ${y-13}Z`} fill="#62dafa" stroke="#288ebd" strokeWidth="3"/><Ellipse cx={x-3} cy={y+7} rx="3" ry="5" fill="#e3fcff"/></G>;})}
  </G>}
  <G transform={`translate(${540+wobble} ${eggY+(falling?0:bob)}) rotate(${falling?drop*(fallVariant==='spin'?355:22):0}) scale(1 ${scaleY})`}><Egg mood={falling?5:emotion(ratio)} blink={!reduced&&!falling&&time%4>3.8} arm={falling?55:reduced?emotion(ratio)*5:emotion(ratio)*7+Math.sin(time*(ratio>.5?8:3))*9} landed={landed}/></G>
  <Bottle squeeze={spray?Math.sin(Math.min(1,age/.55)*Math.PI):0}/>
  {spray&&<G id="visible-spray-drops">{drops.map(d=><G key={d.id} transform={`translate(${d.x} ${d.y}) rotate(${d.angle})`} opacity={d.opacity}><Ellipse rx={d.radius} ry={d.radius*1.7} fill="#71e0fa" stroke="#247faf" strokeWidth="3"/><Ellipse cx="-2" cy="-4" rx="2" ry="5" fill="#eaffff"/></G>)}</G>}
  {spray&&age>.25&&<G id="water-impact" opacity={Math.max(0,1-(age-.25)*2)}>{[0,1,2,3,4].map(i=>{const x=675+(i-2)*18,y=tissueTopAt(x,sag)+4;return <Path key={i} d={`M${x} ${y}l${(i-2)*7} ${-13-(i%2)*10}`} stroke="#46bfdf" strokeWidth="6" strokeLinecap="round"/>;})}</G>}
  {landed&&fallAge<2.4&&Array.from({length:9},(_,i)=>{const p=clamp((fallAge-.9)/1.5),a=i*2.4;return <Star key={i} x={540+Math.cos(a)*(80+p*220)} y={1050-Math.sin(i)*70-p*130} size={.5+p*.4} rotation={i*30+p*100} color={i%2?'#ffd64f':'#ff94be'}/>;})}
  <G transform={`translate(${reduced?0:Math.sin(time*.7)*5} 0)`}>{[0,1080].map((x,i)=><G key={x} transform={`translate(${x} 1280) scale(${i?-1:1} 1)`}><Path d="M0 0Q140 -200 180 -100Q170 -30 0 0M0 0Q30 -250 80 -240Q140 -140 0 0" fill="url(#leaf)" {...outline}/><Path d="M0 0L138 -104M0 0L75 -205" stroke="#d5ec9c" strokeWidth="7"/></G>)}</G>
  </Svg></View>;
}
