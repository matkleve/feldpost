/* eslint-disable no-magic-numbers */
import { Injectable, inject } from '@angular/core';
import { MapContextActionsService } from './map-context-actions.service';
import { MapShellState } from '../component/map-shell.state';
import { MapClickHandlerService } from '../handlers/map-click-handler.service';
import { RADIUS_CLICK_GUARD_MS } from '../radius/radius-drawing-orchestrator.service';
import type { PhotoMarkerState } from '../markers/map-marker-reconcile.facade';
import type { MarkerRenderSnapshot } from '../markers/map-photo-marker-render.service';
import type { MapInstance, MapLatLng } from '../leaflet/map-leaflet.service';

export interface ContextMenuOpenContext {
  getMap(): MapInstance | undefined;
  getUploadedPhotoMarkers(): Map<string, PhotoMarkerState & { lastRendered?: MarkerRenderSnapshot }>;
  getSelectedMarkerKeys(): Set<string>;
  toMarkerKey(lat: number, lng: number): string;
}

@Injectable({ providedIn: 'root' })
export class MapContextMenuOpenService {
  private readonly mapContextActionsService = inject(MapContextActionsService);
  private readonly state = inject(MapShellState);
  private readonly mapClickHandlerService = inject(MapClickHandlerService);

  private ctx: ContextMenuOpenContext | null = null;

  bind(ctx: ContextMenuOpenContext): void {
    this.ctx = ctx;
  }

  openMapContextMenuAt(latlng: MapLatLng, clientX: number, clientY: number): void {
    const position = this.mapContextActionsService.clampContextMenuPosition(clientX, clientY);
    this.state.setRadiusContextMenuOpen(false);
    this.state.setMarkerContextMenuOpen(false);
    this.state.setMapContextMenuCoords({ lat: latlng.lat, lng: latlng.lng });
    this.state.setMapContextMenuPosition(position);
    this.state.setMapContextMenuOpen(true);
    this.focusFirstOpenMapMenuItem();
    this.mapClickHandlerService.suppressMapClickFor(RADIUS_CLICK_GUARD_MS);
  }

  openRadiusContextMenuAt(latlng: MapLatLng, clientX: number, clientY: number): void {
    const position = this.mapContextActionsService.clampContextMenuPosition(clientX, clientY);
    this.state.setMapContextMenuOpen(false);
    this.state.setMarkerContextMenuOpen(false);
    this.state.setRadiusContextMenuCoords({ lat: latlng.lat, lng: latlng.lng });
    this.state.setRadiusContextMenuPosition(position);
    this.state.setRadiusContextMenuOpen(true);
    this.focusFirstOpenMapMenuItem();
    this.mapClickHandlerService.suppressMapClickFor(RADIUS_CLICK_GUARD_MS);
  }

  openMarkerContextMenu(markerKey: string, sourceEvent?: MouseEvent | PointerEvent): void {
    if (!this.ctx) return;
    const state = this.ctx.getUploadedPhotoMarkers().get(markerKey);
    if (!state) return;
    const position = this.mapContextActionsService.resolveMarkerContextMenuPosition(
      state,
      sourceEvent,
      this.ctx.getMap(),
    );

    this.state.setMapContextMenuOpen(false);
    this.state.setRadiusContextMenuOpen(false);
    this.state.setMarkerContextMenuPosition(position);
    const selectedMarkerKeys = this.ctx.getSelectedMarkerKeys();
    const isMultiSelection = selectedMarkerKeys.size > 1 && selectedMarkerKeys.has(markerKey);

    if (isMultiSelection) {
      const multiStates = Array.from(selectedMarkerKeys)
        .map((key) => this.ctx!.getUploadedPhotoMarkers().get(key))
        .filter((candidate): candidate is NonNullable<typeof candidate> => !!candidate);

      const combinedSourceCells = Array.from(
        new Map(
          multiStates
            .flatMap((marker) => marker.sourceCells ?? [{ lat: marker.lat, lng: marker.lng }])
            .map((cell) => [this.ctx!.toMarkerKey(cell.lat, cell.lng), cell]),
        ).values(),
      );

      const combinedCount = multiStates.reduce((sum, marker) => sum + Math.max(1, marker.count), 0);

      this.state.setMarkerContextMenuPayload({
        markerKey,
        count: combinedCount,
        lat: state.lat,
        lng: state.lng,
        isMultiSelection: true,
        sourceCells: combinedSourceCells,
      });
    } else {
      this.state.setMarkerContextMenuPayload({
        markerKey,
        count: state.count,
        lat: state.lat,
        lng: state.lng,
        mediaId: state.mediaId,
        isMultiSelection: false,
        sourceCells: state.sourceCells ?? [{ lat: state.lat, lng: state.lng }],
      });
    }

    this.state.setMarkerContextMenuOpen(true);
    this.focusFirstOpenMapMenuItem();
    this.mapClickHandlerService.suppressMapClickFor(RADIUS_CLICK_GUARD_MS);
  }

  focusFirstOpenMapMenuItem(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.requestAnimationFrame(() => {
      const firstItem = document.querySelector<HTMLButtonElement>(
        '.map-context-menu button[role="menuitem"]',
      );
      firstItem?.focus();
    });
  }
}
