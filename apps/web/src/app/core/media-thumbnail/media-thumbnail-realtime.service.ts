import { DestroyRef, Injectable, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { MediaDownloadService } from '../media-download/media-download.service';
import { SupabaseService } from '../supabase/supabase.service';

export type MediaThumbnailRealtimePatch = {
  readonly mediaId: string;
  readonly thumbnailPath: string;
};

/**
 * Realtime-only refresh when `media_items.thumbnail_path` is set (no polling).
 * @see docs/specs/component/media/media-content.md
 */
@Injectable({ providedIn: 'root' })
export class MediaThumbnailRealtimeService {
  private readonly supabase = inject(SupabaseService);
  private readonly mediaDownload = inject(MediaDownloadService);
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
          const row = payload.new as { id?: string; thumbnail_path?: string | null };
          if (!row.id || !row.thumbnail_path) {
            return;
          }
          this.mediaDownload.invalidate(row.id);
          this.updatesSubject.next({ mediaId: row.id, thumbnailPath: row.thumbnail_path });
        },
      )
      .subscribe();

    destroyRef.onDestroy(() => {
      void channel.unsubscribe();
      this.subscribed = false;
    });
  }
}
