import {completeRoll,nextTurn,applyPowerup,applyCounter,declineCounter} from './rules.js';

// This edition always alternates players. A Chaos extra-turn card becomes a shield.
export function finishRoll(game,value,random=Math.random){
 const n=completeRoll(game,value,random);
 if(n.extraTurn)return {...n,roll:value,extraTurn:false,shield:true,card:'🛡️ Chaos Shield: first spray protected.'};
 if(n.roll!==value)return {...n,roll:value,card:'🌪️ Splash Surge: first spray adds extra pressure.',double:true};
 return n;
}
export function passDie(game){if(game.phase!=='waiting'||game.sprayed<game.roll)return game;return nextTurn({...game,extraTurn:false});}
// Attacks change tissue pressure; they do not skip anybody's roll.
export function useBoost(game,type){if(type==='lucky_roll')return game;const n=applyPowerup(game,type);if(n===game||!['tension_boost','pressure_blast'].includes(type))return n;if(n.phase==='counter')return {...n,rounds:game.rounds,pendingCounter:{...n.pendingCounter,resumePlayer:game.current}};return {...n,current:game.current,rounds:game.rounds,phase:'ready'};}
export function resolveCounter(game,accept){const resumePlayer=game.pendingCounter?.resumePlayer;const n=accept?applyCounter(game):declineCounter(game);return resumePlayer?{...n,current:resumePlayer}:n;}
export function tissueFeedback(ratio,falling=false){if(falling)return {stage:5,title:'The tissue tore!',hint:'The player whose spray dropped the egg loses.'};if(ratio>=.8)return {stage:4,title:'About to tear!',hint:'The egg is panicking. Keep tapping for your remaining sprays.'};if(ratio>=.5)return {stage:3,title:'Very loose — the egg is wobbling!',hint:'Take your remaining sprays, then pass the die.'};if(ratio>=.25)return {stage:2,title:'The wet tissue is sagging.',hint:'Watch the egg react. Each tap uses exactly one spray.'};if(ratio>=.06)return {stage:1,title:'The tissue is starting to loosen.',hint:'The egg can feel it! Tap Spray for each remaining spray.'};return {stage:0,title:'The tissue is still strong.',hint:'One roll per player. Spray the required count, then pass the die.'};}
