-- =============================================================================
-- P2: drop legacy coordinate_corrections.image_id
-- =============================================================================
-- Preconditions:
-- - coordinate_corrections.media_item_id is populated and NOT NULL.
-- - RLS policies are already bound to media_item_id.
--
-- This migration intentionally removes only the legacy image_id column.
-- =============================================================================

DROP INDEX IF EXISTS public.idx_coordinate_corrections_image_id;

ALTER TABLE public.coordinate_corrections
  DROP COLUMN IF EXISTS image_id;
