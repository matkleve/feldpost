import { Injectable } from '@angular/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface DeleteImageByIdResult {
  ok: boolean;
  errorMessage?: string;
}

@Injectable({ providedIn: 'root' })
export class MarkerContextPhotoDeleteService {
  async deleteImageById(client: SupabaseClient, imageId: string): Promise<DeleteImageByIdResult> {
    const { error } = await client.from('images').delete().eq('id', imageId);
    if (error) {
      return { ok: false, errorMessage: error.message };
    }

    return { ok: true };
  }
}
