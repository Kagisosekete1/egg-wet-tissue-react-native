import React from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import Helicopter from './Helicopter';
import { outline } from '../palette';
function Cloud({x,y,scale=1}){return <G id={`moving-cloud-${y}`} transform={`translate(${x} ${y}) scale(${scale})`} fill="#fff8ef" opacity={.85}><Ellipse rx="100" ry="30"/><Circle cx="-40" cy="-22" r="35"/><Circle cx="16" cy="-40" r="49"/><Circle cx="65" cy="-14" r="30"/></G>;}
export default function Landscape({time}){return <G>
  <Rect width="1080" height="1300" fill="url(#sky)"/>
  <G transform={`translate(${Math.sin(time*.1)*8} 0)`}><Circle cx="870" cy="155" r="86" fill="#ffda65"/><Circle cx="850" cy="135" r="57" fill="#fff19b"/>
  <Cloud x={(time*13+350)%1450-150} y={300}/><Cloud x={(time*20+820)%1450-150} y={410} scale={.65}/><Cloud x={(time*9+1150)%1450-150} y={465} scale={.8}/></G>
  <Helicopter time={time} reduced={time===0}/>
  <SkyTraffic time={time}/>
  <Path d="M-80 780 Q170 300 430 750 Q720 250 1140 770V1300H0Z" fill="#a2c5d7"/>
  <Path d="M-80 870Q190 530 510 800Q850 450 1170 840V1300H0Z" fill="#79c5b4"/>
  {[80,970].map((x,i)=><G key={x} transform={`translate(${x} ${680+i*30})`}><Path d="M0 310L20 -40 50 -40 65 310Z" fill="#ad7c81" {...outline}/><Path d="M-95 40Q-125 -60 -30 -90Q-5 -195 70 -110Q185 -100 130 0Q160 90 60 85Q-40 140 -95 40Z" fill="url(#leaf)" {...outline}/><Path d="M-45 -20Q-10 -60 12 -60" stroke="#c0ef90" strokeWidth="18" strokeLinecap="round" fill="none"/></G>)}
  <Path d="M0 1000Q250 880 540 1000Q850 840 1080 990V1300H0Z" fill="#b7dc83"/>
  <Rect x="-20" y="1090" width="1120" height="210" rx="35" fill="url(#table)" {...outline}/>
  <Path d="M0 1145H1080M140 1210H400M660 1260H1000" stroke="#ce7c6c" strokeWidth="8" opacity={.5}/>
</G>;}

// Small background traffic follows the old game's sky motion: clouds drift,
// birds flap past, and a toy plane crosses the screen on a five-second loop.
function SkyTraffic({time}){
  const planePhase=((time%5)/5);
  const planeX=-150+planePhase*1380;
  const planeY=306+Math.sin(time*1.6)*9;
  const birds=[0,1,2].map(i=>{
    const phase=((time+i*1.66)%5)/5;
    return {x:-70+phase*1240,y:376+i*44+Math.sin(time*2.6+i)*10,wing:Math.sin(time*13+i*2)*22,visible:phase<.9};
  });
  return <G>
    <G id="passing-cute-airplane" transform={`translate(${planeX} ${planeY}) scale(.42)`}>
      <Path d="M-88 1Q-91-6-78-10L-24-16 13-48Q20-54 26-49L14-15 69-11Q84-10 88-3 91 4 77 7L16 12 0 39Q-5 46-13 42L-4 10-74 12Q-85 11-88 1Z" fill="#fff5df" stroke="#39254f" strokeWidth="5" strokeLinejoin="round"/>
      <Path d="M-42-13 10-15M-37 9 14 8" stroke="#64cbd8" strokeWidth="5" strokeLinecap="round"/>
      <Circle cx="-78" cy="0" r="5" fill="#ffd34f" stroke="#39254f" strokeWidth="2"/>
      <Path d="M-95-13v27" stroke="#39254f" strokeWidth="4" strokeLinecap="round"/>
    </G>
    {birds.filter(b=>b.visible).map((bird,i)=><G key={`sky-bird-${i}`} id={`passing-sky-bird-${i}`} transform={`translate(${bird.x} ${bird.y})`}>
      <Path d={`M-21 3Q-11 ${bird.wing} 0 3Q11 ${-bird.wing} 21 3Q10 -1 0 9Q-10 -1 -21 3Z`} fill="#fffbef" stroke="#39254f" strokeWidth="3" strokeLinejoin="round"/>
      <Circle cx="-4" cy="4" r="1.7" fill="#39254f"/>
      <Path d="m18 3 8 2-8 3" fill="#ffd34f" stroke="#39254f" strokeWidth="2" strokeLinejoin="round"/>
    </G>)}
  </G>;
}
