-- Feldpost: DSGVO/Security verification helpers
-- Scope: post-migration validation after storage orphan cleanup / media cutover
-- @see docs/study/009-defensive-security-review.md F-06

-- 1) Run cleanup via Storage API (outside SQL):
--    node scripts/cleanup-storage-orphans.mjs 1000
--    This script creates one row in public.storage_cleanup_runs.

-- 2) Show latest cleanup runs
select id, started_at, finished_at, deleted_count, status, error_message
from public.storage_cleanup_runs
order by id desc
limit 10;

-- 3) Current orphan count in the live media bucket (should trend to 0)
select count(*) as media_orphan_count
from storage.objects o
where o.bucket_id = 'media'
  and not exists (
    select 1
    from public.media_items m
    where m.storage_path = o.name
       or m.thumbnail_path = o.name
  );

-- 4) Legacy images-bucket orphans (post-cutover cleanup target; may be non-zero)
select count(*) as images_bucket_orphan_count
from storage.objects o
where o.bucket_id = 'images'
  and not exists (
    select 1
    from public.media_items m
    where m.storage_path = o.name
       or m.thumbnail_path = o.name
  );

-- 5) Optional: inspect scheduled cron job (if pg_cron is available)
select jobid, jobname, schedule, active, command
from cron.job
where jobname = 'cleanup-storage-orphans-hourly';

-- 6) Optional: preview candidate orphan paths (API cleanup source; service_role)
select *
from public.list_orphaned_storage_paths(50);
