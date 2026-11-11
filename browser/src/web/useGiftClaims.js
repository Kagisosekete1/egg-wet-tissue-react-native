import {useEffect,useRef,useState} from 'react';
import {accountRpc} from './services/account-rpc';
import {read,write} from './play-ui';
import {uuid} from './rules';
import {dayKey,claimDailyGift,claimWelcome,claimMilestone} from './rewards';
import {claimGoal} from './progression';
import {giftCooldown,markGiftClaim,waitLabel,CLAIM_WAIT_MS} from './gift-cooldown';

const pendingKey=actor=>'egg-pending-gift-'+actor;
function pendingFor(actor){try{const r=JSON.parse(read(pendingKey(actor),'null'));return r&&typeof r.requestId==='string'&&['daily','welcome','milestone','goal'].includes(r.kind)&&typeof r.key==='string'&&Number.isFinite(Date.parse(r.at))?r:null;}catch{return null;}}
function grant(progress,request,actor){const date=new Date(request.at);return request.kind==='daily'?claimDailyGift(progress,date,actor):request.kind==='welcome'?claimWelcome(progress,date,actor):request.kind==='milestone'?claimMilestone(progress,request.key,date,actor):claimGoal(progress,request.key,date,actor);}

/** The server owns signed-in cooldowns; a saved request ID makes retries idempotent. */
export function useGiftClaims(userId,progressRef,updateProgress,tick,loading=false){
 const actor=userId||'guest',currentActor=useRef(actor);currentActor.current=actor;
 const [status,setStatus]=useState({actor:'guest',ready:true,next:0,error:'',pending:null,busy:false}),lock=useRef(false),clockOffset=useRef(0);
 const serverNow=Date.now()+clockOffset.current,local=giftCooldown(progressRef.current,new Date(serverNow),actor);
 const remaining=Math.max(local.remaining,status.actor===actor?status.next-serverNow:0,0),ready=status.actor===actor&&status.ready;
 async function refresh(){const owner=currentActor.current;if(owner==='guest'){setStatus(v=>({...v,actor:owner,ready:true,pending:pendingFor(owner),next:0,error:''}));return;}
  try{const data=await accountRpc('get_game_reward_status',{},owner);if(currentActor.current!==owner)return;
   if(!Number.isFinite(Date.parse(data?.server_time)))throw new Error('Invalid gift status');
   clockOffset.current=Date.parse(data.server_time)-Date.now();
   setStatus(v=>({...v,actor:owner,ready:true,next:Date.parse(data.next_claim_at)||0,pending:pendingFor(owner),error:''}));
  }catch(error){if(currentActor.current===owner)setStatus(v=>({...v,actor:owner,ready:false,pending:pendingFor(owner),error:error.code==='PGRST202'?'Gifts need server update 016 before account claims can open.':'Gift status could not load. Check your connection.'}));}

 }
 useEffect(()=>{clockOffset.current=0;void refresh();const wake=()=>void refresh();window.addEventListener('focus',wake);window.addEventListener('online',wake);return()=>{window.removeEventListener('focus',wake);window.removeEventListener('online',wake);};},[actor]);
 useEffect(()=>{if(tick&&userId)void refresh();},[tick]);
 async function process(request){const owner=actor;if(lock.current)return false;lock.current=true;setStatus(v=>({...v,busy:true,error:''}));
  try{
   let receipt={request_id:request.requestId,claimed_at:request.at,next_claim_at:new Date(Date.parse(request.at)+CLAIM_WAIT_MS).toISOString()};
   if(userId)receipt=await accountRpc('claim_game_reward',{p_request_id:request.requestId,p_reward_kind:request.kind,p_reward_key:request.key},userId);
   if(receipt?.request_id!==request.requestId||!Number.isFinite(Date.parse(receipt.claimed_at))||!Number.isFinite(Date.parse(receipt.next_claim_at))||Date.parse(receipt.next_claim_at)<Date.parse(receipt.claimed_at)+CLAIM_WAIT_MS)throw new Error('Gift confirmation was incomplete.');
   if(currentActor.current!==owner)return false;
   const latest=progressRef.current;
   if(!(latest.rewardClaimIds||[]).includes(request.requestId)){
    // A server receipt can recover a request whose response was lost. Never grant twice.
    const base={...latest,claimCooldowns:{...latest.claimCooldowns,[owner]:0}};if(request.kind==='goal'&&request.goalProgress){const day=request.goalDay;base.daily={...latest.daily,[day]:{...request.goalProgress,claimed:latest.daily?.[day]?.claimed||request.goalProgress.claimed||[]}};}const next=grant(base,request.kind==='goal'?request:{...request,at:receipt.claimed_at},owner);
    const marked=markGiftClaim(next,new Date(receipt.claimed_at),owner);
    updateProgress({...marked,rewardClaimIds:[...(latest.rewardClaimIds||[]),request.requestId].slice(-200)});
   }
   write(pendingKey(owner),'null');setStatus({actor:owner,ready:true,next:Date.parse(receipt.next_claim_at)||0,error:'',pending:null,busy:false});return true;
  }catch(error){if(currentActor.current===owner){await refresh();setStatus(v=>({...v,error:error.message==='Reward cooldown active'?'Your account must wait 24 hours between gift claims.':error.code==='PGRST202'?'Apply server update 016, then retry this saved gift.':'Gift was not confirmed. Retry the saved gift; it will not be awarded twice.',pending:pendingFor(owner)}));}return false;}
  finally{lock.current=false;if(currentActor.current===owner)setStatus(v=>({...v,busy:false}));}
 }
 async function claim(kind,key){if(loading||lock.current||!ready||remaining>0||status.pending)return false;const at=new Date(serverNow),request={requestId:uuid(),kind,key,at:at.toISOString()};if(grant(progressRef.current,request,actor)===progressRef.current)return false;if(kind==='goal'){request.goalDay=dayKey(at);request.goalProgress=progressRef.current.daily?.[request.goalDay];}
  write(pendingKey(actor),JSON.stringify(request));if(pendingFor(actor)?.requestId!==request.requestId){setStatus(v=>({...v,error:'This browser cannot save a gift safely. Enable site storage and try again.'}));return false;}
  return process(request);
 }
 return {claim,retry:()=>status.pending?process(status.pending):refresh(),busy:status.busy,blocked:loading||!ready||remaining>0||!!status.pending||status.busy,remaining,message:status.error||(remaining>0?`Next gift or claim in ${waitLabel(remaining)}. One shared 24-hour wait.`:!ready?'Checking account gifts…':'Collecting any gift starts one shared 24-hour wait.'),pending:!!status.pending};
}
