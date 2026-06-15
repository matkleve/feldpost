-- Allow channel owners/managers to invite colleagues to a channel.

create or replace function public.invite_chat_channel_member(
  p_channel_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_channel_id is null or p_user_id is null then
    raise exception 'Channel and user are required';
  end if;

  if not exists (
    select 1
    from public.chat_channels c
    where c.id = p_channel_id
      and c.organization_id = public.user_org_id()
      and c.archived_at is null
      and c.type <> 'dm'
  ) then
    raise exception 'Channel not found';
  end if;

  if not (
    public.has_permission('chat.channels.manage')
    or exists (
      select 1
      from public.chat_channels c
      where c.id = p_channel_id
        and c.created_by = auth.uid()
    )
    or exists (
      select 1
      from public.chat_channel_members m
      where m.channel_id = p_channel_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  ) then
    raise exception 'Not allowed to invite members';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.organization_id = public.user_org_id()
      and p.removed_at is null
  ) then
    raise exception 'Colleague not found';
  end if;

  insert into public.chat_channel_members (channel_id, user_id, role)
  values (p_channel_id, p_user_id, 'member')
  on conflict (channel_id, user_id) do nothing;
end;
$$;

grant execute on function public.invite_chat_channel_member(uuid, uuid) to authenticated;
