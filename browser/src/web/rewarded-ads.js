import {uuid,rewindGame} from './rules.js';
export const canAdRewind=game=>!!game&&game.history.length>0&&game.rewardsUsed<1&&game.phase==='over'&&(game.mode==='friend'||game.current===1);
export function applyAdRewind(game,receipt,expectedRequest){if(!canAdRewind(game)||receipt?.status!=='earned'||receipt.gameId!==game.gameId||receipt.requestId!==expectedRequest)return game;return rewindGame(game);}
/** Uses the trusted Android bridge. Browser AdMob adverts are not simulated. */
export function requestRewardedAd({gameId,onStatus=()=>{},target=window}){
 const requestId=target.crypto?.randomUUID?.()||uuid();let complete=false,resolve,cancel;const result=new Promise(r=>{resolve=r;});
 function finish(receipt){if(complete)return;complete=true;target.removeEventListener('egg-rewarded-ad',receive);clearTimeout(timer);resolve(receipt);}
 function receive(event){const value=event.detail;if(value?.requestId!==requestId||value.gameId!==gameId)return;if(value.status==='loading'||value.status==='showing'){clearTimeout(timer);timer=setTimeout(()=>finish({requestId,gameId,status:'error',message:'The advert service did not respond. No reward was used.'}),value.status==='loading'?35000:650000);onStatus(value.status);return;}if(['earned','closed','error','cancelled'].includes(value.status))finish(value);}
 let timer=setTimeout(()=>finish({requestId,gameId,status:'error',message:'Update the Android app to use Watch Ad in this design. No reward was used.'}),5000);
 cancel=()=>{if(complete)return;target.ReactNativeWebView?.postMessage(JSON.stringify({type:'CANCEL_WATCH_AD',requestId}));finish({requestId,gameId,status:'cancelled'});};
 if(!target.ReactNativeWebView){finish({requestId,gameId,status:'unavailable',message:'Watch Ad is available in the Android app. Chrome cannot show this Android AdMob advert.'});}
 else{target.addEventListener('egg-rewarded-ad',receive);onStatus('loading');try{target.ReactNativeWebView.postMessage(JSON.stringify({type:'WATCH_AD',requestId,gameId}));}catch{finish({requestId,gameId,status:'error',message:'The advert could not open. Please try again.'});}}
 return {requestId,result,cancel};
}
