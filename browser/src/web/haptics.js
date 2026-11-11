import {read,write} from './play-ui';
const patterns={roll:18,spray:12,shield:[25,35,25],boost:[18,25,18],danger:[20,45,20],lose:[60,40,100],win:[25,40,25,40,60]};
export function vibrationEnabled(){return read('egg-vibration','on')==='on';}
export function setVibration(value){write('egg-vibration',value?'on':'off');if(!value)try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'VIBRATE',pattern:0}));else navigator.vibrate?.(0);}catch{}}
export function vibrate(kind){if(!vibrationEnabled()||document.hidden)return;const pattern=patterns[kind]||12;try{if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify({type:'VIBRATE',pattern}));else navigator.vibrate?.(pattern);}catch{}}
