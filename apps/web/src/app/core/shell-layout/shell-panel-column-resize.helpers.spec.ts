import { describe, expect, it } from 'vitest';
import {
  clampShellPanelColumnWidthPx,
  resolveShellPanelColumnMaxWidthPx,
  resolveShellPanelColumnMinWidthPx,
} from './shell-panel-column-resize.helpers';

describe('shell-panel-column-resize.helpers', () => {
  it('enforces 480px minimum on a wide viewport', () => {
    expect(resolveShellPanelColumnMinWidthPx(1600)).toBe(480);
  });

  it('clamps panel width between min and max', () => {
    const viewport = 1200;
    expect(clampShellPanelColumnWidthPx(200, viewport)).toBe(
      resolveShellPanelColumnMinWidthPx(viewport),
    );
    expect(clampShellPanelColumnWidthPx(2000, viewport)).toBe(
      resolveShellPanelColumnMaxWidthPx(viewport),
    );
    expect(clampShellPanelColumnWidthPx(520, viewport)).toBe(520);
  });
});
