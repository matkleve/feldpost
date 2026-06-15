-- Organization roles, permissions, colleagues, chat, and org admin tables.
-- Replaces global roles with per-org hierarchical org_roles.

-- =============================================================================
-- org_permissions (global catalog)
-- =============================================================================
create table public.org_permissions (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  description text not null,
  category    text not null
);

insert into public.org_permissions (key, description, category) values
  ('projects.create', 'Create projects', 'Projects'),
  ('projects.edit', 'Edit projects', 'Projects'),
  ('projects.delete', 'Delete projects', 'Projects'),
  ('projects.archive', 'Archive projects', 'Projects'),
  ('media.upload', 'Upload media', 'Media'),
  ('media.edit', 'Edit media metadata', 'Media'),
  ('media.delete', 'Delete media', 'Media'),
  ('members.view', 'View org members', 'Members'),
  ('members.invite', 'Invite new members', 'Members'),
  ('members.manage_roles', 'Change member roles', 'Members'),
  ('members.suspend', 'Suspend members', 'Members'),
  ('members.remove', 'Remove members', 'Members'),
  ('org.settings.edit', 'Edit organization settings', 'Organization'),
  ('org.roles.manage', 'Manage roles and permissions', 'Organization'),
  ('org.billing.view', 'View billing', 'Organization'),
  ('org.api_keys.manage', 'Manage API keys', 'Organization'),
  ('org.export', 'Export organization data', 'Organization'),
  ('map.edit', 'Edit map layers and markers', 'Map'),
  ('invites.create', 'Create QR invites', 'Invites'),
  ('chat.channels.manage', 'Manage chat channels', 'Chat'),
  ('chat.messages.delete_any', 'Delete any chat message', 'Chat');

-- =============================================================================
-- org_roles (per organization)
-- =============================================================================
create table public.org_roles (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  display_name     text not null,
  level            integer not null,
  is_system        boolean not null default false,
  is_default       boolean not null default false,
  color            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (organization_id, name)
);

create index idx_org_roles_org_id on public.org_roles (organization_id);

create trigger trg_org_roles_updated_at
  before update on public.org_roles
  for each row execute function public.set_updated_at();

-- =============================================================================
-- org_role_permissions
-- =============================================================================
create table public.org_role_permissions (
  role_id       uuid not null references public.org_roles (id) on delete cascade,
  permission_id uuid not null references public.org_permissions (id) on delete cascade,
  primary key (role_id, permission_id)
);

