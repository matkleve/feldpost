/**
 * Pure helpers for location rows (no I/O).
 *
 * Used by: `media-location-row` (read line), `media-location-add-search` (picker),
 * `media-detail-location-section` (list filter), `media-locations.service` (RPC errors).
 */
import type { GeocoderSearchResult } from '../geocoding/geocoding.service';
import type { MediaRecord } from '../media-query/media-query.types';
import type { MediaItemLocationRow, OrgLocationSearchRow } from './media-locations.types';

/**
 * Flat address/GPS fields patched onto the detail `media()` record (`MediaRecord` DTO).
 *
 * Intentionally excludes `house_number`, `staircase`, `door`, `postcode` — those exist only on
 * `MediaItemLocationRow`, not on the gallery/detail media projection. Do **not** pass this type to
 * `formatLocationDisplayLine`; header/title contexts use `street` + `city` (+ district/country)
 * via `resolveFullAddress` in `media-detail-view.utils.ts`.
 */
export type LocationDisplayFields = Pick<
  MediaRecord,
  | 'address_label'
  | 'street'
  | 'city'
  | 'district'
  | 'country'
  | 'latitude'
  | 'longitude'
  | 'location_unresolved'
>;

export interface LocationDisplaySnapshot {
  displayLocationId: string | null;
  fields: LocationDisplayFields;
}

/**
 * Input for saved-row / picker display formatters (`/Stiege`, `/Top`, postcode+city tail).
 * Satisfied by `MediaItemLocationRow` — not by `LocationDisplayFields`.
 */
export type LocationDisplayLineInput = Pick<
  MediaItemLocationRow,
  | 'street'
  | 'house_number'
  | 'staircase'
  | 'door'
  | 'postcode'
  | 'city'
  | 'district'
  | 'country'
  | 'address_label'
>;

/**
 * Geocoder `street` often already includes `house_number`; split before DB persist or display join.
 * @see geocoding.service.ts combineStreet
 */
export function splitStreetAndHouseNumber(
  street: string | null | undefined,
  houseNumber: string | null | undefined,
): { street: string | null; house_number: string | null } {
  const streetTrim = street?.trim() || null;
  const houseTrim = houseNumber?.trim() || null;
  if (!streetTrim || !houseTrim) {
    return { street: streetTrim, house_number: houseTrim };
  }
  const suffix = ` ${houseTrim}`;
  if (streetTrim.endsWith(suffix)) {
    const road = streetTrim.slice(0, -suffix.length).trim();
    return { street: road || null, house_number: houseTrim };
  }
  return { street: streetTrim, house_number: houseTrim };
}

/** Building/access segment without postcode/city tail (shared by row + picker primary). */
function formatLocationStreetAccessSegment(row: LocationDisplayLineInput): string {
  const normalized = splitStreetAndHouseNumber(row.street, row.house_number);
  const streetPart = [normalized.street, normalized.house_number].filter(Boolean).join(' ').trim();
  let line = streetPart || row.address_label?.trim() || '';
  if (!line) {
    return '';
  }
  if (row.staircase?.trim()) {
    line += `/Stiege ${row.staircase.trim()}`;
  }
  if (row.door?.trim()) {
    line += `/Top ${row.door.trim()}`;
  }
  return line;
}

/**
 * Read-mode single line on a linked location row (`app-media-location-row`, map targets).
 * Requires `LocationDisplayLineInput` / full `MediaItemLocationRow` — not `LocationDisplayFields`.
 *
 * @see docs/specs/ui/media-detail/media-detail-location-section.md
 */
export function formatLocationDisplayLine(row: LocationDisplayLineInput, _doorLabel: string): string {
  const access = formatLocationStreetAccessSegment(row);
  if (!access) {
    return row.address_label?.trim() || '—';
  }
  const postcode = row.postcode?.trim();
  const city = row.city?.trim();
  if (postcode && city) {
    return `${access}, ${postcode} ${city}`;
  }
  const locality = formatLocationDisplayLocalityLine(row);
  if (locality) {
    return `${access}, ${locality.replace(/ · /g, ', ')}`;
  }
  return access;
}

