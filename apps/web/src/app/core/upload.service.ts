/**
 * UploadService — handles the full photo ingestion pipeline.
 *
 * Ground rules:
 *  - Validates file before any network call (25 MB max, allowed MIME types).
 *  - Parses EXIF GPS with exifr; coordinates are read-only after insert.
 *  - Uploads the original file to Supabase Storage at {org_id}/{user_id}/{uuid}.{ext}.
 *  - Inserts an `images` row; the DB trigger populates the `geog` PostGIS column.
 *  - Storage URLs are always signed (TTL 3600 s) — no public paths returned to callers.
 *  - EXIF lat/lng are stored in exif_latitude / exif_longitude (immutable).
 *    latitude / longitude start identical to EXIF; corrections go in coordinate_corrections.
 *  - Errors are returned as { error }; this service never throws.
 *  - No real Supabase calls in unit tests — SupabaseService is faked in specs.
 */

import { Injectable, inject } from '@angular/core';
import * as exifr from 'exifr/dist/lite.esm.js';
import heic2any from 'heic2any';
import { AuthService } from './auth/auth.service';
import { GeocodingService } from './geocoding.service';
import { SupabaseService } from './supabase/supabase.service';

// ── Constants ──────────────────────────────────────────────────────────────────

/** 25 MiB — matches architecture.md §5 and the storage bucket file_size_limit. */
export const MAX_FILE_SIZE = 25 * 1024 * 1024;

/** MIME types accepted for upload (see security-boundaries.md §4.4). */
export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.oasis.opendocument.graphics',
  'text/plain',
  'text/csv',
  'application/csv',
]);

const PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
]);

const VIDEO_MIME_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

type MediaType = 'photo' | 'video' | 'document';
type LocationStatus = 'gps' | 'no_gps' | 'unresolved';

// ── Types ──────────────────────────────────────────────────────────────────────

/** Validated GPS coordinates from EXIF parsing. */
export interface ExifCoords {
  lat: number;
  lng: number;
}

/** EXIF fields extracted from an image file. */
export interface ParsedExif {
  /** GPS coordinates, present only when the image carries GPS tags. */
  coords?: ExifCoords;
  /** Original capture timestamp from EXIF DateTimeOriginal. */
  capturedAt?: Date;
  /** Camera compass direction in degrees (0–360), from GPSImgDirection. */
  direction?: number;
}

/** A successfully completed upload. */
export interface UploadSuccess {
  /** UUID primary key of the newly inserted `images` row. */
  id: string;
  /** Supabase Storage path for the original file. */
  storagePath: string;
  /** Persisted coordinates (EXIF or manually supplied). */
  coords?: ExifCoords;
  /** Camera compass direction in degrees (0–360), if available from EXIF. */
  direction?: number;
  error: null;
}

/** A failed upload carrying the reason. */
export interface UploadFailure {
  error: Error | string;
}

/** Return type of uploadFile(). */
export type UploadResult = UploadSuccess | UploadFailure;

/** Result of client-side file validation. */
export interface FileValidation {
  valid: boolean;
  /** Human-readable reason when valid === false. */
  error?: string;
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class UploadService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly geocoding = inject(GeocodingService);

  // ── File validation ────────────────────────────────────────────────────────

