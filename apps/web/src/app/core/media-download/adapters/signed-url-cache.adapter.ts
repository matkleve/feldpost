/* eslint-disable max-lines */
import { Injectable, inject, signal, type WritableSignal } from '@angular/core';
import { Subject } from 'rxjs';
import type {
  BatchCompleteEvent,
  CacheEntry,
  PhotoLoadState,
  PhotoSize,
  SignedUrlResult,
  StateChangedEvent,
  UrlChangedEvent,
} from '../media-download.types';
import { SupabaseStorageAdapter } from './supabase-storage.adapter';

const TRANSFORMS: Record<PhotoSize, { width: number; height: number; resize: 'cover' } | null> = {
  marker: { width: 80, height: 80, resize: 'cover' },
  thumb: { width: 256, height: 256, resize: 'cover' },
  full: null,
};

const STALE_THRESHOLD_MS = 3_000_000; // 50 minutes
const SIGN_EXPIRY_SECONDS = 3600;
const SIZES: readonly PhotoSize[] = ['marker', 'thumb', 'full'];

@Injectable({ providedIn: 'root' })
export class SignedUrlCacheAdapter {
  private readonly storage = inject(SupabaseStorageAdapter);

  private readonly cache = new Map<string, CacheEntry>();
  private readonly loadStates = new Map<string, WritableSignal<PhotoLoadState>>();

  readonly urlChanged$ = new Subject<UrlChangedEvent>();
  readonly stateChanged$ = new Subject<StateChangedEvent>();
  readonly batchComplete$ = new Subject<BatchCompleteEvent>();

  getLoadState(imageId: string, size: PhotoSize): WritableSignal<PhotoLoadState> {
    const key = this.cacheKey(imageId, size);
    let state = this.loadStates.get(key);
    if (!state) {
      state = signal<PhotoLoadState>('idle');
      this.loadStates.set(key, state);
    }
    return state;
  }

  getCachedUrl(imageId: string, size: PhotoSize): string | null {
    return this.cache.get(this.cacheKey(imageId, size))?.url ?? null;
  }

  async getSignedUrl(
    storagePath: string,
    size: PhotoSize,
    imageId?: string,
  ): Promise<SignedUrlResult> {
    const id = imageId ?? storagePath;
    const cached = this.cache.get(this.cacheKey(id, size));
    if (cached && !this.isStale(cached)) return { url: cached.url, error: null };

    this.setLoadState(id, size, 'loading');
    const transform = TRANSFORMS[size];
    const signed = await this.storage.createSignedUrlWithFallback(
      storagePath,
      SIGN_EXPIRY_SECONDS,
      transform ? { transform } : undefined,
    );

    if (!signed.data?.signedUrl || signed.error) {
      this.setLoadState(id, size, 'error');
      return { url: null, error: signed.error?.message ?? 'Failed to sign URL' };
    }

    this.setCacheEntry(id, size, {
      url: signed.data.signedUrl,
      signedAt: Date.now(),
      isLocal: false,
    });
    this.setLoadState(id, size, 'loaded');
    return { url: signed.data.signedUrl, error: null };
  }

  async batchSign(
    items: Array<{ id: string; storagePath: string | null; thumbnailPath?: string | null }>,
    size: PhotoSize,
  ): Promise<Map<string, SignedUrlResult>> {
    const results = new Map<string, SignedUrlResult>();
    const pending = this.collectPendingItems(items, size, results);

    await this.signThumbnailBatch(pending, size, results);
    await this.signOriginalBatch(pending, size, results);
    this.markMissingAsError(pending, size, results);

    const mediaIds = items.map((item) => item.id);
    this.batchComplete$.next({ mediaIds, imageIds: mediaIds, size });
    return results;
  }

