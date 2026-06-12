-- =============================================================================
-- Share links: audience (public | organization | named), grant (view), recipients
-- Single resolve_share_set RPC branches on share_sets.audience + caller context.
-- =============================================================================

-- Enum types (idempotent)
DO $$
BEGIN
  CREATE TYPE public.share_link_audience AS ENUM ('public', 'organization', 'named');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE public.share_link_grant AS ENUM ('view');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE public.share_sets
  ADD COLUMN IF NOT EXISTS audience public.share_link_audience NOT NULL DEFAULT 'public'::public.share_link_audience;

ALTER TABLE public.share_sets
  ADD COLUMN IF NOT EXISTS share_grant public.share_link_grant NOT NULL DEFAULT 'view'::public.share_link_grant;

CREATE TABLE IF NOT EXISTS public.share_set_recipients (
  share_set_id uuid NOT NULL REFERENCES public.share_sets (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (share_set_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_share_set_recipients_user_id
  ON public.share_set_recipients (user_id);

ALTER TABLE public.share_set_recipients ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- create_or_reuse_share_set: optional audience, grant, named recipients
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_or_reuse_share_set(uuid[], timestamptz);
DROP FUNCTION IF EXISTS public.create_or_reuse_share_set(
  uuid[],
  timestamptz,
  public.share_link_audience,
  public.share_link_grant,
  uuid[]
);

CREATE OR REPLACE FUNCTION public.create_or_reuse_share_set(
  p_image_ids uuid[],
  p_expires_at timestamptz DEFAULT NULL::timestamptz,
  p_audience public.share_link_audience DEFAULT 'public'::public.share_link_audience,
  p_share_grant public.share_link_grant DEFAULT 'view'::public.share_link_grant,
  p_recipient_user_ids uuid[] DEFAULT NULL::uuid[]
)
RETURNS TABLE (
  share_set_id uuid,
  token text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id uuid := public.user_org_id();
  v_normalized_ids uuid[];
  v_fingerprint text;
  v_share_set_id uuid;
  v_token text;
  v_token_hash text;
  v_token_hash_algo text := 'sha256';
  v_expires_at timestamptz := p_expires_at;
  v_bad_count int;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF public.is_viewer() THEN
    RAISE EXCEPTION 'Viewer role cannot create share links';
  END IF;

  SELECT coalesce(array_agg(id ORDER BY id), '{}'::uuid[])
  INTO v_normalized_ids
  FROM (
    SELECT DISTINCT unnest(coalesce(p_image_ids, '{}'::uuid[])) AS id
  ) dedup;

  IF coalesce(array_length(v_normalized_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'No images provided';
  END IF;

  SELECT count(*)
  INTO v_bad_count
  FROM unnest(v_normalized_ids) AS u(id)
  LEFT JOIN public.media_items m
    ON m.organization_id = v_org_id
   AND m.media_type = 'image'
   AND (m.id = u.id OR m.source_image_id = u.id)
  WHERE m.id IS NULL;

  IF v_bad_count > 0 THEN
    RAISE EXCEPTION 'Selection contains images outside your organization';
  END IF;

  IF p_audience = 'named'::public.share_link_audience THEN
    IF p_recipient_user_ids IS NULL OR coalesce(array_length(p_recipient_user_ids, 1), 0) = 0 THEN
      RAISE EXCEPTION 'Named share links require at least one recipient';
    END IF;

    SELECT count(*)
    INTO v_bad_count
    FROM unnest(p_recipient_user_ids) AS u(uid)
    LEFT JOIN public.profiles p
      ON p.id = u.uid
     AND p.organization_id = v_org_id
    WHERE p.id IS NULL;

    IF v_bad_count > 0 THEN
      RAISE EXCEPTION 'Recipients must be users in your organization';
    END IF;
  END IF;

  v_fingerprint := md5(array_to_string(v_normalized_ids, ','));
  v_token := 'ss_' || replace(gen_random_uuid()::text, '-', '');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  IF v_expires_at IS NULL THEN
    v_expires_at := now() + interval '7 days';
  END IF;

  SELECT s.id
  INTO v_share_set_id
  FROM public.share_sets s
  WHERE s.organization_id = v_org_id
    AND s.fingerprint = v_fingerprint
    AND s.revoked_at IS NULL
  LIMIT 1;

  IF v_share_set_id IS NULL THEN
    INSERT INTO public.share_sets (
      organization_id,
      created_by,
      token_hash,
      token_hash_algo,
      token_prefix,
      fingerprint,
      expires_at,
      audience,
      share_grant
    )
    VALUES (
      v_org_id,
      auth.uid(),
      v_token_hash,
      v_token_hash_algo,
      left(v_token, 10),
      v_fingerprint,
      v_expires_at,
      p_audience,
      p_share_grant
    )
    RETURNING id INTO v_share_set_id;
  ELSE
    UPDATE public.share_sets
       SET token_hash = v_token_hash,
           token_hash_algo = v_token_hash_algo,
           token_prefix = left(v_token, 10),
           expires_at = v_expires_at,
           revoked_at = NULL,
           audience = p_audience,
           share_grant = p_share_grant
     WHERE id = v_share_set_id;

    DELETE FROM public.share_set_items ssi
     WHERE ssi.share_set_id = v_share_set_id;
  END IF;

  INSERT INTO public.share_set_items (share_set_id, media_item_id, item_order)
  SELECT
    v_share_set_id,
    m.id AS media_item_id,
    row_number() OVER (ORDER BY m.id)
  FROM (
    SELECT DISTINCT m.id
    FROM unnest(v_normalized_ids) ids(id)
    JOIN public.media_items m
      ON m.organization_id = v_org_id
     AND m.media_type = 'image'
     AND (m.id = ids.id OR m.source_image_id = ids.id)
  ) m
  ON CONFLICT (share_set_id, media_item_id)
  DO UPDATE SET
    item_order = excluded.item_order;

  DELETE FROM public.share_set_recipients r
   WHERE r.share_set_id = v_share_set_id;

  IF p_audience = 'named'::public.share_link_audience THEN
    INSERT INTO public.share_set_recipients (share_set_id, user_id)
    SELECT v_share_set_id, u.uid
    FROM unnest(p_recipient_user_ids) AS u(uid);
  END IF;

  RETURN QUERY SELECT v_share_set_id, v_token, v_expires_at;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_or_reuse_share_set(
  uuid[],
  timestamptz,
  public.share_link_audience,
  public.share_link_grant,
  uuid[]
) TO authenticated;

-- -----------------------------------------------------------------------------
-- resolve_share_set: single gatekeeper; branches on audience + caller
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.resolve_share_set(text);

CREATE OR REPLACE FUNCTION public.resolve_share_set(p_token text)
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
  WITH matched AS (
    SELECT s.id,
           s.organization_id,
           s.audience,
           s.share_grant
    FROM public.share_sets s
    WHERE (
        (s.token_hash_algo = 'sha256' AND s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex'))
        OR
        (s.token_hash_algo = 'md5' AND s.token_hash = md5(p_token))
      )
      AND s.revoked_at IS NULL
      AND (s.expires_at IS NULL OR s.expires_at > now())
    LIMIT 1
  ),
  authorized AS (
    SELECT m.id
    FROM matched m
    WHERE m.share_grant = 'view'::public.share_link_grant
      AND (
        m.audience = 'public'::public.share_link_audience
        OR (
          m.audience = 'organization'::public.share_link_audience
          AND auth.uid() IS NOT NULL
          AND public.user_org_id() = m.organization_id
        )
        OR (
          m.audience = 'named'::public.share_link_audience
          AND auth.uid() IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.share_set_recipients r
            WHERE r.share_set_id = m.id
              AND r.user_id = auth.uid()
          )
        )
      )
  )
  SELECT i.share_set_id, i.media_item_id, i.item_order
  FROM public.share_set_items i
  JOIN authorized a ON a.id = i.share_set_id
  ORDER BY i.item_order;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_share_set(text) TO anon;
GRANT EXECUTE ON FUNCTION public.resolve_share_set(text) TO authenticated;
