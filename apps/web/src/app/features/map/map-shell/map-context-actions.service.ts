import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkspaceImage } from '../../../core/workspace-view.types';

export interface AssignImagesToProjectResult {
  ok: boolean;
  reason: 'success' | 'empty' | 'error';
  errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class MapContextActionsService {
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
