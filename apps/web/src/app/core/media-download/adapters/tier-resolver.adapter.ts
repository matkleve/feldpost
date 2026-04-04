import { Injectable } from '@angular/core';
import { fileTypeBadge, resolveFileType } from '../../media/file-type-registry';
import type {
  FileTypeDefinition,
  MediaContext,
  MediaFileIdentity,
  MediaRenderState,
  MediaTier,
  MediaTierSelectionInput,
} from '../../media/media-renderer.types';

const FALLBACK_CHAIN_BY_TIER: Readonly<Record<MediaTier, readonly MediaTier[]>> = {
  inline: [],
  small: ['inline'],
  mid: ['small', 'inline'],
  mid2: ['mid', 'small', 'inline'],
  large: ['mid2', 'mid', 'small', 'inline'],
  full: ['large', 'mid2', 'mid', 'small', 'inline'],
};

const TIER_ORDER: readonly MediaTier[] = ['inline', 'small', 'mid', 'mid2', 'large', 'full'];

const CONTEXT_MIN_TIER: Readonly<Record<MediaContext, MediaTier>> = {
  map: 'inline',
  grid: 'small',
  upload: 'small',
  detail: 'mid',
};

const SHORT_EDGE_INLINE_MAX_REM = 6;
const SHORT_EDGE_SMALL_MAX_REM = 12;
const SHORT_EDGE_MID_MAX_REM = 20;
const SHORT_EDGE_MID2_MAX_REM = 32;
const SHORT_EDGE_LARGE_MAX_REM = 60;

@Injectable({ providedIn: 'root' })
export class TierResolverAdapter {
  resolveFileType(identity: MediaFileIdentity): FileTypeDefinition {
    return resolveFileType(identity);
  }

  resolveBadge(identity: MediaFileIdentity): string | null {
    return fileTypeBadge(identity);
  }

  resolveIcon(identity: MediaFileIdentity): string {
    const definition = this.resolveFileType(identity);
    return definition.category === 'unknown' ? 'description' : definition.icon;
  }

  fallbackChainForTier(tier: MediaTier): readonly MediaTier[] {
    return FALLBACK_CHAIN_BY_TIER[tier];
  }

  selectRequestedTierForSlot(input: MediaTierSelectionInput): MediaTier {
    const slotShortEdgeRem = this.shortEdge(input.slotWidthRem, input.slotHeightRem);
    if (slotShortEdgeRem == null) {
      return input.requestedTier;
    }

    const adaptiveTier = this.tierForShortEdge(slotShortEdgeRem, input.context);
    return this.lowerTier(adaptiveTier, input.requestedTier);
  }

  resolveBestAvailableTier(
    requestedTier: MediaTier,
    availableTiers: readonly MediaTier[],
  ): MediaTier {
    if (availableTiers.includes(requestedTier)) {
      return requestedTier;
    }

    const fallbacks = this.fallbackChainForTier(requestedTier);
    for (const tier of fallbacks) {
      if (availableTiers.includes(tier)) {
        return tier;
      }
    }

    return requestedTier;
  }

  placeholderState(): MediaRenderState {
    return { status: 'placeholder' };
  }

  iconOnlyState(): MediaRenderState {
    return { status: 'icon-only' };
  }

  loadingState(progress?: number): MediaRenderState {
    return progress == null ? { status: 'loading' } : { status: 'loading', progress };
  }

  loadedState(
    url: string,
    resolvedTier: MediaTier,
    width?: number,
    height?: number,
  ): MediaRenderState {
    return {
      status: 'loaded',
      url,
      resolvedTier,
      width,
      height,
    };
  }

  errorState(reason: string): MediaRenderState {
    return { status: 'error', reason };
  }

  private shortEdge(width?: number | null, height?: number | null): number | null {
    const w = width ?? null;
    const h = height ?? null;

    if (w == null && h == null) {
      return null;
    }

    if (w == null) {
      return h;
    }

    if (h == null) {
      return w;
    }

    return Math.min(w, h);
  }

  private tierForShortEdge(shortEdgeRem: number, context?: MediaContext): MediaTier {
    if (shortEdgeRem <= SHORT_EDGE_INLINE_MAX_REM) {
      return this.applyContextFloor('inline', context);
    }

    if (shortEdgeRem <= SHORT_EDGE_SMALL_MAX_REM) {
      return this.applyContextFloor('small', context);
    }

    if (shortEdgeRem <= SHORT_EDGE_MID_MAX_REM) {
      return this.applyContextFloor('mid', context);
    }

    if (shortEdgeRem <= SHORT_EDGE_MID2_MAX_REM) {
      return this.applyContextFloor('mid2', context);
    }

    if (shortEdgeRem <= SHORT_EDGE_LARGE_MAX_REM) {
      return this.applyContextFloor('large', context);
    }

    return this.applyContextFloor('full', context);
  }

  private applyContextFloor(tier: MediaTier, context?: MediaContext): MediaTier {
    if (!context) {
      return tier;
    }

    const minTier = CONTEXT_MIN_TIER[context];
    return this.higherTier(tier, minTier);
  }

  private lowerTier(a: MediaTier, b: MediaTier): MediaTier {
    return this.rankOf(a) <= this.rankOf(b) ? a : b;
  }

  private higherTier(a: MediaTier, b: MediaTier): MediaTier {
    return this.rankOf(a) >= this.rankOf(b) ? a : b;
  }

  private rankOf(tier: MediaTier): number {
    return TIER_ORDER.indexOf(tier);
  }
}
