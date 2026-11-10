import {useEffect,useRef,useState} from 'react';
import {requestRewardedAd} from './rewarded-ads';
export function useRewardedAd(){const [state,setState]=useState({status:'idle',message:''}),active=useRef(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;active.current?.cancel();};},[]);
 async function watch(gameId){if(active.current)return null;const request=requestRewardedAd({gameId,onStatus:status=>{if(mounted.current)setState({status,message:''});}});active.current=request;const receipt=await request.result;if(active.current===request)active.current=null;if(mounted.current)setState({status:receipt.status,message:receipt.message||''});return receipt;}
 return {...state,pending:state.status==='loading'||state.status==='showing',watch,cancel:()=>active.current?.cancel()};
}
