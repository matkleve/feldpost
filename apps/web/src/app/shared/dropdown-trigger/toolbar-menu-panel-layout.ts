/**
 * Toolbar menu width for `left` clamp — keep in sync with `dropdown-shell.component.scss` `:host.toolbar-dropdown`.
 * TEST: **18rem === 288px** at 16px root (revert with shell SCSS to 416 / 512 when done experimenting).
 * @see docs/specs/component/filters/dropdown-system.md#toolbar-menu-panels-anchored-ui
 */
export const TOOLBAR_MENU_PANEL_MIN_PX = 288;

/** TEST: same width as other toolbar panels (18rem); restore 512 when filter shell is wider again. */
export const TOOLBAR_MENU_FILTER_PANEL_MIN_PX = 288;

/** Viewport clamp width for toolbar shell positioning (sort, grouping, projects, and non-filter panels). */
export const TOOLBAR_MENU_SHELL_MIN_PX = TOOLBAR_MENU_PANEL_MIN_PX;

/**
 * Use when positioning / measuring the **filter** toolbar shell (wider than other menus).
 * @deprecated Name kept for imports; value tracks the filter floor, not `TOOLBAR_MENU_SHELL_MIN_PX`.
 */
export const TOOLBAR_MENU_FILTER_CLAMP_PX = TOOLBAR_MENU_FILTER_PANEL_MIN_PX;

const TOOLBAR_DROPDOWN_PANEL_BASE = 'toolbar-dropdown option-menu-surface';

/** `panelClass` for `app-dropdown-shell` — adds `toolbar-dropdown--filter` when the open panel is filter. */
export function toolbarDropdownPanelClass(activePanelId: string | null): string {
  return activePanelId === 'filter' ? `${TOOLBAR_DROPDOWN_PANEL_BASE} toolbar-dropdown--filter` : TOOLBAR_DROPDOWN_PANEL_BASE;
}

/** Horizontal width used to clamp `left` when opening a toolbar menu (must match the active panel’s CSS min-width). */
export function toolbarDropdownPositionWidthPx(activePanelId: string | null): number {
  return activePanelId === 'filter' ? TOOLBAR_MENU_FILTER_PANEL_MIN_PX : TOOLBAR_MENU_SHELL_MIN_PX;
}
