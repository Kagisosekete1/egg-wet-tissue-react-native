import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM,VirtualConsole} from 'jsdom';
import {groupShields,SHIELD_CATALOG} from '../src/web/shields.js';

const inventory=[
 {id:'bubble-a',type:'basic',hits:1,equipped:false},
 {id:'bubble-b',type:'basic',hits:1,equipped:true},
 {id:'bubble-c',type:'basic',hits:1,equipped:false},
 {id:'gold-full',type:'golden',hits:2,equipped:false},
 {id:'gold-used',type:'golden',hits:1,equipped:false},
 {id:'rainbow',type:'super',hits:3,equipped:false},
 {id:'spent',type:'basic',hits:0,equipped:false},
];
const saved=JSON.stringify(inventory),groups=groupShields(inventory,'bubble-b');
assert.equal(groups.length,4);assert.equal(groups[0].count,3);assert.equal(groups[0].item.id,'bubble-b');assert(groups[0].armed);
assert.deepEqual(groups.filter(g=>g.type==='golden').map(g=>g.hits),[2,1],'used shields were disguised as fresh ones');
assert.equal(JSON.stringify(inventory),saved,'display grouping mutated ownership');
const online=groupShields(inventory.map(s=>({id:s.id,shield_type:s.type,remaining_hits:s.hits,equipped:s.equipped})),'bubble-b');
assert.equal(online[0].item.id,'bubble-b');assert.equal(online[0].count,3);
assert.deepEqual(SHIELD_CATALOG.map(s=>[s.type,s.hits,s.price,s.onlinePrice]),[['basic',1,600,5000],['golden',2,1200,10000],['super',3,1800,20000]]);

const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM('<div id="root"></div>',{url:'https://egg.test/motion?motion=on#/play?mode=friend&difficulty=hard&gameMode=sudden',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
 w.localStorage.setItem('egg-first-play-seen','1');w.localStorage.setItem('egg-2d-progress-v1',JSON.stringify({version:1,shields:inventory,points:2500}));
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.Headers=Headers;w.Request=Request;w.Response=Response;w.fetch=async()=>new Response('[]');w.Math.random=()=>.99;
 w.Audio=class{play(){return Promise.resolve();}pause(){}load(){}addEventListener(){}removeAttribute(){}};
}});
const w=dom.window,d=w.document,wait=ms=>new Promise(r=>setTimeout(r,ms)),button=t=>[...d.querySelectorAll('button')].find(b=>b.textContent.trim()===t);
async function until(fn){for(let i=0;i<150;i++){if(fn())return;await wait(20);}throw new Error('Shield UI timed out');}
const shieldButtons=()=>[...d.querySelectorAll('.tool-tray button')].filter(b=>/Shield,/.test(b.getAttribute('aria-label')||''));
try{
 w.eval(fs.readFileSync('dist/game.js','utf8'));await until(()=>shieldButtons().length===4);
 const bubble=()=>shieldButtons().find(b=>b.textContent.includes('Bubble Shield'));
 assert(bubble().textContent.includes('×3'));assert.equal(bubble().getAttribute('aria-pressed'),'true');
 assert(d.querySelector('.shield-label').textContent.includes('Bubble Shield armed'));
 bubble().click();await until(()=>bubble().getAttribute('aria-pressed')==='false');
 bubble().click();await until(()=>bubble().getAttribute('aria-pressed')==='true');
 assert.equal(JSON.parse(w.localStorage.getItem('egg-2d-progress-v1')).shields.filter(s=>s.hits>0).length,6,'arming spent inventory');
 button('Roll die').click();await until(()=>button('Spray ×6'));
 for(let n=6;n>=3;n--){button('Spray ×'+n).click();await wait(30);}
 await until(()=>bubble()?.textContent.includes('×2'));
 const after=JSON.parse(w.localStorage.getItem('egg-2d-progress-v1')).shields;
 assert.equal(after.find(s=>s.id==='bubble-a').hits,0);assert.equal(after.find(s=>s.id==='bubble-b').hits,1);
 assert.equal(after.find(s=>s.id==='gold-full').hits,2);assert(!button('Spray ×2').disabled);
 assert.equal(shieldButtons().length,4,'one spent copy removed the other shields');
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS: named tiers retain legacy IDs/prices/durability; duplicates stack, partially used shields stay distinct, armed copies remain selectable, arming is free and a fatal spray consumes only the selected actual copy.');
}finally{w.close();}
