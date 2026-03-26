import type { UploadJob } from './upload-manager.types';
import type { ParsedExif } from './upload.service';

type BuildAttachUpdateDataArgs = {
  storagePath: string;
  parsedExif: ParsedExif;
  hadExistingCoords: boolean;
  conflictResolution: UploadJob['conflictResolution'];
};

export function buildAttachUpdateData(args: BuildAttachUpdateDataArgs): {
  updateData: Record<string, unknown>;
  isAttachKeep: boolean;
} {
  const { storagePath, parsedExif, hadExistingCoords, conflictResolution } = args;
  const isAttachKeep = conflictResolution === 'attach_keep';

  const updateData: Record<string, unknown> = {
    storage_path: storagePath,
    thumbnail_path: null,
  };

  if (parsedExif.coords) {
    updateData['exif_latitude'] = parsedExif.coords.lat;
    updateData['exif_longitude'] = parsedExif.coords.lng;
  }
  if (parsedExif.capturedAt) {
    updateData['captured_at'] = parsedExif.capturedAt;
  }
  if (parsedExif.direction != null) {
    updateData['direction'] = parsedExif.direction;
  }

  if (!hadExistingCoords && parsedExif.coords && !isAttachKeep) {
    updateData['latitude'] = parsedExif.coords.lat;
    updateData['longitude'] = parsedExif.coords.lng;
  } else if (conflictResolution === 'attach_replace' && parsedExif.coords) {
    updateData['latitude'] = parsedExif.coords.lat;
    updateData['longitude'] = parsedExif.coords.lng;
  }

  return { updateData, isAttachKeep };
}
