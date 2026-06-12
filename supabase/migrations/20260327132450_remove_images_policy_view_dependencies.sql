-- =============================================================================
-- Remove policy/view dependencies on public.images before dropping table
-- =============================================================================

-- -----------------------------------------------------------------------------
-- coordinate_corrections policies
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
      WHERE (
        m.id = coordinate_corrections.media_item_id
        OR (
          coordinate_corrections.media_item_id IS NULL
          AND m.source_image_id = coordinate_corrections.image_id
        )
      )
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
      WHERE (
        m.id = coordinate_corrections.media_item_id
        OR (
          coordinate_corrections.media_item_id IS NULL
          AND m.source_image_id = coordinate_corrections.image_id
        )
      )
      AND m.organization_id = public.user_org_id()
    )
  );

-- -----------------------------------------------------------------------------
-- image_metadata policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "image_metadata: org read" ON public.image_metadata;
DROP POLICY IF EXISTS "image_metadata: org insert" ON public.image_metadata;
DROP POLICY IF EXISTS "image_metadata: org update" ON public.image_metadata;
DROP POLICY IF EXISTS "image_metadata: org delete" ON public.image_metadata;

CREATE POLICY "image_metadata: org read"
  ON public.image_metadata
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE (
        m.id = image_metadata.media_item_id
        OR (
          image_metadata.media_item_id IS NULL
          AND m.source_image_id = image_metadata.image_id
        )
      )
      AND m.organization_id = public.user_org_id()
    )
  );

CREATE POLICY "image_metadata: org insert"
  ON public.image_metadata
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE (
        m.id = image_metadata.media_item_id
        OR (
          image_metadata.media_item_id IS NULL
          AND m.source_image_id = image_metadata.image_id
        )
      )
      AND m.organization_id = public.user_org_id()
    )
  );

CREATE POLICY "image_metadata: org update"
  ON public.image_metadata
  FOR UPDATE
  TO authenticated
  USING (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE (
        m.id = image_metadata.media_item_id
        OR (
          image_metadata.media_item_id IS NULL
          AND m.source_image_id = image_metadata.image_id
        )
      )
      AND m.organization_id = public.user_org_id()
    )
  )
  WITH CHECK (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE (
        m.id = image_metadata.media_item_id
        OR (
          image_metadata.media_item_id IS NULL
          AND m.source_image_id = image_metadata.image_id
        )
      )
      AND m.organization_id = public.user_org_id()
    )
  );

CREATE POLICY "image_metadata: org delete"
  ON public.image_metadata
  FOR DELETE
  TO authenticated
  USING (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE (
        m.id = image_metadata.media_item_id
        OR (
          image_metadata.media_item_id IS NULL
          AND m.source_image_id = image_metadata.image_id
        )
      )
      AND m.organization_id = public.user_org_id()
    )
  );

-- -----------------------------------------------------------------------------
-- image_projects policies
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "image_projects: org read" ON public.image_projects;
DROP POLICY IF EXISTS "image_projects: org insert" ON public.image_projects;
DROP POLICY IF EXISTS "image_projects: org update" ON public.image_projects;
DROP POLICY IF EXISTS "image_projects: org delete" ON public.image_projects;

CREATE POLICY "image_projects: org read"
  ON public.image_projects
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE (
        m.id = image_projects.media_item_id
        OR (
          image_projects.media_item_id IS NULL
          AND m.source_image_id = image_projects.image_id
        )
      )
      AND m.organization_id = public.user_org_id()
    )
  );

CREATE POLICY "image_projects: org insert"
  ON public.image_projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE (
        m.id = image_projects.media_item_id
        OR (
          image_projects.media_item_id IS NULL
          AND m.source_image_id = image_projects.image_id
        )
      )
      AND m.organization_id = public.user_org_id()
    )
  );

CREATE POLICY "image_projects: org update"
  ON public.image_projects
  FOR UPDATE
  TO authenticated
  USING (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE (
        m.id = image_projects.media_item_id
        OR (
          image_projects.media_item_id IS NULL
          AND m.source_image_id = image_projects.image_id
        )
      )
      AND m.organization_id = public.user_org_id()
    )
  )
  WITH CHECK (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE (
        m.id = image_projects.media_item_id
        OR (
          image_projects.media_item_id IS NULL
          AND m.source_image_id = image_projects.image_id
        )
      )
      AND m.organization_id = public.user_org_id()
    )
  );

CREATE POLICY "image_projects: org delete"
  ON public.image_projects
  FOR DELETE
  TO authenticated
  USING (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE (
        m.id = image_projects.media_item_id
        OR (
          image_projects.media_item_id IS NULL
          AND m.source_image_id = image_projects.image_id
        )
      )
      AND m.organization_id = public.user_org_id()
    )
  );

-- -----------------------------------------------------------------------------
-- Backfill audit view: remove direct dependency on public.images
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_media_backfill_audit AS
SELECT
  m.organization_id,
  count(*) FILTER (WHERE m.storage_path IS NOT NULL) AS images_with_storage,
  count(*) FILTER (WHERE m.storage_path IS NOT NULL AND m.primary_project_id IS NOT NULL) AS images_eligible_for_media_items,
  count(*) FILTER (WHERE m.storage_path IS NOT NULL) AS images_backfilled_to_media_items,
  0::bigint AS missing_media_items,
  count(*) FILTER (WHERE m.storage_path IS NULL) AS photoless_images_skipped
FROM public.media_items m
WHERE m.media_type = 'image'
GROUP BY m.organization_id;
