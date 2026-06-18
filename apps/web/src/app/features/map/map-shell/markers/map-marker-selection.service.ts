import { Injectable, inject } from '@angular/core';
import { MarkerSelectionSyncService } from './marker-selection-sync.service';
import { MapPhotoMarkerRenderService } from './map-photo-marker-render.service';
import { MapZoomHighlightOrchestratorService } from './map-zoom-highlight-orchestrator.service';
import type { ThumbnailCardHoverEvent } from '../../../../core/workspace-pane/workspace-pane-thumbnail-hover.types';
import { toMarkerKey } from './marker-media-index.helpers';

export interface MarkerSelectionContext {
  getSelectedMarkerKey(): string | null;
  getSelectedMarkerKeys(): Set<string>;
  setSelectedMarkerKey(key: string | null): void;
  setSelectedMarkerKeys(keys: Set<string>): void;
  setLinkedHoveredWorkspaceMediaIds(ids: Set<string>): void;
  isRadiusDraftHighlighted(markerKey: string): boolean;
  getUploadedPhotoMarkers(): Map<string, {
    count: number;
    mediaId?: string;
    lat: number;
    lng: number;
    sourceCells?: Array<{ lat: number; lng: number }>;
  }>;
  getRawImages(): ReadonlyArray<{ id: string; latitude: number; longitude: number }>;
}

@Injectable({ providedIn: 'root' })
export class MapMarkerSelectionService {
  private readonly markerSelectionSyncService = inject(MarkerSelectionSyncService);
  private readonly markerRenderService = inject(MapPhotoMarkerRenderService);
  private readonly zoomHighlightOrchestrator = inject(MapZoomHighlightOrchestratorService);

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
      markerKey === this.ctx?.getSelectedMarkerKey() ||
      (this.ctx?.getSelectedMarkerKeys().has(markerKey) ?? false) ||
      (this.ctx?.isRadiusDraftHighlighted(markerKey) ?? false)
    );
  }

  isMarkerLinkedHovered(markerKey: string): boolean {
    return markerKey === this.linkedHoverMarkerFromWorkspaceKey;
  }

  setSelectedMarker(markerKey: string | null): void {
    const previousMarkerKey = this.ctx?.getSelectedMarkerKey() ?? null;
    if (previousMarkerKey === markerKey) return;
    this.ctx?.setSelectedMarkerKey(markerKey);
    if (previousMarkerKey) this.markerRenderService.refreshPhotoMarker(previousMarkerKey);
    if (markerKey) this.markerRenderService.refreshPhotoMarker(markerKey);
  }

  setSelectedMarkerKeys(nextKeys: Set<string>): void {
    const previousKeys = this.ctx?.getSelectedMarkerKeys() ?? new Set<string>();
    if (this.markerSelectionSyncService.areSameKeySet(previousKeys, nextKeys)) return;
    this.ctx?.setSelectedMarkerKeys(nextKeys);
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
      this.ctx?.setLinkedHoveredWorkspaceMediaIds(new Set());
      return;
    }
    const markerState = this.ctx?.getUploadedPhotoMarkers().get(markerKey);
    const matchedIds = this.markerSelectionSyncService.buildLinkedWorkspaceImageIds(
      markerState,
      this.ctx?.getRawImages() ?? [],
      toMarkerKey,
    );
    this.ctx?.setLinkedHoveredWorkspaceMediaIds(matchedIds);
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
      !this.ctx?.getUploadedPhotoMarkers().has(this._linkedHoverMarkerFromMapKey)
    ) {
      this.setLinkedHoverMarkerFromMap(null);
      this.ctx?.setLinkedHoveredWorkspaceMediaIds(new Set());
    }
  }
}
