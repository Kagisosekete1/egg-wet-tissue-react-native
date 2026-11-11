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
