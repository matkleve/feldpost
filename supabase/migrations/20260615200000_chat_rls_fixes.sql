-- Chat RLS hardening: channel access helper, membership-scoped private/DM reads,
-- reactions/attachments policies, channel manage policies.

-- =============================================================================
-- Helper: can the current user access a chat channel?
-- Public channels: any org member. Private/DM: channel members only.
-- =============================================================================
create or replace function public.can_access_chat_channel(p_channel_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_channels c
    where c.id = p_channel_id
      and c.organization_id = public.user_org_id()
      and c.archived_at is null
      and (
        c.type = 'public'
        or exists (
          select 1
          from public.chat_channel_members m
          where m.channel_id = c.id
            and m.user_id = auth.uid()
        )
      )
  );
$$;

-- =============================================================================
-- chat_channels policies
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
