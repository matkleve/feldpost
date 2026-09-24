import type { ShellPanelId, ShellPanelRow } from './shell-layout.types';

/**
 * `open` and `close` are idempotent. An unknown transition returns the same list.
 * @see docs/specs/service/shell-layout/shell-layout.md
 */
export function applySetOpen(
  panels: readonly ShellPanelRow[],
  id: ShellPanelId,
  open: boolean,
): readonly ShellPanelRow[] {
  const current = panels.find((panel) => panel.id === id);
  const isOpen = current?.open ?? false;
  if (isOpen === open) return panels;
  if (!open) return panels.filter((panel) => panel.id !== id);
  const nextOrder = panels.reduce((max, panel) => Math.max(max, panel.order), 0) + 1;
  return [...panels, { id, open: true, order: nextOrder }];
}
