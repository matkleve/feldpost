-- =============================================================================
-- Mixed media indexes and trigger functions
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_media_items_org_primary_project
  ON public.media_items (organization_id, primary_project_id);

CREATE INDEX IF NOT EXISTS idx_media_items_type_status_captured
  ON public.media_items (media_type, location_status, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_media_items_created_by
  ON public.media_items (created_by);

CREATE INDEX IF NOT EXISTS idx_media_items_geog
  ON public.media_items USING GIST (geog);

CREATE INDEX IF NOT EXISTS idx_media_projects_project_media
  ON public.media_projects (project_id, media_item_id);

CREATE INDEX IF NOT EXISTS idx_media_projects_media_project
  ON public.media_projects (media_item_id, project_id);

CREATE INDEX IF NOT EXISTS idx_project_sections_project_sort
  ON public.project_sections (project_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_project_section_items_section_sort
  ON public.project_section_items (section_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_project_section_items_media_item
  ON public.project_section_items (media_item_id);

-- Keep geog in sync with latitude/longitude.
CREATE OR REPLACE FUNCTION public.sync_media_item_geog()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geog := extensions.st_point(NEW.longitude, NEW.latitude)::extensions.geography;
  ELSE
    NEW.geog := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_items_geog ON public.media_items;
CREATE TRIGGER trg_media_items_geog
  BEFORE INSERT OR UPDATE OF latitude, longitude
  ON public.media_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_media_item_geog();

-- Keep updated_at in sync.
DROP TRIGGER IF EXISTS trg_media_items_updated_at ON public.media_items;
CREATE TRIGGER trg_media_items_updated_at
  BEFORE UPDATE ON public.media_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_project_sections_updated_at ON public.project_sections;
CREATE TRIGGER trg_project_sections_updated_at
  BEFORE UPDATE ON public.project_sections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enforce media_items.organization_id = primary project organization.
CREATE OR REPLACE FUNCTION public.enforce_media_item_primary_project_same_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_project_org uuid;
BEGIN
  SELECT p.organization_id INTO v_project_org
  FROM public.projects p
  WHERE p.id = NEW.primary_project_id;

  IF v_project_org IS NULL OR NEW.organization_id <> v_project_org THEN
    RAISE EXCEPTION 'media_items primary project must belong to same organization';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_items_primary_project_same_org ON public.media_items;
CREATE TRIGGER trg_media_items_primary_project_same_org
  BEFORE INSERT OR UPDATE OF organization_id, primary_project_id
  ON public.media_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_media_item_primary_project_same_org();

-- Enforce media_projects same-org links.
CREATE OR REPLACE FUNCTION public.enforce_media_project_same_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_media_org uuid;
  v_project_org uuid;
BEGIN
  SELECT m.organization_id INTO v_media_org
  FROM public.media_items m
  WHERE m.id = NEW.media_item_id;

  SELECT p.organization_id INTO v_project_org
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF v_media_org IS NULL OR v_project_org IS NULL OR v_media_org <> v_project_org THEN
    RAISE EXCEPTION 'media_projects cross-organization link is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_projects_same_org ON public.media_projects;
CREATE TRIGGER trg_media_projects_same_org
  BEFORE INSERT OR UPDATE
  ON public.media_projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_media_project_same_org();

-- Enforce project_sections same-org links.
CREATE OR REPLACE FUNCTION public.enforce_project_section_same_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_project_org uuid;
BEGIN
  SELECT p.organization_id INTO v_project_org
  FROM public.projects p
  WHERE p.id = NEW.project_id;

  IF v_project_org IS NULL OR NEW.organization_id <> v_project_org THEN
    RAISE EXCEPTION 'project_sections organization must match project organization';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_sections_same_org ON public.project_sections;
CREATE TRIGGER trg_project_sections_same_org
  BEFORE INSERT OR UPDATE OF organization_id, project_id
  ON public.project_sections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_section_same_org();

-- Enforce project_section_items same-org links.
CREATE OR REPLACE FUNCTION public.enforce_project_section_item_same_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_section_org uuid;
  v_media_org uuid;
BEGIN
  SELECT s.organization_id INTO v_section_org
  FROM public.project_sections s
  WHERE s.id = NEW.section_id;

  SELECT m.organization_id INTO v_media_org
  FROM public.media_items m
  WHERE m.id = NEW.media_item_id;

  IF v_section_org IS NULL OR v_media_org IS NULL OR v_section_org <> v_media_org THEN
    RAISE EXCEPTION 'project_section_items cross-organization link is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_section_items_same_org ON public.project_section_items;
CREATE TRIGGER trg_project_section_items_same_org
  BEFORE INSERT OR UPDATE
  ON public.project_section_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_project_section_item_same_org();

-- Keep mandatory primary membership in sync.
CREATE OR REPLACE FUNCTION public.ensure_primary_media_membership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.media_projects (media_item_id, project_id)
  VALUES (NEW.id, NEW.primary_project_id)
  ON CONFLICT (media_item_id, project_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_items_ensure_primary_membership ON public.media_items;
CREATE TRIGGER trg_media_items_ensure_primary_membership
  AFTER INSERT OR UPDATE OF primary_project_id
  ON public.media_items
  FOR EACH ROW EXECUTE FUNCTION public.ensure_primary_media_membership();

-- Force document items to be GPS-locked.
CREATE OR REPLACE FUNCTION public.normalize_media_item_gps_assignment_allowed()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.media_type = 'document' THEN
    NEW.gps_assignment_allowed := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_items_normalize_gps_assignment_allowed ON public.media_items;
CREATE TRIGGER trg_media_items_normalize_gps_assignment_allowed
  BEFORE INSERT OR UPDATE OF media_type, gps_assignment_allowed
  ON public.media_items
  FOR EACH ROW EXECUTE FUNCTION public.normalize_media_item_gps_assignment_allowed();

-- Block coordinate assignment when GPS assignment is locked.
CREATE OR REPLACE FUNCTION public.enforce_media_item_gps_assignment_policy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.gps_assignment_allowed = false
     AND (NEW.latitude IS NOT NULL OR NEW.longitude IS NOT NULL) THEN
    RAISE EXCEPTION 'GPS assignment is disabled for this media item type';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_items_gps_assignment_policy ON public.media_items;
CREATE TRIGGER trg_media_items_gps_assignment_policy
  BEFORE INSERT OR UPDATE OF gps_assignment_allowed, latitude, longitude
  ON public.media_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_media_item_gps_assignment_policy();
