import { Injectable, inject } from '@angular/core';
import { UploadShellUiService } from '../../../upload/upload-shell/upload-shell-ui.service';
import { MapShellSearchService } from '../leaflet/map-shell-search.service';
import { MapLocationPickService } from './map-location-pick.service';
import { PhotoMarkerLifecycleService } from '../markers/photo-marker-lifecycle.service';
import { MapViewportCoordinatorService } from '../markers/map-viewport-coordinator.service';
import { MapShellGpsService } from '../leaflet/map-shell-gps.service';
import { MapShellBasemapService } from '../leaflet/map-shell-basemap.service';
import { MapViewFlyService } from './map-view-fly.service';
import { MapShellState } from '../component/map-shell.state';
import { MapShellInstanceService } from '../component/map-shell-instance.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import type { ToggleValue } from '@spartan-ng/brain/toggle-group';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from '../../../../core/workspace-pane/workspace-pane-shell-events.types';

@Injectable({ providedIn: 'root' })
export class MapPlacementService {
  private readonly uploadShellUi = inject(UploadShellUiService);
  private readonly searchService = inject(MapShellSearchService);
  private readonly mapLocationPickService = inject(MapLocationPickService);
  private readonly photoMarkerLifecycleService = inject(PhotoMarkerLifecycleService);
  private readonly mapViewportCoordinatorService = inject(MapViewportCoordinatorService);
  private readonly gpsService = inject(MapShellGpsService);
  private readonly basemapService = inject(MapShellBasemapService);
  private readonly mapViewFlyService = inject(MapViewFlyService);
  private readonly state = inject(MapShellState);
  private readonly instance = inject(MapShellInstanceService);
  private readonly i18nService = inject(I18nService);

  onImageUploaded(event: ImageUploadedEvent): void {
    if (!this.instance.map) return;
    this.photoMarkerLifecycleService.upsertUploadedPhotoMarker(event);
    this.photoMarkerLifecycleService.resolveDraftMediaMarkerUpload(event);
    void this.mapViewportCoordinatorService.queryViewportMarkers();
  }

  enterPlacementMode(key: string): void {
    const draft = this.state.draftMediaMarker();
    if (draft) {
      this.uploadShellUi.placeFile(key, { lat: draft.lat, lng: draft.lng });
      return;
    }
    this.state.setPendingPlacementKey(key);
    this.state.setPlacementActive(true);
    this.instance.map?.getContainer().classList.add('map-container--placing');
  }

  cancelPlacement(): void {
    const pendingUploadedPick = this.state.pendingUploadedLocationMapPick();
    this.state.setPendingPlacementKey(null);
    this.state.setPendingUploadedLocationMapPick(null);
    this.state.setPlacementActive(false);
    this.searchService.setPlacementActive(false);
    this.instance.map?.getContainer().classList.remove('map-container--placing');
    this.uploadShellUi.clearPendingLocationMapPick(pendingUploadedPick?.mediaId);
    this.mapLocationPickService.navigateBackAfterLocationMapPick();
  }

  goToUserPosition(): void {
    const map = this.instance.map;
    this.gpsService.goTo(
      map,
      (coords) => {
        this.gpsService.renderOrUpdateLocationMarker(coords, map);
        this.gpsService.triggerLocationFoundState();
        void this.searchService.refreshCountryCode(coords[0], coords[1]);
      },
      () => this.gpsService.removeLocationMarker(),
    );
  }

  onMapViewModeChange(raw: ToggleValue<string>): void {
    this.basemapService.onViewModeChange(raw, this.instance.map);
  }

  onSearchMapCenterRequested(event: { lat: number; lng: number; label: string }): void {
    if (!this.instance.map) {
      this.searchService.pendingSearchMapCenter = event;
      return;
    }
    this.mapViewFlyService.applySearchMapCenter(event);
  }

  onSearchClearRequested(): void {
    this.searchService.clearLocationMarker();
  }

  onUploadLocationPreviewRequested(event: UploadLocationPreviewEvent): void {
    const points =
      event.points?.length && event.points.length > 0
        ? event.points
        : [{ lat: event.lat, lng: event.lng }];
    this.searchService.renderPreviewMarkers(points, this.instance.map);
  }

  onUploadLocationPreviewCleared(): void {
    if (this.searchService.searchPlacementActive()) return;
    this.searchService.clearPreviewMarkers();
  }

  onUploadLocationMapPickRequested(event: UploadLocationMapPickRequest): void {
    this.state.setPendingPlacementKey(null);
    this.state.setPendingUploadedLocationMapPick(event);
    this.state.setPlacementActive(false);
    this.searchService.setPlacementActive(true);
    this.instance.map?.getContainer().classList.add('map-container--placing');
  }

  placementBannerText(): string {
    if (this.state.placementActive()) {
      return this.i18nService.t('upload.placement.banner.placeImage', 'Click the map to place the image');
    }
    return this.i18nService.t('upload.placement.banner.setNewLocation', 'Click the map to set the new location');
  }
}
