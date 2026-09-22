/**
 * Figure → plan → confirm → run → recount (#232 + #219).
 *
 * The flow that makes a backlog figure actionable, and the one place R7 is enforced as *behaviour*
 * rather than as a template shape: `openBucket()` fetches and plans and writes nothing; only
 * `confirm()` may write, and only the plan that was already on screen.
 *
 * **The set is frozen at open (R1).** `confirm()` never re-queries. If an upload lands while the
 * user is reading the confirmation, it is not in the set they agreed to, and it will be in the next
 * recount instead — which is the correct answer, because the count they confirmed is the count that
 * gets written.
 *
 * It holds no host-specific state, so the same flow serves the Upload tab today and `/files` when
 * that page exists.
 *
 * @see docs/specs/page/files-page.deferred-improvement.supplement.md
 * @see docs/specs/page/files-page.bulk-resolution.supplement.md
 */

import { Injectable, inject, signal } from '@angular/core';
import { BulkResolutionService } from './bulk-resolution.service';
import { DeferredLocationCountService } from './deferred-location-count.service';
import { DeferredLocationFetchService } from './deferred-location-fetch.service';
import type { BulkResolutionPlan } from './bulk-resolution.planner';
import type { BulkResolutionReport } from './bulk-resolution.runner';
import type { DeferredLocationBucket } from './deferred-location.selection';

export type DeferredLocationBulkBucket = Exclude<DeferredLocationBucket, 'located'>;

@Injectable({ providedIn: 'root' })
export class DeferredLocationBulkFlowService {
  private readonly fetch = inject(DeferredLocationFetchService);
  private readonly bulk = inject(BulkResolutionService);
  private readonly counts = inject(DeferredLocationCountService);

  private readonly openSignal = signal(false);
  private readonly bucketSignal = signal<DeferredLocationBulkBucket | null>(null);
  private readonly planSignal = signal<BulkResolutionPlan | null>(null);
  private readonly runningSignal = signal(false);
  private readonly progressSignal = signal<{ done: number; total: number } | null>(null);
  private readonly reportSignal = signal<BulkResolutionReport | null>(null);
  private readonly errorSignal = signal<string | null>(null);
  private runInFlight: Promise<void> | null = null;

  readonly open = this.openSignal.asReadonly();
  readonly bucket = this.bucketSignal.asReadonly();
  readonly plan = this.planSignal.asReadonly();
  readonly running = this.runningSignal.asReadonly();
  readonly progress = this.progressSignal.asReadonly();
  readonly report = this.reportSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /**
   * Fetch the bucket, plan it, and show the confirmation. Writes nothing.
   *
   * `source: 'folder'` because the backlog's evidence is the path the file arrived with — the same
   * `buildSearchObjectFromRelativePath` the upload pipeline uses, so a folder answered here is
   * identical to the same folder answered one file at a time.
   */
  async openBucket(bucket: DeferredLocationBulkBucket): Promise<void> {
    this.reset();
    this.bucketSignal.set(bucket);

    try {
      const rows = await this.fetch.loadBucket(bucket);
      this.planSignal.set(await this.bulk.plan(rows, { source: 'folder' }));
      this.openSignal.set(true);
    } catch (cause) {
      // An error, not an empty plan: an empty plan is confirmable and would read as "0 items",
      // which is indistinguishable from a backlog that really is empty.
      this.errorSignal.set(cause instanceof Error ? cause.message : String(cause));
      this.openSignal.set(true);
    }
  }

  /** Apply the plan already on screen. Idempotent while a run is in flight. */
  async confirm(): Promise<void> {
    const plan = this.planSignal();
    if (!plan || this.runInFlight) {
      return this.runInFlight ?? Promise.resolve();
    }

    this.runInFlight = this.runPlan(plan).finally(() => {
      this.runInFlight = null;
    });
    return this.runInFlight;
  }

  /** Close without writing. */
  cancel(): void {
    this.reset();
    this.openSignal.set(false);
  }

  private async runPlan(plan: BulkResolutionPlan): Promise<void> {
    this.runningSignal.set(true);

    try {
      const report = await this.bulk.run(plan, {
        onProgress: (done, total) => this.progressSignal.set({ done, total }),
      });
      this.reportSignal.set(report);
      // Recount rather than adjusting by `report.resolved`: the run is not the only writer, and a
      // figure derived from a delta drifts the first time something else touches a row.
      await this.counts.refresh();
    } catch (cause) {
      this.errorSignal.set(cause instanceof Error ? cause.message : String(cause));
    } finally {
      this.runningSignal.set(false);
    }
  }

  private reset(): void {
    this.bucketSignal.set(null);
    this.planSignal.set(null);
    this.runningSignal.set(false);
    this.progressSignal.set(null);
    this.reportSignal.set(null);
    this.errorSignal.set(null);
  }
}
