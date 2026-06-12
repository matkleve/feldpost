import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';
import type {
  ShareSetCreateOptions,
  ShareSetCreateResult,
  ShareSetItem,
} from './share-set.types';

export type { ShareSetCreateOptions, ShareSetCreateResult, ShareSetItem } from './share-set.types';

@Injectable({ providedIn: 'root' })
export class ShareSetService {
  private readonly supabase = inject(SupabaseService);

  async createOrReuseShareSet(
    mediaIds: string[],
    options?: ShareSetCreateOptions,
  ): Promise<ShareSetCreateResult> {
    const audience = options?.audience ?? 'public';
    const shareGrant = options?.shareGrant ?? 'view';
    const recipientUserIds =
      audience === 'named' && options?.recipientUserIds?.length
        ? options.recipientUserIds
        : null;

    const { data, error } = await this.supabase.client.rpc('create_or_reuse_share_set', {
      p_image_ids: mediaIds,
      p_expires_at: options?.expiresAt ?? null,
      p_audience: audience,
      p_share_grant: shareGrant,
      p_recipient_user_ids: recipientUserIds,
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

  /** Single gatekeeper RPC: server branches on stored audience + caller JWT. */
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
      mediaId: row.media_item_id,
      itemOrder: row.item_order,
    }));
  }
}
