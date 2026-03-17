-- Feldpost: DSGVO/Security verification helpers
-- Scope: post-migration validation after storage orphan cleanup rollout

-- 1) Run cleanup via Storage API (outside SQL):
--    node scripts/cleanup-storage-orphans.mjs 1000
--    This script creates one row in public.storage_cleanup_runs.

-- 2) Show latest cleanup runs
select id, started_at, finished_at, deleted_count, status, error_message
from public.storage_cleanup_runs
order by id desc
limit 10;

-- 3) Current orphan count (should trend to 0)
select count(*) as orphan_count
from storage.objects o
where o.bucket_id = 'images'
  and not exists (
    select 1
    from public.images i
    where i.storage_path = o.name
       or i.thumbnail_path = o.name
  );

-- 4) Optional: inspect scheduled cron job (if pg_cron is available)
select jobid, jobname, schedule, active, command
from cron.job
where jobname = 'cleanup-storage-orphans-hourly';

-- 5) Optional: preview candidate orphan paths (API cleanup source)
select *
from public.list_orphaned_storage_paths(50);
