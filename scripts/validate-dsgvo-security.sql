-- Feldpost: DSGVO/Security verification helpers
-- Scope: post-migration validation after storage orphan cleanup rollout

-- 1) Trigger one cleanup run (P0-4 evidence)
select public.run_storage_cleanup_job(1000) as run_id;

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
