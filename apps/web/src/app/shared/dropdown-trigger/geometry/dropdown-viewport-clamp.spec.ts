import { describe, expect, it } from 'vitest';
import { clampDropdownPanelToViewport } from './dropdown-viewport-clamp';

describe('clampDropdownPanelToViewport', () => {
  it('clamps right overflow using measured panel width', () => {
    const viewportWidth = 400;
    const viewportHeight = 800;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: viewportWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: viewportHeight });

    const { left } = clampDropdownPanelToViewport({
      desiredLeft: 350,
      desiredTop: 100,
      panelWidth: 200,
      panelHeight: 120,
    });

    expect(left).toBe(viewportWidth - 200 - 8);
  });

  it('flips above the anchor when the panel would overflow the bottom', () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 800 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });

    const desiredTop = 500;
    const panelH = 200;
    const { top } = clampDropdownPanelToViewport({
      desiredLeft: 16,
      desiredTop,
      panelWidth: 180,
      panelHeight: panelH,
    });

    expect(top).toBe(desiredTop - 4 - panelH - 4);
  });
});
