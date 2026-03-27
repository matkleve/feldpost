-- =============================================================================
-- P2: coordinate_corrections contract prep for media_item_id
-- =============================================================================
-- Goals:
-- 1) Backfill coordinate_corrections.media_item_id from legacy image references.
-- 2) Remove orphan rows that cannot be resolved to media_items.
-- 3) Enforce media_item_id NOT NULL.
-- 4) Tighten RLS policies to the canonical media_item_id path only.
--
-- Note:
-- - This migration intentionally does NOT drop coordinate_corrections.image_id.
--   Column removal is handled in a separate migration step.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Backfill media_item_id from legacy image_id mapping
-- -----------------------------------------------------------------------------
UPDATE public.coordinate_corrections cc
SET media_item_id = m.id
FROM public.media_items m
WHERE cc.media_item_id IS NULL
  AND cc.image_id IS NOT NULL
  AND (m.id = cc.image_id OR m.source_image_id = cc.image_id);

-- -----------------------------------------------------------------------------
-- Remove unresolved orphan rows before NOT NULL enforcement
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_missing integer;
BEGIN
  SELECT count(*) INTO v_missing
  FROM public.coordinate_corrections
  WHERE media_item_id IS NULL;

  IF v_missing > 0 THEN
    DELETE FROM public.coordinate_corrections
    WHERE media_item_id IS NULL;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- Enforce canonical FK usage
-- -----------------------------------------------------------------------------
ALTER TABLE public.coordinate_corrections
  ALTER COLUMN media_item_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coordinate_corrections_media_item_id
  ON public.coordinate_corrections (media_item_id);

-- -----------------------------------------------------------------------------
-- RLS policies: canonical media_item_id only
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "coordinate_corrections: org read" ON public.coordinate_corrections;
DROP POLICY IF EXISTS "coordinate_corrections: org insert" ON public.coordinate_corrections;

CREATE POLICY "coordinate_corrections: org read"
  ON public.coordinate_corrections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = coordinate_corrections.media_item_id
        AND m.organization_id = public.user_org_id()
    )
  );

CREATE POLICY "coordinate_corrections: org insert"
  ON public.coordinate_corrections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = coordinate_corrections.media_item_id
        AND m.organization_id = public.user_org_id()
    )
  );
