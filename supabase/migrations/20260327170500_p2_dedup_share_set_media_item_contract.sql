-- =============================================================================
-- P2: dedup + share-set contracts on media_item_id
-- =============================================================================
-- Goals:
-- 1) Move dedup_hashes write/read contract from image_id -> media_item_id.
-- 2) Move share_set_items contract from image_id -> media_item_id.
-- 3) Keep create_or_reuse_share_set() input compatible with legacy IDs by
--    resolving via media_items.id OR media_items.source_image_id.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- dedup_hashes: backfill, enforce media_item_id, drop legacy image_id
-- -----------------------------------------------------------------------------
UPDATE public.dedup_hashes dh
SET media_item_id = m.id
FROM public.media_items m
WHERE dh.media_item_id IS NULL
  AND (m.id = dh.image_id OR m.source_image_id = dh.image_id);

DO $$
DECLARE
  v_missing integer;
BEGIN
  SELECT count(*) INTO v_missing
  FROM public.dedup_hashes
  WHERE media_item_id IS NULL;

  IF v_missing > 0 THEN
    -- Orphaned dedup hashes can appear when legacy image rows were removed.
    DELETE FROM public.dedup_hashes
    WHERE media_item_id IS NULL;
  END IF;
END
$$;

ALTER TABLE public.dedup_hashes
  ALTER COLUMN media_item_id SET NOT NULL;

DROP INDEX IF EXISTS public.idx_dedup_hashes_image_id;

ALTER TABLE public.dedup_hashes
  DROP COLUMN IF EXISTS image_id;

DROP FUNCTION IF EXISTS public.check_dedup_hashes(text[]);

CREATE FUNCTION public.check_dedup_hashes(hashes text[])
RETURNS TABLE(content_hash text, media_item_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT dh.content_hash, dh.media_item_id
  FROM public.dedup_hashes dh
  JOIN public.media_items m ON m.id = dh.media_item_id
  WHERE dh.user_id = auth.uid()
    AND dh.content_hash = ANY(hashes)
    AND m.storage_path IS NOT NULL;
$$;

-- -----------------------------------------------------------------------------
-- share_set_items: backfill, enforce media_item_id, drop legacy image_id
-- -----------------------------------------------------------------------------
UPDATE public.share_set_items ssi
SET media_item_id = m.id
FROM public.media_items m
WHERE ssi.media_item_id IS NULL
  AND (m.id = ssi.image_id OR m.source_image_id = ssi.image_id);

DO $$
DECLARE
  v_missing integer;
BEGIN
  SELECT count(*) INTO v_missing
  FROM public.share_set_items
  WHERE media_item_id IS NULL;

  IF v_missing > 0 THEN
    -- Unresolvable legacy links are removed to keep share set integrity.
    DELETE FROM public.share_set_items
    WHERE media_item_id IS NULL;
  END IF;
END
$$;

ALTER TABLE public.share_set_items
  ALTER COLUMN media_item_id SET NOT NULL;

ALTER TABLE public.share_set_items
  DROP CONSTRAINT IF EXISTS share_set_items_pkey;

ALTER TABLE public.share_set_items
  ADD CONSTRAINT share_set_items_pkey PRIMARY KEY (share_set_id, media_item_id);

ALTER TABLE public.share_set_items
  DROP COLUMN IF EXISTS image_id;

-- -----------------------------------------------------------------------------
-- share-set functions: media_item_id contract
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_or_reuse_share_set(
  p_image_ids uuid[],
  p_expires_at timestamptz DEFAULT NULL::timestamptz
)
RETURNS TABLE(
  share_set_id uuid,
  token text,
  expires_at timestamptz
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

  insert into public.share_set_items (share_set_id, media_item_id, item_order)
  select
    v_share_set_id,
    m.id as media_item_id,
    row_number() over (order by m.id)
  from (
    select distinct m.id
    from unnest(v_normalized_ids) ids(id)
    join public.media_items m
      on m.organization_id = v_org_id
     and m.media_type = 'image'
     and (m.id = ids.id or m.source_image_id = ids.id)
  ) m
  on conflict (share_set_id, media_item_id)
  do update set
    item_order = excluded.item_order;

  return query select v_share_set_id, v_token, v_expires_at;
end;
$function$;

DROP FUNCTION IF EXISTS public.resolve_share_set(text);

CREATE FUNCTION public.resolve_share_set(
  p_token text
)
RETURNS TABLE (
  share_set_id uuid,
  media_item_id uuid,
  item_order int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  with target as (
    select s.id
    from public.share_sets s
    where s.organization_id = public.user_org_id()
      and (
        (s.token_hash_algo = 'sha256' and s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex'))
        or
        (s.token_hash_algo = 'md5' and s.token_hash = md5(p_token))
      )
      and s.revoked_at is null
      and (s.expires_at is null or s.expires_at > now())
    limit 1
  )
  select i.share_set_id, i.media_item_id, i.item_order
  from public.share_set_items i
  join target t on t.id = i.share_set_id
  order by i.item_order;
$$;
