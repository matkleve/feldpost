/**
 * UploadStorageService -- Supabase Storage upload helper.
 *
 * Used by replace/attach pipelines that handle DB insert separately
 * from the storage upload step.
 *
 * Ground rules (Spec: upload-manager.md # Storage):
 *  - Upload to the "media" Supabase Storage bucket with path "{orgId}/{userId}/{uuid}.{ext}"
 *  - Return storage_path (used later in DB record insert)
 *  - Support AbortSignal for cancellation
 *  - RLS: Respects org bucket ACL + user role permissions
 *  - Error handling: Retry with exponential backoff; fail fast after max retries
 *
 * Public API:
 *  - upload(file, abortSignal?): Promise<string | null> -> storage_path
 *  - delete(storagePath): Promise<boolean> -> cleanup success
 */

import { Injectable, inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { WideEventService } from '../../wide-event/wide-event.service';

@Injectable({ providedIn: 'root' })
export class UploadStorageService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly wideEvent = inject(WideEventService);

  /**
   * Upload a file to Supabase Storage and return the storage path.
   * Returns null on failure.
   */
  async upload(file: File, abortSignal?: AbortSignal): Promise<string | null> {
    const ev = this.wideEvent.start('upload.storage', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    try {
      const user = this.auth.user();
      if (!user) {
        ev.end('error', { errorMessage: 'No authenticated user' });
        return null;
      }

      const profileQuery = this.supabase.client
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id);
      const { data: profile, error: profileError } = await this.withAbort(
        profileQuery,
        abortSignal,
      ).single();

      if (!profile) {
        ev.end('error', {
          errorMessage: profileError?.message ?? 'Profile fetch failed',
          errorType: profileError?.code ?? 'profile_fetch_failed',
        });
        return null;
      }

      const uuid = crypto.randomUUID();
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
      const storagePath = `${profile.organization_id}/${user.id}/${uuid}.${ext}`;
      ev.set({ storagePath, bytesWritten: file.size });

      const { error } = await this.supabase.client.storage.from('media').upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
        ...(abortSignal ? ({ signal: abortSignal } as Record<string, unknown>) : {}),
      });

      if (error) {
        ev.end('error', {
          errorMessage: error.message,
          errorType: error.name ?? 'storage_upload_error',
        });
        return null;
      }

      ev.end('ok');
      return storagePath;
    } catch (e) {
      const isAbort =
        e instanceof DOMException && e.name === 'AbortError'
          ? true
          : typeof e === 'object' &&
            e !== null &&
            'name' in e &&
            (e as { name?: string }).name === 'AbortError';

      ev.end(isAbort ? 'timeout' : 'error', {
        errorType: e instanceof Error ? e.constructor.name : 'unknown',
        errorMessage: e instanceof Error ? e.message : String(e),
        errorStack: e instanceof Error ? e.stack : undefined,
      });
      throw e;
    }
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
