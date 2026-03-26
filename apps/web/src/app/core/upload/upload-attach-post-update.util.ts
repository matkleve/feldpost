import { runAttachEnrichment } from './upload-attach-enrichment.util';
import { finalizeAttachCompletion } from './upload-attach-finalize.util';
import type { ImageAttachedEvent, UploadJob } from './upload-manager.types';
import type { ExifCoords } from './upload.service';

type RunAttachPostUpdateArgs = {
  jobId: string;
  storagePath: string;
  hadExistingCoords: boolean;
  isAttachKeep: boolean;
  finalCoords: ExifCoords | undefined;
  direction: number | undefined;
  updatedJob: UploadJob;
  setPhase: (phase: 'resolving_address' | 'resolving_coordinates' | 'complete') => void;
  updateJob: (patch: Partial<UploadJob>) => void;
  markDone: () => void;
  findJob: () => UploadJob | undefined;
  isCancelled: () => boolean;
  setLocalUrl: (imageId: string, localUrl: string) => void;
  emitImageAttached: (event: ImageAttachedEvent) => void;
  emitBatchProgress: (batchId: string) => void;
  drainQueue: () => void;
  enrichWithReverseGeocode: (imageId: string) => Promise<void>;
  enrichWithForwardGeocode: (
    imageId: string,
    titleAddress: string,
  ) => Promise<{ coords: ExifCoords } | undefined>;
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

export async function runAttachPostUpdate(args: RunAttachPostUpdateArgs): Promise<void> {
  const {
    jobId,
    storagePath,
    hadExistingCoords,
    isAttachKeep,
    finalCoords,
    direction,
    updatedJob,
    setPhase,
    updateJob,
    markDone,
    findJob,
    isCancelled,
    setLocalUrl,
    emitImageAttached,
    emitBatchProgress,
    drainQueue,
    enrichWithReverseGeocode,
    enrichWithForwardGeocode,
    log,
    warn,
  } = args;

  updateJob({ imageId: updatedJob.targetImageId, coords: finalCoords, direction });

  await runAttachEnrichment({
    isAttachKeep,
    finalCoords,
    titleAddress: updatedJob.titleAddress,
    targetImageId: updatedJob.targetImageId!,
    setPhase: (phase) => setPhase(phase),
    enrichWithReverseGeocode,
    enrichWithForwardGeocode,
    updateCoords: (coords) => updateJob({ coords }),
  });

  setPhase('complete');
  markDone();

  const finalJob = findJob();
  if (!finalJob) {
    return;
  }

  finalizeAttachCompletion({
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
  });
}
