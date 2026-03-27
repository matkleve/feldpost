import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface DeleteImageByIdResult {
  ok: boolean;
  errorMessage?: string;
}

export interface SingleMarkerContextPayload {
  markerKey: string;
  count: number;
  imageId?: string;
}

@Injectable({ providedIn: 'root' })
export class MarkerContextPhotoDeleteService {
  getSingleImageTarget(
    payload: SingleMarkerContextPayload | null,
  ): { markerKey: string; imageId: string } | null {
    if (!payload || payload.count !== 1 || !payload.imageId) {
      return null;
    }
    return { markerKey: payload.markerKey, imageId: payload.imageId };
  }

  confirmPhotoDelete(): boolean {
    return (
      typeof window === 'undefined' ||
      window.confirm(
        'Foto wirklich loeschen? Dieser Vorgang kann nicht rueckgaengig gemacht werden.',
      )
    );
  }

  async deleteImageById(client: SupabaseClient, imageId: string): Promise<DeleteImageByIdResult> {
    const { error } = await client
      .from('media_items')
      .delete()
      .or(`id.eq.${imageId},source_image_id.eq.${imageId}`);
    if (error) {
      return { ok: false, errorMessage: error.message };
    }

    return { ok: true };
  }
}
