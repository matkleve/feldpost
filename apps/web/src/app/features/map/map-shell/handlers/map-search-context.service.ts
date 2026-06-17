import { Injectable, computed, inject } from '@angular/core';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { MapShellGpsService } from '../leaflet/map-shell-gps.service';
import { MapShellSearchService } from '../leaflet/map-shell-search.service';
import { MapShellState } from '../component/map-shell.state';
import { searchQueryContextsEqual } from '../../../../core/search/search-bar-helpers';
import type { SearchQueryContext } from '../../../../core/search/search.models';
import type { PhotoMarkerState } from '../markers/map-marker-reconcile.facade';
import type { MarkerRenderSnapshot } from '../markers/map-photo-marker-render.service';

export interface SearchContextBindTarget {
  getUploadedPhotoMarkers(): Map<string, PhotoMarkerState & { lastRendered?: MarkerRenderSnapshot }>;
}

@Injectable({ providedIn: 'root' })
export class MapSearchContextService {
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly gpsService = inject(MapShellGpsService);
  private readonly searchService = inject(MapShellSearchService);
  private readonly state = inject(MapShellState);

  private ctx: SearchContextBindTarget | null = null;

  bind(ctx: SearchContextBindTarget): void {
    this.ctx = ctx;
  }

  private readonly searchDataCentroid = computed<{ lat: number; lng: number } | undefined>(() => {
    const all = this.workspaceViewService.rawImages();
    const selectedProjectIds = this.workspaceViewService.selectedProjectIds();
    const scoped =
      selectedProjectIds.size > 0
        ? all.filter((img) => img.projectId && selectedProjectIds.has(img.projectId))
        : all;

    const points = scoped
      .filter(
        (img) =>
          typeof img.latitude === 'number' &&
          typeof img.longitude === 'number' &&
          Number.isFinite(img.latitude) &&
          Number.isFinite(img.longitude),
      )
      .map((img) => ({ lat: img.latitude, lng: img.longitude }));

    if (points.length === 0) {
      const pos = this.gpsService.userPosition();
      if (!pos) return undefined;
      return { lat: pos[0], lng: pos[1] };
    }

    const totals = points.reduce(
      (acc, point) => {
        acc.lat += point.lat;
        acc.lng += point.lng;
        return acc;
      },
      { lat: 0, lng: 0 },
    );

    return {
      lat: totals.lat / points.length,
      lng: totals.lng / points.length,
    };
  });

  private readonly searchActiveMarkerCentroid = computed<{ lat: number; lng: number } | undefined>(
    () => {
      const selectedMarkerKey = this.state.selectedMarkerKey();
      if (!selectedMarkerKey) return undefined;
      const markerState = this.ctx?.getUploadedPhotoMarkers().get(selectedMarkerKey);
      if (!markerState) return undefined;
      return { lat: markerState.lat, lng: markerState.lng };
    },
  );

  readonly searchQueryContext = computed<SearchQueryContext>(
    () => {
      const selectedProjectIds = this.workspaceViewService.selectedProjectIds();
      const activeProjectId =
        selectedProjectIds.size > 0 ? Array.from(selectedProjectIds.values())[0] : undefined;
      const userPos = this.gpsService.userPosition();

      return {
        activeProjectId,
        activeMarkerCentroid: this.searchActiveMarkerCentroid(),
        activeProjectCentroid: this.searchDataCentroid(),
        currentLocation: userPos
          ? { lat: userPos[0], lng: userPos[1] }
          : undefined,
        viewportBounds: this.searchService.searchViewportBounds(),
        dataCentroid: this.searchDataCentroid(),
        countryCodes: this.searchService.searchCountryCodes(),
      };
    },
    { equal: searchQueryContextsEqual },
  );
}
