-- A copied project may include the source photos. The same-organization rule stays
-- for every other insert. Two personal rows may link only when the same account owns both.
-- @see docs/specs/system/widget-install.md

create or replace function public.enforce_media_project_same_org()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_media_org uuid;
  v_project_org uuid;
  v_media_owner uuid;
  v_project_owner uuid;
  v_storage_path text;
begin
  select m.organization_id, m.created_by, m.storage_path
    into v_media_org, v_media_owner, v_storage_path
  from public.media_items m
  where m.id = new.media_item_id;

  select p.organization_id, p.created_by
    into v_project_org, v_project_owner
  from public.projects p
  where p.id = new.project_id;

  if v_media_org is not null and v_media_org is not distinct from v_project_org then
    return new;
  end if;

  if v_media_org is null
    and v_project_org is null
    and v_media_owner is not null
    and v_media_owner = v_project_owner then
    return new;
  end if;

  if v_project_owner is not null and exists (
    select 1
    from public.media_read_grants grants
    where grants.user_id = v_project_owner
      and grants.storage_path = v_storage_path
  ) then
    return new;
  end if;

  raise exception 'media_projects cross-organization link is not allowed';
end;
$$;

create or replace function public.receive_project_link(p_token text, p_mode text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid := public.user_org_id();
  v_project uuid;
  v_name text;
  v_copy uuid;
begin
  if v_uid is null then
    raise exception 'not allowed';
  end if;
  if p_mode not in ('copy', 'shared') then
    raise exception 'unknown mode';
  end if;

  select links.project_id, projects.name
    into v_project, v_name
  from public.project_share_links links
  join public.projects projects on projects.id = links.project_id
  where links.token_hash = public.share_token_hash(p_token);

  if v_project is null then
    raise exception 'link not found';
  end if;

  if p_mode = 'shared' then
    insert into public.project_receipts (project_id, recipient_user_id, mode)
    values (v_project, v_uid, 'shared')
    on conflict (project_id, recipient_user_id) do nothing;
    perform public.grant_project_media_read(v_project, v_uid);
    return v_project;
  end if;

  perform public.grant_project_media_read(v_project, v_uid);

  insert into public.projects (organization_id, created_by, name)
  values (v_org, v_uid, v_name)
  returning id into v_copy;

  insert into public.media_projects (media_item_id, project_id)
  select media_item_id, v_copy
  from public.media_projects
  where project_id = v_project
  on conflict do nothing;

  perform public.grant_project_media_read(v_copy, v_uid);
  return v_copy;
end;
$$;
