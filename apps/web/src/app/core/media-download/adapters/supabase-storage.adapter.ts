import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../supabase/supabase.service';

const SIGN_BUCKETS: ReadonlyArray<'media' | 'images'> = ['media', 'images'];

export interface SignedUrlFallbackResult {
  data: { signedUrl: string } | null;
  error: { message?: string } | null;
}

@Injectable({ providedIn: 'root' })
export class SupabaseStorageAdapter {
  private readonly supabase = inject(SupabaseService);

  async createSignedUrlWithFallback(
    path: string,
    expiresInSeconds: number,
    options?: { transform?: { width: number; height: number; resize: 'cover' } },
  ): Promise<SignedUrlFallbackResult> {
    let lastError: { message?: string } | null = null;

    for (const bucket of SIGN_BUCKETS) {
      const { data, error } = await this.supabase.client.storage
        .from(bucket)
        .createSignedUrl(path, expiresInSeconds, options);

      if (!error && data?.signedUrl) {
        return { data: { signedUrl: data.signedUrl }, error: null };
      }

      lastError = error ?? { message: 'Failed to sign URL' };
    }

    return { data: null, error: lastError };
  }

  async createSignedUrlsWithFallback(
    paths: string[],
    expiresInSeconds: number,
  ): Promise<Map<string, string>> {
    const resultMap = new Map<string, string>();

    const assignFromRows = (
      rows: Array<{ path?: string | null; signedUrl?: string | null }>,
    ): void => {
      for (const row of rows) {
        if (!row?.path || !row.signedUrl) continue;
        resultMap.set(row.path, row.signedUrl);
      }
    };

    const { data: mediaRows } = await this.supabase.client.storage
      .from('media')
      .createSignedUrls(paths, expiresInSeconds);

    assignFromRows((mediaRows ?? []) as Array<{ path?: string | null; signedUrl?: string | null }>);

    const missing = paths.filter((path) => !resultMap.has(path));
    if (missing.length === 0) return resultMap;

    const { data: legacyRows } = await this.supabase.client.storage
      .from('images')
      .createSignedUrls(missing, expiresInSeconds);

    assignFromRows(
      (legacyRows ?? []) as Array<{ path?: string | null; signedUrl?: string | null }>,
    );
    return resultMap;
  }
}
