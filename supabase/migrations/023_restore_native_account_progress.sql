begin;

-- Keep the existing per-account progress table as the single cloud save.
-- game_profiles.points remains the separate ranking-points balance.
create table if not exists public.egg_native_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level integer not null default 1 check(level>=1),
  coins bigint not null default 0 check(coins>=0),
  xp bigint not null default 0 check(xp>=0),
  updated_at timestamptz not null default now()
);

alter table public.egg_native_progress
  add column if not exists progress jsonb not null default '{}'::jsonb,
  add column if not exists wins bigint not null default 0,
  add column if not exists games bigint not null default 0,
  add column if not exists safe_sprays bigint not null default 0,
  add column if not exists best bigint not null default 0,
  add column if not exists revision bigint not null default 1;

with clear_stats as (
  select user_id,max(level_cleared)+1 as level,
         jsonb_object_agg(level_cleared::text,1 order by level_cleared) as levels,
         coalesce(sum(reward_coins),0) as milestone_coins
  from public.egg_adventure_level_clears group by user_id
), match_stats as (
  select r.user_id,count(*) as games,
         count(*) filter(where r.won) as wins,
         coalesce(sum(r.safe_sprays),0) as safe_sprays,
         coalesce(sum(case when r.won then 60 else 0 end),0) as xp,
         coalesce(max(floor((least(60,r.safe_sprays*2)+least(20,r.rounds*2)+20)
           * case r.difficulty when 'hard' then 2 when 'normal' then 1.5 else 1 end)),0) as best,
         greatest(0,coalesce(sum(case when r.won then
           (case r.difficulty when 'easy' then 120 when 'hard' then 240 else 180 end)
             + least(60,greatest(0,r.safe_sprays)*5)
             + case when c.level_cleared is not null then 200+least(300,c.level_cleared*10) else 0 end
             + case when c.level_cleared is not null and c.level_cleared%10=0 then 500 else 0 end
           else -(case r.difficulty when 'easy' then 40 when 'hard' then 80 else 60 end)
         end),0)) as replayed_coins
  from public.game_results r
  left join public.egg_adventure_level_clears c on c.user_id=r.user_id and c.game_id=r.game_id
  where r.opponent='computer' group by r.user_id
), accounts as (
  select u.id as user_id,np.level as old_level,np.coins as old_coins,np.xp as old_xp,
         np.wins as old_wins,np.games as old_games,np.safe_sprays as old_safe_sprays,
         np.best as old_best,np.revision as old_revision,
         '{}'::jsonb as saved,
         coalesce(gp.username,u.raw_user_meta_data->>'username','Player') as player_name,
         coalesce(ms.games,0) as match_games,coalesce(ms.wins,0) as match_wins,
         coalesce(ms.safe_sprays,0) as match_safe_sprays,coalesce(ms.xp,0) as match_xp,
         coalesce(ms.best,0) as match_best,coalesce(ms.replayed_coins,0) as replayed_coins,
         coalesce(cs.level,1) as cleared_level,coalesce(cs.levels,'{}'::jsonb) as cleared_levels,
         coalesce(cs.milestone_coins,0) as milestone_coins,coalesce(gp.computer_wins,0) as profile_wins
  from auth.users u
  left join public.egg_native_progress np on np.user_id=u.id
  left join public.game_profiles gp on gp.id=u.id
  left join match_stats ms on ms.user_id=u.id
  left join clear_stats cs on cs.user_id=u.id
), restored as (
  select a.*,
    greatest(1,coalesce(a.old_level,1),a.cleared_level) as level_now,
    coalesce(case when jsonb_typeof(a.saved->'points')='number' then (a.saved->>'points')::bigint end,
             nullif(a.old_coins,0),greatest(a.replayed_coins,a.milestone_coins),0) as coins_now,
    coalesce(case when jsonb_typeof(a.saved->'xp')='number' then (a.saved->>'xp')::bigint end,
             nullif(a.old_xp,0),a.match_xp,0) as xp_now,
    greatest(coalesce(case when jsonb_typeof(a.saved->'wins')='number' then (a.saved->>'wins')::bigint end,0),
             coalesce(a.old_wins,0),a.match_wins,a.profile_wins) as wins_now,
    greatest(coalesce(case when jsonb_typeof(a.saved->'games')='number' then (a.saved->>'games')::bigint end,0),
             coalesce(a.old_games,0),a.match_games) as games_now,
    greatest(coalesce(case when jsonb_typeof(a.saved->'safeSprays')='number' then (a.saved->>'safeSprays')::bigint end,0),
             coalesce(a.old_safe_sprays,0),a.match_safe_sprays) as sprays_now,
    greatest(coalesce(case when jsonb_typeof(a.saved->'best')='number' then (a.saved->>'best')::bigint end,0),
             coalesce(a.old_best,0),a.match_best) as best_now,
    (case when jsonb_typeof(a.saved->'levels')='object' then a.saved->'levels' else '{}'::jsonb end)||a.cleared_levels as levels_now
  from accounts a
), payload as (
  select r.*,
    r.saved||jsonb_build_object(
      'version',1,'ownerId',r.user_id::text,'savedAt',now()::text,
      'points',r.coins_now,'xp',r.xp_now,'wins',r.wins_now,'games',r.games_now,
      'safeSprays',r.sprays_now,'best',r.best_now,'levels',r.levels_now,
      'history',case when jsonb_typeof(r.saved->'history')='array' then r.saved->'history' else '[]'::jsonb end,
      'daily',case when jsonb_typeof(r.saved->'daily')='object' then r.saved->'daily' else '{}'::jsonb end,
      'inventory',case when jsonb_typeof(r.saved->'inventory')='object' then r.saved->'inventory' else '{}'::jsonb end,
      'shields',case when jsonb_typeof(r.saved->'shields')='array' then r.saved->'shields' else '[]'::jsonb end,
      'milestones',case when jsonb_typeof(r.saved->'milestones')='array' then r.saved->'milestones' else '[]'::jsonb end,
      'gifts',case when jsonb_typeof(r.saved->'gifts')='object' then r.saved->'gifts' else '{}'::jsonb end,
      'playerName',r.player_name
    ) as full_progress
  from restored r
)
insert into public.egg_native_progress(user_id,level,coins,xp,wins,games,safe_sprays,best,progress,revision,updated_at)
select user_id,level_now,coins_now,xp_now,wins_now,games_now,sprays_now,best_now,full_progress,
       greatest(1,coalesce(old_revision,0)+1),now()
