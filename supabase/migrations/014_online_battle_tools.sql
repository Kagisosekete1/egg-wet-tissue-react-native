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
