/**
 * Bulk location resolution, end to end (Phase 5.4).
 *
 * The one entry point a UI needs. It deliberately separates **planning** from **running**, because
 * R7 requires the user to confirm an exact count and address before anything is written:
 *
 * ```
 * const plan = service.plan(selectedRows, { source: 'folder' });   // nothing written
 * // …show plan.groups / plan.eligibleCount / plan.geocodeCount…
 * const report = await service.run(plan, { onProgress });          // writes
 * ```
 *
 * A folder subtree and a filter selection are two ways of producing `selectedRows`, not two
 * engines — which is B8, and the rule most at risk of being broken by building one case first.
 *
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 * @see docs/specs/system/deferred-location-resolution.batch.supplement.md
 */

import { Injectable, inject } from '@angular/core';
import { GeocodingService } from '../geocoding/geocoding.service';
import { MediaLocationUpdateService } from '../media-location-update/media-location-update.service';
import { LocalGeoDataAdapter } from '../location-path-parser/local-geo-data.adapter';
import type { MediaRecord } from '../media-query/media-query.types';
import { createBulkResolutionDeps } from './bulk-resolution.adapter';
import { planBulkResolution } from './bulk-resolution.planner';
import type {
  BulkResolutionPlan,
  BulkResolutionSource,
} from './bulk-resolution.planner';
import { runBulkResolution } from './bulk-resolution.runner';
import type { BulkResolutionReport } from './bulk-resolution.runner';
import { toBulkCandidates } from './bulk-resolution.selection';

export interface BulkResolutionPlanRequest {
  /** Which stored evidence to read. Chosen per run, never inferred (B2). */
  source: BulkResolutionSource;
  /** B3: overwriting items that already have a location is a separate, explicit mode. */
  overwriteExisting?: boolean;
}

export interface BulkResolutionRunOptions {
  onProgress?: (done: number, total: number) => void;
  /** Explicit cancel. Navigating away is not a cancel — a confirmed write runs to completion. */
  signal?: { aborted: boolean };
}

@Injectable({ providedIn: 'root' })
export class BulkResolutionService {
  private readonly geocoding = inject(GeocodingService);
  private readonly locationUpdate = inject(MediaLocationUpdateService);
  private readonly geoData = inject(LocalGeoDataAdapter);

  private geoPromise: Promise<Awaited<ReturnType<BulkResolutionService['loadGeo']>>> | null = null;

  private async loadGeo() {
    const [states, municipalities, postcodeMap] = await Promise.all([
      this.geoData.getBundeslaender(),
      this.geoData.getGemeinden(),
      this.geoData.getPlzMap(),
    ]);
    return { states, municipalities, postcodeMap };
  }

  /**
   * Build the plan for a selection. Writes nothing — this is what the confirmation is built from,
   * and `geocodeCount` is on it so the cost of the run is stated rather than implied.
   */
  async plan(
    records: readonly MediaRecord[],
    request: BulkResolutionPlanRequest,
  ): Promise<BulkResolutionPlan> {
    this.geoPromise ??= this.loadGeo();
    const geo = await this.geoPromise;
    return planBulkResolution(toBulkCandidates(records), {
      source: request.source,
      geo,
      overwriteExisting: request.overwriteExisting,
    });
  }

  /** Apply a confirmed plan. One geocode per group; a failure never aborts the run. */
  async run(
    plan: BulkResolutionPlan,
    options: BulkResolutionRunOptions = {},
  ): Promise<BulkResolutionReport> {
    const deps = createBulkResolutionDeps({
      geocoding: this.geocoding,
      locationUpdate: this.locationUpdate,
    });
    return runBulkResolution(plan, {
      ...deps,
      onProgress: options.onProgress,
      signal: options.signal,
    });
  }
}
