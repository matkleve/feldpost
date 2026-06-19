/* eslint-disable max-lines, max-lines-per-function, no-magic-numbers */

import { Injectable, inject } from '@angular/core';
import { RadiusDrawingOrchestratorService, RADIUS_CLICK_GUARD_MS } from '../radius/radius-drawing-orchestrator.service';
import { MapMarkerSelectionService } from '../markers/map-marker-selection.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { UploadShellUiService } from '../../../upload/upload-shell/upload-shell-ui.service';
import { MapShellState } from '../component/map-shell.state';
import { MapShellSearchService } from '../leaflet/map-shell-search.service';
import { MapShellInstanceService } from '../component/map-shell-instance.service';
import { WorkspacePaneObserverAdapter } from '../../../../core/workspace-pane/workspace-pane-observer.adapter';
import { PhotoMarkerLifecycleService } from '../markers/photo-marker-lifecycle.service';
import { MapLocationPickService } from './map-location-pick.service';
import { MapContextMenuOpenService } from '../context-menu/map-context-menu-open.service';
import type { MapLatLng, MapMouseEvent } from '../leaflet/map-leaflet.service';

// ── Module-level constants (migrated from MapShellComponent static fields) ──

const PLACEMENT_CLICK_GUARD_MS = 220;
const CONTEXT_MENU_DRAG_THRESHOLD_PX = 8;
const CONTEXT_MENU_NATIVE_HANDSHAKE_MS = 2000;
const CONTEXT_MENU_NATIVE_HANDSHAKE_PX = 24;
const CONTEXT_MENU_NATIVE_BYPASS_TTL_MS = 250;

// ── Context interface ────────────────────────────────────────────────────────

