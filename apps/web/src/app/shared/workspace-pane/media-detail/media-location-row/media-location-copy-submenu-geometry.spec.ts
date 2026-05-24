import { describe, expect, it, vi } from 'vitest';
import { computeLocationCopySubmenuGeom } from './media-location-copy-submenu-geometry';

describe('computeLocationCopySubmenuGeom', () => {
  it('places the panel to the right of the trigger', () => {
    vi.stubGlobal('innerWidth', 1200);
    vi.stubGlobal('innerHeight', 800);

    const trigger = {
      getBoundingClientRect: () => ({
        top: 100,
        left: 200,
        right: 420,
        bottom: 132,
        width: 220,
        height: 32,
        x: 200,
        y: 100,
        toJSON: () => ({}),
      }),
    } as HTMLElement;

    const geom = computeLocationCopySubmenuGeom(trigger);
    expect(geom.left).toBe(424);
    expect(geom.top).toBe(100);
  });
});
