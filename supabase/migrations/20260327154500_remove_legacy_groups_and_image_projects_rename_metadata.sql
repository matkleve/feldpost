-- =============================================================================
-- Remove legacy groups + image_projects and rename image_metadata -> media_metadata
-- =============================================================================
-- Goals:
-- 1) Remove legacy grouping tables no longer used by product (`saved_groups`, `saved_group_images`).
-- 2) Remove legacy project membership table (`image_projects`) and rely on `media_projects` only.
-- 3) Rename `image_metadata` table to `media_metadata`.
-- 4) Keep `cluster_images()` functional by switching its membership lookup to `media_projects`.
-- =============================================================================

-- 1) Rename metadata table
ALTER TABLE IF EXISTS public.image_metadata RENAME TO media_metadata;

-- 2) Ensure cluster lookup no longer depends on image_projects
CREATE OR REPLACE FUNCTION public.cluster_images(
  p_cluster_lat numeric,
  p_cluster_lng numeric,
  p_zoom integer
)
RETURNS TABLE(
  image_id uuid,
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
    m.latitude,
    m.longitude,
    m.thumbnail_path,
    m.storage_path,
    m.captured_at,
    m.created_at,
    COALESCE(mp.project_ids[1], m.primary_project_id) AS project_id,
    COALESCE(mp.project_names[1], p_fallback.name) AS project_name,
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
  LEFT JOIN public.projects p_fallback ON p_fallback.id = m.primary_project_id
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

-- 3) Drop legacy group tables
DROP TABLE IF EXISTS public.saved_group_images;
DROP TABLE IF EXISTS public.saved_groups;

-- 4) Drop legacy image project membership table
DROP TABLE IF EXISTS public.image_projects;
