import React,{memo} from 'react';
import {Circle,Ellipse,G,Path} from 'react-native-svg';
import {INK,outline} from '../palette';
import {SPRAYER} from '../layout';
function Bottle({squeeze=0,placed=false,pressing=false}){return <G id="upper-right-sprayer" transform={placed?undefined:`translate(${SPRAYER.x} ${SPRAYER.y}) rotate(${SPRAYER.angle}) scale(${-SPRAYER.scale} ${SPRAYER.scale})`}>
 <G transform={`translate(45 -120) scale(1 ${1-squeeze*.08}) translate(-45 120)`}>
  <Path d="M-18 -120H88L107 -80V72Q45 106 -18 72Z" fill="url(#bottle)" {...outline}/>
  <Path d="M0 -100V45" stroke="#ffc4dd" strokeWidth="14" strokeLinecap="round" opacity={.7}/>
  <Path d="M91-70V53Q91 69 74 74" fill="none" stroke="#be3d80" strokeWidth="9" strokeLinecap="round" opacity=".4"/>
  <Ellipse cx="35" cy="-31" rx="13" ry="20" fill="white" {...outline}/><Ellipse cx="73" cy="-31" rx="13" ry="20" fill="white" {...outline}/><Circle cx="38" cy="-25" r="6" fill={INK}/><Circle cx="76" cy="-25" r="6" fill={INK}/><Path d="M35 11Q56 36 76 10" fill="none" {...outline}/>
 </G>
 <Path d="M12-120V-166H63V-120Z" fill="#a78ce8" {...outline}/>
 <Path d="M73-166Q112-147 87-124" fill="#ffe575" {...outline}/>
 <G id="sprayer-pump" className={pressing?'pressing-pump':''}>
  <Path d="M-3-172H103V-207H29Q-3-207-3-172Z" fill="#a78ce8" {...outline}/>
  <Path d="M103-205H133V-176H103Z" fill="#ffe575" {...outline}/>
  <Path d="M19-196H87" fill="none" stroke="#d5c1ff" strokeWidth="6" strokeLinecap="round"/>
  <Path d="M126-198V-182" stroke="#8c658b" strokeWidth="3" strokeLinecap="round"/>
 </G>
</G>;}
export default memo(Bottle);