  preload(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = (): void => resolve(true);
      img.onerror = (): void => resolve(false);
      img.src = url;
    });
  }

  invalidate(imageId: string): void {
    for (const size of SIZES) this.cache.delete(this.cacheKey(imageId, size));
  }

  invalidateStale(maxAgeMs: number = STALE_THRESHOLD_MS): number {
    const now = Date.now();
    let cleared = 0;
    for (const [key, entry] of this.cache) {
      if (!entry.isLocal && now - entry.signedAt > maxAgeMs) {
        this.cache.delete(key);
        cleared += 1;
      }
    }
    return cleared;
  }

  setLocalUrl(imageId: string, blobUrl: string): void {
    for (const size of SIZES) {
      this.setCacheEntry(imageId, size, { url: blobUrl, signedAt: Date.now(), isLocal: true });
      this.setLoadState(imageId, size, 'loaded');
    }
  }

  markNoPhoto(imageId: string): void {
    for (const size of SIZES) this.setLoadState(imageId, size, 'no-photo');
  }

  revokeLocalUrl(imageId: string): void {
    for (const size of SIZES) {
      const key = this.cacheKey(imageId, size);
      const entry = this.cache.get(key);
      if (entry?.isLocal) URL.revokeObjectURL(entry.url);
      this.cache.delete(key);

      const state = this.loadStates.get(key);
      if (state) {
        state.set('idle');
        this.stateChanged$.next({ mediaId: imageId, imageId, size, state: 'idle' });
      }
    }
  }

  private collectPendingItems(
    items: Array<{ id: string; storagePath: string | null; thumbnailPath?: string | null }>,
    size: PhotoSize,
    results: Map<string, SignedUrlResult>,
  ): Array<{ id: string; storagePath: string | null; thumbnailPath?: string | null }> {
    const pending: Array<{
      id: string;
      storagePath: string | null;
      thumbnailPath?: string | null;
    }> = [];
    for (const item of items) {
      const cached = this.cache.get(this.cacheKey(item.id, size));
      if (cached && !this.isStale(cached)) {
        results.set(item.id, { url: cached.url, error: null });
      } else {
        pending.push(item);
        this.setLoadState(item.id, size, 'loading');
      }
    }
    return pending;
  }

  private async signThumbnailBatch(
    pending: Array<{ id: string; storagePath: string | null; thumbnailPath?: string | null }>,
    size: PhotoSize,
    results: Map<string, SignedUrlResult>,
  ): Promise<void> {
    const withThumb = pending.filter((item) => item.thumbnailPath);
    if (withThumb.length === 0) return;

    const paths = withThumb.map((item) => item.thumbnailPath as string);
    const signedMap = await this.storage.createSignedUrlsWithFallback(paths, SIGN_EXPIRY_SECONDS);
    const pathToId = new Map(withThumb.map((item) => [item.thumbnailPath as string, item.id]));

    for (const path of paths) {
      const signedUrl = signedMap.get(path);
      const imageId = pathToId.get(path);
      if (!signedUrl || !imageId) continue;
      this.setCacheEntry(imageId, size, { url: signedUrl, signedAt: Date.now(), isLocal: false });
      this.setLoadState(imageId, size, 'loaded');
      results.set(imageId, { url: signedUrl, error: null });
    }
  }

  private async signOriginalBatch(
    pending: Array<{ id: string; storagePath: string | null; thumbnailPath?: string | null }>,
    size: PhotoSize,
    results: Map<string, SignedUrlResult>,
  ): Promise<void> {
    const withoutThumb = pending.filter((item) => !item.thumbnailPath && item.storagePath);
    if (withoutThumb.length === 0) return;

    const transform = TRANSFORMS[size];
    const signedEntries = await Promise.all(
      withoutThumb.map(async (item) => {
        const signed = await this.storage.createSignedUrlWithFallback(
          item.storagePath as string,
          SIGN_EXPIRY_SECONDS,
          transform ? { transform } : undefined,
        );
        return {
          id: item.id,
          url: signed.data?.signedUrl ?? null,
          error: signed.error?.message ?? 'Failed to sign URL',
        };
      }),
    );

    for (const entry of signedEntries) {
      if (!entry.url) {
        this.setLoadState(entry.id, size, 'error');
        results.set(entry.id, { url: null, error: entry.error });
        continue;
      }

      this.setCacheEntry(entry.id, size, { url: entry.url, signedAt: Date.now(), isLocal: false });
      this.setLoadState(entry.id, size, 'loaded');
      results.set(entry.id, { url: entry.url, error: null });
    }
  }

  private markMissingAsError(
    pending: Array<{ id: string; storagePath: string | null; thumbnailPath?: string | null }>,
    size: PhotoSize,
    results: Map<string, SignedUrlResult>,
  ): void {
    for (const item of pending) {
      if (results.has(item.id)) continue;
      this.setLoadState(item.id, size, 'error');
      results.set(item.id, { url: null, error: 'Not signed' });
    }
  }

  private cacheKey(imageId: string, size: PhotoSize): string {
    return `${imageId}:${size}`;
  }

  private isStale(entry: CacheEntry): boolean {
    return !entry.isLocal && Date.now() - entry.signedAt > STALE_THRESHOLD_MS;
  }

  private setCacheEntry(imageId: string, size: PhotoSize, entry: CacheEntry): void {
    this.cache.set(this.cacheKey(imageId, size), entry);
    this.urlChanged$.next({ mediaId: imageId, imageId, size, url: entry.url });
  }

  private setLoadState(imageId: string, size: PhotoSize, newState: PhotoLoadState): void {
    this.getLoadState(imageId, size).set(newState);
    this.stateChanged$.next({ mediaId: imageId, imageId, size, state: newState });
  }
}
