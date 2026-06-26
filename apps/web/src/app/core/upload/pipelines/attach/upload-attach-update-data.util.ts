import type { UploadJob } from '../../upload-manager.types';
import type { ParsedExif } from '../../upload.service';

type BuildAttachUpdateDataArgs = {
  storagePath: string;
  parsedExif: ParsedExif;
  originalFilename: string;
  hadExistingCoords: boolean;
  conflictResolution: UploadJob['conflictResolution'];
};

export function buildAttachUpdateData(args: BuildAttachUpdateDataArgs): {
  updateData: Record<string, unknown>;
  isAttachKeep: boolean;
} {
  const { storagePath, parsedExif, originalFilename, hadExistingCoords, conflictResolution } = args;
  const isAttachKeep = conflictResolution === 'attach_keep';

  const updateData: Record<string, unknown> = {
    storage_path: storagePath,
    thumbnail_path: null,
    original_filename: originalFilename,
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

  // Resolved GPS/address is written via resolve_media_location -> locations + links (not media_items).

  return { updateData, isAttachKeep };
}
