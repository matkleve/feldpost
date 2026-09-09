-- =============================================================================
-- find_photoless_conflicts: derive org scope server-side instead of trusting
-- a caller-supplied p_org_id.
-- =============================================================================
-- The prior signature accepted p_org_id as an argument to a SECURITY DEFINER
-- function granted to every authenticated user, and filtered the photoless
-- candidate set on that parameter without ever comparing it to the caller's
-- own organization. Because SECURITY DEFINER bypasses RLS, p_org_id was the
-- only tenant boundary the function had -- any authenticated user could pass
-- an arbitrary organization_id and read that org's photoless media
-- coordinates and address labels (one row per call, LIMIT 1).
--
-- Every other RPC the upload path calls (resolve_media_location,
-- check_dedup_hashes, get_location_by_address_components, ...) derives the
-- tenant from public.user_org_id() rather than accepting it as an argument.
-- This migration brings find_photoless_conflicts in line and removes the
-- parameter entirely so the class of bug is unrepresentable, rather than
-- adding a check that a future edit could drop again.
--
-- @see docs/audits/upload-process-analysis-2026-09-08/08-data-security.md § 5 (UP-01)
-- @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md (UP-01)
-- =============================================================================

DROP FUNCTION IF EXISTS public.find_photoless_conflicts(uuid, double precision, double precision, text);

CREATE FUNCTION public.find_photoless_conflicts(
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
    WHERE m.organization_id = public.user_org_id()
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

REVOKE ALL ON FUNCTION public.find_photoless_conflicts(double precision, double precision, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_photoless_conflicts(double precision, double precision, text)
  TO authenticated;
