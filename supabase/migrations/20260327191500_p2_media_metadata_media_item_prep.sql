-- =============================================================================
-- P2: media_metadata contract prep for media_item_id
-- =============================================================================
-- Goals:
-- 1) Backfill media_metadata.media_item_id from legacy image references.
-- 2) Remove orphan rows that cannot be resolved to media_items.
-- 3) Enforce media_item_id NOT NULL.
-- 4) Move uniqueness/indexing to media_item_id + metadata_key_id.
-- 5) Tighten RLS policies to canonical media_item_id path only.
--
-- Note:
-- - This migration intentionally does NOT drop media_metadata.image_id.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Backfill media_item_id from legacy image_id mapping
-- -----------------------------------------------------------------------------
UPDATE public.media_metadata mm
SET media_item_id = m.id
FROM public.media_items m
WHERE mm.media_item_id IS NULL
  AND mm.image_id IS NOT NULL
  AND (m.id = mm.image_id OR m.source_image_id = mm.image_id);

-- -----------------------------------------------------------------------------
-- Remove unresolved orphan rows before NOT NULL enforcement
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_missing integer;
BEGIN
  SELECT count(*) INTO v_missing
  FROM public.media_metadata
  WHERE media_item_id IS NULL;

  IF v_missing > 0 THEN
    DELETE FROM public.media_metadata
    WHERE media_item_id IS NULL;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Enforce canonical FK usage and uniqueness contract
-- -----------------------------------------------------------------------------
ALTER TABLE public.media_metadata
  ALTER COLUMN media_item_id SET NOT NULL;

DO $$
DECLARE
  v_conname text;
BEGIN
  FOR v_conname IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.media_metadata'::regclass
      AND c.contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.media_metadata DROP CONSTRAINT IF EXISTS %I', v_conname);
  END LOOP;
END
$$;

ALTER TABLE public.media_metadata
  ADD CONSTRAINT media_metadata_media_item_id_metadata_key_id_key
  UNIQUE (media_item_id, metadata_key_id);

CREATE INDEX IF NOT EXISTS idx_media_metadata_media_item_id
  ON public.media_metadata (media_item_id);

-- -----------------------------------------------------------------------------
-- RLS policies: canonical media_item_id only
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "image_metadata: org read" ON public.media_metadata;
DROP POLICY IF EXISTS "image_metadata: org insert" ON public.media_metadata;
DROP POLICY IF EXISTS "image_metadata: org update" ON public.media_metadata;
DROP POLICY IF EXISTS "image_metadata: org delete" ON public.media_metadata;
DROP POLICY IF EXISTS "media_metadata: org read" ON public.media_metadata;
DROP POLICY IF EXISTS "media_metadata: org insert" ON public.media_metadata;
DROP POLICY IF EXISTS "media_metadata: org update" ON public.media_metadata;
DROP POLICY IF EXISTS "media_metadata: org delete" ON public.media_metadata;

CREATE POLICY "media_metadata: org read"
  ON public.media_metadata
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = media_metadata.media_item_id
        AND m.organization_id = public.user_org_id()
    )
  );

CREATE POLICY "media_metadata: org insert"
  ON public.media_metadata
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = media_metadata.media_item_id
        AND m.organization_id = public.user_org_id()
    )
  );

CREATE POLICY "media_metadata: org update"
  ON public.media_metadata
  FOR UPDATE
  TO authenticated
  USING (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = media_metadata.media_item_id
        AND m.organization_id = public.user_org_id()
    )
  )
  WITH CHECK (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = media_metadata.media_item_id
        AND m.organization_id = public.user_org_id()
    )
  );

CREATE POLICY "media_metadata: org delete"
  ON public.media_metadata
  FOR DELETE
  TO authenticated
  USING (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = media_metadata.media_item_id
        AND m.organization_id = public.user_org_id()
    )
  );
