/* eslint-disable max-lines, max-lines-per-function, no-magic-numbers */

import { Injectable, inject } from '@angular/core';
import { RadiusDrawingOrchestratorService, RADIUS_CLICK_GUARD_MS } from '../radius/radius-drawing-orchestrator.service';
import { MapMarkerSelectionService } from '../markers/map-marker-selection.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { UploadShellUiService } from '../../../upload/upload-shell/upload-shell-ui.service';
import type { MapInstance, MapLatLng, MapMouseEvent, MapPoint } from '../leaflet/map-leaflet.service';
import type { UploadLocationMapPickRequest } from '../../../../core/workspace-pane/workspace-pane-shell-events.types';

// ── Module-level constants (migrated from MapShellComponent static fields) ──

const PLACEMENT_CLICK_GUARD_MS = 220;
const CONTEXT_MENU_DRAG_THRESHOLD_PX = 8;
const CONTEXT_MENU_NATIVE_HANDSHAKE_MS = 2000;
const CONTEXT_MENU_NATIVE_HANDSHAKE_PX = 24;
const CONTEXT_MENU_NATIVE_BYPASS_TTL_MS = 250;

// ── Context interface ────────────────────────────────────────────────────────

export interface ClickHandlerContext {
  getMap(): MapInstance | undefined;
  getPlacementActive(): boolean;
  getSearchPlacementActive(): boolean;
  getSelectedMarkerKey(): string | null;
  getSelectedMarkerKeys(): Set<string>;
  getDraftMediaMarker(): { lat: number; lng: number; uploadCount: number } | null;
  getPendingPlacementKey(): string | null;
  setPendingPlacementKey(key: string | null): void;
  setPlacementActive(value: boolean): void;
  getLastMapMoveAt(): number;
  closeContextMenus(): void;
  openMapContextMenuAt(latlng: MapLatLng, clientX: number, clientY: number): void;
  openRadiusContextMenuAt(latlng: MapLatLng, clientX: number, clientY: number): void;
  removeDraftMediaMarker(): void;
  closeUploadPanel(): void;
  closeWorkspacePane(): void;
  placeFile(key: string, coords: { lat: number; lng: number }): void;
  renderOrUpdateSearchLocationMarker(latlng: [number, number]): void;
  clearSearchPlacement(): void;
  clearMapSelectionStateCallbacks(): void;
  patchDetailMediaId(id: string | null): void;
  getPendingUploadedLocationMapPick(): UploadLocationMapPickRequest | null;
  setPendingUploadedLocationMapPick(value: UploadLocationMapPickRequest | null): void;
  onCompleteLocationMapPick(pick: UploadLocationMapPickRequest, coords: { lat: number; lng: number }): void;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MapClickHandlerService {
  private readonly radiusDrawingService = inject(RadiusDrawingOrchestratorService);
  private readonly markerSelectionService = inject(MapMarkerSelectionService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly uploadShellUiService = inject(UploadShellUiService);

  private ctx: ClickHandlerContext | null = null;

  // ── State fields (migrated from MapShellComponent) ───────────────────────

  private pendingSecondaryPress: {
    startPoint: MapPoint;
    startLatLng: MapLatLng;
    startClientX: number;
    startClientY: number;
    additive: boolean;
  } | null = null;

  private suppressMapClickUntil = 0;
  private lastSecondaryContextClickAt: number | null = null;
  private lastSecondaryContextClickPos: { x: number; y: number } | null = null;
  private nativeContextMenuBypassUntil = 0;
  private markerContextMenuSuppressUntil = 0;

  // ── Bound container handler (returned for addEventListener/removeEventListener) ──

  private readonly _containerContextMenuHandler = (event: MouseEvent): void => {
    if (event.button !== 2) {
      return;
    }

    if (this.isMarkerDomTarget(event)) {
      // Keep native browser menu suppressed, but let marker listeners receive
      // the event so marker context actions can open reliably.
      event.preventDefault();
      return;
    }

    if (this.shouldAllowNativeContextMenu(event)) {
      this.nativeContextMenuBypassUntil = Date.now() + CONTEXT_MENU_NATIVE_BYPASS_TTL_MS;
      this.pendingSecondaryPress = null;
      this.ctx?.closeContextMenus();
      return;
    }

    event.preventDefault();
    event.stopPropagation();
  };

  // ── Public API ────────────────────────────────────────────────────────────

  bind(ctx: ClickHandlerContext): void {
    this.ctx = ctx;
  }

  /**
   * Returns the bound capture-phase contextmenu handler suitable for
   * addEventListener / removeEventListener on the map container.
   */
  getContainerContextMenuHandler(): (event: MouseEvent) => void {
    return this._containerContextMenuHandler;
  }

  /**
   * Called by `markerBindingService` to suppress the next marker context menu
   * for the given number of milliseconds.
   */
  suppressMarkerContextMenuFor(ms: number): void {
    this.markerContextMenuSuppressUntil = Date.now() + ms;
  }

  suppressMapClickFor(ms: number): void {
    this.suppressMapClickUntil = Date.now() + ms;
  }

  clearPendingSecondaryPress(): void {
    this.pendingSecondaryPress = null;
  }

  clearActiveRadiusSelection(): void {
    this.radiusDrawingService.clearSelectionVisuals();
    this.markerSelectionService.setSelectedMarker(null);
    this.markerSelectionService.setSelectedMarkerKeys(new Set());
    this.ctx?.patchDetailMediaId(null);
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
  }

  /**
   * Consumes the one-shot native context menu bypass flag.
   * Must remain PUBLIC — called by `MapMarkerBindingService`.
   */
  consumeNativeContextMenuBypass(): boolean {
    if (Date.now() > this.nativeContextMenuBypassUntil) {
      this.nativeContextMenuBypassUntil = 0;
      return false;
    }

    this.nativeContextMenuBypassUntil = 0;
    return true;
  }

  /**
   * Whether the DOM event target is a photo marker element.
   * Must remain PUBLIC — used by `markerContainerContextMenuHandler`.
   */
  isMarkerDomTarget(event: MouseEvent): boolean {
    const target = event.target;
    if (!(target instanceof Element)) {
      return false;
    }

    return !!target.closest('.map-photo-marker, .leaflet-marker-icon');
  }

  // ── Map event handlers ────────────────────────────────────────────────────

  handleMapClick(e: MapMouseEvent): void {
    this.ctx?.closeContextMenus();

    const clickButton = e.originalEvent?.button ?? 0;
    const isPrimaryClick = clickButton === 0;
    const allowPrimaryDeselection = this.shouldAllowPrimaryDeselection(isPrimaryClick);

    if (Date.now() < this.suppressMapClickUntil && !allowPrimaryDeselection) {
      return;
    }

    if (this.tryClearEmptyDraftOnPrimaryClick(isPrimaryClick)) {
      return;
    }

    if (this.tryCompletePendingPlacement(e.latlng)) {
      return;
    }

    if (!this.ctx?.getSearchPlacementActive()) {
      this.clearMapSelectionState();
      return;
    }

    this.completeSearchPlacement(e.latlng);
  }

  handleMapMouseDown(event: MapMouseEvent): void {
    if (event.originalEvent.button !== 2) {
      return;
    }

    event.originalEvent.preventDefault();

    const map = this.ctx?.getMap();
    if (!map || this.ctx?.getPlacementActive() || this.ctx?.getSearchPlacementActive()) {
      return;
    }

    this.pendingSecondaryPress = {
      startPoint: map.mouseEventToContainerPoint(event.originalEvent),
      startLatLng: event.latlng,
      startClientX: event.originalEvent.clientX,
      startClientY: event.originalEvent.clientY,
      additive: !!(event.originalEvent.ctrlKey || event.originalEvent.metaKey),
    };
    this.ctx?.closeContextMenus();
  }

  handleMapMouseMove(event: MapMouseEvent): void {
    const map = this.ctx?.getMap();
    if (!map || !this.pendingSecondaryPress || this.radiusDrawingService.isDrawActive()) {
      return;
    }

    const currentPoint = map.mouseEventToContainerPoint(event.originalEvent);
    const dx = currentPoint.x - this.pendingSecondaryPress.startPoint.x;
    const dy = currentPoint.y - this.pendingSecondaryPress.startPoint.y;
    const movedPx = Math.hypot(dx, dy);

    if (movedPx < CONTEXT_MENU_DRAG_THRESHOLD_PX) {
      return;
    }

    const { startLatLng, additive } = this.pendingSecondaryPress;
    this.pendingSecondaryPress = null;
    this.radiusDrawingService.startDraw(startLatLng, additive);
    this.radiusDrawingService.updateDraft(event.latlng);
  }

  handleMapMouseUp(event: MapMouseEvent): void {
    if (event.originalEvent.button !== 2) {
      return;
    }

    event.originalEvent.preventDefault();

    if (this.isMarkerDomTarget(event.originalEvent)) {
      this.pendingSecondaryPress = null;
      return;
    }

    if (Date.now() <= this.markerContextMenuSuppressUntil) {
      this.pendingSecondaryPress = null;
      return;
    }

    // Short secondary click should open the context menu. Radius drawing already
    // clears pendingSecondaryPress during mousemove once drag threshold is crossed.
    if (!this.pendingSecondaryPress || this.radiusDrawingService.isDrawActive()) {
      return;
    }

    const { startLatLng, startClientX, startClientY } = this.pendingSecondaryPress;
    this.pendingSecondaryPress = null;
    this.openContextMenuForShortSecondaryClick(startLatLng, startClientX, startClientY);
  }

  handleMapContextMenu(event: MapMouseEvent): void {
    if (this.consumeNativeContextMenuBypass()) {
      return;
    }

    if (this.isMarkerDomTarget(event.originalEvent)) {
      this.pendingSecondaryPress = null;
      return;
    }

    if (Date.now() <= this.markerContextMenuSuppressUntil) {
      this.pendingSecondaryPress = null;
      return;
    }

    event.originalEvent.preventDefault();
    event.originalEvent.stopPropagation();

    // Mouse-up opens the menu for short right-click interactions. Keep this as a
    // fallback for platforms where only contextmenu is emitted.
    if (this.radiusDrawingService.isDrawActive() || !this.pendingSecondaryPress) {
      return;
    }

    const { startLatLng, startClientX, startClientY } = this.pendingSecondaryPress;
    this.pendingSecondaryPress = null;
    this.openContextMenuForShortSecondaryClick(startLatLng, startClientX, startClientY);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private shouldAllowPrimaryDeselection(isPrimaryClick: boolean): boolean {
    if (!isPrimaryClick || this.ctx?.getSearchPlacementActive()) {
      return false;
    }

    const hasMarkerSelection =
      (this.ctx?.getSelectedMarkerKey() ?? null) !== null ||
      (this.ctx?.getSelectedMarkerKeys().size ?? 0) > 0;
    const hasRadiusSelection = this.radiusDrawingService.hasCommittedSelection();
    const hasWorkspaceSelection = this.workspaceViewService.selectionActive();
    return hasMarkerSelection || hasRadiusSelection || hasWorkspaceSelection;
  }

  private tryClearEmptyDraftOnPrimaryClick(isPrimaryClick: boolean): boolean {
    const activeDraft = this.ctx?.getDraftMediaMarker();
    if (
      !isPrimaryClick ||
      !activeDraft ||
      activeDraft.uploadCount !== 0 ||
      !!this.ctx?.getPendingPlacementKey() ||
      this.ctx?.getSearchPlacementActive()
    ) {
      return false;
    }

    this.uploadShellUiService.closeUploadPanel();
    this.ctx?.removeDraftMediaMarker();
    this.ctx?.closeWorkspacePane();
    return true;
  }

  private tryCompletePendingPlacement(latlng: MapLatLng): boolean {
    const pendingPlacementKey = this.ctx?.getPendingPlacementKey();
    if (!pendingPlacementKey) {
      return false;
    }

    // Prevent accidental placement immediately after drag/pan movement.
    const lastMapMoveAt = this.ctx?.getLastMapMoveAt() ?? 0;
    if (Date.now() - lastMapMoveAt < PLACEMENT_CLICK_GUARD_MS) {
      return true;
    }

    const coords = { lat: latlng.lat, lng: latlng.lng };
    this.uploadShellUiService.placeFile(pendingPlacementKey, coords);

    this.ctx?.setPendingPlacementKey(null);
    this.ctx?.setPlacementActive(false);
    this.ctx?.getMap()?.getContainer().classList.remove('map-container--placing');
    return true;
  }

  private clearMapSelectionState(): void {
    this.uploadShellUiService.closeUploadPanel();
    // Deselect the active marker but keep the workspace pane open.
    // The pane is closed only via its own close button.
    this.markerSelectionService.setSelectedMarker(null);
    this.markerSelectionService.setSelectedMarkerKeys(new Set());
    this.ctx?.patchDetailMediaId(null);
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
    this.radiusDrawingService.clearSelectionVisuals();
  }

  private completeSearchPlacement(latlng: MapLatLng): void {
    this.ctx?.renderOrUpdateSearchLocationMarker([latlng.lat, latlng.lng]);
    const pendingUploadLocation = this.ctx?.getPendingUploadedLocationMapPick() ?? null;
    this.ctx?.setPendingUploadedLocationMapPick(null);
    this.ctx?.clearSearchPlacement();

    if (!pendingUploadLocation) {
      return;
    }

    this.ctx?.onCompleteLocationMapPick(pendingUploadLocation, {
      lat: latlng.lat,
      lng: latlng.lng,
    });
  }

  private openContextMenuForShortSecondaryClick(
    latlng: MapLatLng,
    clientX: number,
    clientY: number,
  ): void {
    if (this.radiusDrawingService.hasCommittedSelection()) {
      if (this.radiusDrawingService.isInsideAnyCommittedRadius(latlng)) {
        this.ctx?.openRadiusContextMenuAt(latlng, clientX, clientY);
        return;
      }

      this.clearActiveRadiusSelection();
      this.ctx?.closeContextMenus();
      this.suppressMapClickUntil = Date.now() + RADIUS_CLICK_GUARD_MS;
      return;
    }

    this.ctx?.openMapContextMenuAt(latlng, clientX, clientY);
  }

  private shouldAllowNativeContextMenu(event: MouseEvent): boolean {
    const now = Date.now();
    const currentPos = { x: event.clientX, y: event.clientY };
    const previousAt = this.lastSecondaryContextClickAt;
    const previousPos = this.lastSecondaryContextClickPos;

    const withinTime =
      previousAt !== null && now - previousAt <= CONTEXT_MENU_NATIVE_HANDSHAKE_MS;
    const withinDistance =
      previousPos !== null &&
      Math.hypot(currentPos.x - previousPos.x, currentPos.y - previousPos.y) <=
        CONTEXT_MENU_NATIVE_HANDSHAKE_PX;

    const allowNative = withinTime && withinDistance;

    if (allowNative) {
      this.lastSecondaryContextClickAt = null;
      this.lastSecondaryContextClickPos = null;
      return true;
    }

    this.lastSecondaryContextClickAt = now;
    this.lastSecondaryContextClickPos = currentPos;
    return false;
  }

}
