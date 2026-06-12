import { Injectable, inject } from '@angular/core';
import type { PreviewGenerationStatus } from '../media/preview-generation-status.types';
import { MediaDownloadService } from '../media-download/media-download.service';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Enqueues server-side Office preview generation (Gotenberg via Edge Function).
 * @see docs/architecture/media-preview-converter.md
 */
@Injectable({ providedIn: 'root' })
export class MediaPreviewGenerationService {
  private readonly supabase = inject(SupabaseService);
  private readonly mediaDownload = inject(MediaDownloadService);
  private readonly inFlight = new Set<string>();

  /**
   * Sets `pending` and invokes `generate-media-preview` (idempotent for pending/ready).
   */
  async enqueue(mediaId: string, currentStatus: PreviewGenerationStatus | null | undefined): Promise<void> {
    let status = currentStatus ?? 'idle';
    if (status === 'pending' || status === 'ready') {
      return;
    }
    if (this.inFlight.has(mediaId)) {
      return;
    }

    this.inFlight.add(mediaId);
    try {
      if (status === 'failed') {
        const { error: resetError } = await this.supabase.client
          .from('media_items')
          .update({ preview_generation_status: 'idle' })
          .eq('id', mediaId);
        if (resetError) {
          console.warn('[media-preview-generation] failed reset failed', resetError.message);
          return;
        }
        status = 'idle';
      }

      const { error: pendingError } = await this.supabase.client
        .from('media_items')
        .update({ preview_generation_status: 'pending' })
        .eq('id', mediaId);

      if (pendingError) {
        console.warn('[media-preview-generation] pending update failed', pendingError.message);
        return;
      }

      this.mediaDownload.notifyPreviewGenerationStatus(mediaId, 'pending');

      const { data, error: invokeError } = await this.supabase.client.functions.invoke(
        'generate-media-preview',
        { body: { mediaId } },
      );

      if (invokeError) {
        console.warn('[media-preview-generation] invoke failed', invokeError.message, data);
        await this.supabase.client
          .from('media_items')
          .update({ preview_generation_status: 'failed' })
          .eq('id', mediaId);
        this.mediaDownload.notifyPreviewGenerationStatus(mediaId, 'failed');
        return;
      }

      const result = data as { ok?: boolean; thumbnailPath?: string } | null;
      if (result?.thumbnailPath) {
        this.mediaDownload.invalidate(mediaId);
      }
    } finally {
      this.inFlight.delete(mediaId);
    }
  }
}
