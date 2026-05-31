import type { UploadJob } from './upload-manager.types';

export function selectQueuedJobsForStart(
  jobs: ReadonlyArray<UploadJob>,
  slotsAvailable: number,
  options?: {
    isJobBlocked?: (job: UploadJob) => boolean;
    isJobRunning?: (jobId: string) => boolean;
  },
): ReadonlyArray<UploadJob> {
  if (slotsAvailable <= 0) {
    return [];
  }
  return jobs
    .filter((job) => job.phase === 'queued')
    // Already saved to storage — phase can lag behind mediaId if the pipeline re-enters.
    .filter((job) => !job.mediaId)
    .filter((job) => !(options?.isJobRunning?.(job.id) ?? false))
    .filter((job) => !(options?.isJobBlocked?.(job) ?? false))
    .slice(0, slotsAvailable);
}
