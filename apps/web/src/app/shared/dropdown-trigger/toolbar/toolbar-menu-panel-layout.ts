import { DROPDOWN_VIEWPORT_MARGIN_PX } from '../geometry/dropdown-viewport-clamp';

/**
 * Toolbar menu width — keep in sync with `dropdown-shell.component.scss` `:host.toolbar-dropdown`.
 * Standard panels: **18rem === 288px** at 16px root. Filter: **32rem === 512px** floor, **40rem === 640px** cap.
 * @see docs/specs/component/filters/dropdown-system.md#toolbar-menu-panels-anchored-ui
 */
export const TOOLBAR_MENU_PANEL_MIN_PX = 288;

/** Wider filter panel floor — keep in sync with `:host.toolbar-dropdown.toolbar-dropdown--filter` (**32rem === 512px** at 16px root). */
export const TOOLBAR_MENU_FILTER_PANEL_MIN_PX = 512;
/** Filter panel viewport cap — keep in sync with `:host.toolbar-dropdown.toolbar-dropdown--filter` (**40rem === 640px** at 16px root). */
export const TOOLBAR_MENU_FILTER_PANEL_MAX_PX = 640;
/** Timespace panel floor — keep in sync with `:host.toolbar-dropdown.toolbar-dropdown--timespace` (**22rem === 352px** at 16px root). */
export const TOOLBAR_MENU_TIMESPACE_PANEL_MIN_PX = 352;
/** Timespace panel viewport cap — keep in sync with `:host.toolbar-dropdown.toolbar-dropdown--timespace` (**26rem === 416px** at 16px root). */
export const TOOLBAR_MENU_TIMESPACE_PANEL_MAX_PX = 416;

/** Viewport clamp width for toolbar shell positioning (sort, grouping, projects, and non-filter panels). */
export const TOOLBAR_MENU_SHELL_MIN_PX = TOOLBAR_MENU_PANEL_MIN_PX;

/**
 * Use when positioning / measuring the **filter** toolbar shell (wider than other menus).
 * @deprecated Name kept for imports; value tracks the filter floor, not `TOOLBAR_MENU_SHELL_MIN_PX`.
 */
export const TOOLBAR_MENU_FILTER_CLAMP_PX = TOOLBAR_MENU_FILTER_PANEL_MIN_PX;

const TOOLBAR_DROPDOWN_PANEL_BASE = 'toolbar-dropdown option-menu-surface';

/** `panelClass` for `app-dropdown-shell` — adds modifier classes per open panel. */
export function toolbarDropdownPanelClass(activePanelId: string | null): string {
  if (activePanelId === 'filter') {
    return `${TOOLBAR_DROPDOWN_PANEL_BASE} toolbar-dropdown--filter`;
  }
  if (activePanelId === 'timespace') {
    return `${TOOLBAR_DROPDOWN_PANEL_BASE} toolbar-dropdown--timespace`;
  }
  return TOOLBAR_DROPDOWN_PANEL_BASE;
}

/** Horizontal width used to clamp `left` when opening a toolbar menu. */
export function toolbarDropdownPositionWidthPx(activePanelId: string | null): number {
  if (activePanelId === 'filter') return TOOLBAR_MENU_FILTER_PANEL_MAX_PX;
  if (activePanelId === 'timespace') return TOOLBAR_MENU_TIMESPACE_PANEL_MAX_PX;
  return TOOLBAR_MENU_SHELL_MIN_PX;
}

export interface ClampToolbarDropdownLeftParams {
  desiredLeft: number;
  panelWidthPx: number;
  viewportWidth?: number;
  margin?: number;
}

/** Clamps horizontal `left` for a fixed toolbar menu panel inside the viewport. */
export function clampToolbarDropdownLeft(params: ClampToolbarDropdownLeftParams): number {
  const margin = params.margin ?? DROPDOWN_VIEWPORT_MARGIN_PX;
  const viewportWidth =
    params.viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : params.desiredLeft + params.panelWidthPx);
  const maxRight = viewportWidth - margin;
  let left = params.desiredLeft;
  if (left + params.panelWidthPx > maxRight) {
    left = maxRight - params.panelWidthPx;
  }
  return Math.max(margin, left);
}
