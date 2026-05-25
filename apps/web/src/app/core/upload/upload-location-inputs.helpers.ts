import type { UploadJob } from './upload-manager.types';
import type { ParsedExif } from './upload.service';

/** @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md */
export function usesTextPlacementSource(job: UploadJob): boolean {
  return job.locationSourceUsed === 'file' || job.locationSourceUsed === 'folder';
}

/** Strips GPS used for map placement while keeping EXIF metadata for insert columns. */
export function stripPlacementCoordsFromParsedExif(
  parsedExif: ParsedExif | undefined,
): ParsedExif | undefined {
  if (!parsedExif) {
    return parsedExif;
  }
  return { ...parsedExif, coords: undefined };
}

export function resolveUploadPhaseInputs(args: {
  job: UploadJob;
  manualCoords: ParsedExif['coords'];
  parsedExif: ParsedExif | undefined;
}): { coords: ParsedExif['coords']; parsedExif: ParsedExif | undefined } {
  const { job, manualCoords, parsedExif } = args;

  if (job.locationRequirementMode === 'optional') {
    return {
      coords: undefined,
      parsedExif: stripPlacementCoordsFromParsedExif(parsedExif),
    };
  }

  if (usesTextPlacementSource(job)) {
    return {
      coords: manualCoords,
      parsedExif: stripPlacementCoordsFromParsedExif(parsedExif),
    };
  }

  return { coords: manualCoords, parsedExif };
}

export function exifMetadataCoords(job: UploadJob): ParsedExif['coords'] {
  return job.parsedExif?.coords;
}
