import type { UploadJob } from './upload-manager.types';
import type { ExifCoords } from './upload.types';

type FinalizeNewUploadPhaseArgs = {
  jobId: string;
  isCancelled: () => boolean;
  findJob: () => UploadJob | undefined;
  setPhase: (
    phase: 'resolving_address' | 'resolving_coordinates' | 'missing_data' | 'complete',
  ) => void;
  updateJob: (patch: Partial<UploadJob>) => void;
  markDone: () => void;
  emitBatchProgress: (batchId: string) => void;
  drainQueue: () => void;
  enrichWithReverseGeocode: (imageId: string) => Promise<void>;
  enrichWithForwardGeocode: (
    imageId: string,
    titleAddress: string,
  ) => Promise<{ coords: ExifCoords } | undefined>;
  geocodeTitleAddress: (titleAddress: string) => Promise<ExifCoords | undefined>;
  mismatchToleranceMeters: number;
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
    geocodeTitleAddress,
    mismatchToleranceMeters,
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

  // Post-save enrichment policy:
  // Spec context:
  // - docs/element-specs/upload-manager-pipeline.md (Action 5 and Action 6)
  // - docs/element-specs/location-path-parser.md (soft mismatch handling)
  // - If we have GPS coords and no title address, do reverse geocoding (coords -> address).
  // - If we have a title address and no coords, do forward geocoding (address -> coords).
  // - If both are present, keep existing upload result as-is in this phase.
  //   Reconciliation/mismatch handling is intentionally separated from this finalization step.
  if (updatedJob.coords && !updatedJob.titleAddress) {
    setPhase('resolving_address');
    await enrichWithReverseGeocode(updatedJob.imageId!);
  } else if (updatedJob.coords && updatedJob.titleAddress) {
    // Reconciliation branch: compare EXIF coordinates with geocoded title address.
    // Upload remains successful even on mismatch; we persist audit information only.
    // 15m tolerance follows the pipeline spec mismatch threshold.
    setPhase('resolving_coordinates');
    const titleCoords = await geocodeTitleAddress(updatedJob.titleAddress);
    if (titleCoords) {
      const distanceMeters = haversineMeters(updatedJob.coords, titleCoords);
      updateJob({
        titleAddressCoords: titleCoords,
        locationMismatchMeters:
          distanceMeters > mismatchToleranceMeters ? Math.round(distanceMeters) : undefined,
      });
      if (distanceMeters > mismatchToleranceMeters) {
        console.warn('[upload-new] location source mismatch detected', {
          jobId,
          imageId: updatedJob.imageId,
          exifCoords: updatedJob.coords,
          titleAddress: updatedJob.titleAddress,
          titleAddressCoords: titleCoords,
          distanceMeters,
          toleranceMeters: mismatchToleranceMeters,
        });
      }
    }
  } else if (updatedJob.titleAddress && !updatedJob.coords) {
    setPhase('resolving_coordinates');
    const enrichResult = await enrichWithForwardGeocode(
      updatedJob.imageId!,
      updatedJob.titleAddress,
    );
    if (enrichResult) {
      updateJob({ coords: enrichResult.coords });
    } else if (updatedJob.locationRequirementMode === 'required') {
      const mimeType = updatedJob.file.type.toLowerCase();
      const isDocument = mimeType.startsWith('application/') || mimeType.startsWith('text/');
      updateJob({
        issueKind: isDocument ? 'document_unresolved' : 'missing_gps',
        locationSourceUsed: 'none',
      });
      setPhase('missing_data');
      markDone();
      emitBatchProgress(updatedJob.batchId);
      drainQueue();
      return;
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

function haversineMeters(a: ExifCoords, b: ExifCoords): number {
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return 6371000 * c;
}
