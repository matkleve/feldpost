import type { PickerFlyoutGeom } from './filter-dropdown.types';

const VIEWPORT_PAD_PX = 8;
const MIN_FLYOUT_HEIGHT_PX = 120;
const FLYOUT_WANT_HEIGHT_PX = 280;
const FLYOUT_MIN_WIDTH_PX = 160;
const OPEN_DOWN_MIN_SPACE_PX = 120;
const TRIGGER_GAP_PX = 2;

/**
 * Positions a fixed flyout under (or above) a compact picker trigger, clamped to the viewport.
 * @see docs/specs/component/filters/filter-dropdown.md
 */
export function computeFilterPickerFlyoutGeom(trigger: HTMLElement): PickerFlyoutGeom {
  const r = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - r.bottom - VIEWPORT_PAD_PX;
  const spaceAbove = r.top - VIEWPORT_PAD_PX;
  const openDown = spaceBelow >= OPEN_DOWN_MIN_SPACE_PX || spaceBelow >= spaceAbove;
  const maxHeight = Math.min(
    FLYOUT_WANT_HEIGHT_PX,
    Math.max(MIN_FLYOUT_HEIGHT_PX, openDown ? spaceBelow : spaceAbove),
  );
  const top = openDown
    ? r.bottom + TRIGGER_GAP_PX
    : Math.max(VIEWPORT_PAD_PX, r.top - maxHeight - TRIGGER_GAP_PX);
  const width = Math.max(r.width, FLYOUT_MIN_WIDTH_PX);
  const left = Math.max(
    VIEWPORT_PAD_PX,
    Math.min(r.left, window.innerWidth - width - VIEWPORT_PAD_PX),
  );
  return { top, left, width, maxHeight };
}
