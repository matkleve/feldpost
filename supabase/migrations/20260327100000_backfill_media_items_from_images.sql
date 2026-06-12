-- =============================================================================
-- Backfill media_items + media_projects from legacy images/image_projects.
--
-- Goals:
-- 1) Create one media_items shadow row per photo row in images.
-- 2) Preserve/derive primary project ownership for every inserted media item.
-- 3) Backfill memberships from image_projects and images.project_id.
-- 4) Provide an audit view for rollout visibility.
--
-- Notes:
-- - Idempotent: safe to re-run.
-- - Photoless legacy rows (images.storage_path IS NULL) are intentionally skipped,
--   because media_items.storage_path is currently NOT NULL.
-- =============================================================================

WITH default_projects AS (
  SELECT DISTINCT ON (p.organization_id)
    p.organization_id,
    p.id AS fallback_project_id
  FROM public.projects p
  ORDER BY p.organization_id, (p.archived_at IS NOT NULL), p.created_at, p.id
),
images_for_backfill AS (
  SELECT
    i.id AS image_id,
    i.organization_id,
    i.user_id,
    COALESCE(i.project_id, dp.fallback_project_id) AS primary_project_id,
    i.storage_path,
    i.thumbnail_path,
    i.captured_at,
    i.created_at,
    i.exif_latitude,
    i.exif_longitude,
    i.latitude,
    i.longitude,
    i.location_unresolved,
    o.metadata AS storage_metadata
  FROM public.images i
  LEFT JOIN default_projects dp
    ON dp.organization_id = i.organization_id
  LEFT JOIN storage.objects o
    ON o.bucket_id = 'images'
   AND o.name = i.storage_path
  WHERE i.storage_path IS NOT NULL
)
INSERT INTO public.media_items (
  organization_id,
  primary_project_id,
  created_by,
  media_type,
  mime_type,
  storage_path,
  thumbnail_path,
  poster_path,
  file_name,
  file_size_bytes,
  captured_at,
  duration_ms,
  page_count,
  exif_latitude,
  exif_longitude,
  latitude,
  longitude,
  location_status,
  gps_assignment_allowed,
  source_image_id,
  created_at,
  updated_at
)
SELECT
  c.organization_id,
  c.primary_project_id,
  c.user_id,
  'photo'::text AS media_type,
  CASE lower(split_part(c.storage_path, '.', array_length(string_to_array(c.storage_path, '.'), 1)))
    WHEN 'jpg' THEN 'image/jpeg'
    WHEN 'jpeg' THEN 'image/jpeg'
    WHEN 'png' THEN 'image/png'
    WHEN 'webp' THEN 'image/webp'
    WHEN 'gif' THEN 'image/gif'
    WHEN 'bmp' THEN 'image/bmp'
    WHEN 'heic' THEN 'image/heic'
    WHEN 'heif' THEN 'image/heif'
    WHEN 'tif' THEN 'image/tiff'
    WHEN 'tiff' THEN 'image/tiff'
    ELSE 'application/octet-stream'
  END AS mime_type,
  c.storage_path,
  c.thumbnail_path,
  NULL::text AS poster_path,
  regexp_replace(c.storage_path, '^.*/', '') AS file_name,
  COALESCE(
    NULLIF(
      CASE
        WHEN (c.storage_metadata ->> 'size') ~ '^[0-9]+$'
          THEN (c.storage_metadata ->> 'size')::bigint
        ELSE NULL
      END,
      0
    ),
    1::bigint
  ) AS file_size_bytes,
  c.captured_at,
  NULL::integer AS duration_ms,
  NULL::integer AS page_count,
  c.exif_latitude,
  c.exif_longitude,
  CASE WHEN c.latitude IS NOT NULL AND c.longitude IS NOT NULL THEN c.latitude ELSE NULL END,
  CASE WHEN c.latitude IS NOT NULL AND c.longitude IS NOT NULL THEN c.longitude ELSE NULL END,
  CASE
    WHEN c.latitude IS NOT NULL AND c.longitude IS NOT NULL THEN 'gps'
    WHEN COALESCE(c.location_unresolved, false) THEN 'unresolved'
    ELSE 'no_gps'
  END::text AS location_status,
  true AS gps_assignment_allowed,
  c.image_id AS source_image_id,
  c.created_at,
  now() AS updated_at
