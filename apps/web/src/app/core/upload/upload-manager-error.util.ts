import { isCancelledUploadJob } from './upload-cancelled.util';
import type { UploadJob, UploadPhase } from './upload-manager.types';

export interface HandleUploadPipelineErrorDeps {
  findJob: (jobId: string) => UploadJob | undefined;
  markDone: (jobId: string) => void;
  emitBatchProgress: (batchId: string) => void;
  drainQueue: () => void;
  failJob: (jobId: string, failedAt: UploadPhase, error: string) => void;
  logJobIdPrefixLen: number;
}

export function handleUploadPipelineError(
  jobId: string,
  err: unknown,
  deps: HandleUploadPipelineErrorDeps,
): void {
  const shortId = jobId.slice(0, deps.logJobIdPrefixLen);
  console.error(`[upload-manager] runPipeline: job ${shortId} threw:`, err);

  const current = deps.findJob(jobId);
  if (isCancelledUploadJob(current)) {
    deps.markDone(jobId);
    if (current) {
      deps.emitBatchProgress(current.batchId);
    }
    deps.drainQueue();
    return;
  }

  deps.failJob(jobId, current?.phase ?? 'queued', err instanceof Error ? err.message : String(err));
}
