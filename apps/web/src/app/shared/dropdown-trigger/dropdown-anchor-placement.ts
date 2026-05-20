/**
 * Viewport bounds for anchored dropdown shells — uses the nearest scroll/clipping ancestor
 * (e.g. media-detail `.detail-scroll`), not only `window`, so flip above/below matches what the user sees.
 * Aligns with Angular CDK `FlexibleConnectedPositionStrategy` fallback positions (below, then above).
 * @see https://material.angular.dev/cdk/overlay/overview
 * @see docs/specs/component/filters/dropdown-system.md
 */

export interface PlacementBounds {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export interface AnchorPlacementResult {
  top: number;
  left: number;
  openBelow: boolean;
}

/** Nearest ancestor that clips or scrolls content (detail panel, modal body, etc.). */
export function findScrollClipParent(node: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = node.parentElement;
  while (el && el !== document.body) {
    const style = getComputedStyle(el);
    const overflowY = style.overflowY;
    const overflow = style.overflow;
    const scrollableY =
      overflowY === 'auto' ||
      overflowY === 'scroll' ||
      overflow === 'auto' ||
      overflow === 'scroll';
    const hiddenY = overflowY === 'hidden' || overflow === 'hidden';
    if (scrollableY || hiddenY) {
      if (hiddenY || el.scrollHeight > el.clientHeight + 1) {
        return el;
      }
    }
    el = el.parentElement;
  }
  return null;
}

/** Visible placement rectangle in viewport coordinates. */
export function getPlacementBounds(anchor: HTMLElement, marginPx: number): PlacementBounds {
  const clip = findScrollClipParent(anchor);
  if (clip) {
    const r = clip.getBoundingClientRect();
    return {
      top: r.top + marginPx,
      left: r.left + marginPx,
      bottom: r.bottom - marginPx,
      right: r.right - marginPx,
    };
  }

  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  const top = (vv?.offsetTop ?? 0) + marginPx;
  const left = (vv?.offsetLeft ?? 0) + marginPx;
  const height = vv?.height ?? window.innerHeight;
  const width = vv?.width ?? window.innerWidth;
  return {
    top,
    left,
    bottom: top + height - marginPx,
    right: left + width - marginPx,
  };
}

/**
 * Prefer below anchor; flip above when the panel does not fit in the clipping bounds.
 * Unknown height does not imply "fits below" (avoids first-frame stuck below).
 */
export function computeAnchorPlacementForElement(
  anchor: HTMLElement,
  panel: HTMLElement,
  placement: 'start' | 'end',
  gapPx: number,
  marginPx: number,
): AnchorPlacementResult {
  const bounds = getPlacementBounds(anchor, marginPx);
  const anchorRect = anchor.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const panelW = panelRect.width || panel.offsetWidth || 0;
  const panelH = panelRect.height || panel.offsetHeight || 0;

  const belowTop = anchorRect.bottom + gapPx;
  const aboveTop = anchorRect.top - gapPx - panelH;
  const spaceBelow = bounds.bottom - belowTop;
  const spaceAbove = anchorRect.top - gapPx - bounds.top;

  let openBelow: boolean;
  if (panelH > 0) {
    const fitsBelow = belowTop + panelH <= bounds.bottom;
    const fitsAbove = aboveTop >= bounds.top;
    if (fitsBelow) {
      openBelow = true;
    } else if (fitsAbove) {
      openBelow = false;
    } else {
      openBelow = spaceBelow >= spaceAbove;
    }
  } else {
    const minBand = 120;
    openBelow = spaceBelow >= minBand && spaceBelow > spaceAbove;
  }

  const rawTop = openBelow ? belowTop : Math.max(bounds.top, aboveTop);
  const top =
    panelH > 0
      ? Math.min(Math.max(bounds.top, rawTop), bounds.bottom - panelH)
      : Math.max(bounds.top, rawTop);

  let left: number;
  if (placement === 'end') {
    left = anchorRect.right - panelW;
    if (left < bounds.left) {
      left = anchorRect.left;
    }
  } else {
    left = anchorRect.left;
    if (panelW > 0 && left + panelW > bounds.right) {
      left = anchorRect.right - panelW;
    }
  }
  left = Math.max(bounds.left, Math.min(left, bounds.right - panelW));

  return {
    top: Math.round(top),
    left: Math.round(left),
    openBelow,
  };
}
