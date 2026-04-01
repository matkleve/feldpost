export interface WorkspaceExportActionContext {
  contextType: 'workspace_multi';
  selectedCount: number;
  canNativeShare: boolean;
}

export type WorkspaceExportActionId =
  | 'assign_to_project'
  | 'change_location_address'
  | 'delete_media'
  | 'select_all'
  | 'select_none'
  | 'share_link'
  | 'copy_link'
  | 'native_share'
  | 'download_zip';
