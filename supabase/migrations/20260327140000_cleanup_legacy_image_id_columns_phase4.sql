-- =============================================================================
-- Final cleanup: remove legacy image_id columns (phase 4)
-- =============================================================================
-- Goal:
--   Remove obsolete image_id columns from dependent tables now that all queries
--   have been migrated to media_item_id and RLS policies updated.
--
-- Safety:
--   - Only performed after all FKs, views, functions, and policies have been migrated.
--   - Columns are non-destructive to remove (data already duplicated in media_item_id).
-- =============================================================================

ALTER TABLE public.coordinate_corrections
  DROP COLUMN IF EXISTS image_id;

ALTER TABLE public.dedup_hashes
  DROP COLUMN IF EXISTS image_id;

ALTER TABLE public.image_metadata
  DROP COLUMN IF EXISTS image_id;

ALTER TABLE public.image_projects
  DROP COLUMN IF EXISTS image_id;

ALTER TABLE public.saved_group_images
  DROP COLUMN IF EXISTS image_id;

ALTER TABLE public.share_set_items
  DROP COLUMN IF EXISTS image_id;

ALTER TABLE public.media_items
  DROP COLUMN IF EXISTS source_image_id;
