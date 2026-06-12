export type PhotoLoadState = 'idle' | 'loading' | 'loaded' | 'error' | 'no-photo';

export type PhotoSize = 'marker' | 'thumb' | 'full';

export interface CacheEntry {
  url: string;
  signedAt: number;
  isLocal: boolean;
}

export interface SignedUrlResult {
  url: string | null;
  error: string | null;
}

export interface UrlChangedEvent {
  imageId: string;
  size: PhotoSize;
  url: string;
}

export interface StateChangedEvent {
  imageId: string;
  size: PhotoSize;
  state: PhotoLoadState;
}

export interface BatchCompleteEvent {
  imageIds: string[];
  size: PhotoSize;
}
