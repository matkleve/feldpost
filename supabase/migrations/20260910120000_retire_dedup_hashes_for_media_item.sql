-- Retire stale content-hash rows when a media item's bytes change without deleting the row (replace).
-- Clients may only name media_item_id; organization_id is derived server-side like check_dedup_hashes.
-- @see docs/specs/service/media-upload-service/upload-manager-pipeline.dedup-scope.supplement.md
-- @see docs/audits/upload-flow-review-2026-09-10/02-new-issues.md NF-01

CREATE OR REPLACE FUNCTION public.retire_dedup_hashes_for_media_item(
  p_media_item_id uuid,
  p_keep_content_hash text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_deleted integer;
BEGIN
  SELECT m.organization_id
  INTO v_org_id
  FROM public.media_items m
  WHERE m.id = p_media_item_id;

  IF v_org_id IS NULL THEN
    RETURN 0;
  END IF;

  IF v_org_id IS DISTINCT FROM public.user_org_id() THEN
    RAISE EXCEPTION 'not authorized to retire dedup hashes for this media item'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.dedup_hashes dh
  WHERE dh.media_item_id = p_media_item_id
    AND dh.organization_id = v_org_id
    AND (p_keep_content_hash IS NULL OR dh.content_hash IS DISTINCT FROM p_keep_content_hash);

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.retire_dedup_hashes_for_media_item(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retire_dedup_hashes_for_media_item(uuid, text) TO authenticated;
