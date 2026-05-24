-- Smoke checks for 20260524120000_locations_nn_junction.sql
-- Run one statement at a time (Supabase CLI prepared statements reject multi-command files):
--   supabase db query --local "SELECT ..."
--   supabase db query --linked "SELECT ..."
-- Or: bash scripts/run-verify-locations-nn-migration.sh [--local|--linked]

SELECT 'tables' AS check_id, table_name AS detail
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('locations', 'media_item_location_links');

SELECT 'locations_columns' AS check_id, column_name AS detail
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'locations'
  AND column_name IN ('postcode', 'floor', 'address_dedupe_key', 'geog')
ORDER BY column_name;

SELECT 'viewport_markers_signature' AS check_id, pg_get_function_result(p.oid) AS detail
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'viewport_markers';

SELECT 'row_counts' AS check_id,
  (SELECT count(*)::text FROM public.locations) || ' locations, '
  || (SELECT count(*)::text FROM public.media_item_location_links) || ' links, '
  || (SELECT count(*)::text FROM public.media_item_locations) || ' legacy_mil' AS detail;

SELECT 'resolve_media_location_overloads' AS check_id,
  CASE
    WHEN count(*) = 1 THEN 'ok: exactly 1 signature'
    ELSE 'FAIL: ' || count(*)::text || ' signatures — run 20260525210000_drop_resolve_media_location_nine_arg_overload.sql'
  END AS detail
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'resolve_media_location';

SELECT 'resolve_media_location_signature' AS check_id,
  pg_get_function_identity_arguments(p.oid) AS detail
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'resolve_media_location';

SELECT 'update_media_item_location_overloads' AS check_id,
  CASE
    WHEN count(*) = 1 THEN 'ok: exactly 1 signature'
    ELSE 'FAIL: ' || count(*)::text || ' signatures'
  END AS detail
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'update_media_item_location';

SELECT 'viewport_sample' AS check_id,
  'lat=' || cluster_lat::text || ' lng=' || cluster_lng::text
  || ' count=' || image_count::text
  || ' loc=' || coalesce(location_id::text, 'null') AS detail
FROM public.viewport_markers(48.1, 16.2, 48.3, 16.5, 15)
LIMIT 3;
