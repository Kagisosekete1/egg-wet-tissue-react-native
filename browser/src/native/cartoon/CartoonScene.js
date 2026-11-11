import {useSceneryMotion} from '../../web/useSceneryMotion';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {AppState,View} from 'react-native';
import Svg,{ClipPath,Defs,Ellipse,G,LinearGradient,Path,Rect,Stop} from 'react-native-svg';
import {tissueShape,tissueTopAt,tissueBottomAt,SPRAYER,sprayerNozzle} from './layout';
import {worldAt} from './worlds';
import {outline} from './palette';
import Egg from './characters/Egg';
import Bottle from './characters/Bottle';
import SprayerHand from './characters/SprayerHand';
import Landscape from './environments/Landscape';
import Star from './effects/Star';
import SplashImpact from './effects/SplashImpact';
import LandingDust from './effects/LandingDust';
import {Scheduler} from '../../web/scheduler';
const emotion=r=>r>=.8?4:r>=.5?3:r>=.25?2:r>=.06?1:0;
const nozzle=sprayerNozzle();
/** Only gameplay events render React. Browser transforms animate each short effect. */
export default function CartoonScene({worldIndex=0,danger=0,sprayToken=0,falling=false,fallVariant='wobble',resetToken=0,paused=false,onImpact}){
 const sceneRef=useRef(null);
 useSceneryMotion(sceneRef,paused);
 const [visibleSpray,setVisibleSpray]=useState(0),[landed,setLanded]=useState(false),[foreground,setForeground]=useState(!document.hidden);
 const [scheduler]=useState(()=>new Scheduler()),previousSpray=useRef(sprayToken),callback=useRef(onImpact);
 useEffect(()=>{callback.current=onImpact;},[onImpact]);
 useEffect(()=>{const sub=AppState.addEventListener('change',s=>setForeground(s==='active'));return()=>sub.remove();},[]);
 useEffect(()=>{if(paused||!foreground)scheduler.pause();else scheduler.resume();},[paused,foreground,scheduler]);
 useEffect(()=>{if(previousSpray.current===sprayToken)return;previousSpray.current=sprayToken;setVisibleSpray(sprayToken);return scheduler.schedule(850,()=>setVisibleSpray(0));},[sprayToken,resetToken,scheduler]);
 useEffect(()=>{setVisibleSpray(0);},[resetToken]);
 useEffect(()=>{setLanded(false);if(!falling)return;return scheduler.schedule(900,()=>{setLanded(true);callback.current?.();});},[falling,resetToken,scheduler]);
 useEffect(()=>()=>scheduler.clear(),[scheduler]);
 const world=useMemo(()=>worldAt(worldIndex),[worldIndex]),ratio=Math.max(0,Math.min(1,danger)),sag=ratio*100,spray=visibleSpray!==0,eggY=760+sag*.5;
 return <View className={`cartoon-scene ${paused||!foreground?'scene-paused':''}`} style={{flex:1,backgroundColor:'#91e1e7'}} accessible accessibilityLabel={`Cartoon egg ${falling?'has fallen':ratio>.8?'looks frightened':'balances on the tissue'}`}><Svg ref={sceneRef} width="100%" height="100%" viewBox="0 0 1080 1300" preserveAspectRatio="xMidYMid slice"><Defs>
 <LinearGradient id="sky" x2="0" y2="1"><Stop stopColor={world.sky[0]}/><Stop offset="1" stopColor={world.sky[1]}/></LinearGradient>
 <LinearGradient id="shell" x2="1" y2="1"><Stop stopColor="#fffdf1"/><Stop offset=".55" stopColor="#ffecc0"/><Stop offset="1" stopColor="#efa665"/></LinearGradient>
 <LinearGradient id="bottle" x2="1" y2="1"><Stop stopColor="#ff98bd"/><Stop offset="1" stopColor="#dc4d94"/></LinearGradient>
 <LinearGradient id="leaf" x2="1" y2="1"><Stop stopColor={world.leaf[0]}/><Stop offset="1" stopColor={world.leaf[1]}/></LinearGradient>
 <LinearGradient id="table" x2="0" y2="1"><Stop stopColor={world.table[0]}/><Stop offset="1" stopColor={world.table[1]}/></LinearGradient>
 <LinearGradient id="wet-tissue" x2="0" y2="1"><Stop stopColor="#a3f0f5"/><Stop offset="1" stopColor="#53bedc"/></LinearGradient>
 <ClipPath id="tissue-clip"><Path d={tissueShape(sag)}/></ClipPath></Defs>
 <Landscape world={world}/>
 <G {...outline}>{[170,863].map(x=><G key={x}><Rect x={x} y="734" width="47" height="359" rx="23" fill="#c89b79"/><Path d={`M${x+14} 779v260M${x+32} 803v190`} stroke="#ecd0a1" strokeWidth="5" strokeLinecap="round"/><Ellipse cx={x+23.5} cy="748" rx="29" ry="14" fill="#eac99c" strokeWidth="5"/></G>)}
 {!falling?<Path d={tissueShape(sag)} fill="#f6fcff" strokeWidth="4" strokeLinejoin="round"/>:<G className="torn-tissue" strokeWidth="4" strokeLinejoin="round"><Path d="M190 750Q300 763 385 842Q429 881 447 925Q450 940 434 930L419 936 406 926 392 932Q368 913 350 896Q265 828 190 806Q180 781 190 750Z" fill="#d0f3f5"/><Path d="M890 750Q787 760 705 842Q660 886 636 927Q630 939 647 932L661 941 675 931 689 937Q715 918 735 897Q812 829 890 807Q903 781 890 750Z" fill="#d0f3f5"/><Path d="M211 775Q310 804 390 893M871 776Q780 806 697 895" fill="none" stroke="#99d2dc" strokeWidth="5"/><Path d="M399 924l-3 12m19-7 3 14m15-12 6 9m223-5-4 12m15-12 3 13" stroke="#eefeff" strokeWidth="3" strokeLinecap="round"/></G>}</G>
 {!falling&&<G clipPath="url(#tissue-clip)" opacity=".22">{Array.from({length:12},(_,i)=><Path key={i} d={`M${220+i*53} 755q-8 20 3 48`} stroke="#8ba9b4" strokeWidth="2" fill="none"/>)}<Path d={`M209 789Q540 ${802+sag} 878 789`} stroke="#9ebdc8" strokeWidth="3" fill="none" strokeDasharray="4 9"/></G>}
 {!falling&&(ratio>0||spray)&&<G id="wet-tissue-layer"><G clipPath="url(#tissue-clip)"><Path d={tissueShape(sag)} fill="url(#wet-tissue)" opacity={Math.min(.86,ratio*.9+(spray?.12:0))}/>{Array.from({length:Math.max(1,Math.ceil(ratio*8))},(_,i)=>{const x=[720,650,580,800,500,420,340,270][i],y=(tissueTopAt(x,sag)+tissueBottomAt(x,sag))/2;return <G key={i}><Ellipse cx={x} cy={y} rx={16+ratio*31} ry={8+ratio*7} fill="#2faad3" opacity={.35+ratio*.35}/><Path d={`M${x-8} ${y-3}Q${x} ${y-7} ${x+8} ${y-3}`} fill="none" stroke="#eaffff" strokeWidth="4" strokeLinecap="round"/></G>;})}</G>{ratio>.12&&[350,580,775].map((x,i)=>{const y=tissueBottomAt(x,sag)+10;return <G key={x} data-scenery-motion={ratio>.25?'drip':undefined} data-motion-index={i} className={ratio>.25?`ambient-drip drip-${i}`:''}><Path d={`M${x} ${y-13}C${x-4} ${y-4} ${x-13} ${y+4} ${x-10} ${y+10}C${x-6} ${y+22} ${x+11} ${y+19} ${x+11} ${y+9}C${x+11} ${y+2} ${x+4} ${y-5} ${x} ${y-13}Z`} fill="#62dafa" stroke="#288ebd" strokeWidth="3"/><Ellipse cx={x-3} cy={y+7} rx="3" ry="5" fill="#e3fcff"/></G>;})}</G>}
 <G transform={`translate(540 ${eggY})`}><G key={resetToken} className={falling?'egg-fall':''} style={{'--fall-y':`${1080-eggY}px`,'--fall-rotation':`${fallVariant==='spin'?355:22}deg`}}><G data-scenery-motion={falling?undefined:'egg'} transform="translate(0 0)" className={landed?'egg-landing':falling?'':ratio>.25?'ambient-egg egg-nervous':'ambient-egg'}><Egg mood={falling?5:emotion(ratio)} blink={false} arm={falling?55:emotion(ratio)*7} landed={landed}/></G></G></G>
 <G key={`bottle-${spray?visibleSpray:0}`} className={spray?'bottle-squeeze':''} style={{transformOrigin:`${SPRAYER.x}px ${SPRAYER.y}px`}}><Bottle squeeze={0}/><SprayerHand pressing={spray}/></G>
 {spray&&<G key={visibleSpray} id="visible-spray-drops">{Array.from({length:12},(_,i)=>{const tx=650+i%4*35,ty=tissueTopAt(tx,sag)+12;return <G key={i} className="spray-particle" style={{'--sx':`${nozzle.x}px`,'--sy':`${nozzle.y}px`,'--mx':`${nozzle.x-105}px`,'--my':`${nozzle.y+45}px`,'--tx':`${tx}px`,'--ty':`${ty}px`,'--delay':`${i*.028}s`}}><Ellipse rx={7+i%3} ry={12+i%3} fill="#71e0fa" stroke="#247faf" strokeWidth="3"/><Ellipse cx="-2" cy="-4" rx="2" ry="5" fill="#eaffff"/></G>;})}<G className="splash-animation" style={{transformOrigin:`675px ${tissueTopAt(675,sag)}px`}}><SplashImpact x={675} y={tissueTopAt(675,sag)} progress={.4}/></G></G>}
 {landed&&<G className="landing-animation" style={{transformOrigin:'540px 1100px'}}><LandingDust progress={.4}/>{Array.from({length:6},(_,i)=><Star key={i} x={540+Math.cos(i*2.4)*150} y={1020-Math.sin(i)*70} size={.7} rotation={i*30} color={i%2?'#ffd64f':'#ff94be'}/>)}</G>}
 <G className="ambient-leaves" data-scenery-motion="leaves">{[0,1080].map((x,i)=><G key={x} transform={`translate(${x} 1280) scale(${i?-1:1} 1)`}><Path d="M0 0Q140 -200 180 -100Q170 -30 0 0M0 0Q30 -250 80 -240Q140 -140 0 0" fill="url(#leaf)" {...outline}/><Path d="M0 0L138 -104M0 0L75 -205" stroke="#d5ec9c" strokeWidth="7"/></G>)}</G>
 </Svg></View>;
}
