import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkerConfig } from './config.js';
import { getMediaItemPreview, setPreviewStatus, updateReady } from './db.js';
import { convertOfficeToPdf } from './libreoffice.js';
import { isOfficeMime, isPdfMime, isWorkerEligibleMime } from './mime-allowlist.js';
import { buildThumbnailStoragePath } from './paths.js';
import { rasterizePdfFirstPageToWebp } from './pdf-rasterize.js';
import { downloadSourceFile, uploadThumbnail } from './storage.js';

export type GenerateThumbnailInput = {
  mediaId: string;
  storagePath: string;
  mimeType: string;
  organizationId: string;
  userId: string;
};

export type GenerateThumbnailResult =
  | { thumbnailStoragePath: string }
  | { error: string };

export async function generateThumbnail(
  client: SupabaseClient,
  config: WorkerConfig,
  input: GenerateThumbnailInput,
): Promise<GenerateThumbnailResult> {
  const { mediaId, storagePath, mimeType, organizationId } = input;

  try {
    const existing = await getMediaItemPreview(client, mediaId);
    if (!existing) {
      return { error: 'Media item not found' };
    }

    if (existing.thumbnail_path?.trim()) {
      return { thumbnailStoragePath: existing.thumbnail_path.trim() };
    }

    if (!isWorkerEligibleMime(mimeType, storagePath)) {
      return { error: `Unsupported mime type for thumbnail worker: ${mimeType || '(empty)'}` };
    }

    await setPreviewStatus(client, mediaId, 'pending');

    const sourceBytes = await downloadSourceFile(client, config, storagePath);

    let pdfBytes: Buffer;
    if (isOfficeMime(mimeType, storagePath)) {
      const fileName = storagePath.split('/').pop() ?? 'document';
      pdfBytes = await convertOfficeToPdf(sourceBytes, fileName);
    } else if (isPdfMime(mimeType, storagePath)) {
      pdfBytes = sourceBytes;
    } else {
      throw new Error('Unsupported file type after eligibility check');
    }

    const webpBytes = await rasterizePdfFirstPageToWebp(pdfBytes);

    const thumbnailStoragePath = buildThumbnailStoragePath(storagePath, organizationId);
    await uploadThumbnail(client, config, thumbnailStoragePath, webpBytes);
    await updateReady(client, mediaId, thumbnailStoragePath);

    return { thumbnailStoragePath };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await setPreviewStatus(client, mediaId, 'failed');
    } catch (statusErr) {
      console.error('[thumbnail-worker] failed to mark status failed', statusErr);
    }
    return { error: message };
  }
}
