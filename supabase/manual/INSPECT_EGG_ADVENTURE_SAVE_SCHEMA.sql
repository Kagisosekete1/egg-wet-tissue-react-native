-- Read-only schema inspection. Returns column names and constraints only;
-- it does not expose player records or change any data.
select ordinal_position, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public'
  and table_name='egg_adventure_saves'
order by ordinal_position;

select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid='public.egg_adventure_saves'::regclass
order by conname;
