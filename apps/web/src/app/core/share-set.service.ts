import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface ShareSetCreateResult {
  shareSetId: string;
  token: string;
  expiresAt: string;
}

export interface ShareSetItem {
  shareSetId: string;
  imageId: string;
  itemOrder: number;
}

@Injectable({ providedIn: 'root' })
export class ShareSetService {
  private readonly supabase = inject(SupabaseService);

  async createOrReuseShareSet(
    imageIds: string[],
    expiresAt?: string,
  ): Promise<ShareSetCreateResult> {
    const { data, error } = await this.supabase.client.rpc('create_or_reuse_share_set', {
      p_image_ids: imageIds,
      p_expires_at: expiresAt ?? null,
    });

    if (error) {
      throw new Error(error.message);
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row?.share_set_id || !row?.token || !row?.expires_at) {
      throw new Error('Failed to create share link.');
    }

    return {
      shareSetId: row.share_set_id,
      token: row.token,
      expiresAt: row.expires_at,
    };
  }

  async resolveShareSet(token: string): Promise<ShareSetItem[]> {
    const { data, error } = await this.supabase.client.rpc('resolve_share_set', {
      p_token: token,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((row) => ({
      shareSetId: row.share_set_id,
      imageId: row.image_id,
      itemOrder: row.item_order,
    }));
  }
}
