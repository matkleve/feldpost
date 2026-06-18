import { Injectable, inject } from '@angular/core';
import { UploadShellUiService } from '../../../upload/upload-shell/upload-shell-ui.service';
import { MapShellSearchService } from '../leaflet/map-shell-search.service';
import { MapLocationPickService } from './map-location-pick.service';
import { PhotoMarkerLifecycleService } from '../markers/photo-marker-lifecycle.service';
import { MapViewportCoordinatorService } from '../markers/map-viewport-coordinator.service';
import { MapShellGpsService } from '../leaflet/map-shell-gps.service';
import { MapShellBasemapService } from '../leaflet/map-shell-basemap.service';
import { MapViewFlyService } from './map-view-fly.service';
import { I18nService } from '../../../../core/i18n/i18n.service';
import type { ToggleValue } from '@spartan-ng/brain/toggle-group';
import type { MapInstance } from '../leaflet/map-leaflet.service';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from '../../../../core/workspace-pane/workspace-pane-shell-events.types';

export interface PlacementContext {
  getMap(): MapInstance | undefined;
  setPlacementActive(v: boolean): void;
  getPlacementActive(): boolean;
  getDraftMediaMarker(): { lat: number; lng: number; uploadCount: number } | null;
  getPendingPlacementKey(): string | null;
  setPendingPlacementKey(key: string | null): void;
  getPendingUploadedLocationMapPick(): UploadLocationMapPickRequest | null;
  setPendingUploadedLocationMapPick(v: UploadLocationMapPickRequest | null): void;
}

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
  private readonly i18nService = inject(I18nService);

  private ctx: PlacementContext | null = null;

  bind(ctx: PlacementContext): void {
    this.ctx = ctx;
  }

  onImageUploaded(event: ImageUploadedEvent): void {
    if (!this.ctx?.getMap()) return;
    this.photoMarkerLifecycleService.upsertUploadedPhotoMarker(event);
    this.photoMarkerLifecycleService.resolveDraftMediaMarkerUpload(event);
    void this.mapViewportCoordinatorService.queryViewportMarkers();
  }

  enterPlacementMode(key: string): void {
    const draft = this.ctx?.getDraftMediaMarker();
    if (draft) {
      this.uploadShellUi.placeFile(key, { lat: draft.lat, lng: draft.lng });
      return;
    }
    this.ctx?.setPendingPlacementKey(key);
    this.ctx?.setPlacementActive(true);
    this.ctx?.getMap()?.getContainer().classList.add('map-container--placing');
  }

  cancelPlacement(): void {
    const pendingUploadedPick = this.ctx?.getPendingUploadedLocationMapPick() ?? null;
    this.ctx?.setPendingPlacementKey(null);
    this.ctx?.setPendingUploadedLocationMapPick(null);
    this.ctx?.setPlacementActive(false);
    this.searchService.setPlacementActive(false);
    this.ctx?.getMap()?.getContainer().classList.remove('map-container--placing');
    this.uploadShellUi.clearPendingLocationMapPick(pendingUploadedPick?.mediaId);
    this.mapLocationPickService.navigateBackAfterLocationMapPick();
  }

  goToUserPosition(): void {
    const map = this.ctx?.getMap();
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
    this.basemapService.onViewModeChange(raw, this.ctx?.getMap());
  }

  onSearchMapCenterRequested(event: { lat: number; lng: number; label: string }): void {
    if (!this.ctx?.getMap()) {
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
    this.searchService.renderPreviewMarkers(points, this.ctx?.getMap());
  }

  onUploadLocationPreviewCleared(): void {
    if (this.searchService.searchPlacementActive()) return;
    this.searchService.clearPreviewMarkers();
  }

  onUploadLocationMapPickRequested(event: UploadLocationMapPickRequest): void {
    this.ctx?.setPendingPlacementKey(null);
    this.ctx?.setPendingUploadedLocationMapPick(event);
    this.ctx?.setPlacementActive(false);
    this.searchService.setPlacementActive(true);
    this.ctx?.getMap()?.getContainer().classList.add('map-container--placing');
  }

  placementBannerText(): string {
    if (this.ctx?.getPlacementActive()) {
      return this.i18nService.t('upload.placement.banner.placeImage', 'Click the map to place the image');
    }
    return this.i18nService.t('upload.placement.banner.setNewLocation', 'Click the map to set the new location');
  }
}
