/**
 * Pure helpers for location rows (no I/O).
 *
 * Used by: `media-location-row` (read line), `media-location-add-search` (picker),
 * `media-detail-location-section` (list filter), `media-locations.service` (RPC errors).
 */
import type { MediaRecord } from '../media-query/media-query.types';
import type { MediaItemLocationRow } from './media-locations.types';

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
  'street' | 'house_number' | 'staircase' | 'door' | 'postcode' | 'city' | 'address_label'
>;

/** Building/access segment without postcode/city tail (shared by row + picker primary). */
function formatLocationStreetAccessSegment(row: LocationDisplayLineInput): string {
  const streetPart = [row.street, row.house_number].filter(Boolean).join(' ').trim();
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
  return access;
}

/** Picker primary line — street/access only (no locality comma tail). */
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
  const line = formatLocationDisplayLine(row, doorLabel);
  if (line && line !== '—') {
    segments.push(line);
  }
  if (row.postcode?.trim()) {
    segments.push(row.postcode.trim());
  }
  if (row.floor?.trim()) {
    segments.push(row.floor.trim());
  }
  if (row.city?.trim()) {
    segments.push(row.city.trim());
  }
  if (row.district?.trim()) {
    segments.push(row.district.trim());
  }
  if (row.country?.trim()) {
    segments.push(row.country.trim());
  }
  return segments.join(', ');
}

export function locationGpsDisplay(row: MediaItemLocationRow): string | null {
  if (row.latitude == null || row.longitude == null) {
    return null;
  }
  return `${row.latitude.toFixed(6)}, ${row.longitude.toFixed(6)}`;
}

/** Rows that can drive map zoom (paired lat/lng). */
export function locationsWithGps(rows: readonly MediaItemLocationRow[]): MediaItemLocationRow[] {
  return rows.filter(
    (row) => row.latitude != null && row.longitude != null && Number.isFinite(row.latitude) && Number.isFinite(row.longitude),
  );
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

/** First linked row by sort order — canonical row for detail media projection. */
export function displayLocationFromRows(
  rows: readonly MediaItemLocationRow[],
): MediaItemLocationRow | null {
  if (rows.length === 0) {
    return null;
  }
  return [...rows].sort((a, b) => a.sort_order - b.sort_order)[0] ?? null;
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
