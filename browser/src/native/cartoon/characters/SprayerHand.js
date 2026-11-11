import React,{memo} from 'react';
import {Defs,G,LinearGradient,Path,Stop} from 'react-native-svg';
import {SPRAYER} from '../layout';

function SprayerHand({pressing}){
 return <G id="sprayer-hand" transform={`translate(${SPRAYER.x} ${SPRAYER.y}) rotate(${SPRAYER.angle}) scale(${-SPRAYER.scale} ${SPRAYER.scale})`} stroke="#40264f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
  <Defs>
   <LinearGradient id="sprayer-glove-shade" x2=".8" y2="1"><Stop stopColor="#fffef7"/><Stop offset=".6" stopColor="#f0edff"/><Stop offset="1" stopColor="#c8cef1"/></LinearGradient>
   <LinearGradient id="sprayer-cuff-shade" x2="1" y2="1"><Stop stopColor="#c5fff0"/><Stop offset="1" stopColor="#70cfc5"/></LinearGradient>
  </Defs>
  {/* A compact, soft glove grips the neck, leaving the bottle's face visible. */}
  <G transform="translate(28 -30)">
  <Path d="M-82-146Q-99-139-105-122L-111-103Q-110-94-101-91L-78-85Q-67-83-63-94L-53-122Z" fill="url(#sprayer-cuff-shade)"/>
  <Path d="M-101-112L-79-104" fill="none" stroke="#e6fff6" strokeWidth="6"/>
  <Path d="M-79-153C-82-171-69-186-51-182C-29-178-15-153-16-129C-16-108-29-95-47-99L-73-107Q-91-124-79-153Z" fill="url(#sprayer-glove-shade)"/>
  </G>
  <G id="sprayer-glove-finger" className={pressing?'pressing-finger':''}>
   <Path d="M-25-181Q-34-196-24-210Q-13-225 6-228L42-223C58-220 57-201 41-204L8-210Q-2-213-5-199L-4-183Q-10-169-25-181Z" fill="url(#sprayer-glove-shade)"/>
   <Path d="M-15-211Q-5-222 10-220L36-216" fill="none" stroke="#fffefa" strokeWidth="5"/>
  </G>
  <G transform="translate(28 -30)">
  {/* Two pillowy curled fingers and a little thumb; no nails or knuckle lines. */}
  <Path d="M-52-158Q-31-172-11-161C1-154-3-140-16-140L-43-143Q-59-146-52-158Z" fill="url(#sprayer-glove-shade)"/>
  <Path d="M-51-138Q-29-151-10-139C0-131-5-118-18-119L-44-122Q-59-125-51-138Z" fill="url(#sprayer-glove-shade)"/>
  <Path d="M-70-132Q-75-154-62-161Q-51-167-45-154L-35-136Q-29-122-42-114Q-61-107-70-132Z" fill="url(#sprayer-glove-shade)"/>
  <Path d="M-62-145Q-63-151-58-152" fill="none" stroke="#fffefa" strokeWidth="5"/>
  </G>
 </G>;
}
export default memo(SprayerHand);
