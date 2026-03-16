-- =============================================================================
-- RLS policies for mixed media tables
-- =============================================================================

ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_section_items ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- media_items
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "media_items: org read" ON public.media_items;
CREATE POLICY "media_items: org read"
  ON public.media_items
  FOR SELECT
  USING (organization_id = public.user_org_id());

DROP POLICY IF EXISTS "media_items: own insert" ON public.media_items;
CREATE POLICY "media_items: own insert"
  ON public.media_items
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND organization_id = public.user_org_id()
    AND NOT public.is_viewer()
  );

DROP POLICY IF EXISTS "media_items: owner or admin update" ON public.media_items;
CREATE POLICY "media_items: owner or admin update"
  ON public.media_items
  FOR UPDATE
  USING (
    (created_by = auth.uid() OR public.is_admin())
    AND organization_id = public.user_org_id()
    AND NOT public.is_viewer()
  )
  WITH CHECK (
    organization_id = public.user_org_id()
    AND NOT public.is_viewer()
  );

DROP POLICY IF EXISTS "media_items: owner or admin delete" ON public.media_items;
CREATE POLICY "media_items: owner or admin delete"
  ON public.media_items
  FOR DELETE
  USING (
    (created_by = auth.uid() OR public.is_admin())
    AND organization_id = public.user_org_id()
    AND NOT public.is_viewer()
  );

-- -----------------------------------------------------------------------------
-- media_projects
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "media_projects: org read" ON public.media_projects;
CREATE POLICY "media_projects: org read"
  ON public.media_projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = media_item_id
        AND m.organization_id = public.user_org_id()
    )
  );

DROP POLICY IF EXISTS "media_projects: org insert" ON public.media_projects;
CREATE POLICY "media_projects: org insert"
  ON public.media_projects
  FOR INSERT
  WITH CHECK (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = media_item_id
        AND m.organization_id = public.user_org_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND p.organization_id = public.user_org_id()
    )
  );

DROP POLICY IF EXISTS "media_projects: org update" ON public.media_projects;
CREATE POLICY "media_projects: org update"
  ON public.media_projects
  FOR UPDATE
  USING (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = media_item_id
        AND m.organization_id = public.user_org_id()
    )
  )
  WITH CHECK (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = media_item_id
        AND m.organization_id = public.user_org_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = project_id
        AND p.organization_id = public.user_org_id()
    )
  );

DROP POLICY IF EXISTS "media_projects: org delete" ON public.media_projects;
CREATE POLICY "media_projects: org delete"
  ON public.media_projects
  FOR DELETE
  USING (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = media_item_id
        AND m.organization_id = public.user_org_id()
    )
  );

-- -----------------------------------------------------------------------------
-- project_sections
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "project_sections: org read" ON public.project_sections;
CREATE POLICY "project_sections: org read"
  ON public.project_sections
  FOR SELECT
  USING (
    organization_id = public.user_org_id()
  );

DROP POLICY IF EXISTS "project_sections: own insert" ON public.project_sections;
CREATE POLICY "project_sections: own insert"
  ON public.project_sections
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND organization_id = public.user_org_id()
    AND NOT public.is_viewer()
  );

DROP POLICY IF EXISTS "project_sections: owner or admin update" ON public.project_sections;
CREATE POLICY "project_sections: owner or admin update"
  ON public.project_sections
  FOR UPDATE
  USING (
    (created_by = auth.uid() OR public.is_admin())
    AND organization_id = public.user_org_id()
    AND NOT public.is_viewer()
  )
  WITH CHECK (
    organization_id = public.user_org_id()
    AND NOT public.is_viewer()
  );

DROP POLICY IF EXISTS "project_sections: owner or admin delete" ON public.project_sections;
CREATE POLICY "project_sections: owner or admin delete"
  ON public.project_sections
  FOR DELETE
  USING (
    (created_by = auth.uid() OR public.is_admin())
    AND organization_id = public.user_org_id()
    AND NOT public.is_viewer()
  );

-- -----------------------------------------------------------------------------
-- project_section_items
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "project_section_items: org read" ON public.project_section_items;
CREATE POLICY "project_section_items: org read"
  ON public.project_section_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.project_sections s
      WHERE s.id = section_id
        AND s.organization_id = public.user_org_id()
    )
  );

DROP POLICY IF EXISTS "project_section_items: org insert" ON public.project_section_items;
CREATE POLICY "project_section_items: org insert"
  ON public.project_section_items
  FOR INSERT
  WITH CHECK (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.project_sections s
      WHERE s.id = section_id
        AND s.organization_id = public.user_org_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = media_item_id
        AND m.organization_id = public.user_org_id()
    )
  );

DROP POLICY IF EXISTS "project_section_items: org update" ON public.project_section_items;
CREATE POLICY "project_section_items: org update"
  ON public.project_section_items
  FOR UPDATE
  USING (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.project_sections s
      WHERE s.id = section_id
        AND s.organization_id = public.user_org_id()
    )
  )
  WITH CHECK (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.project_sections s
      WHERE s.id = section_id
        AND s.organization_id = public.user_org_id()
    )
    AND EXISTS (
      SELECT 1
      FROM public.media_items m
      WHERE m.id = media_item_id
        AND m.organization_id = public.user_org_id()
    )
  );

DROP POLICY IF EXISTS "project_section_items: org delete" ON public.project_section_items;
CREATE POLICY "project_section_items: org delete"
  ON public.project_section_items
  FOR DELETE
  USING (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.project_sections s
      WHERE s.id = section_id
        AND s.organization_id = public.user_org_id()
    )
  );
