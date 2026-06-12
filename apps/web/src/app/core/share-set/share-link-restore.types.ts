/** Outcome of a single share-link restore attempt. @see docs/specs/service/share-set/share-link-restore.md */
export type ShareLinkRestoreStatus =
  | 'skipped'
  | 'invalid'
  | 'no-images'
  | 'error'
  | 'success';

export interface ShareLinkRestoreResult {
  status: ShareLinkRestoreStatus;
  /** Loaded selection scope ids (empty unless success). */
  selectionIds: string[];
  /** Detail id opened via shell host (success + valid media in set). */
  detailMediaId: string | null;
  /** True when `media` query was present but not in selectionIds. */
  detailSkipped: boolean;
  /** Layout should strip `share` and `media` from the URL after handling toasts. */
  shouldStripQueryParams: boolean;
}

export interface ShareRouteParams {
  shareToken: string;
  mediaId: string | null;
}
