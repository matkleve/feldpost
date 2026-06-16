import { Injectable, inject } from '@angular/core';
import { MediaDownloadService } from '../../../../core/media-download/media-download.service';
import { MapPhotoMarkerRenderService } from './map-photo-marker-render.service';
import type { PhotoMarkerState } from './map-marker-reconcile.facade';
import type { MapInstance, MapLatLngBounds } from '../leaflet/map-leaflet.service';

type ThumbnailMarkerState = PhotoMarkerState & {
  thumbnailUrl?: string;
  thumbnailLoading?: boolean;
  signedAt?: number;
};

export interface ThumbnailLoaderContext {
  getMap(): MapInstance | undefined;
  getMarkers(): Map<string, ThumbnailMarkerState>;
}

@Injectable({ providedIn: 'root' })
export class MapThumbnailLoaderService {
  private readonly mediaDownloadService = inject(MediaDownloadService);
  private readonly markerRenderService = inject(MapPhotoMarkerRenderService);

  private ctx: ThumbnailLoaderContext | null = null;

  bind(ctx: ThumbnailLoaderContext): void {
    this.ctx = ctx;
  }

  maybeLoadThumbnails(): void {
    const map = this.ctx?.getMap();
    if (!map) return;

    const bounds = map.getBounds();
    const staleThreshold = 50 * 60 * 1000;

    this.mediaDownloadService.invalidateStale(staleThreshold);

    for (const [key, state] of this.ctx!.getMarkers()) {
      if (!this.isSingleMarkerInBounds(state, bounds)) continue;
      this.clearStaleThumbnailIfNeeded(state, staleThreshold);
      this.scheduleThumbnailLoadIfNeeded(key, state);
    }
  }

  private isSingleMarkerInBounds(
    state: { count: number; lat: number; lng: number },
    bounds: MapLatLngBounds,
  ): boolean {
    return state.count === 1 && bounds.contains([state.lat, state.lng]);
  }

  private clearStaleThumbnailIfNeeded(
    state: { thumbnailUrl?: string; signedAt?: number },
    staleThreshold: number,
  ): void {
    if (!state.thumbnailUrl || !state.signedAt) return;
    if (Date.now() - state.signedAt <= staleThreshold) return;
    state.thumbnailUrl = undefined;
    state.signedAt = undefined;
  }

  private scheduleThumbnailLoadIfNeeded(
    key: string,
    state: {
      thumbnailSourcePath?: string;
      thumbnailUrl?: string;
      thumbnailLoading?: boolean;
      signedAt?: number;
    },
  ): void {
    if (state.thumbnailUrl || !state.thumbnailSourcePath || state.thumbnailLoading) return;
    void this.lazyLoadThumbnail(key, state);
  }

  private async lazyLoadThumbnail(
    key: string,
    state: {
      mediaId?: string;
      thumbnailSourcePath?: string;
      thumbnailUrl?: string;
      thumbnailLoading?: boolean;
      signedAt?: number;
    },
  ): Promise<void> {
    if (!state.thumbnailSourcePath || state.thumbnailUrl || state.thumbnailLoading) return;

    state.thumbnailLoading = true;
    this.markerRenderService.refreshPhotoMarker(key);

    const mediaId = state.mediaId;
    if (mediaId) {
      const cached = this.mediaDownloadService.getCachedUrl(mediaId, 'marker');
      if (cached) {
        state.thumbnailLoading = false;
        state.thumbnailUrl = cached;
        state.signedAt = Date.now();
        this.markerRenderService.refreshPhotoMarker(key);
        return;
      }
    }

    const result = mediaId
      ? await this.mediaDownloadService.resolveMarkerPreview(mediaId, state.thumbnailSourcePath)
      : await this.mediaDownloadService.getSignedUrl(state.thumbnailSourcePath, 'marker');

    if (result.url) {
      const loaded = await this.mediaDownloadService.preload(result.url);
      state.thumbnailLoading = false;
      if (loaded) {
        state.thumbnailUrl = result.url;
        state.signedAt = Date.now();
      }
    } else {
      state.thumbnailLoading = false;
    }
    this.markerRenderService.refreshPhotoMarker(key);
  }
}
