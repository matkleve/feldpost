import { inject, Injectable } from '@angular/core';
import type * as L from 'leaflet';
import { GeocodingService } from '../../../core/geocoding/geocoding.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { WorkspaceImage } from '../../../core/workspace-view/workspace-view.types';

export interface AssignImagesToProjectResult {
  ok: boolean;
  reason: 'success' | 'empty' | 'error';
  errorMessage?: string;
}

export interface RemoveImagesFromProjectsResult {
  ok: boolean;
  reason: 'success' | 'empty' | 'lookup-error' | 'remove-error';
  errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class MapContextActionsService {
  private readonly supabaseService = inject(SupabaseService);
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
    mediaIds: string[],
    projectId: string,
  ): Promise<AssignImagesToProjectResult> {
    if (mediaIds.length === 0) {
      return { ok: false, reason: 'empty' };
    }

    const resolvedMediaItems = await this.resolveMediaItemIds(mediaIds);
    if (!resolvedMediaItems.ok) {
      return { ok: false, reason: 'error', errorMessage: resolvedMediaItems.errorMessage };
    }

    if (resolvedMediaItems.mediaItemIds.length === 0) {
      return { ok: false, reason: 'empty' };
    }

    const membershipPayload = resolvedMediaItems.mediaItemIds.map((mediaItemId) => ({
      media_item_id: mediaItemId,
      project_id: projectId,
    }));

    const { error: membershipError } = await this.supabaseService.client
      .from('media_projects')
      .upsert(membershipPayload, { onConflict: 'media_item_id,project_id' });

    if (membershipError) {
      return { ok: false, reason: 'error', errorMessage: membershipError.message };
    }

    return { ok: true, reason: 'success' };
  }

  async removeImagesFromProjects(mediaIds: string[]): Promise<RemoveImagesFromProjectsResult> {
    const uniqueMediaIds = Array.from(new Set(mediaIds));
    if (uniqueMediaIds.length === 0) {
      return { ok: false, reason: 'empty' };
    }

    const resolvedMediaItems = await this.resolveMediaItemIds(uniqueMediaIds);
    if (!resolvedMediaItems.ok) {
      return {
        ok: false,
        reason: 'lookup-error',
        errorMessage: resolvedMediaItems.errorMessage,
      };
    }

    if (resolvedMediaItems.mediaItemIds.length === 0) {
      return { ok: false, reason: 'empty' };
    }

    const { error: removeError } = await this.supabaseService.client
      .from('media_projects')
      .delete()
      .in('media_item_id', resolvedMediaItems.mediaItemIds);

    if (removeError) {
      return { ok: false, reason: 'remove-error', errorMessage: removeError.message };
    }

    return { ok: true, reason: 'success' };
  }

  async resolveMarkerContextMediaIds(
    payload: {
      count: number;
      mediaId?: string;
      sourceCells: Array<{ lat: number; lng: number }>;
    },
    fetchClusterImages: (
      cells: Array<{ lat: number; lng: number }>,
      zoom: number,
    ) => Promise<WorkspaceImage[]>,
    zoom: number,
  ): Promise<string[]> {
    if (payload.count === 1 && payload.mediaId) {
      return [payload.mediaId];
    }

    const images = await fetchClusterImages(payload.sourceCells, zoom);
    return images.map((img) => img.id);
  }

  private async resolveMediaItemIds(
    mediaIds: string[],
  ): Promise<{ ok: true; mediaItemIds: string[] } | { ok: false; errorMessage: string }> {
    const idList = Array.from(new Set(mediaIds)).join(',');
    const { data: mediaRows, error: mediaLookupError } = await this.supabaseService.client
      .from('media_items')
      .select('id,source_image_id')
      .or(`id.in.(${idList}),source_image_id.in.(${idList})`);

    if (mediaLookupError) {
      return { ok: false, errorMessage: mediaLookupError.message };
    }

    return {
      ok: true,
      mediaItemIds: Array.from(
        new Set((mediaRows ?? []).map((row: { id: string }) => row.id).filter(Boolean)),
      ),
    };
  }
}
