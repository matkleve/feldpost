/**
 * Selection → engine candidates (Phase 5.4).
 *
 * A bulk run operates on an **explicit list of media rows** the user selected (R1), never on a live
 * query. Everything the planner needs is already on the row, so this mapping adds no database
 * round-trip: the raw ingest evidence (`relative_path`, `original_filename`, EXIF coordinates) has
 * been readable since the read-model change.
 *
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 * @see docs/specs/system/deferred-location-resolution.batch.supplement.md
 */

import type { MediaRecord } from '../media-query/media-query.types';
import type { BulkResolutionCandidate } from './bulk-resolution.planner';

/**
 * Statuses that mean "this item already has a location", so bulk resolution leaves it alone unless
 * overwrite mode was explicitly chosen (B3).
 *
 * Deliberately **not** derived from `location_unresolved`: two mappers compute that field
 * differently — `media-query.service.ts` counts `'partial'` as unresolved and
 * `media-detail-data.facade.ts` does not — so eligibility would inherit a disagreement that has
 * nothing to do with it. Reading the status directly keeps this decision in one place.
 */
const LOCATED_STATUSES = new Set(['resolved', 'gps']);

/**
 * Is an item's location status one that bulk resolution may act on?
 *
 * `unresolvable` counts as eligible: the pipeline gave up on it, and a human answer applied to a
 * whole folder is precisely what that case needs. Excluding it would leave the hardest items
 * permanently out of reach of the tool built for them.
 *
 * An unknown or absent status is eligible too — failing toward offering the work is safer than
 * silently skipping rows, because a skip is invisible while an unwanted offer is not.
 */
export function isBulkEligibleStatus(status: string | null | undefined): boolean {
  return !status || !LOCATED_STATUSES.has(status);
}

/** Map selected media rows to planner candidates. Pure; no I/O. */
export function toBulkCandidates(
  records: readonly MediaRecord[],
): BulkResolutionCandidate[] {
  return records.map((record) => ({
    mediaId: record.id,
    relativePath: record.relative_path ?? null,
    originalFilename: record.original_filename ?? null,
    hasLocation: !isBulkEligibleStatus(record.location_status),
    exifCoords:
      record.exif_latitude != null && record.exif_longitude != null
        ? { lat: record.exif_latitude, lng: record.exif_longitude }
        : null,
  }));
}
