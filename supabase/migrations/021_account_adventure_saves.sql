begin;

-- Adventure mode previously lived only in each browser/WebView's localStorage.
-- Store a per-account snapshot so a PWA and the Android WebView can share it.
create table if not exists public.egg_adventure_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress jsonb not null default '{}'::jsonb check (jsonb_typeof(progress) = 'object'),
  updated_at timestamptz not null default now()
);

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
