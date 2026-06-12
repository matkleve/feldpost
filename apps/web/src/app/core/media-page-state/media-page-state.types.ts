import type { FilterRule } from '../filter/filter.types';
import type { SortConfig, WorkspaceMedia } from '../workspace-view/workspace-view.types';

export interface MediaGalleryQueryInputs {
  readonly userId: string;
  readonly projectIds: ReadonlySet<string>;
  readonly sorts: readonly SortConfig[];
  readonly groupingIds: readonly string[];
  readonly filterRules: readonly FilterRule[];
}

export interface MediaPageCacheEntry {
  readonly querySignature: string;
  readonly mediaItems: readonly WorkspaceMedia[];
  readonly lastSyncedAt: number;
}

export interface MediaPageCacheLookup {
  readonly hit: boolean;
  readonly mediaItems: readonly WorkspaceMedia[];
}