export interface ClickHandlerContext {
  closeWorkspacePane(): void;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MapClickHandlerService {
  private readonly radiusDrawingService = inject(RadiusDrawingOrchestratorService);
  private readonly markerSelectionService = inject(MapMarkerSelectionService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly uploadShellUiService = inject(UploadShellUiService);
  private readonly state = inject(MapShellState);
  private readonly searchService = inject(MapShellSearchService);
  private readonly instance = inject(MapShellInstanceService);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);
  private readonly photoMarkerLifecycleService = inject(PhotoMarkerLifecycleService);
  private readonly mapLocationPickService = inject(MapLocationPickService);
  private readonly mapContextMenuOpenService = inject(MapContextMenuOpenService);

  private ctx: ClickHandlerContext | null = null;

  // ── State fields ──────────────────────────────────────────────────────────

  private lastSecondaryContextClickAt: number | null = null;
  private lastSecondaryContextClickPos: { x: number; y: number } | null = null;

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
      this.instance.nativeContextMenuBypassUntil = Date.now() + CONTEXT_MENU_NATIVE_BYPASS_TTL_MS;
      this.instance.pendingSecondaryPress = null;
      this.state.closeAllContextMenus();
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

  suppressMapClickFor(ms: number): void {
    this.instance.suppressMapClickUntil = Date.now() + ms;
  }

  clearPendingSecondaryPress(): void {
    this.instance.pendingSecondaryPress = null;
  }

  clearActiveRadiusSelection(): void {
    this.radiusDrawingService.clearSelectionVisuals();
    this.markerSelectionService.setSelectedMarker(null);
    this.markerSelectionService.setSelectedMarkerKeys(new Set());
    this.patchDetailMediaId(null);
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
  }

  /**
   * Consumes the one-shot native context menu bypass flag.
   * Must remain PUBLIC — called by `MapMarkerBindingService`.
   */
  consumeNativeContextMenuBypass(): boolean {
    if (Date.now() > this.instance.nativeContextMenuBypassUntil) {
      this.instance.nativeContextMenuBypassUntil = 0;
      return false;
    }

    this.instance.nativeContextMenuBypassUntil = 0;
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
    this.state.closeAllContextMenus();

    const clickButton = e.originalEvent?.button ?? 0;
    const isPrimaryClick = clickButton === 0;
    const allowPrimaryDeselection = this.shouldAllowPrimaryDeselection(isPrimaryClick);

    if (Date.now() < this.instance.suppressMapClickUntil && !allowPrimaryDeselection) {
      return;
    }

    if (this.tryClearEmptyDraftOnPrimaryClick(isPrimaryClick)) {
      return;
    }

    if (this.tryCompletePendingPlacement(e.latlng)) {
      return;
    }

    if (!this.searchService.searchPlacementActive()) {
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

    const map = this.instance.map;
    if (!map || this.state.placementActive() || this.searchService.searchPlacementActive()) {
      return;
    }

    this.instance.pendingSecondaryPress = {
      startPoint: map.mouseEventToContainerPoint(event.originalEvent),
      startLatLng: event.latlng,
      startClientX: event.originalEvent.clientX,
      startClientY: event.originalEvent.clientY,
      additive: !!(event.originalEvent.ctrlKey || event.originalEvent.metaKey),
    };
    this.state.closeAllContextMenus();
  }

  handleMapMouseMove(event: MapMouseEvent): void {
    const map = this.instance.map;
    if (!map || !this.instance.pendingSecondaryPress || this.radiusDrawingService.isDrawActive()) {
      return;
    }

    const currentPoint = map.mouseEventToContainerPoint(event.originalEvent);
    const dx = currentPoint.x - this.instance.pendingSecondaryPress.startPoint.x;
    const dy = currentPoint.y - this.instance.pendingSecondaryPress.startPoint.y;
    const movedPx = Math.hypot(dx, dy);

    if (movedPx < CONTEXT_MENU_DRAG_THRESHOLD_PX) {
      return;
    }

    const { startLatLng, additive } = this.instance.pendingSecondaryPress;
    this.instance.pendingSecondaryPress = null;
    this.radiusDrawingService.startDraw(startLatLng, additive);
    this.radiusDrawingService.updateDraft(event.latlng);
  }

  handleMapMouseUp(event: MapMouseEvent): void {
    if (event.originalEvent.button !== 2) {
      return;
    }

    event.originalEvent.preventDefault();

    if (this.isMarkerDomTarget(event.originalEvent)) {
      this.instance.pendingSecondaryPress = null;
      return;
    }

    if (Date.now() <= this.instance.markerContextMenuSuppressUntil) {
      this.instance.pendingSecondaryPress = null;
      return;
    }

    // Short secondary click should open the context menu. Radius drawing already
    // clears pendingSecondaryPress during mousemove once drag threshold is crossed.
    if (!this.instance.pendingSecondaryPress || this.radiusDrawingService.isDrawActive()) {
      return;
    }

    const { startLatLng, startClientX, startClientY } = this.instance.pendingSecondaryPress;
    this.instance.pendingSecondaryPress = null;
    this.openContextMenuForShortSecondaryClick(startLatLng, startClientX, startClientY);
  }

  handleMapContextMenu(event: MapMouseEvent): void {
    if (this.consumeNativeContextMenuBypass()) {
      return;
    }

    if (this.isMarkerDomTarget(event.originalEvent)) {
      this.instance.pendingSecondaryPress = null;
      return;
    }

    if (Date.now() <= this.instance.markerContextMenuSuppressUntil) {
      this.instance.pendingSecondaryPress = null;
      return;
    }

    event.originalEvent.preventDefault();
    event.originalEvent.stopPropagation();

    // Mouse-up opens the menu for short right-click interactions. Keep this as a
    // fallback for platforms where only contextmenu is emitted.
    if (this.radiusDrawingService.isDrawActive() || !this.instance.pendingSecondaryPress) {
      return;
    }

    const { startLatLng, startClientX, startClientY } = this.instance.pendingSecondaryPress;
    this.instance.pendingSecondaryPress = null;
    this.openContextMenuForShortSecondaryClick(startLatLng, startClientX, startClientY);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private shouldAllowPrimaryDeselection(isPrimaryClick: boolean): boolean {
    if (!isPrimaryClick || this.searchService.searchPlacementActive()) {
      return false;
    }

    const hasMarkerSelection =
      this.state.selectedMarkerKey() !== null ||
      this.state.selectedMarkerKeys().size > 0;
    const hasRadiusSelection = this.radiusDrawingService.hasCommittedSelection();
    const hasWorkspaceSelection = this.workspaceViewService.selectionActive();
    return hasMarkerSelection || hasRadiusSelection || hasWorkspaceSelection;
  }

  private tryClearEmptyDraftOnPrimaryClick(isPrimaryClick: boolean): boolean {
    const activeDraft = this.state.draftMediaMarker();
    if (
      !isPrimaryClick ||
      !activeDraft ||
      activeDraft.uploadCount !== 0 ||
      !!this.state.pendingPlacementKey() ||
      this.searchService.searchPlacementActive()
    ) {
      return false;
    }

    this.uploadShellUiService.closeUploadPanel();
    this.photoMarkerLifecycleService.removeDraftMediaMarker();
    this.ctx?.closeWorkspacePane();
    return true;
  }

  private tryCompletePendingPlacement(latlng: MapLatLng): boolean {
    const pendingPlacementKey = this.state.pendingPlacementKey();
    if (!pendingPlacementKey) {
      return false;
    }

    // Prevent accidental placement immediately after drag/pan movement.
    const lastMapMoveAt = this.instance.lastMapMoveAt;
    if (Date.now() - lastMapMoveAt < PLACEMENT_CLICK_GUARD_MS) {
      return true;
    }

    const coords = { lat: latlng.lat, lng: latlng.lng };
    this.uploadShellUiService.placeFile(pendingPlacementKey, coords);

    this.state.setPendingPlacementKey(null);
    this.state.setPlacementActive(false);
    this.instance.map?.getContainer().classList.remove('map-container--placing');
    return true;
  }

  private clearMapSelectionState(): void {
    this.uploadShellUiService.closeUploadPanel();
    // Deselect the active marker but keep the workspace pane open.
    // The pane is closed only via its own close button.
    this.markerSelectionService.setSelectedMarker(null);
    this.markerSelectionService.setSelectedMarkerKeys(new Set());
    this.patchDetailMediaId(null);
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
    this.radiusDrawingService.clearSelectionVisuals();
  }

  private completeSearchPlacement(latlng: MapLatLng): void {
    this.searchService.renderOrUpdateLocationMarker([latlng.lat, latlng.lng], this.instance.map);
    const pendingUploadLocation = this.state.pendingUploadedLocationMapPick();
    this.state.setPendingUploadedLocationMapPick(null);
    this.searchService.setPlacementActive(false);

    if (!pendingUploadLocation) {
      return;
    }

    void this.mapLocationPickService.applyAndNavigate(pendingUploadLocation, {
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
        this.mapContextMenuOpenService.openRadiusContextMenuAt(latlng, clientX, clientY);
        return;
      }

      this.clearActiveRadiusSelection();
      this.state.closeAllContextMenus();
      this.instance.suppressMapClickUntil = Date.now() + RADIUS_CLICK_GUARD_MS;
      return;
    }

    this.mapContextMenuOpenService.openMapContextMenuAt(latlng, clientX, clientY);
  }

  private patchDetailMediaId(mediaId: string | null): void {
    this.state.setDetailMediaId(mediaId);
    this.workspacePaneObserver.setDetailImageId(mediaId);
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
