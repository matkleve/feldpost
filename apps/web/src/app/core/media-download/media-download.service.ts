/* eslint-disable max-lines */
import { Injectable, Injector, effect, inject, signal } from '@angular/core';
import type { EffectRef, WritableSignal } from '@angular/core';
import { EdgeExportOrchestratorAdapter } from './adapters/edge-export-orchestrator.adapter';
import { SignedUrlCacheAdapter } from './adapters/signed-url-cache.adapter';
import { TierResolverAdapter } from './adapters/tier-resolver.adapter';
import type { MediaTier } from '../media/media-renderer.types';
import {
  ALL_MEDIA_TIERS,
  CONTEXT_DEFAULT_TIER,
  PIXELS_PER_REM,
  desiredSizeToTier,
  mapExportErrorCode,
  mapFetchErrorCode,
  mapLegacyState,
  mapSigningErrorCode,
  readyStateForTier,
  tierToPhotoSize,
} from './media-download.helpers';
import type {
  DownloadBlobResult,
  ExportProgressEvent,
  ExportResult,
  MediaDeliveryItemState,
  MediaPreviewRequest,
  MediaPreviewResult,
} from './media-download.types';
import type { WorkspaceMedia } from '../workspace-view/workspace-view.types';

export type {
  DownloadBlobResult,
  ExportProgressEvent,
  ExportResult,
  MediaDeliveryErrorCode,
  MediaDeliveryItemState,
  MediaPreviewRequest,
  MediaPreviewResult,
} from './media-download.types';

@Injectable({ providedIn: 'root' })
export class MediaDownloadService {
  private readonly injector = inject(Injector);
  private readonly signedUrlCache = inject(SignedUrlCacheAdapter);
  private readonly tierResolver = inject(TierResolverAdapter);
  private readonly edgeExport = inject(EdgeExportOrchestratorAdapter);

  private readonly stateStore = new Map<string, WritableSignal<MediaDeliveryItemState>>();
  private readonly stateBridgeEffects = new Map<string, EffectRef>();
  private readonly resolvedUrlCache = new Map<string, string>();

  async resolvePreview(request: MediaPreviewRequest): Promise<MediaPreviewResult> {
    const resolvedTier = this.resolveTier(request);
    const stateSignal = this.getItemState(request.mediaId, resolvedTier);

    if (!request.storagePath) {
      this.signedUrlCache.markNoPhoto(request.mediaId);
      stateSignal.set('no-media');
      return { url: null, resolvedTier: null, source: 'none', state: stateSignal() };
    }

    const tierSize = tierToPhotoSize(resolvedTier);
    const targetPath = this.resolvePathForTier(request, resolvedTier);
    const hadLoaded = this.signedUrlCache.getLoadState(request.mediaId, tierSize)() === 'loaded';

    stateSignal.set('signing');
    const signed = await this.signedUrlCache.getSignedUrl(targetPath, tierSize, request.mediaId);

    if (!signed.url || signed.error) {
      const errorCode = mapSigningErrorCode(signed.error ?? 'Failed to sign URL');
      stateSignal.set(errorCode.code === 'not-found' ? 'no-media' : 'error');
      return {
        url: null,
        resolvedTier,
        source: 'none',
        state: stateSignal(),
        errorCode,
      };
    }

    const cacheKey = this.stateKey(request.mediaId, resolvedTier);
    const source = this.resolveResultSource(cacheKey, signed.url, hadLoaded);
    this.resolvedUrlCache.set(cacheKey, signed.url);
    stateSignal.set(readyStateForTier(resolvedTier));

    return { url: signed.url, resolvedTier, source, state: stateSignal() };
  }

  async resolveBatchPreviews(
    requests: MediaPreviewRequest[],
  ): Promise<Map<string, MediaPreviewResult>> {
    const entries = await Promise.all(
      requests.map(async (r) => [r.mediaId, await this.resolvePreview(r)] as const),
    );
    return new Map(entries);
  }

  getItemState(mediaId: string, tier: MediaTier): WritableSignal<MediaDeliveryItemState> {
    const key = this.stateKey(mediaId, tier);
    const existing = this.stateStore.get(key);
    if (existing) return existing;

    const legacySignal = this.signedUrlCache.getLoadState(mediaId, tierToPhotoSize(tier));
    const localState = signal<MediaDeliveryItemState>(mapLegacyState(legacySignal(), tier));
    this.stateStore.set(key, localState);

    const bridge = effect(() => localState.set(mapLegacyState(legacySignal(), tier)), {
      injector: this.injector,
      allowSignalWrites: true,
    });
    this.stateBridgeEffects.set(key, bridge);
    return localState;
  }

