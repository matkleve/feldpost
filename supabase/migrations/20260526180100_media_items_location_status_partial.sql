-- Add partial location_status for Nachbearbeitung uploads (L11).
-- @see docs/specs/service/media-upload-service/upload-address-resolution-pipeline.md

ALTER TABLE public.media_items
  DROP CONSTRAINT IF EXISTS chk_media_items_location_status;

ALTER TABLE public.media_items
  ADD CONSTRAINT chk_media_items_location_status
  CHECK (location_status IN ('pending', 'resolved', 'unresolvable', 'partial'));
