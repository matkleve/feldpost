-- NF-40: store explicit address precision on locations; extend resolve_media_location
-- for text-first upload persist (house number + precision metadata).
-- @see docs/specs/service/media-upload-service/address-resolution-model.md § Address precision principle
-- UNVERIFIED: no database in agent environment — apply via supabase db push locally.

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS address_precision text;

ALTER TABLE public.locations
  DROP CONSTRAINT IF EXISTS chk_locations_address_precision;

ALTER TABLE public.locations
  ADD CONSTRAINT chk_locations_address_precision
  CHECK (
    address_precision IS NULL
    OR address_precision IN (
      'country', 'state', 'postcode', 'city', 'street', 'houseNumber'
    )
  );

CREATE OR REPLACE FUNCTION public.find_or_create_location(
  p_street text DEFAULT NULL,
  p_house_number text DEFAULT NULL,
  p_staircase text DEFAULT NULL,
  p_door text DEFAULT NULL,
  p_floor text DEFAULT NULL,
  p_postcode text DEFAULT NULL,
  p_extra_information text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_address_label text DEFAULT NULL,
  p_address_precision text DEFAULT NULL
)
RETURNS public.locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_org uuid;
  v_key text;
  v_row public.locations%ROWTYPE;
BEGIN
  v_org := public.user_org_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  v_key := public.compute_location_address_dedupe_key(
    p_street, p_house_number, p_staircase, p_door, p_postcode,
    p_city, p_district, p_country, p_latitude, p_longitude
  );

  INSERT INTO public.locations (
    organization_id,
    street, house_number, staircase, door, floor, postcode, extra_information,
    city, district, country, latitude, longitude, address_label,
    address_dedupe_key, address_precision
  ) VALUES (
    v_org,
    p_street, p_house_number, p_staircase, p_door, p_floor, p_postcode, p_extra_information,
    p_city, p_district, p_country, p_latitude, p_longitude, p_address_label,
    v_key, p_address_precision
  )
  ON CONFLICT (organization_id, address_dedupe_key) DO UPDATE
    SET street            = COALESCE(EXCLUDED.street, locations.street),
        house_number      = COALESCE(EXCLUDED.house_number, locations.house_number),
        staircase         = COALESCE(EXCLUDED.staircase, locations.staircase),
        door              = COALESCE(EXCLUDED.door, locations.door),
        floor             = COALESCE(EXCLUDED.floor, locations.floor),
        postcode          = COALESCE(EXCLUDED.postcode, locations.postcode),
        extra_information = COALESCE(EXCLUDED.extra_information, locations.extra_information),
        city              = COALESCE(EXCLUDED.city, locations.city),
        district          = COALESCE(EXCLUDED.district, locations.district),
        country           = COALESCE(EXCLUDED.country, locations.country),
        latitude          = COALESCE(EXCLUDED.latitude, locations.latitude),
        longitude         = COALESCE(EXCLUDED.longitude, locations.longitude),
        address_label     = COALESCE(EXCLUDED.address_label, locations.address_label),
        address_precision = COALESCE(EXCLUDED.address_precision, locations.address_precision),
        updated_at        = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_location(
  p_location_id uuid,
  p_street text DEFAULT NULL,
  p_house_number text DEFAULT NULL,
  p_staircase text DEFAULT NULL,
  p_door text DEFAULT NULL,
  p_floor text DEFAULT NULL,
  p_postcode text DEFAULT NULL,
  p_extra_information text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_address_label text DEFAULT NULL,
  p_address_precision text DEFAULT NULL
)
RETURNS public.locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_row public.locations%ROWTYPE;
  v_old public.locations%ROWTYPE;
BEGIN
  SELECT * INTO v_old
    FROM public.locations l
   WHERE l.id = p_location_id
     AND l.organization_id = public.user_org_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  UPDATE public.locations l
     SET street            = coalesce(p_street, l.street),
         house_number      = coalesce(p_house_number, l.house_number),
         staircase         = coalesce(p_staircase, l.staircase),
         door              = coalesce(p_door, l.door),
         floor             = coalesce(p_floor, l.floor),
         postcode          = coalesce(p_postcode, l.postcode),
         extra_information = coalesce(p_extra_information, l.extra_information),
         city              = coalesce(p_city, l.city),
         district          = coalesce(p_district, l.district),
         country           = coalesce(p_country, l.country),
         latitude          = CASE
           WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN p_latitude
           WHEN p_latitude IS NULL AND p_longitude IS NULL THEN l.latitude
           ELSE l.latitude
         END,
         longitude         = CASE
           WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN p_longitude
           WHEN p_latitude IS NULL AND p_longitude IS NULL THEN l.longitude
           ELSE l.longitude
         END,
         address_label     = coalesce(p_address_label, l.address_label),
         address_precision = coalesce(p_address_precision, l.address_precision)
   WHERE l.id = p_location_id
     AND l.organization_id = public.user_org_id()
  RETURNING * INTO v_row;

  RETURN v_row;
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
  p_country text DEFAULT NULL::text,
  p_location_status text DEFAULT NULL::text,
  p_postcode text DEFAULT NULL::text,
  p_house_number text DEFAULT NULL::text,
  p_address_precision text DEFAULT NULL::text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _org_id uuid;
  _media_id uuid;
  v_primary_loc_id uuid;
  v_loc public.locations%ROWTYPE;
BEGIN
  SELECT organization_id, id
    INTO _org_id, _media_id
    FROM public.media_items m
   WHERE m.organization_id = public.user_org_id()
     AND (m.id = p_media_item_id OR m.source_image_id = p_media_item_id)
   LIMIT 1;

  IF _org_id IS NULL THEN
    RAISE EXCEPTION 'User profile or organization not found';
  END IF;

  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL
     OR p_address_label IS NOT NULL
     OR p_street IS NOT NULL
     OR p_city IS NOT NULL THEN
    SELECT l.id
      INTO v_primary_loc_id
      FROM public.media_item_location_links k
      JOIN public.locations l ON l.id = k.location_id
     WHERE k.media_item_id = _media_id
     ORDER BY k.sort_order ASC, k.created_at ASC
     LIMIT 1;

    IF v_primary_loc_id IS NOT NULL THEN
      v_loc := public.update_location(
        v_primary_loc_id,
        p_street, p_house_number, NULL, NULL, NULL, p_postcode, NULL,
        p_city, p_district, p_country, p_latitude, p_longitude, p_address_label,
        p_address_precision
      );
    ELSE
      v_loc := public.find_or_create_location(
        p_street, p_house_number, NULL, NULL, NULL, p_postcode, NULL,
        p_city, p_district, p_country, p_latitude, p_longitude, p_address_label,
        p_address_precision
      );
      PERFORM public.link_media_to_location(_media_id, v_loc.id);
    END IF;
  END IF;

  UPDATE public.media_items m
     SET gps_assignment_allowed = CASE
           WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN true
           ELSE m.gps_assignment_allowed
         END,
         location_status = CASE
           WHEN p_location_status IN ('pending', 'resolved', 'unresolvable')
             THEN p_location_status
           WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN 'resolved'
           WHEN p_address_label IS NOT NULL THEN 'resolved'
           ELSE 'unresolvable'
         END,
         updated_at = now()
   WHERE m.id = _media_id;

  RETURN FOUND;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.find_or_create_location(
  text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_location(
  uuid, text, text, text, text, text, text, text, text, text, text, numeric, numeric, text, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_media_location(
  uuid, numeric, numeric, text, text, text, text, text, text, text, text, text
) TO authenticated;
