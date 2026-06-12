-- =============================================================================
-- Decouple RPC and trigger functions from public.images (phase 3)
-- =============================================================================
-- Goal:
--   Rewrite remaining functions that still reference public.images so the legacy
--   images table can be dropped after cutover.
--
-- Compatibility strategy:
--   - Keep function names/signatures stable.
--   - Accept legacy image ids and resolve via media_items.source_image_id.
--   - Continue returning image_id fields using COALESCE(source_image_id, id).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.bulk_update_image_addresses(
  p_image_ids uuid[],
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
     SET address_label      = p_address_label,
         city               = p_city,
         district           = p_district,
         street             = p_street,
         country            = p_country,
         location_status    = 'resolved',
         updated_at         = now()
   WHERE m.organization_id = _org_id
     AND m.media_type = 'image'
     AND (
       m.id = ANY(p_image_ids)
       OR m.source_image_id = ANY(p_image_ids)
     );

  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$function$;


CREATE OR REPLACE FUNCTION public.cluster_images(
  p_cluster_lat numeric,
  p_cluster_lng numeric,
  p_zoom integer
)
RETURNS TABLE(
  image_id uuid,
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
    m.latitude,
    m.longitude,
    m.thumbnail_path,
    m.storage_path,
    m.captured_at,
    m.created_at,
    COALESCE(ip.project_ids[1], m.primary_project_id) AS project_id,
    COALESCE(ip.project_names[1], p_fallback.name) AS project_name,
    COALESCE(ip.project_ids, '{}'::uuid[]) AS project_ids,
    COALESCE(ip.project_names, '{}'::text[]) AS project_names,
    NULL::numeric AS direction,
    m.exif_latitude,
    m.exif_longitude,
    m.address_label,
    m.city,
    m.district,
    m.street,
    m.country,
    pr.full_name AS user_name
  FROM public.media_items m
  CROSS JOIN grid g
  CROSS JOIN snapped_input si
  LEFT JOIN LATERAL (
    SELECT
      array_agg(p.id ORDER BY p.name) AS project_ids,
      array_agg(p.name ORDER BY p.name) AS project_names
    FROM public.image_projects ip
    JOIN public.projects p ON p.id = ip.project_id
    WHERE ip.media_item_id = m.id
       OR (
         ip.media_item_id IS NULL
         AND m.source_image_id IS NOT NULL
         AND ip.image_id = m.source_image_id
       )
  ) ip ON TRUE
  LEFT JOIN public.projects p_fallback ON p_fallback.id = m.primary_project_id
  LEFT JOIN public.profiles pr ON pr.id = m.created_by
  WHERE m.organization_id = public.user_org_id()
    AND m.media_type = 'image'
    AND m.latitude IS NOT NULL
    AND m.longitude IS NOT NULL
    AND (
      (g.cell_size > 0 AND
       ROUND(m.latitude  / g.cell_size) * g.cell_size = si.snap_lat AND
       ROUND(m.longitude / g.cell_size) * g.cell_size = si.snap_lng)
      OR
      (g.cell_size = 0 AND
       ROUND(m.latitude, 7) = p_cluster_lat AND
       ROUND(m.longitude, 7) = p_cluster_lng)
    )
  ORDER BY COALESCE(m.captured_at, m.created_at) DESC
  LIMIT 500;
$function$;


CREATE OR REPLACE FUNCTION public.create_or_reuse_share_set(
  p_image_ids uuid[],
  p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS TABLE(
  share_set_id uuid,
  token text,
  expires_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_org_id uuid := public.user_org_id();
  v_normalized_ids uuid[];
  v_fingerprint text;
  v_share_set_id uuid;
  v_token text;
  v_token_hash text;
  v_token_hash_algo text := 'sha256';
  v_expires_at timestamptz := p_expires_at;
  v_bad_count int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_viewer() then
    raise exception 'Viewer role cannot create share links';
  end if;

  select coalesce(array_agg(id order by id), '{}'::uuid[])
  into v_normalized_ids
  from (
    select distinct unnest(coalesce(p_image_ids, '{}'::uuid[])) as id
  ) dedup;

  if coalesce(array_length(v_normalized_ids, 1), 0) = 0 then
    raise exception 'No images provided';
  end if;

  select count(*)
  into v_bad_count
  from unnest(v_normalized_ids) as u(id)
  left join public.media_items m
    on m.organization_id = v_org_id
   and m.media_type = 'image'
   and (m.id = u.id or m.source_image_id = u.id)
  where m.id is null;

  if v_bad_count > 0 then
    raise exception 'Selection contains images outside your organization';
  end if;

  v_fingerprint := md5(array_to_string(v_normalized_ids, ','));
  v_token := 'ss_' || replace(gen_random_uuid()::text, '-', '');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  if v_expires_at is null then
    v_expires_at := now() + interval '7 days';
  end if;

  select s.id
  into v_share_set_id
  from public.share_sets s
  where s.organization_id = v_org_id
    and s.fingerprint = v_fingerprint
    and s.revoked_at is null
    and (s.expires_at is null or s.expires_at > now())
  order by s.created_at desc
  limit 1;

  if v_share_set_id is null then
    insert into public.share_sets (
      organization_id,
      created_by,
      token_hash,
      token_hash_algo,
      token_prefix,
      fingerprint,
      expires_at
    )
    values (
      v_org_id,
      auth.uid(),
      v_token_hash,
      v_token_hash_algo,
      left(v_token, 10),
      v_fingerprint,
      v_expires_at
    )
    returning id into v_share_set_id;
  else
    update public.share_sets
      set token_hash = v_token_hash,
          token_hash_algo = v_token_hash_algo,
          token_prefix = left(v_token, 10),
          expires_at = v_expires_at,
          revoked_at = null
    where id = v_share_set_id;

    delete from public.share_set_items ssi
    where ssi.share_set_id = v_share_set_id;
  end if;

  insert into public.share_set_items (share_set_id, image_id, media_item_id, item_order)
  select
    v_share_set_id,
    COALESCE(m.source_image_id, m.id) as image_id,
    m.id as media_item_id,
    row_number() over (order by m.id)
  from (
    select distinct m.id, m.source_image_id
    from unnest(v_normalized_ids) ids(id)
    join public.media_items m
      on m.organization_id = v_org_id
     and m.media_type = 'image'
     and (m.id = ids.id or m.source_image_id = ids.id)
  ) m
  on conflict (share_set_id, image_id)
  do update set
    media_item_id = excluded.media_item_id,
    item_order = excluded.item_order;

  return query select v_share_set_id, v_token, v_expires_at;
end;
$function$;


CREATE OR REPLACE FUNCTION public.enforce_image_project_same_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_image_org uuid;
  v_project_org uuid;
BEGIN
  SELECT organization_id INTO v_image_org
  FROM public.media_items
  WHERE id = COALESCE(
    NEW.media_item_id,
    (
      SELECT m.id
      FROM public.media_items m
      WHERE m.source_image_id = NEW.image_id
      LIMIT 1
    )
  );

  SELECT organization_id INTO v_project_org
  FROM public.projects
  WHERE id = NEW.project_id;

  IF v_image_org IS NULL OR v_project_org IS NULL OR v_image_org <> v_project_org THEN
    RAISE EXCEPTION 'image_projects cross-organization link is not allowed';
  END IF;

  RETURN NEW;
END;
$function$;


CREATE OR REPLACE FUNCTION public.get_unresolved_images(p_limit integer DEFAULT 50)
RETURNS TABLE(
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
    AND m.media_type = 'image'
    AND (
      (
        m.latitude IS NOT NULL AND m.longitude IS NOT NULL
        AND (m.address_label IS NULL OR m.city IS NULL OR m.district IS NULL OR m.street IS NULL OR m.country IS NULL)
      )
      OR
      (
        m.latitude IS NULL AND m.longitude IS NULL
        AND m.address_label IS NOT NULL
      )
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit;
$function$;


CREATE OR REPLACE FUNCTION public.list_orphaned_storage_paths(p_limit integer DEFAULT 1000)
RETURNS TABLE(object_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'storage'
AS $function$
  select o.name as object_name
  from storage.objects o
  where o.bucket_id = 'media'
    and not exists (
      select 1
      from public.media_items m
      where m.storage_path = o.name
         or m.thumbnail_path = o.name
         or m.poster_path = o.name
    )
  order by o.created_at asc
  limit greatest(1, coalesce(p_limit, 1000));
$function$;


CREATE OR REPLACE FUNCTION public.resolve_image_location(
  p_image_id uuid,
  p_latitude numeric DEFAULT NULL::numeric,
  p_longitude numeric DEFAULT NULL::numeric,
  p_address_label text DEFAULT NULL::text,
  p_city text DEFAULT NULL::text,
  p_district text DEFAULT NULL::text,
  p_street text DEFAULT NULL::text,
  p_country text DEFAULT NULL::text
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
     SET latitude       = COALESCE(p_latitude, m.latitude),
         longitude      = COALESCE(p_longitude, m.longitude),
         address_label  = COALESCE(p_address_label, m.address_label),
         city           = COALESCE(p_city, m.city),
         district       = COALESCE(p_district, m.district),
         street         = COALESCE(p_street, m.street),
         country        = COALESCE(p_country, m.country),
         location_status = 'resolved',
         updated_at     = now()
   WHERE m.organization_id = _org_id
     AND m.media_type = 'image'
     AND (
       m.id = p_image_id
       OR m.source_image_id = p_image_id
     );

  RETURN FOUND;
END;
$function$;


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
  filtered AS (
    SELECT
      m.id,
      m.source_image_id,
      m.latitude,
      m.longitude,
      m.storage_path AS s_path,
      m.thumbnail_path AS t_path,
      m.exif_latitude  AS exif_lat,
      m.exif_longitude AS exif_lng,
      m.created_at     AS c_at,
      CASE WHEN g.cell_size > 0
        THEN ROUND(m.latitude  / g.cell_size) * g.cell_size
        ELSE m.latitude
      END AS snap_lat,
      CASE WHEN g.cell_size > 0
        THEN ROUND(m.longitude / g.cell_size) * g.cell_size
        ELSE m.longitude
      END AS snap_lng
    FROM public.media_items m, grid g
    WHERE m.organization_id = public.user_org_id()
      AND m.media_type = 'image'
      AND m.geog IS NOT NULL
      AND extensions.ST_Intersects(m.geog, g.viewport_geog)
  ),
  clustered AS (
    SELECT
      snap_lat,
      snap_lng,
      COUNT(*) AS cnt,
      CASE WHEN COUNT(*) = 1 THEN MIN(COALESCE(source_image_id, id)::text)::uuid END AS single_id,
      CASE WHEN COUNT(*) = 1 THEN MIN(s_path) END AS single_s_path,
      CASE WHEN COUNT(*) = 1 THEN MIN(t_path) END AS single_t_path,
      CASE WHEN COUNT(*) = 1 THEN MIN(exif_lat) END AS single_exif_lat,
      CASE WHEN COUNT(*) = 1 THEN MIN(exif_lng) END AS single_exif_lng,
      CASE WHEN COUNT(*) = 1 THEN MIN(c_at) END AS single_c_at,
      AVG(latitude) AS avg_lat,
      AVG(longitude) AS avg_lng
    FROM filtered
    GROUP BY snap_lat, snap_lng
  )
  SELECT
    ROUND(avg_lat, 7) AS cluster_lat,
    ROUND(avg_lng, 7) AS cluster_lng,
    cnt AS image_count,
    single_id AS image_id,
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
