import type { MediaContext } from '../../core/media/media-renderer.types';

/** Inputs for grid warm revisit after preview paths are registered. */
export type MediaDisplayWarmRevisitInput = {
  readonly downloadContext: MediaContext;
  readonly slotGeometry: 'fill' | 'intrinsic';
  readonly sessionAspectRatio: number | null;
  readonly cachedPreviewUrl: string | null;
};

/**
 * True when grid intrinsic tile can skip gray pulse: session ratio + signed URL already cached.
 * MUST run only after `registerPreviewPaths` (download subscription needs registration).
 * @see docs/specs/component/media/media-display.md
 */
export function canWarmSkipGridLoadingSurface(input: MediaDisplayWarmRevisitInput): boolean {
  if (input.downloadContext !== 'grid' || input.slotGeometry !== 'intrinsic') {
    return false;
  }

  const ratio = input.sessionAspectRatio;
  if (ratio == null || ratio <= 0 || !Number.isFinite(ratio)) {
    return false;
  }

  const url = input.cachedPreviewUrl?.trim();
  return !!url;
}
