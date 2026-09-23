// `relative_path` and `exif_raw` are the immutable raw ingest evidence written at upload
// (20260412123000_media_items_raw_columns_immutability.sql). They are selected here — a single row —
// and deliberately NOT in list selects: `exif_raw` is a jsonb blob, and pulling one per row across a
// large workspace is the per-row cost Phase 3 just removed.
// @see docs/specs/system/deferred-location-resolution.md

const MEDIA_ITEM_DETAIL_CORE =
  'id,source_image_id,organization_id,created_by,storage_path,thumbnail_path,original_filename,relative_path,exif_raw,exif_latitude,exif_longitude,captured_at,created_at,mime_type,gps_assignment_allowed,location_status';

/** PostgREST select for media detail when all optional columns exist. */
export const MEDIA_ITEM_DETAIL_SELECT_WITH_META = `${MEDIA_ITEM_DETAIL_CORE},address_field_meta,address_notes,location_mismatch_meters`;

/** Fallback when migration 20260617140000 (address_notes) is not applied yet. */
export const MEDIA_ITEM_DETAIL_SELECT_WITH_META_NO_UPLOAD_METADATA = `${MEDIA_ITEM_DETAIL_CORE},address_field_meta`;

/** Fallback before migration 20260520140000 (address_field_meta). */
export const MEDIA_ITEM_DETAIL_SELECT_WITH_UPLOAD_METADATA_NO_META = `${MEDIA_ITEM_DETAIL_CORE},address_notes,location_mismatch_meters`;

/** Legacy alias — upload metadata columns without address_field_meta. */
export const MEDIA_ITEM_DETAIL_SELECT_BASE = MEDIA_ITEM_DETAIL_SELECT_WITH_UPLOAD_METADATA_NO_META;

/** Minimal detail select when optional upload-metadata columns are absent. */
export const MEDIA_ITEM_DETAIL_SELECT_CORE = MEDIA_ITEM_DETAIL_CORE;

/** Ordered fallback chain for hosted DBs at different migration levels. */
export const MEDIA_ITEM_DETAIL_SELECT_FALLBACK_CHAIN = [
  MEDIA_ITEM_DETAIL_SELECT_WITH_META,
  MEDIA_ITEM_DETAIL_SELECT_WITH_META_NO_UPLOAD_METADATA,
  MEDIA_ITEM_DETAIL_SELECT_WITH_UPLOAD_METADATA_NO_META,
  MEDIA_ITEM_DETAIL_SELECT_CORE,
] as const;

/** Lightweight select for in-place location refresh (status only on media_items). */
export const MEDIA_ITEM_LOCATION_SELECT_WITH_META =
  'id,source_image_id,location_status,gps_assignment_allowed,address_field_meta';

export const MEDIA_ITEM_LOCATION_SELECT_BASE =
  'id,source_image_id,location_status,gps_assignment_allowed';

export function isMissingAddressFieldMetaColumn(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return normalized.includes('address_field_meta') && normalized.includes('does not exist');
}

export function isMissingUploadMetadataColumn(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return (
    normalized.includes('does not exist') &&
    (normalized.includes('address_notes') || normalized.includes('location_mismatch_meters'))
  );
}

export function isMissingMediaDetailColumn(message: string | undefined): boolean {
  return isMissingAddressFieldMetaColumn(message) || isMissingUploadMetadataColumn(message);
}
