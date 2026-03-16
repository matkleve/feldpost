-- Security and performance hardening for upload pipeline.
-- Addresses advisor findings:
-- - function_search_path_mutable
-- - unindexed_foreign_keys (dedup_hashes.image_id)
-- - auth_rls_initplan (images: own insert)

-- 1) Harden function search_path values
ALTER FUNCTION public.sync_image_geog() SET search_path = public, extensions;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.check_dedup_hashes(text[]) SET search_path = public;

-- 2) Add covering index for dedup hash image foreign key
CREATE INDEX IF NOT EXISTS idx_dedup_hashes_image_id
  ON public.dedup_hashes (image_id);

-- 3) Optimize images insert policy to avoid per-row auth re-evaluation
DROP POLICY IF EXISTS "images: own insert" ON public.images;

CREATE POLICY "images: own insert"
  ON public.images FOR INSERT
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND organization_id = (SELECT public.user_org_id())
    AND NOT (SELECT public.is_viewer())
  );
