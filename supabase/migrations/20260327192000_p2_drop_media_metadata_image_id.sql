-- =============================================================================
-- P2: drop legacy media_metadata.image_id
-- =============================================================================
-- Preconditions:
-- - media_metadata.media_item_id is populated and NOT NULL.
-- - RLS policies are already bound to media_item_id.
--
-- This migration intentionally removes only the legacy image_id column.
-- =============================================================================

DROP INDEX IF EXISTS public.idx_image_metadata_image_id;

ALTER TABLE public.media_metadata
  DROP COLUMN IF EXISTS image_id;
