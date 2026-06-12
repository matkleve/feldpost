-- =============================================================================
-- Final cutover: drop legacy public.images table
-- =============================================================================
-- Preconditions should be satisfied by validate-media-cutover-readiness.sql
-- (no remaining FK/view/function dependencies on public.images).
-- =============================================================================

DROP TABLE IF EXISTS public.images;
