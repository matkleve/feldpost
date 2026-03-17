import { inject, Injectable } from '@angular/core';
import * as L from 'leaflet';
import type { SupabaseClient } from '@supabase/supabase-js';
import { GeocodingService } from '../../../core/geocoding.service';
import type { WorkspaceImage } from '../../../core/workspace-view.types';

export interface AssignImagesToProjectResult {
  ok: boolean;
  reason: 'success' | 'empty' | 'error';
  errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class MapContextActionsService {
  private readonly geocodingService = inject(GeocodingService);

  clampContextMenuPosition(x: number, y: number): { x: number; y: number } {
    if (typeof window === 'undefined') {
      return { x, y };
    }

    const menuWidth = 240;
    const menuHeight = 280;
    const margin = 8;
    return {
      x: Math.min(Math.max(x, margin), window.innerWidth - menuWidth - margin),
      y: Math.min(Math.max(y, margin), window.innerHeight - menuHeight - margin),
    };
  }

  async copyTextToClipboard(text: string): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }

  async copyAddressFromCoords(lat: number, lng: number): Promise<boolean> {
    const reverse = await this.geocodingService.reverse(lat, lng);
    const address = reverse?.addressLabel?.trim();
    if (!address) {
      return false;
    }
    return this.copyTextToClipboard(address);
  }

  resolveMarkerContextMenuPosition(
    markerState: { lat: number; lng: number },
    sourceEvent: MouseEvent | PointerEvent | undefined,
    map: L.Map | undefined,
  ): { x: number; y: number } {
    let x = sourceEvent?.clientX;
    let y = sourceEvent?.clientY;

    if ((x == null || y == null) && map) {
      const point = map.latLngToContainerPoint([markerState.lat, markerState.lng]);
      const containerRect = map.getContainer().getBoundingClientRect();
      x = containerRect.left + point.x;
      y = containerRect.top + point.y;
    }

    return this.clampContextMenuPosition(x ?? 0, y ?? 0);
  }

  formatGps(lat: number, lng: number): string {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  buildGoogleMapsUrl(lat: number, lng: number): string {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

  async assignImagesToProject(
    client: SupabaseClient,
    imageIds: string[],
    projectId: string,
  ): Promise<AssignImagesToProjectResult> {
    if (imageIds.length === 0) {
      return { ok: false, reason: 'empty' };
    }

    const { error } = await client
      .from('images')
      .update({ project_id: projectId })
      .in('id', imageIds);
    if (error) {
      return { ok: false, reason: 'error', errorMessage: error.message };
    }

    return { ok: true, reason: 'success' };
  }

  async resolveMarkerContextImageIds(
    payload: {
      count: number;
      imageId?: string;
      sourceCells: Array<{ lat: number; lng: number }>;
    },
    fetchClusterImages: (
      cells: Array<{ lat: number; lng: number }>,
      zoom: number,
    ) => Promise<WorkspaceImage[]>,
    zoom: number,
  ): Promise<string[]> {
    if (payload.count === 1 && payload.imageId) {
      return [payload.imageId];
    }

    const images = await fetchClusterImages(payload.sourceCells, zoom);
    return images.map((img) => img.id);
  }
}
