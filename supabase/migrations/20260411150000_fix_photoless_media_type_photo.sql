-- =============================================================================
-- Fix photoless conflict detection to use canonical media_type='photo'
-- =============================================================================
-- Why:
-- - media_items enforces media_type IN ('photo','video','document').
-- - The previous photoless migration used media_type='image' in index/function filters.
-- - This follow-up migration restores runtime alignment without destructive changes.
-- =============================================================================

-- Rebuild photoless lookup index with canonical media_type predicate.
DROP INDEX IF EXISTS public.idx_media_items_photoless_lookup;

CREATE INDEX IF NOT EXISTS idx_media_items_photoless_lookup
  ON public.media_items (organization_id, created_at)
  WHERE media_type = 'photo' AND storage_path IS NULL;

-- Recreate conflict RPC with canonical media_type='photo'.
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
  SELECT
    m.id,
    m.address_label,
    m.latitude::double precision,
    m.longitude::double precision,
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND m.geog IS NOT NULL
      THEN extensions.ST_Distance(
        m.geog,
        extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
      )
      ELSE NULL
    END AS distance_m
  FROM public.media_items m
  WHERE m.organization_id = p_org_id
    AND m.media_type = 'photo'
    AND m.storage_path IS NULL
    AND (
      (
        p_lat IS NOT NULL
        AND p_lng IS NOT NULL
        AND m.geog IS NOT NULL
        AND extensions.ST_DWithin(
          m.geog,
          extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography,
          50
        )
      )
      OR
      (
        p_address IS NOT NULL
        AND lower(m.address_label) = lower(p_address)
      )
    )
  ORDER BY
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND m.geog IS NOT NULL
      THEN extensions.ST_Distance(
        m.geog,
        extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
      )
      ELSE 0
    END ASC,
    m.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_photoless_conflicts(uuid, double precision, double precision, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_photoless_conflicts(uuid, double precision, double precision, text)
  TO authenticated;
