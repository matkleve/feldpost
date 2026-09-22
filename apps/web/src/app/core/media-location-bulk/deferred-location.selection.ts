/**
 * STUDY-009 idea C (#232) — the two jobs behind *"158 items could be located more precisely"*.
 *
 * ## Why two numbers and not one
 *
 * Bulk eligibility is a single yes/no: `isBulkEligibleStatus` says whether bulk resolution may touch
 * an item. That is the right question for the **engine** and the wrong one for a **badge**, because
 * it puts two different jobs behind one number:
 *
 * ```
 * Archiv/2019/IMG_4471.jpg     pending      nothing was established at all
 *                              → the job is: where was this taken?
 *
 * Archiv/Wien/1010/IMG_0090.jpg partial     "Wien 1010" resolved; no street, no pin
 *                              → the job is: which street, which house number?
 * ```
 *
 * Merged, the user is told "412 items need attention" and can plan neither job. Split, they are two
 * offers with different answers and different costs. #232 states this as a hard criterion, and it is
 * why this module exists rather than the badge reading the eligibility predicate directly.
 *
 * ## Why `partial` is the discriminator
 *
 * `partial` is written by `resolveUploadLocationStatus` for exactly one case: an address was
 * established but no coordinates were (the D-10 area-only result — a city-precision location with no
 * pin, which is a deliberate outcome rather than a failure). That is precisely *"has a location that
 * could be more precise"*, and it is a column on `media_items`, so a library of 40 000 items is
 * counted with two `count` queries rather than by fetching 40 000 rows and joining.
 *
 * Coordinates were the obvious alternative discriminator and are the wrong one here: they live on
 * the linked `locations` row, not on `media_items`, so every count would need a join — and the
 * D-10 case, which is the whole population this badge is about, has no coordinates by design.
 *
 * Legacy statuses need no normalisation on this path. `no_gps` and `unresolved` normalise to
 * `pending` and `unresolvable`, and all four land in the same bucket, so mapping them first would
 * add a second place that has to know the legacy table without changing any answer.
 *
 * ## Why it reads only the persisted row
 *
 * A suppressed question is a decision taken on the user's behalf, legitimate only if they can see it
 * was taken (STUDY-009 § Correction 3). Both ways an item can end up deferred — archive import mode
 * today, the budget later (#233) — leave the same trace: a bulk-eligible `location_status` on a
 * media row. Nothing here takes an upload session, a batch id or an `issueKind`, so an item deferred
 * by a mechanism that did not exist when this was written still appears. A counter that had to be
 * told which mechanism deferred an item would silently miss the ones it was not built for, which is
 * TRAP-021's shape: work sitting in a state nobody watches.
 *
 * @see docs/specs/page/files-page.deferred-improvement.supplement.md
 * @see docs/study/009-tray-question-budget-and-priority.md
 */

import { LOCATED_LOCATION_STATUSES } from '../location-resolver/location-resolver.helpers';
import { isBulkEligibleStatus } from './bulk-resolution.selection';

export type DeferredLocationBucket =
  /** Already located. Bulk resolution has nothing to offer, so it is neither counted nor selectable. */
  | 'located'
  /** Bulk-eligible, nothing established. "Has no location." */
  | 'no_location'
  /** Bulk-eligible, an address established below pin precision. "Could be more precise." */
  | 'improvable';

/**
 * The fields this decision needs, and no more. `MediaRecord` satisfies it structurally, so the badge
 * and the gallery read one shape without this module depending on the full row.
 */
export interface DeferredLocationRow {
  id: string;
  location_status?: string | null;
}

export interface DeferredLocationCounts {
  noLocation: number;
  improvable: number;
  /** Not offered as work; carried so a surface can say "412 of 5 000" without a second pass. */
  located: number;
  /** `noLocation + improvable` — what a badge shows. Deliberately excludes `located`. */
  total: number;
}

/**
 * The status sets a **count query** filters on, so the query and the classifier are one decision.
 *
 * `no_location` has no list on purpose: it is everything bulk-eligible that is not `improvable`, and
 * writing it out would mean a new status silently counted as nothing. Expressed as a query that is
 * `NOT IN located` minus `improvable`, a status nobody has seen before is offered as work rather
 * than dropped — the same direction `isBulkEligibleStatus` fails in.
 */
export const DEFERRED_LOCATION_STATUS_FILTERS: Readonly<{
  improvable: readonly string[];
  located: readonly string[];
}> = {
  improvable: ['partial'],
  // The same set `isLocationUnresolvedStatus` calls located, not a copy of it: a query filtered on
  // a second literal list would drift from the predicate the badge and the run classify with.
  located: LOCATED_LOCATION_STATUSES,
};

/**
 * Which of the two jobs — if either — this item is.
 *
 * Eligibility is `isBulkEligibleStatus`, the **same** predicate the bulk engine uses, so a row this
 * counts is a row a run will act on. A badge and a run that disagreed would produce a number the
 * user cannot act on, which is worse than no number at all.
 */
export function deferredLocationBucket(row: DeferredLocationRow): DeferredLocationBucket {
  if (!isBulkEligibleStatus(row.location_status)) {
    return 'located';
  }
  const status = row.location_status ?? '';
  return DEFERRED_LOCATION_STATUS_FILTERS.improvable.includes(status)
    ? 'improvable'
    : 'no_location';
}

/** Count the two jobs over an explicit set of rows. Pure; no I/O; no live query. */
export function countDeferredLocations(
  rows: readonly DeferredLocationRow[],
): DeferredLocationCounts {
  let noLocation = 0;
  let improvable = 0;
  let located = 0;

  for (const row of rows) {
    switch (deferredLocationBucket(row)) {
      case 'no_location':
        noLocation += 1;
        break;
      case 'improvable':
        improvable += 1;
        break;
      case 'located':
        located += 1;
        break;
    }
  }

  return { noLocation, improvable, located, total: noLocation + improvable };
}

/**
 * The ids a bulk run over one bucket must target.
 *
 * Same traversal as `countDeferredLocations`, so "what the badge said" and "what the run writes" are
 * the same set by construction rather than by two implementations that happen to agree. `located` is
 * not a valid argument: there is no run to start over items that already have a location (R2).
 */
export function selectDeferredLocationIds(
  rows: readonly DeferredLocationRow[],
  bucket: Exclude<DeferredLocationBucket, 'located'>,
): string[] {
  return rows.filter((row) => deferredLocationBucket(row) === bucket).map((row) => row.id);
}
