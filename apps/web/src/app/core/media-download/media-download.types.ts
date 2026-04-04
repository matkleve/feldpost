import type { MediaTier } from '../media/media-renderer.types';

export type MediaDeliveryItemState =
  | 'idle'
  | 'signing'
  | 'downloading'
  | 'ready-low-res'
  | 'ready-high-res'
  | 'exporting'
  | 'error'
  | 'no-media';

export interface MediaDeliveryErrorCode {
  code:
    | 'auth'
    | 'forbidden'
    | 'not-found'
    | 'sign-failed'
    | 'fetch-failed'
    | 'timeout'
    | 'rate-limited'
    | 'unknown';
  isRetryable: boolean;
}

export interface MediaPreviewRequest {
  mediaId: string;
  storagePath: string | null;
  thumbnailPath?: string | null;
  desiredSize?: 'marker' | 'thumb' | 'detail' | 'full';
  boxPixels?: { width: number; height: number };
  context: 'map' | 'grid' | 'upload' | 'detail';
}

export interface MediaPreviewResult {
  url: string | null;
  resolvedTier: MediaTier | null;
  source: 'cache' | 'signed' | 'local' | 'none';
  state: MediaDeliveryItemState;
  errorCode?: MediaDeliveryErrorCode;
}

export type DownloadBlobResult =
  | { ok: true; blob: Blob }
  | { ok: false; errorCode: MediaDeliveryErrorCode; message: string };

export interface ExportProgressEvent {
  phase: 'queued' | 'edge-started' | 'streaming' | 'finalizing' | 'completed' | 'failed';
  bytesStreamed?: number;
  totalBytesHint?: number;
  itemsProcessed?: number;
  itemsTotal?: number;
}

export interface ExportFailure {
  mediaId?: string;
  message: string;
  errorCode: MediaDeliveryErrorCode;
}

export interface ExportResult {
  ok: boolean;
  total: number;
  successCount: number;
  failedCount: number;
  failures?: ExportFailure[];
  errorCode?: MediaDeliveryErrorCode;
  message?: string;
}

// Legacy photo-load contracts kept temporarily for migration compatibility.
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
  mediaId: string;
  /** @deprecated Use mediaId. */
  imageId?: string;
  size: PhotoSize;
  url: string;
}

export interface StateChangedEvent {
  mediaId: string;
  /** @deprecated Use mediaId. */
  imageId?: string;
  size: PhotoSize;
  state: PhotoLoadState;
}

export interface BatchCompleteEvent {
  mediaIds: string[];
  /** @deprecated Use mediaIds. */
  imageIds?: string[];
  size: PhotoSize;
}
