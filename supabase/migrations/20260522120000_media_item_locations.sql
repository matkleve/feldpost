-- =============================================================================
-- Multi-location rows per media item (media_item_locations)
-- Rollback: drop table + functions; legacy media_items columns unchanged.
-- Re-run safe: backfill uses ON CONFLICT DO NOTHING.
-- =============================================================================

-- Sort key helper (derived only; never user-edited)
CREATE OR REPLACE FUNCTION public.build_location_sort_key(p_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $function$
DECLARE
  v_value text;
  v_match text[];
  v_num bigint;
BEGIN
  IF p_raw IS NULL THEN
    RETURN '~~';
  END IF;

  v_value := btrim(p_raw);
  IF v_value = '' THEN
    RETURN '~';
  END IF;

  v_match := regexp_match(v_value, '(\d+)');
  IF v_match IS NOT NULL AND v_match[1] IS NOT NULL THEN
    v_num := v_match[1]::bigint;
    RETURN lpad(v_num::text, 6, '0') || '|' || v_value;
  END IF;

  RETURN '~' || v_value;
END;
$function$;

CREATE TABLE IF NOT EXISTS public.media_item_locations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id       uuid NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  street              text,
  house_number        text,
  staircase           text,
  door                text,
  extra_information   text,
  city                text,
  district            text,
  country             text,
  latitude            numeric(10, 7),
  longitude           numeric(11, 7),
  address_label       text,
  is_primary          boolean NOT NULL DEFAULT false,
  sort_order          integer NOT NULL DEFAULT 0,
  staircase_sort_key  text NOT NULL DEFAULT '~~',
  door_sort_key       text NOT NULL DEFAULT '~~',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_media_item_locations_latitude
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT chk_media_item_locations_longitude
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  CONSTRAINT chk_media_item_locations_lat_lng_pair
    CHECK (
      (latitude IS NULL AND longitude IS NULL)
      OR (latitude IS NOT NULL AND longitude IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_media_item_locations_one_primary
  ON public.media_item_locations(media_item_id)
  WHERE is_primary = true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_media_item_locations_backfill_dedupe
  ON public.media_item_locations(
    media_item_id,
    coalesce(street, ''),
    coalesce(house_number, ''),
    coalesce(staircase, ''),
    coalesce(door, ''),
    coalesce(latitude::text, ''),
    coalesce(longitude::text, '')
  );

CREATE INDEX IF NOT EXISTS idx_media_item_locations_media_sort
  ON public.media_item_locations(media_item_id, sort_order, staircase_sort_key, door_sort_key);

-- Derive sort keys on write
CREATE OR REPLACE FUNCTION public.media_item_locations_set_sort_keys()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.staircase_sort_key := public.build_location_sort_key(NEW.staircase);
  NEW.door_sort_key := public.build_location_sort_key(NEW.door);
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_media_item_locations_sort_keys ON public.media_item_locations;
CREATE TRIGGER trg_media_item_locations_sort_keys
  BEFORE INSERT OR UPDATE ON public.media_item_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.media_item_locations_set_sort_keys();

-- Project primary row -> legacy media_items columns
CREATE OR REPLACE FUNCTION public.sync_media_items_from_primary_location(p_media_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_loc public.media_item_locations%ROWTYPE;
BEGIN
  SELECT *
    INTO v_loc
    FROM public.media_item_locations l
   WHERE l.media_item_id = p_media_item_id
     AND l.is_primary = true
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE public.media_items m
     SET street        = v_loc.street,
         city          = v_loc.city,
         district      = v_loc.district,
         country       = v_loc.country,
         latitude      = v_loc.latitude,
         longitude     = v_loc.longitude,
         address_label = v_loc.address_label,
         location_status = CASE
           WHEN v_loc.latitude IS NOT NULL AND v_loc.longitude IS NOT NULL THEN 'resolved'
           WHEN v_loc.address_label IS NOT NULL OR v_loc.street IS NOT NULL THEN 'resolved'
           ELSE m.location_status
         END,
         updated_at    = now()
   WHERE m.id = p_media_item_id;
END;
$function$;

-- Promote another row when primary deleted
CREATE OR REPLACE FUNCTION public.media_item_locations_promote_primary_on_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_next uuid;
BEGIN
  IF OLD.is_primary = false THEN
    RETURN OLD;
  END IF;

  SELECT l.id
    INTO v_next
    FROM public.media_item_locations l
   WHERE l.media_item_id = OLD.media_item_id
   ORDER BY l.sort_order ASC, l.staircase_sort_key ASC, l.door_sort_key ASC, l.created_at ASC
   LIMIT 1;

  IF v_next IS NOT NULL THEN
    UPDATE public.media_item_locations
       SET is_primary = true
     WHERE id = v_next;
  END IF;

  PERFORM public.sync_media_items_from_primary_location(OLD.media_item_id);
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_media_item_locations_promote_primary ON public.media_item_locations;
CREATE TRIGGER trg_media_item_locations_promote_primary
  AFTER DELETE ON public.media_item_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.media_item_locations_promote_primary_on_delete();

CREATE OR REPLACE FUNCTION public.media_item_locations_sync_projection()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.is_primary THEN
    PERFORM public.sync_media_items_from_primary_location(NEW.media_item_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_media_item_locations_sync_projection ON public.media_item_locations;
CREATE TRIGGER trg_media_item_locations_sync_projection
  AFTER INSERT OR UPDATE OF is_primary, street, city, district, country, latitude, longitude, address_label
  ON public.media_item_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.media_item_locations_sync_projection();

-- RLS
ALTER TABLE public.media_item_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "media_item_locations: org read" ON public.media_item_locations;
CREATE POLICY "media_item_locations: org read"
  ON public.media_item_locations FOR SELECT
  USING (organization_id = public.user_org_id());

DROP POLICY IF EXISTS "media_item_locations: org write" ON public.media_item_locations;
CREATE POLICY "media_item_locations: org write"
  ON public.media_item_locations FOR ALL
  USING (organization_id = public.user_org_id() AND NOT public.is_viewer())
  WITH CHECK (organization_id = public.user_org_id() AND NOT public.is_viewer());

-- list
CREATE OR REPLACE FUNCTION public.list_media_item_locations(
  p_media_item_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS SETOF public.media_item_locations
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT l.*
    FROM public.media_item_locations l
    JOIN public.media_items m ON m.id = l.media_item_id
   WHERE l.media_item_id = p_media_item_id
     AND m.organization_id = public.user_org_id()
   ORDER BY l.sort_order ASC, l.staircase_sort_key ASC, l.door_sort_key ASC, l.created_at ASC
   LIMIT greatest(1, least(coalesce(p_limit, 50), 100))
  OFFSET greatest(coalesce(p_offset, 0), 0);
$function$;

-- add
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
  p_address_label text DEFAULT NULL
)
RETURNS public.media_item_locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_row public.media_item_locations%ROWTYPE;
  v_has_primary boolean;
  v_sort integer;
BEGIN
  SELECT m.organization_id INTO v_org
    FROM public.media_items m
   WHERE m.id = p_media_item_id
     AND m.organization_id = public.user_org_id();

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.media_item_locations l WHERE l.media_item_id = p_media_item_id AND l.is_primary
  ) INTO v_has_primary;

  SELECT coalesce(max(l.sort_order), -1) + 1
    INTO v_sort
    FROM public.media_item_locations l
   WHERE l.media_item_id = p_media_item_id;

  INSERT INTO public.media_item_locations (
    media_item_id, organization_id,
    street, house_number, staircase, door, extra_information,
    city, district, country, latitude, longitude, address_label,
    is_primary, sort_order
  ) VALUES (
    p_media_item_id, v_org,
    p_street, p_house_number, p_staircase, p_door, p_extra_information,
    p_city, p_district, p_country, p_latitude, p_longitude, p_address_label,
    NOT v_has_primary, v_sort
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

-- update
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
  p_address_label text DEFAULT NULL
)
RETURNS public.media_item_locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.media_item_locations%ROWTYPE;
BEGIN
  UPDATE public.media_item_locations l
     SET street            = coalesce(p_street, l.street),
         house_number      = coalesce(p_house_number, l.house_number),
         staircase         = coalesce(p_staircase, l.staircase),
         door              = coalesce(p_door, l.door),
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
         address_label     = coalesce(p_address_label, l.address_label)
   WHERE l.id = p_location_id
     AND l.organization_id = public.user_org_id()
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  RETURN v_row;
END;
$function$;

-- delete
CREATE OR REPLACE FUNCTION public.delete_media_item_location(p_location_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.media_item_locations l
   WHERE l.id = p_location_id
     AND l.organization_id = public.user_org_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  RETURN true;
END;
$function$;

-- set primary
CREATE OR REPLACE FUNCTION public.set_primary_media_item_location(p_location_id uuid)
RETURNS public.media_item_locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.media_item_locations%ROWTYPE;
BEGIN
  SELECT * INTO v_row
    FROM public.media_item_locations l
   WHERE l.id = p_location_id
     AND l.organization_id = public.user_org_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  UPDATE public.media_item_locations
     SET is_primary = false
   WHERE media_item_id = v_row.media_item_id
     AND is_primary = true;

  UPDATE public.media_item_locations
     SET is_primary = true
   WHERE id = p_location_id
  RETURNING * INTO v_row;

  PERFORM public.sync_media_items_from_primary_location(v_row.media_item_id);
  RETURN v_row;
END;
$function$;

-- Idempotent backfill from legacy media_items
INSERT INTO public.media_item_locations (
  media_item_id,
  organization_id,
  street,
  city,
  district,
  country,
  latitude,
  longitude,
  address_label,
  is_primary,
  sort_order
)
SELECT
  m.id,
  m.organization_id,
  m.street,
  m.city,
  m.district,
  m.country,
  m.latitude,
  m.longitude,
  m.address_label,
  true,
  0
FROM public.media_items m
WHERE (
  m.address_label IS NOT NULL
  OR m.street IS NOT NULL
  OR m.city IS NOT NULL
  OR m.district IS NOT NULL
  OR m.country IS NOT NULL
  OR (m.latitude IS NOT NULL AND m.longitude IS NOT NULL)
)
ON CONFLICT DO NOTHING;
