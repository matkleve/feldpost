import { mediaFileIdentityFromRecord } from '../media/media-file-identity.helpers';
import type { MediaFileIdentity } from '../media/media-renderer.types';
import type { MediaPreviewRequest } from './media-download.types';
import type { MediaTier } from '../media/media-renderer.types';

const IMAGE_LIKE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'heic',
  'heif',
  'avif',
]);

/**
 * True when storage_path can be shown in an img preview with tier transforms.
 * @see docs/specs/service/media-download-service/media-download-service.md
 */
export function isImageLikeStorageIdentity(identity: MediaFileIdentity): boolean {
  const ext = identity.extension?.toLowerCase().trim();
  return ext != null && IMAGE_LIKE_EXTENSIONS.has(ext);
}

export function isImageLikeStoragePath(
  storagePath: string | null | undefined,
  originalFilename?: string | null,
): boolean {
  return isImageLikeStorageIdentity(
    mediaFileIdentityFromRecord({
      storage_path: storagePath ?? null,
      original_filename: originalFilename ?? null,
    }),
  );
}

/**
 * Unified preview signing target: thumbnail wins, else image-like storage with tier ladder.
 * @see docs/specs/service/media-download-service/media-download-service.md
 */
export function resolvePreviewTarget(request: MediaPreviewRequest, tier: MediaTier): string | null {
  const thumb = request.thumbnailPath?.trim();
  if (thumb) {
    return thumb;
  }

  const storagePath = request.storagePath?.trim();
  if (!storagePath) {
    return null;
  }

  const identity = mediaFileIdentityFromRecord({
    storage_path: storagePath,
    original_filename: null,
  });

  if (!isImageLikeStorageIdentity(identity)) {
    return null;
  }

  return storagePath;
}
