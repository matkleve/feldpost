import { describe, expect, it } from 'vitest';
import {
  TOOLBAR_MENU_FILTER_PANEL_MAX_PX,
  TOOLBAR_MENU_SHELL_MIN_PX,
  clampToolbarDropdownLeft,
  toolbarDropdownPositionWidthPx,
} from './toolbar-menu-panel-layout';

describe('toolbar-menu-panel-layout', () => {
  it('uses 288px for standard toolbar panels', () => {
    expect(TOOLBAR_MENU_SHELL_MIN_PX).toBe(288);
    expect(toolbarDropdownPositionWidthPx('sort')).toBe(288);
  });

  it('uses 640px clamp width for filter', () => {
    expect(toolbarDropdownPositionWidthPx('filter')).toBe(TOOLBAR_MENU_FILTER_PANEL_MAX_PX);
    expect(TOOLBAR_MENU_FILTER_PANEL_MAX_PX).toBe(640);
  });

  it('clampToolbarDropdownLeft keeps panel inside viewport', () => {
    expect(
      clampToolbarDropdownLeft({
        desiredLeft: 900,
        panelWidthPx: 288,
        viewportWidth: 1000,
        margin: 8,
      }),
    ).toBe(704);
  });

  it('clampToolbarDropdownLeft respects minimum margin', () => {
    expect(
      clampToolbarDropdownLeft({
        desiredLeft: 0,
        panelWidthPx: 288,
        viewportWidth: 1000,
        margin: 8,
      }),
    ).toBe(8);
  });
});
