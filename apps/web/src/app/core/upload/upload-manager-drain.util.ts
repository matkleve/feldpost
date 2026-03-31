/**\n * drainUploadManagerQueue() — Pull queued jobs and start pipeline for available slots.\n *\n * Logic (Spec: upload-manager-pipeline.md § Queue Draining):\n *  1. Snapshot current jobs\n *  2. Count available slots (MAX_CONCURRENT=3)\n *  3. If slots avail: select N queued jobs via selectQueuedJobsForStart()\n *  4. For each job: ensureAbortController → markRunning → runPipeline()\n *  5. Exit if no slots (queue waits for running jobs to complete)\n *\n * Called by:\n *  - submitUploadManagerFiles() / submitUploadManagerFolder() (initial queue kick)\n *  - retryUploadManagerJob() (after retry)\n *  - Job completion (markDone → notifies queue there's now space)\n *\n * Logging: Debug console output for diagnostics (job phases, selected queue items)\n */\n\nimport type { UploadJob } from './upload-manager.types';
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
