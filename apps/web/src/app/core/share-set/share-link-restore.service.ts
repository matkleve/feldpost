import { Injectable, inject } from '@angular/core';
import type { ActivatedRouteSnapshot } from '@angular/router';
import type { WorkspacePaneShellHost } from '../workspace-pane/workspace-pane-shell-host.token';
import { ShareSetService } from './share-set.service';
import { readShareRouteParams } from './share-link-restore.helpers';
import type { ShareLinkRestoreResult } from './share-link-restore.types';
import { WorkspaceSelectionService } from '../workspace-selection/workspace-selection.service';
import { WorkspaceViewService } from '../workspace-view/workspace-view.service';

/**
 * Restores workspace selection scope from `?share=` (optional `?media=`).
 * @see docs/specs/service/share-set/share-link-restore.md
 */
@Injectable({ providedIn: 'root' })
export class ShareLinkRestoreService {
  private readonly shareSetService = inject(ShareSetService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);

  private restoreAttempted = false;

  async restoreFromRoute(
    snapshot: ActivatedRouteSnapshot,
    shellHost: WorkspacePaneShellHost,
  ): Promise<ShareLinkRestoreResult> {
    const { shareToken, mediaId } = readShareRouteParams(snapshot);

    if (!shareToken) {
      return this.skippedResult();
    }

    if (this.restoreAttempted) {
      return this.skippedResult();
    }

    this.restoreAttempted = true;

    try {
      const resolvedItems = await this.shareSetService.resolveShareSet(shareToken);
      const orderedIds = resolvedItems.map((item) => item.mediaId);

      if (orderedIds.length === 0) {
        return {
          status: 'invalid',
          selectionIds: [],
          detailMediaId: null,
          detailSkipped: false,
          shouldStripQueryParams: true,
        };
      }

      const images = await this.workspaceViewService.loadImagesByIdsOrdered(orderedIds);
      if (images.length === 0) {
        return {
          status: 'no-images',
          selectionIds: [],
          detailMediaId: null,
          detailSkipped: false,
          shouldStripQueryParams: true,
        };
      }

      this.workspaceViewService.clearActiveSelectionAndSettings();
      this.workspaceViewService.setActiveSelectionImages(images);

      const loadedIds = new Set(images.map((image) => image.id));
      const selectionIds = orderedIds.filter((id) => loadedIds.has(id));
      this.workspaceSelectionService.selectAllInScope(selectionIds);

      let detailMediaId: string | null = null;
      let detailSkipped = false;

      if (mediaId) {
        if (selectionIds.includes(mediaId)) {
          detailMediaId = mediaId;
          shellHost.openDetailView(mediaId);
        } else {
          detailSkipped = true;
        }
      }

      return {
        status: 'success',
        selectionIds,
        detailMediaId,
        detailSkipped,
        shouldStripQueryParams: true,
      };
    } catch {
      return {
        status: 'error',
        selectionIds: [],
        detailMediaId: null,
        detailSkipped: false,
        shouldStripQueryParams: true,
      };
    }
  }

  private skippedResult(): ShareLinkRestoreResult {
    return {
      status: 'skipped',
      selectionIds: [],
      detailMediaId: null,
      detailSkipped: false,
      shouldStripQueryParams: false,
    };
  }
}
