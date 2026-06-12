-- =============================================================================
-- Geocoder Phase 3: geographic clusters for bounded Nominatim viewboxes
-- =============================================================================
-- One row per ST_ClusterDBSCAN group of project media with GPS.
-- DBSCAN eps uses km/111 (approximate). Viewbox padding uses latitude-aware lon pad.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_media_clusters(
  p_project_id uuid,
  p_radius_km double precision DEFAULT 120
)
RETURNS TABLE (
  cluster_id  integer,
  lon_min     double precision,
  lat_min     double precision,
  lon_max     double precision,
  lat_max     double precision,
  media_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH scoped AS (
    SELECT
      m.latitude,
      m.longitude,
      ST_SetSRID(
        ST_MakePoint(m.longitude::double precision, m.latitude::double precision),
        4326
      ) AS geom
    FROM public.media_items m
    INNER JOIN public.media_projects mp
      ON mp.media_item_id = m.id
      AND mp.project_id = p_project_id
    INNER JOIN public.projects pr
      ON pr.id = p_project_id
      AND pr.organization_id = public.user_org_id()
    WHERE m.organization_id = public.user_org_id()
      AND m.latitude IS NOT NULL
      AND m.longitude IS NOT NULL
      AND m.geog IS NOT NULL
  ),
  clustered AS (
    SELECT
      ST_ClusterDBSCAN(
        geom,
        eps := (p_radius_km / 111.0)::float8,
        minpoints := 1
      ) OVER () AS cid,
      latitude,
      longitude
    FROM scoped
  )
  SELECT
    cid::integer AS cluster_id,
    (
      MIN(longitude)
      - (p_radius_km / (111.0 * COS(RADIANS(AVG(latitude)))))
    )::double precision AS lon_min,
    (MIN(latitude) - (p_radius_km / 111.0))::double precision AS lat_min,
    (
      MAX(longitude)
      + (p_radius_km / (111.0 * COS(RADIANS(AVG(latitude)))))
    )::double precision AS lon_max,
    (MAX(latitude) + (p_radius_km / 111.0))::double precision AS lat_max,
    COUNT(*)::integer AS media_count
  FROM clustered
  WHERE cid IS NOT NULL
  GROUP BY cid
$function$;

GRANT EXECUTE ON FUNCTION public.get_media_clusters(uuid, double precision) TO authenticated;
