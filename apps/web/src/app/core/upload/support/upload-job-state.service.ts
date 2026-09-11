/**
 * UploadJobStateService — job CRUD, phase transitions, and event emission.
 *
 * Owns the jobs signal and provides atomic operations for job state management.
 * Emits domain events when jobs change phase, fail, skip, or complete.
 *
 * Ground rules (Spec: upload-manager-pipeline.md):
 * - Phase transitions: checked against upload-phase-transitions.ts; only terminality is enforced
 * - TERMINAL_PHASES: complete, error, missing_data, skipped (job leaves queue)
 * - ACTIVE_PHASES: All phases with ongoing work (shown in 'uploading' lane)
 * - Event emission: jobPhaseChanged$ from pipeline-channel transitions only
 * - failJob() is idempotent on terminal phases — late rejections cannot flip complete → error
 *
 * Public API:
 *  - findJob(jobId): UploadJob | undefined
 *  - transitionTo(jobId, phase, { channel }): Guarded phase write
 *  - setPhase(jobId, phase): Pipeline-channel transition + emit jobPhaseChanged$
 *  - updateJob(jobId, patch): Merge partial state without changing phase
 *  - failJob(jobId, failedAt, error): Set phase=error + emit uploadFailed$
 */

import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { Signal } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  JobPhaseChangedEvent,
  UploadFailedEvent,
  UploadJob,
  UploadPhase,
} from '../upload-manager.types';
import { unregisterInflightDedupHash } from './upload-inflight-dedup.registry';
import {
  ACTIVE_PHASES,
  TERMINAL_PHASES,
  canTransition,
  reportTransitionViolation,
  type PhaseTransitionOptions,
  type TransitionChannel,
} from './upload-phase-transitions';

function phaseLabel(phase: UploadPhase): string {
  switch (phase) {
    case 'queued':
      return 'Queued';
    case 'validating':
      return 'Validating…';
    case 'parsing_exif':
      return 'Reading EXIF…';
    case 'converting_format':
      return 'Converting format…';
    case 'hashing':
      return 'Computing hash…';
    case 'dedup_check':
      return 'Checking duplicates…';
    case 'skipped':
      return 'Already uploaded';
    case 'extracting_title':
      return 'Checking filename…';
    case 'resolving_location':
      return 'Resolving location…';
    case 'awaiting_disambiguation':
      return 'Choose address';
    case 'conflict_check':
      return 'Checking conflicts…';
    case 'awaiting_conflict_resolution':
      return 'Waiting for decision…';
    case 'uploading':
      return 'Uploading…';
    case 'saving_record':
      return 'Saving…';
    case 'replacing_record':
      return 'Updating record…';
    case 'resolving_address':
      return 'Resolving address…';
    case 'resolving_coordinates':
      return 'Resolving location…';
    case 'missing_data':
      return 'Choose location';
    case 'complete':
      return 'Uploaded';
    case 'error':
      return 'Upload failed';
  }
}

export { TERMINAL_PHASES, ACTIVE_PHASES, phaseLabel };
export type { TransitionChannel, PhaseTransitionOptions };

@Injectable({ providedIn: 'root' })
export class UploadJobStateService {
  private readonly _jobs = signal<UploadJob[]>([]);

  readonly jobs: Signal<ReadonlyArray<UploadJob>> = this._jobs.asReadonly();

  readonly activeJobs: Signal<ReadonlyArray<UploadJob>> = computed(() =>
    this._jobs().filter((j) => !TERMINAL_PHASES.has(j.phase)),
  );

  readonly isBusy: Signal<boolean> = computed(() => this.activeJobs().length > 0);

  readonly activeCount: Signal<number> = computed(
    () => this._jobs().filter((j) => ACTIVE_PHASES.has(j.phase)).length,
  );

  // ── Events ─────────────────────────────────────────────────────────────────

  private readonly _jobPhaseChanged$ = new Subject<JobPhaseChangedEvent>();
  private readonly _uploadFailed$ = new Subject<UploadFailedEvent>();

