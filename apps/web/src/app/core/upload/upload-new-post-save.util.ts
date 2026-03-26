import type { UploadJob } from './upload-manager.types';
import type { ExifCoords } from './upload.types';

type FinalizeNewUploadPhaseArgs = {
  jobId: string;
  isCancelled: () => boolean;
  findJob: () => UploadJob | undefined;
  setPhase: (phase: 'resolving_address' | 'resolving_coordinates' | 'complete') => void;
  updateJob: (patch: Partial<UploadJob>) => void;
  markDone: () => void;
  emitBatchProgress: (batchId: string) => void;
  drainQueue: () => void;
  enrichWithReverseGeocode: (imageId: string) => Promise<void>;
  enrichWithForwardGeocode: (
    imageId: string,
    titleAddress: string,
  ) => Promise<{ coords: ExifCoords } | undefined>;
  setLocalUrl: (imageId: string, localUrl: string) => void;
  emitImageUploaded: (event: {
    jobId: string;
    batchId: string;
    imageId: string;
    coords?: ExifCoords;
    direction?: number;
    thumbnailUrl?: string;
  }) => void;
};

export async function finalizeNewUploadPhase(args: FinalizeNewUploadPhaseArgs): Promise<void> {
  const {
    jobId,
    isCancelled,
    findJob,
    setPhase,
    updateJob,
    markDone,
    emitBatchProgress,
    drainQueue,
    enrichWithReverseGeocode,
    enrichWithForwardGeocode,
    setLocalUrl,
    emitImageUploaded,
  } = args;

  const updatedJob = findJob();
  if (!updatedJob) return;
  if (isCancelled()) {
    markDone();
    emitBatchProgress(updatedJob.batchId);
    drainQueue();
    return;
  }

  if (updatedJob.coords && !updatedJob.titleAddress) {
    setPhase('resolving_address');
    await enrichWithReverseGeocode(updatedJob.imageId!);
  } else if (updatedJob.titleAddress && !updatedJob.coords) {
    setPhase('resolving_coordinates');
    const enrichResult = await enrichWithForwardGeocode(
      updatedJob.imageId!,
      updatedJob.titleAddress,
    );
    if (enrichResult) {
      updateJob({ coords: enrichResult.coords });
    }
  }

  setPhase('complete');
  markDone();

  const finalJob = findJob();
  if (!finalJob) return;
  if (isCancelled()) {
    emitBatchProgress(finalJob.batchId);
    drainQueue();
    return;
  }

  emitCompletion({
    jobId,
    finalJob,
    setLocalUrl,
    emitImageUploaded,
    emitBatchProgress,
    drainQueue,
  });
}

function emitCompletion(args: {
  jobId: string;
  finalJob: UploadJob;
  setLocalUrl: (imageId: string, localUrl: string) => void;
  emitImageUploaded: (event: {
    jobId: string;
    batchId: string;
    imageId: string;
    coords?: ExifCoords;
    direction?: number;
    thumbnailUrl?: string;
  }) => void;
  emitBatchProgress: (batchId: string) => void;
  drainQueue: () => void;
}): void {
  const { jobId, finalJob, setLocalUrl, emitImageUploaded, emitBatchProgress, drainQueue } = args;

  if (finalJob.thumbnailUrl && finalJob.imageId) {
    setLocalUrl(finalJob.imageId, finalJob.thumbnailUrl);
  }

  emitImageUploaded({
    jobId,
    batchId: finalJob.batchId,
    imageId: finalJob.imageId!,
    coords: finalJob.coords,
    direction: finalJob.direction,
    thumbnailUrl: finalJob.thumbnailUrl,
  });

  emitBatchProgress(finalJob.batchId);
  drainQueue();
}
