-- =============================================================================
-- Add address resolution columns to images table.
-- address_label: human-readable address string (from geocoding / manual entry)
-- location_unresolved: flag for images that still need geocoding
-- =============================================================================

ALTER TABLE public.images
  ADD COLUMN IF NOT EXISTS address_label text,
  ADD COLUMN IF NOT EXISTS location_unresolved boolean DEFAULT true;

-- Drop and recreate cluster_images RPC to add address_label to return type.
DROP FUNCTION IF EXISTS public.cluster_images(numeric, numeric, int);

CREATE OR REPLACE FUNCTION public.cluster_images(
  p_cluster_lat numeric,
  p_cluster_lng numeric,
  p_zoom        int
)
RETURNS TABLE (
  image_id             uuid,
  latitude             numeric,
  longitude            numeric,
  thumbnail_path       text,
  storage_path         text,
  captured_at          timestamptz,
  created_at           timestamptz,
  project_id           uuid,
  project_name         text,
  direction            numeric,
  exif_latitude        numeric,
  exif_longitude       numeric,
  address_label        text
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
  )
  SELECT
    i.id                  AS image_id,
    i.latitude,
    i.longitude,
    i.thumbnail_path,
    i.storage_path,
    i.captured_at,
    i.created_at,
    i.project_id,
    p.name                AS project_name,
    i.direction,
    i.exif_latitude,
    i.exif_longitude,
    i.address_label
  FROM public.images i
  CROSS JOIN grid g
  LEFT JOIN public.projects p ON p.id = i.project_id
  WHERE i.organization_id = public.user_org_id()
    AND i.latitude  IS NOT NULL
    AND i.longitude IS NOT NULL
    AND (
      -- Same grid-snapping formula as viewport_markers
      (g.cell_size > 0 AND
       ROUND(i.latitude  / g.cell_size) * g.cell_size = p_cluster_lat AND
       ROUND(i.longitude / g.cell_size) * g.cell_size = p_cluster_lng)
      OR
      (g.cell_size = 0 AND
       ROUND(i.latitude, 7) = p_cluster_lat AND
       ROUND(i.longitude, 7) = p_cluster_lng)
    )
  ORDER BY COALESCE(i.captured_at, i.created_at) DESC
  LIMIT 500;
$$;
