/**
 * createUploadManagerPipelineContext() — Factory for PipelineContext object.
 * Bundles global state (failJob, emit events, abort signals, dedup check, queue drain)
 * into single context passed to all pipeline stages.
 */

import type {
  DedupHashMatch,
  DuplicateDetectedEvent,
  ImageAttachedEvent,
  ImageReplacedEvent,
  ImageUploadedEvent,
  LocationConflictEvent,
  MissingDataEvent,
  PipelineContext,
  UploadPhase,
  UploadSkippedEvent,
} from '../upload-manager.types';
import type { UploadErrorKey } from '../support/upload-status-text.util';

export interface UploadManagerPipelineContextDeps {
  failJob: (
    jobId: string,
    failedAt: UploadPhase,
    error: string,
    errorKey?: UploadErrorKey,
  ) => void;
  emitBatchProgress: (batchId: string) => void;
  drainQueue: () => void;
  getAbortSignal: (jobId: string) => AbortSignal | undefined;
  abortJobRequest: (jobId: string) => void;
  checkDedupHash: (hash: string) => Promise<DedupHashMatch | null>;
  getCurrentUserId: () => string | undefined;
  emitUploadSkipped: (event: UploadSkippedEvent) => void;
  emitDuplicateDetected: (event: DuplicateDetectedEvent) => void;
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
    failJob: (jobId, failedAt, error, errorKey) =>
      deps.failJob(jobId, failedAt, error, errorKey),
    emitBatchProgress: (batchId) => deps.emitBatchProgress(batchId),
    drainQueue: () => deps.drainQueue(),
    getAbortSignal: (jobId) => deps.getAbortSignal(jobId),
    abortJobRequest: (jobId) => deps.abortJobRequest(jobId),
    checkDedupHash: (hash) => deps.checkDedupHash(hash),
    getCurrentUserId: () => deps.getCurrentUserId(),
    emitUploadSkipped: (event) => deps.emitUploadSkipped(event),
    emitDuplicateDetected: (event) => deps.emitDuplicateDetected(event),
    emitImageUploaded: (event) => deps.emitImageUploaded(event),
    emitImageReplaced: (event) => deps.emitImageReplaced(event),
    emitImageAttached: (event) => deps.emitImageAttached(event),
    emitMissingData: (event) => deps.emitMissingData(event),
    emitLocationConflict: (event) => deps.emitLocationConflict(event),
  };
}
