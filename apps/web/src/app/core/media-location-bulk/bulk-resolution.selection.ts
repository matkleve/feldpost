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

import { isLocationUnresolvedStatus } from '../location-resolver/location-resolver.helpers';
import type { MediaRecord } from '../media-query/media-query.types';
import type { BulkResolutionCandidate } from './bulk-resolution.planner';

/**
 * Is an item's location status one that bulk resolution may act on (B3)?
 *
 * "Bulk resolution may act on it" and "its location is unresolved" are the same fact asked from two
 * sides, so this is `isLocationUnresolvedStatus` and not a second rule. It used to be a separate
 * rule on purpose — two mappers derived `location_unresolved` differently and eligibility refused
 * to inherit the disagreement — and #222 removed the disagreement rather than the duplication, so
 * the reason to keep them apart is gone.
 *
 * The two judgement calls that made this predicate worth writing down still hold, and now hold for
 * every consumer instead of this one:
 *
 * - `unresolvable` is eligible: the pipeline gave up on it, and a human answer applied to a whole
 *   folder is precisely what that case needs. Excluding it would leave the hardest items
 *   permanently out of reach of the tool built for them.
 * - An unknown or absent status is eligible too — failing toward offering the work is safer than
 *   silently skipping rows, because a skip is invisible while an unwanted offer is not.
 *
 * @see docs/specs/service/location-resolver/README.md § Location Status Contract
 */
export function isBulkEligibleStatus(status: string | null | undefined): boolean {
  return isLocationUnresolvedStatus(status);
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
