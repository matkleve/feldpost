import { computeContentHash, readFileHead } from './content-hash.util';
import type { ParsedExif } from './upload.service';

export async function computeAttachContentHash(
  file: File,
  parsedExif: ParsedExif,
): Promise<string> {
  const fileHead = await readFileHead(file);
  return computeContentHash({
    fileHeadBytes: fileHead,
    fileSize: file.size,
    gpsCoords: parsedExif.coords
      ? { lat: parsedExif.coords.lat, lng: parsedExif.coords.lng }
      : undefined,
    capturedAt: parsedExif.capturedAt?.toISOString(),
    direction: parsedExif.direction,
  });
}