from payload
on conflict(user_id) do update set
  level=greatest(public.egg_native_progress.level,excluded.level),
  coins=excluded.coins,xp=excluded.xp,wins=excluded.wins,games=excluded.games,
  safe_sprays=excluded.safe_sprays,best=excluded.best,progress=excluded.progress,
  revision=greatest(public.egg_native_progress.revision,excluded.revision),updated_at=now();

-- Match receipts repair stale leaderboard win counts; ranking points are left alone.
with receipt_wins as (
  select user_id,
    count(*) filter(where won and opponent='computer') as computer_wins,
    count(*) filter(where won and opponent='friend') as friend_wins
  from public.game_results group by user_id
)
update public.game_profiles gp
set computer_wins=rw.computer_wins,
    friend_wins=rw.friend_wins,
    wins=rw.computer_wins+rw.friend_wins+coalesce(gp.online_wins,0),
    updated_at=now()
from receipt_wins rw where gp.id=rw.user_id;

-- All readable rows have been copied into egg_native_progress above. The
-- previous JSON save table is no longer used by the app.
drop table if exists public.egg_adventure_saves;

alter table public.egg_native_progress enable row level security;
revoke all on public.egg_native_progress from public,anon;
grant select,insert,update on public.egg_native_progress to authenticated;
drop policy if exists "Players read own native progress" on public.egg_native_progress;
create policy "Players read own native progress" on public.egg_native_progress
  for select to authenticated using(auth.uid()=user_id);
drop policy if exists "Players create own native progress" on public.egg_native_progress;
create policy "Players create own native progress" on public.egg_native_progress
  for insert to authenticated with check(auth.uid()=user_id);
drop policy if exists "Players update own native progress" on public.egg_native_progress;
create policy "Players update own native progress" on public.egg_native_progress
  for update to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);

commit;
