-- Personal rows: no organization, owned by the account on screen.
-- Organization rows stay on organization_id = user_org_id().
-- @see docs/specs/system/account-context.md

alter table public.media_items alter column organization_id drop not null;
alter table public.projects alter column organization_id drop not null;
alter table public.locations alter column organization_id drop not null;

alter table public.locations
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

create policy "media_items: personal read"
  on public.media_items
  for select
  using (
    organization_id is null
    and created_by = (select auth.uid())
    and (select public.user_org_id()) is null
  );

create policy "media_items: personal insert"
  on public.media_items
  for insert
  with check (
    organization_id is null
    and created_by = (select auth.uid())
    and (select public.user_org_id()) is null
    and not (select public.is_viewer())
  );

create policy "media_items: personal update"
  on public.media_items
  for update
  using (
    organization_id is null
    and created_by = (select auth.uid())
    and (select public.user_org_id()) is null
  )
  with check (
    organization_id is null
    and created_by = (select auth.uid())
    and (select public.user_org_id()) is null
  );

create policy "media_items: personal delete"
  on public.media_items
  for delete
  using (
    organization_id is null
    and created_by = (select auth.uid())
    and (select public.user_org_id()) is null
  );

create policy "projects: personal read"
  on public.projects
  for select
  using (
    organization_id is null
    and created_by = (select auth.uid())
    and (select public.user_org_id()) is null
  );

create policy "projects: personal insert"
  on public.projects
  for insert
  with check (
    organization_id is null
    and created_by = (select auth.uid())
    and (select public.user_org_id()) is null
  );

create policy "projects: personal update"
  on public.projects
  for update
  using (
    organization_id is null
    and created_by = (select auth.uid())
    and (select public.user_org_id()) is null
  )
  with check (
    organization_id is null
    and created_by = (select auth.uid())
  );

create policy "projects: personal delete"
  on public.projects
  for delete
  using (
    organization_id is null
    and created_by = (select auth.uid())
    and (select public.user_org_id()) is null
  );

create policy "locations: personal read"
  on public.locations
  for select
  using (
    organization_id is null
    and created_by = (select auth.uid())
    and (select public.user_org_id()) is null
  );

create policy "locations: personal insert"
  on public.locations
  for insert
  with check (
    organization_id is null
    and created_by = (select auth.uid())
    and (select public.user_org_id()) is null
  );

create policy "locations: personal update"
  on public.locations
  for update
  using (
    organization_id is null
    and created_by = (select auth.uid())
    and (select public.user_org_id()) is null
  )
  with check (
    organization_id is null
    and created_by = (select auth.uid())
  );

create policy "locations: personal delete"
  on public.locations
  for delete
  using (
    organization_id is null
    and created_by = (select auth.uid())
    and (select public.user_org_id()) is null
  );

create policy "media: personal upload"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'media'
    and (select public.user_org_id()) is null
    and (storage.foldername(name))[1] = 'personal'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and not (select public.is_viewer())
  );

create policy "media: personal read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'media'
    and (select public.user_org_id()) is null
    and (storage.foldername(name))[1] = 'personal'
    and (storage.foldername(name))[2] = (select auth.uid())::text
  );
