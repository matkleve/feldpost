-- An account can exist with no organization on screen.
-- @see docs/specs/system/account-context.md
-- Creating an organization does not copy or move existing rows.

alter table public.profiles
  alter column organization_id drop not null;

alter table public.profiles
  add column if not exists active_organization_id uuid references public.organizations (id) on delete set null;

update public.profiles
set active_organization_id = organization_id
where active_organization_id is null
  and organization_id is not null;

create table if not exists public.account_memberships (
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  primary key (user_id, organization_id)
);

insert into public.account_memberships (user_id, organization_id)
select id, organization_id
from public.profiles
where organization_id is not null
on conflict do nothing;

alter table public.account_memberships enable row level security;

create policy "account_memberships: own read"
  on public.account_memberships
  for select
  using (user_id = (select auth.uid()));

create or replace function public.user_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select active_organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite_token_hash text;
  v_invite public.qr_invites%rowtype;
  v_role_id uuid;
begin
  v_invite_token_hash := nullif(new.raw_user_meta_data->>'invite_token_hash', '');

  if v_invite_token_hash is null then
    insert into public.profiles (id, organization_id, active_organization_id, full_name, avatar_url)
    values (
      new.id,
      null,
      null,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url'
    );
    return new;
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

  insert into public.profiles (id, organization_id, active_organization_id, full_name, avatar_url)
  values (
    new.id,
    v_invite.organization_id,
    v_invite.organization_id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  insert into public.account_memberships (user_id, organization_id)
  values (new.id, v_invite.organization_id)
  on conflict do nothing;

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

  if coalesce(v_invite.reusable, false) then
    insert into public.invite_signups (invite_id, user_id)
    values (v_invite.id, new.id)
    on conflict (invite_id, user_id) do nothing;
  else
    update public.qr_invites
    set status = 'accepted', accepted_at = now(), accepted_user_id = new.id
    where id = v_invite.id;
  end if;

  return new;
end;
$$;

create or replace function public.set_account_context(p_organization_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;

  if p_organization_id is not null and not exists (
    select 1
    from public.account_memberships
    where user_id = auth.uid()
      and organization_id = p_organization_id
  ) then
    raise exception 'not a member';
  end if;

  update public.profiles
  set
    organization_id = p_organization_id,
    active_organization_id = p_organization_id,
    updated_at = now()
  where id = auth.uid();
end;
$$;

create or replace function public.create_organization(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_role uuid;
begin
  if auth.uid() is null then
    raise exception 'not allowed';
  end if;
  if nullif(btrim(p_name), '') is null then
    raise exception 'name required';
  end if;

  insert into public.organizations (name)
  values (btrim(p_name))
  returning id into v_org;

  perform public.seed_org_default_roles(v_org);

  insert into public.account_memberships (user_id, organization_id)
  values (auth.uid(), v_org);

  select id into v_role
  from public.org_roles
  where organization_id = v_org
    and name = 'admin';

  if v_role is null then
    select id into v_role
    from public.org_roles
    where organization_id = v_org
      and is_default = true;
  end if;

  if v_role is not null then
    insert into public.user_roles (user_id, org_role_id)
    values (auth.uid(), v_role);
  end if;

  update public.profiles
  set
    organization_id = v_org,
    active_organization_id = v_org,
    updated_at = now()
  where id = auth.uid();

  return v_org;
end;
$$;

revoke all on function public.set_account_context(uuid) from public;
revoke all on function public.create_organization(text) from public;
grant execute on function public.set_account_context(uuid) to authenticated;
grant execute on function public.create_organization(text) to authenticated;

create or replace function public.list_account_memberships()
returns table (organization_id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select memberships.organization_id, organizations.name
  from public.account_memberships as memberships
  join public.organizations as organizations
    on organizations.id = memberships.organization_id
  where memberships.user_id = auth.uid();
$$;

revoke all on function public.list_account_memberships() from public;
grant execute on function public.list_account_memberships() to authenticated;
