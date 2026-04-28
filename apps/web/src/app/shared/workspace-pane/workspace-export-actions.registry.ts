import type { ActionDefinition } from '../../action-system/action-types';
import type {
  WorkspaceExportActionContext,
  WorkspaceExportActionId,
} from './workspace-export-actions.types';

export const WORKSPACE_EXPORT_ACTION_DEFINITIONS: ReadonlyArray<
  ActionDefinition<WorkspaceExportActionContext, WorkspaceExportActionId>
> = [
  {
    id: 'select_all',
    section: 'primary',
    priority: 0,
    icon: 'done_all',
    fallbackLabel: 'Select all',
    labelKey: 'workspace.export.action.selectAll',
    visibleWhen: (context) => context.selectedCount > 0,
  },
  {
    id: 'select_none',
    section: 'primary',
    priority: 1,
    icon: 'deselect',
    fallbackLabel: 'Select none',
    labelKey: 'workspace.export.action.selectNone',
    visibleWhen: (context) => context.selectedCount > 0,
  },
  {
    id: 'download_zip',
    section: 'primary',
    priority: 2,
    icon: 'folder_zip',
    fallbackLabel: 'Export ZIP',
    labelKey: 'workspace.export.action.downloadZip',
    visibleWhen: (context) => context.selectedCount > 0,
  },
  {
    id: 'share_link',
    section: 'secondary',
    priority: 0,
    icon: 'share',
    fallbackLabel: 'Share link',
    labelKey: 'workspace.export.action.share',
    visibleWhen: (context) => context.selectedCount > 0,
  },
  {
    id: 'copy_link',
    section: 'secondary',
    priority: 1,
    icon: 'content_copy',
    fallbackLabel: 'Copy link',
    labelKey: 'workspace.export.action.copyLink',
    visibleWhen: (context) => context.selectedCount > 0,
  },
];
