import { describe, expect, it } from 'vitest';
import { menuPanelScrollHostClasses, menuPanelScrollOverflowClasses } from './menu-panel-scroll-mode';

describe('menu-panel-scroll-mode', () => {
  it('maps split mode to scroll-split class', () => {
    expect(menuPanelScrollHostClasses('split', '')).toContain('standard-dropdown__items--scroll-split');
  });

  it('delegate mode hides outer overflow', () => {
    expect(menuPanelScrollOverflowClasses('delegate')).toContain('overflow-y-hidden');
  });
});
