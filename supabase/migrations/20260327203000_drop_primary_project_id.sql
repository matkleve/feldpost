-- =============================================================================
-- Hard cut: remove "primary project" concept entirely.
--
-- Domain model:
-- - Media belongs to 0..n projects via public.media_projects.
-- - There is no primary/owner project field on media_items.
-- =============================================================================

-- 1) Drop any triggers/functions/indexes referencing primary_project_id.
DROP TRIGGER IF EXISTS trg_media_items_primary_project_same_org ON public.media_items;
DROP FUNCTION IF EXISTS public.enforce_media_item_primary_project_same_org();

DROP INDEX IF EXISTS public.idx_media_items_org_primary_project;

-- Drop dependent view before dropping the column.
DROP VIEW IF EXISTS public.v_media_backfill_audit;

-- 2) Drop the column itself.
ALTER TABLE public.media_items
  DROP COLUMN IF EXISTS primary_project_id;

-- 3) Rewrite RPCs/views that used primary project fallback.

-- P3 contract versions with media_item_id field.
CREATE OR REPLACE FUNCTION public.cluster_images(
  p_cluster_lat numeric,
  p_cluster_lng numeric,
  p_zoom integer
)
RETURNS TABLE(
  image_id uuid,
  media_item_id uuid,
  latitude numeric,
  longitude numeric,
  thumbnail_path text,
  storage_path text,
  captured_at timestamp with time zone,
  created_at timestamp with time zone,
  project_id uuid,
  project_name text,
  project_ids uuid[],
  project_names text[],
  direction numeric,
  exif_latitude numeric,
  exif_longitude numeric,
  address_label text,
  city text,
  district text,
  street text,
  country text,
  user_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH grid AS (
    SELECT
      CASE
        WHEN p_zoom >= 19 THEN 0::numeric
        ELSE (80.0 * 360.0) / (256.0 * power(2, p_zoom))
      END AS cell_size
  ),
  snapped_input AS (
    SELECT
      CASE WHEN g.cell_size > 0
        THEN ROUND(p_cluster_lat / g.cell_size) * g.cell_size
        ELSE p_cluster_lat
      END AS snap_lat,
      CASE WHEN g.cell_size > 0
        THEN ROUND(p_cluster_lng / g.cell_size) * g.cell_size
        ELSE p_cluster_lng
      END AS snap_lng
    FROM grid g
  )
  SELECT
    COALESCE(m.source_image_id, m.id) AS image_id,
    m.id AS media_item_id,
    m.latitude,
    m.longitude,
    m.thumbnail_path,
    m.storage_path,
    m.captured_at,
    m.created_at,
    mp.project_ids[1] AS project_id,
    mp.project_names[1] AS project_name,
    COALESCE(mp.project_ids, '{}'::uuid[]) AS project_ids,
    COALESCE(mp.project_names, '{}'::text[]) AS project_names,
    NULL::numeric AS direction,
    m.exif_latitude,
    m.exif_longitude,
    m.address_label,
    m.city,
    m.district,
    m.street,
    m.country,
    pr.full_name AS user_name
  FROM public.media_items m
  CROSS JOIN grid g
  CROSS JOIN snapped_input si
  LEFT JOIN LATERAL (
    SELECT
      array_agg(p.id ORDER BY p.name) AS project_ids,
      array_agg(p.name ORDER BY p.name) AS project_names
    FROM public.media_projects mp
    JOIN public.projects p ON p.id = mp.project_id
    WHERE mp.media_item_id = m.id
  ) mp ON TRUE
  LEFT JOIN public.profiles pr ON pr.id = m.created_by
  WHERE m.organization_id = public.user_org_id()
    AND m.media_type = 'image'
    AND m.latitude IS NOT NULL
    AND m.longitude IS NOT NULL
    AND (
      (g.cell_size > 0 AND
       ROUND(m.latitude  / g.cell_size) * g.cell_size = si.snap_lat AND
       ROUND(m.longitude / g.cell_size) * g.cell_size = si.snap_lng)
      OR
      (g.cell_size = 0 AND
       ROUND(m.latitude, 7) = p_cluster_lat AND
       ROUND(m.longitude, 7) = p_cluster_lng)
    )
  ORDER BY COALESCE(m.captured_at, m.created_at) DESC
  LIMIT 500;
$function$;

-- Backfill audit view should not reference primary_project_id.
CREATE OR REPLACE VIEW public.v_media_backfill_audit AS
SELECT
  m.organization_id,
  count(*) FILTER (WHERE m.storage_path IS NOT NULL) AS images_with_storage,
  count(*) FILTER (WHERE m.storage_path IS NOT NULL) AS images_eligible_for_media_items,
  count(*) FILTER (WHERE m.storage_path IS NOT NULL) AS images_backfilled_to_media_items,
  0::bigint AS missing_media_items,
  count(*) FILTER (WHERE m.storage_path IS NULL) AS photoless_images_skipped
FROM public.media_items m
WHERE m.media_type = 'image'
GROUP BY m.organization_id;

