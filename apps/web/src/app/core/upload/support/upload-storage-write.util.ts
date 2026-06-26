/**
 * Low-level media-bucket write primitives shared by the upload paths.
 *
 * Both the `new` path (persistUploadFile) and the replace/attach path
 * (UploadStorageService) build the same object path and issue the same
 * non-upsert upload. The orchestration around them differs (wide-events,
 * abort rollback, return shape), so only these identical primitives are
 * shared here.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Canonical media-bucket object path: `{orgId}/{userId}/{uuid}.{ext}`. */
export function buildMediaStoragePath(orgId: string, userId: string, fileName: string): string {
  const uuid = crypto.randomUUID();
  const ext = (fileName.split('.').pop() ?? 'jpg').toLowerCase();
  return `${orgId}/${userId}/${uuid}.${ext}`;
}

/** Upload bytes to the `media` bucket (no upsert), optionally cancellable. */
export function uploadToMediaBucket(
  client: SupabaseClient,
  storagePath: string,
  file: File,
  contentType: string,
  abortSignal?: AbortSignal,
): Promise<{ data: unknown; error: Error | null }> {
  return client.storage.from('media').upload(storagePath, file, {
    contentType,
    upsert: false,
    ...(abortSignal ? ({ signal: abortSignal } as Record<string, unknown>) : {}),
  });
}
