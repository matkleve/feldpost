import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface DeleteImageByIdResult {
  ok: boolean;
  errorMessage?: string;
}

export interface SingleMarkerContextPayload {
  markerKey: string;
  count: number;
  mediaId?: string;
}

@Injectable({ providedIn: 'root' })
export class MarkerContextPhotoDeleteService {
  getSingleImageTarget(
    payload: SingleMarkerContextPayload | null,
  ): { markerKey: string; mediaId: string } | null {
    if (!payload || payload.count !== 1 || !payload.mediaId) {
      return null;
    }
    return { markerKey: payload.markerKey, mediaId: payload.mediaId };
  }

  confirmPhotoDelete(): boolean {
    return (
      typeof window === 'undefined' ||
      window.confirm(
        'Foto wirklich loeschen? Dieser Vorgang kann nicht rueckgaengig gemacht werden.',
      )
    );
  }

  confirmPhotoDeleteCount(count: number): boolean {
    return (
      typeof window === 'undefined' ||
      window.confirm(
        `${count} Medien wirklich loeschen? Dieser Vorgang kann nicht rueckgaengig gemacht werden.`,
      )
    );
  }

  async deleteImageById(client: SupabaseClient, mediaId: string): Promise<DeleteImageByIdResult> {
    const { error } = await client
      .from('media_items')
      .delete()
      .or(`id.eq.${mediaId},source_image_id.eq.${mediaId}`);
    if (error) {
      return { ok: false, errorMessage: error.message };
    }

    return { ok: true };
  }
}
