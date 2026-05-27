-- =============================================================================
-- projects ↔ locations N:N (project_locations)
-- Used for tier-3 upload address + Branch B geocode bias.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.project_locations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  location_id     uuid NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_project_locations_pair UNIQUE (project_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_project_locations_project_sort
  ON public.project_locations(project_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_project_locations_location
  ON public.project_locations(location_id);

ALTER TABLE public.project_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_locations: org read" ON public.project_locations;
CREATE POLICY "project_locations: org read"
  ON public.project_locations FOR SELECT
  USING (organization_id = public.user_org_id());

DROP POLICY IF EXISTS "project_locations: org write" ON public.project_locations;
CREATE POLICY "project_locations: org write"
  ON public.project_locations FOR ALL
  USING (organization_id = public.user_org_id() AND NOT public.is_viewer())
  WITH CHECK (
    organization_id = public.user_org_id()
    AND NOT public.is_viewer()
    AND EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id AND p.organization_id = public.user_org_id()
    )
    AND EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = location_id AND l.organization_id = public.user_org_id()
    )
  );

-- List linked locations for a project (org-scoped).
CREATE OR REPLACE FUNCTION public.list_project_locations(p_project_id uuid)
RETURNS TABLE (
  link_id uuid,
  sort_order integer,
  location_id uuid,
  street text,
  house_number text,
  postcode text,
  city text,
  district text,
  country text,
  latitude numeric,
  longitude numeric,
  address_label text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $function$
  SELECT
    pl.id AS link_id,
    pl.sort_order,
    l.id AS location_id,
    l.street,
    l.house_number,
    l.postcode,
    l.city,
    l.district,
    l.country,
    l.latitude,
    l.longitude,
    l.address_label
  FROM public.project_locations pl
  JOIN public.locations l ON l.id = pl.location_id
  JOIN public.projects p ON p.id = pl.project_id
  WHERE pl.project_id = p_project_id
    AND pl.organization_id = public.user_org_id()
    AND p.organization_id = public.user_org_id()
  ORDER BY pl.sort_order ASC, pl.created_at ASC;
$function$;

GRANT EXECUTE ON FUNCTION public.list_project_locations(uuid) TO authenticated;

-- Link existing location to project.
CREATE OR REPLACE FUNCTION public.link_project_location(
  p_project_id uuid,
  p_location_id uuid,
  p_sort_order integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_org_id uuid;
  v_link_id uuid;
BEGIN
  v_org_id := public.user_org_id();
  IF public.is_viewer() THEN
    RAISE EXCEPTION 'viewers cannot link project locations';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id AND p.organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'project not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.locations l
    WHERE l.id = p_location_id AND l.organization_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'location not found';
  END IF;

  INSERT INTO public.project_locations (project_id, location_id, organization_id, sort_order)
  VALUES (p_project_id, p_location_id, v_org_id, COALESCE(p_sort_order, 0))
  ON CONFLICT (project_id, location_id) DO UPDATE
    SET sort_order = EXCLUDED.sort_order
  RETURNING id INTO v_link_id;

  RETURN v_link_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.link_project_location(uuid, uuid, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.unlink_project_location(
  p_project_id uuid,
  p_location_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $function$
DECLARE
  v_deleted integer;
BEGIN
  IF public.is_viewer() THEN
    RAISE EXCEPTION 'viewers cannot unlink project locations';
  END IF;

  DELETE FROM public.project_locations pl
  WHERE pl.project_id = p_project_id
    AND pl.location_id = p_location_id
    AND pl.organization_id = public.user_org_id();

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.unlink_project_location(uuid, uuid) TO authenticated;
