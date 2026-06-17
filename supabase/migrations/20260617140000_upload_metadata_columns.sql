-- Persist low-confidence filename parse fragments (address_notes) and
-- EXIF-vs-title coordinate mismatch distance on media_items.
-- @see docs/specs/service/media-upload-service/upload-manager-pipeline.md § Action 11c
-- @see docs/specs/service/media-upload-service/upload-manager-pipeline.md § Action 6

alter table media_items
  add column if not exists address_notes text[] default '{}',
  add column if not exists location_mismatch_meters numeric;

comment on column media_items.address_notes is
  'Low-confidence or residual address fragments from filename/folder title parsing. '
  'Preserved for display in media detail; do not use for geocoding or routing.';

comment on column media_items.location_mismatch_meters is
  'Distance in metres between EXIF GPS and title-derived coordinates when both are present. '
  'Null means no mismatch was detected (or only one source was available).';

-- RLS note: both new columns are covered by the existing media_items row-level policies.
-- No column-level grants needed; PostgreSQL RLS is row-scoped by design.
