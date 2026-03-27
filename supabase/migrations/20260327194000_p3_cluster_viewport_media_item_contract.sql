-- =============================================================================
-- P3: cluster/viewport RPC contract emits media_item_id (compat keep image_id)
-- =============================================================================
-- Goals:
-- 1) Extend cluster_images, cluster_images_multi, viewport_markers with media_item_id.
-- 2) Keep existing image_id output for compatibility during app rollout.
-- 3) Prefer canonical media_items.id in new contract field.
-- =============================================================================

DROP FUNCTION IF EXISTS public.cluster_images_multi(jsonb, int);
DROP FUNCTION IF EXISTS public.cluster_images(numeric, numeric, integer);
DROP FUNCTION IF EXISTS public.viewport_markers(numeric, numeric, numeric, numeric, integer);

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

CREATE OR REPLACE FUNCTION public.cluster_images_multi(
  p_cells jsonb,
  p_zoom  int
)
RETURNS TABLE (
  image_id       uuid,
  media_item_id  uuid,
  latitude       numeric,
  longitude      numeric,
  thumbnail_path text,
  storage_path   text,
  captured_at    timestamptz,
  created_at     timestamptz,
  project_id     uuid,
  project_name   text,
  project_ids    uuid[],
  project_names  text[],
  direction      numeric,
  exif_latitude  numeric,
  exif_longitude numeric,
  address_label  text,
  city           text,
  district       text,
  street         text,
  country        text,
  user_name      text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH input_cells AS (
    SELECT DISTINCT
      (value->>'lat')::numeric AS lat,
      (value->>'lng')::numeric AS lng
    FROM jsonb_array_elements(COALESCE(p_cells, '[]'::jsonb))
    WHERE (value ? 'lat') AND (value ? 'lng')
  ),
  expanded AS (
    SELECT c.*
    FROM input_cells i
    CROSS JOIN LATERAL public.cluster_images(i.lat, i.lng, p_zoom) c
  )
  SELECT DISTINCT ON (expanded.media_item_id)
    expanded.image_id,
    expanded.media_item_id,
    expanded.latitude,
    expanded.longitude,
    expanded.thumbnail_path,
    expanded.storage_path,
    expanded.captured_at,
    expanded.created_at,
    expanded.project_id,
    expanded.project_name,
    expanded.project_ids,
    expanded.project_names,
    expanded.direction,
    expanded.exif_latitude,
    expanded.exif_longitude,
    expanded.address_label,
    expanded.city,
    expanded.district,
    expanded.street,
    expanded.country,
    expanded.user_name
  FROM expanded
  ORDER BY expanded.media_item_id, COALESCE(expanded.captured_at, expanded.created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION public.viewport_markers(
  min_lat numeric,
  min_lng numeric,
  max_lat numeric,
  max_lng numeric,
  zoom integer
)
RETURNS TABLE(
  cluster_lat numeric,
  cluster_lng numeric,
  image_count bigint,
  image_id uuid,
  media_item_id uuid,
  direction numeric,
  storage_path text,
  thumbnail_path text,
  exif_latitude numeric,
  exif_longitude numeric,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH grid AS (
    SELECT
      CASE
        WHEN zoom >= 19 THEN 0::numeric
        ELSE (80.0 * 360.0) / (256.0 * power(2, zoom))
      END AS cell_size,
      extensions.ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::extensions.geography AS viewport_geog
  ),
  filtered AS (
    SELECT
      m.id,
      m.source_image_id,
      m.latitude,
      m.longitude,
      m.storage_path AS s_path,
      m.thumbnail_path AS t_path,
      m.exif_latitude  AS exif_lat,
      m.exif_longitude AS exif_lng,
      m.created_at     AS c_at,
      CASE WHEN g.cell_size > 0
        THEN ROUND(m.latitude  / g.cell_size) * g.cell_size
        ELSE m.latitude
      END AS snap_lat,
      CASE WHEN g.cell_size > 0
        THEN ROUND(m.longitude / g.cell_size) * g.cell_size
        ELSE m.longitude
      END AS snap_lng
    FROM public.media_items m, grid g
    WHERE m.organization_id = public.user_org_id()
      AND m.media_type = 'image'
      AND m.geog IS NOT NULL
      AND extensions.ST_Intersects(m.geog, g.viewport_geog)
  ),
  clustered AS (
    SELECT
      snap_lat,
      snap_lng,
      COUNT(*) AS cnt,
      CASE WHEN COUNT(*) = 1 THEN MIN(COALESCE(source_image_id, id)::text)::uuid END AS single_id,
      CASE WHEN COUNT(*) = 1 THEN MIN(id::text)::uuid END AS single_media_item_id,
      CASE WHEN COUNT(*) = 1 THEN MIN(s_path) END AS single_s_path,
      CASE WHEN COUNT(*) = 1 THEN MIN(t_path) END AS single_t_path,
      CASE WHEN COUNT(*) = 1 THEN MIN(exif_lat) END AS single_exif_lat,
      CASE WHEN COUNT(*) = 1 THEN MIN(exif_lng) END AS single_exif_lng,
      CASE WHEN COUNT(*) = 1 THEN MIN(c_at) END AS single_c_at,
      AVG(latitude) AS avg_lat,
      AVG(longitude) AS avg_lng
    FROM filtered
    GROUP BY snap_lat, snap_lng
  )
  SELECT
    ROUND(avg_lat, 7) AS cluster_lat,
    ROUND(avg_lng, 7) AS cluster_lng,
    cnt AS image_count,
    single_id AS image_id,
    single_media_item_id AS media_item_id,
    NULL::numeric AS direction,
    single_s_path AS storage_path,
    single_t_path AS thumbnail_path,
    single_exif_lat AS exif_latitude,
    single_exif_lng AS exif_longitude,
    single_c_at AS created_at
  FROM clustered
  ORDER BY cnt DESC, cluster_lat, cluster_lng
  LIMIT 2000;
$function$;

GRANT EXECUTE ON FUNCTION public.cluster_images(numeric, numeric, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cluster_images_multi(jsonb, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.viewport_markers(numeric, numeric, numeric, numeric, integer) TO authenticated;
