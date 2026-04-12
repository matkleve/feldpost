/* eslint-disable max-lines */
import { Injectable, Injector, effect, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';
import { EdgeExportOrchestratorAdapter } from './adapters/edge-export-orchestrator.adapter';
import type { ZipExportContext } from './adapters/edge-export-orchestrator.adapter';
import { SignedUrlCacheAdapter } from './adapters/signed-url-cache.adapter';
import { TierResolverAdapter } from './adapters/tier-resolver.adapter';
import type {
  FileTypeDefinition,
  MediaFileIdentity,
  MediaRenderState,
  MediaTier,
  MediaTierSelectionInput,
} from '../media/media-renderer.types';
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
  tierToMediaSize,
} from './media-download.helpers';
import type {
  MediaDisplayDeliveryState,
  DownloadBlobResult,
  ExportProgressEvent,
  ExportResult,
  MediaLoadState,
  MediaSize,
  MediaDeliveryItemState,
  MediaPreviewRequest,
  MediaPreviewResult,
  SignedUrlResult,
} from './media-download.types';
import type { WorkspaceMedia } from '../workspace-view/workspace-view.types';

export type {
  BatchCompleteEvent,
  DownloadBlobResult,
  ExportProgressEvent,
  ExportResult,
  MediaDisplayDeliveryState,
  MediaDisplayStreamState,
  MediaLoadState,
  MediaSize,
  MediaDeliveryErrorCode,
  MediaDeliveryItemState,
  MediaPreviewRequest,
  MediaPreviewResult,
  SignedUrlResult,
  StateChangedEvent,
  UrlChangedEvent,
} from './media-download.types';
export type { ZipExportContext } from './adapters/edge-export-orchestrator.adapter';

/** Camera icon SVG data-URI — used in loading/idle placeholders. */
export const MEDIA_PLACEHOLDER_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 15.2l3.4-2.8L18 15V6H6v7.6L9 11l3 4.2zM20 4v16H4V4h16zm-8.5 6a1.5 1.5 0 100-3 1.5 1.5 0 000 3z'/%3E%3C/svg%3E";

/** Crossed-out media SVG data-URI — used in error/no-media placeholders. */
export const MEDIA_NO_MEDIA_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M21 5c0-.55-.45-1-1-1H5.83L21 19.17V5zM2.81 2.81L1.39 4.22 3 5.83V19c0 .55.45 1 1 1h13.17l2.61 2.61 1.41-1.41L2.81 2.81zM6 17l3-4 2.25 3 .82-1.1 2.1 2.1H6z'/%3E%3C/svg%3E";

@Injectable({ providedIn: 'root' })
export class MediaDownloadService {
  private readonly injector = inject(Injector);
  private readonly signedUrlCache = inject(SignedUrlCacheAdapter);
  private readonly tierResolver = inject(TierResolverAdapter);
  private readonly edgeExport = inject(EdgeExportOrchestratorAdapter);

  private readonly stateStore = new Map<string, WritableSignal<MediaDeliveryItemState>>();
  private readonly stateBridgeEntries = signal<
    ReadonlyArray<{
      key: string;
      tier: MediaTier;
      legacySignal: WritableSignal<MediaLoadState>;
    }>
  >([]);
  private readonly resolvedUrlCache = new Map<string, string>();
  private readonly knownPreviewRequests = new Map<string, MediaPreviewRequest>();

  // Legacy streams still consumed by parts of the app during migration.
  readonly urlChanged$ = this.signedUrlCache.urlChanged$;
  readonly stateChanged$ = this.signedUrlCache.stateChanged$;
  readonly batchComplete$ = this.signedUrlCache.batchComplete$;

  constructor() {
    effect(
      () => {
        for (const entry of this.stateBridgeEntries()) {
          const localState = this.stateStore.get(entry.key);
          if (!localState) {
            continue;
          }

          localState.set(mapLegacyState(entry.legacySignal(), entry.tier));
        }
      },
      {
        injector: this.injector,
        allowSignalWrites: true,
      },
    );
  }

