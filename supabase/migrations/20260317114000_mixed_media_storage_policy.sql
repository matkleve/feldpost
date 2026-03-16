-- =============================================================================
-- Extend storage bucket MIME allowlist for mixed media uploads
--
-- Existing object path policies remain valid because they scope by:
--   folder[1] = org_id
--   folder[2] = user_id
-- and allow deeper subfolders (photos/videos/documents/thumbs/posters).
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
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]
WHERE id = 'images';
