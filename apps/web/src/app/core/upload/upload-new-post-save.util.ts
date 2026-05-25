import type { UploadJob } from './upload-manager.types';
import type { ExifCoords } from './upload.types';
import {
  exifMetadataCoords,
  usesTextPlacementSource,
} from './upload-location-inputs.helpers';

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
  enrichWithReverseGeocode: (mediaId: string) => Promise<void>;
  enrichWithForwardGeocode: (
    mediaId: string,
    titleAddress: string,
  ) => Promise<{ coords: ExifCoords } | undefined>;
  geocodeTitleAddress: (titleAddress: string) => Promise<ExifCoords | undefined>;
  mismatchToleranceMeters: number;
  setLocalUrl: (mediaId: string, localUrl: string) => void;
  persistThumbnail?: (job: UploadJob) => Promise<void>;
  emitImageUploaded: (event: {
    jobId: string;
    batchId: string;
    mediaId: string;
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
    persistThumbnail,
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

  // @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md
  if (updatedJob.locationRequirementMode === 'optional') {
    setPhase('complete');
    markDone();
    emitCompletion({
      jobId,
      finalJob: updatedJob,
      setLocalUrl,
      persistThumbnail,
      emitImageUploaded,
      emitBatchProgress,
      drainQueue,
    });
    return;
  }

  const titleAddress = updatedJob.titleAddress?.trim();
  const textPlacement = usesTextPlacementSource(updatedJob) && !!titleAddress;
  const exifCoords = exifMetadataCoords(updatedJob);

  if (textPlacement && titleAddress) {
    setPhase('resolving_coordinates');
    const enrichResult = await enrichWithForwardGeocode(updatedJob.mediaId!, titleAddress);
    if (enrichResult) {
      updateJob({ coords: enrichResult.coords });
    } else if (updatedJob.locationRequirementMode === 'required') {
      await routeUnresolvedAfterFailedGeocode({
        updatedJob,
        jobId,
        setPhase,
        updateJob,
        markDone,
        emitBatchProgress,
        drainQueue,
      });
      return;
    }

    if (exifCoords) {
      const placedCoords = findJob()?.coords ?? enrichResult?.coords;
      if (placedCoords) {
        await auditTitleExifMismatch({
          jobId,
          updatedJob: findJob() ?? updatedJob,
          placedCoords,
          exifCoords,
          titleAddress,
          geocodeTitleAddress,
          mismatchToleranceMeters,
          setPhase,
          updateJob,
        });
      }
    }
  } else if (updatedJob.coords && !titleAddress) {
    setPhase('resolving_address');
    await enrichWithReverseGeocode(updatedJob.mediaId!);
  } else if (updatedJob.titleAddress && !updatedJob.coords) {
    setPhase('resolving_coordinates');
    const enrichResult = await enrichWithForwardGeocode(
      updatedJob.mediaId!,
      updatedJob.titleAddress,
    );
    if (enrichResult) {
      updateJob({ coords: enrichResult.coords });
    } else if (updatedJob.locationRequirementMode === 'required') {
      await routeUnresolvedAfterFailedGeocode({
        updatedJob,
        jobId,
        setPhase,
        updateJob,
        markDone,
        emitBatchProgress,
        drainQueue,
      });
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
    persistThumbnail,
    emitImageUploaded,
    emitBatchProgress,
    drainQueue,
  });
}

async function auditTitleExifMismatch(args: {
  jobId: string;
  updatedJob: UploadJob;
  placedCoords: ExifCoords;
  exifCoords: ExifCoords;
  titleAddress: string;
  geocodeTitleAddress: (titleAddress: string) => Promise<ExifCoords | undefined>;
  mismatchToleranceMeters: number;
  setPhase: FinalizeNewUploadPhaseArgs['setPhase'];
  updateJob: FinalizeNewUploadPhaseArgs['updateJob'];
}): Promise<void> {
  const {
    jobId,
    updatedJob,
    placedCoords,
    exifCoords,
    titleAddress,
    geocodeTitleAddress,
    mismatchToleranceMeters,
    setPhase,
    updateJob,
  } = args;

  setPhase('resolving_coordinates');
  const titleCoords = await geocodeTitleAddress(titleAddress);
  const compareCoords = titleCoords ?? placedCoords;
  const distanceMeters = haversineMeters(exifCoords, compareCoords);
  updateJob({
    titleAddressCoords: compareCoords,
    locationMismatchMeters:
      distanceMeters > mismatchToleranceMeters ? Math.round(distanceMeters) : undefined,
  });
  if (distanceMeters > mismatchToleranceMeters) {
    console.warn('[upload-new] location source mismatch detected', {
      jobId,
      mediaId: updatedJob.mediaId,
      exifCoords,
      titleAddress,
      titleAddressCoords: compareCoords,
      distanceMeters,
      toleranceMeters: mismatchToleranceMeters,
    });
  }
}

async function routeUnresolvedAfterFailedGeocode(args: {
  updatedJob: UploadJob;
  jobId: string;
  setPhase: FinalizeNewUploadPhaseArgs['setPhase'];
  updateJob: FinalizeNewUploadPhaseArgs['updateJob'];
  markDone: () => void;
  emitBatchProgress: (batchId: string) => void;
  drainQueue: () => void;
}): Promise<void> {
  const { updatedJob, jobId, setPhase, updateJob, markDone, emitBatchProgress, drainQueue } =
    args;
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
}

export function emitCompletion(args: {
  jobId: string;
  finalJob: UploadJob;
  setLocalUrl: (mediaId: string, localUrl: string) => void;
  persistThumbnail?: (job: UploadJob) => Promise<void>;
  emitImageUploaded: (event: {
    jobId: string;
    batchId: string;
    mediaId: string;
    coords?: ExifCoords;
    direction?: number;
    thumbnailUrl?: string;
  }) => void;
  emitBatchProgress: (batchId: string) => void;
  drainQueue: () => void;
}): void {
  const { jobId, finalJob, setLocalUrl, persistThumbnail, emitImageUploaded, emitBatchProgress, drainQueue } =
    args;

  if (finalJob.thumbnailUrl && finalJob.mediaId) {
    setLocalUrl(finalJob.mediaId, finalJob.thumbnailUrl);
  }

  if (persistThumbnail && finalJob.mediaId && finalJob.thumbnailUrl) {
    void persistThumbnail(finalJob);
  }

  emitImageUploaded({
    jobId,
    batchId: finalJob.batchId,
    mediaId: finalJob.mediaId!,
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
