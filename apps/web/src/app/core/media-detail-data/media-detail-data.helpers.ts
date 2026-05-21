/** PostgREST select for media detail when address_field_meta column exists. */
export const MEDIA_ITEM_DETAIL_SELECT_WITH_META =
  'id,source_image_id,organization_id,created_by,storage_path,thumbnail_path,latitude,longitude,exif_latitude,exif_longitude,captured_at,created_at,mime_type,gps_assignment_allowed,location_status,address_label,street,city,district,country,address_field_meta';

/** Fallback select before migration 20260520140000 is applied on the active database. */
export const MEDIA_ITEM_DETAIL_SELECT_BASE =
  'id,source_image_id,organization_id,created_by,storage_path,thumbnail_path,latitude,longitude,exif_latitude,exif_longitude,captured_at,created_at,mime_type,gps_assignment_allowed,location_status,address_label,street,city,district,country';

/** Lightweight select for in-place location refresh (no full detail reload). */
export const MEDIA_ITEM_LOCATION_SELECT_WITH_META =
  'id,source_image_id,latitude,longitude,location_status,gps_assignment_allowed,address_label,street,city,district,country,address_field_meta';

export const MEDIA_ITEM_LOCATION_SELECT_BASE =
  'id,source_image_id,latitude,longitude,location_status,gps_assignment_allowed,address_label,street,city,district,country';

export function isMissingAddressFieldMetaColumn(message: string | undefined): boolean {
  if (!message) {
    return false;
  }
  const normalized = message.toLowerCase();
  return normalized.includes('address_field_meta') && normalized.includes('does not exist');
}
