/**
 * UploadService coordinates the end-to-end ingest flow.
 * Implementation details (MIME mapping, EXIF parse, error shaping) live in
 * dedicated helpers so this class can stay focused on orchestration.
 */
import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { SupabaseService } from '../supabase/supabase.service';
import { persistUploadFile, type UploadFilePersistDeps } from './support/upload-file-persist.util';
import {
  convertHeicToJpegUploadFile,
  isHeicUploadFile,
  mapUploadStorageError,
  parseUploadExif,
  resolveUploadMediaType,
  resolveUploadMimeType,
  validateUploadFile,
} from './support/upload.service.util';
import type { MediaType } from './support/upload-file-types';
import type { ExifCoords, FileValidation, ParsedExif, UploadResult } from './upload.types';

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './support/upload-file-types';
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
   * @see upload-file-persist.util.ts persistUploadFile
   */
  async uploadFile(
    file: File,
    manualCoords?: ExifCoords,
    parsedExif?: ParsedExif,
    projectId?: string,
    abortSignal?: AbortSignal,
    relativePath?: string,
    options?: { pendingPartialLocation?: boolean },
    addressNotes?: string[],
  ): Promise<UploadResult> {
    return persistUploadFile(
      { file, manualCoords, parsedExif, projectId, abortSignal, relativePath, options, addressNotes },
      this.uploadFilePersistDeps(),
    );
  }

  /** @see upload-file-persist.util.ts UploadFilePersistDeps */
  private uploadFilePersistDeps(): UploadFilePersistDeps {
    return {
      getUser: () => this.auth.user(),
      validateFile: (f) => this.validateFile(f),
      resolveMimeType: (f) => this.resolveMimeType(f),
      resolveMediaType: (f) => this.resolveMediaType(f),
      parseExif: (f) => this.parseExif(f),
      withAbort: (builder, signal) => this.withAbort(builder, signal),
      supabaseClient: this.supabase.client,
      geocoding: this.geocoding,
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
