/**
 * A badge figure → the explicit set a bulk run writes (#232 → #219).
 *
 * **R1 is why this exists as a separate step.** A bulk apply targets an explicit list of media rows,
 * never a live query: the set the user confirmed must be the set that is written, even if an upload
 * lands mid-confirmation. So the rows are fetched once, when the figure is clicked, and that array
 * is what the plan and the run both see.
 *
 * The client-side re-filter is deliberate belt-and-braces. The badge counted with
 * `deferredLocationBucket`; this selects with `deferredLocationBucket`. A query that drifts — or a
 * `location_status` value nobody anticipated — cannot widen the write set past what the figure
 * promised, because the promise and the selection are the same function.
 *
 * @see docs/specs/page/files-page.deferred-improvement.supplement.md
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 */

import { Injectable, inject } from '@angular/core';
import type { MediaRecord } from '../media-query/media-query.types';
import { DeferredLocationCountAdapter } from './deferred-location-count.adapter';
import { deferredLocationBucket, type DeferredLocationBucket } from './deferred-location.selection';

@Injectable({ providedIn: 'root' })
export class DeferredLocationFetchService {
  private readonly adapter = inject(DeferredLocationCountAdapter);

  /**
   * The rows in one bucket, frozen at call time.
   *
   * A failure throws rather than resolving empty: an empty array plans to "0 items" and reads as
   * "nothing to do", which is the silent-failure shape the constitution forbids.
   */
  async loadBucket(
    bucket: Exclude<DeferredLocationBucket, 'located'>,
  ): Promise<MediaRecord[]> {
    const rows = await this.adapter.listCandidateRows();
    return rows.filter((row) => deferredLocationBucket(row) === bucket) as unknown as MediaRecord[];
  }
}
