begin;

create table if not exists public.egg_adventure_level_clears (
  user_id uuid not null references auth.users(id) on delete cascade,
  level_cleared integer not null check(level_cleared between 1 and 100000000),
  game_id uuid not null,
  reward_coins integer generated always as (
    case when level_cleared % 10 = 0 then 500 else 0 end
  ) stored,
  cleared_at timestamptz not null default now(),
  primary key(user_id, level_cleared),
  unique(user_id, game_id)
);
alter table public.egg_adventure_level_clears enable row level security;
revoke all on public.egg_adventure_level_clears from public, anon, authenticated;

create or replace function public.record_egg_level_clear(p_level integer, p_game_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Sign in to record a level clear' using errcode='42501'; end if;
  if p_level is null or p_level not between 1 and 100000000 then return false; end if;
  if not exists (
    select 1 from public.game_results r
    where r.user_id=v_user and r.game_id=p_game_id and r.won and r.opponent='computer'
      and (p_level % 10 <> 0 or (r.difficulty='hard' and r.game_mode='tour'))
  ) then return false; end if;

  -- Existing players can carry their current level forward when their signed
  -- round history supports the number of clears. Game IDs cannot be reused.
  if (select count(*) from public.game_results r where r.user_id=v_user
    and r.won and r.opponent='computer') < p_level then return false; end if;

  insert into public.egg_adventure_level_clears(user_id, level_cleared, game_id)
  values(v_user, p_level, p_game_id) on conflict do nothing;
  return exists(select 1 from public.egg_adventure_level_clears c
    where c.user_id=v_user and c.level_cleared=p_level);
end;
$$;
revoke all on function public.record_egg_level_clear(integer,uuid) from public, anon;
grant execute on function public.record_egg_level_clear(integer,uuid) to authenticated;

create or replace function public.get_egg_adventure_levels()
returns table(user_id uuid, adventure_level integer)
language sql stable security definer set search_path = ''
as $$
  select c.user_id, max(c.level_cleared)+1
  from public.egg_adventure_level_clears c group by c.user_id
$$;
revoke all on function public.get_egg_adventure_levels() from public;
grant execute on function public.get_egg_adventure_levels() to anon, authenticated;
notify pgrst,'reload schema';
commit;
