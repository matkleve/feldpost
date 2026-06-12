-- Add project-level location requirement policy toggle.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS location_required boolean NOT NULL DEFAULT false;
