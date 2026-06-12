/**
 * Pixel layout constants derived from typography/spacing tokens (@ 16px root).
 * Use for TS menu positioning/clamping where CSS `var()` is unavailable.
 *
 * @see apps/web/src/styles/_typography-baseline.scss
 * @see apps/web/src/styles/_option-menu-list.scss
 * @see apps/web/src/app/features/map/map-shell/scss/_map-shell-context-menu.scss
 */
const ROOT_FONT_SIZE_PX = 16;

/** `var(--spacing-1)` — 0.25rem. */
export const SPACING_1_PX = ROOT_FONT_SIZE_PX * 0.25;

/** `var(--spacing-2)` — 0.5rem. */
export const SPACING_2_PX = ROOT_FONT_SIZE_PX * 0.5;

/** `var(--spacing-5)` — 1.5rem. */
export const SPACING_5_PX = ROOT_FONT_SIZE_PX * 1.5;

/** Anchored context menu width — `14rem` (map/upload/project cards). */
export const CONTEXT_MENU_PANEL_WIDTH_PX = 14 * ROOT_FONT_SIZE_PX;

/** Vertical gap below menu trigger — `var(--spacing-1)`. */
export const CONTEXT_MENU_PANEL_OFFSET_Y_PX = SPACING_1_PX;

/** Viewport edge margin when clamping menu position — `var(--spacing-2)`. */
export const CONTEXT_MENU_VIEWPORT_MARGIN_PX = SPACING_2_PX;

/** Estimated menu row height (`2.75rem`, above `option-menu-item` 2rem floor). */
export const CONTEXT_MENU_ROW_ESTIMATE_PX = 2.75 * ROOT_FONT_SIZE_PX;

/** Menu shell chrome (padding + gap) for action lists — `var(--spacing-5)`. */
export const CONTEXT_MENU_ACTIONS_CHROME_PX = SPACING_5_PX;

/** Color-picker submenu height estimate — `7.5rem`. */
export const CONTEXT_MENU_COLOR_PANEL_HEIGHT_PX = 7.5 * ROOT_FONT_SIZE_PX;
