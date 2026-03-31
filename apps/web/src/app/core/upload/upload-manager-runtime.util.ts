import type {
  ImageAttachedEvent,
  ImageReplacedEvent,
  ImageUploadedEvent,
  LocationConflictEvent,
  MissingDataEvent,
  PipelineContext,
  UploadPhase,
  UploadSkippedEvent,
} from './upload-manager.types';

export interface UploadManagerPipelineContextDeps {
  failJob: (jobId: string, failedAt: UploadPhase, error: string) => void;
  emitBatchProgress: (batchId: string) => void;
  drainQueue: () => void;
  getAbortSignal: (jobId: string) => AbortSignal | undefined;
  checkDedupHash: (hash: string) => Promise<string | null>;
  emitUploadSkipped: (event: UploadSkippedEvent) => void;
  emitImageUploaded: (event: ImageUploadedEvent) => void;
  emitImageReplaced: (event: ImageReplacedEvent) => void;
  emitImageAttached: (event: ImageAttachedEvent) => void;
  emitMissingData: (event: MissingDataEvent) => void;
  emitLocationConflict: (event: LocationConflictEvent) => void;
}

export function createUploadManagerPipelineContext(
  deps: UploadManagerPipelineContextDeps,
): PipelineContext {
  return {
    failJob: (jobId, failedAt, error) => deps.failJob(jobId, failedAt, error),
    emitBatchProgress: (batchId) => deps.emitBatchProgress(batchId),
    drainQueue: () => deps.drainQueue(),
    getAbortSignal: (jobId) => deps.getAbortSignal(jobId),
    checkDedupHash: (hash) => deps.checkDedupHash(hash),
    emitUploadSkipped: (event) => deps.emitUploadSkipped(event),
    emitImageUploaded: (event) => deps.emitImageUploaded(event),
    emitImageReplaced: (event) => deps.emitImageReplaced(event),
    emitImageAttached: (event) => deps.emitImageAttached(event),
    emitMissingData: (event) => deps.emitMissingData(event),
    emitLocationConflict: (event) => deps.emitLocationConflict(event),
  };
}
