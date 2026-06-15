-- Chat RLS hardening: break circular RLS dependency, membership-scoped
-- private/DM reads, reactions/attachments policies, channel manage policies.

-- =============================================================================
-- Fix circular RLS: chat_channel_members must NOT subquery chat_channels.
-- Members can see their own memberships + memberships for channels they belong to.
-- =============================================================================
drop policy if exists "chat_channel_members: member read" on public.chat_channel_members;

create policy "chat_channel_members: member read"
  on public.chat_channel_members for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.chat_channel_members my_m
      where my_m.channel_id = chat_channel_members.channel_id
        and my_m.user_id = auth.uid()
    )
  );

-- =============================================================================
-- chat_channels policies (no circular dependency)
-- =============================================================================
drop policy if exists "chat_channels: org read" on public.chat_channels;

create policy "chat_channels: accessible read"
  on public.chat_channels for select to authenticated
  using (
    organization_id = public.user_org_id()
    and archived_at is null
    and (
      type = 'public'
      or exists (
        select 1 from public.chat_channel_members m
        where m.channel_id = id and m.user_id = auth.uid()
      )
    )
  );

create policy "chat_channels: manage update"
  on public.chat_channels for update to authenticated
  using (
    organization_id = public.user_org_id()
    and (
      public.has_permission('chat.channels.manage')
      or created_by = auth.uid()
    )
  )
  with check (organization_id = public.user_org_id());

-- =============================================================================
-- Helper: can the current user access a chat channel?
-- Uses plpgsql SECURITY DEFINER to bypass RLS on the lookup tables,
-- avoiding circular policy evaluation.
-- =============================================================================
create or replace function public.can_access_chat_channel(p_channel_id uuid)
returns boolean
language plpgsql stable security definer
set search_path = public
as $$
declare
  v_type public.chat_channel_type;
  v_org_id uuid;
  v_archived_at timestamptz;
begin
  select c.type, c.organization_id, c.archived_at
    into v_type, v_org_id, v_archived_at
    from public.chat_channels c
   where c.id = p_channel_id;

  if not found or v_archived_at is not null then
    return false;
  end if;

  if v_org_id <> public.user_org_id() then
    return false;
  end if;

  if v_type = 'public' then
    return true;
  end if;

  return exists (
    select 1
    from public.chat_channel_members m
    where m.channel_id = p_channel_id
      and m.user_id = auth.uid()
  );
end;
$$;

-- =============================================================================
-- chat_messages policies (membership-scoped for private/DM)
-- =============================================================================
drop policy if exists "chat_messages: channel read" on public.chat_messages;
drop policy if exists "chat_messages: member insert" on public.chat_messages;

create policy "chat_messages: channel read"
  on public.chat_messages for select to authenticated
  using (public.can_access_chat_channel(channel_id));

create policy "chat_messages: member insert"
  on public.chat_messages for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_access_chat_channel(channel_id)
  );

-- =============================================================================
-- chat_reactions policies
-- =============================================================================
create policy "chat_reactions: channel member read"
  on public.chat_reactions for select to authenticated
  using (
    exists (
      select 1
      from public.chat_messages msg
      where msg.id = message_id
        and public.can_access_chat_channel(msg.channel_id)
    )
  );

create policy "chat_reactions: member insert"
  on public.chat_reactions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.chat_messages msg
      where msg.id = message_id
        and public.can_access_chat_channel(msg.channel_id)
    )
  );

create policy "chat_reactions: own delete"
  on public.chat_reactions for delete to authenticated
  using (user_id = auth.uid());

-- =============================================================================
-- chat_attachments policies
-- =============================================================================
create policy "chat_attachments: channel member read"
  on public.chat_attachments for select to authenticated
  using (
    exists (
      select 1
      from public.chat_messages msg
      where msg.id = message_id
        and public.can_access_chat_channel(msg.channel_id)
    )
  );

create policy "chat_attachments: message author insert"
  on public.chat_attachments for insert to authenticated
  with check (
    exists (
      select 1
      from public.chat_messages msg
      where msg.id = message_id
        and msg.user_id = auth.uid()
        and public.can_access_chat_channel(msg.channel_id)
    )
  );

-- Realtime for reactions
alter publication supabase_realtime add table public.chat_reactions;
