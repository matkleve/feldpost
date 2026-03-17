import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { MarkerInteractionService } from './marker-interaction.service';
import { MarkerSelectionSyncService } from './marker-selection-sync.service';
import { RadiusSelectionService } from './radius-selection.service';
import { PhotoMarkerState } from './map-marker-reconcile.facade';
import type { WorkspaceImage } from '../../../core/workspace-view.types';

@Injectable({ providedIn: 'root' })
export class PhotoMarkerSelectionService {
  constructor(
    private readonly markerInteractionService: MarkerInteractionService,
    private readonly markerSelectionSyncService: MarkerSelectionSyncService,
    private readonly radiusSelectionService: RadiusSelectionService,
  ) {}

  handlePhotoMarkerClick(params: {
    markerKey: string;
    clickEvent?: L.LeafletMouseEvent;
    markerState: PhotoMarkerState | undefined;
    currentZoom: number;
    selectedMarkerKeys: Set<string>;
    ensurePhotoPanelOpen: () => void;
    setSelectedMarker: (markerKey: string | null) => void;
    setSelectedMarkerKeys: (keys: Set<string>) => void;
    setDetailImageId: (imageId: string | null) => void;
    clearWorkspaceSelection: () => void;
    openDetailView: (imageId: string) => void;
    loadMultiClusterImages: (cells: Array<{ lat: number; lng: number }>, zoom: number) => void;
    addMarkerCellsToSelection: (cells: Array<{ lat: number; lng: number }>, zoom: number) => void;
  }): void {
    const markerState = params.markerState;
    if (!markerState) {
      return;
    }

    params.setSelectedMarker(params.markerKey);
    params.ensurePhotoPanelOpen();

    const cells = markerState.sourceCells ?? [{ lat: markerState.lat, lng: markerState.lng }];
    const additive = !!(
      params.clickEvent?.originalEvent.ctrlKey || params.clickEvent?.originalEvent.metaKey
    );

    if (additive) {
      const nextKeys = new Set(params.selectedMarkerKeys);
      nextKeys.add(params.markerKey);
      params.setSelectedMarkerKeys(nextKeys);
      params.addMarkerCellsToSelection(cells, params.currentZoom);
      params.setDetailImageId(null);
      return;
    }

    params.clearWorkspaceSelection();
    params.setSelectedMarkerKeys(new Set([params.markerKey]));
    params.loadMultiClusterImages(cells, params.currentZoom);

    if (markerState.count === 1 && markerState.imageId) {
      params.openDetailView(markerState.imageId);
      return;
    }

    params.setDetailImageId(null);
  }

  attachMarkerInteractions(params: {
    markerKey: string;
    marker: L.Marker;
    longPressMs: number;
    shouldFadeIn: boolean;
    isMotionOff: boolean;
    prefersReducedMotion: boolean;
    onClick: (event: L.LeafletMouseEvent) => void;
    onShouldBypassContextMenu: () => boolean;
    onSecondaryReset: () => void;
    onOpenContextMenu: (event: MouseEvent) => void;
    onHoverEnter: () => void;
    onHoverLeave: () => void;
  }): void {
    this.markerInteractionService.bindClick(params.marker, params.onClick);

    this.markerInteractionService.bindContextMenu(params.marker, {
      shouldBypass: params.onShouldBypassContextMenu,
      onSecondaryReset: params.onSecondaryReset,
      onOpen: params.onOpenContextMenu,
    });

    this.markerInteractionService.bindHover(params.marker, {
      onEnter: params.onHoverEnter,
      onLeave: params.onHoverLeave,
    });

    params.marker.once('add', () => {
      const element = params.marker.getElement();
      if (!element) {
        return;
      }

      this.markerInteractionService.attachLongPress(
        element,
        params.longPressMs,
        (event: PointerEvent) => {
          element.classList.add('map-photo-marker--long-pressed');
          params.onOpenContextMenu(event as unknown as MouseEvent);
        },
      );

      element.addEventListener('click', () => {
        element.classList.remove('map-photo-marker--long-pressed');
      });

      if (params.shouldFadeIn && !params.isMotionOff && !params.prefersReducedMotion) {
        this.markerInteractionService.triggerFadeIn(element, 300);
      }
    });
  }

  setSelectedMarker(params: {
    previousMarkerKey: string | null;
    nextMarkerKey: string | null;
    applyNext: () => void;
    refreshPhotoMarker: (markerKey: string) => void;
  }): void {
    if (params.previousMarkerKey === params.nextMarkerKey) {
      return;
    }

    params.applyNext();

    if (params.previousMarkerKey) {
      params.refreshPhotoMarker(params.previousMarkerKey);
    }
    if (params.nextMarkerKey) {
      params.refreshPhotoMarker(params.nextMarkerKey);
    }
  }

  setSelectedMarkerKeys(params: {
    previousKeys: Set<string>;
    nextKeys: Set<string>;
    applyNext: () => void;
    refreshPhotoMarker: (markerKey: string) => void;
  }): void {
    if (this.markerSelectionSyncService.areSameKeySet(params.previousKeys, params.nextKeys)) {
      return;
    }

    params.applyNext();
    this.markerSelectionSyncService.refreshChangedKeySet(
      params.previousKeys,
      params.nextKeys,
      params.refreshPhotoMarker,
    );
  }

  setLinkedHoverMarker(params: {
    previousMarkerKey: string | null;
    nextMarkerKey: string | null;
    applyNext: () => void;
    refreshPhotoMarker: (markerKey: string) => void;
  }): boolean {
    const changed = this.markerSelectionSyncService.applySingleMarkerChange(
      params.previousMarkerKey,
      params.nextMarkerKey,
      params.refreshPhotoMarker,
    );

    if (!changed) {
      return false;
    }

    params.applyNext();
    return true;
  }

  buildLinkedWorkspaceImageIds(params: {
    markerKey: string | null;
    uploadedPhotoMarkers: Map<string, PhotoMarkerState>;
    workspaceImages: ReadonlyArray<WorkspaceImage>;
    toMarkerKey: (lat: number, lng: number) => string;
  }): Set<string> {
    if (!params.markerKey) {
      return new Set();
    }

    const markerState = params.uploadedPhotoMarkers.get(params.markerKey);
    return this.markerSelectionSyncService.buildLinkedWorkspaceImageIds(
      markerState,
      params.workspaceImages,
      params.toMarkerKey,
    );
  }

  mergeMarkerCellsIntoSelection(params: {
    currentImages: ReadonlyArray<WorkspaceImage>;
    incomingImages: ReadonlyArray<WorkspaceImage>;
  }): WorkspaceImage[] {
    return this.radiusSelectionService.mergeWorkspaceImages(
      params.currentImages,
      params.incomingImages,
    );
  }
}
