import { Injectable, inject } from '@angular/core';
import { MarkerInteractionService } from './marker-interaction.service';
import { MarkerMotionService } from './marker-motion.service';
import { MapMarkerSelectionService } from './map-marker-selection.service';
import { RadiusDrawingOrchestratorService } from '../radius/radius-drawing-orchestrator.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { MapLeafletService } from '../leaflet/map-leaflet.service';
import type { MapLatLng, MapMarker, MapMouseEvent } from '../leaflet/map-leaflet.service';

const MARKER_LONG_PRESS_MS = 500;
const MARKER_MOVE_DURATION_MS = 320;
const MARKER_CONTEXT_MENU_SUPPRESS_MS = 320;

export interface MarkerBindingContext {
  getUploadedPhotoMarkers(): Map<string, { lat: number; lng: number }>;
  handlePhotoMarkerClick(markerKey: string, event?: MapMouseEvent): void;
  consumeNativeContextMenuBypass(): boolean;
  clearPendingSecondaryPress(): void;
  openRadiusContextMenuAt(latlng: MapLatLng, clientX: number, clientY: number): void;
  clearActiveRadiusSelection(): void;
  openMarkerContextMenu(markerKey: string, event?: MouseEvent | PointerEvent): void;
  suppressMarkerContextMenuFor(ms: number): void;
}

@Injectable({ providedIn: 'root' })
export class MapMarkerBindingService {
  private readonly markerInteractionService = inject(MarkerInteractionService);
  private readonly markerMotionService = inject(MarkerMotionService);
  private readonly selectionService = inject(MapMarkerSelectionService);
  private readonly radiusDrawingService = inject(RadiusDrawingOrchestratorService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);
  private readonly mapLeafletService = inject(MapLeafletService);

  private ctx: MarkerBindingContext | null = null;

  bind(ctx: MarkerBindingContext): void {
    this.ctx = ctx;
  }

  attachMarkerInteractions(
    markerKey: string,
    marker: MapMarker,
    options?: { fadeIn?: boolean },
  ): void {
    const shouldFadeIn = options?.fadeIn ?? true;
    this.bindMarkerClickInteraction(markerKey, marker);
    this.bindMarkerContextInteraction(markerKey, marker);
    this.bindMarkerHoverInteraction(markerKey, marker);
    marker.once('add', () => {
      const el = marker.getElement();
      if (el) {
        this.attachLongPressHandler(el, markerKey);
        if (shouldFadeIn) {
          this.triggerMarkerFadeIn(el);
        }
      }
    });
  }

  bindMarkerClickInteraction(markerKey: string, marker: MapMarker): void {
    this.markerInteractionService.bindClick(marker, (event: MapMouseEvent) =>
      this.ctx?.handlePhotoMarkerClick(markerKey, event),
    );
  }

  bindMarkerContextInteraction(markerKey: string, marker: MapMarker): void {
    this.markerInteractionService.bindContextMenu(marker, {
      shouldBypass: () => this.ctx?.consumeNativeContextMenuBypass() ?? false,
      onSecondaryReset: () => {
        this.ctx?.clearPendingSecondaryPress();
      },
      onOpen: (event: MouseEvent) => {
        this.handleMarkerSecondaryOpen(markerKey, event);
      },
    });
  }

  bindMarkerHoverInteraction(markerKey: string, marker: MapMarker): void {
    this.markerInteractionService.bindHover(marker, {
      onEnter: () => {
        this.selectionService.setLinkedHoverMarkerFromMap(markerKey);
        this.selectionService.setLinkedHoveredWorkspaceImageIdsForMarker(markerKey);
      },
      onLeave: () => {
        if (this.selectionService.getLinkedHoverMarkerFromMapKey() !== markerKey) return;
        this.selectionService.setLinkedHoverMarkerFromMap(null);
        this.selectionService.setLinkedHoveredWorkspaceImageIdsForMarker(null);
      },
    });
  }

  async addMarkerCellsToSelection(
    cells: Array<{ lat: number; lng: number }>,
    zoom: number,
  ): Promise<void> {
    const incoming = await this.workspaceViewService.fetchClusterImages(cells, zoom);
    const mergedIds = Array.from(
      new Set([
        ...this.workspaceSelectionService.selectedMediaIds(),
        ...incoming.map((image) => image.id),
      ]),
    );
    this.workspaceSelectionService.selectAllInScope(mergedIds);
  }

  triggerMarkerFadeIn(el: HTMLElement): void {
    if (
      this.markerMotionService.preference() === 'off' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }
    this.markerInteractionService.triggerFadeIn(el, 300);
  }

  animateMarkerPosition(marker: MapMarker, lat: number, lng: number): void {
    this.markerMotionService.animateMarkerPosition(
      marker,
      lat,
      lng,
      this.markerMotionService.preference(),
      MARKER_MOVE_DURATION_MS,
    );
  }

  cancelMarkerMoveAnimation(marker: MapMarker): void {
    this.markerMotionService.cancelMarkerMoveAnimation(marker);
  }

  private handleMarkerSecondaryOpen(markerKey: string, event: MouseEvent | PointerEvent): void {
    if (this.radiusDrawingService.hasCommittedSelection()) {
      const state = this.ctx?.getUploadedPhotoMarkers().get(markerKey);
      if (state) {
        const markerLatLng = this.mapLeafletService.createLatLng(state.lat, state.lng);
        if (this.radiusDrawingService.isInsideAnyCommittedRadius(markerLatLng)) {
          this.ctx?.openRadiusContextMenuAt(markerLatLng, event.clientX, event.clientY);
          return;
        }
        this.ctx?.clearActiveRadiusSelection();
      }
    }

    this.ctx?.suppressMarkerContextMenuFor(MARKER_CONTEXT_MENU_SUPPRESS_MS);
    this.ctx?.openMarkerContextMenu(markerKey, event);
  }

  private attachLongPressHandler(el: HTMLElement, markerKey: string): void {
    this.markerInteractionService.attachLongPress(
      el,
      MARKER_LONG_PRESS_MS,
      (event: PointerEvent) => {
        el.classList.add('map-photo-marker--long-pressed');
        this.handleMarkerSecondaryOpen(markerKey, event);
      },
    );

    el.addEventListener('click', () => {
      el.classList.remove('map-photo-marker--long-pressed');
    });
  }
}
