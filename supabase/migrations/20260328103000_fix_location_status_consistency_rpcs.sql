-- =============================================================================
-- Fix location status consistency in location resolver RPCs
-- =============================================================================
-- Problem:
-- - `resolve_media_location` and `bulk_update_media_addresses` could persist
--   `location_status = 'resolved'`.
-- - `media_items.location_status` only allows: 'gps', 'no_gps', 'unresolved'.
-- - This caused check constraint violations on address persistence.
--
-- Outcome:
-- - Derive `location_status` from effective coordinate state.
-- - Never persist partial coordinates.
-- - Preserve explicit `no_gps` when no coordinates are present.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.bulk_update_media_addresses(
  p_media_item_ids uuid[],
  p_address_label text,
  p_city text DEFAULT NULL::text,
  p_district text DEFAULT NULL::text,
  p_street text DEFAULT NULL::text,
  p_country text DEFAULT NULL::text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _updated int;
BEGIN
  SELECT organization_id INTO _org_id
    FROM public.profiles
   WHERE id = auth.uid();

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'User profile or organization not found';
  END IF;

  UPDATE public.media_items m
     SET address_label   = p_address_label,
         city            = p_city,
         district        = p_district,
         street          = p_street,
         country         = p_country,
         location_status = CASE
           WHEN m.latitude IS NOT NULL AND m.longitude IS NOT NULL THEN 'gps'
           WHEN m.location_status = 'no_gps' THEN 'no_gps'
           ELSE 'unresolved'
         END,
         updated_at      = now()
   WHERE m.organization_id = _org_id
     AND (
       m.id = ANY(p_media_item_ids)
       OR m.source_image_id = ANY(p_media_item_ids)
     );

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$function$;


CREATE OR REPLACE FUNCTION public.resolve_media_location(
  p_media_item_id uuid,
  p_latitude numeric DEFAULT NULL::numeric,
  p_longitude numeric DEFAULT NULL::numeric,
  p_address_label text DEFAULT NULL::text,
  p_city text DEFAULT NULL::text,
  p_district text DEFAULT NULL::text,
  p_street text DEFAULT NULL::text,
  p_country text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
BEGIN
  SELECT organization_id INTO _org_id
    FROM public.profiles
   WHERE id = auth.uid();

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'User profile or organization not found';
  END IF;

  UPDATE public.media_items m
     SET latitude               = CASE
           WHEN COALESCE(p_latitude, m.latitude) IS NOT NULL
            AND COALESCE(p_longitude, m.longitude) IS NOT NULL
             THEN COALESCE(p_latitude, m.latitude)
           ELSE NULL
         END,
         longitude              = CASE
           WHEN COALESCE(p_latitude, m.latitude) IS NOT NULL
            AND COALESCE(p_longitude, m.longitude) IS NOT NULL
             THEN COALESCE(p_longitude, m.longitude)
           ELSE NULL
         END,
         address_label          = COALESCE(p_address_label, m.address_label),
         city                   = COALESCE(p_city, m.city),
         district               = COALESCE(p_district, m.district),
         street                 = COALESCE(p_street, m.street),
         country                = COALESCE(p_country, m.country),
         gps_assignment_allowed = CASE
           WHEN COALESCE(p_latitude, m.latitude) IS NOT NULL
            AND COALESCE(p_longitude, m.longitude) IS NOT NULL
             THEN true
           ELSE m.gps_assignment_allowed
         END,
         location_status        = CASE
           WHEN COALESCE(p_latitude, m.latitude) IS NOT NULL
            AND COALESCE(p_longitude, m.longitude) IS NOT NULL
             THEN 'gps'
           WHEN m.location_status = 'no_gps' THEN 'no_gps'
           ELSE 'unresolved'
         END,
         updated_at             = now()
   WHERE m.organization_id = _org_id
     AND (
       m.id = p_media_item_id
       OR m.source_image_id = p_media_item_id
     );

  RETURN FOUND;
END;
$function$;
