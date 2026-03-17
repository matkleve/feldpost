import { inject, Injectable } from '@angular/core';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { ShareSetService } from '../../../core/share-set.service';
import { WorkspaceSelectionService } from '../../../core/workspace-selection.service';
import { WorkspaceViewService } from '../../../core/workspace-view.service';

export interface ShareTokenSelectionResult {
  status: 'invalid' | 'no-images' | 'success' | 'error';
  selectionIds: string[];
}

@Injectable({ providedIn: 'root' })
export class ShareTokenSelectionService {
  private readonly shareSetService = inject(ShareSetService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);

  readShareTokenFromRoute(routeSnapshot: ActivatedRouteSnapshot): string {
    return routeSnapshot.queryParamMap.get('share')?.trim() ?? '';
  }

  async loadSelectionFromShareToken(shareToken: string): Promise<ShareTokenSelectionResult> {
    try {
      const resolvedItems = await this.shareSetService.resolveShareSet(shareToken);
      const orderedIds = resolvedItems.map((item) => item.imageId);

      if (orderedIds.length === 0) {
        return { status: 'invalid', selectionIds: [] };
      }

      const images = await this.workspaceViewService.loadImagesByIdsOrdered(orderedIds);
      if (images.length === 0) {
        return { status: 'no-images', selectionIds: [] };
      }

      this.workspaceViewService.clearActiveSelectionAndSettings();
      this.workspaceViewService.setActiveSelectionImages(images);

      const loadedIds = new Set(images.map((image) => image.id));
      const selectionIds = orderedIds.filter((id) => loadedIds.has(id));
      this.workspaceSelectionService.selectAllInScope(selectionIds);

      return { status: 'success', selectionIds };
    } catch {
      return { status: 'error', selectionIds: [] };
    }
  }
}
