import { Injectable, inject } from '@angular/core';
import type { PreviewGenerationStatus } from '../media/preview-generation-status.types';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Enqueues server-side Office preview generation (Gotenberg via Edge Function).
 * @see docs/architecture/media-preview-converter.md
 */
@Injectable({ providedIn: 'root' })
export class MediaPreviewGenerationService {
  private readonly supabase = inject(SupabaseService);
  private readonly inFlight = new Set<string>();

  /**
   * Sets `pending` and invokes `generate-media-preview` (idempotent for pending/ready).
   */
  async enqueue(mediaId: string, currentStatus: PreviewGenerationStatus | null | undefined): Promise<void> {
    const status = currentStatus ?? 'idle';
    if (status === 'pending' || status === 'ready' || status === 'failed') {
      return;
    }
    if (this.inFlight.has(mediaId)) {
      return;
    }

    this.inFlight.add(mediaId);
    try {
      const { error: pendingError } = await this.supabase.client
        .from('media_items')
        .update({ preview_generation_status: 'pending' })
        .eq('id', mediaId);

      if (pendingError) {
        console.warn('[media-preview-generation] pending update failed', pendingError.message);
        return;
      }

      const { error: invokeError } = await this.supabase.client.functions.invoke(
        'generate-media-preview',
        { body: { mediaId } },
      );

      if (invokeError) {
        console.warn('[media-preview-generation] invoke failed', invokeError.message);
        await this.supabase.client
          .from('media_items')
          .update({ preview_generation_status: 'failed' })
          .eq('id', mediaId);
      }
    } finally {
      this.inFlight.delete(mediaId);
    }
  }
}
