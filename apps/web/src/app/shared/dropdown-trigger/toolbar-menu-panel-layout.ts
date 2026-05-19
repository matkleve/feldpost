/**
 * Toolbar menu width for `left` clamp — keep in sync with `dropdown-shell.component.scss` `:host.toolbar-dropdown`.
 * TEST (non-filter): **18rem === 288px** at 16px root. **Filter** uses **32rem === 512px** floor, **40rem === 640px** cap.
 * @see docs/specs/component/filters/dropdown-system.md#toolbar-menu-panels-anchored-ui
 */
export const TOOLBAR_MENU_PANEL_MIN_PX = 288;

/** Wider filter panel floor — keep in sync with `:host.toolbar-dropdown.toolbar-dropdown--filter` (**32rem === 512px** at 16px root). */
export const TOOLBAR_MENU_FILTER_PANEL_MIN_PX = 512;
/** Filter panel viewport cap — keep in sync with `:host.toolbar-dropdown.toolbar-dropdown--filter` (**40rem === 640px** at 16px root). */
export const TOOLBAR_MENU_FILTER_PANEL_MAX_PX = 640;

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

/** Horizontal width used to clamp `left` when opening a toolbar menu (match shell width for fixed menus, cap width for filter). */
export function toolbarDropdownPositionWidthPx(activePanelId: string | null): number {
  return activePanelId === 'filter' ? TOOLBAR_MENU_FILTER_PANEL_MAX_PX : TOOLBAR_MENU_SHELL_MIN_PX;
}
