-- =============================================================================
-- Backfill GPS assignment flag for rows that already have coordinates
-- =============================================================================
-- Why:
-- - Legacy normalization left some rows with gps_assignment_allowed=false while
--   latitude/longitude are already present.
-- - Any later coordinate-touching update can fail in gps assignment policy.
--
-- Outcome:
-- - Rows with complete coordinates are marked gps_assignment_allowed=true.
-- =============================================================================

ALTER TABLE public.media_items
  DROP CONSTRAINT IF EXISTS chk_media_items_document_gps_lock;

UPDATE public.media_items
   SET gps_assignment_allowed = true,
       updated_at = now()
 WHERE gps_assignment_allowed = false
   AND latitude IS NOT NULL
   AND longitude IS NOT NULL;
