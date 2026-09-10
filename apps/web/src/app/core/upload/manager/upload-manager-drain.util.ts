/**
 * drainUploadManagerQueue() — Pull queued jobs and start pipeline for available slots.
 *
 * Logic (Spec: upload-manager-pipeline.md § Queue Draining):
 *  1. Snapshot current jobs
 *  2. Count available slots (MAX_CONCURRENT=3)
 *  3. If slots avail: select N queued jobs via selectQueuedJobsForStart()
 *  4. For each job: ensureAbortController → markRunning → runPipeline()
 *  5. Exit if no slots (queue waits for running jobs to complete)
 *
 * Called by:
 *  - submitUploadManagerFiles() / submitUploadManagerFolder() (initial queue kick)
 *  - retryUploadManagerJob() (after retry)
 *  - Job completion (markDone → notifies queue there's now space)
 *
 * Logging: gated behind the upload-manager debug flag (see upload-manager-debug.util.ts) —
 * a drain fires after every job transition, so ungated logging floods the console on a
 * large folder import (UP-41).
 */

import type { UploadJob } from '../upload-manager.types';
import { uploadManagerDebugLog } from '../support/upload-manager-debug.util';
import { selectQueuedJobsForStart } from './upload-manager-queue.util';

export interface DrainUploadManagerQueueDeps {
  snapshotJobs: () => ReadonlyArray<UploadJob>;
  availableSlots: () => number;
  isJobBlocked?: (job: UploadJob) => boolean;
  isJobRunning?: (jobId: string) => boolean;
  ensureAbortController: (jobId: string) => void;
  markRunning: (jobId: string) => void;
  runPipeline: (jobId: string) => void;
  logJobIdPrefixLen: number;
}

export function drainUploadManagerQueue(deps: DrainUploadManagerQueueDeps): void {
  const jobs = deps.snapshotJobs();
  const slotsAvailable = deps.availableSlots();
  uploadManagerDebugLog('[upload-manager] drainQueue:', {
    totalJobs: jobs.length,
    slotsAvailable,
    phases: jobs.map((j) => `${j.id.slice(0, deps.logJobIdPrefixLen)}:${j.phase}:${j.mode}`),
  });
  if (slotsAvailable <= 0) {
    uploadManagerDebugLog('[upload-manager] drainQueue: no slots available, exiting');
    return;
  }

  const toStart = selectQueuedJobsForStart(jobs, slotsAvailable, {
    isJobBlocked: deps.isJobBlocked,
    isJobRunning: deps.isJobRunning,
  });
  uploadManagerDebugLog(
    '[upload-manager] drainQueue: starting',
    toStart.length,
    'jobs:',
    toStart.map((j) => `${j.id.slice(0, deps.logJobIdPrefixLen)}:${j.mode}`),
  );

  for (const job of toStart) {
    deps.ensureAbortController(job.id);
    deps.markRunning(job.id);
    deps.runPipeline(job.id);
  }
}
