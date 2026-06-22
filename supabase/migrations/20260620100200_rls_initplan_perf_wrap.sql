-- =============================================================================
-- RLS performance: wrap helper calls in scalar sub-selects (InitPlan caching)
-- =============================================================================
-- Postgres re-evaluates STABLE functions like user_org_id()/auth.uid()/is_*()
-- once PER ROW when called bare inside a policy. Wrapping them as
-- `(select public.user_org_id())` lets the planner hoist them to a one-time
-- InitPlan. Behavior is identical; this only changes evaluation count. Applied
-- to the hot media tables. Policy bodies are reproduced verbatim from
-- 20260317113000_mixed_media_rls.sql with the calls wrapped.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- media_items
-- -----------------------------------------------------------------------------
drop policy if exists "media_items: org read" on public.media_items;
create policy "media_items: org read"
  on public.media_items
  for select
  using (organization_id = (select public.user_org_id()));

drop policy if exists "media_items: own insert" on public.media_items;
create policy "media_items: own insert"
  on public.media_items
  for insert
  with check (
    created_by = (select auth.uid())
    and organization_id = (select public.user_org_id())
    and not (select public.is_viewer())
  );

drop policy if exists "media_items: owner or admin update" on public.media_items;
create policy "media_items: owner or admin update"
  on public.media_items
  for update
  using (
    (created_by = (select auth.uid()) or (select public.is_admin()))
    and organization_id = (select public.user_org_id())
    and not (select public.is_viewer())
  )
  with check (
    organization_id = (select public.user_org_id())
    and not (select public.is_viewer())
  );

drop policy if exists "media_items: owner or admin delete" on public.media_items;
create policy "media_items: owner or admin delete"
  on public.media_items
  for delete
  using (
    (created_by = (select auth.uid()) or (select public.is_admin()))
    and organization_id = (select public.user_org_id())
    and not (select public.is_viewer())
  );

-- -----------------------------------------------------------------------------
-- media_projects
-- -----------------------------------------------------------------------------
drop policy if exists "media_projects: org read" on public.media_projects;
create policy "media_projects: org read"
  on public.media_projects
  for select
  using (
    exists (
      select 1 from public.media_items m
      where m.id = media_item_id
        and m.organization_id = (select public.user_org_id())
    )
  );

drop policy if exists "media_projects: org insert" on public.media_projects;
create policy "media_projects: org insert"
  on public.media_projects
  for insert
  with check (
    not (select public.is_viewer())
    and exists (
      select 1 from public.media_items m
      where m.id = media_item_id
        and m.organization_id = (select public.user_org_id())
    )
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.organization_id = (select public.user_org_id())
    )
  );

drop policy if exists "media_projects: org update" on public.media_projects;
create policy "media_projects: org update"
  on public.media_projects
  for update
  using (
    not (select public.is_viewer())
    and exists (
      select 1 from public.media_items m
      where m.id = media_item_id
        and m.organization_id = (select public.user_org_id())
    )
  )
  with check (
    not (select public.is_viewer())
    and exists (
      select 1 from public.media_items m
      where m.id = media_item_id
        and m.organization_id = (select public.user_org_id())
    )
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.organization_id = (select public.user_org_id())
    )
  );

drop policy if exists "media_projects: org delete" on public.media_projects;
create policy "media_projects: org delete"
  on public.media_projects
  for delete
  using (
    not (select public.is_viewer())
    and exists (
      select 1 from public.media_items m
      where m.id = media_item_id
        and m.organization_id = (select public.user_org_id())
    )
  );

-- -----------------------------------------------------------------------------
-- project_sections
-- -----------------------------------------------------------------------------
drop policy if exists "project_sections: org read" on public.project_sections;
create policy "project_sections: org read"
  on public.project_sections
  for select
  using (organization_id = (select public.user_org_id()));

drop policy if exists "project_sections: own insert" on public.project_sections;
create policy "project_sections: own insert"
  on public.project_sections
  for insert
  with check (
    created_by = (select auth.uid())
    and organization_id = (select public.user_org_id())
    and not (select public.is_viewer())
  );

drop policy if exists "project_sections: owner or admin update" on public.project_sections;
create policy "project_sections: owner or admin update"
  on public.project_sections
  for update
  using (
    (created_by = (select auth.uid()) or (select public.is_admin()))
    and organization_id = (select public.user_org_id())
    and not (select public.is_viewer())
  )
  with check (
    organization_id = (select public.user_org_id())
    and not (select public.is_viewer())
  );

drop policy if exists "project_sections: owner or admin delete" on public.project_sections;
create policy "project_sections: owner or admin delete"
  on public.project_sections
  for delete
  using (
    (created_by = (select auth.uid()) or (select public.is_admin()))
    and organization_id = (select public.user_org_id())
    and not (select public.is_viewer())
  );

-- -----------------------------------------------------------------------------
-- project_section_items
-- -----------------------------------------------------------------------------
drop policy if exists "project_section_items: org read" on public.project_section_items;
create policy "project_section_items: org read"
  on public.project_section_items
  for select
  using (
    exists (
      select 1 from public.project_sections s
      where s.id = section_id
        and s.organization_id = (select public.user_org_id())
    )
  );

drop policy if exists "project_section_items: org insert" on public.project_section_items;
create policy "project_section_items: org insert"
  on public.project_section_items
  for insert
  with check (
    not (select public.is_viewer())
    and exists (
      select 1 from public.project_sections s
      where s.id = section_id
        and s.organization_id = (select public.user_org_id())
    )
    and exists (
      select 1 from public.media_items m
      where m.id = media_item_id
        and m.organization_id = (select public.user_org_id())
    )
  );

drop policy if exists "project_section_items: org update" on public.project_section_items;
create policy "project_section_items: org update"
  on public.project_section_items
  for update
  using (
    not (select public.is_viewer())
    and exists (
      select 1 from public.project_sections s
      where s.id = section_id
        and s.organization_id = (select public.user_org_id())
    )
  )
  with check (
    not (select public.is_viewer())
    and exists (
      select 1 from public.project_sections s
      where s.id = section_id
        and s.organization_id = (select public.user_org_id())
    )
    and exists (
      select 1 from public.media_items m
      where m.id = media_item_id
        and m.organization_id = (select public.user_org_id())
    )
  );

drop policy if exists "project_section_items: org delete" on public.project_section_items;
create policy "project_section_items: org delete"
  on public.project_section_items
  for delete
  using (
    not (select public.is_viewer())
    and exists (
      select 1 from public.project_sections s
      where s.id = section_id
        and s.organization_id = (select public.user_org_id())
    )
  );
