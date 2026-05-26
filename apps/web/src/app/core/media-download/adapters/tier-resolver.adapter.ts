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
import { PIXELS_PER_REM } from '../media-download.helpers';
import {
  remSlotToPixels,
  tierForMeasuredSlot,
} from '../media-slot-resolution.helpers';

const FALLBACK_CHAIN_BY_TIER: Readonly<Record<MediaTier, readonly MediaTier[]>> = {
  inline: [],
  small: ['inline'],
  mid: ['small', 'inline'],
  mid2: ['mid', 'small', 'inline'],
  large: ['mid2', 'mid', 'small', 'inline'],
  full: ['large', 'mid2', 'mid', 'small', 'inline'],
};

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

  /**
   * Picks preview tier from measured slot pixels × DPR, capped at detail unless `allowFull`.
   * @see media-slot-resolution.helpers.ts
   */
  selectRequestedTierForSlot(input: MediaTierSelectionInput): MediaTier {
    if (input.requestedTier === 'full' && input.allowFull !== false) {
      return 'full';
    }

    const slot = this.resolveSlotPixels(input);
    if (slot) {
      return tierForMeasuredSlot({
        slotWidthPx: slot.widthPx,
        slotHeightPx: slot.heightPx,
        devicePixelRatio: input.devicePixelRatio,
        allowFull: input.allowFull ?? false,
        context: input.context,
      });
    }

    return input.requestedTier;
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

  private resolveSlotPixels(
    input: MediaTierSelectionInput,
  ): { widthPx: number; heightPx: number } | null {
    const widthPx = input.slotWidthPx;
    const heightPx = input.slotHeightPx;
    if (
      widthPx != null &&
      heightPx != null &&
      Number.isFinite(widthPx) &&
      Number.isFinite(heightPx) &&
      widthPx > 0 &&
      heightPx > 0
    ) {
      return { widthPx, heightPx };
    }

    const widthRem = input.slotWidthRem;
    const heightRem = input.slotHeightRem;
    if (
      widthRem != null &&
      heightRem != null &&
      Number.isFinite(widthRem) &&
      Number.isFinite(heightRem) &&
      widthRem > 0 &&
      heightRem > 0
    ) {
      return remSlotToPixels(widthRem, heightRem);
    }

    return null;
  }
}
