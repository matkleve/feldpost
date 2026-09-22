/**
 * Executing half of bulk location resolution.
 *
 * Takes a {@link BulkResolutionPlan} and applies it: **one geocode per group** (R5), then the
 * ordinary per-item resolution for each member, in chunks that yield (R6). Every effect is injected,
 * so the run itself carries no I/O — that is what lets the rules be tested rather than asserted.
 *
 * A failure never aborts the run: at thousands of items a partial failure is normal, and
 * "it finished" is not an adequate answer. The report names every outcome.
 *
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 * @see docs/specs/system/deferred-location-resolution.batch.supplement.md
 */

import type { BulkResolutionGroup, BulkResolutionPlan } from './bulk-resolution.planner';

/**
 * The minimum the runner itself needs to know about a geocode result: enough to report it.
 *
 * The runner is **generic over the suggestion type** and passes whatever `geocode` returned
 * straight to `applyToItem`. That is not gold-plating — an earlier version fixed this to
 * `{ addressLabel, lat, lng }`, and wiring the real adapter showed it would have dropped
 * `street` / `city` / `streetNumber` / `zip` / `country`, which is exactly what
 * `geocodeResultToPrecisionFields` reads. Every bulk-resolved item would have been written with
 * coordinates and no address.
 */
export interface BulkGeocodeResult {
  addressLabel: string;
  lat: number;
  lng: number;
}

export interface BulkResolutionOutcome {
  mediaId: string;
  status: 'resolved' | 'skipped' | 'failed';
  /** Why, for anything that is not `resolved`. Shown in the report, not swallowed. */
  reason?: string;
}

export interface BulkResolutionReport {
  outcomes: BulkResolutionOutcome[];
  resolved: number;
  skipped: number;
  failed: number;
  geocodesPerformed: number;
  /** False when an abort signal stopped the run before the plan was exhausted. */
  completed: boolean;
}

export interface BulkResolutionRunnerDeps<TSuggestion extends BulkGeocodeResult = BulkGeocodeResult> {
  /** Called once per group (R5). Returning null means the address could not be placed. */
  geocode: (
    addressLabel: string,
    coords: { lat: number; lng: number } | null,
  ) => Promise<TSuggestion | null>;
  /**
   * Applies one resolved address to one item, through the same service a single-item edit uses —
   * so a bulk answer is the same kind of write as a tray answer, not a second path.
   */
  applyToItem: (
    mediaId: string,
    suggestion: TSuggestion,
  ) => Promise<{ ok: boolean; error?: string }>;
  onProgress?: (done: number, total: number) => void;
  /** Explicit cancel. Navigating away is NOT a cancel — a confirmed write runs to completion. */
  signal?: { aborted: boolean };
  chunkSize?: number;
  yieldToEventLoop?: () => Promise<void>;
}

const DEFAULT_CHUNK_SIZE = 100;

function defaultYield(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function runGroup<TSuggestion extends BulkGeocodeResult>(
  group: BulkResolutionGroup,
  deps: BulkResolutionRunnerDeps<TSuggestion>,
  outcomes: BulkResolutionOutcome[],
  progress: { done: number; total: number },
): Promise<{ geocoded: boolean; aborted: boolean }> {
  const suggestion = await deps.geocode(group.addressLabel, group.coords);

  if (!suggestion) {
    // Nothing is applied for this group. Half-writing an address nobody could place is worse than
    // writing none of it.
    for (const mediaId of group.mediaIds) {
      outcomes.push({
        mediaId,
        status: 'failed',
        reason: `geocode failed for "${group.addressLabel}"`,
      });
      progress.done += 1;
    }
    deps.onProgress?.(progress.done, progress.total);
    return { geocoded: false, aborted: false };
  }

  const chunkSize = deps.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const yieldToEventLoop = deps.yieldToEventLoop ?? defaultYield;

  for (let start = 0; start < group.mediaIds.length; start += chunkSize) {
    if (deps.signal?.aborted) {
      return { geocoded: true, aborted: true };
    }
    const chunk = group.mediaIds.slice(start, start + chunkSize);
    for (const mediaId of chunk) {
      const result = await deps.applyToItem(mediaId, suggestion);
      outcomes.push(
        result.ok
          ? { mediaId, status: 'resolved' }
          : { mediaId, status: 'failed', reason: result.error ?? 'write failed' },
      );
      progress.done += 1;
    }
    deps.onProgress?.(progress.done, progress.total);
    if (start + chunkSize < group.mediaIds.length) {
      await yieldToEventLoop();
    }
  }

  return { geocoded: true, aborted: false };
}

export async function runBulkResolution<TSuggestion extends BulkGeocodeResult = BulkGeocodeResult>(
  plan: BulkResolutionPlan,
  deps: BulkResolutionRunnerDeps<TSuggestion>,
): Promise<BulkResolutionReport> {
  const outcomes: BulkResolutionOutcome[] = plan.skipped.map((entry) => ({
    mediaId: entry.mediaId,
    status: 'skipped' as const,
    reason: entry.reason,
  }));

  const progress = { done: 0, total: plan.eligibleCount };
  let geocodesPerformed = 0;
  let aborted = false;

  for (const group of plan.groups) {
    if (deps.signal?.aborted) {
      aborted = true;
      break;
    }
    // A failing group is reported and the run continues: one bad address must not abort the rest.
    const result = await runGroup(group, deps, outcomes, progress);
    if (result.geocoded) {
      geocodesPerformed += 1;
    }
    if (result.aborted) {
      aborted = true;
      break;
    }
  }

  return {
    outcomes,
    resolved: outcomes.filter((o) => o.status === 'resolved').length,
    skipped: outcomes.filter((o) => o.status === 'skipped').length,
    failed: outcomes.filter((o) => o.status === 'failed').length,
    geocodesPerformed,
    completed: !aborted,
  };
}
