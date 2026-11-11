-- Egg & Wet Tissue app schema. Apply migrations in numbered order.
-- Internal source artifact: this SQL is not displayed inside the app.

-- 001_game_profiles.sql

create table if not exists public.game_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null default 'Player',
  country_code text not null default 'ZA',
  points integer not null default 0 check (points >= 0),
  wins integer not null default 0 check (wins >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_profiles_country_code_format check (country_code ~ '^[A-Z]{2}$')
);

alter table public.game_profiles enable row level security;
grant select on public.game_profiles to anon, authenticated;
grant insert (id, username, country_code) on public.game_profiles to authenticated;
grant update (username, country_code, updated_at) on public.game_profiles to authenticated;

drop policy if exists "Game profiles are public" on public.game_profiles;
create policy "Game profiles are public"
  on public.game_profiles for select to anon, authenticated using (true);
drop policy if exists "Users create their own game profile" on public.game_profiles;
create policy "Users create their own game profile"
  on public.game_profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users update their own game profile" on public.game_profiles;
create policy "Users update their own game profile"
  on public.game_profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.record_game_win()
returns public.game_profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result public.game_profiles;
begin
  if auth.uid() is null then
    raise exception 'You must sign in to record a win';
  end if;

  insert into public.game_profiles (id, username, country_code, points, wins)
  values (auth.uid(), 'Player', 'ZA', 10, 1)
  on conflict (id) do update
    set points = public.game_profiles.points + 10,
        wins = public.game_profiles.wins + 1,
        updated_at = now()
  returning * into result;
  return result;
end;
$$;

revoke all on function public.record_game_win() from public, anon;
grant execute on function public.record_game_win() to authenticated;

create or replace function public.get_my_game_rank()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select ranked.rank
  from (
    select id, row_number() over (order by points desc, wins desc, created_at asc) as rank
    from public.game_profiles
  ) ranked
  where ranked.id = auth.uid();
$$;

revoke all on function public.get_my_game_rank() from public, anon;
grant execute on function public.get_my_game_rank() to authenticated;

-- Existing Supabase users can sign in normally. Existing public profile rows
-- with UUID ids are copied when the legacy table contains compatible fields.
do $$
declare
  username_expr text;
  country_expr text;
  points_expr text;
  wins_expr text;
  created_expr text;
begin
  if to_regclass('public.profiles') is null
    or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='id' and udt_name='uuid') then
    return;
  end if;
  username_expr := case
    when exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='username') then 'coalesce(nullif(username, ''''), ''Player'')'
    when exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='name') then 'coalesce(nullif(name, ''''), ''Player'')'
    else '''Player''' end;
  country_expr := case
    when exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='country_code') then 'upper(country_code::text)'
    else '''ZA''' end;
  points_expr := case
    when exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='points') then 'greatest(coalesce(points::integer, 0), 0)'
    else '0' end;
  wins_expr := case
    when exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='wins') then 'greatest(coalesce(wins::integer, 0), 0)'
    else '0' end;
  created_expr := case
    when exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='created_at') then 'coalesce(created_at::timestamptz, now())'
    else 'now()' end;
  execute format(
    'insert into public.game_profiles (id, username, country_code, points, wins, created_at) select id, left(%s, 24), case when %s ~ ''^[A-Z]{2}$'' then %s else ''ZA'' end, %s, %s, %s from public.profiles on conflict (id) do nothing',
    username_expr, country_expr, country_expr, points_expr, wins_expr, created_expr
  );
end;
$$;


-- 002_avatars_challenges.sql

alter table public.game_profiles add column if not exists avatar_url text;
grant update (avatar_url) on public.game_profiles to authenticated;

