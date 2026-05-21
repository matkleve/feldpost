export type DetailDestructiveConfirmKind = 'delete_media' | 'remove_from_projects';

export interface DetailDestructiveConfirmState {
  kind: DetailDestructiveConfirmKind;
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
