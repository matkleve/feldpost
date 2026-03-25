-- =============================================================================
-- Add TXT/CSV MIME types to images bucket allowlist.
--
-- Why:
-- Frontend upload validation now accepts plain text and CSV files.
-- Bucket allowlist must match to avoid storage-level rejects.
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
  'application/vnd.oasis.opendocument.presentation',

  -- text and csv
  'text/plain',
  'text/csv',
  'application/csv'
]
WHERE id = 'images';
