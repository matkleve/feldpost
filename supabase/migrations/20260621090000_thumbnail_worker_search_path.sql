-- =============================================================================
-- Security: pin search_path on notify_thumbnail_worker (SECURITY DEFINER)
-- =============================================================================
-- notify_thumbnail_worker() runs as the definer on every media_items INSERT and
-- reaches into supabase_functions.http_request. It was the only SECURITY DEFINER
-- function in the schema without a pinned search_path, leaving it open to
-- search-path injection via a shadowing schema. Pin it to match every other
-- definer function. Body is otherwise reproduced verbatim from
-- 20260613132632_thumbnail_worker_webhook_trigger.sql (all object references are
-- already schema-qualified, so the pin is behavior-preserving).
-- =============================================================================

create or replace function public.notify_thumbnail_worker()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
        'https://178-105-242-74.sslip.io/generate',
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
