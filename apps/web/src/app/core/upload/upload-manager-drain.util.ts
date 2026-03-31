import type { UploadJob } from './upload-manager.types';
import { selectQueuedJobsForStart } from './upload-manager-queue.util';

export interface DrainUploadManagerQueueDeps {
  snapshotJobs: () => ReadonlyArray<UploadJob>;
  availableSlots: () => number;
  ensureAbortController: (jobId: string) => void;
  markRunning: (jobId: string) => void;
  runPipeline: (jobId: string) => void;
  logJobIdPrefixLen: number;
}

export function drainUploadManagerQueue(deps: DrainUploadManagerQueueDeps): void {
  const jobs = deps.snapshotJobs();
  const slotsAvailable = deps.availableSlots();
  console.log('[upload-manager] drainQueue:', {
    totalJobs: jobs.length,
    slotsAvailable,
    phases: jobs.map((j) => `${j.id.slice(0, deps.logJobIdPrefixLen)}:${j.phase}:${j.mode}`),
  });
  if (slotsAvailable <= 0) {
    console.log('[upload-manager] drainQueue: no slots available, exiting');
    return;
  }

  const toStart = selectQueuedJobsForStart(jobs, slotsAvailable);
  console.log(
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
