-- Allow deleting projects from Archived for all non-viewer members of the same org.
-- This aligns with the Projects UX flow: archive first, then delete from Archived.

drop policy if exists "projects: owner or admin delete" on public.projects;
drop policy if exists "projects: archived delete" on public.projects;

create policy "projects: archived delete"
  on public.projects for delete
  using (
    organization_id = public.user_org_id()
    and not public.is_viewer()
    and archived_at is not null
  );
