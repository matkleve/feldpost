import type { UploadJob, UploadPhase } from './upload-manager.types';

export interface FailUploadManagerJobDeps {
  abortJobRequest: (jobId: string) => void;
  markDone: (jobId: string) => void;
  failJobState: (jobId: string, failedAt: UploadPhase, error: string) => void;
  findJob: (jobId: string) => UploadJob | undefined;
  emitBatchProgress: (batchId: string) => void;
  drainQueue: () => void;
}

export function failUploadManagerJob(
  jobId: string,
  failedAt: UploadPhase,
  error: string,
  deps: FailUploadManagerJobDeps,
): void {
  deps.abortJobRequest(jobId);
  deps.markDone(jobId);
  deps.failJobState(jobId, failedAt, error);
  const job = deps.findJob(jobId);
  if (job) {
    deps.emitBatchProgress(job.batchId);
  }
  deps.drainQueue();
}
