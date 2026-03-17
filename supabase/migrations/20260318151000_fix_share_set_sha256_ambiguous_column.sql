-- Ensure the SHA-256 share-set function does not hit ambiguous OUT-param column names.
-- This migration must run after 20260318140000_share_set_token_sha256.sql.

create or replace function public.create_or_reuse_share_set(
  p_image_ids uuid[],
  p_expires_at timestamptz default null
)
returns table (
  share_set_id uuid,
  token text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
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
  left join public.images i on i.id = u.id
  where i.id is null or i.organization_id <> v_org_id;

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

  insert into public.share_set_items (share_set_id, image_id, item_order)
  select
    v_share_set_id,
    ids.id,
    row_number() over (order by ids.id)
  from unnest(v_normalized_ids) ids(id)
  on conflict (share_set_id, image_id)
  do update set item_order = excluded.item_order;

  return query select v_share_set_id, v_token, v_expires_at;
end;
$$;
