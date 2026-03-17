-- =============================================================================
-- Storage orphan cleanup job (audited)
-- =============================================================================
-- Purpose:
--   1) Remove orphaned objects from storage.objects in bucket "images"
--      when no matching images.storage_path or images.thumbnail_path exists.
--   2) Keep an auditable run history for GDPR/accountability checks.
--   3) Optionally schedule automatic execution via pg_cron when available.

create table if not exists public.storage_cleanup_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  deleted_count int not null default 0,
  status text not null default 'started' check (status in ('started', 'success', 'error')),
  error_message text
);

create or replace function public.cleanup_orphaned_storage_objects(
  p_limit int default 500
)
returns int
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_deleted int := 0;
begin
  with to_delete as (
    select o.id
    from storage.objects o
    where o.bucket_id = 'images'
      and not exists (
        select 1
        from public.images i
        where i.storage_path = o.name
           or i.thumbnail_path = o.name
      )
    order by o.created_at asc
    limit greatest(1, coalesce(p_limit, 500))
  )
  delete from storage.objects o
  using to_delete d
  where o.id = d.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
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
  v_deleted int := 0;
begin
  insert into public.storage_cleanup_runs default values
  returning id into v_run_id;

  begin
    v_deleted := public.cleanup_orphaned_storage_objects(p_limit);

    update public.storage_cleanup_runs
    set finished_at = now(),
        deleted_count = v_deleted,
        status = 'success',
        error_message = null
    where id = v_run_id;
  exception when others then
    update public.storage_cleanup_runs
    set finished_at = now(),
        deleted_count = 0,
        status = 'error',
        error_message = sqlerrm
    where id = v_run_id;
    raise;
  end;

  return v_run_id;
end;
$$;

revoke all on table public.storage_cleanup_runs from anon, authenticated;
grant select on table public.storage_cleanup_runs to service_role;

revoke all on function public.cleanup_orphaned_storage_objects(int) from public;
revoke all on function public.run_storage_cleanup_job(int) from public;
grant execute on function public.cleanup_orphaned_storage_objects(int) to service_role;
grant execute on function public.run_storage_cleanup_job(int) to service_role;

-- Optional schedule (hourly at minute 17) when pg_cron is available.
do $$
begin
  if to_regprocedure('cron.schedule(text,text,text)') is not null then
    if not exists (
      select 1
      from cron.job
      where jobname = 'cleanup-storage-orphans-hourly'
    ) then
      perform cron.schedule(
        'cleanup-storage-orphans-hourly',
        '17 * * * *',
        $job$select public.run_storage_cleanup_job(1000);$job$
      );
    end if;
  end if;
exception
  when undefined_table then
    null;
  when insufficient_privilege then
    null;
end;
$$;
