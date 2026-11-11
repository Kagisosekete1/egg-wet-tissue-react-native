import {JSDOM,VirtualConsole} from 'jsdom';import fs from 'node:fs';import assert from 'node:assert/strict';
const code=fs.readFileSync('dist/game.js','utf8'),css=fs.readFileSync('dist/game.css','utf8'),wait=ms=>new Promise(r=>setTimeout(r,ms));
async function run(width,height,modern){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<style>'+css+'</style><div id="root"></div>',{url:'https://egg.test/motion?motion=on#/play?mode=friend&difficulty=normal&gameMode=classic',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  Object.defineProperty(w,'innerWidth',{value:width,writable:true});Object.defineProperty(w,'innerHeight',{value:height,writable:true});w.CSS={supports:()=>modern};
  w.localStorage.setItem('egg-first-play-seen','1');w.matchMedia=q=>({matches:q.includes('max-width')?w.innerWidth<=600:false,addEventListener(){},removeEventListener(){}});w.Headers=Headers;w.Request=Request;w.Response=Response;w.fetch=async()=>new Response('[]');w.Math.random=()=>.5;w.Audio=class{play(){return Promise.resolve();}pause(){}load(){}addEventListener(){}removeAttribute(){}};
 }});
 const w=dom.window,d=w.document,button=t=>[...d.querySelectorAll('button')].find(b=>b.textContent.trim()===t);async function until(fn){for(let i=0;i<120;i++){if(fn())return;await wait(20);}throw new Error('Tablet controls timed out');}
 try{w.eval(code);await until(()=>button('Roll die')&&d.documentElement.dataset.playing==='on');const scene=d.querySelector('.scene-window svg'),camera=scene.getAttribute('viewBox');assert(d.querySelector('#crash-floor'));assert.equal(scene.getAttribute('preserveAspectRatio'),'xMidYMid meet');assert.equal(d.documentElement.style.getPropertyValue('--legacy-viewport-height'),modern?'':height+'px');
  button('Roll die').click();await until(()=>button('Spray ×4'));button('Spray ×4').click();await until(()=>button('Spray ×3'));
  const nextHeight=height>width?600:1024;w.innerWidth=height>width?1024:768;w.innerHeight=nextHeight;w.dispatchEvent(new w.Event('orientationchange'));w.dispatchEvent(new w.Event('resize'));await wait(60);
  assert.equal(d.documentElement.style.getPropertyValue('--legacy-viewport-height'),modern?'':nextHeight+'px');assert.equal(d.querySelector('.scene-window svg'),scene,'rotation replaced the active scene');assert.equal(scene.getAttribute('viewBox'),camera);assert(!button('Spray ×3').disabled,'rotation lost the current turn');button('Spray ×3').click();await until(()=>button('Spray ×2'));
  d.querySelector('[aria-label="Pause game"]').click();await until(()=>button('Keep playing'));button('Keep playing').click();await until(()=>!button('Spray ×2').disabled);
  d.querySelector('[aria-label="Back to home"]').click();await until(()=>d.querySelector('.portal'));assert.equal(d.documentElement.dataset.playing,undefined);assert.equal(d.documentElement.style.getPropertyValue('--legacy-viewport-height'),'','legacy viewport leaked after leaving play');
  assert.equal(errors.length,0,errors.join('\n'));
 }finally{w.close();}
}
await run(768,1024,true);await run(1024,600,true);await run(1280,800,true);await run(1024,600,false);await run(768,1024,false);
console.log('PASS: tablet-sized portrait/landscape app sessions retain roll/spray counts, floor, scene identity and pause controls through rotation; older-browser fallback measures the available height and restores it on exit. Layout pixels still require a real browser.');
