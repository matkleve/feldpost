-- Org-level search tuning profiles (admin write, member read).
-- @see docs/specs/ui/search-bar/search-tuning-settings.md

CREATE TABLE IF NOT EXISTS public.org_search_tuning_profiles (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  settings_version integer NOT NULL DEFAULT 1 CHECK (settings_version >= 1),
  values_json jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT org_search_tuning_profiles_values_json_object
    CHECK (values_json IS NULL OR jsonb_typeof(values_json) = 'object')
);

COMMENT ON TABLE public.org_search_tuning_profiles IS
  'Per-organization search/geocoder tuning overrides; merged over system defaults at read time.';

ALTER TABLE public.org_search_tuning_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY org_search_tuning_profiles_select
  ON public.org_search_tuning_profiles
  FOR SELECT
  TO authenticated
  USING (organization_id = public.user_org_id());

CREATE POLICY org_search_tuning_profiles_insert
  ON public.org_search_tuning_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (organization_id = public.user_org_id() AND public.is_admin());

CREATE POLICY org_search_tuning_profiles_update
  ON public.org_search_tuning_profiles
  FOR UPDATE
  TO authenticated
  USING (organization_id = public.user_org_id() AND public.is_admin())
  WITH CHECK (organization_id = public.user_org_id() AND public.is_admin());

CREATE POLICY org_search_tuning_profiles_delete
  ON public.org_search_tuning_profiles
  FOR DELETE
  TO authenticated
  USING (organization_id = public.user_org_id() AND public.is_admin());
