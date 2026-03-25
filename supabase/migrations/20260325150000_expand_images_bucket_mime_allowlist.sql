-- =============================================================================
-- Expand images bucket MIME allowlist to match frontend upload validation.
--
-- Why:
-- Frontend UploadService accepts mixed media document formats (Office + ODF),
-- but bucket-level allowed_mime_types may still reject some (for example XLS/XLSX).
-- This migration aligns server-side Storage validation with current app behavior.
-- =============================================================================

UPDATE storage.buckets
SET allowed_mime_types = array[
  -- photos
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'image/tiff',

  -- videos
  'video/mp4',
  'video/quicktime',
  'video/webm',

  -- documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.graphics',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.presentation'
]
WHERE id = 'images';
