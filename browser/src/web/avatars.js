/** Prefer saved uploads; keep alternates so one stale URL cannot hide a legacy photo. */
export function avatarSources(profile={}){
 profile=profile||{};
 const candidates=[profile.avatar_url,profile.profile_photo_url,profile.photo_url,profile.profile_picture,profile.picture,...(Array.isArray(profile.avatar_urls)?profile.avatar_urls:[])];
 return [...new Set(candidates.filter(v=>typeof v==='string').map(v=>v.trim()).filter(v=>/^https?:\/\//i.test(v)||/^data:image\/(?:png|jpeg|webp);base64,/i.test(v)))].slice(0,6);
}
