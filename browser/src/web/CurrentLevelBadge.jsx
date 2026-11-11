import React from 'react';

export default function CurrentLevelBadge({level,savedOnly=false}){
 if(!level)return null;
 return <div className={`current-level-badge ${savedOnly?'saved-level':''}`} role="status" aria-label={savedOnly?`Current adventure level ${level.id}`:`Current level ${level.id}, ${level.world}`} title={savedOnly?`Saved adventure progress: Level ${level.id}`:`Level ${level.id} · ${level.world}`}><strong>{savedOnly?'Adventure Level':'Level'} {level.id}</strong>{!savedOnly&&<span>{level.world}</span>}</div>;
}
