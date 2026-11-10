import React,{useId} from 'react';
const art={
 bell:<><path d="M11 31c4-4 3-7 3-14a10 10 0 0 1 20 0c0 7-1 10 3 14l3 4H8Z"/><path d="M19 39q5 7 10 0" fill="#ffd477"/><path d="M24 4v3M18 18q0-5 4-6" fill="none" stroke="#fff5cb"/></>,
 home:<><path d="M7 22L24 7l17 15-4 1v17H11V23Z"/><path d="M19 40V28h10v12" fill="#fff4d6"/><path d="M17 20h14" fill="none" stroke="#fff2c8"/></>,
 levels:<><path d="M6 12l12-5 12 5 12-5v29l-12 5-12-5-12 5Z"/><path d="M18 8v28m12-24v28" fill="none" opacity=".5"/><path d="M12 29c7-16 16 7 24-11" fill="none" stroke="#fff8de" strokeDasharray="2 5" strokeWidth="3.5"/><path d="M32 16l4-7 5 7-5 7Z" fill="#ffb36a"/></>,
 gift:<><rect x="8" y="21" width="32" height="21" rx="3"/><rect x="5" y="15" width="38" height="10" rx="3"/><path d="M21 15h7v27h-7Z" fill="#ffd26e"/><path d="M24 15C6 16 10 1 18 6c4 2 6 9 6 9Zm0 0C42 16 39 1 31 6c-4 2-7 9-7 9Z" fill="#ffe898"/></>,
 shop:<><path d="M9 21h30v20H9Z"/><path d="M9 7h30l4 14c-2 7-8 7-10 0-2 7-8 7-10 0-2 7-8 7-10 0-2 7-7 6-8 0Z" fill="#ffd477"/><path d="M17 8l-2 13m9-13v13m8-13 2 13" fill="none" stroke="#f194ab"/><path d="M15 29h9v12h-9Zm15 0h4v5h-4Z" fill="#fff2d7"/></>,
 user:<><circle cx="24" cy="24" r="19"/><path d="M11 37c1-13 25-13 26 0" fill="#c1f0ed"/><path d="M24 10c-5 0-9 10-9 14 0 9 18 9 18 0 0-4-4-14-9-14Z" fill="#fff0c8"/><path d="M20 23v2m8-2v2m-7 3q3 3 6 0" fill="none" strokeWidth="2"/></>,
 users:<><circle cx="16" cy="18" r="8"/><circle cx="34" cy="19" r="7" fill="#b9a3ef"/><path d="M4 39v-4c0-13 24-13 24 0v4Zm25 0v-4c0-4-1-7-3-9 8-5 18 0 18 9v4Z"/></>,
 trophy:<><path d="M11 13H5c-2 12 5 15 11 16m21-16h6c2 12-5 15-11 16" fill="none"/><path d="M12 7h24l-2 18c-1 12-19 12-20 0Z"/><path d="M24 34v7m-9 0h18" fill="none"/><path d="M24 13l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z" fill="#fff8c6" strokeWidth="1.5"/></>,
 sound:<><path d="M7 19h8L27 9v30L15 29H7Z"/><path d="M33 17q8 7 0 14m6-22q14 15 0 30" fill="none"/></>,
 mute:<><path d="M7 19h8L27 9v30L15 29H7Z"/><path d="M34 18l9 12m0-12-9 12" fill="none"/></>,
 shield:<><path d="M24 5l16 6-2 17c-1 8-14 15-14 15S11 36 10 28L8 11Z"/><path d="M17 23l5 5 10-12" fill="none" stroke="#fff9df" strokeWidth="4"/></>,
 boost:<><path d="M27 4L8 27h14l-2 17 20-26H26Z"/><path d="M27 9L15 24h9" fill="none" stroke="#fff3c0" strokeWidth="2"/></>,
 sparkle:<><path d="M24 5l6 13 13 6-13 6-6 13-6-13-13-6 13-6Z"/><path d="M37 4l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#ffe184" strokeWidth="1.5"/></>,
 drop:<><path d="M24 4C20 13 9 23 9 31a15 15 0 0 0 30 0c0-8-11-18-15-27Z"/><path d="M17 27q-5 8 2 10" fill="none" stroke="#e6ffff" strokeWidth="4"/></>,
 lock:<><rect x="9" y="21" width="30" height="22" rx="6"/><path d="M15 21v-7a9 9 0 0 1 18 0v7" fill="none" strokeWidth="4"/><path d="M24 29v6" fill="none" stroke="#fff2ca" strokeWidth="4"/></>,
 check:<><circle cx="24" cy="24" r="19"/><path d="M14 24l7 7 14-16" fill="none" stroke="#f3fff7" strokeWidth="4"/></>,
 play:<><circle cx="24" cy="24" r="19"/><path d="M20 14l14 10-14 10Z" fill="#fff4d4"/></>,
 pause:<><rect x="9" y="6" width="11" height="36" rx="4"/><rect x="28" y="6" width="11" height="36" rx="4"/></>,
 coin:<><circle cx="25" cy="25" r="18" fill="#de9b39"/><circle cx="22" cy="21" r="17"/><circle cx="22" cy="21" r="12" fill="none" stroke="#dc9f3c" strokeWidth="2"/><path d="M22 12l3 6 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z" fill="#fff5b9" strokeWidth="1"/></>
};
const tones={bell:['#ffe38e','#e9b95b'],home:['#ffc78b','#f48b6d'],levels:['#a3efdc','#64c4ba'],gift:['#e1bcff','#a67bda'],shop:['#bcece5','#6cc4c7'],user:['#d6c2ff','#a188d3'],users:['#a6e4dc','#6dc4c9'],trophy:['#ffe997','#efb241'],sound:['#b9eddf','#77cbbd'],mute:['#e1d4eb','#bda4ce'],shield:['#c5dcff','#8aa5dc'],boost:['#ffde76','#f3ac4a'],sparkle:['#e5caff','#b89cdd'],drop:['#a7edff','#5dc3e1'],lock:['#e0d7e7','#c2afcf'],check:['#b9edc7','#79c497'],play:['#b5eee0','#78c9b7'],pause:['#ddc8ff','#ae91d8'],coin:['#fff19f','#f2bd52']};
export default function GameIcon({name='sparkle',className='',size=32}){const id=useId().replace(/:/g,''),colors=tones[name]||tones.sparkle;return <svg width={size} height={size} className={`game-icon ${className}`} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false"><defs><linearGradient id={id} x1="0" y1="0" x2=".75" y2="1"><stop stopColor={colors[0]}/><stop offset="1" stopColor={colors[1]}/></linearGradient></defs><g fill={`url(#${id})`} stroke="#40264f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">{art[name]||art.sparkle}</g></svg>;}
export const boostIcon=type=>({tension_boost:'boost',pressure_blast:'drop',emergency_stabilizer:'shield',quick_escape:'sparkle',counter_attack:'shield',lucky_roll:'play'}[type]||'sparkle');
