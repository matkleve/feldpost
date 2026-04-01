import { ACTION_CONTEXT_IDS } from '../../action-system/action-context-ids';

export interface WorkspaceSingleActionContext {
  contextType: typeof ACTION_CONTEXT_IDS.wsFooter;
  hasCoordinates: boolean;
}

export type WorkspaceSingleActionId =
  | 'zoom_street'
  | 'assign_to_project'
  | 'copy_gps'
  | 'remove_from_project'
  | 'delete_media';
