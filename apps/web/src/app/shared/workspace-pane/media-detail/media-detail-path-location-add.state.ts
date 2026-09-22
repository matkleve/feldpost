/**
 * FSM for *Add as location* on the Details **Original folder** and **Original file name** rows.
 *
 * Deliberately the same three states as the EXIF row's FSM
 * (`media-detail-exif-location-add.state.ts`): one row action that adds a location should not
 * behave differently depending on which evidence it reads. A failed run toasts and returns to
 * `idle`, exactly as the EXIF action does — there is no `failed` state, because a fourth state
 * here would be a second way to report the same outcome.
 *
 * **What this file does not decide.** Whether the chosen source actually yields an address is
 * `planBulkResolution`'s job (`bulk-resolution.planner.ts` → `deriveTarget`, which reports
 * `no_address_in_source`). Re-deriving it here to pre-hide the action would be a second evidence
 * derivation in the UI, and the two would drift. The action is offered whenever the row carries
 * text; a run that finds no address says so.
 *
 * @see docs/specs/system/deferred-location-resolution.md § Actions — Single item
 */

import { isBulkEligibleStatus } from '../../../core/media-location-bulk/bulk-resolution.selection';

/** Which stored evidence the row feeds to the pipeline. Never inferred — one row, one source (B2). */
export type PathLocationAddSource = 'folder' | 'filename';

export type PathLocationAddState = 'hidden' | 'idle' | 'resolving';

export const PATH_LOCATION_ADD_TRANSITIONS: Record<
  PathLocationAddState,
  readonly PathLocationAddState[]
> = {
  hidden: ['idle'],
  idle: ['resolving'],
  resolving: ['idle'],
};

export function canTransitionPathLocationAdd(
  from: PathLocationAddState,
  to: PathLocationAddState,
): boolean {
  return PATH_LOCATION_ADD_TRANSITIONS[from].includes(to);
}

export function goToPathLocationAdd(
  current: PathLocationAddState,
  next: PathLocationAddState,
): PathLocationAddState {
  return canTransitionPathLocationAdd(current, next) ? next : current;
}

export interface PathLocationAddStateInput {
  /** What the row displays: the folder path, or the original file name. */
  evidenceLabel: string | null | undefined;
  /** `media_items.location_status`. Drives row 6 — an item with a location gets no add action. */
  locationStatus: string | null | undefined;
  /** True while this row's own run is in flight. */
  resolving: boolean;
}

/**
 * Derive the row's state from the item.
 *
 * Eligibility is `isBulkEligibleStatus`, the **same** predicate bulk resolution uses, so a row the
 * detail view offers is a row a bulk run would also act on. Duplicating the status list here is how
 * the two would come to disagree about `unresolvable`.
 *
 * `hidden` outranks `resolving`: once the run has written a location, row 6 applies immediately,
 * even before the in-flight flag clears. The other order would briefly re-offer an action that
 * overwrites what the run just wrote.
 */
export function pathLocationAddStateFor(input: PathLocationAddStateInput): PathLocationAddState {
  if (!input.evidenceLabel || !input.evidenceLabel.trim()) {
    return 'hidden';
  }
  if (!isBulkEligibleStatus(input.locationStatus)) {
    return 'hidden';
  }
  return input.resolving ? 'resolving' : 'idle';
}
