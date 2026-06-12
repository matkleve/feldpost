import { Injectable } from '@angular/core';

export interface PhotoMarkerIconState {
  count: number;
  thumbnailUrl?: string;
  fallbackLabel?: string;
  direction?: number;
  corrected?: boolean;
  uploading?: boolean;
  loading: boolean;
}

interface IconOverride {
  count: number;
  thumbnailUrl?: string;
  fallbackLabel?: string;
  direction?: number;
  corrected?: boolean;
  uploading?: boolean;
}

interface MarkerStateLike {
  count: number;
  thumbnailUrl?: string;
  direction?: number;
  corrected?: boolean;
  uploading?: boolean;
  thumbnailLoading?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PhotoMarkerIconStateService {
  resolveIconState(
    markerState: MarkerStateLike | undefined,
    override: Partial<IconOverride> | undefined,
    resolvedFallbackLabel: string | undefined,
  ): PhotoMarkerIconState {
    return {
      count: this.resolveCount(markerState, override),
      thumbnailUrl: this.resolveThumbnailUrl(markerState, override),
      fallbackLabel: resolvedFallbackLabel,
      direction: this.resolveDirection(markerState, override),
      corrected: this.resolveCorrected(markerState, override),
      uploading: this.resolveUploading(markerState, override),
      loading: markerState?.thumbnailLoading ?? false,
    };
  }

  private resolveCount(
    markerState: MarkerStateLike | undefined,
    override: Partial<IconOverride> | undefined,
  ): number {
    if (typeof override?.count === 'number') return override.count;
    if (typeof markerState?.count === 'number') return markerState.count;
    return 1;
  }

  private resolveThumbnailUrl(
    markerState: MarkerStateLike | undefined,
    override: Partial<IconOverride> | undefined,
  ): string | undefined {
    if (typeof override?.thumbnailUrl !== 'undefined') return override.thumbnailUrl;
    return markerState?.thumbnailUrl;
  }

  private resolveDirection(
    markerState: MarkerStateLike | undefined,
    override: Partial<IconOverride> | undefined,
  ): number | undefined {
    if (typeof override?.direction !== 'undefined') return override.direction;
    return markerState?.direction;
  }

  private resolveCorrected(
    markerState: MarkerStateLike | undefined,
    override: Partial<IconOverride> | undefined,
  ): boolean | undefined {
    if (typeof override?.corrected !== 'undefined') return override.corrected;
    return markerState?.corrected;
  }

  private resolveUploading(
    markerState: MarkerStateLike | undefined,
    override: Partial<IconOverride> | undefined,
  ): boolean | undefined {
    if (typeof override?.uploading !== 'undefined') return override.uploading;
    return markerState?.uploading;
  }
}
