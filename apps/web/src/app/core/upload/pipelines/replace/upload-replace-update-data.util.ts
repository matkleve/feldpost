import type { ParsedExif } from '../../upload.service';

export function buildReplaceUpdateData(
  storagePath: string,
  parsedExif: ParsedExif,
  originalFilename?: string,
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    storage_path: storagePath,
    thumbnail_path: null,
  };
  if (originalFilename) {
    updateData['original_filename'] = originalFilename;
  }
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
  return updateData;
}
