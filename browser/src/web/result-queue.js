/** Persistent, account-scoped outbox. New rounds cannot be erased by an older flush. */
export class ResultQueue{
 constructor({read,write,submit,notify=()=>{}}){Object.assign(this,{read,write,submit,notify});this.locks=new Map();}
 key(userId){return `egg-pending-results-${userId}`;}
 pending(userId){try{const rows=JSON.parse(this.read(this.key(userId),'[]'));return Array.isArray(rows)?rows.filter(r=>r&&typeof r.gameId==='string'):[];}catch{return [];}}
 enqueue(userId,result){const rows=this.pending(userId);if(!rows.some(r=>r.gameId===result.gameId)){this.write(this.key(userId),JSON.stringify([...rows,result]));if(!this.pending(userId).some(r=>r.gameId===result.gameId))throw new Error('This browser could not save the pending round.');}}
 flush(userId){if(this.locks.has(userId))return this.locks.get(userId);const task=this.run(userId).finally(()=>this.locks.delete(userId));this.locks.set(userId,task);return task;}
 async run(userId){const synced=[];let error=null;
  for(const result of this.pending(userId).slice(0,25)){
   try{const receipt=await this.submit(result,userId);this.write(this.key(userId),JSON.stringify(this.pending(userId).filter(r=>r.gameId!==result.gameId)));synced.push({gameId:result.gameId,receipt});this.notify({userId,gameId:result.gameId,receipt});}
   catch(e){error=e;break;}
  }
  return {synced,pending:this.pending(userId).length,error};
 }
}
export function rankingError(error){if(error?.code==='PGRST202'||error?.status===404)return 'Ranking points need the server update. Saved rounds will retry after it is applied.';if(error?.status===401||error?.code==='SESSION_CHANGED')return 'Sign in to this account again to sync its saved rounds.';return 'Your round is saved on this device. Points will retry when the connection returns.';}
