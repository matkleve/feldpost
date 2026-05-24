/**
 * Types for org-scoped `locations` linked to media via `media_item_location_links`.
 *
 * @see docs/specs/service/media-locations/media-locations-service.md
 * @see docs/specs/ui/media-detail/media-detail-location-section.md
 */

/** Row returned by `list_locations_for_media` / legacy shim RPCs. */
export interface MediaItemLocationRow {
  /** Shared `locations.id`. */
  id: string;
  /** Junction row id (`media_item_location_links.id`). */
  link_id?: string;
  media_item_id: string;
  organization_id: string;
  street: string | null;
  house_number: string | null;
  staircase: string | null;
  door: string | null;
  floor: string | null;
  postcode: string | null;
  extra_information: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  address_label: string | null;
  /** @deprecated Primary model removed; always false from RPC shim. */
  is_primary?: boolean;
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
  floor?: string | null;
  postcode?: string | null;
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