  invalidate(mediaId: string): void {
    this.signedUrlCache.invalidate(mediaId);
    for (const tier of ALL_MEDIA_TIERS) {
      const key = this.stateKey(mediaId, tier);
      this.resolvedUrlCache.delete(key);
      this.stateStore.get(key)?.set('idle');
    }
  }

  invalidateStale(maxAgeMs?: number): number {
    return this.signedUrlCache.invalidateStale(maxAgeMs);
  }

  injectLocalUrl(mediaId: string, blobUrl: string): void {
    this.signedUrlCache.setLocalUrl(mediaId, blobUrl);
    for (const tier of ALL_MEDIA_TIERS) {
      const key = this.stateKey(mediaId, tier);
      this.resolvedUrlCache.set(key, blobUrl);
      this.stateStore.get(key)?.set(readyStateForTier(tier));
    }
  }

  revokeLocalUrl(mediaId: string): void {
    this.signedUrlCache.revokeLocalUrl(mediaId);
    for (const tier of ALL_MEDIA_TIERS) {
      const key = this.stateKey(mediaId, tier);
      this.resolvedUrlCache.delete(key);
      this.stateStore.get(key)?.set('idle');
    }
  }

  async downloadBlob(storagePath: string): Promise<DownloadBlobResult> {
    const signed = await this.signedUrlCache.getSignedUrl(storagePath, 'full', storagePath);
    if (!signed.url || signed.error) {
      return {
        ok: false,
        errorCode: mapSigningErrorCode(signed.error),
        message: signed.error ?? 'Failed to sign URL',
      };
    }

    try {
      const response = await fetch(signed.url);
      if (!response.ok) {
        return {
          ok: false,
          errorCode: mapFetchErrorCode(`HTTP ${response.status}`),
          message: `Failed to download file. HTTP ${response.status}`,
        };
      }
      return { ok: true, blob: await response.blob() };
    } catch (error) {
      return {
        ok: false,
        errorCode: mapFetchErrorCode(error),
        message: error instanceof Error ? error.message : 'Failed to fetch signed URL.',
      };
    }
  }

  async exportSelection(
    items: WorkspaceMedia[],
    title: string,
    onProgress?: (event: ExportProgressEvent) => void,
  ): Promise<ExportResult> {
    onProgress?.({ phase: 'queued', itemsTotal: items.length, itemsProcessed: 0 });
    onProgress?.({ phase: 'edge-started', itemsTotal: items.length, itemsProcessed: 0 });

    try {
      await this.edgeExport.exportSelectionAsZip(items, title, (progress) => {
        onProgress?.({
          phase: 'streaming',
          itemsTotal: items.length,
          itemsProcessed: Math.round(progress * items.length),
        });
      });
      onProgress?.({ phase: 'finalizing', itemsTotal: items.length, itemsProcessed: items.length });
      onProgress?.({ phase: 'completed', itemsTotal: items.length, itemsProcessed: items.length });
      return { ok: true, total: items.length, successCount: items.length, failedCount: 0 };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed.';
      const errorCode = mapExportErrorCode(error);
      onProgress?.({ phase: 'failed', itemsTotal: items.length, itemsProcessed: 0 });
      return {
        ok: false,
        total: items.length,
        successCount: 0,
        failedCount: items.length,
        failures: [{ message, errorCode }],
        errorCode,
        message,
      };
    }
  }

  private resolveTier(request: MediaPreviewRequest): MediaTier {
    const requestedTier = request.desiredSize
      ? desiredSizeToTier(request.desiredSize)
      : CONTEXT_DEFAULT_TIER[request.context];
    if (!request.boxPixels) return requestedTier;

    return this.tierResolver.selectRequestedTierForSlot({
      requestedTier,
      slotWidthRem: request.boxPixels.width / PIXELS_PER_REM,
      slotHeightRem: request.boxPixels.height / PIXELS_PER_REM,
      context: request.context,
    });
  }

  private resolvePathForTier(request: MediaPreviewRequest, tier: MediaTier): string {
    const useThumbnailTier =
      tier === 'inline' || tier === 'small' || tier === 'mid' || tier === 'mid2';
    if (useThumbnailTier && request.thumbnailPath) return request.thumbnailPath;
    return request.storagePath as string;
  }

  private resolveResultSource(
    cacheKey: string,
    url: string,
    hadLoadedBefore: boolean,
  ): 'cache' | 'signed' | 'local' {
    if (url.startsWith('blob:')) return 'local';
    const previous = this.resolvedUrlCache.get(cacheKey);
    if ((previous && previous === url) || hadLoadedBefore) return 'cache';
    return 'signed';
  }

  private stateKey(mediaId: string, tier: MediaTier): string {
    return `${mediaId}:${tier}`;
  }
}
