/* eslint-disable no-magic-numbers */
import { Injectable, inject } from '@angular/core';
import { MapZoomHighlightOrchestratorService, DETAIL_LOCATION_FOCUS_ZOOM } from '../markers/map-zoom-highlight-orchestrator.service';
import { MapZoomOrchestratorService } from '../../../../core/map-zoom/map-zoom-orchestrator.service';
import { MapShellSearchService } from '../leaflet/map-shell-search.service';
import type { MapInstance } from '../leaflet/map-leaflet.service';

export interface MapViewFlyContext {
  getMap(): MapInstance | undefined;
  getPhotoPanelOpen(): boolean;
  getWorkspacePaneWidth(): number;
}

@Injectable({ providedIn: 'root' })
export class MapViewFlyService {
  private static readonly HOUSE_PROXIMITY_ZOOM = 19;
  private static readonly STREET_PROXIMITY_ZOOM = 17;

  private readonly zoomHighlightOrchestrator = inject(MapZoomHighlightOrchestratorService);
  private readonly mapZoomOrchestrator = inject(MapZoomOrchestratorService);
  private readonly searchService = inject(MapShellSearchService);

  private ctx: MapViewFlyContext | null = null;

  bind(ctx: MapViewFlyContext): void {
    this.ctx = ctx;
  }

  setViewWithPaneOffset(
    lat: number,
    lng: number,
    zoom: number,
    options?: Parameters<MapInstance['setView']>[2],
  ): void {
    const map = this.ctx?.getMap();
    if (!map) return;
    const paneOffset = this.ctx?.getPhotoPanelOpen() ? (this.ctx.getWorkspacePaneWidth() / 2) : 0;
    if (paneOffset === 0) {
      map.setView([lat, lng], zoom, options);
      return;
    }
    const targetPx = map.project([lat, lng], zoom);
    const shiftedPx = targetPx.add([paneOffset, 0]);
    const shiftedLatLng = map.unproject(shiftedPx, zoom);
    map.setView(shiftedLatLng, zoom, options);
  }

  onZoomToLocation(event: {
    mediaId: string;
    lat: number;
    lng: number;
    zoomMode?: 'house' | 'street';
  }): void {
    const map = this.ctx?.getMap();
    if (!map) {
      this.mapZoomOrchestrator.deferUntilMapReady({
        mediaId: event.mediaId,
        lat: event.lat,
        lng: event.lng,
        zoomMode: event.zoomMode,
      });
      return;
    }

    const requestedZoom =
      event.zoomMode === 'house'
        ? MapViewFlyService.HOUSE_PROXIMITY_ZOOM
        : event.zoomMode === 'street'
          ? MapViewFlyService.STREET_PROXIMITY_ZOOM
          : DETAIL_LOCATION_FOCUS_ZOOM;

    this.zoomHighlightOrchestrator.setPending(event.mediaId, event.lat, event.lng);
    map.invalidateSize();
    this.setViewWithPaneOffset(event.lat, event.lng, requestedZoom, { animate: false });
    this.zoomHighlightOrchestrator.waitForMapIdleThenFlushZoomHighlight();
    setTimeout(() => this.zoomHighlightOrchestrator.flushPendingZoomHighlight(), 140);
    void this.mapZoomOrchestrator.consumePending();
  }

  applySearchMapCenter(event: { lat: number; lng: number; label: string }): void {
    const map = this.ctx?.getMap();
    if (!map) return;
    this.setViewWithPaneOffset(event.lat, event.lng, MapViewFlyService.STREET_PROXIMITY_ZOOM, { animate: false });
    this.searchService.updateViewportBounds(map);
    this.searchService.renderOrUpdateLocationMarker([event.lat, event.lng], map);
    void this.searchService.refreshCountryCode(event.lat, event.lng);
  }
}
