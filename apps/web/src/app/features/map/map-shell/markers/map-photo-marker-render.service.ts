import { Injectable, inject } from '@angular/core';
import { fileTypeBadge } from '../../../../core/media/file-type-registry';
import {
  buildPhotoMarkerHtml,
  type PhotoMarkerZoomLevel,
} from '../../../../core/map/marker-factory';
import { PhotoMarkerIconStateService } from './photo-marker-icon-state.service';
import type { MapDivIcon, MapMarker } from '../leaflet/map-leaflet.service';
import { MapLeafletService } from '../leaflet/map-leaflet.service';
import { MapShellInstanceService } from '../component/map-shell-instance.service';

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

export interface MarkerRenderContext {
  isSelected(markerKey: string): boolean;
  isLinkedHovered(markerKey: string): boolean;
}

@Injectable({ providedIn: 'root' })
export class MapPhotoMarkerRenderService {
  private readonly photoMarkerIconStateService = inject(PhotoMarkerIconStateService);
  private readonly mapLeafletService = inject(MapLeafletService);
  private readonly instance = inject(MapShellInstanceService);

  private ctx: MarkerRenderContext | null = null;

  bind(ctx: MarkerRenderContext): void {
    this.ctx = ctx;
  }

  getPhotoMarkerZoomLevel(): PhotoMarkerZoomLevel {
    const zoom = this.instance.map?.getZoom() ?? 13;
    if (zoom >= 16) return 'near';
    if (zoom >= 13) return 'mid';
    return 'far';
  }

  buildFallbackLabelFromPath(path: string | undefined): string | undefined {
    if (!path) return undefined;
    return fileTypeBadge({ fileName: path }) ?? undefined;
  }

  getMarkerFallbackLabel(
    state: { count: number; thumbnailSourcePath?: string; fallbackLabel?: string } | undefined,
  ): string | undefined {
    if (!state || state.count !== 1) return undefined;
    if (state.fallbackLabel) return state.fallbackLabel;
    return this.buildFallbackLabelFromPath(state.thumbnailSourcePath);
  }

  hasSameMarkerRender(
    previous: MarkerRenderSnapshot | undefined,
    next: MarkerRenderSnapshot,
  ): boolean {
    if (!previous) return false;
    return [
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
    ].every(Boolean);
  }

  buildMarkerRenderSnapshot(
    markerKey: string,
    markerState: {
      count: number;
      thumbnailUrl?: string;
      thumbnailLoading?: boolean;
      fallbackLabel?: string;
      direction?: number;
      corrected?: boolean;
      uploading?: boolean;
    },
  ): MarkerRenderSnapshot {
    return {
      count: markerState.count,
      thumbnailUrl: markerState.thumbnailUrl,
      thumbnailLoading: markerState.thumbnailLoading,
      fallbackLabel: markerState.fallbackLabel,
      direction: markerState.direction,
      corrected: markerState.corrected,
      uploading: markerState.uploading,
      selected: this.ctx?.isSelected(markerKey) ?? false,
      linkedHover: this.ctx?.isLinkedHovered(markerKey) ?? false,
      zoomLevel: this.getPhotoMarkerZoomLevel(),
    };
  }

  buildPhotoMarkerIcon(
    markerKey: string,
    override?: Partial<{
      count: number;
      thumbnailUrl?: string;
      fallbackLabel?: string;
      direction?: number;
      corrected?: boolean;
      uploading?: boolean;
    }>,
  ): MapDivIcon {
    const markerState = this.instance.uploadedPhotoMarkers.get(markerKey);
    const fallbackLabel =
      override?.fallbackLabel ?? markerState?.fallbackLabel ?? this.getMarkerFallbackLabel(markerState);
    const iconState = this.photoMarkerIconStateService.resolveIconState(
      markerState,
      override,
      fallbackLabel,
    );

    return this.mapLeafletService.createPhotoMarkerIcon(
      buildPhotoMarkerHtml({
        count: iconState.count,
        thumbnailUrl: iconState.thumbnailUrl,
        fallbackLabel: iconState.fallbackLabel,
        bearing: iconState.direction,
        selected: this.ctx?.isSelected(markerKey) ?? false,
        linkedHover: this.ctx?.isLinkedHovered(markerKey) ?? false,
        corrected: iconState.corrected,
        uploading: iconState.uploading,
        loading: iconState.loading,
        zoomLevel: this.getPhotoMarkerZoomLevel(),
      }),
    );
  }

  renderPhotoMarker(
    markerKey: string,
    markerState: {
      marker: MapMarker;
      count: number;
      thumbnailUrl?: string;
      thumbnailLoading?: boolean;
      fallbackLabel?: string;
      direction?: number;
      corrected?: boolean;
      uploading?: boolean;
      thumbnailSourcePath?: string;
    },
    snapshot: MarkerRenderSnapshot,
  ): void {
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

    markerState.marker.setIcon(this.buildPhotoMarkerIcon(markerKey));
  }

  refreshPhotoMarker(markerKey: string): void {
    const markerState = this.instance.uploadedPhotoMarkers.get(markerKey);
    if (!markerState) return;

    const snapshot = this.buildMarkerRenderSnapshot(markerKey, markerState);

    if (this.hasSameMarkerRender(markerState.lastRendered, snapshot)) return;

    markerState.lastRendered = snapshot;
    this.renderPhotoMarker(markerKey, markerState, snapshot);
  }
}