  async resolvePreview(request: MediaPreviewRequest): Promise<MediaPreviewResult> {
    this.knownPreviewRequests.set(request.mediaId, { ...request });

    const resolvedTier = this.resolveTier(request);
    const stateSignal = this.getItemState(request.mediaId, resolvedTier);

    if (!request.storagePath) {
      this.signedUrlCache.markNoMedia(request.mediaId);
      stateSignal.set('no-media');
      return { url: null, resolvedTier: null, source: 'none', state: stateSignal() };
    }

    const tierSize = tierToMediaSize(resolvedTier);
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

  getState(mediaId: string, slotSizeRem: number): Observable<MediaDisplayDeliveryState> {
    const normalizedId = mediaId.trim();

    return new Observable<MediaDisplayDeliveryState>((subscriber) => {
      if (!normalizedId) {
        subscriber.next({ state: 'no-media', icon: 'hide_image' });
        subscriber.complete();
        return;
      }

      const tier = this.selectRequestedTierForSlot({
        requestedTier: 'small',
        slotWidthRem: slotSizeRem,
        slotHeightRem: slotSizeRem,
        context: this.knownPreviewRequests.get(normalizedId)?.context ?? 'grid',
      });
      const size = tierToMediaSize(tier);

      const emit = (): void => {
        subscriber.next(this.toDisplayDeliveryState(normalizedId, tier));
      };

      emit();
      this.requestPreviewIfKnown(normalizedId, tier, slotSizeRem);

      const stateSubscription = this.stateChanged$.subscribe((event) => {
        if (event.mediaId === normalizedId && event.size === size) {
          emit();
        }
      });

      const urlSubscription = this.urlChanged$.subscribe((event) => {
        if (event.mediaId === normalizedId && event.size === size) {
          emit();
        }
      });

      return () => {
        stateSubscription.unsubscribe();
        urlSubscription.unsubscribe();
      };
    });
  }

  // Transitional compatibility API while legacy call sites are being removed.
  getLoadState(mediaId: string, size: MediaSize): WritableSignal<MediaLoadState> {
    return this.signedUrlCache.getLoadState(mediaId, size);
  }

  getCachedUrl(mediaId: string, size: MediaSize): string | null {
    return this.signedUrlCache.getCachedUrl(mediaId, size);
  }

  async getSignedUrl(
    storagePath: string,
    size: MediaSize,
    mediaId?: string,
  ): Promise<SignedUrlResult> {
    if (mediaId) {
      this.knownPreviewRequests.set(mediaId, {
        mediaId,
        storagePath,
        desiredSize: this.mediaSizeToDesiredSize(size),
        context: 'grid',
      });
    }

    return this.signedUrlCache.getSignedUrl(storagePath, size, mediaId);
  }

  async batchSign(
    items: Array<{ id: string; storagePath: string | null; thumbnailPath?: string | null }>,
    size: MediaSize,
  ): Promise<Map<string, SignedUrlResult>> {
    return this.signedUrlCache.batchSign(items, size);
  }

  preload(url: string): Promise<boolean> {
    return this.signedUrlCache.preload(url);
  }

  setLocalUrl(mediaId: string, blobUrl: string): void {
    this.injectLocalUrl(mediaId, blobUrl);
  }

  markNoMedia(mediaId: string): void {
    this.signedUrlCache.markNoMedia(mediaId);
    for (const tier of ALL_MEDIA_TIERS) {
      this.stateStore.get(this.stateKey(mediaId, tier))?.set('no-media');
    }
  }

  getItemState(mediaId: string, tier: MediaTier): WritableSignal<MediaDeliveryItemState> {
    const key = this.stateKey(mediaId, tier);
    const existing = this.stateStore.get(key);
    if (existing) return existing;

    const legacySignal = this.signedUrlCache.getLoadState(mediaId, tierToMediaSize(tier));
    const localState = signal<MediaDeliveryItemState>(mapLegacyState(legacySignal(), tier));
    this.stateStore.set(key, localState);
    this.stateBridgeEntries.update((entries) => [...entries, { key, tier, legacySignal }]);
    return localState;
  }

  invalidate(mediaId: string): void {
    this.signedUrlCache.invalidate(mediaId);
    for (const tier of ALL_MEDIA_TIERS) {
      const key = this.stateKey(mediaId, tier);
      this.resolvedUrlCache.delete(key);
      this.stateBridgeEntries.update((entries) => entries.filter((entry) => entry.key !== key));
      this.stateStore.delete(key);
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

  buildDefaultTitle(context: ZipExportContext): string {
    return this.edgeExport.buildDefaultTitle(context);
  }

  async exportSelectionAsZip(
    items: WorkspaceMedia[],
    title: string,
    onProgress?: (value: number) => void,
  ): Promise<void> {
    await this.edgeExport.exportSelectionAsZip(items, title, onProgress);
  }

  resolveFileType(identity: MediaFileIdentity): FileTypeDefinition {
    return this.tierResolver.resolveFileType(identity);
  }

  resolveBadge(identity: MediaFileIdentity): string | null {
    return this.tierResolver.resolveBadge(identity);
  }

  resolveIcon(identity: MediaFileIdentity): string {
    return this.tierResolver.resolveIcon(identity);
  }

  fallbackChainForTier(tier: MediaTier): readonly MediaTier[] {
    return this.tierResolver.fallbackChainForTier(tier);
  }

  selectRequestedTierForSlot(input: MediaTierSelectionInput): MediaTier {
    return this.tierResolver.selectRequestedTierForSlot(input);
  }

  resolveBestAvailableTier(
    requestedTier: MediaTier,
    availableTiers: readonly MediaTier[],
  ): MediaTier {
    return this.tierResolver.resolveBestAvailableTier(requestedTier, availableTiers);
  }

  placeholderState(): MediaRenderState {
    return this.tierResolver.placeholderState();
  }

  iconOnlyState(): MediaRenderState {
    return this.tierResolver.iconOnlyState();
  }

  loadingState(progress?: number): MediaRenderState {
    return this.tierResolver.loadingState(progress);
  }

  loadedState(
    url: string,
    resolvedTier: MediaTier,
    width?: number,
    height?: number,
  ): MediaRenderState {
    return this.tierResolver.loadedState(url, resolvedTier, width, height);
  }

  errorState(reason: string): MediaRenderState {
    return this.tierResolver.errorState(reason);
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

  private toDisplayDeliveryState(mediaId: string, tier: MediaTier): MediaDisplayDeliveryState {
    const state = this.getItemState(mediaId, tier)();
    const cachedUrl = this.getCachedUrl(mediaId, tierToMediaSize(tier));

    const knownRequest = this.knownPreviewRequests.get(mediaId);
    const extension = knownRequest?.storagePath?.split('.').pop()?.toLowerCase() ?? '';
    const icon = this.resolveIcon({ fileName: knownRequest?.storagePath ?? null, extension });

    if (state === 'error') {
      return { state: 'error', icon, resolvedUrl: cachedUrl };
    }

    if (state === 'no-media') {
      return { state: 'no-media', icon, resolvedUrl: cachedUrl };
    }

    if (state === 'ready-low-res' || state === 'ready-high-res') {
      if (cachedUrl) {
        return { state: 'loaded', resolvedUrl: cachedUrl, icon };
      }
      return { state: 'icon-only', icon };
    }

    if (cachedUrl) {
      return { state: 'loaded', resolvedUrl: cachedUrl, icon };
    }

    return { state: 'loading', icon };
  }

  private requestPreviewIfKnown(mediaId: string, tier: MediaTier, slotSizeRem: number): void {
    const request = this.knownPreviewRequests.get(mediaId);
    if (!request) {
      return;
    }

    if (this.getCachedUrl(mediaId, tierToMediaSize(tier))) {
      return;
    }

    const state = this.getItemState(mediaId, tier)();
    if (state !== 'idle') {
      return;
    }

    void this.resolvePreview({
      ...request,
      mediaId,
      desiredSize: this.tierToDesiredSize(tier),
      boxPixels: {
        width: slotSizeRem * PIXELS_PER_REM,
        height: slotSizeRem * PIXELS_PER_REM,
      },
    });
  }

  private tierToDesiredSize(tier: MediaTier): 'marker' | 'thumb' | 'detail' | 'full' {
    switch (tier) {
      case 'inline':
        return 'marker';
      case 'small':
      case 'mid':
      case 'mid2':
        return 'thumb';
      case 'large':
        return 'detail';
      case 'full':
      default:
        return 'full';
    }
  }

  private mediaSizeToDesiredSize(size: MediaSize): 'marker' | 'thumb' | 'detail' | 'full' {
    switch (size) {
      case 'marker':
        return 'marker';
      case 'thumb':
        return 'thumb';
      case 'full':
      default:
        return 'full';
    }
  }
}
