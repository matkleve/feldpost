import { Injectable, inject } from '@angular/core';
import { MapViewFlyService } from './map-view-fly.service';
import { MapPlacementService } from './map-placement.service';
import { MapMarkerSelectionService } from '../markers/map-marker-selection.service';
import { PhotoMarkerLifecycleService } from '../markers/photo-marker-lifecycle.service';
import { RadiusDrawingOrchestratorService } from '../radius/radius-drawing-orchestrator.service';
import { MapShellState } from '../component/map-shell.state';
import { MapShellInstanceService } from '../component/map-shell-instance.service';
import { WorkspacePaneLayoutMapEffectsService } from '../../../../core/workspace-pane/workspace-pane-layout-map-effects.service';
import type { WorkspacePaneLayoutMapEffects } from '../../../../core/workspace-pane/workspace-pane-layout-map-effects.service';

@Injectable({ providedIn: 'root' })
export class MapWorkspacePaneEffectsService {
  private readonly mapViewFlyService = inject(MapViewFlyService);
  private readonly mapPlacementService = inject(MapPlacementService);
  private readonly markerSelectionService = inject(MapMarkerSelectionService);
  private readonly photoMarkerLifecycleService = inject(PhotoMarkerLifecycleService);
  private readonly radiusDrawingService = inject(RadiusDrawingOrchestratorService);
  private readonly state = inject(MapShellState);
  private readonly instance = inject(MapShellInstanceService);
  private readonly layoutMapEffectsService = inject(WorkspacePaneLayoutMapEffectsService);

  private registration: WorkspacePaneLayoutMapEffects | null = null;

  register(): void {
    this.registration = {
      onZoomToLocation: (event) => this.mapViewFlyService.onZoomToLocation(event),
      onImageUploaded: (event) => this.mapPlacementService.onImageUploaded(event),
      enterPlacementMode: (key) => this.mapPlacementService.enterPlacementMode(key),
      onUploadLocationPreviewRequested: (event) => this.mapPlacementService.onUploadLocationPreviewRequested(event),
      onUploadLocationPreviewCleared: () => this.mapPlacementService.onUploadLocationPreviewCleared(),
      onUploadLocationMapPickRequested: (event) => this.mapPlacementService.onUploadLocationMapPickRequested(event),
      onWorkspaceItemHoverStarted: (event) => this.markerSelectionService.onWorkspaceHoverStarted(event),
      onWorkspaceItemHoverEnded: (mediaId) => this.markerSelectionService.onWorkspaceHoverEnded(mediaId),
      onWorkspacePaneClosing: () => this.onWorkspacePaneClosing(),
      invalidateMapSize: () => this.instance.map?.invalidateSize(),
    };
    this.layoutMapEffectsService.registerMapEffects(this.registration);
  }

  unregister(): void {
    if (this.registration) {
      this.layoutMapEffectsService.unregisterMapEffects(this.registration);
      this.registration = null;
    }
  }

  private onWorkspacePaneClosing(): void {
    if ((this.state.draftMediaMarker()?.uploadCount ?? 0) === 0) {
      this.photoMarkerLifecycleService.removeDraftMediaMarker();
    }
    this.markerSelectionService.setSelectedMarker(null);
    this.markerSelectionService.setSelectedMarkerKeys(new Set());
    this.radiusDrawingService.clearSelectionVisuals();
  }
}
