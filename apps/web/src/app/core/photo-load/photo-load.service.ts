import { Injectable, inject, type WritableSignal } from '@angular/core';
import { SignedUrlCacheAdapter } from '../media-download/adapters/signed-url-cache.adapter';
import type { PhotoLoadState, PhotoSize, SignedUrlResult } from '../photo-load.model';

/** Camera icon SVG data-URI — used in loading/idle placeholders */
export const PHOTO_PLACEHOLDER_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 15.2l3.4-2.8L18 15V6H6v7.6L9 11l3 4.2zM20 4v16H4V4h16zm-8.5 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3z'/%3E%3C/svg%3E";

/** Crossed-out image SVG data-URI — used in error/no-photo placeholders */
export const PHOTO_NO_PHOTO_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M21 5c0-.55-.45-1-1-1H5.83L21 19.17V5zM2.81 2.81L1.39 4.22 3 5.83V19c0 .55.45 1 1 1h13.17l2.61 2.61 1.41-1.41L2.81 2.81zM6 17l3-4 2.25 3 .82-1.1 2.1 2.1H6z'/%3E%3C/svg%3E";

@Injectable({ providedIn: 'root' })
/**
 * @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md.
 */
export class PhotoLoadService {
  private readonly adapter = inject(SignedUrlCacheAdapter);

  readonly urlChanged$ = this.adapter.urlChanged$;
  readonly stateChanged$ = this.adapter.stateChanged$;
  readonly batchComplete$ = this.adapter.batchComplete$;

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  getLoadState(imageId: string, size: PhotoSize): WritableSignal<PhotoLoadState> {
    return this.adapter.getLoadState(imageId, size);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  async getSignedUrl(
    storagePath: string,
    size: PhotoSize,
    imageId?: string,
  ): Promise<SignedUrlResult> {
    return this.adapter.getSignedUrl(storagePath, size, imageId);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  async batchSign(
    items: Array<{ id: string; storagePath: string | null; thumbnailPath?: string | null }>,
    size: PhotoSize,
  ): Promise<Map<string, SignedUrlResult>> {
    return this.adapter.batchSign(items, size);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  preload(url: string): Promise<boolean> {
    return this.adapter.preload(url);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  invalidate(imageId: string): void {
    this.adapter.invalidate(imageId);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  invalidateStale(maxAgeMs?: number): number {
    return this.adapter.invalidateStale(maxAgeMs);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  setLocalUrl(imageId: string, blobUrl: string): void {
    this.adapter.setLocalUrl(imageId, blobUrl);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  markNoPhoto(imageId: string): void {
    this.adapter.markNoPhoto(imageId);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  revokeLocalUrl(imageId: string): void {
    this.adapter.revokeLocalUrl(imageId);
  }
}
