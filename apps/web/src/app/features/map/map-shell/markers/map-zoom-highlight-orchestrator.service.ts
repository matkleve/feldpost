import { Injectable, inject } from '@angular/core';
import { DetailZoomHighlightService } from './detail-zoom-highlight.service';
import { ZoomTargetMarkerService } from './zoom-target-marker.service';
import { MapShellInstanceService } from '../component/map-shell-instance.service';
import { toMarkerKey } from './marker-media-index.helpers';

const DETAIL_LOCATION_FOCUS_ZOOM = 21;
const DETAIL_LOCATION_MARKER_PULSE_MS = 1500;
const DETAIL_LOCATION_HIGHLIGHT_RETRY_MS = 120;
const DETAIL_LOCATION_HIGHLIGHT_MAX_RETRIES = 50;
const DETAIL_LOCATION_RENDER_SETTLE_MS = 180;
const DETAIL_LOCATION_CLUSTER_FALLBACK_MAX_METERS = 260;
const DETAIL_LOCATION_WAIT_FOR_SINGLE_MS = 2800;
const DETAIL_LOCATION_IDLE_FALLBACK_MS = 1400;
const DETAIL_LOCATION_PENDING_TTL_MS = 12000;

export { DETAIL_LOCATION_FOCUS_ZOOM };

@Injectable({ providedIn: 'root' })
export class MapZoomHighlightOrchestratorService {
  private readonly detailZoomHighlightService = inject(DetailZoomHighlightService);
  private readonly zoomTargetMarkerService = inject(ZoomTargetMarkerService);
  private readonly instance = inject(MapShellInstanceService);

  private pendingZoomHighlight: {
    mediaId: string;
    lat: number;
    lng: number;
    requestedAt: number;
  } | null = null;

  setPending(mediaId: string, lat: number, lng: number): void {
    this.pendingZoomHighlight = { mediaId, lat, lng, requestedAt: Date.now() };
  }

  flushPendingZoomHighlight(): void {
    const pending = this.pendingZoomHighlight;
    if (!pending) return;

    if (Date.now() - pending.requestedAt > DETAIL_LOCATION_PENDING_TTL_MS) {
      this.pendingZoomHighlight = null;
      return;
    }

    this.highlightZoomTargetMarker(pending.mediaId, pending.lat, pending.lng);
  }

  waitForMapIdleThenFlushZoomHighlight(): void {
    const map = this.instance.map;
    if (!map) return;

    this.detailZoomHighlightService.waitForIdleOrTimeout(
      map,
      DETAIL_LOCATION_IDLE_FALLBACK_MS,
      () => this.flushPendingZoomHighlight(),
    );
  }

  private highlightZoomTargetMarker(mediaId: string, lat: number, lng: number, attempt = 0): void {
    const pendingForImage = this.detailZoomHighlightService.getPendingForImage(
      this.pendingZoomHighlight,
      mediaId,
    );
    const allowClusterFallback = this.detailZoomHighlightService.shouldAllowClusterFallback(
      pendingForImage,
      DETAIL_LOCATION_WAIT_FOR_SINGLE_MS,
    );

    const markerKey = this.resolveZoomTargetMarkerKey(mediaId, lat, lng, allowClusterFallback);
    if (!markerKey) {
      this.scheduleZoomHighlightRetry(mediaId, lat, lng, attempt);
      return;
    }

    if (
      this.detailZoomHighlightService.shouldWaitForMapIdle(
        pendingForImage,
        this.instance.lastMapIdleAt,
        DETAIL_LOCATION_IDLE_FALLBACK_MS,
      )
    ) {
      this.scheduleZoomHighlightRetry(mediaId, lat, lng, attempt);
      return;
    }

    const markerWrapper = this.resolveZoomHighlightMarkerWrapper(markerKey);
    if (!markerWrapper || !this.isZoomHighlightRenderReady(markerWrapper)) {
      this.scheduleZoomHighlightRetry(mediaId, lat, lng, attempt);
      return;
    }

    this.detailZoomHighlightService.startSpotlight(markerWrapper, DETAIL_LOCATION_MARKER_PULSE_MS);
    if (this.pendingZoomHighlight?.mediaId === mediaId) {
      this.pendingZoomHighlight = null;
    }
  }

  private scheduleZoomHighlightRetry(
    mediaId: string,
    lat: number,
    lng: number,
    attempt: number,
  ): void {
    this.detailZoomHighlightService.scheduleRetry(
      attempt,
      DETAIL_LOCATION_HIGHLIGHT_MAX_RETRIES,
      DETAIL_LOCATION_HIGHLIGHT_RETRY_MS,
      () => this.highlightZoomTargetMarker(mediaId, lat, lng, attempt + 1),
    );
  }

  private resolveZoomHighlightMarkerWrapper(markerKey: string): HTMLElement | null {
    const markerElement = this.instance.uploadedPhotoMarkers
      .get(markerKey)
      ?.marker.getElement() as HTMLElement | null;
    return this.detailZoomHighlightService.resolveMarkerWrapper(markerElement);
  }

  private isZoomHighlightRenderReady(markerElement: HTMLElement): boolean {
    return this.detailZoomHighlightService.isRenderReady(
      markerElement,
      this.instance.lastMapMoveAt,
      DETAIL_LOCATION_RENDER_SETTLE_MS,
    );
  }

  resolveZoomTargetMarkerKey(
    mediaId: string,
    lat: number,
    lng: number,
    allowClusterFallback: boolean,
  ): string | null {
    return this.zoomTargetMarkerService.findMarkerKeyForZoomTarget({
      mediaId,
      lat,
      lng,
      allowClusterFallback,
      map: this.instance.map,
      markersByMediaId: this.instance.markersByMediaId,
      uploadedPhotoMarkers: this.instance.uploadedPhotoMarkers,
      toMarkerKey,
      clusterFallbackMaxMeters: DETAIL_LOCATION_CLUSTER_FALLBACK_MAX_METERS,
    });
  }
}
