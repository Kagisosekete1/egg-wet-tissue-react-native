begin;

-- Adventure mode previously lived only in each browser/WebView's localStorage.
-- Store a per-account snapshot so a PWA and the Android WebView can share it.
create table if not exists public.egg_adventure_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Some databases already had this table from an earlier schema. CREATE TABLE IF
-- NOT EXISTS does not add columns to an existing table, so repair that shape.
alter table public.egg_adventure_saves
  add column if not exists progress jsonb not null default '{}'::jsonb;

-- Older versions may have a required revision column without a default. The
-- client writes progress snapshots without supplying a revision, so normalize
-- it to a safe default for both fresh inserts and upserts.
alter table public.egg_adventure_saves
  add column if not exists revision bigint not null default 0;
alter table public.egg_adventure_saves
  alter column revision set default 0;
update public.egg_adventure_saves set revision=0 where revision is null;
alter table public.egg_adventure_saves
  alter column revision set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.egg_adventure_saves'::regclass
      and conname = 'egg_adventure_saves_progress_object_check'
  ) then
    alter table public.egg_adventure_saves
      add constraint egg_adventure_saves_progress_object_check
      check (jsonb_typeof(progress) = 'object');
  end if;
end;
$$;

alter table public.egg_adventure_saves enable row level security;
revoke all on public.egg_adventure_saves from public, anon;
grant select, insert, update on public.egg_adventure_saves to authenticated;

drop policy if exists "Players read own adventure save" on public.egg_adventure_saves;
create policy "Players read own adventure save"
  on public.egg_adventure_saves for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Players create own adventure save" on public.egg_adventure_saves;
create policy "Players create own adventure save"
  on public.egg_adventure_saves for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Players update own adventure save" on public.egg_adventure_saves;
create policy "Players update own adventure save"
  on public.egg_adventure_saves for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

commit;
