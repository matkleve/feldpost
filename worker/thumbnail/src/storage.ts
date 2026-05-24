import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkerConfig } from './config.js';

export async function downloadSourceFile(
  client: SupabaseClient,
  config: WorkerConfig,
  storagePath: string,
): Promise<Buffer> {
  const { data, error } = await client.storage.from(config.mediaBucketName).download(storagePath);

  if (error || !data) {
    throw new Error(error?.message ?? 'Storage download failed');
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function uploadThumbnail(
  client: SupabaseClient,
  config: WorkerConfig,
  thumbnailPath: string,
  webpBytes: Buffer,
): Promise<void> {
  const { error } = await client.storage.from(config.mediaBucketName).upload(thumbnailPath, webpBytes, {
    contentType: 'image/webp',
    upsert: true,
  });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
}
