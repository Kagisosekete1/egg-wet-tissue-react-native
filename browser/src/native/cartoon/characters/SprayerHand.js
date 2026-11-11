import React,{memo} from 'react';
import {Defs,G,LinearGradient,Path,Stop} from 'react-native-svg';
import {SPRAYER} from '../layout';

/** Back palm and front fingers sandwich the bottle, all in the same local space. */
function SprayerHand({pressing=false,placed=false,part='front'}){
 const back=part==='back';
 return <G id={back?'sprayer-glove-palm':'sprayer-hand'} transform={placed?undefined:`translate(${SPRAYER.x} ${SPRAYER.y}) rotate(${SPRAYER.angle}) scale(${-SPRAYER.scale} ${SPRAYER.scale})`} stroke="#40264f" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
  {!back&&<Defs>
   <LinearGradient id="sprayer-glove-shade" x2=".8" y2="1"><Stop stopColor="#fffef7"/><Stop offset=".6" stopColor="#f0edff"/><Stop offset="1" stopColor="#c8cef1"/></LinearGradient>
   <LinearGradient id="sprayer-cuff-shade" x2="1" y2="1"><Stop stopColor="#c5fff0"/><Stop offset="1" stopColor="#70cfc5"/></LinearGradient>
  </Defs>}
  {back?<>
   <Path d="M-85-147Q-108-152-119-134L-132-109Q-136-99-125-94L-93-82Q-81-78-75-90L-62-119Z" fill="url(#sprayer-cuff-shade)"/>
   <Path d="M-119-117L-94-105" fill="none" stroke="#e6fff6" strokeWidth="6"/>
   <Path d="M-83-147C-95-167-79-187-57-181C-31-179-13-156-12-130C-9-104-27-87-49-93L-75-105Q-91-122-83-147Z" fill="url(#sprayer-glove-shade)"/>
  </>:<>
   <G id="sprayer-glove-finger" className={pressing?'pressing-finger':''}>
    <Path d="M-53-160C-62-180-51-202-35-215Q-17-230 2-227L38-223C55-220 54-202 38-204L4-209Q-14-211-20-191L-21-169Q-27-150-40-152Z" fill="url(#sprayer-glove-shade)"/>
    <Path d="M-36-207Q-18-223 3-219L34-215" fill="none" stroke="#fffefa" strokeWidth="5"/>
   </G>
   <G id="sprayer-gripping-fingers">
    <Path d="M-35-147L10-146Q28-145 27-132Q26-120 11-121L-30-126Q-45-132-35-147Z" fill="url(#sprayer-glove-shade)"/>
    <Path d="M-35-125L10-123Q25-122 24-109Q21-97 7-100L-31-105Q-46-110-35-125Z" fill="url(#sprayer-glove-shade)"/>
    <Path d="M-66-140Q-78-158-63-168Q-50-175-42-159L-25-137Q-16-122-30-113Q-49-104-66-140Z" fill="url(#sprayer-glove-shade)"/>
    <Path d="M-59-150Q-62-157-56-159M-14-138L8-137M-14-116L7-115" fill="none" stroke="#fffefa" strokeWidth="4"/>
   </G>
  </>}
 </G>;
}
export default memo(SprayerHand);
