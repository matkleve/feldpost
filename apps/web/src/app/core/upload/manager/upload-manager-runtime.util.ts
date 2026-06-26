/**
 * createUploadManagerPipelineContext() -- Factory for PipelineContext object.
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

export interface UploadManagerPipelineContextDeps {
  failJob: (jobId: string, failedAt: UploadPhase, error: string) => void;
  emitBatchProgress: (batchId: string) => void;
  drainQueue: () => void;
  getAbortSignal: (jobId: string) => AbortSignal | undefined;
  checkDedupHash: (hash: string) => Promise<DedupHashMatch | null>;
  claimBatchHash: (batchId: string, hash: string, jobId: string) => string | null;
  mergeDuplicateAddress: (ownerJobId: string, addressLabel: string) => void;
  attachAddressToMedia: (mediaId: string, addressLabel: string) => void;
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
    failJob: (jobId, failedAt, error) => deps.failJob(jobId, failedAt, error),
    emitBatchProgress: (batchId) => deps.emitBatchProgress(batchId),
    drainQueue: () => deps.drainQueue(),
    getAbortSignal: (jobId) => deps.getAbortSignal(jobId),
    checkDedupHash: (hash) => deps.checkDedupHash(hash),
    claimBatchHash: (batchId, hash, jobId) => deps.claimBatchHash(batchId, hash, jobId),
    mergeDuplicateAddress: (ownerJobId, addressLabel) =>
      deps.mergeDuplicateAddress(ownerJobId, addressLabel),
    attachAddressToMedia: (mediaId, addressLabel) =>
      deps.attachAddressToMedia(mediaId, addressLabel),
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
