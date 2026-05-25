import type { UploadJob } from './upload-manager.types';

export function selectQueuedJobsForStart(
  jobs: ReadonlyArray<UploadJob>,
  slotsAvailable: number,
  isJobBlocked?: (job: UploadJob) => boolean,
): ReadonlyArray<UploadJob> {
  if (slotsAvailable <= 0) {
    return [];
  }
  return jobs
    .filter((job) => job.phase === 'queued')
    .filter((job) => !(isJobBlocked?.(job) ?? false))
    .slice(0, slotsAvailable);
}
