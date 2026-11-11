begin;

create table if not exists public.game_reward_claim_state(
 user_id uuid primary key references auth.users(id) on delete cascade,
 last_claim_at timestamptz
);
create table if not exists public.game_reward_claims(
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 reward_kind text not null check(reward_kind in ('daily','welcome','milestone','goal')),
 reward_key text not null check(length(reward_key) between 1 and 80),
 claimed_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
alter table public.game_reward_claim_state enable row level security;
alter table public.game_reward_claims enable row level security;
revoke all on public.game_reward_claim_state,public.game_reward_claims from public,anon,authenticated;
grant select on public.game_reward_claim_state,public.game_reward_claims to authenticated;
drop policy if exists "Own reward cooldown" on public.game_reward_claim_state;
create policy "Own reward cooldown" on public.game_reward_claim_state for select to authenticated using(user_id=auth.uid());
drop policy if exists "Own reward claims" on public.game_reward_claims;
create policy "Own reward claims" on public.game_reward_claims for select to authenticated using(user_id=auth.uid());

create or replace function public.get_game_reward_status()
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare stamp timestamptz;
begin
 if auth.uid() is null then raise exception 'Please sign in';end if;
 select last_claim_at into stamp from game_reward_claim_state where user_id=auth.uid();
 return jsonb_build_object('last_claim_at',stamp,'next_claim_at',stamp+interval '24 hours','server_time',now());
end;$$;

create or replace function public.claim_game_reward(p_request_id uuid,p_reward_kind text,p_reward_key text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare stamp timestamptz;previous game_reward_claims%rowtype;
begin
 if auth.uid() is null then raise exception 'Please sign in';end if;
 if p_request_id is null or p_reward_kind is null or p_reward_kind not in ('daily','welcome','milestone','goal') or p_reward_key is null or length(p_reward_key) not between 1 and 80 then raise exception 'Invalid reward claim';end if;
 insert into game_reward_claim_state(user_id)values(auth.uid()) on conflict(user_id)do nothing;
 select last_claim_at into stamp from game_reward_claim_state where user_id=auth.uid() for update;
 select * into previous from game_reward_claims where user_id=auth.uid() and request_id=p_request_id;
 if found then
  if previous.reward_kind<>p_reward_kind or previous.reward_key<>p_reward_key then raise exception 'Invalid reward retry';end if;
  return jsonb_build_object('request_id',p_request_id,'claimed_at',previous.claimed_at,'next_claim_at',stamp+interval '24 hours','server_time',now(),'already_claimed',true);
 end if;
 if stamp is not null and now()<stamp+interval '24 hours' then raise exception 'Reward cooldown active' using detail=jsonb_build_object('next_claim_at',stamp+interval '24 hours')::text;end if;
 insert into game_reward_claims(user_id,request_id,reward_kind,reward_key)values(auth.uid(),p_request_id,p_reward_kind,p_reward_key);
 update game_reward_claim_state set last_claim_at=now() where user_id=auth.uid();
 return jsonb_build_object('request_id',p_request_id,'claimed_at',now(),'next_claim_at',now()+interval '24 hours','server_time',now(),'already_claimed',false);
end;$$;
revoke all on function public.get_game_reward_status() from public,anon;
revoke all on function public.claim_game_reward(uuid,text,text) from public,anon;
grant execute on function public.get_game_reward_status() to authenticated;
grant execute on function public.claim_game_reward(uuid,text,text) to authenticated;

notify pgrst,'reload schema';
commit;
