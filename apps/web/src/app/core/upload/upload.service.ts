/**
 * UploadService coordinates the end-to-end ingest flow.
 * Implementation details (MIME mapping, EXIF parse, error shaping) live in
 * dedicated helpers so this class can stay focused on orchestration.
 */
import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { SupabaseService } from '../supabase/supabase.service';
import { resolveUploadAddress } from './upload-address-resolve.util';
import {
  convertHeicToJpegUploadFile,
  describeUploadPersistError,
  isHeicUploadFile,
  mapUploadStorageError,
  parseUploadExif,
  resolveUploadLocationStatus,
  resolveUploadMediaType,
  resolveUploadMimeType,
  validateUploadFile,
} from './upload.service.util';
import type { MediaType } from './upload-file-types';
import type { ExifCoords, FileValidation, ParsedExif, UploadResult } from './upload.types';

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './upload-file-types';
export type {
  ExifCoords,
  FileValidation,
  ParsedExif,
  UploadFailure,
  UploadResult,
  UploadSuccess,
} from './upload.types';

// Ã¢â€â‚¬Ã¢â€â‚¬ Service Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly geocoding = inject(GeocodingService);

  /** Normalize file MIME with extension fallback for platform inconsistencies. */
  resolveMimeType(file: File): string {
    return resolveUploadMimeType(file);
  }

  resolveMediaType(file: File): MediaType {
    return resolveUploadMediaType(this.resolveMimeType(file));
  }

  isPhotoFile(file: File): boolean {
    return this.resolveMediaType(file) === 'photo';
  }

  /** Client-side guard mirrored by server/bucket constraints. */
  validateFile(file: File): FileValidation {
    return validateUploadFile(file);
  }

  /** Parse EXIF GPS/timestamp/direction in a non-throwing way. */
  async parseExif(file: File): Promise<ParsedExif> {
    return parseUploadExif(file);
  }

  /** Convert HEIC/HEIF to JPEG for downstream compatibility. */
  async convertToJpeg(file: File): Promise<File> {
    return convertHeicToJpegUploadFile(file);
  }

  isHeic(file: File): boolean {
    return isHeicUploadFile(file);
  }

  async getSignedUrl(
    storagePath: string,
  ): Promise<{ url: string; error: null } | { error: Error | string }> {
    const buckets: Array<'media' | 'images'> = ['media', 'images'];
    let lastError: unknown = null;

    for (const bucket of buckets) {
      const { data, error } = await this.supabase.client.storage
        .from(bucket)
        .createSignedUrl(storagePath, 3600);

      if (!error && data?.signedUrl) {
        return { url: data.signedUrl, error: null };
      }

      lastError = error;
    }

    return { error: mapUploadStorageError(lastError) };
  }

  async downloadFile(
    storagePath: string,
  ): Promise<{ ok: true; blob: Blob } | { ok: false; error: string }> {
    const buckets: Array<'media' | 'images'> = ['media', 'images'];
    let lastError: unknown = null;

    for (const bucket of buckets) {
      const { data, error } = await this.supabase.client.storage.from(bucket).download(storagePath);

      if (!error && data instanceof Blob) {
        return { ok: true, blob: data };
      }

      lastError = error;
    }

    const mapped = mapUploadStorageError(lastError);
    return {
      ok: false,
      error: typeof mapped === 'string' && mapped.trim().length > 0 ? mapped : 'Download failed.',
    };
  }

  /**
   * Upload pipeline: auth -> validate -> org lookup -> storage upload -> DB write
   * -> optional mixed-media shadow write -> async address resolve.
   */
  async uploadFile(
    file: File,
    manualCoords?: ExifCoords,
    parsedExif?: ParsedExif,
    projectId?: string,
    abortSignal?: AbortSignal,
  ): Promise<UploadResult> {
    const user = this.auth.user();
    if (!user) {
      return { error: 'Not authenticated.' };
    }

    const validation = this.validateFile(file);
    if (!validation.valid) {
      return { error: validation.error! };
    }

    if (abortSignal?.aborted) {
      return { error: 'Upload cancelled by user.' };
    }

    const profileQuery = this.supabase.client
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id);

    const { data: profile, error: profileError } = await this.withAbort(
      profileQuery,
      abortSignal,
    ).single();

    if (profileError || !profile) {
      return { error: profileError ?? new Error('Profile not found.') };
    }

    const orgId: string = profile.organization_id;

    const uuid = crypto.randomUUID();
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const storagePath = `${orgId}/${user.id}/${uuid}.${ext}`;

    if (abortSignal?.aborted) {
      return { error: 'Upload cancelled by user.' };
    }

    const { error: storageError } = await this.supabase.client.storage
      .from('media')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
        ...(abortSignal ? ({ signal: abortSignal } as Record<string, unknown>) : {}),
      });

    if (storageError) {
      return { error: mapUploadStorageError(storageError) };
    }

    if (abortSignal?.aborted) {
      await this.supabase.client.storage.from('media').remove([storagePath]);
      return { error: 'Upload cancelled by user.' };
    }

    const {
      coords: exifCoords,
      capturedAt,
      direction,
    } = parsedExif ?? (await this.parseExif(file));

    const finalCoords: ExifCoords | undefined = exifCoords ?? manualCoords;

    const mediaType = this.resolveMediaType(file);
    const locationStatus = resolveUploadLocationStatus(mediaType, finalCoords);
    const gpsAssignmentAllowed = mediaType !== 'document' || finalCoords != null;

    const mediaInsertQuery = this.supabase.client
      .from('media_items')
      .insert({
        organization_id: orgId,
        created_by: user.id,
        media_type: mediaType,
        mime_type: file.type,
        storage_path: storagePath,
        file_name: file.name,
        file_size_bytes: file.size,
        captured_at: capturedAt ?? null,
        exif_latitude: exifCoords?.lat ?? null,
        exif_longitude: exifCoords?.lng ?? null,
        latitude: finalCoords?.lat ?? null,
        longitude: finalCoords?.lng ?? null,
        location_status: locationStatus,
        gps_assignment_allowed: gpsAssignmentAllowed,
      })
      .select('id');

    const { data: mediaRow, error: dbError } = await this.withAbort(
      mediaInsertQuery,
      abortSignal,
    ).single();

    if (dbError) {
      return { error: dbError };
    }

    if (abortSignal?.aborted) {
      await this.supabase.client.storage.from('media').remove([storagePath]);
      await this.supabase.client
        .from('media_items')
        .delete()
        .eq('id', mediaRow.id as string);
      return { error: 'Upload cancelled by user.' };
    }

    if (finalCoords) {
      resolveUploadAddress({
        mediaItemId: mediaRow.id as string,
        lat: finalCoords.lat,
        lng: finalCoords.lng,
        geocoding: this.geocoding,
        supabaseClient: this.supabase.client,
        describePersistError: describeUploadPersistError,
      });
    }

    return {
      id: mediaRow.id as string,
      storagePath,
      coords: finalCoords,
      direction,
      error: null,
    };
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
