import { Injectable, inject } from '@angular/core';
import { ViewportMarkerQueryService } from './viewport-marker-query.service';
import {
  MapMarkerReconcileFacade,
  type PhotoMarkerState,
  type ReconcileDependencies,
  type ReconcileIncomingRow,
} from './map-marker-reconcile.facade';
import { MapMarkerClusterMergeService, type ClusterMergedRow } from './map-marker-cluster-merge.service';
import { MapMarkerReuseStrategyService } from './map-marker-reuse-strategy.service';
import { MapPhotoMarkerRenderService } from './map-photo-marker-render.service';
import { MapThumbnailLoaderService } from './map-thumbnail-loader.service';
import { MapZoomHighlightOrchestratorService } from './map-zoom-highlight-orchestrator.service';
import { MapMarkerSelectionService } from './map-marker-selection.service';
import { MapMarkerBindingService } from './map-marker-binding.service';
import { WorkspaceViewService } from '../../../../core/workspace-view/workspace-view.service';
import { MapLeafletService } from '../leaflet/map-leaflet.service';
import { MapSessionCacheService } from '../../../../core/map-session-cache/map-session-cache.service';
import { MapShellState } from '../component/map-shell.state';
import type { MarkerRenderSnapshot } from './map-photo-marker-render.service';
import type { MapInstance, MapLatLngBounds, MapLayerGroup } from '../leaflet/map-leaflet.service';
import type { MapSessionSnapshot, MapViewportMarkerRow } from '../../../../core/map-session-cache/map-session-cache.types';
import { PHOTO_MARKER_ICON_SIZE } from '../../../../core/map/marker-factory';
import { toMarkerKey } from './marker-media-index.helpers';

type MergedViewportRow = ClusterMergedRow<MapViewportMarkerRow>;

export interface ViewportCoordinatorContext {
  getMap(): MapInstance | undefined;
  getUploadedPhotoMarkers(): Map<string, PhotoMarkerState & { lastRendered?: MarkerRenderSnapshot }>;
  getPhotoMarkerLayer(): MapLayerGroup | null;
  getMarkersByMediaId(): Map<string, string[]>;
}

