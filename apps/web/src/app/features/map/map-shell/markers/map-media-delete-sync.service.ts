import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { DestroyRef } from '@angular/core';
import { MediaDeleteUndoService } from '../../../../core/media-delete/media-delete-undo.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { MarkerStateMutationsService } from './marker-state-mutations.service';
import { MapMarkerSelectionService } from './map-marker-selection.service';
import { MapMarkerBindingService } from './map-marker-binding.service';
import { MapViewportCoordinatorService } from './map-viewport-coordinator.service';
import { getMarkerKeysForMedia } from './marker-media-index.helpers';
import type { PhotoMarkerState } from './map-marker-reconcile.facade';
import type { MarkerRenderSnapshot } from './map-photo-marker-render.service';
import type { MapLayerGroup } from '../leaflet/map-leaflet.service';

export interface MediaDeleteSyncContext {
  getUploadedPhotoMarkers(): Map<string, PhotoMarkerState & { lastRendered?: MarkerRenderSnapshot }>;
  getPhotoMarkerLayer(): MapLayerGroup | null;
  getMarkersByMediaId(): Map<string, string[]>;
  getSelectedMarkerKey(): string | null;
  getSelectedMarkerKeys(): Set<string>;
  getDetailMediaId(): string | null;
  patchDetailMediaId(id: string | null): void;
}

@Injectable({ providedIn: 'root' })
export class MapMediaDeleteSyncService {
  private readonly mediaDeleteUndo = inject(MediaDeleteUndoService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly markerStateMutationsService = inject(MarkerStateMutationsService);
  private readonly markerSelectionService = inject(MapMarkerSelectionService);
  private readonly markerBindingService = inject(MapMarkerBindingService);
  private readonly mapViewportCoordinatorService = inject(MapViewportCoordinatorService);

  private ctx: MediaDeleteSyncContext | null = null;

  bind(ctx: MediaDeleteSyncContext): void {
    this.ctx = ctx;
  }

  subscribe(destroyRef: DestroyRef): void {
    this.mediaDeleteUndo.mediaDeleted$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(({ mediaItemIds }) => {
        this.syncMapAfterMediaDeleted(mediaItemIds);
      });

    this.mediaDeleteUndo.mediaRestored$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        void this.mapViewportCoordinatorService.queryViewportMarkers();
      });
  }

  private syncMapAfterMediaDeleted(mediaItemIds: readonly string[]): void {
    if (!this.ctx || mediaItemIds.length === 0) {
      return;
    }

    const deleted = new Set(mediaItemIds);
    const removals = new Map<string, string>();

    for (const mediaId of deleted) {
      for (const markerKey of getMarkerKeysForMedia(this.ctx.getMarkersByMediaId(), mediaId)) {
        removals.set(markerKey, mediaId);
      }
    }

    for (const [markerKey, state] of this.ctx.getUploadedPhotoMarkers().entries()) {
      if (state.mediaId && deleted.has(state.mediaId) && !removals.has(markerKey)) {
        removals.set(markerKey, state.mediaId);
      }
    }

    for (const [markerKey, mediaId] of removals) {
      this.markerStateMutationsService.removeDeletedPhotoFromMapUi({
        markerKey,
        mediaId,
        uploadedPhotoMarkers: this.ctx.getUploadedPhotoMarkers(),
        photoMarkerLayer: this.ctx.getPhotoMarkerLayer(),
        markersByMediaId: this.ctx.getMarkersByMediaId(),
        selectedMarkerKey: this.ctx.getSelectedMarkerKey(),
        selectedMarkerKeys: this.ctx.getSelectedMarkerKeys(),
        detailMediaId: this.ctx.getDetailMediaId(),
        cancelMarkerMoveAnimation: (marker) => this.markerBindingService.cancelMarkerMoveAnimation(marker),
        setSelectedMarker: (key) => this.markerSelectionService.setSelectedMarker(key),
        setSelectedMarkerKeys: (keys) => this.markerSelectionService.setSelectedMarkerKeys(keys),
        setDetailImageId: (id) => this.ctx!.patchDetailMediaId(id),
      });
    }

    const selectedIds = [...this.workspaceSelectionService.selectedMediaIds()];
    const nextSelected = selectedIds.filter((id) => !deleted.has(id));
    if (nextSelected.length !== selectedIds.length) {
      if (nextSelected.length === 0) {
        this.workspaceSelectionService.clearSelection();
      } else {
        this.workspaceSelectionService.selectAllInScope(nextSelected);
      }
    }

    void this.mapViewportCoordinatorService.queryViewportMarkers();
  }
}
