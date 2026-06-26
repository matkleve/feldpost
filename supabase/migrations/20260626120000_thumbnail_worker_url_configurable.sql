-- =============================================================================
-- Make the thumbnail worker endpoint configurable
-- =============================================================================
-- The worker URL was hard-coded in notify_thumbnail_worker(), so rotating the
-- worker host required shipping a new migration. Read it from the
-- `app.thumbnail_worker_url` GUC instead, falling back to the current host when
-- the setting is absent or empty.
--
-- This is behaviour-preserving: with no GUC configured the function posts to the
-- exact same URL as before. To point the trigger at a different worker without a
-- code change, set the GUC at the database level, e.g.:
--
--     alter database postgres set app.thumbnail_worker_url =
--       'https://new-worker-host.example/generate';
--
-- (the new value takes effect on the next connection). Body is otherwise
-- reproduced verbatim from 20260621090000_thumbnail_worker_search_path.sql,
-- including the pinned search_path and the worker-eligibility guard.
-- =============================================================================

create or replace function public.notify_thumbnail_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  worker_url text := coalesce(
    nullif(current_setting('app.thumbnail_worker_url', true), ''),
    'https://178-105-242-74.sslip.io/generate'
  );
begin
  -- Only trigger for worker-eligible rows (no thumb, not image or video)
  if NEW.thumbnail_path is null
     and NEW.storage_path is not null
     and NEW.mime_type is not null
     and NEW.mime_type not like 'image/%'
     and NEW.mime_type not like 'video/%'
  then
    -- supabase_functions schema is only available on Supabase Cloud (pg_net);
    -- skip gracefully in local dev where the schema does not exist.
    if exists (select 1 from pg_namespace where nspname = 'supabase_functions') then
      perform supabase_functions.http_request(
        worker_url,
        'POST',
        '{"Content-Type": "application/json"}'::jsonb,
        json_build_object(
          'mediaId',        NEW.id,
          'storagePath',    NEW.storage_path,
          'mimeType',       NEW.mime_type,
          'organizationId', NEW.organization_id,
          'userId',         NEW.created_by
        )::text,
        5000
      );
    end if;
  end if;
  return NEW;
end;
$$;
