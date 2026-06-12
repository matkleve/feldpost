-- =============================================================================
-- Ensure bidirectional location resolution for all media types
-- =============================================================================
-- Goal:
-- - GPS -> address applies to all media rows with coordinates.
-- - Address -> GPS applies to all media rows with address labels.
-- - Forward geocoding can persist coordinates even when legacy rows have
--   gps_assignment_allowed = false (e.g. document rows from old contracts).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_unresolved_media(p_limit integer DEFAULT 50)
RETURNS TABLE(
  media_item_id uuid,
  image_id uuid,
  latitude numeric,
  longitude numeric,
  address_label text,
  city text,
  district text,
  street text,
  country text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    m.id AS media_item_id,
    COALESCE(m.source_image_id, m.id) AS image_id,
    m.latitude,
    m.longitude,
    m.address_label,
    m.city,
    m.district,
    m.street,
    m.country
  FROM public.media_items m
  WHERE m.organization_id = public.user_org_id()
    AND (
      (
        m.latitude IS NOT NULL AND m.longitude IS NOT NULL
        AND (
          m.address_label IS NULL
          OR m.city IS NULL
          OR m.district IS NULL
          OR m.street IS NULL
          OR m.country IS NULL
        )
      )
      OR
      (
        (m.latitude IS NULL OR m.longitude IS NULL)
        AND m.address_label IS NOT NULL
      )
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit;
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
     SET latitude               = COALESCE(p_latitude, m.latitude),
         longitude              = COALESCE(p_longitude, m.longitude),
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
         location_status        = 'resolved',
         updated_at             = now()
   WHERE m.organization_id = _org_id
     AND (
       m.id = p_media_item_id
       OR m.source_image_id = p_media_item_id
     );

  RETURN FOUND;
END;
$function$;
