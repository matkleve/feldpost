-- Folder-tree RPCs for the /files page (STUDY-006 Phase 5.5).
--
-- Applied on hosted Feldpost (`yvvzbpnoesxlzlbomlkv`) as migration version
-- `20260920120000`. Verified 2026-09-22: both RPCs exist; `anon` EXECUTE revoked,
-- `authenticated` EXECUTE granted. Cross-org read test and full Sensitive ceremony:
-- issue #217.
--
-- Why RPCs at all: the tree shows a file count and an unresolved count per
-- folder. Counting a subtree client-side means fetching every row, which at
-- 100 000 items reintroduces exactly the per-row cost STUDY-006 Phase 3
-- removed. Aggregation therefore happens in SQL.
--
-- @see docs/specs/page/files-page.md

-- ── children of one folder, with aggregate counts ──────────────────────────
--
-- `p_prefix` is '' for the root, otherwise a folder path with no trailing
-- slash, e.g. 'Wien/Thalistraße 4'.
--
-- Matching uses starts_with() rather than LIKE: a folder name may legitimately
-- contain '%' or '_', and LIKE would treat those as wildcards, silently
-- folding unrelated folders into one node.
CREATE OR REPLACE FUNCTION public.list_media_folder_children(p_prefix text DEFAULT '')
RETURNS TABLE (
  segment text,
  file_count bigint,
  unresolved_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_org uuid;
  v_prefix text;
  v_offset int;
BEGIN
  v_org := public.user_org_id();
  IF v_org IS NULL THEN
    -- Same shape as the other org-scoped RPCs: no org, no rows, no detail.
    RAISE EXCEPTION 'not_found';
  END IF;

  v_prefix := coalesce(p_prefix, '');
  -- Characters to skip before the remainder: the prefix plus its '/'.
  v_offset := CASE WHEN v_prefix = '' THEN 1 ELSE length(v_prefix) + 2 END;

  RETURN QUERY
  WITH scoped AS (
    SELECT
      substr(m.relative_path, v_offset) AS remainder,
      m.location_status
    FROM public.media_items m
    WHERE m.organization_id = v_org
      AND m.relative_path IS NOT NULL
      AND (v_prefix = '' OR starts_with(m.relative_path, v_prefix || '/'))
  )
  SELECT
    split_part(s.remainder, '/', 1) AS segment,
    count(*) AS file_count,
    -- "Unresolved" is deliberately the SAME predicate bulk resolution uses for
    -- eligibility, so the badge counts exactly what a folder-level answer
    -- would act on. If these two ever diverge, the badge becomes a number the
    -- user cannot act on.
    count(*) FILTER (
      WHERE s.location_status IS NULL
         OR s.location_status NOT IN ('resolved', 'gps')
    ) AS unresolved_count
  FROM scoped s
  -- A remainder with no '/' is a file sitting directly in this folder, not a
  -- child folder; those are listed by list_media_in_folder, not counted here.
  WHERE position('/' IN s.remainder) > 0
  GROUP BY 1
  ORDER BY 1;
END;
$function$;

-- ── files in one folder ────────────────────────────────────────────────────
--
-- `p_recursive = false` lists only files directly in the folder;
-- true includes every descendant.
CREATE OR REPLACE FUNCTION public.list_media_in_folder(
  p_prefix text DEFAULT '',
  p_recursive boolean DEFAULT false,
  p_limit int DEFAULT 200,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  relative_path text,
  original_filename text,
  storage_path text,
  thumbnail_path text,
  captured_at timestamptz,
  location_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_org uuid;
  v_prefix text;
  v_offset int;
BEGIN
  v_org := public.user_org_id();
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  v_prefix := coalesce(p_prefix, '');
  v_offset := CASE WHEN v_prefix = '' THEN 1 ELSE length(v_prefix) + 2 END;

  RETURN QUERY
  SELECT
    m.id,
    m.relative_path,
    m.original_filename,
    m.storage_path,
    m.thumbnail_path,
    m.captured_at,
    m.location_status
  FROM public.media_items m
  WHERE m.organization_id = v_org
    AND m.relative_path IS NOT NULL
    AND (v_prefix = '' OR starts_with(m.relative_path, v_prefix || '/'))
    AND (
      p_recursive
      OR position('/' IN substr(m.relative_path, v_offset)) = 0
    )
  ORDER BY m.relative_path
  LIMIT greatest(0, coalesce(p_limit, 200))
  OFFSET greatest(0, coalesce(p_offset, 0));
END;
$function$;

-- ── grants ─────────────────────────────────────────────────────────────────
--
-- Supabase grants EXECUTE on every new function to `anon` as its own explicit
-- role grant, independent of PUBLIC. REVOKE ... FROM PUBLIC alone does NOT
-- strip it — see 20260911120000_revoke_anon_execute_on_authenticated_rpcs.sql,
-- where exactly that gap made every "authenticated only" RPC anon-callable.
REVOKE ALL ON FUNCTION public.list_media_folder_children(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_media_in_folder(text, boolean, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_media_folder_children(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_media_in_folder(text, boolean, int, int) TO authenticated;
