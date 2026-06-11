import type { SupabaseClient } from '@supabase/supabase-js';

export async function checkUploadDedupHash(
  supabaseClient: SupabaseClient,
  contentHash: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabaseClient.rpc('check_dedup_hashes', {
      hashes: [contentHash],
    });
    if (error || !data || data.length === 0) return null;
    return data[0].media_item_id ?? null;
  } catch {
    return null;
  }
}
