import assert from 'node:assert/strict';
import {levelAt,unlockedLevel,isLevelUnlocked,loadProgress,recordRound} from '../src/web/progression.js';
import {worldAt,THEMES} from '../src/web/worlds.js';
const p=loadProgress(JSON.stringify({version:1,levels:Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,3]))}));assert.equal(unlockedLevel(p),13);assert(isLevelUnlocked(p,13));assert.equal(levelAt(13).world,'Cloud Garden');assert.equal(levelAt(10).gameMode,'tour');assert.equal(levelAt(1).title,'First splash');assert.equal(THEMES.length,8);assert.equal(new Set(THEMES.map(t=>t.kind)).size,8);
for(const id of [10,20,30,40,50]){assert.equal(levelAt(id).gameMode,'tour');assert.equal(levelAt(id).difficulty,'hard');assert.notEqual(levelAt(id).world,levelAt(id+1).world);}
for(const id of [13,18,100,10000,1000000,99999999]){const l=levelAt(id);assert(l&&l.id===id);assert(l.world);assert(['classic','chaos','sudden','tour'].includes(l.gameMode));assert(['easy','normal','hard'].includes(l.difficulty));}
for(let i=0;i<100;i++)assert.equal(levelAt(i*6+6).gameMode,'tour');
assert(worldAt(8).name.includes('Expedition 2'));assert.equal(levelAt(-1),null);assert.equal(levelAt(1.1),null);
const g={gameId:'new-world',mode:'computer',phase:'over',current:2,safeSprays:9,rounds:2,gameMode:levelAt(13).gameMode,difficulty:levelAt(13).difficulty};const next=recordRound(p,g,{levelId:13});assert.equal(next.levels[13],3);assert.equal(unlockedLevel(next),14);assert(!isLevelUnlocked(next,15));assert.equal(next.levels[1],3);
console.log('PASS: saved-level compatibility, level 13 unlock, endless generation through level 99,999,999, eight world themes, correct tournament endings and next-level gates.');
