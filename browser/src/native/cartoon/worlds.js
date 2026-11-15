export const THEMES=[
 {name:'Garden Lab',kind:'garden',sky:['#6fb8e8','#cfeaf6'],far:'#a2c5d7',middle:'#79c5b4',ground:'#b7dc83',leaf:['#a8db7a','#3e8e4f'],table:['#ffd39a','#eaa180']},
 {name:'Cloud Garden',kind:'cloud',sky:['#97b5f1','#f4d6ec'],far:'#b8b1df',middle:'#a1bde4',ground:'#d7c6ee',leaf:['#e3b7ee','#9d9bda'],table:['#f0d9f5','#bda1d5']},
 {name:'Sunny Shores',kind:'coast',sky:['#52cfe9','#b8f5eb'],far:'#65bdd7',middle:'#57d0cd',ground:'#ffe0a0',leaf:['#9cda79','#36a78d'],table:['#ffe5b3','#dfb67d']},
 {name:'Candy Valley',kind:'candy',sky:['#f6a8d4','#ffe4c4'],far:'#d2a3dc',middle:'#e9acc2',ground:'#d6e7ad',leaf:['#f5b5d5','#ba86d2'],table:['#fbd1e4','#d695c7']},
 {name:'Frosty Peaks',kind:'snow',sky:['#a1d7f0','#e9f8ff'],far:'#9caed4',middle:'#c7e1ee',ground:'#f3fcff',leaf:['#e5f8ff','#89b8d5'],table:['#e5edf7','#aabed7']},
 {name:'Sunset Mesa',kind:'desert',sky:['#f8b298','#ffebbd'],far:'#c495a9',middle:'#dcaa8d',ground:'#eecb91',leaf:['#b4cf87','#7ca581'],table:['#f8d0a1','#c38f7e']},
 {name:'Starlight Grove',kind:'space',sky:['#514780','#aa90ca'],far:'#726393',middle:'#8b80b3',ground:'#afa0ce',leaf:['#b0d5d3','#7b94b8'],table:['#d8bce7','#9a82b5']},
 {name:'Crystal Cove',kind:'crystal',sky:['#72c7d8','#c4e5f4'],far:'#a4afd9',middle:'#94cfc9',ground:'#d1e6d4',leaf:['#c5e5f4','#8eb5de'],table:['#e4dcfa','#a8b6d8']},
];
export function worldAt(index=0){const n=Number.isSafeInteger(index)&&index>=0?index:0,theme=THEMES[n%THEMES.length],expedition=Math.floor(n/THEMES.length)+1;return {...theme,index:n,number:n+1,name:theme.name+(expedition>1?` · Expedition ${expedition}`:''),expedition};}
