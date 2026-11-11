import {useEffect} from 'react';
/** Modern phones retain stable svh framing; older tablets get a measured fallback. */
export function usePlayViewport(enabled=true){useEffect(()=>{
 if(!enabled)return;
 const root=document.documentElement,previous=root.dataset.playing;
 root.dataset.playing='on';
 const fallback=!window.CSS?.supports?.('height','100svh'),property='--legacy-viewport-height';
 const oldHeight=root.style.getPropertyValue(property),oldPriority=root.style.getPropertyPriority(property);
 let frame=null;
 const measure=()=>{frame=null;const viewport=window.visualViewport;if(viewport?.scale>1.01)return;const height=window.innerHeight||viewport?.height||root.clientHeight;if(Number.isFinite(height)&&height>0)root.style.setProperty(property,`${Math.round(height)}px`);};
 const resize=()=>{if(frame===null)frame=window.requestAnimationFrame(measure);};
 if(fallback){measure();window.addEventListener('resize',resize);window.addEventListener('orientationchange',resize);window.visualViewport?.addEventListener?.('resize',resize);}
 return()=>{
  if(fallback){window.removeEventListener('resize',resize);window.removeEventListener('orientationchange',resize);window.visualViewport?.removeEventListener?.('resize',resize);if(frame!==null)window.cancelAnimationFrame(frame);if(oldHeight)root.style.setProperty(property,oldHeight,oldPriority);else root.style.removeProperty(property);}
  if(previous===undefined)delete root.dataset.playing;else root.dataset.playing=previous;
 };
},[enabled]);}
