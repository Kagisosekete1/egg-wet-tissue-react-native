import assert from 'node:assert/strict';
import {createGame,applySpray} from '../src/web/rules.js';
import {finishRoll,passDie,useBoost,resolveCounter,tissueFeedback} from '../src/web/turn-rules.js';
let g={...createGame({mode:'friend',gameMode:'chaos',difficulty:'easy'}),threshold:1000};
let previousOwner=2;
for(let turn=0;turn<20;turn++){
 assert.notEqual(g.current,previousOwner,'same player got consecutive rolls');previousOwner=g.current;
 // Force the former extra-turn Chaos card on every roll.
 let calls=0;g=finishRoll(g,3,()=>calls++===0?.1:.99);assert(!g.extraTurn);assert(g.shield);assert.equal(passDie(g),g,'die passed before sprays');
 const required=g.roll;for(let i=0;i<required;i++){const before=g.sprayed;g=applySpray(g);assert.equal(g.sprayed,before+1);}
 const completed=g;assert.equal(g.phase,'waiting');g=passDie(g);assert.notEqual(g.current,completed.current);assert.equal(g.phase,'ready');assert.equal(g.roll,0);
}
for(let face=1;face<=6;face++){const rolled=finishRoll({...g,phase:'ready'},face,()=>0);assert.equal(rolled.roll,face);assert.equal(rolled.lastRoll,face);assert(rolled.double);}
let attack={...createGame({mode:'friend'}),threshold:30};let n=useBoost(attack,'pressure_blast');assert.equal(n.phase,'counter');n=resolveCounter(n,true);assert.equal(n.current,attack.current);assert.equal(n.damage,attack.damage);assert.equal(n.phase,'ready');
n=resolveCounter(useBoost(attack,'pressure_blast'),false);assert.equal(n.current,attack.current);assert(n.damage>0);
const solo=createGame({mode:'computer'});assert.equal(useBoost(solo,'pressure_blast').current,1);
assert.equal(useBoost({...solo,phase:'spraying',roll:3},'lucky_roll').luckyUsed,false);
assert.equal(tissueFeedback(.07).stage,1);assert.equal(tissueFeedback(.3).stage,2);assert.equal(tissueFeedback(.6).stage,3);assert.equal(tissueFeedback(.85).stage,4);
console.log('PASS: 20 alternating Chaos turns, exact manual spray counts, no early handoff, no attack-skipped turns, no rerolls, early reaction stages.');