-- =============================================================================
-- Seed default roles for one organization
-- =============================================================================
create or replace function public.seed_org_default_roles(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid;
  v_manager_id uuid;
  v_technician_id uuid;
  v_clerk_id uuid;
  v_worker_id uuid;
  v_viewer_id uuid;
  v_perm_id uuid;
begin
  if exists (select 1 from public.org_roles where organization_id = p_org_id limit 1) then
    return;
  end if;

  insert into public.org_roles (organization_id, name, display_name, level, is_system, is_default, color)
  values (p_org_id, 'admin', 'Admin', 100, true, false, '#b45309')
  returning id into v_admin_id;

  insert into public.org_roles (organization_id, name, display_name, level, is_system, is_default, color)
  values (p_org_id, 'manager', 'Manager', 80, false, false, '#2563eb')
  returning id into v_manager_id;

  insert into public.org_roles (organization_id, name, display_name, level, is_system, is_default, color)
  values (p_org_id, 'technician', 'Technician', 60, false, false, '#059669')
  returning id into v_technician_id;

  insert into public.org_roles (organization_id, name, display_name, level, is_system, is_default, color)
  values (p_org_id, 'clerk', 'Clerk', 40, false, false, '#7c3aed')
  returning id into v_clerk_id;

  insert into public.org_roles (organization_id, name, display_name, level, is_system, is_default, color)
  values (p_org_id, 'worker', 'Worker', 20, false, true, '#64748b')
  returning id into v_worker_id;

  insert into public.org_roles (organization_id, name, display_name, level, is_system, is_default, color)
  values (p_org_id, 'viewer', 'Viewer', 10, true, false, '#94a3b8')
  returning id into v_viewer_id;

  for v_perm_id in select id from public.org_permissions loop
    insert into public.org_role_permissions (role_id, permission_id) values (v_admin_id, v_perm_id);
  end loop;

  insert into public.org_role_permissions (role_id, permission_id)
  select v_manager_id, id from public.org_permissions
  where key not in ('org.roles.manage', 'org.billing.view', 'org.api_keys.manage');

  insert into public.org_role_permissions (role_id, permission_id)
  select v_technician_id, id from public.org_permissions
  where key in (
    'projects.create', 'projects.edit', 'projects.archive',
    'media.upload', 'media.edit', 'media.delete',
    'members.view', 'map.edit', 'invites.create', 'chat.channels.manage'
  );

  insert into public.org_role_permissions (role_id, permission_id)
  select v_clerk_id, id from public.org_permissions
  where key in (
    'projects.create', 'projects.edit', 'projects.archive',
    'media.upload', 'media.edit',
    'members.view', 'members.invite', 'invites.create', 'map.edit'
  );

  insert into public.org_role_permissions (role_id, permission_id)
  select v_worker_id, id from public.org_permissions
  where key in ('projects.create', 'media.upload', 'members.view', 'map.edit');

  insert into public.org_role_permissions (role_id, permission_id)
  select v_viewer_id, id from public.org_permissions
  where key in ('members.view', 'org.billing.view');
end;
$$;

-- Seed roles for all existing organizations
do $$
declare
  v_org record;
begin
  for v_org in select id from public.organizations loop
    perform public.seed_org_default_roles(v_org.id);
  end loop;
end;
$$;

-- =============================================================================
-- Migrate user_roles from global roles to org_roles
-- =============================================================================
alter table public.user_roles
  add column org_role_id uuid references public.org_roles (id) on delete restrict;

update public.user_roles ur
set org_role_id = sub.org_role_id
from (
  select
    ur2.id as user_role_row_id,
    orole.id as org_role_id
  from public.user_roles ur2
  join public.profiles p on p.id = ur2.user_id
  join public.roles r on r.id = ur2.role_id
  join public.org_roles orole on orole.organization_id = p.organization_id
    and orole.name = case r.name
      when 'admin' then 'admin'
      when 'user' then 'manager'
      when 'viewer' then 'viewer'
      when 'clerk' then 'clerk'
      when 'worker' then 'worker'
      else 'worker'
    end
) sub
where ur.id = sub.user_role_row_id;

-- Fallback any unmigrated rows to default worker role in user's org
update public.user_roles ur
set org_role_id = (
  select orole.id
  from public.profiles p
  join public.org_roles orole on orole.organization_id = p.organization_id and orole.is_default = true
  where p.id = ur.user_id
  limit 1
)
where ur.org_role_id is null;

alter table public.user_roles drop constraint user_roles_role_id_fkey;
alter table public.user_roles drop column role_id;
alter table public.user_roles alter column org_role_id set not null;
create index idx_user_roles_org_role_id on public.user_roles (org_role_id);

-- =============================================================================
-- organizations profile columns
-- =============================================================================
alter table public.organizations
  add column if not exists logo_url text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists country text,
  add column if not exists phone text,
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists description text,
  add column if not exists industry text;

-- =============================================================================
-- profiles member management columns
-- =============================================================================
alter table public.profiles
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_by uuid references public.profiles (id) on delete set null,
  add column if not exists removed_at timestamptz;

-- =============================================================================
-- org_branding
-- =============================================================================
create table public.org_branding (
  organization_id  uuid primary key references public.organizations (id) on delete cascade,
  primary_color    text,
  accent_color     text,
  background_color text,
  updated_at       timestamptz not null default now()
);

-- =============================================================================
-- org_subscriptions + org_invoices (billing stub)
-- =============================================================================
create table public.org_subscriptions (
  organization_id  uuid primary key references public.organizations (id) on delete cascade,
  plan_name        text not null default 'Free',
  status           text not null default 'active',
  storage_limit_mb integer not null default 5120,
  member_limit     integer not null default 50,
  updated_at       timestamptz not null default now()
);

create table public.org_invoices (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  amount_cents     integer not null default 0,
  currency         text not null default 'EUR',
  status           text not null default 'paid',
  issued_at        timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

insert into public.org_subscriptions (organization_id, plan_name)
select id, 'Free' from public.organizations
on conflict (organization_id) do nothing;

-- =============================================================================
-- org_api_keys
-- =============================================================================
create table public.org_api_keys (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  key_hash         text not null,
  key_prefix       text not null,
  permissions      jsonb not null default '[]'::jsonb,
  created_by       uuid references public.profiles (id) on delete set null,
  expires_at       timestamptz,
  last_used_at     timestamptz,
  revoked_at       timestamptz,
  created_at       timestamptz not null default now()
);

create index idx_org_api_keys_org_id on public.org_api_keys (organization_id);

-- =============================================================================
-- org_export_jobs
-- =============================================================================
create table public.org_export_jobs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  requested_by     uuid references public.profiles (id) on delete set null,
  status           text not null default 'pending',
  format           text not null default 'json',
  download_url     text,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz,
  expires_at       timestamptz
);

-- =============================================================================
-- org_audit_log
-- =============================================================================
create table public.org_audit_log (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid references public.profiles (id) on delete set null,
  action           text not null,
  entity_type      text not null,
  entity_id        uuid,
  metadata         jsonb not null default '{}'::jsonb,
  ip_address       text,
  created_at       timestamptz not null default now()
);

create index idx_org_audit_log_org_created on public.org_audit_log (organization_id, created_at desc);

-- =============================================================================
-- Chat tables
-- =============================================================================
create type public.chat_channel_type as enum ('public', 'private', 'dm');
create type public.chat_channel_member_role as enum ('owner', 'member');

create table public.chat_channels (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text,
  description      text,
  type             public.chat_channel_type not null default 'public',
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  archived_at      timestamptz
);

create index idx_chat_channels_org_id on public.chat_channels (organization_id);

create table public.chat_channel_members (
  channel_id    uuid not null references public.chat_channels (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  role          public.chat_channel_member_role not null default 'member',
  joined_at     timestamptz not null default now(),
  last_read_at  timestamptz,
  muted_until   timestamptz,
  primary key (channel_id, user_id)
);

create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references public.chat_channels (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  content     text not null,
  parent_id   uuid references public.chat_messages (id) on delete set null,
  edited_at   timestamptz,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  search_vector tsvector generated always as (to_tsvector('simple', coalesce(content, ''))) stored
);

create index idx_chat_messages_channel_created on public.chat_messages (channel_id, created_at);
create index idx_chat_messages_parent_id on public.chat_messages (parent_id);
create index idx_chat_messages_search on public.chat_messages using gin (search_vector);

create table public.chat_reactions (
  message_id  uuid not null references public.chat_messages (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  emoji       text not null,
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create table public.chat_attachments (
  id             uuid primary key default gen_random_uuid(),
  message_id     uuid not null references public.chat_messages (id) on delete cascade,
  media_item_id  uuid references public.media_items (id) on delete set null,
  file_url       text,
  file_name      text,
  file_type      text,
  created_at     timestamptz not null default now()
);

-- Default #general channel per org
insert into public.chat_channels (organization_id, name, description, type)
select id, 'general', 'Company-wide announcements and discussion', 'public'
from public.organizations;

-- =============================================================================
-- Helper functions (org roles)
-- =============================================================================
create or replace function public.user_role_level()
returns integer
language sql stable security definer
set search_path = public
as $$
  select coalesce(max(orole.level), 0)::integer
  from public.user_roles ur
  join public.org_roles orole on orole.id = ur.org_role_id
  where ur.user_id = auth.uid();
$$;

create or replace function public.target_user_role_level(p_target_user_id uuid)
returns integer
language sql stable security definer
set search_path = public
as $$
  select coalesce(max(orole.level), 0)::integer
  from public.user_roles ur
  join public.org_roles orole on orole.id = ur.org_role_id
  where ur.user_id = p_target_user_id;
$$;

create or replace function public.can_manage_user(p_target_user_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and p_target_user_id is not null
    and auth.uid() <> p_target_user_id
    and public.user_role_level() > public.target_user_role_level(p_target_user_id);
$$;

create or replace function public.has_permission(p_permission_key text)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.org_roles orole on orole.id = ur.org_role_id
    join public.org_role_permissions orp on orp.role_id = orole.id
    join public.org_permissions op on op.id = orp.permission_id
    where ur.user_id = auth.uid()
      and op.key = p_permission_key
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.org_roles orole on orole.id = ur.org_role_id
    where ur.user_id = auth.uid()
      and orole.name = 'admin'
  );
$$;

create or replace function public.is_viewer()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.org_roles orole on orole.id = ur.org_role_id
    where ur.user_id = auth.uid()
      and orole.name = 'viewer'
  );
$$;

create or replace function public.can_create_qr_invites()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select public.has_permission('invites.create') or public.has_permission('members.invite');
$$;

-- =============================================================================
-- Member management RPCs
-- =============================================================================
create or replace function public.suspend_org_member(p_target_user_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.can_manage_user(p_target_user_id) then
    raise exception 'Insufficient permissions to suspend this member.';
  end if;

  if not public.has_permission('members.suspend') and not public.is_admin() then
    raise exception 'Missing members.suspend permission.';
  end if;

  update public.profiles
  set suspended_at = now(), suspended_by = auth.uid()
  where id = p_target_user_id
    and organization_id = public.user_org_id()
    and removed_at is null;
end;
$$;

create or replace function public.unsuspend_org_member(p_target_user_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.can_manage_user(p_target_user_id) and not public.is_admin() then
    raise exception 'Insufficient permissions to unsuspend this member.';
  end if;

  update public.profiles
  set suspended_at = null, suspended_by = null
  where id = p_target_user_id
    and organization_id = public.user_org_id();
end;
$$;

create or replace function public.remove_org_member(p_target_user_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.can_manage_user(p_target_user_id) then
    raise exception 'Insufficient permissions to remove this member.';
  end if;

  if not public.has_permission('members.remove') and not public.is_admin() then
    raise exception 'Missing members.remove permission.';
  end if;

  update public.profiles
  set removed_at = now(), suspended_at = coalesce(suspended_at, now())
  where id = p_target_user_id
    and organization_id = public.user_org_id();
end;
$$;

create or replace function public.assign_org_member_role(p_target_user_id uuid, p_org_role_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_role_level integer;
begin
  if not public.can_manage_user(p_target_user_id) then
    raise exception 'Insufficient permissions to change this member role.';
  end if;

  if not public.has_permission('members.manage_roles') and not public.is_admin() then
    raise exception 'Missing members.manage_roles permission.';
  end if;

  select level into v_role_level
  from public.org_roles
  where id = p_org_role_id
    and organization_id = public.user_org_id();

  if v_role_level is null then
    raise exception 'Invalid role for this organization.';
  end if;

  if v_role_level > public.user_role_level() then
    raise exception 'Cannot assign a role above your own level.';
  end if;

  delete from public.user_roles where user_id = p_target_user_id;
  insert into public.user_roles (user_id, org_role_id) values (p_target_user_id, p_org_role_id);
end;
$$;

-- =============================================================================
-- Update handle_new_user for org_roles
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_invite_token_hash text;
  v_invite public.qr_invites%rowtype;
  v_role_id uuid;
begin
  v_invite_token_hash := nullif(new.raw_user_meta_data->>'invite_token_hash', '');

  if v_invite_token_hash is null then
    raise exception 'Invite code is required for registration.';
  end if;

  select *
    into v_invite
  from public.qr_invites
  where token_hash = v_invite_token_hash
    and status = 'active'
    and expires_at > now()
    and (valid_from is null or valid_from <= now())
  limit 1
  for update;

  if not found then
    raise exception 'Invite code is invalid, expired, or already used.';
  end if;

  perform public.seed_org_default_roles(v_invite.organization_id);

  insert into public.profiles (id, organization_id, full_name, avatar_url)
  values (
    new.id,
    v_invite.organization_id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  select id into v_role_id
  from public.org_roles
  where organization_id = v_invite.organization_id
    and name = v_invite.target_role;

  if v_role_id is null then
    select id into v_role_id
    from public.org_roles
    where organization_id = v_invite.organization_id
      and is_default = true;
  end if;

  if v_role_id is not null then
    insert into public.user_roles (user_id, org_role_id) values (new.id, v_role_id);
  end if;

  if not coalesce(v_invite.reusable, false) then
    update public.qr_invites
    set
      status = 'accepted',
      accepted_at = now(),
      accepted_user_id = new.id
    where id = v_invite.id;
  end if;

  return new;
end;
$$;

-- =============================================================================
-- Audit log trigger
-- =============================================================================
create or replace function public.audit_log_trigger()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_entity_id uuid;
begin
  v_org_id := coalesce(
    case when tg_op = 'DELETE' then null else to_jsonb(new)->>'organization_id' end,
    case when tg_op = 'DELETE' then to_jsonb(old)->>'organization_id' else null end
  )::uuid;

  if v_org_id is null then
    v_org_id := public.user_org_id();
  end if;

  v_entity_id := coalesce(
    case when tg_op = 'DELETE' then (to_jsonb(old)->>'id')::uuid else (to_jsonb(new)->>'id')::uuid end
  );

  if v_org_id is not null then
    insert into public.org_audit_log (organization_id, user_id, action, entity_type, entity_id, metadata)
    values (
      v_org_id,
      auth.uid(),
      tg_op,
      tg_table_name,
      v_entity_id,
      jsonb_build_object('old', case when tg_op = 'DELETE' then to_jsonb(old) else null end,
                         'new', case when tg_op = 'INSERT' then to_jsonb(new) else null end)
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger trg_audit_org_roles
  after insert or update or delete on public.org_roles
  for each row execute function public.audit_log_trigger();

create trigger trg_audit_profiles
  after update on public.profiles
  for each row execute function public.audit_log_trigger();

create trigger trg_audit_projects
  after insert or update or delete on public.projects
  for each row execute function public.audit_log_trigger();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.org_permissions enable row level security;
alter table public.org_roles enable row level security;
alter table public.org_role_permissions enable row level security;
alter table public.org_branding enable row level security;
alter table public.org_subscriptions enable row level security;
alter table public.org_invoices enable row level security;
alter table public.org_api_keys enable row level security;
alter table public.org_export_jobs enable row level security;
alter table public.org_audit_log enable row level security;
alter table public.chat_channels enable row level security;
alter table public.chat_channel_members enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reactions enable row level security;
alter table public.chat_attachments enable row level security;

create policy "org_permissions: authenticated read"
  on public.org_permissions for select to authenticated using (true);

create policy "org_roles: org read"
  on public.org_roles for select to authenticated
  using (organization_id = public.user_org_id());

create policy "org_roles: admin manage"
  on public.org_roles for all to authenticated
  using (organization_id = public.user_org_id() and public.has_permission('org.roles.manage'))
  with check (organization_id = public.user_org_id() and public.has_permission('org.roles.manage'));

create policy "org_role_permissions: org read"
  on public.org_role_permissions for select to authenticated
  using (
    exists (
      select 1 from public.org_roles orole
      where orole.id = role_id and orole.organization_id = public.user_org_id()
    )
  );

create policy "org_role_permissions: admin write"
  on public.org_role_permissions for all to authenticated
  using (public.has_permission('org.roles.manage'))
  with check (public.has_permission('org.roles.manage'));

-- Extend profiles read for org member directory
drop policy if exists "profiles: own read" on public.profiles;
create policy "profiles: org members read"
  on public.profiles for select to authenticated
  using (organization_id = public.user_org_id() and removed_at is null);

create policy "organizations: admin update"
  on public.organizations for update to authenticated
  using (id = public.user_org_id() and (public.has_permission('org.settings.edit') or public.is_admin()))
  with check (id = public.user_org_id());

-- user_roles: allow role managers to read all org member roles
drop policy if exists "user_roles: self read" on public.user_roles;
create policy "user_roles: org read"
  on public.user_roles for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or public.has_permission('members.view')
  );

create policy "org_branding: org read"
  on public.org_branding for select to authenticated
  using (organization_id = public.user_org_id());

create policy "org_branding: admin write"
  on public.org_branding for all to authenticated
  using (organization_id = public.user_org_id() and public.has_permission('org.settings.edit'))
  with check (organization_id = public.user_org_id());

create policy "org_subscriptions: org read"
  on public.org_subscriptions for select to authenticated
  using (organization_id = public.user_org_id());

create policy "org_invoices: org read"
  on public.org_invoices for select to authenticated
  using (organization_id = public.user_org_id() and public.has_permission('org.billing.view'));

create policy "org_api_keys: org read"
  on public.org_api_keys for select to authenticated
  using (organization_id = public.user_org_id());

create policy "org_api_keys: manage"
  on public.org_api_keys for all to authenticated
  using (organization_id = public.user_org_id() and public.has_permission('org.api_keys.manage'))
  with check (organization_id = public.user_org_id());

create policy "org_export_jobs: org access"
  on public.org_export_jobs for all to authenticated
  using (organization_id = public.user_org_id() and public.has_permission('org.export'))
  with check (organization_id = public.user_org_id());

create policy "org_audit_log: org read"
  on public.org_audit_log for select to authenticated
  using (organization_id = public.user_org_id() and (public.is_admin() or public.has_permission('org.settings.edit')));

create policy "chat_channels: org read"
  on public.chat_channels for select to authenticated
  using (organization_id = public.user_org_id() and archived_at is null);

create policy "chat_channels: manage"
  on public.chat_channels for insert to authenticated
  with check (organization_id = public.user_org_id());

create policy "chat_channel_members: member read"
  on public.chat_channel_members for select to authenticated
  using (
    exists (
      select 1 from public.chat_channels c
      where c.id = channel_id and c.organization_id = public.user_org_id()
    )
  );

create policy "chat_channel_members: self upsert"
  on public.chat_channel_members for insert to authenticated
  with check (user_id = auth.uid());

create policy "chat_channel_members: self update"
  on public.chat_channel_members for update to authenticated
  using (user_id = auth.uid());

create policy "chat_messages: channel read"
  on public.chat_messages for select to authenticated
  using (
    exists (
      select 1 from public.chat_channels c
      where c.id = channel_id and c.organization_id = public.user_org_id()
    )
  );

create policy "chat_messages: member insert"
  on public.chat_messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.chat_channels c
      where c.id = channel_id and c.organization_id = public.user_org_id()
    )
  );

create policy "chat_messages: author update"
  on public.chat_messages for update to authenticated
  using (user_id = auth.uid() or public.has_permission('chat.messages.delete_any'));

-- Realtime publication for chat
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.chat_channel_members;
