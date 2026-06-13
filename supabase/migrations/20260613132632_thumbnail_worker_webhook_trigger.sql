-- Trigger function: fires thumbnail worker for new non-image/video media items
-- @see docs/playbooks/remote-thumbnail-worker.md
CREATE OR REPLACE FUNCTION public.notify_thumbnail_worker()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only trigger for worker-eligible rows (no thumb, not image or video)
  IF NEW.thumbnail_path IS NULL
     AND NEW.storage_path IS NOT NULL
     AND NEW.mime_type IS NOT NULL
     AND NEW.mime_type NOT LIKE 'image/%'
     AND NEW.mime_type NOT LIKE 'video/%'
  THEN
    -- supabase_functions schema is only available on Supabase Cloud (pg_net);
    -- skip gracefully in local dev where the schema does not exist.
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'supabase_functions') THEN
      PERFORM supabase_functions.http_request(
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
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Drop if already exists to allow idempotent re-apply
DROP TRIGGER IF EXISTS on_media_item_insert_thumbnail_worker ON public.media_items;

-- Attach trigger: fires after every INSERT on media_items
CREATE TRIGGER on_media_item_insert_thumbnail_worker
  AFTER INSERT ON public.media_items
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_thumbnail_worker();
