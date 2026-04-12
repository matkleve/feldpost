-- =============================================================================
-- Canonical location_status contract: pending | resolved | unresolvable
-- =============================================================================
-- Goals:
-- 1) Migrate legacy statuses (gps/no_gps/unresolved) to canonical values.
-- 2) Align DB constraints with canonical location status semantics.
-- 3) Align resolver RPCs with canonical status lifecycle.
-- 4) Keep get_unresolved_media focused on retry-eligible pending rows.
-- =============================================================================

ALTER TABLE public.media_items
  DROP CONSTRAINT IF EXISTS chk_media_items_location_status;

ALTER TABLE public.media_items
  DROP CONSTRAINT IF EXISTS chk_media_items_location_consistency;

UPDATE public.media_items
SET location_status = CASE location_status
  WHEN 'gps' THEN 'resolved'
  WHEN 'no_gps' THEN 'pending'
  WHEN 'unresolved' THEN 'unresolvable'
  ELSE location_status
END
WHERE location_status IN ('gps', 'no_gps', 'unresolved');

ALTER TABLE public.media_items
  ADD CONSTRAINT chk_media_items_location_status
  CHECK (location_status IN ('pending', 'resolved', 'unresolvable'));

ALTER TABLE public.media_items
  ADD CONSTRAINT chk_media_items_location_consistency
  CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR
    (latitude IS NOT NULL AND longitude IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.validate_media_membership_rules(p_media_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_primary_project_id uuid;
  v_membership_count integer;
  v_has_primary boolean;
BEGIN
  SELECT m.location_status, m.primary_project_id
  INTO v_status, v_primary_project_id
  FROM public.media_items m
  WHERE m.id = p_media_item_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT
    count(*)::int,
    bool_or(mp.project_id = v_primary_project_id)
  INTO v_membership_count, v_has_primary
  FROM public.media_projects mp
  WHERE mp.media_item_id = p_media_item_id;

  IF v_membership_count < 1 THEN
    RAISE EXCEPTION 'media item % must have at least one project membership', p_media_item_id;
  END IF;

  IF coalesce(v_has_primary, false) = false THEN
    RAISE EXCEPTION 'media item % must include its primary project in memberships', p_media_item_id;
  END IF;

  IF v_status IN ('pending', 'unresolvable') AND v_membership_count <> 1 THEN
    RAISE EXCEPTION 'pending/unresolvable media item % must have exactly one project membership', p_media_item_id;
  END IF;

  IF v_status = 'resolved' AND v_membership_count < 1 THEN
    RAISE EXCEPTION 'resolved media item % must have at least one project membership', p_media_item_id;
  END IF;
END;
$$;

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
    AND m.location_status = 'pending'
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
        m.latitude IS NULL
        AND m.longitude IS NULL
        AND m.address_label IS NOT NULL
      )
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit;
$function$;

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
           WHEN p_address_label IS NOT NULL THEN 'resolved'
           WHEN m.location_status = 'resolved' THEN 'resolved'
           ELSE 'unresolvable'
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
  p_country text DEFAULT NULL::text,
  p_location_status text DEFAULT NULL::text
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
           WHEN p_location_status IN ('pending', 'resolved', 'unresolvable')
             THEN p_location_status
           WHEN COALESCE(p_latitude, m.latitude) IS NOT NULL
            AND COALESCE(p_longitude, m.longitude) IS NOT NULL
             THEN 'resolved'
           WHEN COALESCE(p_address_label, m.address_label) IS NOT NULL
             THEN 'resolved'
           ELSE 'unresolvable'
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
