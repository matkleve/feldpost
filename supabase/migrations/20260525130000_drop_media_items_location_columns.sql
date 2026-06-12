-- =============================================================================
-- Backfill media_items address/GPS into locations + links, then drop legacy
-- columns on media_items (resolved location lives in locations only).
-- Keeps: exif_latitude, exif_longitude, location_status, gps_assignment_allowed,
--         address_field_meta on media_items.
-- =============================================================================

-- 1) Backfill: any media with legacy columns but no link yet
DO $backfill_media$
DECLARE
  r RECORD;
  v_loc public.locations%ROWTYPE;
  v_key text;
BEGIN
  FOR r IN
    SELECT m.id AS media_item_id, m.organization_id,
           m.street, m.city, m.district, m.country,
           m.latitude, m.longitude, m.address_label
      FROM public.media_items m
     WHERE NOT EXISTS (
       SELECT 1 FROM public.media_item_location_links k WHERE k.media_item_id = m.id
     )
       AND (
         m.address_label IS NOT NULL
         OR m.street IS NOT NULL
         OR m.city IS NOT NULL
         OR m.district IS NOT NULL
         OR m.country IS NOT NULL
         OR (m.latitude IS NOT NULL AND m.longitude IS NOT NULL)
       )
  LOOP
    v_key := public.compute_location_address_dedupe_key(
      r.street, NULL, NULL, NULL, NULL,
      r.city, r.district, r.country, r.latitude, r.longitude
    );

    INSERT INTO public.locations (
      organization_id,
      street, city, district, country,
      latitude, longitude, address_label,
      address_dedupe_key
    ) VALUES (
      r.organization_id,
      r.street, r.city, r.district, r.country,
      r.latitude, r.longitude, r.address_label,
      v_key
    )
    ON CONFLICT (organization_id, address_dedupe_key) DO UPDATE
      SET updated_at = now()
    RETURNING * INTO v_loc;

    INSERT INTO public.media_item_location_links (
      media_item_id, location_id, organization_id, sort_order
    ) VALUES (
      r.media_item_id, v_loc.id, r.organization_id, 0
    )
    ON CONFLICT (media_item_id, location_id) DO NOTHING;
  END LOOP;
END;
$backfill_media$;

-- 2) resolve_media_location: write locations + link; only status on media_items
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
    v_loc := public.find_or_create_location(
      p_street, NULL, NULL, NULL, NULL, p_postcode, NULL,
      p_city, p_district, p_country, p_latitude, p_longitude, p_address_label
    );
    PERFORM public.link_media_to_location(_media_id, v_loc.id);
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

-- 3) get_unresolved_media: read address/GPS from first linked location
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
    loc.latitude,
    loc.longitude,
    loc.address_label,
    loc.city,
    loc.district,
    loc.street,
    loc.country
  FROM public.media_items m
  LEFT JOIN LATERAL (
    SELECT l.*
      FROM public.media_item_location_links k
      JOIN public.locations l ON l.id = k.location_id
     WHERE k.media_item_id = m.id
     ORDER BY k.sort_order ASC, k.created_at ASC
     LIMIT 1
  ) loc ON true
  WHERE m.organization_id = public.user_org_id()
    AND m.location_status = 'pending'
    AND (
      (
        loc.latitude IS NOT NULL AND loc.longitude IS NOT NULL
        AND (
          loc.address_label IS NULL
          OR loc.city IS NULL
          OR loc.district IS NULL
          OR loc.street IS NULL
          OR loc.country IS NULL
        )
      )
      OR
      (
        (loc.latitude IS NULL OR loc.longitude IS NULL)
        AND loc.address_label IS NOT NULL
      )
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit;
$function$;

-- 4) bulk_update_media_addresses: patch linked locations
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

  UPDATE public.locations loc
     SET address_label = p_address_label,
         city          = COALESCE(p_city, loc.city),
         district      = COALESCE(p_district, loc.district),
         street        = COALESCE(p_street, loc.street),
         country       = COALESCE(p_country, loc.country),
         updated_at    = now()
    FROM public.media_item_location_links k
    JOIN public.media_items m ON m.id = k.media_item_id
   WHERE loc.id = k.location_id
     AND loc.organization_id = _org_id
     AND (
       m.id = ANY(p_media_item_ids)
       OR m.source_image_id = ANY(p_media_item_ids)
     );

  GET DIAGNOSTICS _updated = ROW_COUNT;

  UPDATE public.media_items m
     SET location_status = CASE
           WHEN p_address_label IS NOT NULL THEN 'resolved'
           WHEN m.location_status = 'resolved' THEN 'resolved'
           ELSE 'unresolvable'
         END,
         updated_at = now()
   WHERE m.organization_id = _org_id
     AND (
       m.id = ANY(p_media_item_ids)
       OR m.source_image_id = ANY(p_media_item_ids)
     );

  RETURN _updated;
END;
$function$;

