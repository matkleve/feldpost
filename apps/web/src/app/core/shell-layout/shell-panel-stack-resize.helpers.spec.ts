import { describe, expect, it } from 'vitest';
import {
  clampShellPanelTopStackExtentPx,
  resolveShellPanelTopStackMaxPx,
} from './shell-panel-stack-resize.helpers';

describe('shell-panel-stack-resize.helpers', () => {
  it('caps top stack so bottom keeps minimum height', () => {
    expect(resolveShellPanelTopStackMaxPx(400)).toBe(270);
  });

  it('clamps extent between stack min and computed max', () => {
    expect(clampShellPanelTopStackExtentPx(40, 500)).toBe(128);
    expect(clampShellPanelTopStackExtentPx(400, 500)).toBe(370);
    expect(clampShellPanelTopStackExtentPx(200, 500)).toBe(200);
  });
});
