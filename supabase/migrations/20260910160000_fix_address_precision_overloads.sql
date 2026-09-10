-- =============================================================================
-- Repair the overload fallout of 20260910140000_upload_address_precision.sql
-- =============================================================================
-- 20260910140000 appended `p_address_precision text DEFAULT NULL` to five
-- functions with CREATE OR REPLACE. Adding a parameter changes the signature, so
-- Postgres created a *second* overload of each instead of replacing it. Any call
-- that omits the new argument then matches both candidates and fails with
-- SQLSTATE 42725 (`function ... is not unique` / PostgREST PGRST203).
--
-- Observed breakage on a replay of the full migration chain:
--   * add_media_item_location  -> its internal 13-arg positional call to
--     find_or_create_location is ambiguous, so media-detail "add address" fails
--     even when the caller sends no precision at all.
--   * resolve_media_location(p_media_item_id, p_location_status) -- the
--     two-argument "mark unresolvable" call -- is ambiguous.
--
-- This is the same failure mode as
-- 20260525210000_drop_resolve_media_location_nine_arg_overload.sql, and it
-- re-breaks the single-signature assertions in
-- scripts/verify-locations-nn-migration.sql.
--
-- This migration:
--   1. drops the five stale pre-precision overloads,
--   2. extends add_media_item_location with p_address_precision (the only
--      location writer that could not record it),
--   3. returns locations.address_precision from the read RPCs, so the column
--      written since 20260910140000 can actually be read back.
--
-- @see docs/specs/service/media-upload-service/address-resolution-model.address-precision-writers.supplement.md
-- UNVERIFIED AGAINST HOSTED: apply via `supabase db push`, then re-run
-- `bash scripts/run-verify-locations-nn-migration.sh --linked`.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Drop the stale pre-precision overloads left behind by 20260910140000.
-- -----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.find_or_create_location(
  text, text, text, text, text, text, text, text, text, text, numeric, numeric, text
);

DROP FUNCTION IF EXISTS public.update_location(
  uuid, text, text, text, text, text, text, text, text, text, text, numeric, numeric, text
);

DROP FUNCTION IF EXISTS public.update_media_item_location(
  uuid, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text
);

DROP FUNCTION IF EXISTS public.resolve_media_location(
  uuid, numeric, numeric, text, text, text, text, text, text, text
);

DROP FUNCTION IF EXISTS public.bulk_update_media_addresses(
  uuid[], text, text, text, text, text
);

-- -----------------------------------------------------------------------------
-- 2) add_media_item_location: accept and forward p_address_precision.
-- -----------------------------------------------------------------------------
-- Dropped first because appending a parameter would otherwise create yet another
-- overload rather than replacing the 14-argument form.

DROP FUNCTION IF EXISTS public.add_media_item_location(
  uuid, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text
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
  p_floor text DEFAULT NULL,
  p_address_precision text DEFAULT NULL
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
    p_city, p_district, p_country, p_latitude, p_longitude, p_address_label,
    p_address_precision
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

GRANT EXECUTE ON FUNCTION public.add_media_item_location(
  uuid, text, text, text, text, text, text, text, text, numeric, numeric, text, text, text, text
) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3) Read path: expose locations.address_precision.
-- -----------------------------------------------------------------------------
-- Both are RETURNS TABLE functions, so an added output column changes the return
-- type and CREATE OR REPLACE alone is rejected — drop first.

DROP FUNCTION IF EXISTS public.list_locations_for_media(uuid, integer, integer);

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
  address_precision text,
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
    loc.address_precision,
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

GRANT EXECUTE ON FUNCTION public.list_locations_for_media(uuid, integer, integer) TO authenticated;

-- search_locations feeds the same `MediaItemLocationRow` shape as the org picker,
-- so it must expose the column too or the shared type would claim a field that
-- one of its producers never returns.

DROP FUNCTION IF EXISTS public.search_locations(text, integer, uuid);

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
  address_precision text,
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
      loc.address_precision,
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
    f.address_precision,
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

-- -----------------------------------------------------------------------------
-- 4) Fail the migration if any location writer still has more than one signature.
-- -----------------------------------------------------------------------------

DO $guard$
DECLARE
  v_offenders text;
BEGIN
  SELECT string_agg(proname || ' (' || cnt || ')', ', ' ORDER BY proname)
    INTO v_offenders
    FROM (
      SELECT p.proname, count(*) AS cnt
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname IN (
           'find_or_create_location', 'update_location', 'add_media_item_location',
           'update_media_item_location', 'resolve_media_location',
           'bulk_update_media_addresses', 'list_locations_for_media', 'search_locations'
         )
       GROUP BY p.proname
      HAVING count(*) > 1
    ) dupes;

  IF v_offenders IS NOT NULL THEN
    RAISE EXCEPTION 'ambiguous location RPC overloads remain: %', v_offenders;
  END IF;
END;
$guard$;
