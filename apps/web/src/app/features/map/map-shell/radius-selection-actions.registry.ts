import type { ActionDefinition } from '../../action-system/action-types';
import type { RadiusActionContext, RadiusMenuActionId } from './map-workspace-actions.types';

export const RADIUS_SELECTION_ACTION_DEFINITIONS: ReadonlyArray<
  ActionDefinition<RadiusActionContext, RadiusMenuActionId>
> = [
  {
    id: 'open_selection',
    section: 'primary',
    priority: 0,
    icon: 'grid_view',
    fallbackLabel: 'Auswahl oeffnen',
    visibleWhen: (context) => context.count > 0,
  },
  {
    id: 'assign_to_project',
    section: 'primary',
    priority: 1,
    icon: 'folder_open',
    fallbackLabel: 'Projekt hinzufuegen...',
    visibleWhen: (context) => context.count > 0,
  },
  {
    id: 'remove_from_project',
    section: 'destructive',
    priority: 0,
    icon: 'remove_circle_outline',
    fallbackLabel: 'Aus Projekten entfernen',
    visibleWhen: (context) => context.count > 0,
  },
  {
    id: 'delete_media',
    section: 'destructive',
    priority: 1,
    icon: 'delete',
    fallbackLabel: 'Foto loeschen',
    visibleWhen: (context) => context.count > 0,
  },
];