  readonly jobPhaseChanged$: Observable<JobPhaseChangedEvent> =
    this._jobPhaseChanged$.asObservable();
  readonly uploadFailed$: Observable<UploadFailedEvent> = this._uploadFailed$.asObservable();

  // ── Mutations ──────────────────────────────────────────────────────────────

  addJobs(jobs: UploadJob[]): void {
    this._jobs.update((prev) => [...prev, ...jobs]);
  }

  findJob(jobId: string): UploadJob | undefined {
    return this._jobs().find((j) => j.id === jobId);
  }

  updateJob(jobId: string, patch: Partial<UploadJob>): void {
    this._jobs.update((prev) => prev.map((j) => (j.id === jobId ? { ...j, ...patch } : j)));
  }

  removeJob(jobId: string): void {
    const job = this.findJob(jobId);
    unregisterInflightDedupHash(job?.contentHash, jobId);
    this._jobs.update((prev) => prev.filter((j) => j.id !== jobId));
  }

  removeTerminalJobs(): void {
    const terminal = this._jobs().filter((j) => TERMINAL_PHASES.has(j.phase));
    for (const j of terminal) {
      unregisterInflightDedupHash(j.contentHash, j.id);
      if (j.thumbnailUrl && j.phase !== 'complete') {
        URL.revokeObjectURL(j.thumbnailUrl);
      }
    }
    this._jobs.update((prev) => prev.filter((j) => !TERMINAL_PHASES.has(j.phase)));
  }

  /**
   * Guarded phase transition.
   *
   * Terminality is the only hard invariant: the pipeline may never resurrect a finished job,
   * so a terminal source is rejected with no mutation. Every other edge in the transition map
   * is an *assertion about pipeline structure*, not a permission — an incomplete map is a bug
   * in the map, and must not veto work the pipeline actually did. Unmapped non-terminal edges
   * are therefore reported loudly (tests throw, dev logs) and then applied.
   *
   * @see docs/specs/service/media-upload-service/upload-manager.phase-fsm.supplement.md
   */
  transitionTo(
    jobId: string,
    phase: UploadPhase,
    options: PhaseTransitionOptions & { statusLabel?: string },
  ): boolean {
    const job = this.findJob(jobId);
    if (!job) {
      return false;
    }

    const from = job.phase;
    if (from === phase) {
      return true;
    }

    if (options.channel === 'pipeline' && TERMINAL_PHASES.has(from)) {
      return false;
    }

    if (!canTransition(from, phase, options.channel)) {
      reportTransitionViolation(jobId, from, phase, options.channel, options.reason);
    }

    const previousPhase = from;
    const statusLabel = options.statusLabel ?? phaseLabel(phase);
    this.updateJob(jobId, { phase, statusLabel });

    if (TERMINAL_PHASES.has(phase)) {
      unregisterInflightDedupHash(job.contentHash, jobId);
    }

    if (options.channel === 'pipeline') {
      this._jobPhaseChanged$.next({
        jobId,
        batchId: job.batchId,
        previousPhase,
        currentPhase: phase,
        fileName: job.file.name,
      });
    }

    return true;
  }

  /** Pipeline-channel transition. Returns false when the FSM rejects the edge. */
  setPhase(jobId: string, phase: UploadPhase): boolean {
    return this.transitionTo(jobId, phase, { channel: 'pipeline' });
  }

  failJob(jobId: string, failedAt: UploadPhase, error: string): void {
    const job = this.findJob(jobId);
    if (!job || TERMINAL_PHASES.has(job.phase)) {
      return;
    }

    unregisterInflightDedupHash(job.contentHash, jobId);
    this.updateJob(jobId, {
      phase: 'error',
      statusLabel: phaseLabel('error'),
      error,
      failedAt,
    });
    this._uploadFailed$.next({
      jobId,
      batchId: job?.batchId ?? '',
      phase: failedAt,
      error,
    });
  }

  /** Get current snapshot of all jobs (for batch computations). */
  snapshot(): ReadonlyArray<UploadJob> {
    return this._jobs();
  }
}
