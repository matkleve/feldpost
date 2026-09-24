import { Injectable, signal } from '@angular/core';
import { SHELL_PANEL_STACK_MIN_PX } from './shell-panel-stack-resize.constants';
import {
  clampShellPanelTopStackExtentPx,
  persistShellPanelTopStackExtentPx,
  readStoredShellPanelTopStackExtentPx,
  resolveDefaultShellPanelTopStackExtentPx,
  resolveShellPanelTopStackMaxPx,
} from './shell-panel-stack-resize.helpers';

/**
 * Top-stack height when both rail-aligned panel groups are open in the column.
 * @see docs/specs/ui/shell/shell-panel-resize.md § Stack divider
 */
@Injectable({ providedIn: 'root' })
export class ShellPanelStackResizeService {
  private readonly topExtent = signal<number | null>(null);

  minStackPx(): number {
    return SHELL_PANEL_STACK_MIN_PX;
  }

  defaultTopExtentPx(columnHeightPx: number): number {
    return resolveDefaultShellPanelTopStackExtentPx(columnHeightPx);
  }

  maxTopExtentPx(columnHeightPx: number): number {
    return resolveShellPanelTopStackMaxPx(columnHeightPx);
  }

  topStackExtentPx(columnHeightPx: number): number {
    const cached = this.topExtent();
    if (cached != null) {
      return clampShellPanelTopStackExtentPx(cached, columnHeightPx);
    }
    const stored = readStoredShellPanelTopStackExtentPx();
    const base =
      stored ?? resolveDefaultShellPanelTopStackExtentPx(columnHeightPx);
    const clamped = clampShellPanelTopStackExtentPx(base, columnHeightPx);
    this.topExtent.set(clamped);
    return clamped;
  }

  setTopStackExtent(extentPx: number, columnHeightPx: number): void {
    const clamped = clampShellPanelTopStackExtentPx(extentPx, columnHeightPx);
    this.topExtent.set(clamped);
    persistShellPanelTopStackExtentPx(clamped);
  }

  resetTopStackExtent(columnHeightPx: number): void {
    this.setTopStackExtent(
      resolveDefaultShellPanelTopStackExtentPx(columnHeightPx),
      columnHeightPx,
    );
  }
}
