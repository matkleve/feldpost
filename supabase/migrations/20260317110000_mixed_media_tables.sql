-- =============================================================================
-- Mixed media core tables (hybrid ownership + membership model)
--
-- Rules:
-- 1) Every media row has one primary project.
-- 2) Project memberships are stored in media_projects.
-- 3) No-GPS / unresolved membership-count constraints are enforced in a
--    follow-up migration via deferred constraint triggers.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.media_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  primary_project_id     uuid NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
  created_by             uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  media_type             text NOT NULL,
  mime_type              text NOT NULL,
  storage_path           text NOT NULL,
  thumbnail_path         text,
  poster_path            text,
  file_name              text NOT NULL,
  file_size_bytes        bigint NOT NULL,

  captured_at            timestamptz,
  duration_ms            integer,
  page_count             integer,

  exif_latitude          numeric(10, 7),
  exif_longitude         numeric(11, 7),
  latitude               numeric(10, 7),
  longitude              numeric(11, 7),
  geog                   extensions.geography(Point, 4326),
  location_status        text NOT NULL,
  gps_assignment_allowed boolean NOT NULL DEFAULT true,

  source_image_id        uuid UNIQUE REFERENCES public.images(id) ON DELETE CASCADE,

  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_media_items_type
    CHECK (media_type IN ('photo', 'video', 'document')),

  CONSTRAINT chk_media_items_location_status
    CHECK (location_status IN ('gps', 'no_gps', 'unresolved')),

  CONSTRAINT chk_media_items_document_gps_lock
    CHECK (media_type <> 'document' OR gps_assignment_allowed = false),

  CONSTRAINT chk_media_items_file_size
    CHECK (file_size_bytes > 0),

  CONSTRAINT chk_media_items_duration
    CHECK (duration_ms IS NULL OR duration_ms >= 0),

  CONSTRAINT chk_media_items_page_count
    CHECK (page_count IS NULL OR page_count >= 1),

  CONSTRAINT chk_media_items_latitude
    CHECK (
      latitude IS NULL OR (latitude >= -90 AND latitude <= 90)
    ),

  CONSTRAINT chk_media_items_longitude
    CHECK (
      longitude IS NULL OR (longitude >= -180 AND longitude <= 180)
    ),

  CONSTRAINT chk_media_items_exif_latitude
    CHECK (
      exif_latitude IS NULL OR (exif_latitude >= -90 AND exif_latitude <= 90)
    ),

  CONSTRAINT chk_media_items_exif_longitude
    CHECK (
      exif_longitude IS NULL OR (exif_longitude >= -180 AND exif_longitude <= 180)
    ),

  CONSTRAINT chk_media_items_location_consistency
    CHECK (
      (location_status = 'gps' AND latitude IS NOT NULL AND longitude IS NOT NULL)
      OR
      (location_status IN ('no_gps', 'unresolved') AND latitude IS NULL AND longitude IS NULL)
    )
);

CREATE TABLE IF NOT EXISTS public.media_projects (
  media_item_id uuid NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (media_item_id, project_id)
);

CREATE TABLE IF NOT EXISTS public.project_sections (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  project_id       uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name             text NOT NULL,
  sort_order       integer NOT NULL DEFAULT 0,
  archived_at      timestamptz,
  created_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_project_sections_name_len
    CHECK (length(btrim(name)) BETWEEN 1 AND 80)
);

CREATE TABLE IF NOT EXISTS public.project_section_items (
  section_id     uuid NOT NULL REFERENCES public.project_sections(id) ON DELETE CASCADE,
  media_item_id  uuid NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (section_id, media_item_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_project_sections_project_name_active
  ON public.project_sections(project_id, name)
  WHERE archived_at IS NULL;
