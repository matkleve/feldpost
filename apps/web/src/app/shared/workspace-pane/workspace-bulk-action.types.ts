import type { ForwardGeocodeResult } from '../../core/geocoding/geocoding.service';
import type { ProjectSelectOption } from '../project-select-dialog/project-select-dialog.component';
import type { ShareAudienceDialogResult } from '../../core/share-set/share-set.types';
/** Share audience dialog entry kind used by footer and thumbnail grid. */
export type WorkspaceShareAudienceDialogKind = 'clipboard' | 'silent' | 'native';

export type WorkspaceBulkProjectLoadResult =
  | { status: 'ok'; options: ReadonlyArray<ProjectSelectOption> }
  | { status: 'no_projects' };

export type WorkspaceBulkEmptySelectionResult = { status: 'empty_selection' };

export type WorkspaceBulkProjectAssignResult =
  | WorkspaceBulkEmptySelectionResult
  | { status: 'ok' }
  | { status: 'error'; errorMessage: string | null };

export type WorkspaceBulkAddressConfirmResult =
  | { status: 'noop' }
  | { status: 'not_found' }
  | WorkspaceBulkEmptySelectionResult
  | { status: 'update_failed' }
  | { status: 'success'; suggestion: ForwardGeocodeResult };

export type WorkspaceBulkDeleteResult =
  | WorkspaceBulkEmptySelectionResult
  | { status: 'ok' }
  | { status: 'error'; errorMessage: string | null };

export type WorkspaceBulkRemoveFromProjectResult =
  | WorkspaceBulkEmptySelectionResult
  | { status: 'ok' }
  | { status: 'error'; errorMessage: string | null };

export type WorkspaceBulkShareLinkOptions = {
  copyToClipboard: boolean;
  audience: ShareAudienceDialogResult;
};

export type WorkspaceBulkDeleteHooks = {
  onAfterDelete: () => void;
  onAfterUndo: () => void;
};
