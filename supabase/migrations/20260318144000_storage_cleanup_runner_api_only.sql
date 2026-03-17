-- =============================================================================
-- Storage cleanup runner: API-only mode guard
-- =============================================================================
-- Direct DELETE on storage.objects is blocked by Supabase protect_delete trigger.
-- This runner keeps audit continuity and points operators to the API cleanup script.

create or replace function public.cleanup_orphaned_storage_objects(
  p_limit int default 500
)
returns int
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Direct deletion from storage.objects is disabled. Use scripts/cleanup-storage-orphans.mjs instead.';
end;
$$;

create or replace function public.run_storage_cleanup_job(
  p_limit int default 500
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id bigint;
begin
  insert into public.storage_cleanup_runs (status, error_message)
  values (
    'error',
    'API-only mode: use node scripts/cleanup-storage-orphans.mjs ' || greatest(1, coalesce(p_limit, 500))
  )
  returning id into v_run_id;

  update public.storage_cleanup_runs
  set finished_at = now(),
      deleted_count = 0
  where id = v_run_id;

  return v_run_id;
end;
$$;
