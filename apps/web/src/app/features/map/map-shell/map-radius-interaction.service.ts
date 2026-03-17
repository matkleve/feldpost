import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { RadiusVisualsService } from './radius-visuals.service';

export interface PendingSecondaryPressState {
  startPoint: L.Point;
  startLatLng: L.LatLng;
  startClientX: number;
  startClientY: number;
  additive: boolean;
}

export interface MapRadiusInteractionHost {
  map?: L.Map;
  pendingSecondaryPress: PendingSecondaryPressState | null;
  radiusDrawActive: boolean;
  radiusDrawAdditive: boolean;
  radiusDrawStartLatLng: L.LatLng | null;
  radiusDraftLine: L.Polyline | null;
  radiusDraftCircle: L.Circle | null;
  radiusDraftLabel: L.Marker | null;
  radiusDrawMoveHandler: ((event: L.LeafletMouseEvent) => void) | null;
  radiusDrawMouseUpHandler: ((event: L.LeafletMouseEvent) => void) | null;
  suppressMapClickUntil: number;
  lastSecondaryContextClickAt: number | null;
  lastSecondaryContextClickPos: { x: number; y: number } | null;
  nativeContextMenuBypassUntil: number;
  closeContextMenus(): void;
  openRadiusContextMenuAt(latlng: L.LatLng, clientX: number, clientY: number): void;
  openMapContextMenuAt(latlng: L.LatLng, clientX: number, clientY: number): void;
  clearActiveRadiusSelection(): void;
  hasCommittedRadiusSelection(): boolean;
  isInsideCommittedRadius(latlng: L.LatLng): boolean;
  isPlacementActive(): boolean;
  isSearchPlacementActive(): boolean;
  updateRadiusDraftMarkerHighlights(center: L.LatLng, radiusMeters: number): void;
  clearRadiusDraftMarkerHighlights(): void;
  clearRadiusSelectionVisuals(): void;
  addRadiusSelectionVisual(center: L.LatLng, radiusMeters: number, edge: L.LatLng): void;
  selectRadiusImages(center: L.LatLng, radiusMeters: number, additive: boolean): Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class MapRadiusInteractionService {
  constructor(private readonly radiusVisualsService: RadiusVisualsService) {}

  handleMapMouseDown(host: MapRadiusInteractionHost, event: L.LeafletMouseEvent): void {
    if (event.originalEvent.button !== 2) {
      return;
    }

    event.originalEvent.preventDefault();
    if (!host.map || host.isPlacementActive() || host.isSearchPlacementActive()) {
      return;
    }

    host.pendingSecondaryPress = {
      startPoint: host.map.mouseEventToContainerPoint(event.originalEvent),
      startLatLng: event.latlng,
      startClientX: event.originalEvent.clientX,
      startClientY: event.originalEvent.clientY,
      additive: !!(event.originalEvent.ctrlKey || event.originalEvent.metaKey),
    };
    host.closeContextMenus();
  }

  handleMapMouseMove(
    host: MapRadiusInteractionHost,
    event: L.LeafletMouseEvent,
    dragThresholdPx: number,
    radiusClickGuardMs: number,
    minRadiusMeters: number,
  ): void {
    if (!host.map || !host.pendingSecondaryPress || host.radiusDrawActive) {
      return;
    }

    const currentPoint = host.map.mouseEventToContainerPoint(event.originalEvent);
    const dx = currentPoint.x - host.pendingSecondaryPress.startPoint.x;
    const dy = currentPoint.y - host.pendingSecondaryPress.startPoint.y;
    const movedPx = Math.hypot(dx, dy);

    if (movedPx < dragThresholdPx) {
      return;
    }

    const { startLatLng, additive } = host.pendingSecondaryPress;
    host.pendingSecondaryPress = null;
    this.startRadiusSelectionDraw(host, startLatLng, additive, radiusClickGuardMs, minRadiusMeters);
    this.updateRadiusSelectionDraft(host, event.latlng);
  }

  handleMapMouseUp(
    host: MapRadiusInteractionHost,
    event: L.LeafletMouseEvent,
    radiusClickGuardMs: number,
  ): void {
    if (event.originalEvent.button !== 2) {
      return;
    }

    event.originalEvent.preventDefault();
    if (!host.pendingSecondaryPress || host.radiusDrawActive) {
      return;
    }

    const { startLatLng, startClientX, startClientY } = host.pendingSecondaryPress;
    host.pendingSecondaryPress = null;
    this.openContextMenuForShortSecondaryClick(
      host,
      startLatLng,
      startClientX,
      startClientY,
      radiusClickGuardMs,
    );
  }

  handleMapContextMenu(
    host: MapRadiusInteractionHost,
    event: L.LeafletMouseEvent,
    radiusClickGuardMs: number,
  ): void {
    if (this.consumeNativeContextMenuBypass(host)) {
      return;
    }

    event.originalEvent.preventDefault();
    event.originalEvent.stopPropagation();

    if (host.radiusDrawActive || !host.pendingSecondaryPress) {
      return;
    }

    const { startLatLng, startClientX, startClientY } = host.pendingSecondaryPress;
    host.pendingSecondaryPress = null;
    this.openContextMenuForShortSecondaryClick(
      host,
      startLatLng,
      startClientX,
      startClientY,
      radiusClickGuardMs,
    );
  }

  shouldAllowNativeContextMenu(
    host: MapRadiusInteractionHost,
    event: MouseEvent,
    nativeHandshakeMs: number,
    nativeHandshakePx: number,
  ): boolean {
    const now = Date.now();
    const currentPos = { x: event.clientX, y: event.clientY };
    const previousAt = host.lastSecondaryContextClickAt;
    const previousPos = host.lastSecondaryContextClickPos;

    const withinTime = previousAt !== null && now - previousAt <= nativeHandshakeMs;
    const withinDistance =
      previousPos !== null &&
      Math.hypot(currentPos.x - previousPos.x, currentPos.y - previousPos.y) <= nativeHandshakePx;

    const allowNative = withinTime && withinDistance;
    if (allowNative) {
      host.lastSecondaryContextClickAt = null;
      host.lastSecondaryContextClickPos = null;
      return true;
    }

    host.lastSecondaryContextClickAt = now;
    host.lastSecondaryContextClickPos = currentPos;
    return false;
  }

  consumeNativeContextMenuBypass(host: MapRadiusInteractionHost): boolean {
    if (Date.now() > host.nativeContextMenuBypassUntil) {
      host.nativeContextMenuBypassUntil = 0;
      return false;
    }

    host.nativeContextMenuBypassUntil = 0;
    return true;
  }

  async commitRadiusSelection(
    host: MapRadiusInteractionHost,
    endLatLng: L.LatLng,
    minRadiusMeters: number,
    radiusClickGuardMs: number,
  ): Promise<void> {
    if (!host.map || !host.radiusDrawStartLatLng) {
      this.cancelRadiusDrawing(host);
      return;
    }

    const center = host.radiusDrawStartLatLng;
    const radiusMeters = host.map.distance(center, endLatLng);
    const additive = host.radiusDrawAdditive;

    this.cancelRadiusDrawing(host, true);

    if (radiusMeters < minRadiusMeters) {
      host.clearRadiusDraftMarkerHighlights();
      return;
    }

    if (!additive) {
      host.clearRadiusSelectionVisuals();
    }

    host.addRadiusSelectionVisual(center, radiusMeters, endLatLng);
    await host.selectRadiusImages(center, radiusMeters, additive);
    host.clearRadiusDraftMarkerHighlights();
    host.suppressMapClickUntil = Date.now() + radiusClickGuardMs;
  }

  cancelRadiusDrawing(host: MapRadiusInteractionHost, preserveDraftHighlights = false): void {
    if (host.map && host.radiusDrawMoveHandler) {
      host.map.off('mousemove', host.radiusDrawMoveHandler);
    }

    if (host.map && host.radiusDrawMouseUpHandler) {
      host.map.off('mouseup', host.radiusDrawMouseUpHandler);
    }

    host.radiusDrawMoveHandler = null;
    host.radiusDrawMouseUpHandler = null;
    host.radiusDrawActive = false;
    host.radiusDrawAdditive = false;
    host.radiusDrawStartLatLng = null;

    host.radiusDraftLine?.remove();
    host.radiusDraftLine = null;
    host.radiusDraftCircle?.remove();
    host.radiusDraftCircle = null;
    host.radiusDraftLabel?.remove();
    host.radiusDraftLabel = null;

    if (!preserveDraftHighlights) {
      host.clearRadiusDraftMarkerHighlights();
    }
  }

  private openContextMenuForShortSecondaryClick(
    host: MapRadiusInteractionHost,
    latlng: L.LatLng,
    clientX: number,
    clientY: number,
    radiusClickGuardMs: number,
  ): void {
    if (host.hasCommittedRadiusSelection()) {
      if (host.isInsideCommittedRadius(latlng)) {
        host.openRadiusContextMenuAt(latlng, clientX, clientY);
        return;
      }

      host.clearActiveRadiusSelection();
      host.closeContextMenus();
      host.suppressMapClickUntil = Date.now() + radiusClickGuardMs;
      return;
    }

    host.openMapContextMenuAt(latlng, clientX, clientY);
  }

  private startRadiusSelectionDraw(
    host: MapRadiusInteractionHost,
    startLatLng: L.LatLng,
    additive: boolean,
    radiusClickGuardMs: number,
    minRadiusMeters: number,
  ): void {
    if (!host.map || host.isPlacementActive() || host.isSearchPlacementActive()) {
      return;
    }

    this.cancelRadiusDrawing(host);
    host.closeContextMenus();

    host.radiusDrawActive = true;
    host.radiusDrawAdditive = additive;
    host.radiusDrawStartLatLng = startLatLng;
    host.suppressMapClickUntil = Date.now() + radiusClickGuardMs;

    host.radiusDraftLine = L.polyline([startLatLng, startLatLng], {
      color: 'var(--color-clay)',
      weight: 2,
      opacity: 0.95,
      dashArray: '6 4',
      interactive: false,
    }).addTo(host.map);

    host.radiusDraftCircle = L.circle(startLatLng, {
      radius: 1,
      color: 'var(--color-clay)',
      weight: 2,
      opacity: 0.95,
      fillColor: 'var(--color-clay)',
      fillOpacity: 0.1,
      interactive: false,
    }).addTo(host.map);

    host.radiusDraftLabel = this.radiusVisualsService
      .createLabelMarker(startLatLng, 0, 0)
      .addTo(host.map);

    host.radiusDrawMoveHandler = (moveEvent: L.LeafletMouseEvent) => {
      this.updateRadiusSelectionDraft(host, moveEvent.latlng);
    };

    host.radiusDrawMouseUpHandler = (upEvent: L.LeafletMouseEvent) => {
      void this.commitRadiusSelection(host, upEvent.latlng, minRadiusMeters, radiusClickGuardMs);
    };

    host.map.on('mousemove', host.radiusDrawMoveHandler);
    host.map.on('mouseup', host.radiusDrawMouseUpHandler);
  }

  private updateRadiusSelectionDraft(
    host: MapRadiusInteractionHost,
    currentLatLng: L.LatLng,
  ): void {
    if (!host.map || !host.radiusDrawStartLatLng) {
      return;
    }

    const radiusMeters = host.map.distance(host.radiusDrawStartLatLng, currentLatLng);
    const labelLatLng = this.radiusVisualsService.getLabelLatLng(
      host.radiusDrawStartLatLng,
      currentLatLng,
    );
    const labelAngleDeg = this.radiusVisualsService.getReadableLineAngleDeg(
      host.map,
      host.radiusDrawStartLatLng,
      currentLatLng,
    );

    host.radiusDraftLine?.setLatLngs([host.radiusDrawStartLatLng, currentLatLng]);
    host.radiusDraftCircle?.setRadius(radiusMeters);
    host.radiusDraftLabel?.setLatLng(labelLatLng);
    this.radiusVisualsService.updateLabelMarker(host.radiusDraftLabel, radiusMeters, labelAngleDeg);

    host.updateRadiusDraftMarkerHighlights(host.radiusDrawStartLatLng, radiusMeters);
  }
}
