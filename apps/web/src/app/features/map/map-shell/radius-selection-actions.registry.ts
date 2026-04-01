import type { ActionDefinition } from '../../action-system/action-types';
import type { RadiusActionContext, RadiusMenuActionId } from './map-workspace-actions.types';

export const RADIUS_SELECTION_ACTION_DEFINITIONS: ReadonlyArray<
  ActionDefinition<RadiusActionContext, RadiusMenuActionId>
> = [
  {
    id: 'create_project_from_radius',
    section: 'primary',
    priority: 0,
    icon: 'create_new_folder',
    fallbackLabel: 'New project from selection',
    visibleWhen: (context) => context.count > 0,
  },
  {
    id: 'assign_to_project',
    section: 'primary',
    priority: 1,
    icon: 'folder_open',
    fallbackLabel: 'Assign to project',
    visibleWhen: (context) => context.count > 0,
  },
];
