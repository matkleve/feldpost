-- =============================================================================
-- N:N locations model: org-scoped `locations` + `media_item_location_links`
-- Backfill from `media_item_locations`; retire primary + projection triggers.
-- viewport_markers v2 reads zoomable links (distinct media in clusters).
-- =============================================================================

-- Dedupe key (excludes floor, extra_information)
CREATE OR REPLACE FUNCTION public.compute_location_address_dedupe_key(
  p_street text,
  p_house_number text,
  p_staircase text,
  p_door text,
  p_postcode text,
  p_city text,
  p_district text,
  p_country text,
  p_latitude numeric,
  p_longitude numeric
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT encode(
    extensions.digest(
      convert_to(
        lower(
          concat_ws(
            '|',
            coalesce(btrim(p_street), ''),
            coalesce(btrim(p_house_number), ''),
            coalesce(btrim(p_staircase), ''),
            coalesce(btrim(p_door), ''),
            coalesce(btrim(p_postcode), ''),
            coalesce(btrim(p_city), ''),
            coalesce(btrim(p_district), ''),
            coalesce(btrim(p_country), ''),
            CASE
              WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL
                THEN coalesce(p_latitude::text, '') || ',' || coalesce(p_longitude::text, '')
              ELSE ''
            END
          )
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$function$;

CREATE TABLE IF NOT EXISTS public.locations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  street              text,
  house_number        text,
  staircase           text,
  door                text,
  floor               text,
  postcode            text,
  extra_information   text,
  city                text,
  district            text,
  country             text,
  latitude            numeric(10, 7),
  longitude           numeric(11, 7),
  address_label       text,
  address_dedupe_key  text NOT NULL,
  geog                extensions.geography(Point, 4326),
  staircase_sort_key  text NOT NULL DEFAULT '~~',
  door_sort_key       text NOT NULL DEFAULT '~~',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_locations_latitude
    CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT chk_locations_longitude
    CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  CONSTRAINT chk_locations_lat_lng_pair
    CHECK (
      (latitude IS NULL AND longitude IS NULL)
      OR (latitude IS NOT NULL AND longitude IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_locations_org_dedupe_key
  ON public.locations(organization_id, address_dedupe_key);

CREATE INDEX IF NOT EXISTS idx_locations_org_geog
  ON public.locations USING gist(geog)
  WHERE geog IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.media_item_location_links (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id   uuid NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  location_id     uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_media_item_location_links_pair UNIQUE (media_item_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_media_item_location_links_media_sort
  ON public.media_item_location_links(media_item_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_media_item_location_links_location
  ON public.media_item_location_links(location_id);

-- Maintain sort keys, geog, dedupe key on locations
CREATE OR REPLACE FUNCTION public.locations_before_write()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.staircase_sort_key := public.build_location_sort_key(NEW.staircase);
  NEW.door_sort_key := public.build_location_sort_key(NEW.door);
  NEW.updated_at := now();

  IF TG_OP = 'INSERT'
     OR (
       TG_OP = 'UPDATE'
       AND (
         NEW.street IS DISTINCT FROM OLD.street
         OR NEW.house_number IS DISTINCT FROM OLD.house_number
         OR NEW.staircase IS DISTINCT FROM OLD.staircase
         OR NEW.door IS DISTINCT FROM OLD.door
         OR NEW.postcode IS DISTINCT FROM OLD.postcode
         OR NEW.city IS DISTINCT FROM OLD.city
         OR NEW.district IS DISTINCT FROM OLD.district
         OR NEW.country IS DISTINCT FROM OLD.country
         OR NEW.latitude IS DISTINCT FROM OLD.latitude
         OR NEW.longitude IS DISTINCT FROM OLD.longitude
       )
     ) THEN
    NEW.address_dedupe_key := public.compute_location_address_dedupe_key(
      NEW.street,
      NEW.house_number,
      NEW.staircase,
      NEW.door,
      NEW.postcode,
      NEW.city,
      NEW.district,
      NEW.country,
      NEW.latitude,
      NEW.longitude
    );
  END IF;

  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geog := extensions.ST_SetSRID(
      extensions.ST_MakePoint(NEW.longitude::float8, NEW.latitude::float8),
      4326
    )::extensions.geography;
  ELSE
    NEW.geog := NULL;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_locations_before_write ON public.locations;
CREATE TRIGGER trg_locations_before_write
  BEFORE INSERT OR UPDATE ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.locations_before_write();

-- RLS (Phase 1 gate)
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_item_location_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locations: org read" ON public.locations;
CREATE POLICY "locations: org read"
  ON public.locations FOR SELECT
  USING (organization_id = public.user_org_id());

DROP POLICY IF EXISTS "locations: org write" ON public.locations;
CREATE POLICY "locations: org write"
  ON public.locations FOR ALL
  USING (organization_id = public.user_org_id() AND NOT public.is_viewer())
  WITH CHECK (organization_id = public.user_org_id() AND NOT public.is_viewer());

DROP POLICY IF EXISTS "media_item_location_links: org read" ON public.media_item_location_links;
CREATE POLICY "media_item_location_links: org read"
  ON public.media_item_location_links FOR SELECT
  USING (organization_id = public.user_org_id());

DROP POLICY IF EXISTS "media_item_location_links: org write" ON public.media_item_location_links;
CREATE POLICY "media_item_location_links: org write"
  ON public.media_item_location_links FOR ALL
  USING (organization_id = public.user_org_id() AND NOT public.is_viewer())
  WITH CHECK (
    organization_id = public.user_org_id()
    AND NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
        FROM public.media_items m
       WHERE m.id = media_item_id
         AND m.organization_id = public.user_org_id()
    )
  );

-- Retire primary projection on legacy table
DROP TRIGGER IF EXISTS trg_media_item_locations_sync_projection ON public.media_item_locations;
DROP TRIGGER IF EXISTS trg_media_item_locations_promote_primary ON public.media_item_locations;

-- find_or_create_location
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
    SET updated_at = now()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

-- link_media_to_location
CREATE OR REPLACE FUNCTION public.link_media_to_location(
  p_media_item_id uuid,
  p_location_id uuid
)
RETURNS public.media_item_location_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_sort integer;
  v_row public.media_item_location_links%ROWTYPE;
BEGIN
  SELECT m.organization_id INTO v_org
    FROM public.media_items m
   WHERE m.id = p_media_item_id
     AND m.organization_id = public.user_org_id();

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.locations l
     WHERE l.id = p_location_id AND l.organization_id = v_org
  ) THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  SELECT coalesce(max(k.sort_order), -1) + 1
    INTO v_sort
    FROM public.media_item_location_links k
   WHERE k.media_item_id = p_media_item_id;

  INSERT INTO public.media_item_location_links (
    media_item_id, location_id, organization_id, sort_order
  ) VALUES (
    p_media_item_id, p_location_id, v_org, v_sort
  )
  ON CONFLICT (media_item_id, location_id) DO UPDATE
    SET sort_order = EXCLUDED.sort_order
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unlink_media_from_location(
  p_media_item_id uuid,
  p_location_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.media_item_location_links k
   WHERE k.media_item_id = p_media_item_id
     AND k.location_id = p_location_id
     AND k.organization_id = public.user_org_id();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  RETURN true;
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
  p_address_label text DEFAULT NULL
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
         address_label     = coalesce(p_address_label, l.address_label)
   WHERE l.id = p_location_id
     AND l.organization_id = public.user_org_id()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_locations_for_media(
  p_media_item_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  link_id uuid,
  media_item_id uuid,
  organization_id uuid,
  street text,
  house_number text,
  staircase text,
  door text,
  floor text,
  postcode text,
  extra_information text,
  city text,
  district text,
  country text,
  latitude numeric,
  longitude numeric,
  address_label text,
  sort_order integer,
  staircase_sort_key text,
  door_sort_key text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    loc.id,
    k.id AS link_id,
    k.media_item_id,
    loc.organization_id,
    loc.street,
    loc.house_number,
    loc.staircase,
    loc.door,
    loc.floor,
    loc.postcode,
    loc.extra_information,
    loc.city,
    loc.district,
    loc.country,
    loc.latitude,
    loc.longitude,
    loc.address_label,
    k.sort_order,
    loc.staircase_sort_key,
    loc.door_sort_key,
    loc.created_at,
    loc.updated_at
  FROM public.media_item_location_links k
  JOIN public.locations loc ON loc.id = k.location_id
  JOIN public.media_items m ON m.id = k.media_item_id
 WHERE k.media_item_id = p_media_item_id
   AND m.organization_id = public.user_org_id()
 ORDER BY k.sort_order ASC, loc.staircase_sort_key ASC, loc.door_sort_key ASC, k.created_at ASC
 LIMIT greatest(1, least(coalesce(p_limit, 50), 100))
OFFSET greatest(coalesce(p_offset, 0), 0);
$function$;

CREATE OR REPLACE FUNCTION public.count_zoomable_locations_for_media(p_media_item_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT count(*)::integer
    FROM public.media_item_location_links k
    JOIN public.locations loc ON loc.id = k.location_id
    JOIN public.media_items m ON m.id = k.media_item_id
   WHERE k.media_item_id = p_media_item_id
     AND m.organization_id = public.user_org_id()
     AND loc.latitude IS NOT NULL
     AND loc.longitude IS NOT NULL;
$function$;

-- Backfill: media_item_locations -> locations + links
DO $backfill$
DECLARE
  r public.media_item_locations%ROWTYPE;
  v_loc public.locations%ROWTYPE;
  v_key text;
BEGIN
  FOR r IN
    SELECT * FROM public.media_item_locations
    ORDER BY media_item_id, sort_order, created_at
  LOOP
    v_key := public.compute_location_address_dedupe_key(
      r.street, r.house_number, r.staircase, r.door, NULL,
      r.city, r.district, r.country, r.latitude, r.longitude
    );

    INSERT INTO public.locations (
      organization_id,
      street, house_number, staircase, door, extra_information,
      city, district, country, latitude, longitude, address_label,
      address_dedupe_key,
      staircase_sort_key, door_sort_key,
      created_at, updated_at
    ) VALUES (
      r.organization_id,
      r.street, r.house_number, r.staircase, r.door, r.extra_information,
      r.city, r.district, r.country, r.latitude, r.longitude, r.address_label,
      v_key,
      r.staircase_sort_key, r.door_sort_key,
      r.created_at, r.updated_at
    )
    ON CONFLICT (organization_id, address_dedupe_key) DO UPDATE
      SET updated_at = GREATEST(locations.updated_at, EXCLUDED.updated_at)
    RETURNING * INTO v_loc;

    INSERT INTO public.media_item_location_links (
      media_item_id, location_id, organization_id, sort_order, created_at
    ) VALUES (
      r.media_item_id, v_loc.id, r.organization_id, r.sort_order, r.created_at
    )
    ON CONFLICT (media_item_id, location_id) DO NOTHING;
  END LOOP;
END;
$backfill$;

-- Legacy RPC shims -> N:N tables
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
    false AS is_primary,
    k.sort_order,
    loc.staircase_sort_key,
    loc.door_sort_key,
    loc.created_at,
    loc.updated_at
  FROM public.media_item_location_links k
  JOIN public.locations loc ON loc.id = k.location_id
  JOIN public.media_items m ON m.id = k.media_item_id
 WHERE k.media_item_id = p_media_item_id
   AND m.organization_id = public.user_org_id()
 ORDER BY k.sort_order ASC, loc.staircase_sort_key ASC, loc.door_sort_key ASC, k.created_at ASC
 LIMIT greatest(1, least(coalesce(p_limit, 50), 100))
OFFSET greatest(coalesce(p_offset, 0), 0);
$function$;

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
BEGIN
  v_loc := public.find_or_create_location(
    p_street, p_house_number, p_staircase, p_door, p_floor, p_postcode, p_extra_information,
    p_city, p_district, p_country, p_latitude, p_longitude, p_address_label
  );
  v_link := public.link_media_to_location(p_media_item_id, v_loc.id);

  RETURN (
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
    FROM public.locations loc
   WHERE loc.id = v_loc.id
  );
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
  v_link public.media_item_location_links%ROWTYPE;
BEGIN
  v_loc := public.update_location(
    p_location_id,
    p_street, p_house_number, p_staircase, p_door, p_floor, p_postcode, p_extra_information,
    p_city, p_district, p_country, p_latitude, p_longitude, p_address_label
  );

  SELECT k.* INTO v_link
    FROM public.media_item_location_links k
   WHERE k.location_id = v_loc.id
   LIMIT 1;

  RETURN (
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
    FROM public.locations loc
    JOIN public.media_item_location_links k ON k.location_id = loc.id
   WHERE loc.id = v_loc.id
   ORDER BY k.sort_order
   LIMIT 1
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_media_item_location(p_location_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_media uuid;
BEGIN
  SELECT k.media_item_id INTO v_media
    FROM public.media_item_location_links k
   WHERE k.location_id = p_location_id
     AND k.organization_id = public.user_org_id()
   LIMIT 1;

  IF v_media IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  RETURN public.unlink_media_from_location(v_media, p_location_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_primary_media_item_location(p_location_id uuid)
RETURNS public.media_item_locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row public.media_item_locations%ROWTYPE;
BEGIN
  SELECT l.* INTO v_row
    FROM public.list_media_item_locations(
      (
        SELECT k.media_item_id
          FROM public.media_item_location_links k
         WHERE k.location_id = p_location_id
           AND k.organization_id = public.user_org_id()
         LIMIT 1
      ),
      1,
      0
    ) l
   WHERE l.id = p_location_id
   LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  RETURN v_row;
END;
$function$;

-- viewport_markers v2: zoomable links, distinct media in clusters
-- Return type adds location_id — must drop old signature (42P13 on CREATE OR REPLACE).
DROP FUNCTION IF EXISTS public.viewport_markers(numeric, numeric, numeric, numeric, integer);

CREATE OR REPLACE FUNCTION public.viewport_markers(
  min_lat numeric,
  min_lng numeric,
  max_lat numeric,
  max_lng numeric,
  zoom integer
)
RETURNS TABLE(
  cluster_lat numeric,
  cluster_lng numeric,
  image_count bigint,
  image_id uuid,
  media_item_id uuid,
  location_id uuid,
  direction numeric,
  storage_path text,
  thumbnail_path text,
  exif_latitude numeric,
  exif_longitude numeric,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH grid AS (
    SELECT
      CASE
        WHEN zoom >= 19 THEN 0::numeric
        ELSE (80.0 * 360.0) / (256.0 * power(2, zoom))
      END AS cell_size,
      extensions.ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)::extensions.geography AS viewport_geog
  ),
  zoomable_links AS (
    SELECT
      k.id AS link_id,
      loc.id AS location_id,
      k.media_item_id,
      m.source_image_id,
      loc.latitude,
      loc.longitude,
      m.storage_path AS s_path,
      m.thumbnail_path AS t_path,
      m.exif_latitude AS exif_lat,
      m.exif_longitude AS exif_lng,
      m.created_at AS c_at,
      CASE WHEN g.cell_size > 0
        THEN ROUND(loc.latitude / g.cell_size) * g.cell_size
        ELSE loc.latitude
      END AS snap_lat,
      CASE WHEN g.cell_size > 0
        THEN ROUND(loc.longitude / g.cell_size) * g.cell_size
        ELSE loc.longitude
      END AS snap_lng
    FROM public.media_item_location_links k
    JOIN public.locations loc ON loc.id = k.location_id
    JOIN public.media_items m ON m.id = k.media_item_id
    CROSS JOIN grid g
    WHERE m.organization_id = public.user_org_id()
      AND loc.latitude IS NOT NULL
      AND loc.longitude IS NOT NULL
      AND loc.geog IS NOT NULL
      AND extensions.ST_Intersects(loc.geog, g.viewport_geog)
  ),
  clustered AS (
    SELECT
      snap_lat,
      snap_lng,
      COUNT(DISTINCT media_item_id) AS cnt,
      CASE WHEN COUNT(DISTINCT media_item_id) = 1 THEN MIN(COALESCE(source_image_id, media_item_id)::text)::uuid END AS single_id,
      CASE WHEN COUNT(DISTINCT media_item_id) = 1 THEN MIN(media_item_id::text)::uuid END AS single_media_item_id,
      CASE WHEN COUNT(DISTINCT media_item_id) = 1 THEN MIN(location_id::text)::uuid END AS single_location_id,
      CASE WHEN COUNT(DISTINCT media_item_id) = 1 THEN MIN(s_path) END AS single_s_path,
      CASE WHEN COUNT(DISTINCT media_item_id) = 1 THEN MIN(t_path) END AS single_t_path,
      CASE WHEN COUNT(DISTINCT media_item_id) = 1 THEN MIN(exif_lat) END AS single_exif_lat,
      CASE WHEN COUNT(DISTINCT media_item_id) = 1 THEN MIN(exif_lng) END AS single_exif_lng,
      CASE WHEN COUNT(DISTINCT media_item_id) = 1 THEN MIN(c_at) END AS single_c_at,
      AVG(latitude) AS avg_lat,
      AVG(longitude) AS avg_lng
    FROM zoomable_links
    GROUP BY snap_lat, snap_lng
  )
  SELECT
    ROUND(avg_lat, 7) AS cluster_lat,
    ROUND(avg_lng, 7) AS cluster_lng,
    cnt AS image_count,
    single_id AS image_id,
    single_media_item_id AS media_item_id,
    single_location_id AS location_id,
    NULL::numeric AS direction,
    single_s_path AS storage_path,
    single_t_path AS thumbnail_path,
    single_exif_lat AS exif_latitude,
    single_exif_lng AS exif_longitude,
    single_c_at AS created_at
  FROM clustered
  ORDER BY cnt DESC, cluster_lat, cluster_lng
  LIMIT 2000;
$function$;

GRANT EXECUTE ON FUNCTION public.find_or_create_location(
  text, text, text, text, text, text, text, text, text, text, numeric, numeric, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_media_to_location(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_media_from_location(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_location(
  uuid, text, text, text, text, text, text, text, text, text, text, numeric, numeric, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_locations_for_media(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_zoomable_locations_for_media(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_media_item_location(
  uuid, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_media_item_location(
  uuid, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.viewport_markers(numeric, numeric, numeric, numeric, integer) TO authenticated;
