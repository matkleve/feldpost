-- =============================================================================
-- find_photoless_conflicts: coords/address on locations (post N:N), not media_items
-- =============================================================================
-- After 20260525130000_drop_media_items_location_columns, the RPC referenced
-- m.latitude / m.geog on media_items and returned HTTP 400 from PostgREST.

DROP INDEX IF EXISTS public.idx_media_items_photoless_lookup;

CREATE INDEX IF NOT EXISTS idx_media_items_photoless_lookup
  ON public.media_items (organization_id, created_at)
  WHERE media_type = 'photo' AND storage_path IS NULL;

CREATE OR REPLACE FUNCTION public.find_photoless_conflicts(
  p_org_id uuid,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_address text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  address_label text,
  latitude double precision,
  longitude double precision,
  distance_m double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH photoless AS (
    SELECT
      m.id AS media_item_id,
      l.address_label,
      l.latitude,
      l.longitude,
      l.geog
    FROM public.media_items m
    LEFT JOIN LATERAL (
      SELECT
        loc.address_label,
        loc.latitude,
        loc.longitude,
        loc.geog
      FROM public.media_item_location_links k
      INNER JOIN public.locations loc
        ON loc.id = k.location_id
       AND loc.organization_id = m.organization_id
      WHERE k.media_item_id = m.id
        AND k.organization_id = m.organization_id
      ORDER BY k.sort_order ASC, k.created_at ASC
      LIMIT 1
    ) l ON true
    WHERE m.organization_id = p_org_id
      AND m.media_type = 'photo'
      AND m.storage_path IS NULL
  )
  SELECT
    p.media_item_id AS id,
    p.address_label,
    p.latitude::double precision,
    p.longitude::double precision,
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND p.geog IS NOT NULL
      THEN extensions.ST_Distance(
        p.geog,
        extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
      )
      ELSE NULL
    END AS distance_m
  FROM photoless p
  WHERE (
      p_lat IS NOT NULL
      AND p_lng IS NOT NULL
      AND p.geog IS NOT NULL
      AND extensions.ST_DWithin(
        p.geog,
        extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography,
        50
      )
    )
    OR (
      p_address IS NOT NULL
      AND p.address_label IS NOT NULL
      AND lower(trim(p.address_label)) = lower(trim(p_address))
    )
  ORDER BY
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND p.geog IS NOT NULL
      THEN extensions.ST_Distance(
        p.geog,
        extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
      )
      ELSE 0
    END ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_photoless_conflicts(uuid, double precision, double precision, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_photoless_conflicts(uuid, double precision, double precision, text)
  TO authenticated;
