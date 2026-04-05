import type { Observable } from 'rxjs';
import type {
  MediaDisplayDeliveryState,
  MediaLoadState,
} from '../../core/media-download/media-download.types';
import type { MediaDisplayState } from './media-display-state';

export type { MediaDisplayDeliveryState };

export interface MediaDownloadStateStreamApi {
  getState?: (mediaId: string, slotSizeRem: number) => Observable<MediaDisplayDeliveryState>;
}

export function mapLegacyLoadState(
  loadState: MediaLoadState,
  hasResolvedUrl: boolean,
): Exclude<MediaDisplayState, 'empty' | 'warm-preview' | 'icon-only'> {
  switch (loadState) {
    case 'loading':
      return 'loading';
    case 'loaded':
      return hasResolvedUrl ? 'loaded' : 'loading';
    case 'error':
      return 'error';
    case 'no-media':
      return 'no-media';
    case 'idle':
    default:
      return hasResolvedUrl ? 'loaded' : 'loading';
  }
}
