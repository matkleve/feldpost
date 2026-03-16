-- Relax projects UPDATE policy:
-- Any non-viewer org member can update project presentation/state fields
-- such as name, color_key, and archived_at within their organization.

drop policy if exists "projects: owner or admin update" on public.projects;

create policy "projects: org update"
  on public.projects for update
  using (
    organization_id = public.user_org_id()
    and not public.is_viewer()
  )
  with check (
    organization_id = public.user_org_id()
    and not public.is_viewer()
  );
