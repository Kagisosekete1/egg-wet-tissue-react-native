begin;

-- Repair older versions of egg_adventure_saves without changing any non-null
-- saved progress. Null JSON snapshots are normalized only when no snapshot exists.
alter table public.egg_adventure_saves
  add column if not exists progress jsonb;
alter table public.egg_adventure_saves
  alter column progress set default '{}'::jsonb;
update public.egg_adventure_saves
  set progress='{}'::jsonb
  where progress is null;
alter table public.egg_adventure_saves
  alter column progress set not null;

alter table public.egg_adventure_saves
  add column if not exists revision bigint;
alter table public.egg_adventure_saves
  alter column revision set default 0;
update public.egg_adventure_saves
  set revision=0
  where revision is null;
alter table public.egg_adventure_saves
  alter column revision set not null;

alter table public.egg_adventure_saves
  add column if not exists updated_at timestamptz;
alter table public.egg_adventure_saves
  alter column updated_at set default now();
update public.egg_adventure_saves
  set updated_at=now()
  where updated_at is null;
alter table public.egg_adventure_saves
  alter column updated_at set not null;

commit;
