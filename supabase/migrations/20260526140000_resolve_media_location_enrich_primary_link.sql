-- Enrich the primary linked location on resolve (upload / attach) instead of stacking
-- address-only + GPS rows. Merge coords on find_or_create conflict.
-- @see docs/specs/service/media-locations/media-locations-service.md

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
  p_address_label text DEFAULT NULL
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
    address_dedupe_key
  ) VALUES (
    v_org,
    p_street, p_house_number, p_staircase, p_door, p_floor, p_postcode, p_extra_information,
    p_city, p_district, p_country, p_latitude, p_longitude, p_address_label,
    v_key
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
        updated_at        = now()
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
  p_postcode text DEFAULT NULL::text
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
        p_street, NULL, NULL, NULL, NULL, p_postcode, NULL,
        p_city, p_district, p_country, p_latitude, p_longitude, p_address_label
      );
    ELSE
      v_loc := public.find_or_create_location(
        p_street, NULL, NULL, NULL, NULL, p_postcode, NULL,
        p_city, p_district, p_country, p_latitude, p_longitude, p_address_label
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
