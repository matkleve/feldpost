import type { ShellPanelId } from '../../core/shell-layout/shell-layout.types';

export type ShellControlSide = 'left' | 'right';

export type ShellControlKind = 'canvas' | 'panel' | 'inert' | 'settings' | 'account';

export interface ShellControlOptionModel {
  id: string;
  icon: string;
  labelKey: string;
  labelFallback: string;
  kind: ShellControlKind;
  route?: string;
  panelId?: ShellPanelId;
}

export interface ShellControlGroup {
  id: string;
  options: readonly ShellControlOptionModel[];
}

const RIGHT_GROUPS: readonly ShellControlGroup[] = [
  {
    id: 'actions',
    options: [
      {
        id: 'notifications',
        icon: 'notifications',
        labelKey: 'shell.control.notifications',
        labelFallback: 'Notifications',
        kind: 'panel',
        panelId: 'notifications',
      },
      {
        id: 'upload',
        icon: 'upload',
        labelKey: 'shell.control.upload',
        labelFallback: 'Upload',
        kind: 'panel',
        panelId: 'upload',
      },
      {
        id: 'download',
        icon: 'download',
        labelKey: 'shell.control.download',
        labelFallback: 'Download',
        kind: 'panel',
        panelId: 'download',
      },
      {
        id: 'shared-media',
        icon: 'folder_shared',
        labelKey: 'shell.control.sharedMedia',
        labelFallback: 'Shared media',
        kind: 'panel',
        panelId: 'shared-media',
      },
    ],
  },
  {
    id: 'history',
    options: [
      {
        id: 'undo',
        icon: 'undo',
        labelKey: 'shell.control.undo',
        labelFallback: 'Undo',
        kind: 'inert',
      },
      {
        id: 'history',
        icon: 'history',
        labelKey: 'shell.control.history',
        labelFallback: 'Change history',
        kind: 'inert',
      },
      {
        id: 'redo',
        icon: 'redo',
        labelKey: 'shell.control.redo',
        labelFallback: 'Redo',
        kind: 'inert',
      },
    ],
  },
  {
    id: 'help',
    options: [
      {
        id: 'tips',
        icon: 'lightbulb_outline',
        labelKey: 'shell.control.tips',
        labelFallback: 'Tips',
        kind: 'panel',
        panelId: 'tips',
      },
      {
        id: 'help',
        icon: 'help_outline',
        labelKey: 'shell.control.help',
        labelFallback: 'Help',
        kind: 'panel',
        panelId: 'help',
      },
    ],
  },
];

const LEFT_GROUPS: readonly ShellControlGroup[] = [
  {
    id: 'top',
    options: [
      { id: 'map', icon: 'map', labelKey: 'shell.control.map', labelFallback: 'Map', kind: 'canvas', route: '/' },
      {
        id: 'projects',
        icon: 'folder',
        labelKey: 'shell.control.projects',
        labelFallback: 'Projects',
        kind: 'canvas',
        route: '/projects',
      },
      {
        id: 'media',
        icon: 'perm_media',
        labelKey: 'shell.control.media',
        labelFallback: 'Media',
        kind: 'canvas',
        route: '/media',
      },
      { id: 'more', icon: 'add', labelKey: 'shell.control.more', labelFallback: 'More', kind: 'inert' },
    ],
  },
  {
    id: 'bottom',
    options: [
      {
        id: 'account',
        icon: 'account_circle',
        labelKey: 'shell.control.account',
        labelFallback: 'Account',
        kind: 'account',
      },
      {
        id: 'settings',
        icon: 'settings',
        labelKey: 'shell.control.settings',
        labelFallback: 'Settings',
        kind: 'settings',
      },
    ],
  },
];

/** Static lists for this window. Not an installed-widget query. */
export function shellControlGroups(side: ShellControlSide): readonly ShellControlGroup[] {
  return side === 'right' ? RIGHT_GROUPS : LEFT_GROUPS;
}
