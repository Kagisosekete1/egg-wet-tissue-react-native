begin;

-- Allow both battle participants to react to an active opponent turn. All
-- inventory consumption and pressure changes remain atomic and server-owned.
create or replace function public.battle_use_powerup(p_battle_id uuid,p_powerup_type text,p_action_id uuid)
returns public.game_battles language plpgsql security definer set search_path=public,pg_temp as $$
declare
 u uuid:=auth.uid(); b public.game_battles%rowtype; next_damage numeric; recipient uuid;
 incoming_delta numeric;
begin
 if u is null then raise exception 'Sign in to use a tool';end if;
 if p_action_id is null then raise exception 'A use request id is required';end if;
 select * into b from public.game_battles where id=p_battle_id for update;
 if not found or u not in(b.player_one,b.player_two) then raise exception 'Battle not found';end if;
 if exists(select 1 from public.game_powerup_uses where user_id=u and game_id=b.id and action_id=p_action_id) then return b;end if;
 if b.phase='over' then raise exception 'The battle has ended';end if;
 recipient:=case when u=b.player_one then b.player_two else b.player_one end;
 next_damage:=b.damage;
 case p_powerup_type
 when 'emergency_stabilizer' then
  if b.damage<=0 then raise exception 'The tissue is already strong';end if;
  if b.pending_attack->>'target'=u::text then raise exception 'Counter or accept the incoming attack first';end if;
  next_damage:=greatest(0,b.damage-0.7);b.last_tool_notice:='Emergency Stabilizer reduced tissue pressure.';
 when 'quick_escape' then
  if b.quick_escape_player is not null then raise exception 'A Quick Escape is already armed';end if;
  b.quick_escape_player:=u;b.last_tool_notice:='Quick Escape will block your next pressure increase.';
 when 'counter_attack' then
  if b.pending_attack->>'target'=u::text then
   incoming_delta:=coalesce((b.pending_attack->>'delta')::numeric,0);
   next_damage:=greatest(0,b.damage-incoming_delta);b.pending_attack:=null;
   b.last_tool_notice:='COUNTER ATTACK! Incoming pressure cancelled.';
  else
   if b.pending_attack is not null then raise exception 'Resolve the current incoming attack first';end if;
   if b.damage>=b.threshold-0.7 then raise exception 'The tissue is already at maximum pressure';end if;
   if b.quick_escape_player=recipient then next_damage:=b.damage;b.quick_escape_player:=null;b.last_tool_notice:='Quick Escape blocked the counter attack.';
   else next_damage:=b.threshold-0.7;b.pending_attack:=jsonb_build_object('target',recipient,'delta',next_damage-b.damage);b.last_tool_notice:='COUNTER ATTACK! Opponent has one safe spray left.';end if;
  end if;
 when 'tension_boost','pressure_blast' then
  if b.pending_attack is not null then raise exception 'Resolve the current incoming attack first';end if;
  if b.damage>=b.threshold-0.7 then raise exception 'The tissue is already at maximum pressure';end if;
  next_damage:=case when p_powerup_type='tension_boost' then b.threshold-0.7 else least(b.threshold-0.7,b.damage+1.4) end;
  if b.quick_escape_player=recipient then next_damage:=b.damage;b.quick_escape_player:=null;b.last_tool_notice:='Quick Escape blocked the attack.';
  else b.pending_attack:=jsonb_build_object('target',recipient,'delta',next_damage-b.damage);b.last_tool_notice:=case when p_powerup_type='tension_boost' then 'TENSION BOOST! Opponent has one safe spray left.' else 'PRESSURE BLAST! Tissue pressure increased.' end;end if;
 else raise exception 'This power-up is not available in a battle';
 end case;
 perform public.consume_game_powerup(p_powerup_type,b.id,p_action_id);
 update public.game_battles set damage=next_damage,quick_escape_player=b.quick_escape_player,pending_attack=b.pending_attack,last_tool_notice=b.last_tool_notice,updated_at=now() where id=b.id returning * into b;
 return b;
end;$$;
revoke all on function public.battle_use_powerup(uuid,text,uuid) from public,anon;
grant execute on function public.battle_use_powerup(uuid,text,uuid) to authenticated;

-- The battle UI can now update immediately on attack/counter changes.
do $$begin
 alter publication supabase_realtime add table public.game_battles;
exception when duplicate_object or undefined_object then null;end$$;

notify pgrst,'reload schema';
commit;
