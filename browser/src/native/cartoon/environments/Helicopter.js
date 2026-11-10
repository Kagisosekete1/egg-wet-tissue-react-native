import React,{memo} from 'react';
import { G, Path, Ellipse, Rect } from 'react-native-svg';
import { outline } from '../palette';
function Helicopter(){return <G id="flying-helicopter" className="ambient-helicopter" data-scenery-motion="helicopter" transform="translate(480 0)"><G transform="translate(0 420) scale(.68)"><G className="helicopter-hover" data-scenery-motion="hover">
 <Path d="M-38 7L-158 -15 -177 -65 -153 -63 -125 -31 -24 -22" fill="#f5a9be" {...outline}/><Path d="M-171 -41V-82M-190 -62H-150" stroke="#74628d" strokeWidth="7" strokeLinecap="round"/>
 <Ellipse rx="80" ry="48" fill="#af9cde" {...outline}/><Path d="M10 -41Q65 -38 76 -5L7 -5Z" fill="#b9f1f1" {...outline}/><Path d="M-26 -41V35" fill="none" stroke="#8066a9" strokeWidth="5"/><Ellipse cx="-47" cy="5" rx="12" ry="15" fill="#ffe38d"/>
 <Path d="M-46 44V63M40 44V63M-70 66H65" fill="none" stroke="#776087" strokeWidth="7" strokeLinecap="round"/>
 <Rect x="-9" y="-69" width="18" height="24" rx="5" fill="#9d81b8"/>
 <G className="helicopter-rotor" data-scenery-motion="rotor"><Path d="M-134 -70H134" stroke="#6e5b83" strokeWidth="12" strokeLinecap="round"/><Path d="M-125 -74H113" stroke="#ded3ef" strokeWidth="4" strokeLinecap="round"/></G>
 </G></G></G>;}

export default memo(Helicopter);
