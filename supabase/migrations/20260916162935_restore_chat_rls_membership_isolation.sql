-- =============================================================================
-- Security: restore chat membership isolation after perf-wrap regression
-- =============================================================================
-- 20260621090100 claimed to InitPlan-wrap "current" chat policies but copied
-- the pre-hardening bodies from 20260615180000 instead of the membership-
-- scoped policies from 20260615200000 / 20260615202043 / 20260620100000.
--
-- Effect (Postgres ORs permissive SELECT policies):
--   * re-created "chat_channels: org read" → every org member sees private/DM
--     channel rows (alongside the still-present "accessible read")
--   * replaced "chat_channel_members: member read" with org-wide membership
--     listing → private channel rosters leak inside the org
--   * replaced "chat_messages: channel read/insert" so they only check
--     organization_id → private/DM message bodies readable and writable by
--     any same-org non-member
--
-- This migration drops the weak SELECT policy, restores membership gates, and
-- keeps the (select …) InitPlan wraps where the helper is argument-free.
-- @see docs/study/010-defensive-security-review.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- chat_channels: one SELECT policy — public or member only
-- -----------------------------------------------------------------------------
drop policy if exists "chat_channels: org read" on public.chat_channels;
drop policy if exists "chat_channels: accessible read" on public.chat_channels;

create policy "chat_channels: accessible read"
  on public.chat_channels for select to authenticated
  using (
    organization_id = (select public.user_org_id())
    and archived_at is null
    and (
      type = 'public'
      or public.is_chat_channel_member(id)
    )
  );

-- -----------------------------------------------------------------------------
-- chat_channel_members: roster only for channels the caller belongs to
-- -----------------------------------------------------------------------------
drop policy if exists "chat_channel_members: member read" on public.chat_channel_members;

-- SECURITY DEFINER probe (is_chat_channel_member) — do not self-join this
-- table in the policy body (see 20260615202043 recursion fix).
create policy "chat_channel_members: member read"
  on public.chat_channel_members for select to authenticated
  using (public.is_chat_channel_member(channel_id));

-- -----------------------------------------------------------------------------
-- chat_messages: private/DM require can_access_chat_channel
-- -----------------------------------------------------------------------------
drop policy if exists "chat_messages: channel read" on public.chat_messages;
drop policy if exists "chat_messages: member insert" on public.chat_messages;

create policy "chat_messages: channel read"
  on public.chat_messages for select to authenticated
  using (public.can_access_chat_channel(channel_id));

create policy "chat_messages: member insert"
  on public.chat_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_access_chat_channel(channel_id)
  );

-- -----------------------------------------------------------------------------
-- user_roles: admin/members.view must stay inside the caller's organization
-- -----------------------------------------------------------------------------
-- Prior policy allowed any is_admin() / members.view holder to SELECT every
-- user_roles row globally (no join to profiles.organization_id).
drop policy if exists "user_roles: org read" on public.user_roles;

create policy "user_roles: org read"
  on public.user_roles for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      exists (
        select 1
        from public.profiles p
        where p.id = user_roles.user_id
          and p.organization_id = (select public.user_org_id())
      )
      and (
        (select public.is_admin())
        or (select public.has_permission('members.view'))
      )
    )
  );

-- Direct INSERT/DELETE on user_roles must not cross orgs either.
-- Role changes for product flows go through assign_org_member_role (DEFINER).
drop policy if exists "user_roles: admin write" on public.user_roles;
drop policy if exists "user_roles: admin delete" on public.user_roles;

create policy "user_roles: admin write"
  on public.user_roles for insert to authenticated
  with check (
    (select public.is_admin())
    and exists (
      select 1
      from public.profiles p
      where p.id = user_id
        and p.organization_id = (select public.user_org_id())
    )
    and exists (
      select 1
      from public.org_roles r
      where r.id = org_role_id
        and r.organization_id = (select public.user_org_id())
    )
  );

create policy "user_roles: admin delete"
  on public.user_roles for delete to authenticated
  using (
    (select public.is_admin())
    and exists (
      select 1
      from public.profiles p
      where p.id = user_id
        and p.organization_id = (select public.user_org_id())
    )
  );
