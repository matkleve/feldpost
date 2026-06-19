import { Injectable, inject } from '@angular/core';
import { MarkerInteractionService } from './marker-interaction.service';
import { MarkerMotionService } from './marker-motion.service';
import { MapMarkerSelectionService } from './map-marker-selection.service';
import { RadiusDrawingOrchestratorService } from '../radius/radius-drawing-orchestrator.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from '../../../../core/workspace-selection/workspace-selection.service';
import { MapLeafletService } from '../leaflet/map-leaflet.service';
import type { MapLatLng, MapMarker, MapMouseEvent } from '../leaflet/map-leaflet.service';
import { MapShellInstanceService } from '../component/map-shell-instance.service';
import { MapContextMenuOpenService } from '../context-menu/map-context-menu-open.service';
import { MapShellState } from '../component/map-shell.state';
import { WorkspacePaneObserverAdapter } from '../../../../core/workspace-pane/workspace-pane-observer.adapter';

const MARKER_LONG_PRESS_MS = 500;
const MARKER_MOVE_DURATION_MS = 320;
const MARKER_CONTEXT_MENU_SUPPRESS_MS = 320;

export interface MarkerBindingContext {
  handlePhotoMarkerClick(markerKey: string, event?: MapMouseEvent): void;
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
  private readonly instance = inject(MapShellInstanceService);
  private readonly mapContextMenuOpenService = inject(MapContextMenuOpenService);
  private readonly state = inject(MapShellState);
  private readonly workspacePaneObserver = inject(WorkspacePaneObserverAdapter);

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
      shouldBypass: () => this.consumeNativeContextMenuBypass(),
      onSecondaryReset: () => {
        this.instance.pendingSecondaryPress = null;
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

  private consumeNativeContextMenuBypass(): boolean {
    const bypassUntil = this.instance.nativeContextMenuBypassUntil;
    this.instance.nativeContextMenuBypassUntil = 0;
    return Date.now() <= bypassUntil;
  }

  private clearActiveRadiusSelection(): void {
    this.radiusDrawingService.clearSelectionVisuals();
    this.selectionService.setSelectedMarker(null);
    this.selectionService.setSelectedMarkerKeys(new Set());
    this.state.setDetailMediaId(null);
    this.workspacePaneObserver.setDetailImageId(null);
    this.workspaceViewService.clearActiveSelection();
    this.workspaceSelectionService.clearSelection();
  }

  private handleMarkerSecondaryOpen(markerKey: string, event: MouseEvent | PointerEvent): void {
    if (this.radiusDrawingService.hasCommittedSelection()) {
      const markerState = this.instance.uploadedPhotoMarkers.get(markerKey);
      if (markerState) {
        const markerLatLng = this.mapLeafletService.createLatLng(markerState.lat, markerState.lng);
        if (this.radiusDrawingService.isInsideAnyCommittedRadius(markerLatLng)) {
          this.mapContextMenuOpenService.openRadiusContextMenuAt(markerLatLng, event.clientX, event.clientY);
          return;
        }
        this.clearActiveRadiusSelection();
      }
    }

    this.instance.markerContextMenuSuppressUntil = Date.now() + MARKER_CONTEXT_MENU_SUPPRESS_MS;
    this.mapContextMenuOpenService.openMarkerContextMenu(markerKey, event);
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
