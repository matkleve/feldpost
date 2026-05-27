import { Injectable, effect, inject, untracked } from '@angular/core';
import type { WorkspaceImage } from '../workspace-view/workspace-view.types';
import { WorkspaceViewService } from '../workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from './workspace-selection.service';

/**
 * Keeps WorkspaceViewService.rawImages aligned with WorkspaceSelectionService —
 * the workspace pane Selected Items tab is the global selection list only.
 * @see docs/specs/ui/workspace/workspace-pane.md
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceSelectedItemsSyncService {
  private readonly selectionService = inject(WorkspaceSelectionService);
  private readonly workspaceViewService = inject(WorkspaceViewService);

  private syncRequestId = 0;

  constructor() {
    effect(() => {
      const selectedIds = Array.from(this.selectionService.selectedMediaIds());
      const requestId = ++this.syncRequestId;
      // Defer + untrack rawImages reads so updating rawImages does not re-enter this effect.
      queueMicrotask(() => {
        untracked(() => {
          void this.syncSelectedImages(selectedIds, requestId);
        });
      });
    });
  }

  private async syncSelectedImages(
    selectedIds: readonly string[],
    requestId: number,
  ): Promise<void> {
    if (requestId !== this.syncRequestId) {
      return;
    }

    if (selectedIds.length === 0) {
      this.workspaceViewService.clearActiveSelection();
      return;
    }

    const existingById = new Map(
      this.workspaceViewService.rawImages().map((image) => [image.id, image]),
    );
    const missingIds = selectedIds.filter((id) => !existingById.has(id));

    const buildOrdered = (
      byId: Map<string, WorkspaceImage>,
    ): WorkspaceImage[] =>
      selectedIds
        .map((id) => byId.get(id))
        .filter((image): image is WorkspaceImage => image !== undefined);

    if (missingIds.length === 0) {
      this.workspaceViewService.setActiveSelectionImages(buildOrdered(existingById));
      return;
    }

    try {
      const loaded = await this.workspaceViewService.loadImagesByIdsOrdered(missingIds);
      if (requestId !== this.syncRequestId) {
        return;
      }

      const mergedById = new Map(existingById);
      for (const image of loaded) {
        mergedById.set(image.id, image);
      }

      this.workspaceViewService.setActiveSelectionImages(buildOrdered(mergedById));
    } catch {
      if (requestId !== this.syncRequestId) {
        return;
      }
      this.workspaceViewService.setActiveSelectionImages(buildOrdered(existingById));
    }
  }
}
