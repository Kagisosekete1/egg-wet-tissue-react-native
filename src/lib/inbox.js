import AsyncStorage from '@react-native-async-storage/async-storage';
let userId=null,queue=Promise.resolve();const listeners=new Set();
export function setInboxUser(id){userId=id||null;}
export function subscribeInbox(fn){listeners.add(fn);return()=>{listeners.delete(fn);};}
export async function readInbox(){await queue.catch(()=>{});if(!userId)return [];try{return JSON.parse(await AsyncStorage.getItem('egg-notifications-'+userId)||'[]');}catch{return [];}}
export function saveInboxNotification(n){const owner=userId;if(!owner||!n)return Promise.resolve();const item={id:n.notificationId||String(Date.now()),title:n.title||'Egg & Tissue',body:n.body||'',data:n.additionalData||{},created_at:new Date().toISOString()};const key='egg-notifications-'+owner;const save=async()=>{let rows=[];try{rows=JSON.parse(await AsyncStorage.getItem(key)||'[]');}catch{}const next=[item,...rows.filter(r=>r.id!==item.id)].slice(0,100);await AsyncStorage.setItem(key,JSON.stringify(next));if(owner===userId)for(const fn of listeners)fn(next);};queue=queue.catch(()=>{}).then(save);return queue;}
