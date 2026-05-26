-- Read-only location lookup for upload address resolution (pre-upload, no insert).
-- @see docs/specs/service/media-upload-service/upload-address-resolution-pipeline.md

CREATE OR REPLACE FUNCTION public.get_location_by_address_components(
  p_street text DEFAULT NULL,
  p_house_number text DEFAULT NULL,
  p_staircase text DEFAULT NULL,
  p_door text DEFAULT NULL,
  p_postcode text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_country text DEFAULT NULL
)
RETURNS public.locations
LANGUAGE plpgsql
STABLE
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
    RETURN NULL;
  END IF;

  v_key := public.compute_location_address_dedupe_key(
    p_street,
    p_house_number,
    p_staircase,
    p_door,
    p_postcode,
    p_city,
    p_district,
    p_country,
    NULL,
    NULL
  );

  SELECT *
    INTO v_row
    FROM public.locations l
   WHERE l.organization_id = v_org
     AND l.address_dedupe_key = v_key
     AND l.latitude IS NOT NULL
     AND l.longitude IS NOT NULL
   LIMIT 1;

  RETURN v_row;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_location_by_address_components(
  text, text, text, text, text, text, text, text
) TO authenticated;
