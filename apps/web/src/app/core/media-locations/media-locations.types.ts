/**
 * Types for org-scoped `locations` linked to media via `media_item_location_links`.
 *
 * @see docs/specs/service/media-locations/media-locations-service.md
 * @see docs/specs/ui/media-detail/media-detail-location-section.md
 */

/** Junction metadata per media item (sort order is per link, not per location). */
export interface MediaLocationLinkRef {
  locationId: string;
  link_id?: string;
  sort_order: number;
}

/** Canonical shared `locations` fields — one entry per `locations.id` in list cache. */
export type MediaLocationCoreRow = Omit<
  MediaItemLocationRow,
  'media_item_id' | 'sort_order' | 'link_id'
>;

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
  sort_order: number;
  staircase_sort_key: string;
  door_sort_key: string;
  created_at: string;
  updated_at: string;
}

/** Row from `search_locations` (org picker); `media_item_id` may be null. */
export interface OrgLocationSearchRow extends Omit<MediaItemLocationRow, 'media_item_id'> {
  media_item_id: string | null;
  is_linked_to_media?: boolean;
}

export interface MediaLocationListResult {
  ok: true;
  rows: MediaItemLocationRow[];
}

export interface MediaLocationMutationResult {
  ok: true;
  row: MediaItemLocationRow;
}

export interface MediaLocationDeleteOkResult {
  ok: true;
}

export interface MediaLocationErrorResult {
  ok: false;
  error: string;
  code?: 'not_found' | 'forbidden' | 'validation_error' | 'conflict' | 'unknown';
}

export type MediaLocationDeleteResult = MediaLocationDeleteOkResult | MediaLocationErrorResult;

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

/** Re-link one media item from an existing location to a deduped/new location row. */
export interface MediaLocationReplaceLinkInput {
  mediaItemId: string;
  previousLocationId: string;
  patch: MediaLocationAddressPatch;
}