insert into storage.buckets (id, name, public)
values ('game-avatars', 'game-avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Public game avatars are readable" on storage.objects;
create policy "Public game avatars are readable" on storage.objects for select using (bucket_id = 'game-avatars');
drop policy if exists "Users upload their own game avatar" on storage.objects;
create policy "Users upload their own game avatar" on storage.objects for insert to authenticated with check (bucket_id = 'game-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users update their own game avatar" on storage.objects;
create policy "Users update their own game avatar" on storage.objects for update to authenticated using (bucket_id = 'game-avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'game-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.game_challenges (
 id uuid primary key default gen_random_uuid(),
 challenger_id uuid not null references public.game_profiles(id) on delete cascade,
 challenged_id uuid not null references public.game_profiles(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint game_challenges_no_self check (challenger_id <> challenged_id)
);
create index if not exists game_challenges_challenged_created on public.game_challenges(challenged_id, created_at desc);
create index if not exists game_challenges_challenger_created on public.game_challenges(challenger_id, created_at desc);
alter table public.game_challenges enable row level security;
grant select, insert, update on public.game_challenges to authenticated;
drop policy if exists "Players see their challenges" on public.game_challenges;
create policy "Players see their challenges" on public.game_challenges for select to authenticated using (challenger_id = auth.uid() or challenged_id = auth.uid());
drop policy if exists "Players send challenges as themselves" on public.game_challenges;
create policy "Players send challenges as themselves" on public.game_challenges for insert to authenticated with check (challenger_id = auth.uid() and challenged_id <> auth.uid());
drop policy if exists "Invited players respond to challenges" on public.game_challenges;
create policy "Invited players respond to challenges" on public.game_challenges for update to authenticated using (challenged_id = auth.uid() and status = 'pending') with check (challenged_id = auth.uid() and status in ('accepted','declined'));


-- 003_restore_profiles_and_scoring.sql

begin;

alter table public.game_profiles
  add column if not exists computer_wins integer not null default 0,
  add column if not exists friend_wins integer not null default 0,
  add column if not exists online_wins integer not null default 0,
  add column if not exists legacy_wins_synced integer not null default 0,
  add column if not exists legacy_points_synced integer not null default 0,
  add column if not exists legacy_computer_synced integer not null default 0,
  add column if not exists legacy_friend_synced integer not null default 0,
  add column if not exists legacy_online_synced integer not null default 0,
  add column if not exists native_wins_seeded boolean not null default false;

-- Earlier native releases recorded computer wins only. Preserve those wins.
update public.game_profiles set computer_wins=computer_wins+greatest(wins-computer_wins-friend_wins-online_wins,0),native_wins_seeded=true where not native_wins_seeded;

-- Import the original score categories without replacing newer earned points.
-- The sync markers make this migration safe to run again.
insert into public.game_profiles(id,username,country_code,avatar_url,wins,points,computer_wins,friend_wins,online_wins,legacy_wins_synced,legacy_points_synced,legacy_computer_synced,legacy_friend_synced,legacy_online_synced,native_wins_seeded)
select p.id,left(coalesce(nullif(p.username,''),'Player'),24),case when upper(p.country_code)~'^[A-Z]{2}$' then upper(p.country_code) else 'ZA' end,p.avatar_url,
greatest(coalesce(p.wins,0),coalesce(p.computer_wins,0)+coalesce(p.friend_wins,0)+coalesce(p.online_wins,0)),
greatest(coalesce(p.wins,0),coalesce(p.computer_wins,0)+coalesce(p.friend_wins,0)+coalesce(p.online_wins,0))*10,
coalesce(p.computer_wins,0),coalesce(p.friend_wins,0),coalesce(p.online_wins,0),
greatest(coalesce(p.wins,0),coalesce(p.computer_wins,0)+coalesce(p.friend_wins,0)+coalesce(p.online_wins,0)),
greatest(coalesce(p.wins,0),coalesce(p.computer_wins,0)+coalesce(p.friend_wins,0)+coalesce(p.online_wins,0))*10,
coalesce(p.computer_wins,0),coalesce(p.friend_wins,0),coalesce(p.online_wins,0),true
from public.profiles p join auth.users u on u.id=p.id
on conflict(id) do update set
 username=case when game_profiles.username='Player' then excluded.username else game_profiles.username end,
 avatar_url=coalesce(nullif(game_profiles.avatar_url,''),excluded.avatar_url),
 wins=game_profiles.wins+greatest(excluded.legacy_wins_synced-game_profiles.legacy_wins_synced,0),
 points=game_profiles.points+greatest(excluded.legacy_points_synced-game_profiles.legacy_points_synced,0),
 computer_wins=game_profiles.computer_wins+greatest(excluded.legacy_computer_synced-game_profiles.legacy_computer_synced,0),
 friend_wins=game_profiles.friend_wins+greatest(excluded.legacy_friend_synced-game_profiles.legacy_friend_synced,0),
 online_wins=game_profiles.online_wins+greatest(excluded.legacy_online_synced-game_profiles.legacy_online_synced,0),
 legacy_wins_synced=greatest(game_profiles.legacy_wins_synced,excluded.legacy_wins_synced),
 legacy_points_synced=greatest(game_profiles.legacy_points_synced,excluded.legacy_points_synced),
 legacy_computer_synced=greatest(game_profiles.legacy_computer_synced,excluded.legacy_computer_synced),
 legacy_friend_synced=greatest(game_profiles.legacy_friend_synced,excluded.legacy_friend_synced),
 legacy_online_synced=greatest(game_profiles.legacy_online_synced,excluded.legacy_online_synced),updated_at=now();

grant insert(id,username,country_code,avatar_url) on public.game_profiles to authenticated;
grant update(username,country_code,avatar_url,updated_at) on public.game_profiles to authenticated;

create table if not exists public.game_results(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 game_id uuid not null,
 difficulty text not null check(difficulty in ('easy','normal','hard')),
 game_mode text not null check(game_mode in ('classic','sudden','chaos','tour')),
 opponent text not null check(opponent in ('computer','friend')),
 safe_sprays integer not null check(safe_sprays between 0 and 80),
 rounds integer not null check(rounds between 0 and 40),
 final_roll integer not null default 1 check(final_roll between 1 and 12),
 won boolean not null,
 points_awarded integer not null check(points_awarded between -200 and 200),
 created_at timestamptz not null default now(),unique(user_id,game_id)
);
alter table public.game_results enable row level security;
revoke all on public.game_results from anon,authenticated;
grant select on public.game_results to authenticated;
drop policy if exists "Players read their results" on public.game_results;
create policy "Players read their results" on public.game_results for select to authenticated using(user_id=auth.uid());

create or replace function public.save_game_profile(p_username text,p_country_code text,p_avatar_url text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'Please sign in';end if;
 if length(trim(p_username)) not between 1 and 24 then raise exception 'Choose a username between 1 and 24 characters';end if;
 if p_country_code!~'^[A-Z]{2}$' then raise exception 'Choose a country';end if;
 if p_avatar_url is not null and (p_avatar_url!~'^https://' or length(p_avatar_url)>2000) then raise exception 'Upload a profile photo first';end if;
 insert into game_profiles(id,username,country_code,avatar_url) values(auth.uid(),trim(p_username),p_country_code,p_avatar_url)
 on conflict(id) do update set username=excluded.username,country_code=excluded.country_code,avatar_url=excluded.avatar_url,updated_at=now();
 update profiles set username=trim(p_username),country_code=p_country_code,avatar_url=p_avatar_url where id=auth.uid();
end;$$;
revoke all on function public.save_game_profile(text,text,text) from public,anon;
grant execute on function public.save_game_profile(text,text,text) to authenticated;

create or replace function public.get_game_leaderboard()
returns table(id uuid,username text,country_code text,avatar_url text,points integer,wins integer,computer_wins integer,friend_wins integer,online_wins integer,created_at timestamptz)
language sql stable security definer set search_path=public,pg_temp as $$
 select p.id,p.username,p.country_code,p.avatar_url,p.points,p.wins,p.computer_wins,p.friend_wins,p.online_wins,p.created_at from game_profiles p order by p.points desc,p.wins desc,p.created_at asc;
$$;
revoke all on function public.get_game_leaderboard() from public;
grant execute on function public.get_game_leaderboard() to anon,authenticated;

drop function if exists public.record_game_result(uuid,text,text,text,integer,integer,boolean);
create or replace function public.record_game_result(p_game_id uuid,p_difficulty text,p_game_mode text,p_opponent text,p_safe_sprays integer,p_rounds integer,p_final_roll integer,p_won boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare award integer; inserted_id uuid; total integer; result_wins integer; multiplier numeric;
begin
 if auth.uid() is null then raise exception 'Please sign in';end if;
 if p_difficulty not in ('easy','normal','hard') or p_game_mode not in ('classic','sudden','chaos','tour') or p_opponent not in ('computer','friend') or p_safe_sprays not between 0 and 80 or p_rounds not between 0 and 40 or p_final_roll not between 1 and 12 then raise exception 'Invalid game result';end if;
 multiplier=case p_difficulty when 'hard' then 2 when 'normal' then 1.5 else 1 end;
 award=floor((least(60,p_safe_sprays*2)+least(20,p_rounds*2)+20)*multiplier);
 if not p_won then award := -award; end if;
 insert into game_results(user_id,game_id,difficulty,game_mode,opponent,safe_sprays,rounds,final_roll,won,points_awarded)
 values(auth.uid(),p_game_id,p_difficulty,p_game_mode,p_opponent,p_safe_sprays,p_rounds,p_final_roll,p_won,award) on conflict(user_id,game_id) do nothing returning id into inserted_id;
 if inserted_id is not null then
  insert into game_profiles(id,username,country_code) select u.id,left(coalesce(u.raw_user_meta_data->>'username','Player'),24),'ZA' from auth.users u where u.id=auth.uid() on conflict(id) do nothing;
  update game_profiles set points=greatest(0,points+award),wins=wins+case when p_won then 1 else 0 end,
   computer_wins=computer_wins+case when p_won and p_opponent='computer' then 1 else 0 end,
   friend_wins=friend_wins+case when p_won and p_opponent='friend' then 1 else 0 end,updated_at=now() where id=auth.uid();
 end if;
 select p.points,p.wins into total,result_wins from game_profiles p where p.id=auth.uid();
 return jsonb_build_object('points_awarded',award,'total_points',total,'wins',result_wins,'already_recorded',inserted_id is null);
end;$$;
revoke all on function public.record_game_result(uuid,text,text,text,integer,integer,integer,boolean) from public,anon;
grant execute on function public.record_game_result(uuid,text,text,text,integer,integer,integer,boolean) to authenticated;
notify pgrst,'reload schema';
commit;

-- 007_username_and_game_shields.sql
begin;

-- The old profiles table predates the native game's 24-character username
-- input. Keep its named check aligned with the username accepted by settings.
do $$
begin
  if to_regclass('public.profiles') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='profiles' and column_name='username'
    ) then
    execute $sql$
      update public.profiles
      set username = left(coalesce(nullif(btrim(username), ''), 'Player'), 24)
      where username is null or btrim(username) = '' or char_length(btrim(username)) > 24
    $sql$;
    execute 'alter table public.profiles drop constraint if exists profiles_username_check';
    execute $sql$
      alter table public.profiles
      add constraint profiles_username_check
      check (username is null or char_length(btrim(username)) between 1 and 24)
    $sql$;
  end if;
end;
$$;

-- Each row is one purchased shield. Purchases and point deductions run inside
-- SECURITY DEFINER RPCs so clients cannot grant themselves inventory.
create table if not exists public.game_shields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.game_profiles(id) on delete cascade,
  shield_type text not null check (shield_type in ('basic','golden','super')),
  max_hits integer not null check (max_hits in (1,2,3)),
  remaining_hits integer not null check (remaining_hits between 0 and max_hits),
  equipped boolean not null default false,
  request_id uuid not null,
  created_at timestamptz not null default now(),
  constraint game_shields_type_strength check (
    (shield_type='basic' and max_hits=1) or
    (shield_type='golden' and max_hits=2) or
    (shield_type='super' and max_hits=3)
  ),
  constraint game_shields_user_request_unique unique (user_id, request_id)
);

create unique index if not exists game_shields_one_equipped_per_user
  on public.game_shields(user_id) where equipped;
create index if not exists game_shields_user_created
  on public.game_shields(user_id, created_at desc);

alter table public.game_shields enable row level security;
revoke all on public.game_shields from anon, authenticated;
grant select on public.game_shields to authenticated;
drop policy if exists "Players read their shield inventory" on public.game_shields;
create policy "Players read their shield inventory"
  on public.game_shields for select to authenticated using (user_id=auth.uid());

-- Idempotency ledger: a retried damage event cannot spend two shield hits.
create table if not exists public.game_shield_blocks (
  user_id uuid not null references public.game_profiles(id) on delete cascade,
  event_id uuid not null,
  shield_id uuid not null references public.game_shields(id) on delete cascade,
  remaining_hits integer not null check (remaining_hits >= 0),
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.game_shield_blocks enable row level security;
revoke all on public.game_shield_blocks from anon, authenticated;

create or replace function public.purchase_game_shield(p_shield_type text, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  price integer;
  hits integer;
  balance integer;
  shield public.game_shields;
begin
  if auth.uid() is null then raise exception 'Please sign in to buy a shield'; end if;
  if p_request_id is null then raise exception 'Purchase request is missing'; end if;
  case p_shield_type
    when 'basic' then price:=5000; hits:=1;
    when 'golden' then price:=10000; hits:=2;
    when 'super' then price:=20000; hits:=3;
    else raise exception 'Unknown shield type';
  end case;

  insert into public.game_profiles(id,username,country_code)
    select u.id,left(coalesce(nullif(btrim(u.raw_user_meta_data->>'username'),''),'Player'),24),'ZA'
    from auth.users u where u.id=auth.uid()
    on conflict(id) do nothing;
  select p.points into balance from public.game_profiles p where p.id=auth.uid() for update;
  if not found then raise exception 'Player profile is unavailable'; end if;

  select * into shield from public.game_shields
    where user_id=auth.uid() and request_id=p_request_id;
  if found then
    return jsonb_build_object('shield_id',shield.id,'shield_type',shield.shield_type,
      'remaining_hits',shield.remaining_hits,'points_balance',balance,'duplicate',true);
  end if;
  if balance < price then raise exception 'Not enough points'; end if;

  update public.game_profiles set points=points-price,updated_at=now()
    where id=auth.uid() returning points into balance;
  insert into public.game_shields(user_id,shield_type,max_hits,remaining_hits,request_id)
    values(auth.uid(),p_shield_type,hits,hits,p_request_id) returning * into shield;
  return jsonb_build_object('shield_id',shield.id,'shield_type',shield.shield_type,
    'remaining_hits',shield.remaining_hits,'points_balance',balance,'duplicate',false);
end;
$$;
revoke all on function public.purchase_game_shield(text,uuid) from public,anon;
grant execute on function public.purchase_game_shield(text,uuid) to authenticated;

create or replace function public.equip_game_shield(p_shield_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare shield public.game_shields;
begin
  if auth.uid() is null then raise exception 'Please sign in to equip a shield'; end if;
  if p_shield_id is null then
    update public.game_shields set equipped=false where user_id=auth.uid() and equipped;
    return jsonb_build_object('equipped',false);
  end if;
  perform 1 from public.game_shields
    where id=p_shield_id and user_id=auth.uid() and remaining_hits>0 for update;
  if not found then raise exception 'That shield is unavailable or broken'; end if;
  update public.game_shields set equipped=false where user_id=auth.uid() and equipped;
  update public.game_shields set equipped=true
    where id=p_shield_id and user_id=auth.uid() returning * into shield;
  return jsonb_build_object('equipped',true,'shield_id',shield.id,
    'shield_type',shield.shield_type,'remaining_hits',shield.remaining_hits,'max_hits',shield.max_hits);
end;
$$;
revoke all on function public.equip_game_shield(uuid) from public,anon;
grant execute on function public.equip_game_shield(uuid) to authenticated;

create or replace function public.consume_game_shield_hit(p_shield_id uuid, p_event_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  prior public.game_shield_blocks;
  shield public.game_shields;
begin
  if auth.uid() is null then raise exception 'Please sign in'; end if;
  if p_event_id is null then raise exception 'Damage event is missing'; end if;
  select * into prior from public.game_shield_blocks
    where user_id=auth.uid() and event_id=p_event_id;
  if found then
    return jsonb_build_object('blocked',true,'shield_id',prior.shield_id,
      'remaining_hits',prior.remaining_hits,'duplicate',true);
  end if;

  select * into shield from public.game_shields
    where id=p_shield_id and user_id=auth.uid() for update;
  if not found then return jsonb_build_object('blocked',false,'remaining_hits',0); end if;
  -- Recheck while holding the shield-row lock so concurrent retries of this
  -- same event cannot decrement durability twice, including the final hit.
  select * into prior from public.game_shield_blocks
    where user_id=auth.uid() and event_id=p_event_id;
  if found then
    return jsonb_build_object('blocked',true,'shield_id',prior.shield_id,
      'remaining_hits',prior.remaining_hits,'duplicate',true);
  end if;
  if not shield.equipped or shield.remaining_hits<=0 then
    return jsonb_build_object('blocked',false,'remaining_hits',0);
  end if;

  update public.game_shields set remaining_hits=remaining_hits-1,
    equipped=(remaining_hits-1)>0
    where id=shield.id returning * into shield;
  insert into public.game_shield_blocks(user_id,event_id,shield_id,remaining_hits)
    values(auth.uid(),p_event_id,shield.id,shield.remaining_hits)
    on conflict(user_id,event_id) do nothing;
  return jsonb_build_object('blocked',true,'shield_id',shield.id,
    'shield_type',shield.shield_type,'remaining_hits',shield.remaining_hits,
    'max_hits',shield.max_hits,'equipped',shield.equipped,'duplicate',false);
end;
$$;
revoke all on function public.consume_game_shield_hit(uuid,uuid) from public,anon;
grant execute on function public.consume_game_shield_hit(uuid,uuid) to authenticated;

notify pgrst,'reload schema';
commit;

begin;

-- Point purchases and use of boosts are persisted with server-side costs and
-- idempotency keys. Real-money products and billing are intentionally absent.
create table if not exists public.game_powerup_inventory (
  user_id uuid not null references public.game_profiles(id) on delete cascade,
  powerup_type text not null check (powerup_type in (
    'tension_boost','pressure_blast','emergency_stabilizer',
    'quick_escape','counter_attack','lucky_roll'
  )),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id,powerup_type)
);
alter table public.game_powerup_inventory enable row level security;
revoke all on public.game_powerup_inventory from anon,authenticated;
grant select on public.game_powerup_inventory to authenticated;
drop policy if exists "Players read their power-up inventory" on public.game_powerup_inventory;
create policy "Players read their power-up inventory"
  on public.game_powerup_inventory for select to authenticated using (user_id=auth.uid());

create table if not exists public.game_powerup_purchases (
  user_id uuid not null references public.game_profiles(id) on delete cascade,
  request_id uuid not null,
  powerup_type text not null check (powerup_type in (
    'tension_boost','pressure_blast','emergency_stabilizer',
    'quick_escape','counter_attack','lucky_roll'
  )),
  points_paid integer not null check (points_paid > 0),
  created_at timestamptz not null default now(),
  primary key (user_id,request_id)
);
alter table public.game_powerup_purchases enable row level security;
revoke all on public.game_powerup_purchases from anon,authenticated;

create table if not exists public.game_powerup_uses (
  user_id uuid not null references public.game_profiles(id) on delete cascade,
  game_id uuid not null,
  action_id uuid not null,
  powerup_type text not null check (powerup_type in (
    'tension_boost','pressure_blast','emergency_stabilizer',
    'quick_escape','counter_attack','lucky_roll'
  )),
  created_at timestamptz not null default now(),
  primary key (user_id,game_id,action_id)
);
alter table public.game_powerup_uses enable row level security;
revoke all on public.game_powerup_uses from anon,authenticated;

create or replace function public.purchase_game_powerup(p_powerup_type text,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare price integer; balance integer; owned integer; prior public.game_powerup_purchases;
begin
  if auth.uid() is null then raise exception 'Please sign in to buy a power-up'; end if;
  if p_request_id is null then raise exception 'Purchase request is missing'; end if;
  case p_powerup_type
    when 'tension_boost' then price:=500;
    when 'pressure_blast' then price:=1000;
    when 'emergency_stabilizer' then price:=750;
    when 'quick_escape' then price:=1500;
    when 'counter_attack' then price:=1000;
    when 'lucky_roll' then price:=750;
    else raise exception 'Unknown power-up';
  end case;

  insert into public.game_profiles(id,username,country_code)
    select u.id,left(coalesce(nullif(btrim(u.raw_user_meta_data->>'username'),''),'Player'),24),'ZA'
      from auth.users u where u.id=auth.uid() on conflict(id) do nothing;
  select p.points into balance from public.game_profiles p where p.id=auth.uid() for update;
  if not found then raise exception 'Player profile is unavailable'; end if;

  select * into prior from public.game_powerup_purchases
    where user_id=auth.uid() and request_id=p_request_id;
  if found then
    select quantity into owned from public.game_powerup_inventory
      where user_id=auth.uid() and powerup_type=prior.powerup_type;
    return jsonb_build_object('powerup_type',prior.powerup_type,'quantity',coalesce(owned,0),
      'points_balance',balance,'duplicate',true);
  end if;
  if balance < price then raise exception 'Not enough points'; end if;

  update public.game_profiles set points=points-price,updated_at=now()
    where id=auth.uid() returning points into balance;
  insert into public.game_powerup_inventory(user_id,powerup_type,quantity)
    values(auth.uid(),p_powerup_type,1)
    on conflict(user_id,powerup_type) do update
      set quantity=game_powerup_inventory.quantity+1,updated_at=now()
    returning quantity into owned;
  insert into public.game_powerup_purchases(user_id,request_id,powerup_type,points_paid)
    values(auth.uid(),p_request_id,p_powerup_type,price);
  return jsonb_build_object('powerup_type',p_powerup_type,'quantity',owned,
    'points_balance',balance,'duplicate',false);
end;
$$;
revoke all on function public.purchase_game_powerup(text,uuid) from public,anon;
grant execute on function public.purchase_game_powerup(text,uuid) to authenticated;

create or replace function public.consume_game_powerup(p_powerup_type text,p_game_id uuid,p_action_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare prior public.game_powerup_uses; owned integer;
begin
  if auth.uid() is null then raise exception 'Please sign in to use a power-up'; end if;
  if p_game_id is null or p_action_id is null then raise exception 'Power-up action is missing'; end if;
  if p_powerup_type not in ('tension_boost','pressure_blast','emergency_stabilizer',
      'quick_escape','counter_attack','lucky_roll') then raise exception 'Unknown power-up'; end if;
  perform 1 from public.game_profiles where id=auth.uid() for update;
  if not found then raise exception 'Player profile is unavailable'; end if;
  select * into prior from public.game_powerup_uses
    where user_id=auth.uid() and game_id=p_game_id and action_id=p_action_id;
  if found then
    select quantity into owned from public.game_powerup_inventory
      where user_id=auth.uid() and powerup_type=prior.powerup_type;
    return jsonb_build_object('powerup_type',prior.powerup_type,'quantity',coalesce(owned,0),'duplicate',true);
  end if;
  update public.game_powerup_inventory set quantity=quantity-1,updated_at=now()
    where user_id=auth.uid() and powerup_type=p_powerup_type and quantity>0
    returning quantity into owned;
  if not found then raise exception 'You do not own this power-up'; end if;
  insert into public.game_powerup_uses(user_id,game_id,action_id,powerup_type)
    values(auth.uid(),p_game_id,p_action_id,p_powerup_type);
  return jsonb_build_object('powerup_type',p_powerup_type,'quantity',owned,'duplicate',false);
end;
$$;
revoke all on function public.consume_game_powerup(text,uuid,uuid) from public,anon;
grant execute on function public.consume_game_powerup(text,uuid,uuid) to authenticated;

notify pgrst,'reload schema';
commit;

-- Point-staked online battles. Point changes and battle actions are server-side
-- transactions; the app never submits a balance or winner as authoritative data.
begin;
alter table public.game_challenges
  add column if not exists stake_points integer not null default 0,
  add column if not exists challenger_stake_reserved boolean not null default false,
  add column if not exists challenged_stake_reserved boolean not null default false,
  add column if not exists battle_id uuid,
  add column if not exists request_id uuid,
  add column if not exists expires_at timestamptz not null default (now() + interval '24 hours');
alter table public.game_profiles
  add column if not exists online_wins integer not null default 0;

alter table public.game_challenges drop constraint if exists game_challenges_status_check;
alter table public.game_challenges add constraint game_challenges_status_check
  check (status in ('pending','accepted','declined','completed'));
revoke insert, update on public.game_challenges from anon, authenticated;
drop policy if exists "Players send challenges as themselves" on public.game_challenges;
drop policy if exists "Invited players respond to challenges" on public.game_challenges;

alter table public.game_challenges drop constraint if exists game_challenges_stake_points_check;
alter table public.game_challenges add constraint game_challenges_stake_points_check
  check (stake_points = 0 or (stake_points between 50 and 5000 and stake_points % 50 = 0));
create unique index if not exists game_challenges_request_id_unique
  on public.game_challenges(challenger_id, request_id) where request_id is not null;

create table if not exists public.game_battles (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null unique references public.game_challenges(id) on delete cascade,
  player_one uuid not null references public.game_profiles(id) on delete cascade,
  player_two uuid not null references public.game_profiles(id) on delete cascade,
  stake_points integer not null check (stake_points = 0 or (stake_points between 50 and 5000 and stake_points % 50 = 0)),
  current_player uuid not null references public.game_profiles(id),
  phase text not null default 'ready' check (phase in ('ready','spraying','over')),
  round integer not null default 1 check (round > 0),
  roll integer not null default 0 check (roll between 0 and 6),
  last_roll integer not null default 0 check (last_roll between 0 and 6),
  sprayed integer not null default 0 check (sprayed >= 0),
  damage numeric not null default 0 check (damage >= 0),
  threshold numeric not null check (threshold > 0),
  winner_id uuid references public.game_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_battles_distinct_players check (player_one <> player_two),
  constraint game_battles_current_player_check check (current_player in (player_one,player_two)),
  constraint game_battles_winner_check check (winner_id is null or winner_id in (player_one,player_two))
);
create index if not exists game_battles_players_updated on public.game_battles(player_one, player_two, updated_at desc);
alter table public.game_battles enable row level security;
grant select on public.game_battles to authenticated;
drop policy if exists "Battle players can view their matches" on public.game_battles;
create policy "Battle players can view their matches" on public.game_battles
  for select to authenticated using (auth.uid() in (player_one,player_two));
revoke insert, update, delete on public.game_battles from anon, authenticated;

-- New invitations can only be created through this function. This reserves the
-- challenger's stake atomically and is idempotent for a retried client request.
create or replace function public.create_staked_battle_invite(p_opponent_id uuid, p_stake_points integer, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_balance integer; v_row public.game_challenges%rowtype;
begin
  if v_user is null then raise exception 'Sign in to start a battle'; end if;
  if p_opponent_id is null or p_opponent_id = v_user then raise exception 'Choose another player'; end if;
  if p_stake_points is null or p_stake_points < 50 or p_stake_points > 5000 or p_stake_points % 50 <> 0 then raise exception 'Choose a stake from 50 to 5,000 points in steps of 50'; end if;
  if p_request_id is null then raise exception 'A request id is required'; end if;
  perform pg_advisory_xact_lock(hashtext(least(v_user::text,p_opponent_id::text)),hashtext(greatest(v_user::text,p_opponent_id::text)));
  select * into v_row from public.game_challenges where challenger_id=v_user and request_id=p_request_id;
  if found then return jsonb_build_object('challenge_id',v_row.id,'stake_points',v_row.stake_points,'duplicate',true); end if;
  perform 1 from public.game_profiles where id=p_opponent_id;
  if not found then raise exception 'Player not found'; end if;
  select points into v_balance from public.game_profiles where id=v_user for update;
  if not found then raise exception 'Your player profile is not ready'; end if;
  if v_balance < p_stake_points then raise exception 'Not enough points for this battle stake'; end if;
  if exists(select 1 from public.game_challenges where status='pending' and expires_at>now() and
    ((challenger_id=v_user and challenged_id=p_opponent_id) or (challenger_id=p_opponent_id and challenged_id=v_user))) then
    raise exception 'There is already a pending invitation between these players';
  end if;
  update public.game_profiles set points=points-p_stake_points,updated_at=now() where id=v_user returning points into v_balance;
  insert into public.game_challenges(challenger_id,challenged_id,status,stake_points,challenger_stake_reserved,request_id,expires_at)
    values(v_user,p_opponent_id,'pending',p_stake_points,true,p_request_id,now()+interval '24 hours') returning * into v_row;
  return jsonb_build_object('challenge_id',v_row.id,'stake_points',p_stake_points,'points_balance',v_balance,'duplicate',false);
end; $$;

create or replace function public.accept_staked_battle_invite(p_challenge_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_c public.game_challenges%rowtype; v_balance integer; v_battle public.game_battles%rowtype;
begin
  if v_user is null then raise exception 'Sign in to accept a battle'; end if;
  select * into v_c from public.game_challenges where id=p_challenge_id for update;
  if not found or v_c.challenged_id<>v_user then raise exception 'Battle invitation not found'; end if;
  if v_c.status='accepted' and v_c.battle_id is not null then
    select * into v_battle from public.game_battles where id=v_c.battle_id;
    return jsonb_build_object('battle_id',v_battle.id,'duplicate',true);
  end if;
  if v_c.status<>'pending' then raise exception 'This battle invitation is no longer pending'; end if;
  if v_c.expires_at<=now() then
    if v_c.challenger_stake_reserved then
      update public.game_profiles set points=points+v_c.stake_points,updated_at=now() where id=v_c.challenger_id;
    end if;
    update public.game_challenges set status='declined',challenger_stake_reserved=false,updated_at=now() where id=v_c.id;
    return jsonb_build_object('expired',true);
  end if;
  select points into v_balance from public.game_profiles where id=v_user for update;
  if not found or v_balance<v_c.stake_points then raise exception 'You need % points to accept this battle',v_c.stake_points; end if;
  update public.game_profiles set points=points-v_c.stake_points,updated_at=now() where id=v_user;
  insert into public.game_battles(challenge_id,player_one,player_two,stake_points,current_player,threshold)
    values(v_c.id,v_c.challenger_id,v_c.challenged_id,v_c.stake_points,v_c.challenger_id,17+random()*6) returning * into v_battle;
  update public.game_challenges set status='accepted',challenged_stake_reserved=true,battle_id=v_battle.id,updated_at=now() where id=v_c.id;
  return jsonb_build_object('battle_id',v_battle.id,'duplicate',false);
end; $$;

create or replace function public.respond_staked_battle_invite(p_challenge_id uuid, p_accept boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid := auth.uid(); v_c public.game_challenges%rowtype; v_balance integer;
begin
  if v_user is null then raise exception 'Sign in to respond to a battle'; end if;
  select * into v_c from public.game_challenges where id=p_challenge_id for update;
  if not found then raise exception 'Battle invitation not found'; end if;
  if p_accept then return public.accept_staked_battle_invite(p_challenge_id); end if;
  if v_c.challenger_id<>v_user and v_c.challenged_id<>v_user then raise exception 'You are not part of this invitation'; end if;
  if v_c.status<>'pending' then return jsonb_build_object('status',v_c.status,'duplicate',true); end if;
  if v_c.challenger_stake_reserved then
    update public.game_profiles set points=points+v_c.stake_points,updated_at=now() where id=v_c.challenger_id returning points into v_balance;
  end if;
  update public.game_challenges set status='declined',challenger_stake_reserved=false,updated_at=now() where id=v_c.id;
  return jsonb_build_object('status','declined','refunded',v_c.challenger_stake_reserved);
end; $$;

create or replace function public.expire_staked_battle_invites()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_c public.game_challenges%rowtype; v_count integer:=0;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  for v_c in select * from public.game_challenges where status='pending' and expires_at<=now() and challenger_stake_reserved for update skip locked loop
    update public.game_profiles set points=points+v_c.stake_points,updated_at=now() where id=v_c.challenger_id;
    update public.game_challenges set status='declined',challenger_stake_reserved=false,updated_at=now() where id=v_c.id;
    v_count:=v_count+1;
  end loop;
  return v_count;
end; $$;

create or replace function public.battle_roll(p_battle_id uuid)
returns public.game_battles language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid:=auth.uid(); v_b public.game_battles%rowtype; v_roll integer;
begin
  if v_user is null then raise exception 'Sign in to play'; end if;
  select * into v_b from public.game_battles where id=p_battle_id for update;
  if not found or v_user not in(v_b.player_one,v_b.player_two) then raise exception 'Battle not found'; end if;
  if v_b.phase<>'ready' or v_b.current_player<>v_user then raise exception 'It is not your turn to roll'; end if;
  v_roll:=1+floor(random()*6)::integer;
  if v_roll=v_b.last_roll then v_roll:=case when v_roll=6 then 1 else v_roll+1 end; end if;
  update public.game_battles set phase='spraying',roll=v_roll,last_roll=v_roll,sprayed=0,updated_at=now() where id=v_b.id returning * into v_b;
  return v_b;
end; $$;

create or replace function public.battle_spray(p_battle_id uuid)
returns public.game_battles language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid:=auth.uid(); v_b public.game_battles%rowtype; v_hit numeric; v_new_damage numeric; v_new_sprayed integer; v_winner uuid;
begin
  if v_user is null then raise exception 'Sign in to play'; end if;
  select * into v_b from public.game_battles where id=p_battle_id for update;
  if not found or v_user not in(v_b.player_one,v_b.player_two) then raise exception 'Battle not found'; end if;
  if v_b.phase<>'spraying' or v_b.current_player<>v_user then raise exception 'It is not your turn to spray'; end if;
  v_hit:=case when v_b.roll<=2 then 0.7 when v_b.roll<=4 then 1.0 else 1.3 end;
  v_new_damage:=v_b.damage+v_hit; v_new_sprayed:=v_b.sprayed+1;
  if v_new_damage>=v_b.threshold then
    v_winner:=case when v_user=v_b.player_one then v_b.player_two else v_b.player_one end;
    update public.game_profiles set points=points+(v_b.stake_points*2),wins=coalesce(wins,0)+1,online_wins=online_wins+1,updated_at=now() where id=v_winner;
    update public.game_battles set phase='over',damage=v_new_damage,sprayed=v_new_sprayed,winner_id=v_winner,updated_at=now() where id=v_b.id returning * into v_b;
    update public.game_challenges set status='completed',updated_at=now() where id=v_b.challenge_id;
    return v_b;
  end if;
  if v_new_sprayed>=v_b.roll then
    update public.game_battles set phase='ready',current_player=case when v_user=v_b.player_one then v_b.player_two else v_b.player_one end,
      round=round+case when v_user=v_b.player_two then 1 else 0 end,roll=0,sprayed=0,damage=v_new_damage,updated_at=now()
      where id=v_b.id returning * into v_b;
  else
    update public.game_battles set sprayed=v_new_sprayed,damage=v_new_damage,updated_at=now() where id=v_b.id returning * into v_b;
  end if;
  return v_b;
end; $$;

create or replace function public.battle_forfeit(p_battle_id uuid)
returns public.game_battles language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid:=auth.uid(); v_b public.game_battles%rowtype; v_winner uuid;
begin
  if v_user is null then raise exception 'Sign in to play'; end if;
  select * into v_b from public.game_battles where id=p_battle_id for update;
  if not found or v_user not in(v_b.player_one,v_b.player_two) then raise exception 'Battle not found'; end if;
  if v_b.phase='over' then return v_b; end if;
  v_winner:=case when v_user=v_b.player_one then v_b.player_two else v_b.player_one end;
  update public.game_profiles set points=points+(v_b.stake_points*2),wins=coalesce(wins,0)+1,online_wins=online_wins+1,updated_at=now() where id=v_winner;
  update public.game_battles set phase='over',winner_id=v_winner,updated_at=now() where id=v_b.id returning * into v_b;
  update public.game_challenges set status='completed',updated_at=now() where id=v_b.challenge_id;
  return v_b;
end; $$;

revoke all on function public.create_staked_battle_invite(uuid,integer,uuid) from public, anon;
revoke all on function public.accept_staked_battle_invite(uuid) from public, anon;
revoke all on function public.respond_staked_battle_invite(uuid,boolean) from public, anon;
revoke all on function public.expire_staked_battle_invites() from public, anon;
revoke all on function public.battle_roll(uuid) from public, anon;
revoke all on function public.battle_spray(uuid) from public, anon;
revoke all on function public.battle_forfeit(uuid) from public, anon;
grant execute on function public.create_staked_battle_invite(uuid,integer,uuid) to authenticated;
grant execute on function public.accept_staked_battle_invite(uuid) to authenticated;
grant execute on function public.respond_staked_battle_invite(uuid,boolean) to authenticated;
grant execute on function public.expire_staked_battle_invites() to authenticated;
grant execute on function public.battle_roll(uuid) to authenticated;
grant execute on function public.battle_spray(uuid) to authenticated;
grant execute on function public.battle_forfeit(uuid) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='game_battles') then
    alter publication supabase_realtime add table public.game_battles;
  end if;
exception when undefined_object then null; end $$;

notify pgrst,'reload schema';
commit;


-- Durable inbox and online inventory controls
begin;
-- Durable inbox entries are written by database triggers, independently of push.
create table if not exists public.game_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.game_profiles(id) on delete cascade,
 event_key text not null,
 title text not null,
 body text not null,
 data jsonb not null default '{}',
 created_at timestamptz not null default now(),
 unique(user_id,event_key)
);
create index if not exists game_notifications_owner_created on public.game_notifications(user_id,created_at desc);
alter table public.game_notifications enable row level security;
revoke all on public.game_notifications from anon,authenticated;
grant select,delete on public.game_notifications to authenticated;
drop policy if exists "Players read their own notifications" on public.game_notifications;
create policy "Players read their own notifications" on public.game_notifications for select to authenticated using(user_id=auth.uid());
drop policy if exists "Players delete their own notifications" on public.game_notifications;
create policy "Players delete their own notifications" on public.game_notifications for delete to authenticated using(user_id=auth.uid());
create or replace function public.write_game_notification() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare recipient uuid; heading text; message text; payload jsonb; event_id text;
begin
 if tg_table_name='game_challenges' then
  if tg_op='INSERT' then recipient:=new.challenged_id;heading:='Egg challenge!';message:='A friend invited you to a battle for '||new.stake_points||' points.';payload:=jsonb_build_object('type','egg_challenge','challenge_id',new.id);event_id:='invite:'||new.id;
  elsif new.status='accepted' and old.status<>'accepted' then recipient:=new.challenger_id;heading:='Challenge accepted';message:='Your friend is ready. Open your battle.';payload:=jsonb_build_object('type','egg_battle_turn','battle_id',new.battle_id);event_id:='accepted:'||new.id;
  else return new;end if;
 else
  if new.phase='over' and old.phase<>'over' then
   insert into public.game_notifications(user_id,event_key,title,body,data)
   select p,'result:'||new.id,'Battle finished','Open the battle to see the result.',jsonb_build_object('type','egg_battle_turn','battle_id',new.id)
   from unnest(array[new.player_one,new.player_two]) p on conflict do nothing;return new;
  elsif new.current_player<>old.current_player and new.phase='ready' then recipient:=new.current_player;heading:='Your turn!';message:='Your friend finished their sprays. Your egg is waiting.';payload:=jsonb_build_object('type','egg_battle_turn','battle_id',new.id);event_id:='turn:'||new.id||':'||new.round||':'||new.current_player;
  else return new;end if;
 end if;
 insert into public.game_notifications(user_id,event_key,title,body,data) values(recipient,event_id,heading,message,payload) on conflict do nothing;return new;
end;$$;
revoke all on function public.write_game_notification() from public,anon,authenticated;
drop trigger if exists challenge_inbox on public.game_challenges;
create trigger challenge_inbox after insert or update on public.game_challenges for each row execute function public.write_game_notification();
drop trigger if exists battle_inbox on public.game_battles;
create trigger battle_inbox after update on public.game_battles for each row execute function public.write_game_notification();
do $$begin
 alter publication supabase_realtime add table public.game_notifications;
exception when duplicate_object or undefined_object then null;end$$;
notify pgrst,'reload schema';
commit;

begin;
-- Only server-owned inventory can affect a ranked online battle.
alter table public.game_battles
 add column if not exists tools_version integer not null default 1,
 add column if not exists quick_escape_player uuid references public.game_profiles(id),
 add column if not exists pending_attack jsonb,
 add column if not exists last_tool_notice text not null default '',
 add column if not exists last_shield_block boolean not null default false;
create or replace function public.battle_use_powerup(p_battle_id uuid,p_powerup_type text,p_action_id uuid)
returns public.game_battles language plpgsql security definer set search_path=public,pg_temp as $$
declare u uuid:=auth.uid(); b public.game_battles%rowtype; next_damage numeric; recipient uuid;
begin
 if u is null then raise exception 'Sign in to use a tool';end if;
 select * into b from public.game_battles where id=p_battle_id for update;
 if not found or u not in(b.player_one,b.player_two) then raise exception 'Battle not found';end if;
 if exists(select 1 from public.game_powerup_uses where user_id=u and game_id=b.id and action_id=p_action_id) then return b;end if;
 if b.current_player<>u or b.phase not in('ready','spraying') then raise exception 'Wait for your turn';end if;
 recipient:=case when u=b.player_one then b.player_two else b.player_one end;
 next_damage:=b.damage;
 case p_powerup_type
 when 'emergency_stabilizer' then
  if b.damage<=0 then raise exception 'The tissue is already strong';end if;
  next_damage:=greatest(0,b.damage-0.7);b.last_tool_notice:='Stabilizer softened the tension.';
 when 'quick_escape' then
  if b.quick_escape_player is not null then raise exception 'An escape is already armed';end if;
  b.quick_escape_player:=u;b.last_tool_notice:='Quick Escape will block your next tension increase.';
 when 'counter_attack' then
  if b.phase<>'ready' or b.pending_attack is null or b.pending_attack->>'target'<>u::text then raise exception 'There is no incoming attack to counter';end if;
  next_damage:=greatest(0,b.damage-(b.pending_attack->>'delta')::numeric);b.pending_attack:=null;b.last_tool_notice:='Counter Attack cancelled the incoming pressure.';
 when 'tension_boost','pressure_blast' then
  if b.phase<>'ready' or b.pending_attack is not null then raise exception 'Use one attack before rolling';end if;
  if b.damage>=b.threshold-0.7 then raise exception 'The tissue is already at maximum pressure';end if;
  next_damage:=case when p_powerup_type='tension_boost' then greatest(b.damage,b.threshold-1.4) else least(b.threshold-0.7,b.damage+1.4) end;
  if b.quick_escape_player=recipient then next_damage:=b.damage;b.quick_escape_player:=null;b.last_tool_notice:='Quick Escape blocked the attack.';
  else b.pending_attack:=jsonb_build_object('target',recipient,'delta',next_damage-b.damage);b.last_tool_notice:='Pressure increased. Your opponent can counter before rolling.';end if;
 else raise exception 'This tool cannot be used here. Each turn has one roll.';
 end case;
 perform public.consume_game_powerup(p_powerup_type,b.id,p_action_id);
 update public.game_battles set damage=next_damage,quick_escape_player=b.quick_escape_player,pending_attack=b.pending_attack,last_tool_notice=b.last_tool_notice,updated_at=now() where id=b.id returning * into b;
 return b;
end;$$;
revoke all on function public.battle_use_powerup(uuid,text,uuid) from public,anon;
grant execute on function public.battle_use_powerup(uuid,text,uuid) to authenticated;
create or replace function public.battle_roll(p_battle_id uuid)
returns public.game_battles language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid:=auth.uid(); v_b public.game_battles%rowtype; v_roll integer;
begin
  if v_user is null then raise exception 'Sign in to play'; end if;
  select * into v_b from public.game_battles where id=p_battle_id for update;
  if not found or v_user not in(v_b.player_one,v_b.player_two) then raise exception 'Battle not found'; end if;
  if v_b.phase<>'ready' or v_b.current_player<>v_user then raise exception 'It is not your turn to roll'; end if;
  v_roll:=1+floor(random()*6)::integer;
  if v_roll=v_b.last_roll then v_roll:=case when v_roll=6 then 1 else v_roll+1 end; end if;
  update public.game_battles set pending_attack=case when pending_attack->>'target'=v_user::text then null else pending_attack end,last_shield_block=false,phase='spraying',roll=v_roll,last_roll=v_roll,sprayed=0,updated_at=now() where id=v_b.id returning * into v_b;
  return v_b;
end; $$;

create or replace function public.battle_spray(p_battle_id uuid)
returns public.game_battles language plpgsql security definer set search_path = public, pg_temp as $$
declare v_user uuid:=auth.uid(); v_b public.game_battles%rowtype; v_hit numeric; v_new_damage numeric; v_new_sprayed integer; v_winner uuid; v_shield uuid; v_block jsonb; v_escaped boolean:=false; v_shielded boolean:=false;
begin
  if v_user is null then raise exception 'Sign in to play'; end if;
  select * into v_b from public.game_battles where id=p_battle_id for update;
  if not found or v_user not in(v_b.player_one,v_b.player_two) then raise exception 'Battle not found'; end if;
  if v_b.phase<>'spraying' or v_b.current_player<>v_user then raise exception 'It is not your turn to spray'; end if;
  v_hit:=case when v_b.roll<=2 then 0.7 when v_b.roll<=4 then 1.0 else 1.3 end;
  v_escaped:=v_b.quick_escape_player=v_user;
  if coalesce(v_escaped,false) then v_hit:=0;end if;
  v_new_damage:=v_b.damage+v_hit; v_new_sprayed:=v_b.sprayed+1;
  if v_new_damage>=v_b.threshold then
    select id into v_shield from public.game_shields where user_id=v_user and equipped and remaining_hits>0 for update;
    if found then
      v_block:=public.consume_game_shield_hit(v_shield,gen_random_uuid());
      if (v_block->>'blocked')::boolean then v_new_damage:=v_b.damage;v_shielded:=true;end if;
    end if;
  end if;
  update public.game_battles set quick_escape_player=case when coalesce(v_escaped,false) then null else quick_escape_player end,last_shield_block=v_shielded where id=v_b.id;
  if v_new_damage>=v_b.threshold then
    v_winner:=case when v_user=v_b.player_one then v_b.player_two else v_b.player_one end;
    update public.game_profiles set points=points+(v_b.stake_points*2),wins=coalesce(wins,0)+1,online_wins=online_wins+1,updated_at=now() where id=v_winner;
    update public.game_battles set phase='over',damage=v_new_damage,sprayed=v_new_sprayed,winner_id=v_winner,updated_at=now() where id=v_b.id returning * into v_b;
    update public.game_challenges set status='completed',updated_at=now() where id=v_b.challenge_id;
    return v_b;
  end if;
  if v_new_sprayed>=v_b.roll then
    update public.game_battles set phase='ready',current_player=case when v_user=v_b.player_one then v_b.player_two else v_b.player_one end,
      round=round+case when v_user=v_b.player_two then 1 else 0 end,roll=0,sprayed=0,damage=v_new_damage,updated_at=now()
      where id=v_b.id returning * into v_b;
  else
    update public.game_battles set sprayed=v_new_sprayed,damage=v_new_damage,updated_at=now() where id=v_b.id returning * into v_b;
  end if;
  return v_b;
end; $$;

do $$declare t text;begin
 foreach t in array array['game_profiles','game_challenges','game_powerup_inventory','game_shields'] loop
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
   execute format('alter publication supabase_realtime add table public.%I',t);
  end if;
 end loop;
exception when undefined_object then null;end$$;
notify pgrst,'reload schema';
commit;


-- 015: Public ranking photo lookup without exposing private profiles.
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
