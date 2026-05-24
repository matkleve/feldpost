import { DestroyRef, Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { normalizePreviewGenerationStatus } from '../media/preview-generation-status.types';
import type { PreviewGenerationStatus } from '../media/preview-generation-status.types';
import { MediaDownloadService } from '../media-download/media-download.service';
import { SupabaseService } from '../supabase/supabase.service';
import { WorkspaceViewService } from '../workspace-view/workspace-view.service';

export type MediaThumbnailRealtimePatch = {
  readonly mediaId: string;
  readonly thumbnailPath: string | null;
  readonly previewGenerationStatus: PreviewGenerationStatus;
};

/**
 * Realtime-only refresh when `media_items.thumbnail_path` is set (no polling).
 * @see docs/specs/component/media/media-content.md
 */
@Injectable({ providedIn: 'root' })
export class MediaThumbnailRealtimeService {
  private readonly supabase = inject(SupabaseService);
  private readonly mediaDownload = inject(MediaDownloadService);
  private readonly workspaceView = inject(WorkspaceViewService);
  private readonly updatesSubject = new Subject<MediaThumbnailRealtimePatch>();
  private subscribed = false;

  readonly updates$ = this.updatesSubject.asObservable();

  connect(destroyRef: DestroyRef): void {
    if (this.subscribed) {
      return;
    }
    this.subscribed = true;

    const channel = this.supabase.client
      .channel('feldpost-media-thumbnail-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'media_items' },
        (payload) => {
          const row = payload.new as {
            id?: string;
            thumbnail_path?: string | null;
            preview_generation_status?: string | null;
          };
          if (!row.id) {
            return;
          }
          const thumbnailPath = row.thumbnail_path ?? null;
          const previewGenerationStatus = normalizePreviewGenerationStatus(
            row.preview_generation_status,
          );
          if (thumbnailPath) {
            this.mediaDownload.invalidate(row.id);
          }

          this.workspaceView.updateRawImages((images) =>
            images.map((img) =>
              img.id === row.id
                ? {
                    ...img,
                    thumbnailPath: thumbnailPath ?? img.thumbnailPath,
                    previewGenerationStatus,
                  }
                : img,
            ),
          );

          this.updatesSubject.next({
            mediaId: row.id,
            thumbnailPath,
            previewGenerationStatus,
          });
        },
      )
      .subscribe();

    destroyRef.onDestroy(() => {
      void channel.unsubscribe();
      this.subscribed = false;
    });
  }
}
