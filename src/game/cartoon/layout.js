// Shared scene coordinates keep the nozzle, spray trajectory and wet tissue aligned.
export const SPRAYER={x:980,y:560,angle:-42,scale:.9};
export function sprayerNozzle(){const a=SPRAYER.angle*Math.PI/180,x=-133*SPRAYER.scale,y=-190*SPRAYER.scale;return {x:SPRAYER.x+x*Math.cos(a)-y*Math.sin(a),y:SPRAYER.y+x*Math.sin(a)+y*Math.cos(a)};}
export function tissueTopAt(x,sag){const t=Math.max(0,Math.min(1,(x-190)/700));return 750+2*t*(1-t)*sag;}
export function tissueBottomAt(x,sag){const t=Math.max(0,Math.min(1,(x-200)/680));return 802+2*t*(1-t)*(13+sag);}
export function tissueShape(sag){return `M190 750Q540 ${750+sag} 890 750C902 765 898 790 880 802Q540 ${815+sag} 200 802Q179 782 190 750Z`;}
export function sprayDrops(age,sag,reduced=false){const nozzle=sprayerNozzle(),count=reduced?8:24,result=[];for(let i=0;i<count;i++){const p=age*2.8-i*(reduced?.065:.03);if(p<0||p>1)continue;const tx=650+i%4*35,ty=tissueTopAt(tx,sag)+12,cx=nozzle.x-110-(i%3)*9,cy=nozzle.y+55+(i%3)*8,q=1-p;result.push({id:i,x:q*q*nozzle.x+2*q*p*cx+p*p*tx,y:q*q*nozzle.y+2*q*p*cy+p*p*ty,angle:30,radius:7+i%4,opacity:1-p*.15});}return result;}
