import type { Signal } from '@angular/core';
import type { SelectedItemsContextPort } from './workspace-pane-context.port';

export type WorkspacePaneTab = 'selected-items' | 'upload';

export interface WorkspacePaneHostPort {
  isOpen$: Signal<boolean>;
  activeTab$: Signal<WorkspacePaneTab>;
  setActiveTab: (tab: WorkspacePaneTab) => void;
  bindSelectedItemsContext: (context: SelectedItemsContextPort) => void;
  unbindSelectedItemsContext: () => void;
}
