export interface WorkspaceExportActionContext {
  contextType: 'workspace_multi';
  selectedCount: number;
  canNativeShare: boolean;
}

export type WorkspaceExportActionId =
  | 'select_all'
  | 'select_none'
  | 'share_link'
  | 'copy_link'
  | 'native_share'
  | 'download_zip';
