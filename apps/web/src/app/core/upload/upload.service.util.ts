import * as exifr from 'exifr/dist/lite.esm.js';
import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  PHOTO_MIME_TYPES,
  VIDEO_MIME_TYPES,
} from './upload-file-types';
import type { LocationStatus, MediaType } from './upload-file-types';
import type { ExifCoords, FileValidation, ParsedExif } from './upload.types';

export function resolveUploadMimeType(file: File): string {
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

export function validateUploadFile(file: File): FileValidation {
  if (file.size > MAX_FILE_SIZE) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `"${file.name}" is ${mb} MB - maximum allowed is 25 MB.`,
    };
  }

  const mimeType = resolveUploadMimeType(file);
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return {
      valid: false,
      error: `"${file.name}" has unsupported type "${file.type}". Use JPEG, PNG, HEIC, HEIF, WebP, MP4, MOV, WebM, PDF, DOC, DOCX, ODT, ODG, XLS, XLSX, ODS, PPT, PPTX, ODP, TXT, or CSV.`,
    };
  }
  return { valid: true };
}

export async function parseUploadExif(file: File): Promise<ParsedExif> {
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
    return {};
  }
}

export function isHeicUploadFile(file: File): boolean {
  const type = resolveUploadMimeType(file);
  return type === 'image/heic' || type === 'image/heif';
}

export async function convertHeicToJpegUploadFile(file: File): Promise<File> {
  if (!isHeicUploadFile(file)) {
    return file;
  }

  try {
    const { default: heic2any } = await import('heic2any');
    const convertedBlobMap = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
    const convertedBlob = Array.isArray(convertedBlobMap) ? convertedBlobMap[0] : convertedBlobMap;

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

export function mapUploadStorageError(error: unknown): Error | string {
  const message =
    typeof error === 'string'
      ? error
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : '';

  if (/bucket\s+not\s+found/i.test(message)) {
    return 'Storage bucket "media" is missing in this Supabase project. Create it (or run the storage migration) and retry.';
  }

  return (error as Error | string) ?? 'Storage error.';
}

export function describeUploadPersistError(error: unknown): {
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
        ? sanitizeUploadSnippet(candidate.message)
        : sanitizeUploadSnippet(String(error)),
    details:
      typeof candidate?.details === 'string' ? sanitizeUploadSnippet(candidate.details) : null,
    hint: typeof candidate?.hint === 'string' ? sanitizeUploadSnippet(candidate.hint) : null,
    bodySnippet: extractUploadBodySnippet(candidate?.context),
  };
}

function extractUploadBodySnippet(context: unknown): string | null {
  if (typeof context === 'string') return sanitizeUploadSnippet(context);
  if (!context || typeof context !== 'object') return null;
  try {
    return sanitizeUploadSnippet(JSON.stringify(context));
  } catch {
    return null;
  }
}

function sanitizeUploadSnippet(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 300);
}

export function resolveUploadMediaType(mimeType: string): MediaType {
  if (PHOTO_MIME_TYPES.has(mimeType)) return 'photo';
  if (VIDEO_MIME_TYPES.has(mimeType)) return 'video';
  return 'document';
}

export function resolveUploadLocationStatus(
  mediaType: MediaType,
  coords?: ExifCoords,
): LocationStatus {
  if (coords) return 'gps';
  return mediaType === 'document' ? 'no_gps' : 'unresolved';
}
