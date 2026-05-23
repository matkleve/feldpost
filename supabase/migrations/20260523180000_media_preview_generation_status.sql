-- v2 async Office/document preview lifecycle (see docs/architecture/media-preview-converter.md)

ALTER TABLE public.media_items
  ADD COLUMN IF NOT EXISTS preview_generation_status text NOT NULL DEFAULT 'idle';

ALTER TABLE public.media_items
  DROP CONSTRAINT IF EXISTS chk_media_items_preview_generation_status;

ALTER TABLE public.media_items
  ADD CONSTRAINT chk_media_items_preview_generation_status
  CHECK (preview_generation_status IN ('idle', 'pending', 'ready', 'failed'));

-- Rows that already have a persisted master raster are ready.
UPDATE public.media_items
SET preview_generation_status = 'ready'
WHERE thumbnail_path IS NOT NULL
  AND preview_generation_status = 'idle';

COMMENT ON COLUMN public.media_items.preview_generation_status IS
  'Async preview worker lifecycle: idle | pending | ready | failed';
