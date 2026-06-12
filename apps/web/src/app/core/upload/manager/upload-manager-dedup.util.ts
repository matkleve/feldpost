import type { SupabaseClient } from '@supabase/supabase-js';
import type { DedupHashMatch } from '../upload-manager.types';

export async function checkUploadDedupHash(
  supabaseClient: SupabaseClient,
  contentHash: string,
): Promise<DedupHashMatch | null> {
  try {
    const { data, error } = await supabaseClient.rpc('check_dedup_hashes', {
      hashes: [contentHash],
    });
    if (error || !data || data.length === 0) return null;
    const row = data[0] as {
      media_item_id?: string | null;
      registered_by_user_id?: string | null;
    };
    if (!row.media_item_id || !row.registered_by_user_id) return null;
    return {
      mediaItemId: row.media_item_id,
      registeredByUserId: row.registered_by_user_id,
    };
  } catch {
    return null;
  }
}
