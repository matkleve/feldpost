import type { MediaRecord } from '../media-query/media-query.types';
import type { MediaFileIdentity } from './media-renderer.types';

/** @see docs/specs/service/media-download-service/media-download-service.md */
export type MediaFileIdentityRecordInput = Pick<
  MediaRecord,
  'storage_path' | 'original_filename'
>;

/**
 * Builds `MediaFileIdentity` for registry lookup. Extension from `storage_path` wins over
 * `original_filename` when both disagree.
 */
export function mediaFileIdentityFromRecord(
  record: MediaFileIdentityRecordInput,
): MediaFileIdentity {
  const storagePath = record.storage_path?.trim() ?? '';
  const originalFilename = record.original_filename?.trim() ?? '';

  const pathExt = extensionFromPath(storagePath);
  const nameExt = extensionFromFileName(originalFilename);

  const extension = pathExt ?? nameExt;
  const fileName =
    originalFilename.length > 0
      ? originalFilename
      : storagePath.length > 0
        ? basename(storagePath)
        : undefined;

  return {
    extension: extension ?? undefined,
    fileName: fileName || undefined,
  };
}

function extensionFromPath(storagePath: string): string | null {
  if (!storagePath) {
    return null;
  }
  return extensionFromFileName(basename(storagePath));
}

function extensionFromFileName(fileName: string): string | null {
  if (!fileName || !fileName.includes('.')) {
    return null;
  }
  const ext = fileName.split('.').pop();
  if (!ext) {
    return null;
  }
  const normalized = ext.trim().toLowerCase();
  return normalized.startsWith('.') ? normalized.slice(1) : normalized;
}

function basename(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts.length > 0 ? (parts[parts.length - 1] ?? '') : path;
}