-- 5) cluster_images: match cluster cell via linked location coordinates
CREATE OR REPLACE FUNCTION public.cluster_images(
  p_cluster_lat numeric,
  p_cluster_lng numeric,
  p_zoom integer
)
RETURNS TABLE(
  image_id uuid,
  media_item_id uuid,
  latitude numeric,
  longitude numeric,
  thumbnail_path text,
  storage_path text,
  captured_at timestamp with time zone,
  created_at timestamp with time zone,
  project_id uuid,
  project_name text,
  project_ids uuid[],
  project_names text[],
  direction numeric,
  exif_latitude numeric,
  exif_longitude numeric,
  address_label text,
  city text,
  district text,
  street text,
  country text,
  user_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH grid AS (
    SELECT
      CASE
        WHEN p_zoom >= 19 THEN 0::numeric
        ELSE (80.0 * 360.0) / (256.0 * power(2, p_zoom))
      END AS cell_size
  ),
  snapped_input AS (
    SELECT
      CASE WHEN g.cell_size > 0
        THEN ROUND(p_cluster_lat / g.cell_size) * g.cell_size
        ELSE p_cluster_lat
      END AS snap_lat,
      CASE WHEN g.cell_size > 0
        THEN ROUND(p_cluster_lng / g.cell_size) * g.cell_size
        ELSE p_cluster_lng
      END AS snap_lng
    FROM grid g
  )
  SELECT
    COALESCE(m.source_image_id, m.id) AS image_id,
    m.id AS media_item_id,
    loc.latitude,
    loc.longitude,
    m.thumbnail_path,
    m.storage_path,
    m.captured_at,
    m.created_at,
    mp.project_ids[1] AS project_id,
    mp.project_names[1] AS project_name,
    COALESCE(mp.project_ids, '{}'::uuid[]) AS project_ids,
    COALESCE(mp.project_names, '{}'::text[]) AS project_names,
    NULL::numeric AS direction,
    m.exif_latitude,
    m.exif_longitude,
    loc.address_label,
    loc.city,
    loc.district,
    loc.street,
    loc.country,
    pr.full_name AS user_name
  FROM public.media_item_location_links k
  JOIN public.locations loc ON loc.id = k.location_id
  JOIN public.media_items m ON m.id = k.media_item_id
  CROSS JOIN grid g
  CROSS JOIN snapped_input si
  LEFT JOIN LATERAL (
    SELECT
      array_agg(p.id ORDER BY p.name) AS project_ids,
      array_agg(p.name ORDER BY p.name) AS project_names
    FROM public.media_projects mp
    JOIN public.projects p ON p.id = mp.project_id
    WHERE mp.media_item_id = m.id
  ) mp ON TRUE
  LEFT JOIN public.profiles pr ON pr.id = m.created_by
  WHERE m.organization_id = public.user_org_id()
    AND loc.latitude IS NOT NULL
    AND loc.longitude IS NOT NULL
    AND (
      (g.cell_size > 0 AND
       ROUND(loc.latitude / g.cell_size) * g.cell_size = si.snap_lat AND
       ROUND(loc.longitude / g.cell_size) * g.cell_size = si.snap_lng)
      OR
      (g.cell_size = 0 AND
       ROUND(loc.latitude, 7) = p_cluster_lat AND
       ROUND(loc.longitude, 7) = p_cluster_lng)
    )
  ORDER BY COALESCE(m.captured_at, m.created_at) DESC
  LIMIT 500;
$function$;

-- 6) Drop geog machinery on media_items
DROP TRIGGER IF EXISTS trg_media_items_geog ON public.media_items;
DROP INDEX IF EXISTS public.idx_media_items_geog;
DROP FUNCTION IF EXISTS public.sync_media_item_geog();

-- GPS assignment policy no longer reads latitude/longitude on media_items
DROP TRIGGER IF EXISTS trg_media_items_gps_assignment_policy ON public.media_items;

CREATE OR REPLACE FUNCTION public.enforce_media_item_gps_assignment_policy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Coordinates live on locations; this flag only blocks future link/GPS writes in app layer.
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_media_items_gps_assignment_policy
  BEFORE INSERT OR UPDATE OF gps_assignment_allowed
  ON public.media_items
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_media_item_gps_assignment_policy();

-- 7) Drop legacy resolved-location columns
ALTER TABLE public.media_items
  DROP COLUMN IF EXISTS geog,
  DROP COLUMN IF EXISTS latitude,
  DROP COLUMN IF EXISTS longitude,
  DROP COLUMN IF EXISTS address_label,
  DROP COLUMN IF EXISTS street,
  DROP COLUMN IF EXISTS city,
  DROP COLUMN IF EXISTS district,
  DROP COLUMN IF EXISTS country;

GRANT EXECUTE ON FUNCTION public.resolve_media_location(
  uuid, numeric, numeric, text, text, text, text, text, text, text
) TO authenticated;
