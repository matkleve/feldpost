-- =============================================================================
-- RLS performance: InitPlan-wrap the chat policies (high-traffic, realtime)
-- =============================================================================
-- 20260620100200 wrapped the media tables but left the chat tables on bare
-- helper calls (user_org_id()/auth.uid()/has_permission()), which Postgres
-- re-evaluates once PER ROW. Wrapping the argument-free stable helpers as
-- `(select ...)` lets the planner hoist them to a one-time InitPlan. Behavior is
-- identical; only the evaluation count changes.
--
-- Column-dependent helpers (can_self_join_chat_channel(channel_id),
-- can_access_chat_channel(channel_id)) are intentionally left bare: they
-- correlate to the row and cannot be hoisted.
--
-- Policy bodies are reproduced verbatim from their current definitions:
--   chat_channels / chat_channel_members(read,update) / chat_messages(read,insert)
--     -> 20260615180000_org_roles_colleagues_chat.sql
--   chat_channel_members "self join allowed channels" / chat_messages
--     "author update" -> 20260620100000_chat_and_branding_rls_hardening.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- chat_channels
-- -----------------------------------------------------------------------------
drop policy if exists "chat_channels: org read" on public.chat_channels;
create policy "chat_channels: org read"
  on public.chat_channels for select to authenticated
  using (organization_id = (select public.user_org_id()) and archived_at is null);

drop policy if exists "chat_channels: manage" on public.chat_channels;
create policy "chat_channels: manage"
  on public.chat_channels for insert to authenticated
  with check (organization_id = (select public.user_org_id()));

-- -----------------------------------------------------------------------------
-- chat_channel_members
-- -----------------------------------------------------------------------------
drop policy if exists "chat_channel_members: member read" on public.chat_channel_members;
create policy "chat_channel_members: member read"
  on public.chat_channel_members for select to authenticated
  using (
    exists (
      select 1 from public.chat_channels c
      where c.id = channel_id and c.organization_id = (select public.user_org_id())
    )
  );

drop policy if exists "chat_channel_members: self join allowed channels" on public.chat_channel_members;
create policy "chat_channel_members: self join allowed channels"
  on public.chat_channel_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_self_join_chat_channel(channel_id)
  );

drop policy if exists "chat_channel_members: self update" on public.chat_channel_members;
create policy "chat_channel_members: self update"
  on public.chat_channel_members for update to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- chat_messages
-- -----------------------------------------------------------------------------
drop policy if exists "chat_messages: channel read" on public.chat_messages;
create policy "chat_messages: channel read"
  on public.chat_messages for select to authenticated
  using (
    exists (
      select 1 from public.chat_channels c
      where c.id = channel_id and c.organization_id = (select public.user_org_id())
    )
  );

drop policy if exists "chat_messages: member insert" on public.chat_messages;
create policy "chat_messages: member insert"
  on public.chat_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.chat_channels c
      where c.id = channel_id and c.organization_id = (select public.user_org_id())
    )
  );

drop policy if exists "chat_messages: author update" on public.chat_messages;
create policy "chat_messages: author update"
  on public.chat_messages for update to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.has_permission('chat.messages.delete_any'))
  )
  with check (
    (
      user_id = (select auth.uid())
      or (select public.has_permission('chat.messages.delete_any'))
    )
    and public.can_access_chat_channel(channel_id)
  );
