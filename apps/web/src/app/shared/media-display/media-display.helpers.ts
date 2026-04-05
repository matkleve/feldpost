import type { Observable } from 'rxjs';
import type { PhotoLoadState } from '../../core/media-download/media-download.types';
import type { MediaDisplayState } from './media-display-state';

export interface MediaDisplayDeliveryState {
  state: Exclude<MediaDisplayState, 'empty'>;
  resolvedUrl?: string | null;
  warmPreviewUrl?: string | null;
  metadataAspectRatio?: number | null;
  icon?: string | null;
}

export interface MediaDownloadStateStreamApi {
  getState?: (mediaId: string, slotSizeRem: number) => Observable<MediaDisplayDeliveryState>;
}

export function mapLegacyLoadState(
  loadState: PhotoLoadState,
  hasResolvedUrl: boolean,
): Exclude<MediaDisplayState, 'empty' | 'warm-preview' | 'icon-only'> {
  switch (loadState) {
    case 'loading':
      return 'loading';
    case 'loaded':
      return hasResolvedUrl ? 'loaded' : 'loading';
    case 'error':
      return 'error';
    case 'no-photo':
      return 'no-media';
    case 'idle':
    default:
      return hasResolvedUrl ? 'loaded' : 'loading';
  }
}
