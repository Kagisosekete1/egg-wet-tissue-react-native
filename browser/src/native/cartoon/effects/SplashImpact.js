import React from 'react';
import {G,Ellipse,Path} from 'react-native-svg';
/** Rounded water crown, expanding rings, and a fixed pool of little flying drops. */
export default function SplashImpact({x,y,progress}){const p=Math.max(0,Math.min(1,progress));return <G opacity={1-p} transform={`translate(${x} ${y})`}>
 <Ellipse cy="5" rx="51" ry="12" fill="#52cbe5" opacity=".35"/>
 <Ellipse cy="5" rx="43" ry="11" fill="none" stroke="#e6ffff" strokeWidth="5"/>
 <Path d="M-43 2Q-55-4-53-16Q-51-24-43-15L-29-3Q-22 1-24-15Q-30-38-19-40Q-11-42-9-22Q-7-8 1-7Q10-7 14-25Q19-41 26-35Q31-30 23-13Q20-4 27-5L42-18Q53-25 55-17Q57-7 42 3Q15 19-12 13Q-30 12-43 2Z" fill="#91edfa" stroke="#268eb6" strokeWidth="3" strokeLinejoin="round"/>
 <Path d="M-28 5Q-5 16 21 6" fill="none" stroke="#edffff" strokeWidth="5" strokeLinecap="round"/>
 {Array.from({length:7},(_,i)=>{const a=Math.PI*(.12+i*.13),dx=Math.cos(a)*(42+i%3*13),dy=-Math.sin(a)*(45+i%3*12);return <G key={i} className="splash-fan-drop" style={{'--dx':`${dx}px`,'--dy':`${dy}px`,'--fan-delay':`${i%3*.015}s`}}><Ellipse rx={4+i%3} ry={7+i%3} fill={i%2?'#d1fcff':'#67ddf4'} stroke="#248db8" strokeWidth="2"/><Ellipse cx="-1" cy="-2" rx="1.5" ry="2.5" fill="white"/></G>;})}
 </G>;}
