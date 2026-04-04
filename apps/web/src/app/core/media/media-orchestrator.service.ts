import { Injectable, inject } from '@angular/core';
import { TierResolverAdapter } from '../media-download/adapters/tier-resolver.adapter';
import type {
  FileTypeDefinition,
  MediaFileIdentity,
  MediaRenderState,
  MediaTier,
  MediaTierSelectionInput,
} from './media-renderer.types';

@Injectable({ providedIn: 'root' })
/**
 * @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md.
 */
export class MediaOrchestratorService {
  private readonly adapter = inject(TierResolverAdapter);

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  resolveFileType(identity: MediaFileIdentity): FileTypeDefinition {
    return this.adapter.resolveFileType(identity);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  resolveBadge(identity: MediaFileIdentity): string | null {
    return this.adapter.resolveBadge(identity);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  resolveIcon(identity: MediaFileIdentity): string {
    return this.adapter.resolveIcon(identity);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  fallbackChainForTier(tier: MediaTier): readonly MediaTier[] {
    return this.adapter.fallbackChainForTier(tier);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  selectRequestedTierForSlot(input: MediaTierSelectionInput): MediaTier {
    return this.adapter.selectRequestedTierForSlot(input);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  resolveBestAvailableTier(
    requestedTier: MediaTier,
    availableTiers: readonly MediaTier[],
  ): MediaTier {
    return this.adapter.resolveBestAvailableTier(requestedTier, availableTiers);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  placeholderState(): MediaRenderState {
    return this.adapter.placeholderState();
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  iconOnlyState(): MediaRenderState {
    return this.adapter.iconOnlyState();
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  loadingState(progress?: number): MediaRenderState {
    return this.adapter.loadingState(progress);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  loadedState(
    url: string,
    resolvedTier: MediaTier,
    width?: number,
    height?: number,
  ): MediaRenderState {
    return this.adapter.loadedState(url, resolvedTier, width, height);
  }

  /** @deprecated Use MediaDownloadService instead. Tracking migration in media-download-service.md. */
  errorState(reason: string): MediaRenderState {
    return this.adapter.errorState(reason);
  }
}
