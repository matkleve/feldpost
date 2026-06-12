-- =============================================================================
-- Relax media ↔ project membership rules (allow 0..n projects)
--
-- Domain model:
-- - A media item can belong to 0..n projects.
-- - primary_project_id is optional (nullable). When present, it must be same-org.
-- - No special-case restriction for no_gps/unresolved items.
-- =============================================================================

-- 1) Make primary_project_id optional.
ALTER TABLE public.media_items
  ALTER COLUMN primary_project_id DROP NOT NULL;

-- 2) Update same-org enforcement to allow NULL primary_project_id.
CREATE OR REPLACE FUNCTION public.enforce_media_item_primary_project_same_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_project_org uuid;
BEGIN
  IF NEW.primary_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.organization_id INTO v_project_org
  FROM public.projects p
  WHERE p.id = NEW.primary_project_id;

  IF v_project_org IS NULL OR NEW.organization_id <> v_project_org THEN
    RAISE EXCEPTION 'media_items primary project must belong to same organization';
  END IF;

  RETURN NEW;
END;
$$;

-- 3) Remove auto-primary-membership sync (primary is optional now).
DROP TRIGGER IF EXISTS trg_media_items_ensure_primary_membership ON public.media_items;
DROP FUNCTION IF EXISTS public.ensure_primary_media_membership();

-- 4) Remove deferred membership validation that enforced mandatory membership/primary.
DROP TRIGGER IF EXISTS trg_media_projects_validate_membership_rules ON public.media_projects;
DROP TRIGGER IF EXISTS trg_media_items_validate_membership_rules ON public.media_items;
DROP FUNCTION IF EXISTS public.run_media_membership_validation_from_media_projects();
DROP FUNCTION IF EXISTS public.run_media_membership_validation_from_media_items();
DROP FUNCTION IF EXISTS public.validate_media_membership_rules(uuid);

