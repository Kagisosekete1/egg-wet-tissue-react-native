import React,{memo} from 'react';
import { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import Helicopter from './Helicopter';
import { outline } from '../palette';
function Cloud({x,y,scale=1}){return <G className={`ambient-cloud cloud-${y}`} data-scenery-motion="cloud" data-motion-index={y===300?0:y===410?1:2}><G id={`moving-cloud-${y}`} transform={`translate(${x} ${y}) scale(${scale})`} fill="#fff8ef" opacity={.85}><Ellipse rx="100" ry="30"/><Circle cx="-40" cy="-22" r="35"/><Circle cx="16" cy="-40" r="49"/><Circle cx="65" cy="-14" r="30"/></G></G>;}
function Landscape({world}){return <G>
  <Rect width="1080" height="1300" fill="url(#sky)"/>
  <G><Circle cx="870" cy="155" r="86" fill="#ffda65"/><Circle cx="850" cy="135" r="57" fill="#fff19b"/>
  <Cloud x={200} y={300}/><Cloud x={670} y={410} scale={.65}/><Cloud x={1000} y={465} scale={.8}/></G>
  <Helicopter/>
  <Path d="M-80 780 Q170 300 430 750 Q720 250 1140 770V1300H0Z" fill={world.far}/>
  <Path d="M-80 870Q190 530 510 800Q850 450 1170 840V1300H0Z" fill={world.middle}/>
  {[80,970].map((x,i)=><G key={x} transform={`translate(${x} ${680+i*30})`}><Path d="M0 310L20 -40 50 -40 65 310Z" fill="#ad7c81" {...outline}/><Path d="M-95 40Q-125 -60 -30 -90Q-5 -195 70 -110Q185 -100 130 0Q160 90 60 85Q-40 140 -95 40Z" fill="url(#leaf)" {...outline}/><Path d="M-45 -20Q-10 -60 12 -60" stroke="#c0ef90" strokeWidth="18" strokeLinecap="round" fill="none"/></G>)}
  <Path d="M0 1000Q250 880 540 1000Q850 840 1080 990V1300H0Z" fill={world.ground}/>
  <G id={`world-decor-${world.kind}`}>
  {world.kind==='coast'&&<G><Path d="M0 970Q260 880 520 970T1080 970V1090H0Z" fill="#63d3db"/><Path d="M0 1005Q260 930 520 1005T1080 1005" fill="none" stroke="#d1f6ed" strokeWidth="12"/><Path d="M120 880Q170 640 90 520M130 670Q0 535 35 570M130 670Q260 530 280 600" fill="none" stroke="#639f79" strokeWidth="22" strokeLinecap="round"/></G>}
  {world.kind==='candy'&&[70,950].map(x=><G key={x}><Path d={`M${x} 970V690`} stroke="#fff2d2" strokeWidth="20"/><Circle cx={x} cy="650" r="70" fill="#f5acd1" {...outline}/><Path d={`M${x-35} 630Q${x+40} 580 ${x+40} 650Q${x+30} 705 ${x-25} 670`} fill="none" stroke="#fff2d2" strokeWidth="18" strokeLinecap="round"/></G>)}
  {world.kind==='snow'&&<G fill="#fff9ff"><Path d="M220 510L320 680 270 645 240 660 205 620 170 650Z"/><Path d="M680 430L800 630 750 590 710 610 670 560 630 600Z"/>{[180,390,690,930].map((x,i)=><Circle key={x} cx={x} cy={420+i*55} r="8"/>)}</G>}
  {world.kind==='desert'&&[80,985].map(x=><Path key={x} d={`M${x} 990V720M${x} 840H${x-45}V775M${x} 885H${x+43}V805`} fill="none" stroke="#92b085" strokeWidth="29" strokeLinecap="round"/>)}
  {world.kind==='space'&&<G fill="#fff1ba">{[100,290,490,750,990].map((x,i)=><Path key={x} d={`M${x} ${280+i%3*72}l8 18 18 7-18 7-8 18-8-18-18-7 18-7Z`}/>)}<Ellipse cx="880" cy="200" rx="100" ry="27" fill="none" stroke="#dbc4ed" strokeWidth="13"/></G>}
  {world.kind==='crystal'&&[45,920].map(x=><G key={x}><Path d={`M${x} 1000L${x+20} 790 ${x+65} 730 ${x+110} 800 ${x+90} 1000Z`} fill="#b9e3f5" {...outline}/><Path d={`M${x+65} 730V1000M${x+20} 790L${x+110} 800`} fill="none" stroke="#8fa7d2" strokeWidth="7"/></G>)}
  </G>
  <Rect x="-20" y="1090" width="1120" height="210" rx="35" fill="url(#table)" {...outline}/>
  <Path d="M0 1145H1080M140 1210H400M660 1260H1000" stroke="#ce7c6c" strokeWidth="8" opacity={.5}/>
</G>;}

export default memo(Landscape);
