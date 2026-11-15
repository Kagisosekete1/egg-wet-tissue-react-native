import {createGame} from './rules.js';
const challenges=[{name:'Fresh start',detail:'Dry tissue. Learn the rhythm.',strength:1,wet:0},{name:'Morning dew',detail:'The tissue begins 18% wet.',strength:1,wet:.18},{name:'Strong fibres',detail:'15% tougher tissue. More suspense.',strength:1.15,wet:0},{name:'Delicate balance',detail:'20% weaker tissue. Watch the egg!',strength:.8,wet:0},{name:'Splash storm',detail:'A damp start and 10% weaker tissue.',strength:.9,wet:.25},{name:'World cup',detail:'Win two rounds to take the cup.',strength:1,wet:0}];
export function levelChallenge(level){
 const bonusTarget=4+Math.min(4,Math.floor((level.id-1)/10));
 if(level.id%10===0)return {name:'World cup',detail:'Win two rounds with weaker tissue and a damp start.',strength:.8,wet:.2,bonusTarget};
 return {...challenges[(level.id-1)%6],bonusTarget};
}
export function createLevelGame(settings,level){const game=createGame(settings);if(!level)return game;const rule=levelChallenge(level),threshold=game.threshold*rule.strength;return {...game,threshold,damage:threshold*Math.max(game.damage/game.threshold,rule.wet)};}
