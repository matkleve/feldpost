-- =============================================================================
-- Performance optimization:
-- 1) viewport_markers: use geog + ST_Intersects to leverage GiST index
-- 2) cluster_images_multi: fetch multiple cluster cells in one RPC call
-- =============================================================================

CREATE OR REPLACE FUNCTION public.viewport_markers(
  min_lat numeric,
  min_lng numeric,
  max_lat numeric,
  max_lng numeric,
  zoom     int
)
RETURNS TABLE (
  cluster_lat    numeric,
  cluster_lng    numeric,
  image_count    bigint,
  image_id       uuid,
  direction      numeric,
  storage_path   text,
  thumbnail_path text,
  exif_latitude  numeric,
  exif_longitude numeric,
  created_at     timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, extensions
AS $$
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
      i.id,
      i.latitude,
      i.longitude,
      i.direction    AS dir,
      i.storage_path AS s_path,
      i.thumbnail_path AS t_path,
      i.exif_latitude  AS exif_lat,
      i.exif_longitude AS exif_lng,
      i.created_at     AS c_at,
      CASE WHEN g.cell_size > 0
        THEN ROUND(i.latitude  / g.cell_size) * g.cell_size
        ELSE i.latitude
      END AS snap_lat,
      CASE WHEN g.cell_size > 0
        THEN ROUND(i.longitude / g.cell_size) * g.cell_size
        ELSE i.longitude
      END AS snap_lng
    FROM public.images i, grid g
    WHERE i.organization_id = public.user_org_id()
      AND i.geog IS NOT NULL
      AND extensions.ST_Intersects(i.geog, g.viewport_geog)
  ),
  clustered AS (
    SELECT
      snap_lat,
      snap_lng,
      COUNT(*)                           AS cnt,
      CASE WHEN COUNT(*) = 1 THEN MIN(id::text)::uuid END AS single_id,
      CASE WHEN COUNT(*) = 1 THEN MIN(dir)       END AS single_dir,
      CASE WHEN COUNT(*) = 1 THEN MIN(s_path)    END AS single_s_path,
      CASE WHEN COUNT(*) = 1 THEN MIN(t_path)    END AS single_t_path,
      CASE WHEN COUNT(*) = 1 THEN MIN(exif_lat)  END AS single_exif_lat,
      CASE WHEN COUNT(*) = 1 THEN MIN(exif_lng)  END AS single_exif_lng,
      CASE WHEN COUNT(*) = 1 THEN MIN(c_at)      END AS single_c_at,
      CASE WHEN COUNT(*) > 1 THEN MIN(dir)       END AS cluster_dir,
      AVG(latitude)  AS avg_lat,
      AVG(longitude) AS avg_lng
    FROM filtered
    GROUP BY snap_lat, snap_lng
  )
  SELECT
    ROUND(avg_lat, 7)                                           AS cluster_lat,
    ROUND(avg_lng, 7)                                           AS cluster_lng,
    cnt                                                         AS image_count,
    single_id                                                   AS image_id,
    COALESCE(single_dir, cluster_dir)                           AS direction,
    single_s_path                                               AS storage_path,
    single_t_path                                               AS thumbnail_path,
    single_exif_lat                                             AS exif_latitude,
    single_exif_lng                                             AS exif_longitude,
    single_c_at                                                 AS created_at
  FROM clustered
  ORDER BY cnt DESC, cluster_lat, cluster_lng
  LIMIT 2000;
$$;

CREATE OR REPLACE FUNCTION public.cluster_images_multi(
  p_cells jsonb,
  p_zoom  int
)
RETURNS TABLE (
  image_id       uuid,
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
  SELECT DISTINCT ON (expanded.image_id)
    expanded.image_id,
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
  ORDER BY expanded.image_id, COALESCE(expanded.captured_at, expanded.created_at) DESC;
$$;

GRANT EXECUTE ON FUNCTION public.cluster_images_multi(jsonb, int) TO authenticated;
