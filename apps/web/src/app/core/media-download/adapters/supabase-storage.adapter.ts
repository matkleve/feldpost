import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../supabase/supabase.service';
import {
  signUrlWithBucketFallback,
  type SignedUrlFallbackResult,
} from '../../supabase/storage-fallback.util';

export type { SignedUrlFallbackResult } from '../../supabase/storage-fallback.util';

@Injectable({ providedIn: 'root' })
export class SupabaseStorageAdapter {
  private readonly supabase = inject(SupabaseService);

  async createSignedUrlWithFallback(
    path: string,
    expiresInSeconds: number,
    options?: { transform?: { width: number; height: number; resize: 'cover' | 'contain' } },
  ): Promise<SignedUrlFallbackResult> {
    return signUrlWithBucketFallback(this.supabase.client, path, expiresInSeconds, options);
  }

  async createSignedUrlsWithFallback(
    paths: string[],
    expiresInSeconds: number,
  ): Promise<Map<string, string>> {
    const resultMap = new Map<string, string>();

    const assignFromRows = (
      rows: Array<{ path?: string | null; signedUrl?: string | null; error?: string | null }>,
    ): void => {
      for (const row of rows) {
        if (!row?.path || row.error || !row.signedUrl) continue;
        resultMap.set(row.path, row.signedUrl);
      }
    };

    const { data: mediaRows } = await this.supabase.client.storage
      .from('media')
      .createSignedUrls(paths, expiresInSeconds);

    assignFromRows((mediaRows ?? []) as Array<{ path?: string | null; signedUrl?: string | null }>);

    const missing = paths.filter((path) => !resultMap.has(path));
    if (missing.length === 0) {
      return resultMap;
    }

    // Per-path fallback (media → images). Avoids a second batch sign on `images` that 400s when
    // every thumb path is missing from the legacy bucket.
    await Promise.all(
      missing.map(async (path) => {
        const signed = await this.createSignedUrlWithFallback(path, expiresInSeconds);
        if (signed.data?.signedUrl) {
          resultMap.set(path, signed.data.signedUrl);
        }
      }),
    );

    return resultMap;
  }
}
