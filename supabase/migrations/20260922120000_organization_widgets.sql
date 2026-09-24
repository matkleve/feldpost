-- Organization widget install. One row means the organization has added that widget.
-- No per-user column. Catalog ids that are fixed on the rail are not installable.
-- @see docs/specs/system/widget-grants.md
-- @see docs/specs/service/organization-widgets/organization-widgets.md

create table public.organization_widgets (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  widget_id text not null,
  primary key (organization_id, widget_id),
  constraint organization_widgets_widget_id_check check (
    widget_id in (
      'workers',
      'organisation',
      'vehicles',
      'boats',
      'material',
      'storage-locations',
      'buildings'
    )
  )
);

comment on table public.organization_widgets is
  'Widgets an organization has added. Presence is the install. Role keys decide who may open the widget.';

alter table public.organization_widgets enable row level security;

create policy organization_widgets_select
  on public.organization_widgets
  for select
  to authenticated
  using (organization_id = (select public.user_org_id()));

create policy organization_widgets_insert
  on public.organization_widgets
  for insert
  to authenticated
  with check (organization_id = (select public.user_org_id()));

create policy organization_widgets_delete
  on public.organization_widgets
  for delete
  to authenticated
  using (organization_id = (select public.user_org_id()));

revoke all on table public.organization_widgets from public, anon;
grant select, insert, delete on table public.organization_widgets to authenticated;
