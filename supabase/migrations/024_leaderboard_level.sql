begin;

-- Expose only the public level alongside the existing public ranking fields.
-- Other columns in egg_native_progress remain private to each account.
drop function if exists public.get_game_leaderboard();
create function public.get_game_leaderboard()
returns table(
  id uuid,
  username text,
  country_code text,
  avatar_url text,
  points integer,
  wins bigint,
  computer_wins integer,
  friend_wins integer,
  online_wins integer,
  created_at timestamptz,
  level integer
)
language sql stable security definer set search_path=public,pg_temp as $$
  select p.id,p.username,p.country_code,
         coalesce(nullif(trim(p.avatar_url),''),nullif(trim(legacy.avatar_url),'')),
         p.points,coalesce(native.wins,p.wins::bigint),p.computer_wins,p.friend_wins,p.online_wins,p.created_at,
         coalesce(native.level,1)
  from public.game_profiles p
  left join public.profiles legacy on legacy.id=p.id
  left join public.egg_native_progress native on native.user_id=p.id
  order by p.points desc,p.wins desc,p.created_at asc,p.id;
$$;
revoke all on function public.get_game_leaderboard() from public;
grant execute on function public.get_game_leaderboard() to anon,authenticated;

notify pgrst,'reload schema';
commit;
