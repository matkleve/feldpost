-- Report all remaining dependencies on public.images
-- Usage:
--   npx supabase db query --linked -f scripts/report-images-dependencies.sql -o table

-- Foreign keys to public.images
select
  con.conname as constraint_name,
  conrelid::regclass as child_table,
  confrelid::regclass as parent_table,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
where con.contype = 'f'
  and confrelid = 'public.images'::regclass
order by conrelid::regclass::text, con.conname;

-- Functions referencing public.images
select
  n.nspname as schema_name,
  p.proname as function_name
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.prokind = 'f'
  and pg_get_functiondef(p.oid) ilike '%public.images%'
order by 1, 2;

-- Views referencing public.images
select schemaname, viewname
from pg_views
where definition ilike '%public.images%'
order by 1, 2;