/** Picker primary line — street/access only (locality on secondary). */
export function formatLocationDisplayPrimaryLine(row: LocationDisplayLineInput, _doorLabel: string): string {
  const access = formatLocationStreetAccessSegment(row);
  return access || row.address_label?.trim() || '—';
}

/** Picker secondary: postcode city · district · country. */
export function formatLocationDisplayLocalityLine(
  row: Pick<MediaItemLocationRow, 'postcode' | 'city' | 'district' | 'country'>,
): string {
  const parts: string[] = [];
  const postcode = row.postcode?.trim();
  const city = row.city?.trim();
  if (postcode && city) {
    parts.push(`${postcode} ${city}`);
  } else if (postcode) {
    parts.push(postcode);
  } else if (city) {
    parts.push(city);
  }
  if (row.district?.trim()) {
    parts.push(row.district.trim());
  }
  if (row.country?.trim()) {
    parts.push(row.country.trim());
  }
  return parts.join(' · ');
}

/** Two-line org picker display (format D). */
export function formatLocationPickerLines(
  row: LocationDisplayLineInput & Pick<MediaItemLocationRow, 'district' | 'country'>,
  doorLabel: string,
): { primary: string; secondary: string } {
  return {
    primary: formatLocationDisplayPrimaryLine(row, doorLabel),
    secondary: formatLocationDisplayLocalityLine(row),
  };
}

/** Nominatim hit → format D (structured address fields only). */
export function formatGeocoderPickerLines(
  result: Pick<GeocoderSearchResult, 'address' | 'name' | 'displayName'>,
  doorLabel: string,
): { primary: string; secondary: string } {
  const addr = result.address;
  const city =
    addr?.city?.trim() ||
    addr?.town?.trim() ||
    addr?.village?.trim() ||
    addr?.municipality?.trim() ||
    null;
  const district =
    addr?.city_district?.trim() ||
    addr?.suburb?.trim() ||
    addr?.borough?.trim() ||
    addr?.quarter?.trim() ||
    null;
  return formatLocationPickerLines(
    {
      street: addr?.road?.trim() || result.name?.trim() || null,
      house_number: addr?.house_number?.trim() || null,
      staircase: null,
      door: null,
      postcode: addr?.postcode?.trim() || null,
      city,
      address_label: result.displayName?.trim() || null,
      district,
      country: addr?.country?.trim() || null,
    },
    doorLabel,
  );
}

/** Org picker: hide already-linked rows and duplicate ids (Recent + Results paths). */
export function filterAndDedupeOrgSuggestions(rows: OrgLocationSearchRow[]): OrgLocationSearchRow[] {
  const seen = new Set<string>();
  const filtered: OrgLocationSearchRow[] = [];
  for (const row of rows) {
    if (row.is_linked_to_media === true) continue;
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    filtered.push(row);
  }
  return filtered;
}

/** Clipboard string for “Copy full address” — all populated address parts, comma-separated. */
export function formatLocationFullAddressCopy(
  row: Pick<
    MediaItemLocationRow,
    | 'street'
    | 'house_number'
    | 'staircase'
    | 'door'
    | 'floor'
    | 'postcode'
    | 'city'
    | 'district'
    | 'country'
    | 'address_label'
  >,
  doorLabel: string,
): string {
  const segments: string[] = [];
  const { primary, secondary } = formatLocationPickerLines(row, doorLabel);
  if (primary && primary !== '—') {
    segments.push(primary);
  }
  if (secondary) {
    segments.push(secondary.replace(/ · /g, ', '));
  }
  if (row.floor?.trim()) {
    segments.push(row.floor.trim());
  }
  if (row.postcode?.trim() && !row.city?.trim()) {
    segments.push(row.postcode.trim());
  }
  return segments.join(', ');
}

export function locationGpsDisplay(row: MediaItemLocationRow): string | null {
  if (row.latitude == null || row.longitude == null) {
    return null;
  }
  return `${row.latitude.toFixed(6)}, ${row.longitude.toFixed(6)}`;
}

/** Rows that can drive map zoom (paired lat/lng, not null-island). */
export function locationsWithGps(rows: readonly MediaItemLocationRow[]): MediaItemLocationRow[] {
  return rows.filter((row) => legacyMediaHasGps(row.latitude, row.longitude));
}

