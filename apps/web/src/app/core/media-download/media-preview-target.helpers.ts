import { mediaFileIdentityFromRecord } from '../media/media-file-identity.helpers';
import type { MediaFileIdentity } from '../media/media-renderer.types';
import type { MediaPreviewRequest } from './media-download.types';
import type { MediaTier } from '../media/media-renderer.types';
import { tierToMediaSize } from './media-download.helpers';

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
 * Preview signing path: low tiers may use pre-generated thumbnail_path; detail/full tiers
 * must sign storage_path so Supabase transforms apply (thumb files are ~96–256px).
 * @see docs/specs/service/media-download-service/media-download-service.md
 */
export function resolvePreviewTarget(request: MediaPreviewRequest, tier: MediaTier): string | null {
  const thumb = request.thumbnailPath?.trim();
  const storagePath = request.storagePath?.trim();
  const signingSize = tierToMediaSize(tier);

  if (signingSize === 'detail' || signingSize === 'full') {
    if (storagePath && isImageLikeStoragePath(storagePath)) {
      return storagePath;
    }
    return thumb ?? null;
  }

  if (thumb) {
    return thumb;
  }

  if (!storagePath || !isImageLikeStoragePath(storagePath)) {
    return null;
  }

  return storagePath;
}
