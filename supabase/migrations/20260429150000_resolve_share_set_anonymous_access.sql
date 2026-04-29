-- =============================================================================
-- Share links: resolve by token alone for anonymous viewers (no caller org gate).
-- Possession of a valid, non-expired, non-revoked token is the authorization model.
-- =============================================================================

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
    where (
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

GRANT EXECUTE ON FUNCTION public.resolve_share_set(text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_share_set(text) TO authenticated;
