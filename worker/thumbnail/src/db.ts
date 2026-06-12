import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { WorkerConfig } from './config.js';

export type PreviewGenerationStatus = 'idle' | 'pending' | 'ready' | 'failed';

export type MediaItemPreviewRow = {
  id: string;
  thumbnail_path: string | null;
  preview_generation_status: PreviewGenerationStatus;
};

export function createDbClient(config: WorkerConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getMediaItemPreview(
  client: SupabaseClient,
  mediaId: string,
): Promise<MediaItemPreviewRow | null> {
  const { data, error } = await client
    .from('media_items')
    .select('id, thumbnail_path, preview_generation_status')
    .eq('id', mediaId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to read media_items: ${error.message}`);
  }

  return data as MediaItemPreviewRow | null;
}

export async function setPreviewStatus(
  client: SupabaseClient,
  mediaId: string,
  status: PreviewGenerationStatus,
): Promise<void> {
  const { error } = await client
    .from('media_items')
    .update({ preview_generation_status: status })
    .eq('id', mediaId);

  if (error) {
    throw new Error(`Failed to set preview_generation_status=${status}: ${error.message}`);
  }
}

export async function updateReady(
  client: SupabaseClient,
  mediaId: string,
  thumbnailPath: string,
): Promise<void> {
  const { error } = await client
    .from('media_items')
    .update({
      thumbnail_path: thumbnailPath,
      preview_generation_status: 'ready',
    })
    .eq('id', mediaId);

  if (error) {
    throw new Error(`Failed to update thumbnail_path: ${error.message}`);
  }
}
