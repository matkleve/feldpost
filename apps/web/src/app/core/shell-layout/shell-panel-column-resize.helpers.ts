import {
  LEGACY_WORKSPACE_PANE_WIDTH_STORAGE_KEY,
  SHELL_PANEL_COLUMN_CANVAS_MIN_WIDTH_PX,
  SHELL_PANEL_COLUMN_DEFAULT_WIDTH_PX,
  SHELL_PANEL_COLUMN_MIN_WIDTH_PX,
  SHELL_PANEL_COLUMN_WIDTH_STORAGE_KEY,
} from './shell-panel-column-resize.constants';

export function resolveShellPanelColumnMinWidthPx(viewportWidth: number): number {
  return Math.max(Math.round(viewportWidth * 0.25), SHELL_PANEL_COLUMN_MIN_WIDTH_PX);
}

export function resolveShellPanelColumnMaxWidthPx(viewportWidth: number): number {
  const byRatio = Math.round(viewportWidth * 0.75);
  const byCanvas = viewportWidth - SHELL_PANEL_COLUMN_CANVAS_MIN_WIDTH_PX;
  return Math.max(
    resolveShellPanelColumnMinWidthPx(viewportWidth),
    Math.min(byRatio, byCanvas),
  );
}

export function clampShellPanelColumnWidthPx(width: number, viewportWidth: number): number {
  const min = resolveShellPanelColumnMinWidthPx(viewportWidth);
  const max = resolveShellPanelColumnMaxWidthPx(viewportWidth);
  return Math.min(Math.max(Math.round(width), min), max);
}

export function readStoredShellPanelColumnWidthPx(): number | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.localStorage.getItem(SHELL_PANEL_COLUMN_WIDTH_STORAGE_KEY);
  if (raw != null) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  const legacyRaw = window.localStorage.getItem(LEGACY_WORKSPACE_PANE_WIDTH_STORAGE_KEY);
  if (legacyRaw == null) {
    return null;
  }
  const legacyParsed = Number.parseInt(legacyRaw, 10);
  if (!Number.isFinite(legacyParsed) || legacyParsed <= 0) {
    return null;
  }
  persistShellPanelColumnWidthPx(legacyParsed);
  return legacyParsed;
}

export function persistShellPanelColumnWidthPx(width: number): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(SHELL_PANEL_COLUMN_WIDTH_STORAGE_KEY, String(width));
}

export function resolveInitialShellPanelColumnWidthPx(viewportWidth: number): number {
  const stored = readStoredShellPanelColumnWidthPx();
  const base = stored ?? SHELL_PANEL_COLUMN_DEFAULT_WIDTH_PX;
  return clampShellPanelColumnWidthPx(base, viewportWidth);
}
