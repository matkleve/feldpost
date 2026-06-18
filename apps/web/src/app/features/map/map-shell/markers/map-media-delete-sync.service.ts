import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { DestroyRef } from '@angular/core';
import { MediaDeleteUndoService } from '../../../../core/media-delete/media-delete-undo.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { MarkerStateMutationsService } from './marker-state-mutations.service';
import { MapMarkerSelectionService } from './map-marker-selection.service';
import { MapMarkerBindingService } from './map-marker-binding.service';
import { MapViewportCoordinatorService } from './map-viewport-coordinator.service';
import { MapShellState } from '../component/map-shell.state';
import { MapShellInstanceService } from '../component/map-shell-instance.service';
import { WorkspacePaneObserverAdapter } from '../../../../core/workspace-pane/workspace-pane-observer.adapter';
import { getMarkerKeysForMedia } from './marker-media-index.helpers';

@Injectable({ providedIn: 'root' })
export class MapMediaDeleteSyncService {
  private readonly mediaDeleteUndo = inject(MediaDeleteUndoService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly markerStateMutationsService = inject(MarkerStateMutationsService);
  private readonly markerSelectionService = inject(MapMarkerSelectionService);
  private readonly markerBindingService = inject(MapMarkerBindingService);
  private readonly mapViewportCoordinatorService = inject(MapViewportCoordinatorService);
  private readonly state = inject(MapShellState);
  private readonly instance = inject(MapShellInstanceService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);

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
    if (mediaItemIds.length === 0) {
      return;
    }

    const deleted = new Set(mediaItemIds);
    const removals = new Map<string, string>();

    for (const mediaId of deleted) {
      for (const markerKey of getMarkerKeysForMedia(this.instance.markersByMediaId, mediaId)) {
        removals.set(markerKey, mediaId);
      }
    }

    for (const [markerKey, state] of this.instance.uploadedPhotoMarkers.entries()) {
      if (state.mediaId && deleted.has(state.mediaId) && !removals.has(markerKey)) {
        removals.set(markerKey, state.mediaId);
      }
    }

    for (const [markerKey, mediaId] of removals) {
      this.markerStateMutationsService.removeDeletedPhotoFromMapUi({
        markerKey,
        mediaId,
        uploadedPhotoMarkers: this.instance.uploadedPhotoMarkers,
        photoMarkerLayer: this.instance.photoMarkerLayer,
        markersByMediaId: this.instance.markersByMediaId,
        selectedMarkerKey: this.state.selectedMarkerKey(),
        selectedMarkerKeys: this.state.selectedMarkerKeys(),
        detailMediaId: this.state.detailMediaId(),
        cancelMarkerMoveAnimation: (marker) => this.markerBindingService.cancelMarkerMoveAnimation(marker),
        setSelectedMarker: (key) => this.markerSelectionService.setSelectedMarker(key),
        setSelectedMarkerKeys: (keys) => this.markerSelectionService.setSelectedMarkerKeys(keys),
        setDetailImageId: (id) => {
          this.state.setDetailMediaId(id);
          this.workspacePaneObserver.setDetailImageId(id);
        },
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
