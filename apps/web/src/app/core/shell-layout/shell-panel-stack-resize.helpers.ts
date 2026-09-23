import {
  SHELL_PANEL_STACK_DEFAULT_RATIO,
  SHELL_PANEL_STACK_DIVIDER_PX,
  SHELL_PANEL_STACK_MIN_PX,
  SHELL_PANEL_STACK_TOP_EXTENT_STORAGE_KEY,
} from './shell-panel-stack-resize.constants';

export function resolveShellPanelTopStackMaxPx(columnHeightPx: number): number {
  return Math.max(
    SHELL_PANEL_STACK_MIN_PX,
    columnHeightPx - SHELL_PANEL_STACK_MIN_PX - SHELL_PANEL_STACK_DIVIDER_PX,
  );
}

export function clampShellPanelTopStackExtentPx(
  extentPx: number,
  columnHeightPx: number,
): number {
  const min = SHELL_PANEL_STACK_MIN_PX;
  const max = resolveShellPanelTopStackMaxPx(columnHeightPx);
  return Math.min(Math.max(Math.round(extentPx), min), max);
}

export function resolveDefaultShellPanelTopStackExtentPx(columnHeightPx: number): number {
  const byRatio = Math.floor(columnHeightPx * SHELL_PANEL_STACK_DEFAULT_RATIO);
  return clampShellPanelTopStackExtentPx(byRatio, columnHeightPx);
}

export function readStoredShellPanelTopStackExtentPx(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(SHELL_PANEL_STACK_TOP_EXTENT_STORAGE_KEY);
  if (raw == null) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function persistShellPanelTopStackExtentPx(extentPx: number): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(SHELL_PANEL_STACK_TOP_EXTENT_STORAGE_KEY, String(extentPx));
}

export function resolveInitialShellPanelTopStackExtentPx(columnHeightPx: number): number {
  const stored = readStoredShellPanelTopStackExtentPx();
  const base = stored ?? resolveDefaultShellPanelTopStackExtentPx(columnHeightPx);
  return clampShellPanelTopStackExtentPx(base, columnHeightPx);
}
