import type { ItemDisplayMode } from '../../shared/item-grid/item.component';
import type { MediaTier } from '../../core/media/media-renderer.types';

const DEFAULT_ROOT_FONT_PX = 16;

export function requestedTierForMode(mode: ItemDisplayMode): MediaTier {
  switch (mode) {
    case 'row':
      return 'inline';
    case 'grid-sm':
      return 'small';
    case 'grid-md':
      return 'mid';
    case 'grid-lg':
      return 'mid2';
    case 'card':
      return 'large';
    default:
      return 'small';
  }
}

export function rectToRemSize(
  rect: Pick<DOMRectReadOnly, 'width' | 'height'>,
): { widthRem: number; heightRem: number } | null {
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const rootFontPx = resolveRootFontPx();
  return {
    widthRem: rect.width / rootFontPx,
    heightRem: rect.height / rootFontPx,
  };
}

function resolveRootFontPx(): number {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return DEFAULT_ROOT_FONT_PX;
  }

  const rootFont = getComputedStyle(document.documentElement).fontSize;
  const parsed = Number.parseFloat(rootFont);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_ROOT_FONT_PX;
}
