-- Organization export job payload + synchronous processing RPC.

alter table public.org_export_jobs
  add column if not exists payload jsonb;

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
      )
    )
  where id = p_job_id
  returning * into v_job;

  return v_job;
end;
$$;

grant execute on function public.process_org_export_job(uuid) to authenticated;