@Injectable({ providedIn: 'root' })
export class MapViewportCoordinatorService {
  private readonly viewportMarkerQueryService = inject(ViewportMarkerQueryService);
  private readonly mapMarkerReconcileFacade = inject(MapMarkerReconcileFacade);
  private readonly mapMarkerClusterMergeService = inject(MapMarkerClusterMergeService);
  private readonly mapMarkerReuseStrategyService = inject(MapMarkerReuseStrategyService);
  private readonly markerRenderService = inject(MapPhotoMarkerRenderService);
  private readonly thumbnailLoaderService = inject(MapThumbnailLoaderService);
  private readonly zoomHighlightOrchestrator = inject(MapZoomHighlightOrchestratorService);
  private readonly markerSelectionService = inject(MapMarkerSelectionService);
  private readonly markerBindingService = inject(MapMarkerBindingService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  private readonly mapLeafletService = inject(MapLeafletService);
  private readonly mapSessionCache = inject(MapSessionCacheService);
  private readonly state = inject(MapShellState);

  private ctx: ViewportCoordinatorContext | null = null;

  private viewportQueryController: AbortController | null = null;
  private lastFetchedBounds: MapLatLngBounds | null = null;
  private lastFetchedZoom: number | null = null;
  private lastViewportRpcRows: MapViewportMarkerRow[] | null = null;
  private isRestoringFromSessionCache = false;

  bind(ctx: ViewportCoordinatorContext): void {
    this.ctx = ctx;
  }

  cancelPendingQuery(): void {
    this.viewportQueryController?.abort();
    this.viewportQueryController = null;
  }

  isViewportStillInFetchedBuffer(zoomChanged: boolean): boolean {
    const map = this.ctx?.getMap();
    if (zoomChanged || !this.lastFetchedBounds || !map) {
      return false;
    }
    const mapZoom = Math.round(map.getZoom() ?? 0);
    return this.lastFetchedZoom === mapZoom && this.lastFetchedBounds.contains(map.getBounds());
  }

  async queryViewportMarkers(): Promise<void> {
    const map = this.ctx?.getMap();
    if (!map) return;

    this.viewportQueryController?.abort();
    const controller = new AbortController();
    this.viewportQueryController = controller;

    const result = await this.viewportMarkerQueryService.fetchViewportMarkers<MapViewportMarkerRow>(
      map,
      controller.signal,
    );

    if (result.aborted) return;
    this.viewportQueryController = null;

    this.lastFetchedBounds = this.mapLeafletService.createBounds(
      [result.fetchSouth, result.fetchWest],
      [result.fetchNorth, result.fetchEast],
    );
    this.lastFetchedZoom = result.roundedZoom;

    if (result.error || !result.data) {
      this.zoomHighlightOrchestrator.flushPendingZoomHighlight();
      return;
    }

    this.lastViewportRpcRows = result.data;
    this.reconcileViewportMarkerRows(result.data);

    for (const state of this.ctx!.getUploadedPhotoMarkers().values()) {
      state.optimistic = false;
    }

    this.zoomHighlightOrchestrator.flushPendingZoomHighlight();
  }

  reapplyViewportMarkerFilter(): void {
    const map = this.ctx?.getMap();
    if (!map || !this.lastViewportRpcRows) {
      return;
    }
    this.reconcileViewportMarkerRows(this.lastViewportRpcRows);
  }

  tryRestoreViewportFromSessionCache(): boolean {
    if ((this.ctx?.getUploadedPhotoMarkers().size ?? 0) > 0) {
      return true;
    }

    const snapshot = this.mapSessionCache.read();
    if (!snapshot || !this.ctx?.getMap()) {
      return false;
    }

    this.isRestoringFromSessionCache = true;
    try {
      return this.restoreViewportFromSessionSnapshot(snapshot);
    } finally {
      this.isRestoringFromSessionCache = false;
    }
  }

  persistMapSessionCache(): void {
    const map = this.ctx?.getMap();
    if (!map || !this.lastFetchedBounds || this.lastFetchedZoom === null || !this.lastViewportRpcRows) {
      return;
    }

    const center = map.getCenter();
    this.mapSessionCache.write({
      centerLat: center.lat,
      centerLng: center.lng,
      zoom: map.getZoom() ?? this.lastFetchedZoom,
      fetchSouth: this.lastFetchedBounds.getSouth(),
      fetchWest: this.lastFetchedBounds.getWest(),
      fetchNorth: this.lastFetchedBounds.getNorth(),
      fetchEast: this.lastFetchedBounds.getEast(),
      roundedZoom: this.lastFetchedZoom,
      viewportRows: this.lastViewportRpcRows,
      cachedAt: Date.now(),
    });
  }

  private reconcileViewportMarkerRows(rows: MapViewportMarkerRow[]): void {
    const incoming = this.buildIncomingViewportMarkers(rows);
    const recyclableKeys = this.collectRecyclableMarkerKeys(incoming);
    const deps = this.getReconcileDependencies();
    this.mapMarkerReconcileFacade.reconcileIncomingViewportMarkers(
      incoming as Map<string, ReconcileIncomingRow>,
      recyclableKeys,
      deps,
    );
    this.mapMarkerReconcileFacade.removeRecyclableMarkers(recyclableKeys, deps);

    this.pruneStaleSelectedMarkerKeys();
    this.thumbnailLoaderService.maybeLoadThumbnails();
    this.markerSelectionService.refreshActiveWorkspaceHoverLink();
    this.markerSelectionService.pruneStaleLinkedHoverFromMap();
  }

  private buildIncomingViewportMarkers(rows: MapViewportMarkerRow[]): Map<string, MergedViewportRow> {
    const map = this.ctx?.getMap();
    const merged = this.mapMarkerClusterMergeService.mergeOverlappingClusters(
      map,
      rows,
      PHOTO_MARKER_ICON_SIZE[0],
    );

    const incoming = new Map<string, MergedViewportRow>();
    const allowedIds = this.workspaceViewService.filteredImageIds();
    const hasFilters = this.workspaceViewService.hasMapFilters();

    for (const row of merged) {
      if (typeof row.cluster_lat !== 'number' || typeof row.cluster_lng !== 'number') continue;

      if (hasFilters) {
        if (row.image_count === 1) {
          const mediaId = row.media_item_id ?? row.image_id;
          if (!mediaId || !allowedIds.has(mediaId)) {
            continue;
          }
        } else {
          continue;
        }
      }

      const key =
        row.image_count === 1 && row.location_id
          ? `loc:${row.location_id}`
          : toMarkerKey(row.cluster_lat, row.cluster_lng);
      incoming.set(key, row);
    }

    return incoming;
  }

  private collectRecyclableMarkerKeys(incoming: Map<string, MergedViewportRow>): Set<string> {
    const recyclableKeys = new Set<string>();
    for (const [key, state] of this.ctx!.getUploadedPhotoMarkers()) {
      if (state.optimistic) continue;
      if (!incoming.has(key)) {
        recyclableKeys.add(key);
      }
    }
    return recyclableKeys;
  }

  private getReconcileDependencies(): ReconcileDependencies {
    const map = this.ctx?.getMap();
    return {
      photoMarkerLayer: this.ctx!.getPhotoMarkerLayer()!,
      uploadedPhotoMarkers: this.ctx!.getUploadedPhotoMarkers(),
      markersByMediaId: this.ctx!.getMarkersByMediaId(),
      selectedMarkerKey: () => this.state.selectedMarkerKey(),
      setSelectedMarkerKey: (markerKey) => this.state.setSelectedMarkerKey(markerKey),
      findReusableMarkerKey: (row, keys) =>
        this.mapMarkerReuseStrategyService.findReusableMarkerKey(
          map,
          this.ctx!.getMarkersByMediaId(),
          this.ctx!.getUploadedPhotoMarkers(),
          row,
          keys,
        ),
      findSpawnOriginForIncomingRow: (row, keys) =>
        this.mapMarkerReuseStrategyService.findSpawnOriginForIncomingRow(
          map,
          this.ctx!.getUploadedPhotoMarkers(),
          row,
          keys,
        ),
      buildFallbackLabelFromPath: (path) => this.markerRenderService.buildFallbackLabelFromPath(path),
      buildPhotoMarkerIcon: (markerKey, override) =>
        this.markerRenderService.buildPhotoMarkerIcon(markerKey, override),
      attachMarkerInteractions: (markerKey, marker, fadeIn) =>
        this.markerBindingService.attachMarkerInteractions(markerKey, marker, { fadeIn }),
      bindMarkerClickInteraction: (markerKey, marker) =>
        this.markerBindingService.bindMarkerClickInteraction(markerKey, marker),
      bindMarkerContextInteraction: (markerKey, marker) =>
        this.markerBindingService.bindMarkerContextInteraction(markerKey, marker),
      bindMarkerHoverInteraction: (markerKey, marker) =>
        this.markerBindingService.bindMarkerHoverInteraction(markerKey, marker),
      animateMarkerPosition: (marker, lat, lng) =>
        this.markerBindingService.animateMarkerPosition(marker, lat, lng),
      refreshPhotoMarker: (markerKey) => this.markerRenderService.refreshPhotoMarker(markerKey),
      cancelMarkerMoveAnimation: (marker) =>
        this.markerBindingService.cancelMarkerMoveAnimation(marker),
      suppressMarkerFadeIn: this.isRestoringFromSessionCache,
    };
  }

  private pruneStaleSelectedMarkerKeys(): void {
    const staleSelectedKeys = new Set(this.state.selectedMarkerKeys());
    let selectedKeysChanged = false;
    for (const markerKey of staleSelectedKeys) {
      if (this.ctx!.getUploadedPhotoMarkers().has(markerKey)) {
        continue;
      }
      staleSelectedKeys.delete(markerKey);
      selectedKeysChanged = true;
    }
    if (selectedKeysChanged) {
      this.state.setSelectedMarkerKeys(staleSelectedKeys);
    }
  }

  private restoreViewportFromSessionSnapshot(snapshot: MapSessionSnapshot): boolean {
    const map = this.ctx?.getMap();
    if (!map) return false;

    map.setView([snapshot.centerLat, snapshot.centerLng], snapshot.zoom, { animate: false });
    this.lastFetchedBounds = this.mapLeafletService.createBounds(
      [snapshot.fetchSouth, snapshot.fetchWest],
      [snapshot.fetchNorth, snapshot.fetchEast],
    );
    this.lastFetchedZoom = snapshot.roundedZoom;
    this.lastViewportRpcRows = [...snapshot.viewportRows];

    const rows = snapshot.viewportRows as MapViewportMarkerRow[];
    const incoming = this.buildIncomingViewportMarkers(rows);
    const recyclableKeys = this.collectRecyclableMarkerKeys(incoming);
    const deps = this.getReconcileDependencies();
    this.mapMarkerReconcileFacade.reconcileIncomingViewportMarkers(
      incoming as Map<string, ReconcileIncomingRow>,
      recyclableKeys,
      deps,
    );
    this.mapMarkerReconcileFacade.removeRecyclableMarkers(recyclableKeys, deps);

    this.pruneStaleSelectedMarkerKeys();

    for (const state of this.ctx!.getUploadedPhotoMarkers().values()) {
      state.optimistic = false;
    }

    this.thumbnailLoaderService.maybeLoadThumbnails();
    this.zoomHighlightOrchestrator.flushPendingZoomHighlight();
    this.markerSelectionService.refreshActiveWorkspaceHoverLink();

    return true;
  }
}
