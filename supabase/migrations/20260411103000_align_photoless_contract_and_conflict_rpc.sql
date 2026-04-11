-- =============================================================================
-- Align photoless media contract and conflict RPC with media-era schema
-- =============================================================================
-- Intent:
-- 1) Allow true photoless media rows (no storage object yet) for runtime flows.
-- 2) Replace remaining legacy RPC dependency on dropped public.images table.
-- 3) Keep rollout safe and forward-only (no destructive table drops).
--
-- Compatibility impact:
-- - Existing rows with storage_path remain valid.
-- - New rows may keep storage fields NULL until media is attached.
-- - find_photoless_conflicts signature stays stable for existing callers.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- media_items: enable photoless rows by relaxing file-column nullability
-- -----------------------------------------------------------------------------
ALTER TABLE public.media_items
  ALTER COLUMN storage_path DROP NOT NULL,
  ALTER COLUMN mime_type DROP NOT NULL,
  ALTER COLUMN file_name DROP NOT NULL,
  ALTER COLUMN file_size_bytes DROP NOT NULL;

-- Replace file-size-only check with a full file-contract check.
ALTER TABLE public.media_items
  DROP CONSTRAINT IF EXISTS chk_media_items_file_size;

ALTER TABLE public.media_items
  DROP CONSTRAINT IF EXISTS chk_media_items_file_contract;

ALTER TABLE public.media_items
  ADD CONSTRAINT chk_media_items_file_contract
  CHECK (
    (
      storage_path IS NULL
      AND mime_type IS NULL
      AND file_name IS NULL
      AND file_size_bytes IS NULL
    )
    OR
    (
      storage_path IS NOT NULL
      AND mime_type IS NOT NULL
      AND file_name IS NOT NULL
      AND file_size_bytes IS NOT NULL
      AND file_size_bytes > 0
    )
  );

CREATE INDEX IF NOT EXISTS idx_media_items_photoless_lookup
  ON public.media_items (organization_id, created_at)
  WHERE media_type = 'image' AND storage_path IS NULL;

-- -----------------------------------------------------------------------------
-- RPC: resolve legacy images-table dependency for conflict detection
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.find_photoless_conflicts(
  p_org_id uuid,
  p_lat double precision DEFAULT NULL,
  p_lng double precision DEFAULT NULL,
  p_address text DEFAULT NULL
)
RETURNS TABLE(
  id uuid,
  address_label text,
  latitude double precision,
  longitude double precision,
  distance_m double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    m.id,
    m.address_label,
    m.latitude::double precision,
    m.longitude::double precision,
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND m.geog IS NOT NULL
      THEN extensions.ST_Distance(
        m.geog,
        extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
      )
      ELSE NULL
    END AS distance_m
  FROM public.media_items m
  WHERE m.organization_id = p_org_id
    AND m.media_type = 'image'
    AND m.storage_path IS NULL
    AND (
      (
        p_lat IS NOT NULL
        AND p_lng IS NOT NULL
        AND m.geog IS NOT NULL
        AND extensions.ST_DWithin(
          m.geog,
          extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography,
          50
        )
      )
      OR
      (
        p_address IS NOT NULL
        AND lower(m.address_label) = lower(p_address)
      )
    )
  ORDER BY
    CASE
      WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND m.geog IS NOT NULL
      THEN extensions.ST_Distance(
        m.geog,
        extensions.ST_SetSRID(extensions.ST_MakePoint(p_lng, p_lat), 4326)::extensions.geography
      )
      ELSE 0
    END ASC,
    m.created_at ASC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_photoless_conflicts(uuid, double precision, double precision, text)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_photoless_conflicts(uuid, double precision, double precision, text)
  TO authenticated;
