begin;

-- Resolve legacy uploaded photos inside the existing public ranking RPC.
-- The legacy profiles table stays private; expose only the existing public fields.
create or replace function public.get_game_leaderboard()
returns table(id uuid,username text,country_code text,avatar_url text,points integer,wins integer,computer_wins integer,friend_wins integer,online_wins integer,created_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
 select p.id,p.username,p.country_code,
        coalesce(nullif(trim(p.avatar_url),''),nullif(trim(legacy.avatar_url),'')),
        p.points,p.wins,p.computer_wins,p.friend_wins,p.online_wins,p.created_at
 from public.game_profiles p
 left join public.profiles legacy on legacy.id=p.id
 order by p.points desc,p.wins desc,p.created_at asc,p.id;
$$;
revoke all on function public.get_game_leaderboard() from public;
grant execute on function public.get_game_leaderboard() to anon,authenticated;

notify pgrst,'reload schema';
commit;
