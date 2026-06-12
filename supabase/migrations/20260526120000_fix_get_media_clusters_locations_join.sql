-- =============================================================================
-- Fix get_media_clusters: coordinates live on locations (N:N), not media_items
-- @see docs/specs/service/location-resolver/search-algorithm-addresses-and-places.md §2.7
-- =============================================================================
-- Post 20260525130000, media_items no longer has latitude/longitude/geog.
-- One cluster point per media item: primary link (lowest sort_order) with GPS.
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
    SELECT DISTINCT ON (m.id)
      m.id AS media_item_id,
      l.latitude,
      l.longitude,
      l.geog::geometry AS geom
    FROM public.media_items m
    INNER JOIN public.media_projects mp
      ON mp.media_item_id = m.id
      AND mp.project_id = p_project_id
    INNER JOIN public.projects pr
      ON pr.id = p_project_id
      AND pr.organization_id = public.user_org_id()
    INNER JOIN public.media_item_location_links k
      ON k.media_item_id = m.id
      AND k.organization_id = m.organization_id
    INNER JOIN public.locations l
      ON l.id = k.location_id
      AND l.organization_id = m.organization_id
    WHERE m.organization_id = public.user_org_id()
      AND l.latitude IS NOT NULL
      AND l.longitude IS NOT NULL
      AND l.geog IS NOT NULL
    ORDER BY m.id, k.sort_order ASC, k.created_at ASC
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
