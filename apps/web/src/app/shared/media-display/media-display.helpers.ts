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
): Exclude<
  MediaDisplayState,
  'idle' | 'ratio-known-contain' | 'media-ready' | 'content-fade-in' | 'icon-only'
> {
  switch (loadState) {
    case 'loading':
      return 'loading-surface-visible';
    case 'loaded':
      return hasResolvedUrl ? 'content-visible' : 'loading-surface-visible';
    case 'error':
      return 'error';
    case 'no-media':
      return 'no-media';
    case 'idle':
    default:
      return hasResolvedUrl ? 'content-visible' : 'loading-surface-visible';
  }
}
