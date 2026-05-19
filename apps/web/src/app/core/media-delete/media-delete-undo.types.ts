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
