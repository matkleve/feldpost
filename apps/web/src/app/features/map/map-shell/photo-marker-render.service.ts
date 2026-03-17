import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import {
  buildPhotoMarkerHtml,
  PHOTO_MARKER_ICON_ANCHOR,
  PHOTO_MARKER_ICON_SIZE,
  PHOTO_MARKER_POPUP_ANCHOR,
  PhotoMarkerZoomLevel,
} from '../../../core/map/marker-factory';
import { PhotoMarkerState } from './map-marker-reconcile.facade';
import { PhotoMarkerIconStateService } from './photo-marker-icon-state.service';

export type MarkerRenderSnapshot = {
  count: number;
  thumbnailUrl?: string;
  thumbnailLoading?: boolean;
  fallbackLabel?: string;
  direction?: number;
  corrected?: boolean;
  uploading?: boolean;
  selected: boolean;
  linkedHover: boolean;
  zoomLevel: PhotoMarkerZoomLevel;
};

export type RenderablePhotoMarkerState = PhotoMarkerState & {
  lastRendered?: MarkerRenderSnapshot;
};

@Injectable({ providedIn: 'root' })
export class PhotoMarkerRenderService {
  constructor(private readonly photoMarkerIconStateService: PhotoMarkerIconStateService) {}

  buildDraftMediaMarkerIcon(zoomLevel: PhotoMarkerZoomLevel): L.DivIcon {
    return L.divIcon({
      className: 'map-photo-marker-wrapper',
      html: buildPhotoMarkerHtml({
        count: 1,
        selected: true,
        zoomLevel,
      }),
      iconSize: PHOTO_MARKER_ICON_SIZE,
      iconAnchor: PHOTO_MARKER_ICON_ANCHOR,
      popupAnchor: PHOTO_MARKER_POPUP_ANCHOR,
    });
  }

  buildPhotoMarkerIcon(params: {
    markerState: RenderablePhotoMarkerState | undefined;
    override?: Partial<{
      count: number;
      thumbnailUrl?: string;
      fallbackLabel?: string;
      direction?: number;
      corrected?: boolean;
      uploading?: boolean;
    }>;
    selected: boolean;
    linkedHover: boolean;
    zoomLevel: PhotoMarkerZoomLevel;
  }): L.DivIcon {
    const fallbackLabel =
      params.override?.fallbackLabel ??
      params.markerState?.fallbackLabel ??
      this.getMarkerFallbackLabel(params.markerState);

    const iconState = this.photoMarkerIconStateService.resolveIconState(
      params.markerState,
      params.override,
      fallbackLabel,
    );

    return L.divIcon({
      className: 'map-photo-marker-wrapper',
      html: buildPhotoMarkerHtml({
        count: iconState.count,
        thumbnailUrl: iconState.thumbnailUrl,
        fallbackLabel: iconState.fallbackLabel,
        bearing: iconState.direction,
        selected: params.selected,
        linkedHover: params.linkedHover,
        corrected: iconState.corrected,
        uploading: iconState.uploading,
        loading: iconState.loading,
        zoomLevel: params.zoomLevel,
      }),
      iconSize: PHOTO_MARKER_ICON_SIZE,
      iconAnchor: PHOTO_MARKER_ICON_ANCHOR,
      popupAnchor: PHOTO_MARKER_POPUP_ANCHOR,
    });
  }

  refreshPhotoMarker(params: {
    markerState: RenderablePhotoMarkerState | undefined;
    selected: boolean;
    linkedHover: boolean;
    zoomLevel: PhotoMarkerZoomLevel;
  }): void {
    const markerState = params.markerState;
    if (!markerState) {
      return;
    }

    const snapshot: MarkerRenderSnapshot = {
      count: markerState.count,
      thumbnailUrl: markerState.thumbnailUrl,
      thumbnailLoading: markerState.thumbnailLoading,
      fallbackLabel: markerState.fallbackLabel,
      direction: markerState.direction,
      corrected: markerState.corrected,
      uploading: markerState.uploading,
      selected: params.selected,
      linkedHover: params.linkedHover,
      zoomLevel: params.zoomLevel,
    };

    if (this.hasSameMarkerRender(markerState.lastRendered, snapshot)) {
      return;
    }

    markerState.lastRendered = snapshot;
    const markerElement = markerState.marker.getElement();

    if (markerElement) {
      markerElement.innerHTML = buildPhotoMarkerHtml({
        count: markerState.count,
        thumbnailUrl: markerState.thumbnailUrl,
        fallbackLabel: markerState.fallbackLabel ?? this.getMarkerFallbackLabel(markerState),
        bearing: markerState.direction,
        selected: snapshot.selected,
        linkedHover: snapshot.linkedHover,
        corrected: markerState.corrected,
        uploading: markerState.uploading,
        loading: markerState.thumbnailLoading,
        zoomLevel: snapshot.zoomLevel,
      });
      return;
    }

    markerState.marker.setIcon(
      this.buildPhotoMarkerIcon({
        markerState,
        selected: params.selected,
        linkedHover: params.linkedHover,
        zoomLevel: params.zoomLevel,
      }),
    );
  }

  buildFallbackLabelFromPath(path: string | undefined): string | undefined {
    if (!path) return undefined;

    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'PDF';
      case 'doc':
        return 'DOC';
      case 'docx':
        return 'DOCX';
      case 'xls':
        return 'XLS';
      case 'xlsx':
        return 'XLSX';
      case 'ppt':
        return 'PPT';
      case 'pptx':
        return 'PPTX';
      default:
        return undefined;
    }
  }

  private getMarkerFallbackLabel(
    state: RenderablePhotoMarkerState | undefined,
  ): string | undefined {
    if (!state || state.count !== 1) return undefined;
    if (state.fallbackLabel) return state.fallbackLabel;
    return this.buildFallbackLabelFromPath(state.thumbnailSourcePath);
  }

  private hasSameMarkerRender(
    previous: MarkerRenderSnapshot | undefined,
    next: MarkerRenderSnapshot,
  ): boolean {
    if (!previous) {
      return false;
    }

    const checks = [
      previous.count === next.count,
      previous.thumbnailUrl === next.thumbnailUrl,
      previous.thumbnailLoading === next.thumbnailLoading,
      previous.fallbackLabel === next.fallbackLabel,
      previous.direction === next.direction,
      previous.corrected === next.corrected,
      previous.uploading === next.uploading,
      previous.selected === next.selected,
      previous.linkedHover === next.linkedHover,
      previous.zoomLevel === next.zoomLevel,
    ];

    return checks.every(Boolean);
  }
}
