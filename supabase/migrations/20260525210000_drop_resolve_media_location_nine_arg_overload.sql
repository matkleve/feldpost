-- =============================================================================
-- Drop stale 9-arg resolve_media_location (no p_postcode)
-- =============================================================================
-- After 20260525130000 the canonical signature is 10-arg (includes p_postcode).
-- The prior 9-arg overload remains callable and makes PostgREST/RPC resolution
-- ambiguous when callers omit p_postcode (common in upload + detail paths).
--
-- Keep: resolve_media_location(uuid, numeric, numeric, text × 7) — 10 parameters.
-- @see scripts/verify-locations-nn-migration.sql (overload count assertion)
-- =============================================================================

DROP FUNCTION IF EXISTS public.resolve_media_location(
  uuid,
  numeric,
  numeric,
  text,
  text,
  text,
  text,
  text,
  text
);

-- Re-assert execute grant on the canonical 10-arg function (idempotent).
GRANT EXECUTE ON FUNCTION public.resolve_media_location(
  uuid, numeric, numeric, text, text, text, text, text, text, text
) TO authenticated;
