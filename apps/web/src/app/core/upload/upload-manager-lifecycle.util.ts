import type { UploadJob } from './upload-manager.types';

export function ensureUploadAbortController(
  abortControllers: Map<string, AbortController>,
  jobId: string,
): AbortController {
  const existing = abortControllers.get(jobId);
  if (existing) {
    return existing;
  }
  const controller = new AbortController();
  abortControllers.set(jobId, controller);
  return controller;
}

export function abortUploadManagerJobRequest(
  abortControllers: Map<string, AbortController>,
  jobId: string,
): void {
  const controller = abortControllers.get(jobId);
  if (!controller) {
    return;
  }
  if (!controller.signal.aborted) {
    controller.abort();
  }
  abortControllers.delete(jobId);
}

export function clearUploadAbortController(
  abortControllers: Map<string, AbortController>,
  jobId: string,
): void {
  abortControllers.delete(jobId);
}

export interface EmitUploadManagerBatchProgressDeps {
  snapshotJobs: () => ReadonlyArray<UploadJob>;
  emitBatchProgress: (batchId: string, jobs: ReadonlyArray<UploadJob>) => void;
  checkBatchComplete: (batchId: string, jobs: ReadonlyArray<UploadJob>) => void;
}

export function emitUploadManagerBatchProgress(
  batchId: string,
  deps: EmitUploadManagerBatchProgressDeps,
): void {
  const jobs = deps.snapshotJobs();
  deps.emitBatchProgress(batchId, jobs);
  deps.checkBatchComplete(batchId, jobs);
}
