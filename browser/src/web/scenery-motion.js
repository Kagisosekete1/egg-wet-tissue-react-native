/** A single, bounded clock changes SVG transforms; it never renders React. */
export class SceneryMotion {
 constructor(root,{fps=20,document:doc=globalThis.document,requestFrame=fn=>requestAnimationFrame(fn),cancelFrame=id=>cancelAnimationFrame(id),now=()=>performance.now()}={}){this.root=root;this.doc=doc;this.requestFrame=requestFrame;this.cancelFrame=cancelFrame;this.now=now;this.interval=1000/fps;this.elapsed=0;this.paused=false;this.running=false;this.enabled=true;this.frame=null;this.refresh();}
 refresh(){this.nodes=[...this.root.querySelectorAll('[data-scenery-motion]')];this.paint();}
 paint(){const t=this.elapsed;for(const node of this.nodes){const kind=node.getAttribute('data-scenery-motion'),i=Number(node.getAttribute('data-motion-index')||0);let value;
  if(kind==='cloud')value=`translate(${Math.sin(t*(.32-i*.055)+i*1.8)*90} 0)`;
  if(kind==='helicopter')value=`translate(${((t*45+620)%1360)-140} 0)`;
  if(kind==='bird'){const speed=[33,26,20][i%3],start=[320,820,540][i%3],x=i===1?1240-((t*speed+1240-start)%1400):((t*speed+start+100)%1400)-100,y=[350,445,525][i%3]+Math.sin(t*1.9+i*2)*15;value=`translate(${x} ${y})`;}
  if(kind==='bird-wing')value=`rotate(${-18+Math.sin(t*11+i*2)*32})`;
  if(kind==='hover')value=`translate(0 ${Math.sin(t*2.8)*6})`;
  if(kind==='rotor')value=`scale(${.15+Math.abs(Math.cos(t*23))*.85} 1)`;
  if(kind==='egg')value=`translate(0 ${Math.sin(t*2.4)*3})`;
  if(kind==='leaves')value=`translate(${Math.sin(t*.8)*3} 0)`;
  if(kind==='drip'){const phase=(t*.6+i/3)%1;value=`translate(0 ${phase*65})`;node.setAttribute('opacity',String(1-phase*.8));}
  if(value)node.setAttribute('transform',value);
 }}
 setEnabled(value){this.enabled=!!value;this.sync();}
 setPaused(value){this.paused=!!value;this.sync();}
 sync(){if(!this.enabled||this.paused||this.doc.hidden){this.stop();return;}if(this.running)return;this.running=true;this.last=this.now();this.painted=this.last;this.paint();this.frame=this.requestFrame(time=>this.tick(time));}
 tick(time){if(!this.running)return;if(this.doc.hidden){this.stop();return;}this.elapsed+=Math.min(.1,Math.max(0,(time-this.last)/1000));this.last=time;if(time-this.painted>=this.interval){this.painted=time;this.paint();}this.frame=this.requestFrame(next=>this.tick(next));}
 stop(){this.running=false;if(this.frame!==null)this.cancelFrame(this.frame);this.frame=null;}
 destroy(){this.stop();this.nodes=[];}
}
