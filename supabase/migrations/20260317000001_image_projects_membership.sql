-- =============================================================================
-- Image ↔ Project many-to-many membership
--
-- Adds image_projects join table with RLS and org-integrity trigger.
-- Keeps legacy images.project_id for compatibility during rollout.
-- Also extends cluster_images RPC with project_ids/project_names arrays.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.image_projects (
  image_id    uuid NOT NULL REFERENCES public.images (id) ON DELETE CASCADE,
  project_id  uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (image_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_image_projects_project_image
  ON public.image_projects (project_id, image_id);

CREATE INDEX IF NOT EXISTS idx_image_projects_image_project
  ON public.image_projects (image_id, project_id);

-- Prevent cross-organization links.
CREATE OR REPLACE FUNCTION public.enforce_image_project_same_org()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_image_org uuid;
  v_project_org uuid;
BEGIN
  SELECT organization_id INTO v_image_org
  FROM public.images
  WHERE id = NEW.image_id;

  SELECT organization_id INTO v_project_org
  FROM public.projects
  WHERE id = NEW.project_id;

  IF v_image_org IS NULL OR v_project_org IS NULL OR v_image_org <> v_project_org THEN
    RAISE EXCEPTION 'image_projects cross-organization link is not allowed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_image_projects_same_org ON public.image_projects;

CREATE TRIGGER trg_image_projects_same_org
  BEFORE INSERT OR UPDATE ON public.image_projects
  FOR EACH ROW EXECUTE FUNCTION public.enforce_image_project_same_org();

-- Backfill memberships from legacy nullable FK.
INSERT INTO public.image_projects (image_id, project_id)
SELECT i.id, i.project_id
FROM public.images i
WHERE i.project_id IS NOT NULL
ON CONFLICT (image_id, project_id) DO NOTHING;

ALTER TABLE public.image_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "image_projects: org read" ON public.image_projects;
CREATE POLICY "image_projects: org read"
  ON public.image_projects
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.images i
      WHERE i.id = image_id
        AND i.organization_id = public.user_org_id()
    )
  );

DROP POLICY IF EXISTS "image_projects: org insert" ON public.image_projects;
CREATE POLICY "image_projects: org insert"
  ON public.image_projects
  FOR INSERT
  WITH CHECK (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.images i
      WHERE i.id = image_id
        AND i.organization_id = public.user_org_id()
    )
  );

DROP POLICY IF EXISTS "image_projects: org delete" ON public.image_projects;
CREATE POLICY "image_projects: org delete"
  ON public.image_projects
  FOR DELETE
  USING (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.images i
      WHERE i.id = image_id
        AND i.organization_id = public.user_org_id()
    )
  );

DROP POLICY IF EXISTS "image_projects: org update" ON public.image_projects;
CREATE POLICY "image_projects: org update"
  ON public.image_projects
  FOR UPDATE
  USING (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.images i
      WHERE i.id = image_id
        AND i.organization_id = public.user_org_id()
    )
  )
  WITH CHECK (
    NOT public.is_viewer()
    AND EXISTS (
      SELECT 1
      FROM public.images i
      WHERE i.id = image_id
        AND i.organization_id = public.user_org_id()
    )
  );

-- Keep backward-compatible columns (project_id/project_name), but add arrays.
DROP FUNCTION IF EXISTS public.cluster_images(numeric, numeric, int);

CREATE OR REPLACE FUNCTION public.cluster_images(
  p_cluster_lat numeric,
  p_cluster_lng numeric,
  p_zoom        int
)
RETURNS TABLE (
  image_id       uuid,
  latitude       numeric,
  longitude      numeric,
  thumbnail_path text,
  storage_path   text,
  captured_at    timestamptz,
  created_at     timestamptz,
  project_id     uuid,
  project_name   text,
  project_ids    uuid[],
  project_names  text[],
  direction      numeric,
  exif_latitude  numeric,
  exif_longitude numeric,
  address_label  text,
  city           text,
  district       text,
  street         text,
  country        text,
  user_name      text
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH grid AS (
    SELECT
      CASE
        WHEN p_zoom >= 19 THEN 0::numeric
        ELSE (80.0 * 360.0) / (256.0 * power(2, p_zoom))
      END AS cell_size
  ),
  snapped_input AS (
    SELECT
      CASE WHEN g.cell_size > 0
        THEN ROUND(p_cluster_lat / g.cell_size) * g.cell_size
        ELSE p_cluster_lat
      END AS snap_lat,
      CASE WHEN g.cell_size > 0
        THEN ROUND(p_cluster_lng / g.cell_size) * g.cell_size
        ELSE p_cluster_lng
      END AS snap_lng
    FROM grid g
  )
  SELECT
    i.id            AS image_id,
    i.latitude,
    i.longitude,
    i.thumbnail_path,
    i.storage_path,
    i.captured_at,
    i.created_at,
    COALESCE(ip.project_ids[1], i.project_id) AS project_id,
    COALESCE(ip.project_names[1], p_fallback.name) AS project_name,
    COALESCE(ip.project_ids, '{}'::uuid[]) AS project_ids,
    COALESCE(ip.project_names, '{}'::text[]) AS project_names,
    i.direction,
    i.exif_latitude,
    i.exif_longitude,
    i.address_label,
    i.city,
    i.district,
    i.street,
    i.country,
    pr.full_name    AS user_name
  FROM public.images i
  CROSS JOIN grid g
  CROSS JOIN snapped_input si
  LEFT JOIN LATERAL (
    SELECT
      array_agg(p.id ORDER BY p.name) AS project_ids,
      array_agg(p.name ORDER BY p.name) AS project_names
    FROM public.image_projects ip
    JOIN public.projects p ON p.id = ip.project_id
    WHERE ip.image_id = i.id
  ) ip ON TRUE
  LEFT JOIN public.projects p_fallback ON p_fallback.id = i.project_id
  LEFT JOIN public.profiles pr ON pr.id = i.user_id
  WHERE i.organization_id = public.user_org_id()
    AND i.latitude  IS NOT NULL
    AND i.longitude IS NOT NULL
    AND (
      (g.cell_size > 0 AND
       ROUND(i.latitude  / g.cell_size) * g.cell_size = si.snap_lat AND
       ROUND(i.longitude / g.cell_size) * g.cell_size = si.snap_lng)
      OR
      (g.cell_size = 0 AND
       ROUND(i.latitude, 7) = p_cluster_lat AND
       ROUND(i.longitude, 7) = p_cluster_lng)
    )
  ORDER BY COALESCE(i.captured_at, i.created_at) DESC
  LIMIT 500;
$$;
