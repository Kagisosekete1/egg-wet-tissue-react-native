/** Provider events, rather than a timer or the load event, authorize the reward. */
export class RewardedAdSession {
 constructor({initialize,createAd,events,emit,setTimer=setTimeout,clearTimer=clearTimeout}){this.initialize=initialize;this.createAd=createAd;this.events=events;this.emit=emit;this.setTimer=setTimer;this.clearTimer=clearTimer;this.pending=null;}
 async request({requestId,gameId}){
  if(this.pending){if(this.pending.requestId===requestId&&this.pending.gameId===gameId)return;this.emit({requestId,gameId,status:'error',message:'Another advert is already loading.'});return;}
  const p={requestId,gameId,earned:false,showRequested:false,ad:null,remove:[]};this.pending=p;this.emit({...this.ids(p),status:'loading'});p.timer=this.setTimer(()=>this.finish(p,'error','No advert loaded. Please try again later.'),30000);
  try{await this.initialize();if(this.pending!==p)return;p.ad=this.createAd();const listen=(name,fn)=>p.remove.push(p.ad.addAdEventListener(name,fn));
   for(const event of new Set(this.events.loaded))listen(event,()=>{if(this.pending!==p||p.showRequested)return;p.showRequested=true;this.clearTimer(p.timer);p.timer=this.setTimer(()=>this.finish(p,'error','The advert did not finish. No reward was used.'),600000);this.emit({...this.ids(p),status:'showing'});try{Promise.resolve(p.ad.show()).catch(()=>this.finish(p,'error','The advert could not open.'));}catch{this.finish(p,'error','The advert could not open.');}});
   listen(this.events.earned,()=>{if(this.pending===p&&p.showRequested)p.earned=true;});
   listen(this.events.closed,()=>this.finish(p,p.earned?'earned':'closed',p.earned?'':'Finish the advert to earn the rewind.'));
   listen(this.events.error,()=>this.finish(p,'error','No advert is available right now. Try again later.'));
   p.ad.load();
  }catch{this.finish(p,'error','The advert service could not start. Try again later.');}
 }
 ids(p){return {requestId:p.requestId,gameId:p.gameId};}
 finish(p,status,message=''){if(this.pending!==p)return;this.pending=null;this.clearTimer(p.timer);for(const remove of p.remove)try{remove();}catch{}try{p.ad?.destroy();}catch{}this.emit({...this.ids(p),status,message});}
 cancel(requestId){const p=this.pending;if(p&&p.requestId===requestId&&!p.showRequested)this.finish(p,'cancelled');}
 destroy(){if(this.pending)this.finish(this.pending,'cancelled');}
}
