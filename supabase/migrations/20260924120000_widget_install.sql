-- Widget install rows. Hiding a widget does not delete subject data.
-- @see docs/specs/system/widget-install.md

create table public.organization_widget_policies (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  widget_id text not null,
  allowed boolean not null default true,
  preinstalled boolean not null default false,
  locked boolean not null default false,
  primary key (organization_id, widget_id),
  constraint organization_widget_policies_widget_id_check
    check (widget_id in ('map', 'media', 'projects', 'colleagues', 'organization')),
  constraint organization_widget_policies_lock_check
    check (locked = false or (preinstalled = true and allowed = true))
);

create table public.user_widget_installs (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  widget_id text not null,
  installed boolean not null,
  primary key (organization_id, user_id, widget_id),
  constraint user_widget_installs_widget_id_check
    check (widget_id in ('map', 'media', 'projects', 'colleagues', 'organization'))
);

alter table public.organization_widget_policies enable row level security;
alter table public.user_widget_installs enable row level security;

create policy "organization_widget_policies: org read"
  on public.organization_widget_policies
  for select
  using (organization_id = (select public.user_org_id()));

create policy "organization_widget_policies: settings edit"
  on public.organization_widget_policies
  for all
  using (
    organization_id = (select public.user_org_id())
    and (select public.has_permission('org.settings.edit'))
  )
  with check (
    organization_id = (select public.user_org_id())
    and (select public.has_permission('org.settings.edit'))
  );

create policy "user_widget_installs: own read"
  on public.user_widget_installs
  for select
  using (
    organization_id = (select public.user_org_id())
    and user_id = (select auth.uid())
  );

-- Writes go through set_own_widget_installed and push_organization_widget.
-- A direct insert would skip the lock and allow checks.

-- Existing people keep the apps they already use. New profiles get no user rows,
-- so the client treats them as Map and Media (the preinstall below).
insert into public.organization_widget_policies (organization_id, widget_id, allowed, preinstalled, locked)
select organizations.id, widgets.widget_id, true, widgets.preinstalled, false
from public.organizations
cross join (
  values
    ('map', true),
    ('media', true),
    ('projects', false),
    ('colleagues', false),
    ('organization', false)
) as widgets (widget_id, preinstalled);

insert into public.user_widget_installs (organization_id, user_id, widget_id, installed)
select profiles.organization_id, profiles.id, widgets.widget_id, true
from public.profiles
cross join (
  values ('map'), ('media'), ('projects'), ('colleagues'), ('organization')
) as widgets (widget_id);

-- Push turns the widget on for every profile in the caller's organization.
-- Preinstall does not do this. A user who turned it off stays off until this runs.
create or replace function public.push_organization_widget(p_widget_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid := public.user_org_id();
begin
  if v_org is null or not public.has_permission('org.settings.edit') then
    raise exception 'not allowed';
  end if;
  if p_widget_id not in ('map', 'media', 'projects', 'colleagues', 'organization') then
    raise exception 'unknown widget';
  end if;

  insert into public.user_widget_installs (organization_id, user_id, widget_id, installed)
  select v_org, profiles.id, p_widget_id, true
  from public.profiles
  where profiles.organization_id = v_org
  on conflict (organization_id, user_id, widget_id)
  do update set installed = true;
end;
$$;

revoke all on function public.push_organization_widget(text) from public;
grant execute on function public.push_organization_widget(text) to authenticated;

-- Own install bit. Refuses a disallowed widget and a locked preinstall.
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
  if v_org is null or v_uid is null then
    raise exception 'not allowed';
  end if;
  if p_widget_id not in ('map', 'media', 'projects', 'colleagues', 'organization') then
    raise exception 'unknown widget';
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

  insert into public.user_widget_installs (organization_id, user_id, widget_id, installed)
  values (v_org, v_uid, p_widget_id, p_installed)
  on conflict (organization_id, user_id, widget_id)
  do update set installed = excluded.installed;
end;
$$;

revoke all on function public.set_own_widget_installed(text, boolean) from public;
grant execute on function public.set_own_widget_installed(text, boolean) to authenticated;
