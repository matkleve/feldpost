-- =============================================================================
-- locations.last_used_at + search_locations org picker RPC
-- Recency bumps only on link_media_to_location (not find_or_create).
-- =============================================================================

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz NOT NULL DEFAULT now();

UPDATE public.locations loc
   SET last_used_at = coalesce(
     (
       SELECT max(ts)
         FROM (
           SELECT loc.updated_at AS ts
           UNION ALL
           SELECT k.created_at
             FROM public.media_item_location_links k
            WHERE k.location_id = loc.id
         ) s
     ),
     loc.created_at,
     now()
   );

CREATE INDEX IF NOT EXISTS idx_locations_org_last_used
  ON public.locations(organization_id, last_used_at DESC);

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

  UPDATE public.locations
     SET last_used_at = now()
   WHERE id = p_location_id;

  RETURN v_row;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_locations(
  p_query text DEFAULT NULL,
  p_limit integer DEFAULT 5,
  p_media_item_id uuid DEFAULT NULL
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
  updated_at timestamptz,
  is_linked_to_media boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH org AS (
    SELECT public.user_org_id() AS org_id
  ),
  q AS (
    SELECT nullif(trim(coalesce(p_query, '')), '') AS term
  ),
  scoped AS (
    SELECT
      loc.id,
      NULL::uuid AS link_id,
      NULL::uuid AS media_item_id,
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
      0 AS sort_order,
      loc.staircase_sort_key,
      loc.door_sort_key,
      loc.created_at,
      loc.updated_at,
      loc.last_used_at,
      CASE
        WHEN p_media_item_id IS NULL THEN false
        ELSE EXISTS (
          SELECT 1
            FROM public.media_item_location_links k
           WHERE k.location_id = loc.id
             AND k.media_item_id = p_media_item_id
             AND k.organization_id = org.org_id
        )
      END AS is_linked_to_media,
      CASE
        WHEN (SELECT term FROM q) IS NULL THEN 0
        WHEN loc.street ILIKE (SELECT term FROM q) || '%' THEN 1
        WHEN loc.city ILIKE (SELECT term FROM q) || '%' THEN 2
        WHEN loc.postcode ILIKE (SELECT term FROM q) || '%' THEN 3
        WHEN loc.address_label ILIKE (SELECT term FROM q) || '%' THEN 4
        WHEN loc.house_number ILIKE (SELECT term FROM q) || '%' THEN 5
        WHEN loc.street ILIKE '%' || (SELECT term FROM q) || '%' THEN 6
        WHEN loc.city ILIKE '%' || (SELECT term FROM q) || '%' THEN 7
        WHEN loc.postcode ILIKE '%' || (SELECT term FROM q) || '%' THEN 8
        WHEN loc.address_label ILIKE '%' || (SELECT term FROM q) || '%' THEN 9
        WHEN loc.house_number ILIKE '%' || (SELECT term FROM q) || '%' THEN 10
        ELSE 99
      END AS rank_score
    FROM public.locations loc
    CROSS JOIN org
   WHERE loc.organization_id = org.org_id
     AND org.org_id IS NOT NULL
  ),
  filtered AS (
    SELECT *
      FROM scoped
     WHERE (SELECT term FROM q) IS NULL
        OR rank_score < 99
  )
  SELECT
    f.id,
    f.link_id,
    f.media_item_id,
    f.organization_id,
    f.street,
    f.house_number,
    f.staircase,
    f.door,
    f.floor,
    f.postcode,
    f.extra_information,
    f.city,
    f.district,
    f.country,
    f.latitude,
    f.longitude,
    f.address_label,
    f.sort_order,
    f.staircase_sort_key,
    f.door_sort_key,
    f.created_at,
    f.updated_at,
    f.is_linked_to_media
    FROM filtered f
   ORDER BY
     CASE WHEN (SELECT term FROM q) IS NULL THEN 0 ELSE f.rank_score END ASC,
     f.last_used_at DESC,
     f.updated_at DESC
   LIMIT greatest(1, least(coalesce(p_limit, 5), 25));
$function$;

GRANT EXECUTE ON FUNCTION public.search_locations(text, integer, uuid) TO authenticated;
