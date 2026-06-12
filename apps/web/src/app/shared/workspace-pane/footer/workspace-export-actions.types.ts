import type { ACTION_CONTEXT_IDS } from '../../../core/action/action-context-ids';

export interface WorkspaceExportActionContext {
  contextType: typeof ACTION_CONTEXT_IDS.wsFooter;
  selectedCount: number;
  canNativeShare: boolean;
}

export type WorkspaceExportActionId =
  | 'select_all'
  | 'select_none'
  | 'share_link'
  | 'copy_link'
  | 'download_zip';
