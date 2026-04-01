import type { ActionDefinition } from '../../action-system/action-types';
import type {
  WorkspaceSingleActionContext,
  WorkspaceSingleActionId,
} from './workspace-detail-actions.types';

export const WORKSPACE_SINGLE_ACTION_DEFINITIONS: ReadonlyArray<
  ActionDefinition<WorkspaceSingleActionContext, WorkspaceSingleActionId>
> = [
  {
    id: 'zoom_street',
    section: 'primary',
    priority: 0,
    icon: 'gps_fixed',
    fallbackLabel: 'Zoom to location',
    visibleWhen: () => true,
    enabledWhen: (context) => context.hasCoordinates,
  },
  {
    id: 'assign_to_project',
    section: 'primary',
    priority: 0,
    icon: 'folder_open',
    fallbackLabel: 'Add to project',
    visibleWhen: () => true,
  },
  {
    id: 'copy_gps',
    section: 'secondary',
    priority: 0,
    icon: 'content_copy',
    fallbackLabel: 'Copy coordinates',
    visibleWhen: () => true,
    enabledWhen: (context) => context.hasCoordinates,
  },
  {
    id: 'remove_from_project',
    section: 'destructive',
    priority: 0,
    icon: 'remove_circle_outline',
    fallbackLabel: 'Remove from project',
    visibleWhen: () => true,
  },
  {
    id: 'delete_media',
    section: 'destructive',
    priority: 1,
    icon: 'delete',
    fallbackLabel: 'Delete media',
    visibleWhen: () => true,
  },
];