FROM images_for_backfill c
WHERE c.primary_project_id IS NOT NULL
ON CONFLICT (source_image_id)
DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  primary_project_id = EXCLUDED.primary_project_id,
  created_by = EXCLUDED.created_by,
  media_type = EXCLUDED.media_type,
  mime_type = EXCLUDED.mime_type,
  storage_path = EXCLUDED.storage_path,
  thumbnail_path = EXCLUDED.thumbnail_path,
  poster_path = EXCLUDED.poster_path,
  file_name = EXCLUDED.file_name,
  file_size_bytes = EXCLUDED.file_size_bytes,
  captured_at = EXCLUDED.captured_at,
  duration_ms = EXCLUDED.duration_ms,
  page_count = EXCLUDED.page_count,
  exif_latitude = EXCLUDED.exif_latitude,
  exif_longitude = EXCLUDED.exif_longitude,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  location_status = EXCLUDED.location_status,
  gps_assignment_allowed = EXCLUDED.gps_assignment_allowed,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- Backfill memberships from both legacy sources:
-- - images.project_id (legacy primary link)
-- - image_projects join table
-- -----------------------------------------------------------------------------
WITH legacy_memberships AS (
  SELECT i.id AS image_id, i.project_id
  FROM public.images i
  WHERE i.project_id IS NOT NULL

  UNION

  SELECT ip.image_id, ip.project_id
  FROM public.image_projects ip
),
resolved_media_items AS (
  SELECT m.id AS media_item_id, m.organization_id, m.source_image_id
  FROM public.media_items m
  WHERE m.source_image_id IS NOT NULL
)
INSERT INTO public.media_projects (media_item_id, project_id)
SELECT
  r.media_item_id,
  lm.project_id
FROM legacy_memberships lm
JOIN resolved_media_items r
  ON r.source_image_id = lm.image_id
JOIN public.projects p
  ON p.id = lm.project_id
 AND p.organization_id = r.organization_id
ON CONFLICT (media_item_id, project_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- Rollout audit view
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_media_backfill_audit AS
WITH default_projects AS (
  SELECT DISTINCT ON (p.organization_id)
    p.organization_id,
    p.id AS fallback_project_id
  FROM public.projects p
  ORDER BY p.organization_id, (p.archived_at IS NOT NULL), p.created_at, p.id
),
eligible_images AS (
  SELECT
    i.id,
    i.organization_id,
    i.storage_path,
    COALESCE(i.project_id, dp.fallback_project_id) AS resolved_primary_project_id
  FROM public.images i
  LEFT JOIN default_projects dp
    ON dp.organization_id = i.organization_id
)
SELECT
  e.organization_id,
  COUNT(*) FILTER (WHERE e.storage_path IS NOT NULL) AS images_with_storage,
  COUNT(*) FILTER (
    WHERE e.storage_path IS NOT NULL
      AND e.resolved_primary_project_id IS NOT NULL
  ) AS images_eligible_for_media_items,
  COUNT(*) FILTER (
    WHERE e.storage_path IS NOT NULL
      AND e.resolved_primary_project_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.media_items m
        WHERE m.source_image_id = e.id
      )
  ) AS images_backfilled_to_media_items,
  COUNT(*) FILTER (
    WHERE e.storage_path IS NOT NULL
      AND e.resolved_primary_project_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.media_items m
        WHERE m.source_image_id = e.id
      )
  ) AS missing_media_items,
  COUNT(*) FILTER (WHERE e.storage_path IS NULL) AS photoless_images_skipped
FROM eligible_images e
GROUP BY e.organization_id;