  /**
   * Returns the file's MIME type. If the browser didn't identify it (e.g. empty string for some HEIC files on Windows),
   * falls back to deriving the type from the file extension.
   */
  resolveMimeType(file: File): string {
    if (file.type) return file.type;

    const ext = file.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'heic':
        return 'image/heic';
      case 'heif':
        return 'image/heif';
      case 'jpeg':
      case 'jpg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'mp4':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
      case 'webm':
        return 'video/webm';
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'odt':
        return 'application/vnd.oasis.opendocument.text';
      case 'xls':
        return 'application/vnd.ms-excel';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'ods':
        return 'application/vnd.oasis.opendocument.spreadsheet';
      case 'ppt':
        return 'application/vnd.ms-powerpoint';
      case 'pptx':
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case 'odp':
        return 'application/vnd.oasis.opendocument.presentation';
      case 'odg':
        return 'application/vnd.oasis.opendocument.graphics';
      case 'txt':
        return 'text/plain';
      case 'csv':
        return 'text/csv';
      default:
        return '';
    }
  }

  /**
   * Validates a file against size and MIME-type rules.
   * This is a synchronous, client-side check — the storage bucket enforces the
   * same limits server-side, but we surface the error early for better UX.
   */
  validateFile(file: File): FileValidation {
    if (file.size > MAX_FILE_SIZE) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      return {
        valid: false,
        error: `"${file.name}" is ${mb} MB — maximum allowed is 25 MB.`,
      };
    }

    const mimeType = this.resolveMimeType(file);

    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return {
        valid: false,
        error: `"${file.name}" has unsupported type "${file.type}". Use JPEG, PNG, HEIC, HEIF, WebP, MP4, MOV, WebM, PDF, DOC, DOCX, ODT, ODG, XLS, XLSX, ODS, PPT, PPTX, or ODP.`,
      };
    }
    return { valid: true };
  }

  // ── EXIF parsing ───────────────────────────────────────────────────────────

  /**
   * Extracts GPS coordinates and capture timestamp from the file's EXIF data.
   * Returns an empty object when no GPS tags are present or parsing fails.
   * Never throws — a failed parse is treated as "no EXIF data".
   */
  async parseExif(file: File): Promise<ParsedExif> {
    try {
      const [gps, meta] = await Promise.all([
        exifr.gps(file),
        exifr.parse(file, ['DateTimeOriginal', 'GPSImgDirection']),
      ]);

      const coords: ExifCoords | undefined =
        gps?.latitude != null && gps?.longitude != null
          ? { lat: gps.latitude, lng: gps.longitude }
          : undefined;

      const rawDir = meta?.GPSImgDirection;
      const direction: number | undefined =
        typeof rawDir === 'number' && rawDir >= 0 && rawDir <= 360 ? rawDir : undefined;

      return {
        coords,
        capturedAt: meta?.DateTimeOriginal ?? undefined,
        direction,
      };
    } catch {
      // Silently treat parse failures as "no EXIF" — the caller will
      // prompt the user for manual placement.
      return {};
    }
  }

  /**
   * Converts a HEIC/HEIF file to a JPEG File natively in the browser.
   * Uses `heic2any` under the hood. Returns the new File with `.jpg` extension.
   */
  async convertToJpeg(file: File): Promise<File> {
    if (!this.isHeic(file)) {
      return file;
    }

    try {
      const convertedBlobMap = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
      const convertedBlob = Array.isArray(convertedBlobMap)
        ? convertedBlobMap[0]
        : convertedBlobMap;

      // Swap the extension
      let newName = file.name;
      if (newName.toLowerCase().endsWith('.heic') || newName.toLowerCase().endsWith('.heif')) {
        newName = newName.replace(/\.hei[cf]$/i, '.jpg');
      } else {
        newName += '.jpg';
      }

      return new File([convertedBlob], newName, { type: 'image/jpeg' });
    } catch (err) {
      console.warn('HEIC to JPEG conversion failed, returning original file', err);
      return file;
    }
  }

  isHeic(file: File): boolean {
    const type = this.resolveMimeType(file);
    return type === 'image/heic' || type === 'image/heif';
  }

  // ── Storage signed URL ─────────────────────────────────────────────────────

  /**
   * Returns a 1-hour signed URL for the given storage path.
   * Used by callers that need to display or share the image without making
   * the bucket public.
   */
  async getSignedUrl(
    storagePath: string,
  ): Promise<{ url: string; error: null } | { error: Error | string }> {
    const { data, error } = await this.supabase.client.storage
      .from('images')
      .createSignedUrl(storagePath, 3600);

    if (error) return { error: this.mapStorageError(error) };
    return { url: data.signedUrl, error: null };
  }

  // ── Upload ─────────────────────────────────────────────────────────────────

  /**
   * Full ingestion pipeline for a single file:
   *   1. Validate (must pass before this method is called — callers should
   *      call validateFile() first, but a guard check runs here too).
   *   2. Resolve the authenticated user's profile to get organization_id.
   *   3. Upload the file to Storage at `{org_id}/{user_id}/{uuid}.{ext}`.
   *   4. Insert an `images` row; EXIF coords go in exif_latitude / exif_longitude
   *      AND in latitude / longitude (corrections go in coordinate_corrections).
   *   5. Return the new row's ID + resolved coordinates.
   *
   * @param file       The browser File object to upload.
   * @param manualCoords  Manually placed coordinates — used when EXIF is absent.
   *                      If provided AND EXIF GPS is also present, EXIF wins for
   *                      exif_latitude/exif_longitude; manualCoords wins for
   *                      latitude/longitude.
   */
  async uploadFile(
    file: File,
    manualCoords?: ExifCoords,
    parsedExif?: ParsedExif,
    projectId?: string,
  ): Promise<UploadResult> {
    // ── 0. Auth guard ──────────────────────────────────────────────────────
    const user = this.auth.user();
    if (!user) {
      return { error: 'Not authenticated.' };
    }

    // ── 1. Inline validation ───────────────────────────────────────────────
    const validation = this.validateFile(file);
    if (!validation.valid) {
      return { error: validation.error! };
    }

    // ── 2. Fetch org ID from profiles ─────────────────────────────────────
    const { data: profile, error: profileError } = await this.supabase.client
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { error: profileError ?? new Error('Profile not found.') };
    }

    const orgId: string = profile.organization_id;

    // ── 3. Build storage path ──────────────────────────────────────────────
    const uuid = crypto.randomUUID();
    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
    const storagePath = `${orgId}/${user.id}/${uuid}.${ext}`;

    // ── 4. Upload to Supabase Storage ──────────────────────────────────────
    const { error: storageError } = await this.supabase.client.storage
      .from('images')
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (storageError) {
      return { error: this.mapStorageError(storageError) };
    }

    // ── 5. Parse EXIF ──────────────────────────────────────────────────────
    // Re-use caller-supplied result when available to avoid parsing the file twice.
    const {
      coords: exifCoords,
      capturedAt,
      direction,
    } = parsedExif ?? (await this.parseExif(file));

    // Determine the persisted lat/lng:
    //  - EXIF GPS takes precedence over manual placement for the EXIF columns.
    //  - Manual coords are used for the mutable latitude/longitude columns
    //    when EXIF is absent.
    const finalCoords: ExifCoords | undefined = exifCoords ?? manualCoords;

    // ── 6. Insert images row ───────────────────────────────────────────────
    const { data: imageRow, error: dbError } = await this.supabase.client
      .from('images')
      .insert({
        user_id: user.id,
        organization_id: orgId,
        storage_path: storagePath,
        exif_latitude: exifCoords?.lat ?? null,
        exif_longitude: exifCoords?.lng ?? null,
        latitude: finalCoords?.lat ?? null,
        longitude: finalCoords?.lng ?? null,
        captured_at: capturedAt ?? null,
        direction: direction ?? null,
        location_unresolved: finalCoords != null,
        project_id: projectId ?? null,
      })
      .select('id')
      .single();

    if (dbError) {
      return { error: dbError };
    }

    // Shadow write into mixed-media tables when upload context has a primary project.
    if (projectId) {
      const mediaType = this.resolveMediaType(file.type);
      const locationStatus = this.resolveLocationStatus(mediaType, finalCoords);

      const { error: mediaError } = await this.supabase.client.from('media_items').insert({
        organization_id: orgId,
        primary_project_id: projectId,
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
        gps_assignment_allowed: mediaType !== 'document',
        source_image_id: imageRow.id as string,
      });

      if (mediaError) {
        return { error: mediaError };
      }
    }

    // Fire-and-forget: reverse-geocode coordinates to populate address fields.
    if (finalCoords) {
      this.resolveAddress(imageRow.id as string, finalCoords.lat, finalCoords.lng);
    }

    return {
      id: imageRow.id as string,
      storagePath,
      coords: finalCoords,
      direction,
      error: null,
    };
  }

  /**
   * Reverse-geocode coordinates and update the image row with structured address fields.
   * Runs asynchronously after upload — failures are logged but do not block the upload result.
   */
  private async resolveAddress(imageId: string, lat: number, lng: number): Promise<void> {
    try {
      const result = await this.geocoding.reverse(lat, lng);
      if (!result) return;

      const { error } = await this.supabase.client.rpc('bulk_update_image_addresses', {
        p_image_ids: [imageId],
        p_address_label: result.addressLabel,
        p_city: result.city,
        p_district: result.district,
        p_street: result.street,
        p_country: result.country,
      });

      if (error) {
        console.error('Failed to persist address for image', imageId, {
          imageId,
          ...this.describePersistError(error),
        });
      }
    } catch {
      // Non-critical — address will show as "Unknown district" until resolved.
    }
  }

  private mapStorageError(error: unknown): Error | string {
    const message =
      typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message ?? '')
          : '';

    if (/bucket\s+not\s+found/i.test(message)) {
      return 'Storage bucket "images" is missing in this Supabase project. Create it (or run the storage migration) and retry.';
    }

    return (error as Error | string) ?? 'Storage error.';
  }

  private describePersistError(error: unknown): {
    code: string | null;
    status: number | null;
    message: string;
    details: string | null;
    hint: string | null;
    bodySnippet: string | null;
  } {
    const candidate =
      typeof error === 'object' && error !== null
        ? (error as {
            code?: unknown;
            status?: unknown;
            message?: unknown;
            details?: unknown;
            hint?: unknown;
            context?: unknown;
          })
        : null;

    return {
      code: typeof candidate?.code === 'string' ? candidate.code : null,
      status: typeof candidate?.status === 'number' ? candidate.status : null,
      message:
        typeof candidate?.message === 'string'
          ? this.sanitizeSnippet(candidate.message)
          : this.sanitizeSnippet(String(error)),
      details:
        typeof candidate?.details === 'string' ? this.sanitizeSnippet(candidate.details) : null,
      hint: typeof candidate?.hint === 'string' ? this.sanitizeSnippet(candidate.hint) : null,
      bodySnippet: this.extractBodySnippet(candidate?.context),
    };
  }

  private extractBodySnippet(context: unknown): string | null {
    if (typeof context === 'string') return this.sanitizeSnippet(context);
    if (!context || typeof context !== 'object') return null;
    try {
      return this.sanitizeSnippet(JSON.stringify(context));
    } catch {
      return null;
    }
  }

  private sanitizeSnippet(value: string): string {
    return value.replace(/\s+/g, ' ').trim().slice(0, 300);
  }

  private resolveMediaType(mimeType: string): MediaType {
    if (PHOTO_MIME_TYPES.has(mimeType)) return 'photo';
    if (VIDEO_MIME_TYPES.has(mimeType)) return 'video';
    return 'document';
  }

  private resolveLocationStatus(mediaType: MediaType, coords?: ExifCoords): LocationStatus {
    if (coords) return 'gps';
    return mediaType === 'document' ? 'no_gps' : 'unresolved';
  }
}
