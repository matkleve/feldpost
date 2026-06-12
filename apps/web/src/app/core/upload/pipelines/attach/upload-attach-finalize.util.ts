import type { UploadJob } from '../../upload-manager.types';

type FinalizeAttachCompletionArgs = {
  jobId: string;
  finalJob: UploadJob;
  storagePath: string;
  hadExistingCoords: boolean;
  isCancelled: () => boolean;
  setLocalUrl: (mediaId: string, localUrl: string) => void;
  emitImageAttached: (event: {
    jobId: string;
    mediaId: string;
    newStoragePath: string;
    localObjectUrl?: string;
    coords?: UploadJob['coords'];
    direction?: number;
    hadExistingCoords: boolean;
  }) => void;
  emitBatchProgress: (batchId: string) => void;
  drainQueue: () => void;
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

export function finalizeAttachCompletion(args: FinalizeAttachCompletionArgs): void {
  const {
    jobId,
    finalJob,
    storagePath,
    hadExistingCoords,
    isCancelled,
    setLocalUrl,
    emitImageAttached,
    emitBatchProgress,
    drainQueue,
    log,
    warn,
  } = args;

  if (isCancelled()) {
    emitBatchProgress(finalJob.batchId);
    drainQueue();
    return;
  }

  log('[attach-pipeline] phase: complete', {
    thumbnailUrl: finalJob.thumbnailUrl,
    targetMediaId: finalJob.targetMediaId,
    coords: finalJob.coords,
    direction: finalJob.direction,
  });

  if (finalJob.thumbnailUrl) {
    log('[attach-pipeline] setting local URL for mediaDownloadService');
    setLocalUrl(finalJob.targetMediaId!, finalJob.thumbnailUrl);
  } else {
    warn('[attach-pipeline] no thumbnailUrl to set in mediaDownloadService');
  }

  const attachedEvent = {
    jobId,
    mediaId: finalJob.targetMediaId!,
    newStoragePath: storagePath,
    localObjectUrl: finalJob.thumbnailUrl,
    coords: finalJob.coords,
    direction: finalJob.direction,
    hadExistingCoords,
  };
  log('[attach-pipeline] emitting imageAttached$:', attachedEvent);
  emitImageAttached(attachedEvent);

  emitBatchProgress(finalJob.batchId);
  log('[attach-pipeline] ▶ DONE');
  drainQueue();
}
