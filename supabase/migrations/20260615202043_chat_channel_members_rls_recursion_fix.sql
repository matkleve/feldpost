-- Break chat_channel_members ↔ chat_channels RLS recursion.
-- Prior fix still self-joined chat_channel_members in its SELECT policy, which
-- re-triggers the same policy (infinite recursion on chat_channels reads).

-- =============================================================================
-- SECURITY DEFINER membership probe (bypasses RLS on chat_channel_members)
-- =============================================================================
create or replace function public.is_chat_channel_member(p_channel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.chat_channel_members m
    where m.channel_id = p_channel_id
      and m.user_id = auth.uid()
  );
$$;

grant execute on function public.is_chat_channel_member(uuid) to authenticated;

-- =============================================================================
-- chat_channel_members: visible to members of the same channel
-- =============================================================================
drop policy if exists "chat_channel_members: member read" on public.chat_channel_members;

create policy "chat_channel_members: member read"
  on public.chat_channel_members for select to authenticated
  using (public.is_chat_channel_member(channel_id));

-- =============================================================================
-- chat_channels: org-scoped; private/DM require membership
-- =============================================================================
drop policy if exists "chat_channels: accessible read" on public.chat_channels;

create policy "chat_channels: accessible read"
  on public.chat_channels for select to authenticated
  using (
    organization_id = public.user_org_id()
    and archived_at is null
    and (
      type = 'public'
      or public.is_chat_channel_member(id)
    )
  );

-- =============================================================================
-- can_access_chat_channel: reuse membership helper (definer already bypasses RLS)
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

  return public.is_chat_channel_member(p_channel_id);
end;
$$;
