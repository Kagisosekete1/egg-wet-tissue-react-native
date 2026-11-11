export const CLAIM_WAIT_MS=24*60*60*1000;
export function giftCooldown(progress,date=new Date(),actor='guest'){
 const last=Number(progress.claimCooldowns?.[actor])||0,next=last?last+CLAIM_WAIT_MS:0;
 return {next,remaining:Math.max(0,next-date.getTime())};
}
export function markGiftClaim(progress,date,actor='guest'){return {...progress,claimCooldowns:{...progress.claimCooldowns,[actor]:date.getTime()}};}
export function waitLabel(ms){const minutes=Math.max(1,Math.ceil(ms/60000));return `${Math.floor(minutes/60)}h ${String(minutes%60).padStart(2,'0')}m`;}
