import type { MetadataEntry } from './media-detail-view.types';

export type DetailDestructiveConfirmKind =
  | 'delete_media'
  | 'clear_address'
  | 'revert_coordinates'
  | 'remove_metadata'
  | 'remove_from_projects';

export interface DetailDestructiveConfirmState {
  kind: DetailDestructiveConfirmKind;
  metadataEntry?: MetadataEntry;
}

export interface DetailDestructiveConfirmCopy {
  title: string;
  message: string;
  confirmLabel: string;
}

type DetailTranslateFn = (key: string, fallback: string) => string;

export function getDetailDestructiveConfirmCopy(
  state: DetailDestructiveConfirmState,
  t: DetailTranslateFn,
): DetailDestructiveConfirmCopy {
  switch (state.kind) {
    case 'delete_media':
      return {
        title: t('workspace.imageDetail.deleteDialog.title', 'Delete this media?'),
        message: t(
          'workspace.imageDetail.deleteDialog.message',
          'This will permanently remove the media item and all its metadata. This cannot be undone.',
        ),
        confirmLabel: t('workspace.imageDetail.deleteDialog.confirm', 'Delete'),
      };
    case 'clear_address':
      return {
        title: t('workspace.imageDetail.confirm.clearAddress.title', 'Remove address?'),
        message: t(
          'workspace.imageDetail.confirm.clearAddress.message',
          'This removes the saved address for this media item. You can undo this action.',
        ),
        confirmLabel: t('workspace.imageDetail.confirm.clearAddress.confirm', 'Remove'),
      };
    case 'revert_coordinates':
      return {
        title: t('workspace.imageDetail.confirm.revertCoordinates.title', 'Revert coordinates?'),
        message: t(
          'workspace.imageDetail.confirm.revertCoordinates.message',
          'This restores the original EXIF coordinates and replaces the corrected position.',
        ),
        confirmLabel: t(
          'workspace.imageDetail.confirm.revertCoordinates.confirm',
          'Revert',
        ),
      };
    case 'remove_metadata': {
      const key = state.metadataEntry?.key ?? '';
      return {
        title: t('workspace.imageDetail.confirm.removeMetadata.title', 'Remove metadata?'),
        message: t(
          'workspace.imageDetail.confirm.removeMetadata.message',
          'Remove "{key}" from this media item? You can undo this action.',
        ).replace('{key}', key),
        confirmLabel: t('workspace.imageDetail.confirm.removeMetadata.confirm', 'Remove'),
      };
    }
    case 'remove_from_projects':
      return {
        title: t(
          'workspace.imageDetail.confirm.removeFromProjects.title',
          'Remove from all projects?',
        ),
        message: t(
          'workspace.imageDetail.confirm.removeFromProjects.message',
          'This media item will be unlinked from every project it belongs to.',
        ),
        confirmLabel: t(
          'workspace.imageDetail.confirm.removeFromProjects.confirm',
          'Remove',
        ),
      };
  }
}
