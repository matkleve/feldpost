import { computeUploadContentHash } from '../../support/content-hash.util';
import type { ParsedExif } from '../../upload.types';
import type { MediaType } from '../../support/upload-file-types';

export async function computeAttachContentHash(
  file: File,
  parsedExif: ParsedExif,
  mediaType: MediaType,
): Promise<string> {
  const result = await computeUploadContentHash(file, parsedExif, mediaType);
  return result.contentHash;
}
