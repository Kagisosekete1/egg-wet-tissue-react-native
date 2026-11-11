export function dayKey(date=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
const ordinal=key=>Date.parse(key+'T00:00:00Z')/86400000;
export const GIFT_DAYS=[{coins:100},{coins:150},{coins:200},{coins:250,boost:true},{coins:300},{coins:400},{coins:600,shield:true}];
export function dailyGift(progress,date=new Date()){
 const key=dayKey(date),last=progress.gifts?.lastDate,claimed=!!last&&key<=last,consecutive=last&&ordinal(key)-ordinal(last)===1;
 const streak=claimed?(progress.gifts?.streak||1):consecutive?(progress.gifts?.streak||0)+1:1,day=(streak-1)%7+1;
 return {key,claimed,day,streak,...GIFT_DAYS[day-1]};
}
function addPrize(progress,{coins=0,xp=0,boost=false,shield=false},id){return {...progress,points:Math.max(0,progress.points+coins),xp:progress.xp+xp,inventory:boost?{...progress.inventory,emergency_stabilizer:(progress.inventory?.emergency_stabilizer||0)+1}:progress.inventory,shields:shield?[...(progress.shields||[]),{id,type:'basic',hits:1,equipped:false}]:progress.shields};}
export function claimDailyGift(progress,date=new Date()){const gift=dailyGift(progress,date);if(gift.claimed)return progress;return {...addPrize(progress,gift,'daily-'+gift.key),gifts:{lastDate:gift.key,streak:gift.streak}};}
export function claimWelcome(progress){if(progress.welcomeClaimed)return progress;return {...addPrize(progress,{coins:500,boost:true,shield:true},'welcome-shield'),welcomeClaimed:true};}
export const MILESTONES=[{id:'first-win',title:'A star is hatched',detail:'Win your first computer round.',metric:'wins',target:1,coins:200,xp:40},{id:'five-games',title:'Splash regular',detail:'Finish five computer rounds.',metric:'games',target:5,coins:300,xp:60,boost:true},{id:'garden-cup',title:'World explorer',detail:'Clear six adventure levels.',metric:'levels',target:6,coins:500,xp:100,shield:true},{id:'ten-wins',title:'Egg guardian',detail:'Win ten computer rounds.',metric:'wins',target:10,coins:800,xp:150,boost:true}];
export function milestones(progress){return MILESTONES.map(m=>({...m,value:m.metric==='levels'?Object.keys(progress.levels).length:progress[m.metric]||0,claimed:(progress.milestones||[]).includes(m.id)}));}
export function claimMilestone(progress,id){const m=milestones(progress).find(m=>m.id===id);if(!m||m.claimed||m.value<m.target)return progress;return {...addPrize(progress,m,'milestone-'+m.id),milestones:[...(progress.milestones||[]),id]};}
export const LOSS_PENALTIES={easy:40,normal:60,hard:80};
export const formatCoins=value=>{const n=Number(value)||0;return `${n>0?'+':''}${n}`;};
export function roundReward(progress,game,{firstClear=false,levelId=null,worldClear=false}={}){
 const win=game.current===2;
 if(!win){const lossPenalty=LOSS_PENALTIES[game.difficulty]||60,penalty=Math.min(Math.max(0,Number(progress.points)||0),lossPenalty);return {coins:-penalty,xp:0,base:0,skill:0,clear:0,cup:0,streakBonus:0,streak:0,penalty,lossPenalty,firstClear:false,worldClear:false,shield:false};}
 const streak=(progress.winStreak||0)+1,base=({easy:120,normal:180,hard:240}[game.difficulty]||180),skill=Math.min(60,Math.max(0,game.safeSprays)*5),clear=firstClear?200+Math.min(300,(levelId||1)*10):0,cup=worldClear?500:0,streakBonus=streak%3===0?100:0;
 return {coins:base+skill+clear+cup+streakBonus,xp:60,base,skill,clear,cup,streakBonus,streak,firstClear,worldClear,shield:worldClear};
}
export function grantRoundPrize(progress,prize,id){return addPrize(progress,prize,'cup-'+id);}
