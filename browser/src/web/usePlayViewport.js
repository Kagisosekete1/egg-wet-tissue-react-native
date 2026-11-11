import {useEffect} from 'react';
/** Browser toolbar changes and scrolling hints must not reframe the playing world. */
export function usePlayViewport(enabled=true){useEffect(()=>{if(!enabled)return;const root=document.documentElement,previous=root.dataset.playing;root.dataset.playing='on';return()=>{if(previous===undefined)delete root.dataset.playing;else root.dataset.playing=previous;};},[enabled]);}
