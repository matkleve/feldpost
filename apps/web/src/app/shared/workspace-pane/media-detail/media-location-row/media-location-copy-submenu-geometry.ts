/** Viewport placement for the location-row copy flyout (opens to the right of the trigger). */
const VIEWPORT_PAD_PX = 8;
const TRIGGER_GAP_PX = 4;
const PANEL_MIN_WIDTH_PX = 11 * 16;

export interface LocationCopySubmenuGeom {
  top: number;
  left: number;
}

export function computeLocationCopySubmenuGeom(trigger: HTMLElement): LocationCopySubmenuGeom {
  const rect = trigger.getBoundingClientRect();
  let left = rect.right + TRIGGER_GAP_PX;
  if (left + PANEL_MIN_WIDTH_PX > window.innerWidth - VIEWPORT_PAD_PX) {
    left = Math.max(VIEWPORT_PAD_PX, rect.left - TRIGGER_GAP_PX - PANEL_MIN_WIDTH_PX);
  }
  left = Math.max(
    VIEWPORT_PAD_PX,
    Math.min(left, window.innerWidth - PANEL_MIN_WIDTH_PX - VIEWPORT_PAD_PX),
  );
  const top = Math.max(
    VIEWPORT_PAD_PX,
    Math.min(rect.top, window.innerHeight - VIEWPORT_PAD_PX - 48),
  );
  return { top: Math.round(top), left: Math.round(left) };
}
