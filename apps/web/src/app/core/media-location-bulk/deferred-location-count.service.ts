/**
 * The backlog figures behind *"158 items could be located more precisely"* (#232).
 *
 * Composes three aggregate counts into the same shape `countDeferredLocations` produces over rows,
 * so a surface can show a number for a 40 000-item library without fetching it, and the two ways of
 * arriving at that number are pinned against each other by test.
 *
 * ```
 *   all            5 000   every item
 * − located        4 588   resolved | gps                     → nothing to offer
 * − improvable       254   partial: an address, no pin        → "could be more precise"
 * = no location      158   everything else that is eligible   → "has no location"
 * ```
 *
 * Why subtract rather than filter: see `countWithStatusIn` — it keeps every query to a plain `.in()`
 * and leaves no NULL semantics to get wrong.
 *
 * @see docs/specs/page/files-page.deferred-improvement.supplement.md
 * @see docs/study/009-tray-question-budget-and-priority.md
 */

import { Injectable, inject, signal } from '@angular/core';
import { DeferredLocationCountAdapter } from './deferred-location-count.adapter';
import {
  DEFERRED_LOCATION_STATUS_FILTERS,
  type DeferredLocationCounts,
} from './deferred-location.selection';

@Injectable({ providedIn: 'root' })
export class DeferredLocationCountService {
  private readonly adapter = inject(DeferredLocationCountAdapter);

  private readonly countsSignal = signal<DeferredLocationCounts | null>(null);
  private readonly loadingSignal = signal(false);
  private readonly errorSignal = signal<string | null>(null);
  private inFlight: Promise<void> | null = null;

  /** `null` until a refresh has succeeded — never a zero nobody measured. */
  readonly counts = this.countsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /**
   * Re-count the backlog.
   *
   * Concurrent calls share one run: the badge is refreshed by several unrelated events (a finished
   * upload, a completed bulk run, the tab opening), and three of them arriving together must not
   * become nine queries.
   */
  async refresh(): Promise<void> {
    if (this.inFlight) {
      return this.inFlight;
    }

    this.inFlight = this.load().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async load(): Promise<void> {
    this.loadingSignal.set(true);

    try {
      const [all, located, improvable] = await Promise.all([
        this.adapter.countAll(),
        this.adapter.countWithStatusIn(DEFERRED_LOCATION_STATUS_FILTERS.located),
        this.adapter.countWithStatusIn(DEFERRED_LOCATION_STATUS_FILTERS.improvable),
      ]);

      // Three statements, not one snapshot: an upload landing between them can push
      // located + improvable past all. A negative badge is worse than a stale one.
      const noLocation = Math.max(0, all - located - improvable);

      this.countsSignal.set({
        noLocation,
        improvable,
        located,
        total: noLocation + improvable,
      });
      this.errorSignal.set(null);
    } catch (cause) {
      // Leave the previous figures alone and say so. A zero here would read as "nothing to do",
      // which is the silent-failure shape the constitution forbids.
      this.errorSignal.set(cause instanceof Error ? cause.message : String(cause));
    } finally {
      this.loadingSignal.set(false);
    }
  }
}
