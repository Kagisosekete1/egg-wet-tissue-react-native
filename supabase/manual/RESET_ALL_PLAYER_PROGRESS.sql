-- SUPERSEDED FOR CURRENT RECOVERY: DO NOT RUN THIS SCRIPT.
-- This is a manual, destructive reset for a future fresh season only.
-- This zeros progress for every authenticated account. It keeps auth accounts,
-- usernames, avatars, countries, notifications, challenges, and account ownership.
-- Do not run this to recover old progress; it intentionally replaces all saves.
begin;

-- Repair installations where the table existed before the progress JSON column
-- was added. CREATE TABLE IF NOT EXISTS in the migration cannot alter an old table.
alter table public.egg_adventure_saves
  add column if not exists progress jsonb not null default '{}'::jsonb;
alter table public.egg_adventure_saves
  add column if not exists revision bigint not null default 0;
alter table public.egg_adventure_saves
  alter column revision set default 0;
update public.egg_adventure_saves set revision=0 where revision is null;
alter table public.egg_adventure_saves
  alter column revision set not null;

-- Clear match history and level-clear receipts before recreating zero saves.
delete from public.game_results;
delete from public.egg_adventure_level_clears;

-- Reset leaderboard score and win totals. Keep legacy sync markers unchanged so
-- an older migration cannot import the pre-reset totals again.
update public.game_profiles
set points=0,
    wins=0,
    computer_wins=0,
    friend_wins=0,
    online_wins=0,
    native_wins_seeded=true,
    updated_at=now();

-- Reset gameplay-point inventory and reward claim cooldowns.
delete from public.game_shields;
delete from public.game_powerup_uses;
delete from public.game_powerup_purchases;
delete from public.game_powerup_inventory;
delete from public.game_reward_claims;
update public.game_reward_claim_state set last_claim_at=null;

-- Create a fresh, account-owned zero save for every existing Auth account.
-- Every row is isolated by user_id and protected by migration 021's RLS policies.
insert into public.egg_adventure_saves(user_id,progress,revision,updated_at)
select u.id,
       jsonb_build_object(
         'version',1,
         'ownerId',u.id::text,
         'savedAt',now()::text,
         'points',0,
         'xp',0,
         'wins',0,
         'games',0,
         'safeSprays',0,
         'best',0,
         'winStreak',0,
         'levels','{}'::jsonb,
         'history','[]'::jsonb,
         'daily','{}'::jsonb,
         'inventory','{}'::jsonb,
         'shields','[]'::jsonb,
         'milestones','[]'::jsonb,
         'gifts','{}'::jsonb,
         'claimCooldowns','{}'::jsonb,
         'playerName',coalesce(nullif(btrim(gp.username),''),'Player')
       ),
       0,
       now()
from auth.users u
left join public.game_profiles gp on gp.id=u.id
on conflict(user_id) do update
set progress=excluded.progress,
    revision=excluded.revision,
    updated_at=excluded.updated_at;

-- Older app editions may have duplicate leaderboard totals in public.profiles.
-- Reset only known numeric progress columns, if that legacy table/columns exist.
do $$
declare
  v_column_name text;
  column_type text;
  assignments text:='';
begin
  if to_regclass('public.profiles') is null then return; end if;
  foreach v_column_name in array array[
    'points','score','total_points','total_score','wins','total_wins',
    'computer_wins','friend_wins','online_wins','coins','xp','experience',
    'level','current_level','win_streak'
  ] loop
    select c.data_type into column_type
    from information_schema.columns
    c
    where c.table_schema='public' and c.table_name='profiles' and c.column_name=v_column_name;
    if column_type in ('smallint','integer','bigint','numeric','real','double precision') then
      assignments:=assignments||case when assignments='' then '' else ', ' end||format('%I=0',v_column_name);
    end if;
    column_type:=null;
  end loop;
  if assignments<>'' then execute 'update public.profiles set '||assignments; end if;
end;
$$;

commit;
