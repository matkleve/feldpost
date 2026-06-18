import { Injectable, inject } from '@angular/core';
import { MarkerSelectionSyncService } from './marker-selection-sync.service';
import { MapPhotoMarkerRenderService } from './map-photo-marker-render.service';
import { MapZoomHighlightOrchestratorService } from './map-zoom-highlight-orchestrator.service';
import { MapShellState } from '../component/map-shell.state';
import { MapShellInstanceService } from '../component/map-shell-instance.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import type { ThumbnailCardHoverEvent } from '../../../../core/workspace-pane/workspace-pane-thumbnail-hover.types';
import { toMarkerKey } from './marker-media-index.helpers';

export interface MarkerSelectionContext {
  isRadiusDraftHighlighted(markerKey: string): boolean;
}

@Injectable({ providedIn: 'root' })
export class MapMarkerSelectionService {
  private readonly markerSelectionSyncService = inject(MarkerSelectionSyncService);
  private readonly markerRenderService = inject(MapPhotoMarkerRenderService);
  private readonly zoomHighlightOrchestrator = inject(MapZoomHighlightOrchestratorService);
  private readonly state = inject(MapShellState);
  private readonly instance = inject(MapShellInstanceService);
  private readonly workspaceViewService = inject(WorkspaceViewService);

  private ctx: MarkerSelectionContext | null = null;

  private linkedHoverMarkerFromWorkspaceKey: string | null = null;
  private _linkedHoverMarkerFromMapKey: string | null = null;
  private activeWorkspaceHover: ThumbnailCardHoverEvent | null = null;

  bind(ctx: MarkerSelectionContext): void {
    this.ctx = ctx;
  }

  getLinkedHoverMarkerFromMapKey(): string | null {
    return this._linkedHoverMarkerFromMapKey;
  }

  isMarkerSelected(markerKey: string): boolean {
    return (
      markerKey === this.state.selectedMarkerKey() ||
      this.state.selectedMarkerKeys().has(markerKey) ||
      (this.ctx?.isRadiusDraftHighlighted(markerKey) ?? false)
    );
  }

  isMarkerLinkedHovered(markerKey: string): boolean {
    return markerKey === this.linkedHoverMarkerFromWorkspaceKey;
  }

  setSelectedMarker(markerKey: string | null): void {
    const previousMarkerKey = this.state.selectedMarkerKey();
    if (previousMarkerKey === markerKey) return;
    this.state.setSelectedMarkerKey(markerKey);
    if (previousMarkerKey) this.markerRenderService.refreshPhotoMarker(previousMarkerKey);
    if (markerKey) this.markerRenderService.refreshPhotoMarker(markerKey);
  }

  setSelectedMarkerKeys(nextKeys: Set<string>): void {
    const previousKeys = this.state.selectedMarkerKeys();
    if (this.markerSelectionSyncService.areSameKeySet(previousKeys, nextKeys)) return;
    this.state.setSelectedMarkerKeys(nextKeys);
    this.markerSelectionSyncService.refreshChangedKeySet(previousKeys, nextKeys, (k) =>
      this.markerRenderService.refreshPhotoMarker(k),
    );
  }

  setLinkedHoverMarkerFromWorkspace(markerKey: string | null): void {
    const previous = this.linkedHoverMarkerFromWorkspaceKey;
    const changed = this.markerSelectionSyncService.applySingleMarkerChange(
      previous,
      markerKey,
      (k) => this.markerRenderService.refreshPhotoMarker(k),
    );
    if (!changed) return;
    this.linkedHoverMarkerFromWorkspaceKey = markerKey;
  }

  setLinkedHoverMarkerFromMap(markerKey: string | null): void {
    if (this._linkedHoverMarkerFromMapKey === markerKey) return;
    this._linkedHoverMarkerFromMapKey = markerKey;
  }

  setLinkedHoveredWorkspaceImageIdsForMarker(markerKey: string | null): void {
    if (!markerKey) {
      this.state.setLinkedHoveredWorkspaceMediaIds(new Set());
      return;
    }
    const markerState = this.instance.uploadedPhotoMarkers.get(markerKey);
    const matchedIds = this.markerSelectionSyncService.buildLinkedWorkspaceImageIds(
      markerState,
      this.workspaceViewService.rawImages(),
      toMarkerKey,
    );
    this.state.setLinkedHoveredWorkspaceMediaIds(matchedIds);
  }

  onWorkspaceHoverStarted(event: ThumbnailCardHoverEvent): void {
    this.activeWorkspaceHover = event;
    const markerKey = this.zoomHighlightOrchestrator.resolveZoomTargetMarkerKey(
      event.mediaId,
      event.lat,
      event.lng,
      true,
    );
    this.setLinkedHoverMarkerFromWorkspace(markerKey);
  }

  onWorkspaceHoverEnded(mediaId: string): void {
    if (this.activeWorkspaceHover?.mediaId === mediaId) {
      this.activeWorkspaceHover = null;
    }
    this.setLinkedHoverMarkerFromWorkspace(null);
  }

  refreshActiveWorkspaceHoverLink(): void {
    const activeHover = this.activeWorkspaceHover;
    if (!activeHover) {
      this.setLinkedHoverMarkerFromWorkspace(null);
      return;
    }
    const markerKey = this.zoomHighlightOrchestrator.resolveZoomTargetMarkerKey(
      activeHover.mediaId,
      activeHover.lat,
      activeHover.lng,
      true,
    );
    this.setLinkedHoverMarkerFromWorkspace(markerKey);
  }

  pruneStaleLinkedHoverFromMap(): void {
    if (
      this._linkedHoverMarkerFromMapKey &&
      !this.instance.uploadedPhotoMarkers.has(this._linkedHoverMarkerFromMapKey)
    ) {
      this.setLinkedHoverMarkerFromMap(null);
      this.state.setLinkedHoveredWorkspaceMediaIds(new Set());
    }
  }
}
