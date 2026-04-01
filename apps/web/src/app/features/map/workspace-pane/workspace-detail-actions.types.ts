export interface WorkspaceSingleActionContext {
  contextType: 'workspace_single';
  hasCoordinates: boolean;
}

export type WorkspaceSingleActionId =
  | 'zoom_street'
  | 'assign_to_project'
  | 'copy_gps'
  | 'delete_media';
