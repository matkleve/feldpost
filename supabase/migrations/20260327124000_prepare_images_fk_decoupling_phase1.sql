-- =============================================================================
-- Prepare decoupling from public.images (phase 1, non-destructive)
-- =============================================================================
-- Goal:
--   Add nullable media_item_id references to image-dependent tables and backfill
--   them via media_items.source_image_id, while keeping legacy image_id columns.
--
-- Safety:
--   - No legacy FK/table dropped in this migration.
--   - Existing image_id relations remain intact until cutover validation is green.
-- =============================================================================

-- 1) Add media_item_id columns (nullable for phased migration)
ALTER TABLE public.coordinate_corrections ADD COLUMN IF NOT EXISTS media_item_id uuid;
ALTER TABLE public.dedup_hashes ADD COLUMN IF NOT EXISTS media_item_id uuid;
ALTER TABLE public.image_metadata ADD COLUMN IF NOT EXISTS media_item_id uuid;
ALTER TABLE public.image_projects ADD COLUMN IF NOT EXISTS media_item_id uuid;
ALTER TABLE public.saved_group_images ADD COLUMN IF NOT EXISTS media_item_id uuid;
ALTER TABLE public.share_set_items ADD COLUMN IF NOT EXISTS media_item_id uuid;

-- 2) Backfill media_item_id from source_image_id mapping
UPDATE public.coordinate_corrections cc
SET media_item_id = m.id
FROM public.media_items m
WHERE cc.media_item_id IS NULL
  AND m.source_image_id = cc.image_id;

UPDATE public.dedup_hashes dh
SET media_item_id = m.id
FROM public.media_items m
WHERE dh.media_item_id IS NULL
  AND m.source_image_id = dh.image_id;

UPDATE public.image_metadata im
SET media_item_id = m.id
FROM public.media_items m
WHERE im.media_item_id IS NULL
  AND m.source_image_id = im.image_id;

UPDATE public.image_projects ip
SET media_item_id = m.id
FROM public.media_items m
WHERE ip.media_item_id IS NULL
  AND m.source_image_id = ip.image_id;

UPDATE public.saved_group_images sgi
SET media_item_id = m.id
FROM public.media_items m
WHERE sgi.media_item_id IS NULL
  AND m.source_image_id = sgi.image_id;

UPDATE public.share_set_items ssi
SET media_item_id = m.id
FROM public.media_items m
WHERE ssi.media_item_id IS NULL
  AND m.source_image_id = ssi.image_id;

-- 3) Add new FKs to media_items
ALTER TABLE public.coordinate_corrections
  DROP CONSTRAINT IF EXISTS coordinate_corrections_media_item_id_fkey,
  ADD CONSTRAINT coordinate_corrections_media_item_id_fkey
    FOREIGN KEY (media_item_id) REFERENCES public.media_items(id) ON DELETE CASCADE;

ALTER TABLE public.dedup_hashes
  DROP CONSTRAINT IF EXISTS dedup_hashes_media_item_id_fkey,
  ADD CONSTRAINT dedup_hashes_media_item_id_fkey
    FOREIGN KEY (media_item_id) REFERENCES public.media_items(id) ON DELETE CASCADE;

ALTER TABLE public.image_metadata
  DROP CONSTRAINT IF EXISTS image_metadata_media_item_id_fkey,
  ADD CONSTRAINT image_metadata_media_item_id_fkey
    FOREIGN KEY (media_item_id) REFERENCES public.media_items(id) ON DELETE CASCADE;

ALTER TABLE public.image_projects
  DROP CONSTRAINT IF EXISTS image_projects_media_item_id_fkey,
  ADD CONSTRAINT image_projects_media_item_id_fkey
    FOREIGN KEY (media_item_id) REFERENCES public.media_items(id) ON DELETE CASCADE;

ALTER TABLE public.saved_group_images
  DROP CONSTRAINT IF EXISTS saved_group_images_media_item_id_fkey,
  ADD CONSTRAINT saved_group_images_media_item_id_fkey
    FOREIGN KEY (media_item_id) REFERENCES public.media_items(id) ON DELETE CASCADE;

ALTER TABLE public.share_set_items
  DROP CONSTRAINT IF EXISTS share_set_items_media_item_id_fkey,
  ADD CONSTRAINT share_set_items_media_item_id_fkey
    FOREIGN KEY (media_item_id) REFERENCES public.media_items(id) ON DELETE CASCADE;

-- 4) Add lookup indexes for phased app migration
CREATE INDEX IF NOT EXISTS idx_coordinate_corrections_media_item_id
  ON public.coordinate_corrections(media_item_id);

CREATE INDEX IF NOT EXISTS idx_dedup_hashes_media_item_id
  ON public.dedup_hashes(media_item_id);

CREATE INDEX IF NOT EXISTS idx_image_metadata_media_item_id
  ON public.image_metadata(media_item_id);

CREATE INDEX IF NOT EXISTS idx_image_projects_media_item_id
  ON public.image_projects(media_item_id);

CREATE INDEX IF NOT EXISTS idx_saved_group_images_media_item_id
  ON public.saved_group_images(media_item_id);

CREATE INDEX IF NOT EXISTS idx_share_set_items_media_item_id
  ON public.share_set_items(media_item_id);
