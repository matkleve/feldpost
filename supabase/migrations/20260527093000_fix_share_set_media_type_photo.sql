-- Share-set RPCs still filtered media_type = 'image' after canonical type became 'photo'.
-- That caused create_or_reuse_share_set to raise for every real photo (HTTP 400 via PostgREST).

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

  SELECT coalesce(array_agg(resolved.id ORDER BY resolved.id), '{}'::uuid[])
  INTO v_normalized_ids
  FROM (
    SELECT DISTINCT unnest(coalesce(p_image_ids, '{}'::uuid[])) AS input_id
  ) dedup
  JOIN LATERAL (
    SELECT m.id
    FROM public.media_items m
    WHERE m.organization_id = v_org_id
      AND m.media_type = 'photo'
      AND (m.id = dedup.input_id OR m.source_image_id = dedup.input_id)
    LIMIT 1
  ) resolved ON true;

  IF coalesce(array_length(v_normalized_ids, 1), 0) = 0 THEN
    RAISE EXCEPTION 'No images provided';
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

  INSERT INTO public.share_set_items AS ssi (share_set_id, media_item_id, item_order)
  SELECT
    v_share_set_id,
    u.id,
    row_number() OVER (ORDER BY u.id)
  FROM unnest(v_normalized_ids) AS u(id)
  ON CONFLICT ON CONSTRAINT share_set_items_pkey
  DO UPDATE SET
    item_order = EXCLUDED.item_order;

  DELETE FROM public.share_set_recipients r
   WHERE r.share_set_id = v_share_set_id;

  IF p_audience = 'named'::public.share_link_audience THEN
    INSERT INTO public.share_set_recipients AS ssr (share_set_id, user_id)
    SELECT v_share_set_id, u.uid
    FROM unnest(p_recipient_user_ids) AS u(uid);
  END IF;

  RETURN QUERY SELECT v_share_set_id, v_token, v_expires_at;
END;
$function$;
