/**
 * Storage upload + media_items insert for UploadService.uploadFile.
 * @see upload.service.ts uploadFile
 * @see docs/specs/service/media-upload-service/upload-service.md
 */

import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { GeocodingService } from '../../geocoding/geocoding.service';
import { resolveUploadAddress } from '../address-resolution/upload-address-resolve.util';
import { buildMediaStoragePath, uploadToMediaBucket } from './upload-storage-write.util';
import {
  describeUploadPersistError,
  mapUploadStorageError,
  resolveUploadLocationStatus,
} from './upload.service.util';
import type { MediaType } from './upload-file-types';
import type { ExifCoords, FileValidation, ParsedExif, UploadResult } from '../upload.types';

export interface UploadFilePersistDeps {
  getUser: () => User | null;
  /** Resolve the current user's organization_id (cached, see AuthService). */
  getOrganizationId: () => Promise<string | null>;
  validateFile: (file: File) => FileValidation;
  resolveMimeType: (file: File) => string;
  resolveMediaType: (file: File) => MediaType;
  parseExif: (file: File) => Promise<ParsedExif>;
  withAbort: <T extends { abortSignal?: (signal: AbortSignal) => T }>(
    builder: T,
    signal?: AbortSignal,
  ) => T;
  supabaseClient: SupabaseClient;
  geocoding: GeocodingService;
}

export interface UploadFilePersistInput {
  file: File;
  manualCoords?: ExifCoords;
  parsedExif?: ParsedExif;
  projectId?: string;
  abortSignal?: AbortSignal;
  relativePath?: string;
  /** Low-confidence filename/folder address fragments. @see upload-manager-pipeline.md # Action 11c */
  addressNotes?: string[];
  options?: { pendingPartialLocation?: boolean };
}

/**
 * Auth -> validate -> org lookup -> storage upload -> DB write -> async address resolve.
 * @see upload.service.ts uploadFile
 */
export async function persistUploadFile(
  input: UploadFilePersistInput,
  deps: UploadFilePersistDeps,
): Promise<UploadResult> {
  const user = deps.getUser();
  if (!user) {
    return { error: 'Not authenticated.' };
  }

  const validation = deps.validateFile(input.file);
  if (!validation.valid) {
    return { error: validation.error! };
  }

  if (input.abortSignal?.aborted) {
    return { error: 'Upload cancelled by user.' };
  }

  const orgId = await deps.getOrganizationId();
  if (!orgId) {
    return { error: new Error('Profile not found.') };
  }

  const storagePath = buildMediaStoragePath(orgId, user.id, input.file.name);

  if (input.abortSignal?.aborted) {
    return { error: 'Upload cancelled by user.' };
  }

  const storageResult = await uploadFileToStorage(
    input.file,
    storagePath,
    deps,
    input.abortSignal,
  );
  if (storageResult.error) {
    return storageResult;
  }

  return insertUploadMediaRow({
    file: input.file,
    user,
    orgId,
    storagePath,
    manualCoords: input.manualCoords,
    parsedExif: input.parsedExif,
    relativePath: input.relativePath,
    addressNotes: input.addressNotes,
    options: input.options,
    abortSignal: input.abortSignal,
    deps,
  });
}

/** Upload bytes to `media` bucket; rollback path on cancel after upload. */
async function uploadFileToStorage(
  file: File,
  storagePath: string,
  deps: UploadFilePersistDeps,
  abortSignal?: AbortSignal,
): Promise<UploadResult | { error: null }> {
  const { error: storageError } = await uploadToMediaBucket(
    deps.supabaseClient,
    storagePath,
    file,
    deps.resolveMimeType(file),
    abortSignal,
  );

  if (storageError) {
    return { error: mapUploadStorageError(storageError) };
  }

  if (abortSignal?.aborted) {
    await deps.supabaseClient.storage.from('media').remove([storagePath]);
    return { error: 'Upload cancelled by user.' };
  }

  return { error: null };
}

/** Insert media_items row; fire-and-forget geocode when placement coords exist. */
async function insertUploadMediaRow(args: {
  file: File;
  user: User;
  orgId: string;
  storagePath: string;
  manualCoords?: ExifCoords;
  parsedExif?: ParsedExif;
  relativePath?: string;
  addressNotes?: string[];
  options?: { pendingPartialLocation?: boolean };
  abortSignal?: AbortSignal;
  deps: UploadFilePersistDeps;
}): Promise<UploadResult> {
  const { file, user, orgId, storagePath, manualCoords, parsedExif, relativePath, addressNotes, options, abortSignal, deps } =
    args;

  const parsed = parsedExif ?? (await deps.parseExif(file));
  const metadataExifCoords = parsed.coords;
  const { capturedAt, direction } = parsed;

  /** Placement from job.coords (manualCoords); EXIF columns always from raw metadata. */
  const finalCoords: ExifCoords | undefined = manualCoords;

  const mediaType = deps.resolveMediaType(file);
  const locationStatus = resolveUploadLocationStatus(mediaType, finalCoords, {
    pendingPartial: options?.pendingPartialLocation,
  });
  const gpsAssignmentAllowed = mediaType !== 'document' || finalCoords != null;

  const mediaInsertQuery = deps.supabaseClient
    .from('media_items')
    .insert({
      organization_id: orgId,
      created_by: user.id,
      media_type: mediaType,
      mime_type: file.type,
      storage_path: storagePath,
      original_filename: file.name,
      relative_path: relativePath ?? null,
      file_size_bytes: file.size,
      captured_at: capturedAt ?? null,
      exif_latitude: metadataExifCoords?.lat ?? null,
      exif_longitude: metadataExifCoords?.lng ?? null,
      exif_raw: parsed.exifRaw ?? null,
      location_status: locationStatus,
      gps_assignment_allowed: gpsAssignmentAllowed,
      address_notes: addressNotes?.length ? addressNotes : [],
    })
    .select('id');

  const { data: mediaRow, error: dbError } = await deps
    .withAbort(mediaInsertQuery, abortSignal)
    .single();

  if (dbError) {
    return { error: dbError };
  }

  if (abortSignal?.aborted) {
    await deps.supabaseClient.storage.from('media').remove([storagePath]);
    await deps.supabaseClient
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
      geocoding: deps.geocoding,
      supabaseClient: deps.supabaseClient,
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
