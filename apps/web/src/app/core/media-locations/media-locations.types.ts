/**
 * Types for multi-location rows (`media_item_locations`).
 *
 * One media item has 0..n rows; exactly one may be `is_primary` (DB-enforced).
 * UI: each row is rendered by `app-media-location-row` in the workspace detail Location section.
 *
 * @see docs/specs/service/media-locations/media-locations-service.md
 * @see docs/specs/ui/media-detail/media-detail-location-section.md
 */

/** Row returned by `list_media_item_locations` / mutation RPCs. */
export interface MediaItemLocationRow {
  id: string;
  media_item_id: string;
  organization_id: string;
  street: string | null;
  house_number: string | null;
  staircase: string | null;
  door: string | null;
  extra_information: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  address_label: string | null;
  is_primary: boolean;
  sort_order: number;
  staircase_sort_key: string;
  door_sort_key: string;
  created_at: string;
  updated_at: string;
}

export interface MediaLocationListResult {
  ok: true;
  rows: MediaItemLocationRow[];
}

export interface MediaLocationMutationResult {
  ok: true;
  row: MediaItemLocationRow;
}

export interface MediaLocationDeleteResult {
  ok: true;
}

export interface MediaLocationErrorResult {
  ok: false;
  error: string;
  code?: 'not_found' | 'forbidden' | 'validation_error' | 'conflict' | 'unknown';
}

export type MediaLocationResult =
  | MediaLocationListResult
  | MediaLocationMutationResult
  | MediaLocationDeleteResult
  | MediaLocationErrorResult;

export interface MediaLocationAddressPatch {
  street?: string | null;
  house_number?: string | null;
  staircase?: string | null;
  door?: string | null;
  extra_information?: string | null;
  city?: string | null;
  district?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address_label?: string | null;
}

export interface MediaLocationAddInput extends MediaLocationAddressPatch {
  mediaItemId: string;
}

export interface MediaLocationUpdateInput extends MediaLocationAddressPatch {
  locationId: string;
}
