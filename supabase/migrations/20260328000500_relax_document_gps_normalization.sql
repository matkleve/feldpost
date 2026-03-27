-- =============================================================================
-- Relax document GPS normalization to support bidirectional geocode enrichment
-- =============================================================================
-- Problem:
-- - Legacy normalization forced document rows to gps_assignment_allowed=false.
-- - Any coordinate write on those rows then failed in gps assignment policy trigger.
--
-- Outcome:
-- - Keep caller-provided gps_assignment_allowed value intact.
-- - Policy trigger still blocks writes only when assignment stays disabled.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.normalize_media_item_gps_assignment_allowed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RETURN NEW;
END;
$$;
