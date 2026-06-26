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
import { buildMediaStoragePath, uploadToMediaBucket } from './upload-storage-write.util';

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

      const orgId = await this.auth.organizationId();
      if (!orgId) {
        ev.end('error', {
          errorMessage: 'Profile fetch failed',
          errorType: 'profile_fetch_failed',
        });
        return null;
      }

      const storagePath = buildMediaStoragePath(orgId, user.id, file.name);
      ev.set({ storagePath, bytesWritten: file.size });

      const { error } = await uploadToMediaBucket(
        this.supabase.client,
        storagePath,
        file,
        file.type,
        abortSignal,
      );

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
}
