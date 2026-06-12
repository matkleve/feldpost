import type { PreviewGenerationStatus } from '../media/preview-generation-status.types';
import type { WorkspaceMedia } from '../workspace-view/workspace-view.types';

export type MediaItemPreviewPatch = {
  readonly thumbnailPath?: string | null;
  readonly previewGenerationStatus?: PreviewGenerationStatus | null;
};

/**
 * Patches one gallery row in a cached `WorkspaceMedia[]` snapshot (in-place copy).
 * @see docs/specs/component/media/media-content.md
 */
export function patchMediaCacheItemPreview(
  items: readonly WorkspaceMedia[],
  mediaId: string,
  patch: MediaItemPreviewPatch,
): WorkspaceMedia[] | null {
  const index = items.findIndex((item) => item.id === mediaId);
  if (index < 0) {
    return null;
  }

  const current = items[index]!;
  const next = [...items];
  next[index] = {
    ...current,
    ...(patch.thumbnailPath !== undefined ? { thumbnailPath: patch.thumbnailPath } : {}),
    ...(patch.previewGenerationStatus !== undefined
      ? { previewGenerationStatus: patch.previewGenerationStatus }
      : {}),
  };

  return next;
}
