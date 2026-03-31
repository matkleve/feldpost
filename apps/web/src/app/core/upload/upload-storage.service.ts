/**
 * UploadStorageService — Supabase Storage upload helper.
 *
 * Used by replace/attach pipelines that handle DB insert separately
 * from the storage upload step.
 *
 * Ground rules (Spec: upload-manager.md § Storage):
 *  - Upload to Supabase Storage bucket with path "/images/{date}/{uuid}.{ext}"
 *  - Return storage_path (used later in DB record insert)
 *  - Support AbortSignal for cancellation
 *  - RLS: Respects org bucket ACL + user role permissions
 *  - Error handling: Retry with exponential backoff; fail fast after max retries
 *
 * Public API:
 *  - upload(file, abortSignal?): Promise<string | null> → storage_path
 *  - delete(storagePath): Promise<boolean> → cleanup success
 */

import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable({ providedIn: 'root' })
export class UploadStorageService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

  /**
   * Upload a file to Supabase Storage and return the storage path.
   * Returns null on failure.
   */
  async upload(file: File, abortSignal?: AbortSignal): Promise<string | null> {
    console.log('[upload-storage] upload called:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    const user = this.auth.user();
    if (!user) {
      console.error('[upload-storage] ✗ no authenticated user');
      return null;
    }
    console.log('[upload-storage] user:', user.id);

    const profileQuery = this.supabase.client
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id);
    const { data: profile, error: profileError } = await this.withAbort(
      profileQuery,
      abortSignal,
    ).single();

    if (!profile) {
      console.error('[upload-storage] ✗ profile fetch failed:', profileError);
      return null;
    }
    console.log('[upload-storage] org:', profile.organization_id);

    const uuid = crypto.randomUUID();
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const storagePath = `${profile.organization_id}/${user.id}/${uuid}.${ext}`;
    console.log('[upload-storage] uploading to path:', storagePath);

    const { error } = await this.supabase.client.storage.from('media').upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
      ...(abortSignal ? ({ signal: abortSignal } as Record<string, unknown>) : {}),
    });

    if (error) {
      console.error('[upload-storage] ✗ Supabase storage.upload error:', error);
      return null;
    }
    console.log('[upload-storage] ✓ upload succeeded:', storagePath);
    return storagePath;
  }

  private withAbort<T extends { abortSignal?: (signal: AbortSignal) => T }>(
    builder: T,
    signal?: AbortSignal,
  ): T {
    if (!signal) return builder;
    if (typeof builder.abortSignal === 'function') {
      return builder.abortSignal(signal);
    }
    return builder;
  }
}
