import {JSDOM,VirtualConsole} from 'jsdom';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const bundle=fs.readFileSync('dist/game.js','utf8'),wait=ms=>new Promise(r=>setTimeout(r,ms));
function gameDom({seen=false,query='mode=friend&difficulty=normal&gameMode=classic',coins=150,random=.5}={}){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'https://egg.test/motion?motion=on#/play?'+query,pretendToBeVisual:true,runScripts:'dangerously',virtualConsole:vc,beforeParse(w){
  if(seen)w.localStorage.setItem('egg-first-play-seen','1');
  w.localStorage.setItem('egg-2d-progress-v1',JSON.stringify({version:1,points:coins}));
  w.Headers=Headers;w.Request=Request;w.Response=Response;w.fetch=async()=>new Response('[]');w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.Math.random=()=>random;
  w.Audio=class{play(){return Promise.resolve();}pause(){}load(){}addEventListener(){}removeAttribute(){}};
 }});
 dom.window.eval(bundle);
 const d=dom.window.document;
 return {dom,w:dom.window,d,errors,button:text=>[...d.querySelectorAll('button')].find(b=>b.textContent.trim()===text)};
}
async function until(fn){for(let i=0;i<150;i++){if(fn())return;await wait(20);}throw new Error('Game UI timed out');}

const first=gameDom();
try{
 const {d,w,button}=first;
 await until(()=>d.querySelector('.rules-coach')&&w.localStorage.getItem('egg-first-play-seen')==='1'&&d.querySelector('.scene-paused'));
 assert(d.querySelector('#dialog-title').textContent.includes('first egg-venture'));
 assert.equal(w.localStorage.getItem('egg-first-play-seen'),'1');
 assert(button('Roll die').disabled,'roll worked through the introduction');
 assert(d.querySelector('.scene-paused'),'first-time help did not pause the world');
 assert.equal(d.querySelector('[role="dialog"]').getAttribute('aria-labelledby'),'dialog-title');
 assert.equal(d.querySelector('#coach-question').maxLength,800);
 button('I rolled four. What should I do next?').click();await wait(25);
 assert.equal(d.querySelector('#coach-question').value,'I rolled four. What should I do next?');
 assert(button('AI coach coming online').disabled,'unconfigured AI endpoint pretended to be online');
 assert.equal(d.querySelectorAll('.coach-message.assistant').length,0);
 button('Got it — let’s play!').click();await until(()=>!d.querySelector('[role="dialog"]'));
 assert(!button('Roll die').disabled);assert.equal(d.documentElement.dataset.playing,'on');
 const svg=d.querySelector('.scene-window svg'),scene=d.querySelector('.scene-window'),viewBox=svg.getAttribute('viewBox');
 button('Roll die').click();await until(()=>button('Spray ×4'));
 d.querySelector('[aria-label="Ask the Egg Coach"]').click();await until(()=>d.querySelector('.coach-situation'));
 assert(d.querySelector('.coach-situation').textContent.includes('4 sprays remaining'));
 assert(button('Spray ×4').disabled);
 button('Back to game').click();await until(()=>!d.querySelector('[role="dialog"]'));
 button('Spray ×4').click();await until(()=>button('Spray ×3'));
 assert.equal(d.querySelector('.scene-window'),scene,'turn update replaced the scene window');
 assert.equal(d.querySelector('.scene-window svg'),svg,'turn update replaced the playing picture');
 assert.equal(svg.getAttribute('viewBox'),viewBox);
 assert(d.querySelector('.play-panel').contains(d.querySelector('.watch-ad-card')),'ad feedback can resize the whole scene');
 assert(!d.querySelector('.play-panel').contains(scene));
 d.querySelector('[aria-label="Ask the Egg Coach"]').click();await until(()=>d.querySelector('.coach-situation'));
 assert(d.querySelector('.coach-situation').textContent.includes('3 sprays remaining'));
 w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));await until(()=>!d.querySelector('[role="dialog"]'));
 d.querySelector('[aria-label="Back to home"]').click();await until(()=>d.querySelector('.portal'));
 assert.equal(d.documentElement.dataset.playing,undefined,'viewport remained locked after leaving play');
 d.querySelector('.coach-entry').click();await until(()=>d.querySelector('.rules-coach'));
 assert(d.querySelector('#dialog-title').textContent.includes('Ask the Egg Coach'));
 assert.equal(first.errors.length,0,first.errors.join('\n'));
 console.log('PASS: first-play guide pauses controls and scenery, examples fill the question, unavailable AI is honest, dismiss/manual coach/Escape work, live spray count is accurate, scene nodes survive turn updates and leaving play restores navigation.');
}finally{first.w.close();}

const loss=gameDom({seen:true,query:'mode=computer&difficulty=hard&gameMode=sudden',random:.99});
try{
 const {d,w,button}=loss;
 await until(()=>button('Roll die'));
 assert(!d.querySelector('.rules-coach'),'returning player was forced through the guide');
 button('Roll die').click();await until(()=>button('Spray ×6'));
 for(let n=6;n>=3;n--){button('Spray ×'+n).click();await wait(25);}
 await until(()=>d.querySelector('.result-score'));
 assert.equal(d.querySelector('.result-score>span').textContent,'COINS DEDUCTED');
 assert.equal(d.querySelector('.result-score>b').textContent,'-80');
 assert(!d.querySelector('.reward-receipt'),'loss displayed bonus winnings');
 assert.equal(JSON.parse(w.localStorage.getItem('egg-2d-progress-v1')).points,70);
 assert.equal(loss.errors.length,0,loss.errors.join('\n'));
 console.log('PASS: a real hard-mode loss renders -80 coins, stores the deducted balance, awards no bonus receipt and skips onboarding for returning players.');
}finally{loss.w.close();}
