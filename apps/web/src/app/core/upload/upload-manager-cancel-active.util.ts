import type { UploadJob, UploadPhase } from './upload-manager.types';

export interface CancelAllActiveUploadsDeps {
  snapshotJobs: () => ReadonlyArray<UploadJob>;
  isTerminalPhase: (phase: UploadPhase) => boolean;
  abortJobRequest: (jobId: string) => void;
  markDone: (jobId: string) => void;
  removeStoragePath: (storagePath: string) => void;
  markCancelledSignedOut: (jobId: string, failedAt: UploadPhase) => void;
}

export function cancelAllActiveUploads(deps: CancelAllActiveUploadsDeps): void {
  const active = deps.snapshotJobs().filter((job) => !deps.isTerminalPhase(job.phase));
  for (const job of active) {
    deps.abortJobRequest(job.id);
    deps.markDone(job.id);
    if (job.storagePath) {
      deps.removeStoragePath(job.storagePath);
    }
    deps.markCancelledSignedOut(job.id, job.phase);
  }
}
