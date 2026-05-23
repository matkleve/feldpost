import { resolveFileType } from '../media/file-type-registry';
import { mediaFileIdentityFromRecord } from '../media/media-file-identity.helpers';
import { requiresServerPreviewGeneration } from '../media/office-preview-eligibility.helpers';
import type { MediaPreviewGenerationService } from '../media-thumbnail/media-preview-generation.service';
import type { MediaDownloadService } from '../media-download/media-download.service';
import type { MediaThumbnailPersistenceService } from '../media-thumbnail/media-thumbnail-persistence.service';
import type { UploadJob } from './upload-manager.types';

function organizationIdFromStoragePath(storagePath: string): string | undefined {
  const segment = storagePath.split('/').filter(Boolean)[0];
  return segment?.length ? segment : undefined;
}

type PersistUploadThumbnailArgs = {
  job: UploadJob;
  userId: string;
  persistence: MediaThumbnailPersistenceService;
  mediaDownload: MediaDownloadService;
  previewGeneration?: MediaPreviewGenerationService;
};

/**
 * Persists client-generated preview blob to storage + `thumbnail_path` (PDF/images v1).
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.data.md
 */
export async function persistUploadJobThumbnailIfNeeded(
  args: PersistUploadThumbnailArgs,
): Promise<void> {
  const { job, userId, persistence, mediaDownload, previewGeneration } = args;

  if (!job.mediaId || !job.thumbnailUrl || !job.storagePath) {
    return;
  }

  const organizationId = organizationIdFromStoragePath(job.storagePath);
  if (!organizationId) {
    return;
  }

  const fileType = resolveFileType(
    mediaFileIdentityFromRecord({
      storage_path: job.storagePath,
      original_filename: job.file.name,
    }),
  );

  if (requiresServerPreviewGeneration(fileType)) {
    if (job.mediaId && previewGeneration) {
      await previewGeneration.enqueue(job.mediaId, 'idle');
    }
    return;
  }

  const isPhoto = fileType.category === 'image';
  const isPdf = fileType.id === 'pdf';
  if (!isPhoto && !isPdf) {
    return;
  }

  const response = await fetch(job.thumbnailUrl);
  if (!response.ok) {
    return;
  }

  const previewBlob = await response.blob();
  const result = await persistence.persistMasterPreview({
    mediaId: job.mediaId,
    organizationId,
    userId,
    sourceStoragePath: job.storagePath,
    previewBlob,
    photoThumb: isPhoto,
  });

  if (result.ok) {
    mediaDownload.invalidate(job.mediaId);
    mediaDownload.registerPreviewPaths(job.mediaId, job.storagePath, result.thumbnailPath);
  }
}
