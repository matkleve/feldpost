/* eslint-disable no-magic-numbers */
import { Injectable, inject } from '@angular/core';
import { MapViewportCoordinatorService } from '../markers/map-viewport-coordinator.service';
import { MapPhotoMarkerRenderService } from '../markers/map-photo-marker-render.service';
import type { PhotoMarkerZoomLevel } from '../../../../core/map/marker-factory';

export interface MoveEndHandlerContext {
  closeContextMenus(): void;
  getUploadedPhotoMarkers(): Map<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class MapMoveEndHandlerService {
  private readonly mapViewportCoordinatorService = inject(MapViewportCoordinatorService);
  private readonly markerRenderService = inject(MapPhotoMarkerRenderService);

  private ctx: MoveEndHandlerContext | null = null;
  private moveEndDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastZoomLevel: PhotoMarkerZoomLevel = 'mid';
  private zoomAnimating = false;

  bind(ctx: MoveEndHandlerContext): void {
    this.ctx = ctx;
  }

  onZoomStart(): void {
    this.zoomAnimating = true;
  }

  onZoomEnd(): void {
    this.zoomAnimating = false;
  }

  handleMoveEnd(): void {
    if (this.moveEndDebounceTimer) {
      clearTimeout(this.moveEndDebounceTimer);
    }
    this.moveEndDebounceTimer = setTimeout(() => this.handleMoveEndDebounced(), 350);
  }

  clearDebounceTimer(): void {
    if (this.moveEndDebounceTimer) {
      clearTimeout(this.moveEndDebounceTimer);
      this.moveEndDebounceTimer = null;
    }
  }

  private handleMoveEndDebounced(): void {
    this.moveEndDebounceTimer = null;
    if (this.zoomAnimating) return;

    const currentZoom = this.markerRenderService.getPhotoMarkerZoomLevel();
    this.ctx?.closeContextMenus();
    const zoomChanged = currentZoom !== this.lastZoomLevel;

    if (!this.mapViewportCoordinatorService.isViewportStillInFetchedBuffer(zoomChanged)) {
      void this.mapViewportCoordinatorService.queryViewportMarkers();
    }

    if (zoomChanged) {
      this.lastZoomLevel = currentZoom;
      for (const markerKey of (this.ctx?.getUploadedPhotoMarkers() ?? new Map()).keys()) {
        this.markerRenderService.refreshPhotoMarker(markerKey);
      }
    }
  }
}
