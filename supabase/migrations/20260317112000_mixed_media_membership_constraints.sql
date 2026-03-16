-- =============================================================================
-- Mixed media membership constraints
--
-- Enforced at transaction end (deferred constraint triggers):
-- 1) Every media item must have at least one membership.
-- 2) Primary project must always be a membership.
-- 3) no_gps / unresolved media must have exactly one membership.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_media_membership_rules(p_media_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_primary_project_id uuid;
  v_membership_count integer;
  v_has_primary boolean;
BEGIN
  SELECT m.location_status, m.primary_project_id
  INTO v_status, v_primary_project_id
  FROM public.media_items m
  WHERE m.id = p_media_item_id;

  -- Row may be gone due to cascade delete.
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT
    count(*)::int,
    bool_or(mp.project_id = v_primary_project_id)
  INTO v_membership_count, v_has_primary
  FROM public.media_projects mp
  WHERE mp.media_item_id = p_media_item_id;

  IF v_membership_count < 1 THEN
    RAISE EXCEPTION 'media item % must have at least one project membership', p_media_item_id;
  END IF;

  IF coalesce(v_has_primary, false) = false THEN
    RAISE EXCEPTION 'media item % must include its primary project in memberships', p_media_item_id;
  END IF;

  IF v_status IN ('no_gps', 'unresolved') AND v_membership_count <> 1 THEN
    RAISE EXCEPTION 'no_gps/unresolved media item % must have exactly one project membership', p_media_item_id;
  END IF;

  IF v_status = 'gps' AND v_membership_count < 1 THEN
    RAISE EXCEPTION 'gps media item % must have at least one project membership', p_media_item_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_media_membership_validation_from_media_projects()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.validate_media_membership_rules(coalesce(NEW.media_item_id, OLD.media_item_id));
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_media_membership_validation_from_media_items()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.validate_media_membership_rules(NEW.id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_media_projects_validate_membership_rules ON public.media_projects;
CREATE CONSTRAINT TRIGGER trg_media_projects_validate_membership_rules
  AFTER INSERT OR UPDATE OR DELETE ON public.media_projects
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.run_media_membership_validation_from_media_projects();

DROP TRIGGER IF EXISTS trg_media_items_validate_membership_rules ON public.media_items;
CREATE CONSTRAINT TRIGGER trg_media_items_validate_membership_rules
  AFTER INSERT OR UPDATE OF primary_project_id, location_status ON public.media_items
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.run_media_membership_validation_from_media_items();
