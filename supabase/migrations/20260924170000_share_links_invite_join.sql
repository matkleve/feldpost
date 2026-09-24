-- A project leaves the company only through a share token.
-- Copy keeps the photos readable in the recipient's project. Shared keeps the original project.
-- An existing account can join a second organization with the same invite token signup already uses.

create table if not exists public.project_share_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.project_share_links enable row level security;

create policy "project_share_links: owner read"
  on public.project_share_links
  for select
  using (created_by = (select auth.uid()));

create table if not exists public.media_read_grants (
  user_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  primary key (user_id, storage_path)
);

alter table public.media_read_grants enable row level security;

create policy "media_read_grants: own read"
  on public.media_read_grants
  for select
  using (user_id = (select auth.uid()));

create or replace function public.share_token_hash(p_token text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.create_project_share_link(p_project_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_token text;
  v_visible boolean;
begin
  if v_uid is null then
    raise exception 'not allowed';
  end if;

  select exists (
    select 1
    from public.projects
    where id = p_project_id
      and (
        created_by = v_uid
        or (organization_id is not null and organization_id = public.user_org_id())
      )
  ) into v_visible;

  if not v_visible then
    raise exception 'project not found';
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.project_share_links (project_id, token_hash, created_by)
  values (p_project_id, public.share_token_hash(v_token), v_uid);
  return v_token;
end;
$$;

create or replace function public.grant_project_media_read(p_project_id uuid, p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.media_read_grants (user_id, storage_path)
  select p_user_id, paths.path
  from public.media_projects memberships
  join public.media_items items on items.id = memberships.media_item_id
  cross join lateral (
    values (items.storage_path), (items.thumbnail_path), (items.poster_path)
  ) as paths (path)
  where memberships.project_id = p_project_id
    and paths.path is not null
  on conflict do nothing;
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

drop function if exists public.receive_project(uuid, text);

create policy "media_items: granted read"
  on public.media_items
  for select
  using (
    exists (
      select 1
      from public.media_read_grants grants
      where grants.user_id = (select auth.uid())
        and grants.storage_path = media_items.storage_path
    )
  );

create policy "media_projects: recipient read"
  on public.media_projects
  for select
  using (
    exists (
      select 1
      from public.projects projects
      where projects.id = media_projects.project_id
        and (
          (
            projects.created_by = (select auth.uid())
            and (
              (projects.organization_id is null and (select public.user_org_id()) is null)
              or projects.organization_id = (select public.user_org_id())
            )
          )
          or exists (
            select 1
            from public.project_receipts receipts
            where receipts.project_id = projects.id
              and receipts.recipient_user_id = (select auth.uid())
          )
        )
    )
  );

create policy "media: granted read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'media'
    and exists (
      select 1
      from public.media_read_grants grants
      where grants.user_id = (select auth.uid())
        and grants.storage_path = name
    )
  );

create or replace function public.list_received_projects()
returns table (project_id uuid, name text, mode text)
language sql
stable
security definer
set search_path = public
as $$
  select projects.id, projects.name, receipts.mode
  from public.project_receipts receipts
  join public.projects projects on projects.id = receipts.project_id
  where receipts.recipient_user_id = auth.uid();
$$;

create or replace function public.list_sent_project_shares()
returns table (project_id uuid, name text, recipient_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select projects.id, projects.name, count(receipts.recipient_user_id)
  from public.projects projects
  left join public.project_receipts receipts on receipts.project_id = projects.id
  where projects.created_by = auth.uid()
     or (projects.organization_id is not null and projects.organization_id = public.user_org_id())
  group by projects.id, projects.name
  having count(receipts.recipient_user_id) > 0
      or exists (
        select 1 from public.project_share_links links where links.project_id = projects.id
      );
$$;

create or replace function public.accept_organization_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_invite public.qr_invites%rowtype;
  v_role uuid;
begin
  if v_uid is null then
    raise exception 'not allowed';
  end if;

  select * into v_invite
  from public.qr_invites
  where token_hash = public.share_token_hash(p_token)
    and status = 'active'
    and expires_at > now()
    and (valid_from is null or valid_from <= now());

  if not found then
    raise exception 'Invite code is invalid, expired, or already used.';
  end if;

  insert into public.account_memberships (user_id, organization_id)
  values (v_uid, v_invite.organization_id)
  on conflict do nothing;

  select id into v_role
  from public.org_roles
  where organization_id = v_invite.organization_id
    and name = v_invite.target_role;

  if v_role is null then
    select id into v_role
    from public.org_roles
    where organization_id = v_invite.organization_id
      and is_default = true;
  end if;

  if v_role is not null then
    insert into public.user_roles (user_id, org_role_id)
    select v_uid, v_role
    where not exists (
      select 1 from public.user_roles where user_id = v_uid and org_role_id = v_role
    );
  end if;

  update public.profiles
  set active_organization_id = v_invite.organization_id
  where id = v_uid;

  if coalesce(v_invite.reusable, false) then
    insert into public.invite_signups (invite_id, user_id)
    values (v_invite.id, v_uid)
    on conflict (invite_id, user_id) do nothing;
  else
    update public.qr_invites
    set status = 'accepted', accepted_at = now(), accepted_user_id = v_uid
    where id = v_invite.id;
  end if;

  return v_invite.organization_id;
end;
$$;

create or replace function public.list_account_thread(p_email text)
returns table (id uuid, body text, created_at timestamptz, mine boolean)
language sql
stable
security definer
set search_path = public
as $$
  select messages.id, messages.body, messages.created_at, messages.sender_id = auth.uid()
  from public.account_messages messages
  join auth.users people on people.id = case
    when messages.sender_id = auth.uid() then messages.recipient_id
    else messages.sender_id
  end
  where auth.uid() in (messages.sender_id, messages.recipient_id)
    and lower(people.email) = lower(btrim(p_email))
  order by messages.created_at;
$$;

revoke all on function public.share_token_hash(text) from public;
revoke all on function public.create_project_share_link(uuid) from public;
revoke all on function public.grant_project_media_read(uuid, uuid) from public;
revoke all on function public.receive_project_link(text, text) from public;
revoke all on function public.list_received_projects() from public;
revoke all on function public.list_sent_project_shares() from public;
revoke all on function public.accept_organization_invite(text) from public;
revoke all on function public.list_account_thread(text) from public;

grant execute on function public.create_project_share_link(uuid) to authenticated;
grant execute on function public.receive_project_link(text, text) to authenticated;
grant execute on function public.list_received_projects() to authenticated;
grant execute on function public.list_sent_project_shares() to authenticated;
grant execute on function public.accept_organization_invite(text) to authenticated;
grant execute on function public.list_account_thread(text) to authenticated;
