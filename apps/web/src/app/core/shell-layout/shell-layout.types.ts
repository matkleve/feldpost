export const SHELL_PANEL_IDS = ['upload', 'download', 'shared-media', 'tips', 'help'] as const;

export type ShellPanelId = (typeof SHELL_PANEL_IDS)[number];

/** Right-rail actions container — panels open top-aligned in the column. */
export const SHELL_PANEL_TOP_STACK_IDS = [
  'upload',
  'download',
  'shared-media',
] as const satisfies readonly ShellPanelId[];

/** Right-rail help container — panels open bottom-aligned in the column. */
export const SHELL_PANEL_BOTTOM_STACK_IDS = ['tips', 'help'] as const satisfies readonly ShellPanelId[];

export interface ShellPanelRow {
  id: ShellPanelId;
  open: boolean;
  order: number;
}

export function isShellPanelId(value: string): value is ShellPanelId {
  return (SHELL_PANEL_IDS as readonly string[]).includes(value);
}
