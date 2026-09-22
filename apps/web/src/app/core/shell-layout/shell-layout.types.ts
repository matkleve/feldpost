export const SHELL_PANEL_IDS = ['upload', 'download', 'shared-media', 'tips', 'help'] as const;

export type ShellPanelId = (typeof SHELL_PANEL_IDS)[number];

export interface ShellPanelRow {
  id: ShellPanelId;
  open: boolean;
  order: number;
}

export function isShellPanelId(value: string): value is ShellPanelId {
  return (SHELL_PANEL_IDS as readonly string[]).includes(value);
}
