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

export const PHOTO_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
]);

export const VIDEO_MIME_TYPES: ReadonlySet<string> = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

export type MediaType = 'photo' | 'video' | 'document';
export type LocationStatus = 'gps' | 'no_gps' | 'unresolved';
