-- =============================================================================
-- Drop ambiguous 8-arg resolve_media_location overload
-- =============================================================================
-- Problem:
-- - Migrations left two signatures: 8 params and 9 params (with p_location_status).
-- - PostgREST/RPC calls with 8 named args cannot pick a unique overload.
--
-- Outcome:
-- - Keep canonical 9-arg function (p_location_status has default).
-- =============================================================================

DROP FUNCTION IF EXISTS public.resolve_media_location(
  uuid,
  numeric,
  numeric,
  text,
  text,
  text,
  text,
  text
);
