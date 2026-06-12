import type { MediaContext, MediaTier } from '../media/media-renderer.types';
import type { MediaSize } from './media-download.types';
import { PIXELS_PER_REM } from './media-download.helpers';

/** Long-edge caps for Supabase image transforms — keep in sync with signed-url-cache TRANSFORMS. */
export const MEDIA_SIGNING_LONG_EDGE_PX: Readonly<Record<Exclude<MediaSize, 'full'>, number>> = {
  marker: 80,
  thumb: 256,
  detail: 1280,
};

const MAX_DEVICE_PIXEL_RATIO = 3;

/** Extra multiplier so bucket boundaries are not visibly soft (cover crop, JPEG). */
export const SLOT_PREVIEW_HEADROOM = 1.1;

/**
 * Grid slots at least this wide/tall (CSS px) always sign `storage_path` at detail (~1280),
 * even on 1× displays — avoids ~96px `thumbnail_path` in ~160–220px tiles.
 * Aligns with media grid `grid-md` min column (~160px).
 */
export const GRID_DETAIL_MIN_CSS_LONG_EDGE_PX = 160;

export interface MediaSlotMeasurement {
  widthPx: number;
  heightPx: number;
}

export interface SlotTierSelectionOptions {
  slotWidthPx: number;
  slotHeightPx: number;
  devicePixelRatio?: number;
  /** When false, never pick `full` from slot math (display surfaces). */
  allowFull?: boolean;
  context?: MediaContext;
}

/** Device pixel ratio for preview signing (capped for sanity on exotic displays). */
export function resolveDevicePixelRatio(override?: number): number {
  if (override != null && Number.isFinite(override) && override > 0) {
    return Math.min(override, MAX_DEVICE_PIXEL_RATIO);
  }
  if (typeof window !== 'undefined' && Number.isFinite(window.devicePixelRatio)) {
    return Math.min(Math.max(window.devicePixelRatio, 1), MAX_DEVICE_PIXEL_RATIO);
  }
  return 1;
}

/** Pixels needed on the long edge so the bitmap is not soft at the given slot × DPR. */
export function requiredLongEdgePxForSlot(
  widthPx: number,
  heightPx: number,
  devicePixelRatio?: number,
): number {
  const w = Math.max(1, Math.round(widthPx));
  const h = Math.max(1, Math.round(heightPx));
  const cssLongEdge = Math.max(w, h);
  const dpr = resolveDevicePixelRatio(devicePixelRatio);
  let required = Math.ceil(cssLongEdge * dpr * SLOT_PREVIEW_HEADROOM);

  if (cssLongEdge >= GRID_DETAIL_MIN_CSS_LONG_EDGE_PX) {
    required = Math.max(required, MEDIA_SIGNING_LONG_EDGE_PX.thumb + 1);
  }

  return required;
}

/** Smallest signing bucket whose transform long edge covers `requiredLongEdgePx`. */
export function mediaSizeForRequiredLongEdge(
  requiredLongEdgePx: number,
  options?: { allowFull?: boolean },
): MediaSize {
  const required = Math.max(1, Math.round(requiredLongEdgePx));

  if (required <= MEDIA_SIGNING_LONG_EDGE_PX.marker) {
    return 'marker';
  }
  if (required <= MEDIA_SIGNING_LONG_EDGE_PX.thumb) {
    return 'thumb';
  }
  if (required <= MEDIA_SIGNING_LONG_EDGE_PX.detail) {
    return 'detail';
  }

  return options?.allowFull ? 'full' : 'detail';
}

export function mediaSizeToTier(size: MediaSize): MediaTier {
  switch (size) {
    case 'marker':
      return 'inline';
    case 'thumb':
      return 'small';
    case 'detail':
      return 'large';
    case 'full':
    default:
      return 'full';
  }
}

/** Tier for a measured slot — primary API for grid, detail pane, and universal-media. */
export function tierForMeasuredSlot(options: SlotTierSelectionOptions): MediaTier {
  const required = requiredLongEdgePxForSlot(
    options.slotWidthPx,
    options.slotHeightPx,
    options.devicePixelRatio,
  );
  const size = mediaSizeForRequiredLongEdge(required, { allowFull: options.allowFull });
  return mediaSizeToTier(size);
}

export function remSlotToPixels(widthRem: number, heightRem: number): MediaSlotMeasurement {
  return {
    widthPx: Math.max(1, Math.round(widthRem * PIXELS_PER_REM)),
    heightPx: Math.max(1, Math.round(heightRem * PIXELS_PER_REM)),
  };
}

/** @internal Test helper — signing size for a slot without going through MediaTier. */
export function signingSizeForSlot(
  widthPx: number,
  heightPx: number,
  devicePixelRatio?: number,
  allowFull?: boolean,
): MediaSize {
  const required = requiredLongEdgePxForSlot(widthPx, heightPx, devicePixelRatio);
  return mediaSizeForRequiredLongEdge(required, { allowFull });
}