/** Count of zoomable links — same rule as batch `zoomable_location_count`. */
export function countZoomableLinks(rows: readonly MediaItemLocationRow[]): number {
  return locationsWithGps(rows).length;
}

/**
 * Integration gate: batch summary count must match list-derived zoomable count.
 * @see docs/specs/service/media-locations/media-locations.zoomable-map-contract.supplement.md
 */
export function zoomableCountMatchesListParity(
  batchZoomableCount: number,
  rows: readonly MediaItemLocationRow[],
): boolean {
  return batchZoomableCount === countZoomableLinks(rows);
}

export function legacyMediaHasGps(latitude: number | null, longitude: number | null): boolean {
  return (
    latitude != null &&
    longitude != null &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    !(latitude === 0 && longitude === 0)
  );
}

/**
 * Canonical row for detail title / `media()` projection.
 * Prefers the first zoomable row by `sort_order`; otherwise lowest `sort_order`.
 * @see docs/specs/service/media-locations/media-locations.zoomable-map-contract.supplement.md
 */
export function displayLocationFromRows(
  rows: readonly MediaItemLocationRow[],
): MediaItemLocationRow | null {
  if (rows.length === 0) {
    return null;
  }
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order);
  const zoomable = sorted.find((row) => legacyMediaHasGps(row.latitude, row.longitude));
  return zoomable ?? sorted[0] ?? null;
}

/**
 * Snapshot for detail header / map affordances from the current location list.
 * Projects `LocationDisplayFields` only (no staircase/door/postcode on `media()`).
 * @see docs/specs/ui/media-detail/media-detail-location-section.md
 */
export function locationDisplaySnapshotFromRows(
  rows: readonly MediaItemLocationRow[],
): LocationDisplaySnapshot | null {
  const display = displayLocationFromRows(rows);
  if (!display) {
    return null;
  }

  return {
    displayLocationId: display.id,
    fields: {
      address_label: display.address_label,
      street: display.street,
      city: display.city,
      district: display.district,
      country: display.country,
      latitude: display.latitude,
      longitude: display.longitude,
      location_unresolved: !legacyMediaHasGps(display.latitude, display.longitude),
    },
  };
}

/** Merge first-link display fields into the loaded detail media record (`MediaRecord` DTO). */
export function mergeLocationDisplayIntoMediaRecord<T extends MediaRecord>(
  media: T,
  snapshot: LocationDisplaySnapshot | null,
): T {
  if (!snapshot) {
    return {
      ...media,
      address_label: null,
      street: null,
      city: null,
      district: null,
      country: null,
      latitude: null,
      longitude: null,
      location_unresolved: true,
    };
  }

  return { ...media, ...snapshot.fields };
}

export function mediaHasZoomableLocation(input: {
  zoomable_location_count?: number | null;
  latitude?: number | null;
  longitude?: number | null;
}): boolean {
  if (input.zoomable_location_count != null) {
    return input.zoomable_location_count > 0;
  }
  return legacyMediaHasGps(input.latitude ?? null, input.longitude ?? null);
}

/** Gallery/workspace flat coords from display-hydrate row (not null-island placeholders). */
export function galleryCoordsFromDisplayLocation(
  display: MediaItemLocationRow | null | undefined,
  zoomableLocationCount: number,
): { latitude: number; longitude: number } {
  if (
    zoomableLocationCount > 0 &&
    display &&
    legacyMediaHasGps(display.latitude, display.longitude)
  ) {
    return { latitude: display.latitude!, longitude: display.longitude! };
  }
  return { latitude: 0, longitude: 0 };
}

export function locationMatchesQuery(row: MediaItemLocationRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const displayLine = formatLocationDisplayLine(row, 'Top');
  const haystack = [
    displayLine,
    row.street,
    row.house_number,
    row.staircase,
    row.door,
    row.postcode,
    row.address_label,
    row.city,
    row.district,
    row.country,
    'Stiege',
    'Top',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function describeMediaLocationRpcError(error: { message?: string } | null): string {
  const msg = error?.message?.trim() ?? '';
  if (msg.includes('not_found')) {
    return 'Location not found.';
  }
  if (msg.includes('forbidden') || msg.includes('permission')) {
    return 'You do not have permission to change this location.';
  }
  return msg || 'Location update failed.';
}
