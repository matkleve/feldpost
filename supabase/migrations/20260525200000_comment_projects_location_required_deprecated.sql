-- Document deprecated column for tooling; no behavior change.
COMMENT ON COLUMN public.projects.location_required IS
  'DEPRECATED: not used by frontend. See docs/architecture/deprecated-schema.md. Safe to drop in a future migration.';
