-- =============================================================================
-- Storage cleanup API mode
-- =============================================================================
-- Supabase protects storage.objects from direct DELETE operations.
-- This migration adds a safe discovery function for orphaned objects so cleanup
-- can be executed through the Storage API (service role) and still be audited.

create or replace function public.list_orphaned_storage_paths(
  p_limit int default 1000
)
returns table (
  object_name text
)
language sql
security definer
set search_path = public, storage
as $$
  select o.name as object_name
  from storage.objects o
  where o.bucket_id = 'images'
    and not exists (
      select 1
      from public.images i
      where i.storage_path = o.name
         or i.thumbnail_path = o.name
    )
  order by o.created_at asc
  limit greatest(1, coalesce(p_limit, 1000));
$$;

revoke all on function public.list_orphaned_storage_paths(int) from public;
grant execute on function public.list_orphaned_storage_paths(int) to service_role;
