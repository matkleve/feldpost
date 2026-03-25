import type { Signal } from '@angular/core';

export type WorkspacePageContextKey = 'map' | 'media' | 'projects';

export interface SelectedItemsContextPort {
  contextKey: WorkspacePageContextKey;
  selectedMediaIds$: Signal<Set<string>>;
  requestOpenDetail: (mediaId: string) => void;
  requestSetHover: (mediaId: string | null) => void;
}
