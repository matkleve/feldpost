-- Widget installs follow the context on screen, including a personal account.
-- @see docs/specs/system/widget-install.md

alter table public.user_widget_installs
  alter column organization_id drop not null;

create unique index if not exists user_widget_installs_personal_key
  on public.user_widget_installs (user_id, widget_id)
  where organization_id is null;

create policy "user_widget_installs: personal read"
  on public.user_widget_installs
  for select
  using (
    organization_id is null
    and user_id = (select auth.uid())
    and (select public.user_org_id()) is null
  );

create or replace function public.set_own_widget_installed(p_widget_id text, p_installed boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.user_org_id();
  v_uid uuid := auth.uid();
  v_allowed boolean;
  v_preinstalled boolean;
  v_locked boolean;
begin
  if v_uid is null then
    raise exception 'not allowed';
  end if;
  if p_widget_id not in ('map', 'media', 'projects', 'colleagues', 'organization') then
    raise exception 'unknown widget';
  end if;
  if v_org is null and p_widget_id = 'colleagues' then
    raise exception 'colleagues requires an organization';
  end if;

  select allowed, preinstalled, locked
    into v_allowed, v_preinstalled, v_locked
  from public.organization_widget_policies
  where organization_id = v_org
    and widget_id = p_widget_id;

  if not found then
    v_allowed := true;
    v_preinstalled := p_widget_id in ('map', 'media');
    v_locked := false;
  end if;

  if p_installed and not v_allowed then
    raise exception 'widget is not allowed';
  end if;
  if not p_installed and v_locked and v_preinstalled then
    raise exception 'widget is locked';
  end if;

  if v_org is null then
    delete from public.user_widget_installs
    where user_id = v_uid
      and widget_id = p_widget_id
      and organization_id is null;
    insert into public.user_widget_installs (organization_id, user_id, widget_id, installed)
    values (null, v_uid, p_widget_id, p_installed);
    return;
  end if;

  insert into public.user_widget_installs (organization_id, user_id, widget_id, installed)
  values (v_org, v_uid, p_widget_id, p_installed)
  on conflict (organization_id, user_id, widget_id)
  do update set installed = excluded.installed;
end;
$$;

-- A person outside the company keeps a project as a copy or as a shared row.
create table if not exists public.project_receipts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  recipient_user_id uuid not null references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('shared')),
  created_at timestamptz not null default now(),
  unique (project_id, recipient_user_id)
);

alter table public.project_receipts enable row level security;

create policy "project_receipts: recipient read"
  on public.project_receipts
  for select
  using (recipient_user_id = (select auth.uid()));

create policy "projects: shared read"
  on public.projects
  for select
  using (
    exists (
      select 1
      from public.project_receipts receipts
      where receipts.project_id = projects.id
        and receipts.recipient_user_id = (select auth.uid())
    )
  );

create or replace function public.receive_project(p_project_id uuid, p_mode text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_org uuid := public.user_org_id();
  v_name text;
  v_copy uuid;
begin
  if v_uid is null then
    raise exception 'not allowed';
  end if;
  if p_mode not in ('copy', 'shared') then
    raise exception 'unknown mode';
  end if;

  select name into v_name from public.projects where id = p_project_id;
  if v_name is null then
    raise exception 'project not found';
  end if;

  if p_mode = 'shared' then
    insert into public.project_receipts (project_id, recipient_user_id, mode)
    values (p_project_id, v_uid, 'shared')
    on conflict (project_id, recipient_user_id) do nothing;
    return p_project_id;
  end if;

  insert into public.projects (organization_id, created_by, name)
  values (v_org, v_uid, v_name)
  returning id into v_copy;
  return v_copy;
end;
$$;

revoke all on function public.receive_project(uuid, text) from public;
grant execute on function public.receive_project(uuid, text) to authenticated;

-- Account-to-account messages. Not organization chat.
create table if not exists public.account_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint account_messages_body_check check (char_length(btrim(body)) > 0)
);

alter table public.account_messages enable row level security;

create policy "account_messages: participant read"
  on public.account_messages
  for select
  using (
    sender_id = (select auth.uid())
    or recipient_id = (select auth.uid())
  );

create policy "account_messages: sender insert"
  on public.account_messages
  for insert
  with check (
    sender_id = (select auth.uid())
    and recipient_id <> (select auth.uid())
  );
