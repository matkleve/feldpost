/** Viewport inset for fixed dropdown panels. */
export const DROPDOWN_VIEWPORT_MARGIN_PX = 8;

/** Gap between trigger bottom and panel top when opening downward (matches toolbar callers). */
export const DROPDOWN_ANCHOR_GAP_PX = 4;

export interface ClampDropdownPanelToViewportParams {
  desiredLeft: number;
  desiredTop: number;
  panelWidth: number;
  panelHeight: number;
  margin?: number;
  anchorGapPx?: number;
}

/**
 * Clamps a fixed-position dropdown panel inside the viewport; flips above the anchor when needed.
 * Callers pass `desiredTop` / `desiredLeft` from `getBoundingClientRect()` (typically below the trigger).
 * @see docs/specs/component/filters/dropdown-system.md
 */
export function clampDropdownPanelToViewport(
  params: ClampDropdownPanelToViewportParams,
): { left: number; top: number } {
  const margin = params.margin ?? DROPDOWN_VIEWPORT_MARGIN_PX;
  const gap = params.anchorGapPx ?? DROPDOWN_ANCHOR_GAP_PX;
  let left = params.desiredLeft;
  let top = params.desiredTop;
  const panelW = params.panelWidth;
  const panelH = params.panelHeight;

  if (typeof window === 'undefined') {
    return { left, top };
  }

  const maxBottom = window.innerHeight - margin;
  const maxRight = window.innerWidth - margin;

  if (top + panelH > maxBottom) {
    const anchorBottom = top - gap;
    top = anchorBottom - panelH - gap;
  }

  if (left + panelW > maxRight) {
    left = maxRight - panelW;
  }
  left = Math.max(margin, left);

  if (top + panelH > maxBottom) {
    top = maxBottom - panelH;
  }
  top = Math.max(margin, top);

  return { left, top };
}
