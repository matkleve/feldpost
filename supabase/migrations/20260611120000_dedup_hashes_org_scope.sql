-- Org-scoped dedup_hashes + registered_by for resume vs colleague duplicate UX.
-- @see docs/specs/service/media-upload-service/upload-manager-pipeline.dedup-scope.supplement.md

ALTER TABLE public.dedup_hashes
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

ALTER TABLE public.dedup_hashes
  ADD COLUMN IF NOT EXISTS hash_algo text NOT NULL DEFAULT 'photo_v1';

UPDATE public.dedup_hashes dh
SET organization_id = m.organization_id
FROM public.media_items m
WHERE dh.media_item_id = m.id
  AND dh.organization_id IS NULL;

DELETE FROM public.dedup_hashes
WHERE organization_id IS NULL;

ALTER TABLE public.dedup_hashes
  ALTER COLUMN organization_id SET NOT NULL;

-- Collapse per-user duplicates to one org row (keep row with persisted storage).
WITH ranked AS (
  SELECT
    dh.id,
    ROW_NUMBER() OVER (
      PARTITION BY dh.organization_id, dh.content_hash
      ORDER BY (m.storage_path IS NOT NULL) DESC, dh.created_at ASC
    ) AS rn
  FROM public.dedup_hashes dh
  JOIN public.media_items m ON m.id = dh.media_item_id
)
DELETE FROM public.dedup_hashes dh
USING ranked r
WHERE dh.id = r.id
  AND r.rn > 1;

DROP INDEX IF EXISTS public.idx_dedup_hashes_user_hash;

ALTER TABLE public.dedup_hashes
  DROP CONSTRAINT IF EXISTS dedup_hashes_user_id_content_hash_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dedup_hashes_org_hash
  ON public.dedup_hashes (organization_id, content_hash);

DROP POLICY IF EXISTS "Users manage own hashes" ON public.dedup_hashes;

CREATE POLICY "Org members read dedup hashes"
  ON public.dedup_hashes
  FOR SELECT
  USING (organization_id = public.user_org_id());

CREATE POLICY "Users insert org dedup hashes"
  ON public.dedup_hashes
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND organization_id = public.user_org_id()
  );

DROP FUNCTION IF EXISTS public.check_dedup_hashes(text[]);

CREATE FUNCTION public.check_dedup_hashes(hashes text[])
RETURNS TABLE(
  content_hash text,
  media_item_id uuid,
  registered_by_user_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT dh.content_hash, dh.media_item_id, dh.user_id AS registered_by_user_id
  FROM public.dedup_hashes dh
  JOIN public.media_items m ON m.id = dh.media_item_id
  WHERE dh.organization_id = public.user_org_id()
    AND dh.content_hash = ANY(hashes)
    AND m.storage_path IS NOT NULL;
$$;
