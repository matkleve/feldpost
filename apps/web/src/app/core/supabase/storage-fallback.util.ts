/**
 * Shared "probe media, then legacy images bucket" helpers for stored objects.
 *
 * Assets are written to the `media` bucket; `images` is the legacy bucket kept
 * for older rows. Resolving an object therefore tries `media` first and falls
 * back to `images`. Centralised here so the bucket list and probe order live in
 * one place instead of being copy-pasted across upload/download call sites.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Buckets probed in order when resolving a stored object. */
export const STORAGE_FALLBACK_BUCKETS: ReadonlyArray<'media' | 'images'> = ['media', 'images'];

export interface SignedUrlFallbackResult {
  data: { signedUrl: string } | null;
  error: { message?: string } | null;
}

/** createSignedUrl across STORAGE_FALLBACK_BUCKETS, returning the first hit. */
export async function signUrlWithBucketFallback(
  client: SupabaseClient,
  path: string,
  expiresInSeconds: number,
  options?: { transform?: { width: number; height: number; resize: 'cover' | 'contain' } },
): Promise<SignedUrlFallbackResult> {
  let lastError: { message?: string } | null = null;

  for (const bucket of STORAGE_FALLBACK_BUCKETS) {
    const { data, error } = await client.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds, options);

    if (!error && data?.signedUrl) {
      return { data: { signedUrl: data.signedUrl }, error: null };
    }

    lastError = error ?? { message: 'Failed to sign URL' };
  }

  return { data: null, error: lastError };
}

/** download() across STORAGE_FALLBACK_BUCKETS, returning the first Blob hit. */
export async function downloadWithBucketFallback(
  client: SupabaseClient,
  path: string,
): Promise<{ data: Blob | null; error: unknown }> {
  let lastError: unknown = null;

  for (const bucket of STORAGE_FALLBACK_BUCKETS) {
    const { data, error } = await client.storage.from(bucket).download(path);

    if (!error && data instanceof Blob) {
      return { data, error: null };
    }

    lastError = error;
  }

  return { data: null, error: lastError };
}
