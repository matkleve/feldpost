/**
 * Pure helpers for location rows (no I/O).
 *
 * Used by: `media-location-row` (read line), `media-location-add-search` (filter Results),
 * `media-detail-location-section` (list filter), `media-locations.service` (RPC errors).
 */
import type { MediaItemLocationRow } from './media-locations.types';

/** Read-mode single line on a location row. @see docs/specs/ui/media-detail/media-detail-location-section.md */
export function formatLocationDisplayLine(
  row: Pick<
    MediaItemLocationRow,
    'street' | 'house_number' | 'staircase' | 'door' | 'address_label'
  >,
  doorLabel: string,
): string {
  const streetPart = [row.street, row.house_number].filter(Boolean).join(' ').trim();
  const base = streetPart || row.address_label?.trim() || '';
  const parts: string[] = base ? [base] : [];

  if (row.staircase?.trim()) {
    parts.push(row.staircase.trim());
  }
  if (row.door?.trim()) {
    parts.push(`${doorLabel} ${row.door.trim()}`);
  }

  return parts.join(', ') || '—';
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
  return latitude != null && longitude != null && Number.isFinite(latitude) && Number.isFinite(longitude);
}

export function locationMatchesQuery(row: MediaItemLocationRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) {
    return true;
  }
  const haystack = [
    row.street,
    row.house_number,
    row.staircase,
    row.door,
    row.address_label,
    row.city,
    row.district,
    row.country,
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
