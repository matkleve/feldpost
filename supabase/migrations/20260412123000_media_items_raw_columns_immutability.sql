-- Add raw ingest columns for immutable source evidence on media_items.
-- relative_path: original client-side relative path from folder scan context.
-- exif_raw: full EXIF payload captured during ingest.

ALTER TABLE public.media_items
  ADD COLUMN IF NOT EXISTS relative_path text,
  ADD COLUMN IF NOT EXISTS exif_raw jsonb;

CREATE OR REPLACE FUNCTION public.prevent_media_items_raw_source_overwrite()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.relative_path IS DISTINCT FROM OLD.relative_path THEN
    RAISE EXCEPTION 'media_items.relative_path is immutable after insert';
  END IF;

  IF NEW.exif_raw IS DISTINCT FROM OLD.exif_raw THEN
    RAISE EXCEPTION 'media_items.exif_raw is immutable after insert';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_items_raw_source_immutable ON public.media_items;
CREATE TRIGGER trg_media_items_raw_source_immutable
  BEFORE UPDATE ON public.media_items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_media_items_raw_source_overwrite();
