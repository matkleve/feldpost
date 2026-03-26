import type { UploadJob } from './upload-manager.types';

export function selectQueuedJobsForStart(
  jobs: ReadonlyArray<UploadJob>,
  slotsAvailable: number,
): ReadonlyArray<UploadJob> {
  if (slotsAvailable <= 0) {
    return [];
  }
  return jobs.filter((job) => job.phase === 'queued').slice(0, slotsAvailable);
}
