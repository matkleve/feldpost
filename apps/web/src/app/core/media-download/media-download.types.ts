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
