import { Injectable, inject } from '@angular/core';
import { buildPhotoMarkerHtml } from '../../../../core/map/marker-factory';
import type { ImageUploadedEvent } from '../../../../core/workspace-pane/workspace-pane-shell-events.types';
import type { ImageReplacedEvent, ImageAttachedEvent } from '../../../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import {
  MapLeafletService,
  type MapDivIcon,
  type MapMarker,
  type MapMouseEvent,
} from '../leaflet/map-leaflet.service';
import { MapPhotoMarkerRenderService } from './map-photo-marker-render.service';
import { MapMarkerSelectionService } from './map-marker-selection.service';
import { MapMarkerBindingService } from './map-marker-binding.service';
import { MapShellState } from '../component/map-shell.state';
import { MapShellInstanceService } from '../component/map-shell-instance.service';
import { WorkspacePaneObserverAdapter } from '../../../../core/workspace-pane/workspace-pane-observer.adapter';
import {
  registerMarkerKeyForMedia,
  getMarkerKeysForMedia,
  toMarkerKey,
} from './marker-media-index.helpers';

export interface PhotoMarkerLifecycleContext {
  openDetailView(mediaId: string): void;
}

@Injectable({ providedIn: 'root' })
export class PhotoMarkerLifecycleService {
  private readonly mapLeafletService = inject(MapLeafletService);
  private readonly markerRenderService = inject(MapPhotoMarkerRenderService);
  private readonly markerSelectionService = inject(MapMarkerSelectionService);
  private readonly markerBindingService = inject(MapMarkerBindingService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly state = inject(MapShellState);
  private readonly instance = inject(MapShellInstanceService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);

  private ctx: PhotoMarkerLifecycleContext | null = null;
  private draftMediaMarkerLeaflet: MapMarker | null = null;

  bind(ctx: PhotoMarkerLifecycleContext): void {
    this.ctx = ctx;
  }

  private patchDetailMediaId(mediaId: string | null): void {
    this.state.setDetailMediaId(mediaId);
    this.workspacePaneObserver.setDetailImageId(mediaId);
  }

  // ---------------------------------------------------------------------------
  // Draft media marker
  // ---------------------------------------------------------------------------

  renderOrUpdateDraftMediaMarker(coords: [number, number]): void {
    if (!this.instance.map) return;

    const icon = this.buildDraftMediaMarkerIcon();
    if (!this.draftMediaMarkerLeaflet) {
      this.draftMediaMarkerLeaflet = this.mapLeafletService.createStaticPhotoMarker(coords, icon);

      try {
        const photoMarkerLayer = this.instance.photoMarkerLayer;
        if (photoMarkerLayer) {
          photoMarkerLayer.addLayer(this.draftMediaMarkerLeaflet);
        } else {
          this.draftMediaMarkerLeaflet.addTo(this.instance.map!);
        }
      } catch {
        // Leaflet map not yet fully initialized (panes not ready).
        // Reset marker to null and silently fail; will retry on next call.
        this.draftMediaMarkerLeaflet = null;
        return;
      }
      return;
    }

    this.draftMediaMarkerLeaflet.setLatLng(coords);
    this.draftMediaMarkerLeaflet.setIcon(icon);
  }

  private buildDraftMediaMarkerIcon(): MapDivIcon {
    return this.mapLeafletService.createPhotoMarkerIcon(
      buildPhotoMarkerHtml({
        count: 1,
        selected: true,
        zoomLevel: this.markerRenderService.getPhotoMarkerZoomLevel(),
      }),
    );
  }

  removeDraftMediaMarker(): void {
    if (this.draftMediaMarkerLeaflet) {
      const photoMarkerLayer = this.instance.photoMarkerLayer;
      if (photoMarkerLayer) {
        photoMarkerLayer.removeLayer(this.draftMediaMarkerLeaflet);
      } else {
        this.draftMediaMarkerLeaflet.remove();
      }
      this.draftMediaMarkerLeaflet = null;
    }
    this.state.setDraftMediaMarker(null);
  }

  resolveDraftMediaMarkerUpload(event: ImageUploadedEvent): void {
    const draft = this.state.draftMediaMarker();
    if (!draft) return;

    const draftKey = toMarkerKey(draft.lat, draft.lng);
    const uploadedKey = toMarkerKey(event.lat, event.lng);
    if (draftKey !== uploadedKey) {
      return;
    }

    this.removeDraftMediaMarker();
    this.markerSelectionService.setSelectedMarker(uploadedKey);
    this.markerSelectionService.setSelectedMarkerKeys(new Set([uploadedKey]));
  }

  // ---------------------------------------------------------------------------
  // Upload event handlers
  // ---------------------------------------------------------------------------

  /**
   * Handles imageReplaced$ — rebuilds the marker DivIcon with the new
   * localObjectUrl so the thumbnail swaps instantly (no placeholder flash).
   */
  handleImageReplaced(event: ImageReplacedEvent): void {
    for (const markerKey of getMarkerKeysForMedia(this.instance.markersByMediaId, event.mediaId)) {
      const state = this.instance.uploadedPhotoMarkers.get(markerKey);
      if (!state) continue;

      if (state.thumbnailUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(state.thumbnailUrl);
      }

      state.thumbnailUrl = event.localObjectUrl;
      state.signedAt = undefined;
      state.direction = event.direction ?? state.direction;
      this.markerRenderService.refreshPhotoMarker(markerKey);
    }
  }

  /**
   * Handles imageAttached$ — transitions the marker from CSS placeholder
   * to real thumbnail using the localObjectUrl from the upload.
   */
  handleImageAttached(event: ImageAttachedEvent): void {
    for (const markerKey of getMarkerKeysForMedia(this.instance.markersByMediaId, event.mediaId)) {
      const state = this.instance.uploadedPhotoMarkers.get(markerKey);
      if (!state) continue;

      if (state.thumbnailUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(state.thumbnailUrl);
      }

      state.thumbnailUrl = event.localObjectUrl;
      state.signedAt = undefined;
      state.direction = event.direction ?? state.direction;
      state.thumbnailSourcePath = event.newStoragePath;
      this.markerRenderService.refreshPhotoMarker(markerKey);
    }
  }

  upsertUploadedPhotoMarker(event: ImageUploadedEvent): void {
    if (!this.instance.map) return;

    const markerKey = toMarkerKey(event.lat, event.lng);
    const uploadedPhotoMarkers = this.instance.uploadedPhotoMarkers;
    const existing = uploadedPhotoMarkers.get(markerKey);

    if (existing) {
      const nextCount = existing.count + 1;
      const nextThumb = existing.thumbnailUrl ?? event.thumbnailUrl;
      existing.count = nextCount;
      existing.thumbnailUrl = nextThumb;
      existing.direction ??= event.direction;

      if (nextCount > 1 && this.state.selectedMarkerKey() === markerKey) {
        this.markerSelectionService.setSelectedMarker(null);
        this.state.setPhotoPanelOpen(false);
      }

      existing.marker.setIcon(this.markerRenderService.buildPhotoMarkerIcon(markerKey));
      return;
    }

    const marker = this.mapLeafletService.createPhotoMarker(
      [event.lat, event.lng],
      this.markerRenderService.buildPhotoMarkerIcon(markerKey, {
        count: 1,
        thumbnailUrl: event.thumbnailUrl,
        direction: event.direction,
      }),
    );

    this.instance.photoMarkerLayer!.addLayer(marker);
    this.markerBindingService.attachMarkerInteractions(markerKey, marker);

    uploadedPhotoMarkers.set(markerKey, {
      marker,
      count: 1,
      lat: event.lat,
      lng: event.lng,
      thumbnailUrl: event.thumbnailUrl,
      direction: event.direction,
      mediaId: event.id,
      optimistic: true,
    });

    // Maintain secondary index for upload manager event lookups.
    if (event.id) {
      registerMarkerKeyForMedia(this.instance.markersByMediaId, event.id, markerKey);
    }
  }

  // ---------------------------------------------------------------------------
  // Photo marker click handling
  // ---------------------------------------------------------------------------

  handlePhotoMarkerClick(markerKey: string, clickEvent?: MapMouseEvent): void {
    const markerState = this.instance.uploadedPhotoMarkers.get(markerKey);
    if (!markerState) {
      return;
    }

    // Always open pane and mark marker selected.
    this.markerSelectionService.setSelectedMarker(markerKey);
    this.ensurePhotoPanelOpen();

    // Load images at this marker's grid position(s) into the workspace view.
    const zoom = Math.round(this.instance.map?.getZoom() ?? 13);
    const cells = markerState.sourceCells ?? [{ lat: markerState.lat, lng: markerState.lng }];
    const additive = this.isAdditiveMarkerSelection(clickEvent);

    if (additive) {
      this.handleAdditiveMarkerSelection(markerKey, cells, zoom);
      return;
    }

    this.handleExclusiveMarkerSelection(
      markerKey,
      markerState.count,
      markerState.mediaId,
      cells,
      zoom,
    );
  }

  ensurePhotoPanelOpen(): void {
    if (!this.state.photoPanelOpen()) {
      this.state.setWorkspacePaneWidth(this.state.getWorkspacePaneOpeningWidth());
    }
    this.state.setPhotoPanelOpen(true);
  }

  private isAdditiveMarkerSelection(clickEvent?: MapMouseEvent): boolean {
    return !!(clickEvent?.originalEvent.ctrlKey || clickEvent?.originalEvent.metaKey);
  }

  private handleAdditiveMarkerSelection(
    markerKey: string,
    cells: Array<{ lat: number; lng: number }>,
    zoom: number,
  ): void {
    // Ctrl/Meta-click appends marker results to the current active selection.
    const selectedKeys = new Set(this.state.selectedMarkerKeys());
    selectedKeys.add(markerKey);
    this.markerSelectionService.setSelectedMarkerKeys(selectedKeys);
    void this.markerBindingService.addMarkerCellsToSelection(cells, zoom);
    this.patchDetailMediaId(null);
  }

  private handleExclusiveMarkerSelection(
    markerKey: string,
    markerCount: number,
    mediaId: string | undefined,
    cells: Array<{ lat: number; lng: number }>,
    zoom: number,
  ): void {
    this.markerSelectionService.setSelectedMarkerKeys(new Set([markerKey]));

    if (markerCount === 1 && mediaId) {
      this.workspaceSelectionService.setSingle(mediaId);
      this.ctx!.openDetailView(mediaId);
      return;
    }

    void this.selectClusterImages(cells, zoom);
    this.patchDetailMediaId(null);
  }

  private async selectClusterImages(
    cells: Array<{ lat: number; lng: number }>,
    zoom: number,
  ): Promise<void> {
    const images = await this.workspaceViewService.fetchClusterImages(cells, zoom);
    this.workspaceSelectionService.selectAllInScope(images.map((image) => image.id));
  }
}
