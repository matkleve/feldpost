import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { PhotoLoadService } from '../../../core/photo-load.service';

interface ThumbnailState {
  count: number;
  lat: number;
  lng: number;
  thumbnailSourcePath?: string;
  thumbnailUrl?: string;
  thumbnailLoading?: boolean;
  signedAt?: number;
}

@Injectable({ providedIn: 'root' })
export class PhotoMarkerThumbnailService {
  constructor(private readonly photoLoadService: PhotoLoadService) {}

  maybeLoadThumbnails(params: {
    map: L.Map | undefined;
    uploadedPhotoMarkers: Map<string, ThumbnailState>;
    refreshPhotoMarker: (markerKey: string) => void;
  }): void {
    if (!params.map) {
      return;
    }

    const bounds = params.map.getBounds();
    const staleThreshold = 50 * 60 * 1000;

    this.photoLoadService.invalidateStale(staleThreshold);

    for (const [key, state] of params.uploadedPhotoMarkers) {
      if (!this.isSingleMarkerInBounds(state, bounds)) {
        continue;
      }

      this.clearStaleThumbnailIfNeeded(state, staleThreshold);
      if (state.thumbnailUrl || !state.thumbnailSourcePath || state.thumbnailLoading) {
        continue;
      }

      void this.lazyLoadThumbnail(key, state, params.refreshPhotoMarker);
    }
  }

  private isSingleMarkerInBounds(state: ThumbnailState, bounds: L.LatLngBounds): boolean {
    return state.count === 1 && bounds.contains([state.lat, state.lng]);
  }

  private clearStaleThumbnailIfNeeded(state: ThumbnailState, staleThreshold: number): void {
    if (!state.thumbnailUrl || !state.signedAt) {
      return;
    }
    if (Date.now() - state.signedAt <= staleThreshold) {
      return;
    }

    state.thumbnailUrl = undefined;
    state.signedAt = undefined;
  }

  private async lazyLoadThumbnail(
    markerKey: string,
    state: ThumbnailState,
    refreshPhotoMarker: (markerKey: string) => void,
  ): Promise<void> {
    if (!state.thumbnailSourcePath || state.thumbnailUrl || state.thumbnailLoading) {
      return;
    }

    state.thumbnailLoading = true;
    refreshPhotoMarker(markerKey);

    const result = await this.photoLoadService.getSignedUrl(state.thumbnailSourcePath, 'marker');

    if (result.url) {
      const loaded = await this.photoLoadService.preload(result.url);
      state.thumbnailLoading = false;
      if (loaded) {
        state.thumbnailUrl = result.url;
        state.signedAt = Date.now();
      }
    } else {
      state.thumbnailLoading = false;
    }

    refreshPhotoMarker(markerKey);
  }
}
