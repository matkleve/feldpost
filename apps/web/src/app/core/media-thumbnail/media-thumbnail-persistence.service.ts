import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  PersistMasterPreviewInput,
  PersistMasterPreviewResult,
} from './media-thumbnail-persistence.types';

const DOCUMENT_LONG_EDGE_PX = 512;
const PHOTO_THUMB_PX = 128;
const WEBP_QUALITY = 0.85;

/**
 * Sole writer for `media_items.thumbnail_path` from client-generated master rasters.
 * @see docs/architecture/media-preview-converter.md
 */
@Injectable({ providedIn: 'root' })
export class MediaThumbnailPersistenceService {
  private readonly supabase = inject(SupabaseService);

  async persistMasterPreview(input: PersistMasterPreviewInput): Promise<PersistMasterPreviewResult> {
    const normalized = input.photoThumb
      ? await this.normalizePhotoJpeg(input.previewBlob)
      : await this.normalizeDocumentWebp(input.previewBlob);

    if (!normalized) {
      return { ok: false, message: 'Failed to encode preview image.' };
    }

    const ext = input.photoThumb ? 'jpg' : 'webp';
    const contentType = input.photoThumb ? 'image/jpeg' : 'image/webp';
    const storagePath = this.buildThumbPath(input.sourceStoragePath, input.organizationId, ext);

    const { error: uploadError } = await this.supabase.client.storage
      .from('media')
      .upload(storagePath, normalized, { contentType, upsert: true });

    if (uploadError) {
      return { ok: false, message: uploadError.message };
    }

    const { error: updateError } = await this.supabase.client
      .from('media_items')
      .update({ thumbnail_path: storagePath })
      .eq('id', input.mediaId);

    if (updateError) {
      return { ok: false, message: updateError.message };
    }

    return { ok: true, thumbnailPath: storagePath };
  }

  private buildThumbPath(sourceStoragePath: string, organizationId: string, ext: string): string {
    const parts = sourceStoragePath.split('/').filter(Boolean);
    const fileName = parts[parts.length - 1] ?? 'file';
    const stem = fileName.includes('.') ? fileName.slice(0, fileName.lastIndexOf('.')) : fileName;
    const userId = parts.length >= 2 ? parts[1] : 'unknown';
    return `${organizationId}/${userId}/${stem}_thumb.${ext}`;
  }

  private async normalizeDocumentWebp(blob: Blob): Promise<Blob | null> {
    return this.renderToBlob(blob, DOCUMENT_LONG_EDGE_PX, 'image/webp', WEBP_QUALITY);
  }

  private async normalizePhotoJpeg(blob: Blob): Promise<Blob | null> {
    return this.renderToBlob(blob, PHOTO_THUMB_PX, 'image/jpeg', 0.9);
  }

  private renderToBlob(
    blob: Blob,
    longEdgePx: number,
    mimeType: string,
    quality: number,
  ): Promise<Blob | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(url);
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        if (width <= 0 || height <= 0) {
          resolve(null);
          return;
        }

        const scale = longEdgePx / Math.max(width, height);
        const targetW = Math.max(1, Math.round(width * scale));
        const targetH = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }

        if (mimeType === 'image/webp') {
          ctx.fillStyle = '#f5f3ef';
          ctx.fillRect(0, 0, targetW, targetH);
        }

        ctx.drawImage(image, 0, 0, targetW, targetH);
        canvas.toBlob((result) => resolve(result), mimeType, quality);
      };

      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      image.src = url;
    });
  }
}
