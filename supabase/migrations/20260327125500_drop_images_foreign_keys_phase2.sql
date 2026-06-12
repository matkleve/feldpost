-- =============================================================================
-- Decouple schema from public.images FKs (phase 2)
-- =============================================================================
-- Goal:
--   Remove remaining foreign key constraints that point to public.images.
--
-- Notes:
--   - Non-destructive to columns; constraints only.
--   - New media_item_id FKs were introduced in phase 1 migration.
-- =============================================================================

ALTER TABLE public.coordinate_corrections
  DROP CONSTRAINT IF EXISTS coordinate_corrections_image_id_fkey;

ALTER TABLE public.dedup_hashes
  DROP CONSTRAINT IF EXISTS dedup_hashes_image_id_fkey;

ALTER TABLE public.image_metadata
  DROP CONSTRAINT IF EXISTS image_metadata_image_id_fkey;

ALTER TABLE public.image_projects
  DROP CONSTRAINT IF EXISTS image_projects_image_id_fkey;

ALTER TABLE public.saved_group_images
  DROP CONSTRAINT IF EXISTS saved_group_images_image_id_fkey;

ALTER TABLE public.share_set_items
  DROP CONSTRAINT IF EXISTS share_set_items_image_id_fkey;

ALTER TABLE public.media_items
  DROP CONSTRAINT IF EXISTS media_items_source_image_id_fkey;
