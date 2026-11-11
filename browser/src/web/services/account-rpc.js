import {supabase,SUPABASE_URL,SUPABASE_PUBLIC_KEY} from './client';
/** Capture the session so switching accounts cannot send an old outbox to a new user. */
export async function accountRpc(name,args,expectedUserId){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token||(expectedUserId&&session.user.id!==expectedUserId))throw Object.assign(new Error('Sign in to this account again.'),{code:'SESSION_CHANGED',status:401});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+encodeURIComponent(name),{method:'POST',headers:{apikey:SUPABASE_PUBLIC_KEY,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:JSON.stringify(args),signal:controller.signal});
  const data=await response.json();if(!response.ok)throw Object.assign(new Error(data?.message||'The account update was not confirmed.'),{code:data?.code,status:response.status});return data;
 }finally{clearTimeout(timer);}
}
