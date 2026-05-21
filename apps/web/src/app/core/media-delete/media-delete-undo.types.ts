export type MediaDeleteKind = 'photo' | 'file' | 'mixed';

export interface MediaItemDeleteRow {
  id: string;
  media_type: string;
  [key: string]: unknown;
}

export interface MediaDeleteSnapshot {
  items: MediaItemDeleteRow[];
  projectMemberships: Record<string, unknown>[];
  sectionItems: Record<string, unknown>[];
  metadataRows: Record<string, unknown>[];
}

export interface MediaDeleteWithUndoResult {
  ok: boolean;
  errorMessage: string | null;
  snapshot: MediaDeleteSnapshot | null;
}

export interface MediaDeleteWithUndoOptions {
  mediaItemIds: readonly string[];
  onAfterDelete?: () => void | Promise<void>;
  onAfterUndo?: () => void | Promise<void>;
}

/** Emitted after rows are removed from `media_items` (and related join tables). */
export interface MediaDeletedEvent {
  mediaItemIds: string[];
}

/** Emitted after undo restores rows from a delete snapshot. */
export interface MediaRestoredEvent {
  mediaItemIds: string[];
}
