/**
 * Scroll ownership for `app-menu-panel-scroll-region` / `app-standard-dropdown`.
 * @see docs/specs/component/filters/dropdown-system.md
 */
export type MenuPanelScrollMode = 'host' | 'delegate' | 'split' | 'none';

const SCROLL_MODE_CLASS: Record<MenuPanelScrollMode, string> = {
  host: '',
  delegate: 'standard-dropdown__items--scrollbar-gutter-delegate',
  split: 'standard-dropdown__items--scroll-split',
  none: 'standard-dropdown__items--filter-rules-band',
};

/** Maps scroll mode to `standard-dropdown__items` modifier class(es). */
export function menuPanelScrollHostClasses(mode: MenuPanelScrollMode, extraItemsClass = ''): string {
  const modeClass = SCROLL_MODE_CLASS[mode];
  const parts = ['standard-dropdown__items', 'flex', 'flex-1', 'flex-col', 'py-0', 'min-h-0', modeClass, extraItemsClass]
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ');
  return parts;
}

/** Overflow utilities for the scroll host from scroll mode. */
export function menuPanelScrollOverflowClasses(mode: MenuPanelScrollMode): string {
  if (mode === 'delegate' || mode === 'split') {
    return 'overflow-x-hidden overflow-y-hidden';
  }
  if (mode === 'none') {
    return 'overflow-y-auto overflow-x-hidden';
  }
  return 'overflow-y-auto overflow-x-hidden';
}
