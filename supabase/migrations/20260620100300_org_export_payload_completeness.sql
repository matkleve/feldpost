-- =============================================================================
-- Org data export completeness (audit: Data Integrity)
-- =============================================================================
-- process_org_export_job previously emitted only organization + projects, so the
-- "Export organization data" feature produced an incomplete DSGVO export (no
-- media, no members). Extend the payload additively. Storage paths / signed URLs
-- are intentionally excluded (object bytes are handled out of band).
-- Spec: docs/specs/page/organization-page.md (keep the export contract in sync).
-- =============================================================================

create or replace function public.process_org_export_job(p_job_id uuid)
returns public.org_export_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.org_export_jobs;
begin
  select * into v_job
  from public.org_export_jobs
  where id = p_job_id;

  if v_job.id is null or v_job.organization_id <> public.user_org_id() then
    raise exception 'Export job not found';
  end if;

  if not public.has_permission('org.export') then
    raise exception 'Forbidden';
  end if;

  update public.org_export_jobs
  set
    status = 'completed',
    completed_at = now(),
    payload = jsonb_build_object(
      'exportedAt', now(),
      'organization', (
        select to_jsonb(o)
        from public.organizations o
        where o.id = v_job.organization_id
      ),
      'projects', coalesce(
        (
          select jsonb_agg(to_jsonb(p) order by p.name)
          from public.projects p
          where p.organization_id = v_job.organization_id
        ),
        '[]'::jsonb
      ),
      'members', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', pr.id,
              'fullName', pr.full_name,
              'suspendedAt', pr.suspended_at,
              'removedAt', pr.removed_at
            )
            order by pr.full_name
          )
          from public.profiles pr
          where pr.organization_id = v_job.organization_id
        ),
        '[]'::jsonb
      ),
      -- to_jsonb(m) is resilient to the media_items schema (location columns and
      -- primary_project_id were dropped in earlier migrations). Storage paths are
      -- stripped so the export never leaks bucket object references.
      'mediaItems', coalesce(
        (
          select jsonb_agg(
            (to_jsonb(m) - 'storage_path' - 'thumbnail_path')
            order by m.created_at
          )
          from public.media_items m
          where m.organization_id = v_job.organization_id
        ),
        '[]'::jsonb
      )
    )
  where id = p_job_id
  returning * into v_job;

  return v_job;
end;
$$;

grant execute on function public.process_org_export_job(uuid) to authenticated;
