-- =============================================================================
-- Fix media_item_locations shim RPCs: RETURN (SELECT many cols) is invalid in PL/pgSQL
-- =============================================================================
-- PL/pgSQL treats RETURN (subquery) as a scalar expression; multi-column SELECT
-- raises SQLSTATE 42601 "subquery must return only one column".
-- Map pick / row save call update_media_item_location via MediaLocationsService.
--
-- Also drop legacy overloads that still wrote public.media_item_locations (ambiguous
-- with N:N shims when PostgREST omits p_postcode / p_floor).
-- =============================================================================

-- Legacy 12-arg shims (pre postcode/floor) — superseded by N:N implementations.
DROP FUNCTION IF EXISTS public.add_media_item_location(
  uuid,
  text, text, text, text, text, text, text, text,
  numeric, numeric,
  text
);

DROP FUNCTION IF EXISTS public.update_media_item_location(
  uuid,
  text, text, text, text, text, text, text, text,
  numeric, numeric,
  text
);

CREATE OR REPLACE FUNCTION public.add_media_item_location(
  p_media_item_id uuid,
  p_street text DEFAULT NULL,
  p_house_number text DEFAULT NULL,
  p_staircase text DEFAULT NULL,
  p_door text DEFAULT NULL,
  p_extra_information text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_address_label text DEFAULT NULL,
  p_postcode text DEFAULT NULL,
  p_floor text DEFAULT NULL
)
RETURNS public.media_item_locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_loc public.locations%ROWTYPE;
  v_link public.media_item_location_links%ROWTYPE;
  v_out public.media_item_locations%ROWTYPE;
BEGIN
  v_loc := public.find_or_create_location(
    p_street, p_house_number, p_staircase, p_door, p_floor, p_postcode, p_extra_information,
    p_city, p_district, p_country, p_latitude, p_longitude, p_address_label
  );
  v_link := public.link_media_to_location(p_media_item_id, v_loc.id);

  SELECT
    loc.id,
    v_link.media_item_id,
    loc.organization_id,
    loc.street,
    loc.house_number,
    loc.staircase,
    loc.door,
    loc.extra_information,
    loc.city,
    loc.district,
    loc.country,
    loc.latitude,
    loc.longitude,
    loc.address_label,
    false,
    v_link.sort_order,
    loc.staircase_sort_key,
    loc.door_sort_key,
    loc.created_at,
    loc.updated_at
  INTO v_out
  FROM public.locations loc
  WHERE loc.id = v_loc.id;

  RETURN v_out;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_media_item_location(
  p_location_id uuid,
  p_street text DEFAULT NULL,
  p_house_number text DEFAULT NULL,
  p_staircase text DEFAULT NULL,
  p_door text DEFAULT NULL,
  p_extra_information text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL,
  p_address_label text DEFAULT NULL,
  p_postcode text DEFAULT NULL,
  p_floor text DEFAULT NULL
)
RETURNS public.media_item_locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_loc public.locations%ROWTYPE;
  v_out public.media_item_locations%ROWTYPE;
BEGIN
  v_loc := public.update_location(
    p_location_id,
    p_street, p_house_number, p_staircase, p_door, p_floor, p_postcode, p_extra_information,
    p_city, p_district, p_country, p_latitude, p_longitude, p_address_label
  );

  SELECT
    loc.id,
    k.media_item_id,
    loc.organization_id,
    loc.street,
    loc.house_number,
    loc.staircase,
    loc.door,
    loc.extra_information,
    loc.city,
    loc.district,
    loc.country,
    loc.latitude,
    loc.longitude,
    loc.address_label,
    false,
    k.sort_order,
    loc.staircase_sort_key,
    loc.door_sort_key,
    loc.created_at,
    loc.updated_at
  INTO v_out
  FROM public.locations loc
  JOIN public.media_item_location_links k ON k.location_id = loc.id
  WHERE loc.id = v_loc.id
  ORDER BY k.sort_order
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  RETURN v_out;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.add_media_item_location(
  uuid, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_media_item_location(
  uuid, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text
) TO authenticated;
