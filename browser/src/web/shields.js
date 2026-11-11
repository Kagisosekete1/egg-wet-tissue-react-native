// Keep stored type IDs stable so previously earned and purchased shields still work.
export const SHIELD_CATALOG=[
 {type:'basic',name:'Bubble Shield',price:600,onlinePrice:5000,hits:1,detail:'Blocks one fall-causing hit.'},
 {type:'golden',name:'Golden Shield',price:1200,onlinePrice:10000,hits:2,detail:'Blocks two fall-causing hits.'},
 {type:'super',name:'Rainbow Shield',price:1800,onlinePrice:20000,hits:3,detail:'Blocks three fall-causing hits.'},
];
export const shieldName=type=>SHIELD_CATALOG.find(s=>s.type===type)?.name||'Shield';
export const shieldHits=hits=>`${hits} ${hits===1?'hit':'hits'}`;

/** Stack identical shields for display, retaining the actual inventory item to equip. */
export function groupShields(shields=[],armedId=null){
 const groups=new Map();
 for(const item of shields){
  const type=item.type??item.shield_type,hits=Number(item.hits??item.remaining_hits);
  if(!Number.isInteger(hits)||hits<=0)continue;
  const key=JSON.stringify([type,hits]);
  let group=groups.get(key);
  if(!group){group={key,type,hits,count:0,item,armed:false};groups.set(key,group);}
  group.count++;
  if(item.id===armedId){group.item=item;group.armed=true;}
 }
 return [...groups.values()];
}
