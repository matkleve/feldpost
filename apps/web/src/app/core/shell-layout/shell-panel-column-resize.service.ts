import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { SHELL_PANEL_COLUMN_DEFAULT_WIDTH_PX } from './shell-panel-column-resize.constants';
import {
  clampShellPanelColumnWidthPx,
  persistShellPanelColumnWidthPx,
  resolveInitialShellPanelColumnWidthPx,
  resolveShellPanelColumnMaxWidthPx,
  resolveShellPanelColumnMinWidthPx,
} from './shell-panel-column-resize.helpers';

/**
 * Persisted width of the grid shell panel column while any panel is open.
 * @see docs/specs/ui/shell/shell-panel-resize.md
 */
@Injectable({ providedIn: 'root' })
export class ShellPanelColumnResizeService {
  private readonly destroyRef = inject(DestroyRef);
  private readonly viewportWidth = signal(this.readViewportWidth());
  private readonly _panelColumnWidthPx = signal(
    resolveInitialShellPanelColumnWidthPx(this.readViewportWidth()),
  );

  readonly panelColumnWidthPx = this._panelColumnWidthPx.asReadonly();

  readonly minWidthPx = computed(() => resolveShellPanelColumnMinWidthPx(this.viewportWidth()));
  readonly maxWidthPx = computed(() => resolveShellPanelColumnMaxWidthPx(this.viewportWidth()));
  readonly defaultWidthPx = computed(() =>
    clampShellPanelColumnWidthPx(
      SHELL_PANEL_COLUMN_DEFAULT_WIDTH_PX,
      this.viewportWidth(),
    ),
  );

  constructor() {
    if (typeof window === 'undefined') {
      return;
    }
    const onResize = (): void => {
      this.viewportWidth.set(this.readViewportWidth());
      this._panelColumnWidthPx.update((current) =>
        clampShellPanelColumnWidthPx(current, this.viewportWidth()),
      );
    };
    window.addEventListener('resize', onResize, { passive: true });
    this.destroyRef.onDestroy(() => window.removeEventListener('resize', onResize));
  }

  setWidth(nextWidth: number): void {
    const clamped = clampShellPanelColumnWidthPx(nextWidth, this.viewportWidth());
    this._panelColumnWidthPx.set(clamped);
    persistShellPanelColumnWidthPx(clamped);
  }

  private readViewportWidth(): number {
    return typeof window !== 'undefined' ? window.innerWidth : 1280;
  }
}
