-- DM channels need both participants in chat_channel_members; RLS only allows self-insert.
create or replace function public.find_or_create_dm_channel(p_other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
  v_user_id uuid := auth.uid();
  v_channel_id uuid;
begin
  if v_user_id is null or p_other_user_id is null then
    raise exception 'Missing user context';
  end if;

  if p_other_user_id = v_user_id then
    raise exception 'Cannot open a direct message with yourself';
  end if;

  v_org_id := public.user_org_id();

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_other_user_id
      and p.organization_id = v_org_id
  ) then
    raise exception 'Colleague is not in your organization';
  end if;

  select c.id
  into v_channel_id
  from public.chat_channels c
  where c.organization_id = v_org_id
    and c.type = 'dm'
    and c.archived_at is null
    and exists (
      select 1
      from public.chat_channel_members m
      where m.channel_id = c.id
        and m.user_id = v_user_id
    )
    and exists (
      select 1
      from public.chat_channel_members m
      where m.channel_id = c.id
        and m.user_id = p_other_user_id
    )
    and (
      select count(*)
      from public.chat_channel_members m
      where m.channel_id = c.id
    ) = 2
  limit 1;

  if v_channel_id is not null then
    return v_channel_id;
  end if;

  insert into public.chat_channels (organization_id, type, created_by)
  values (v_org_id, 'dm', v_user_id)
  returning id into v_channel_id;

  insert into public.chat_channel_members (channel_id, user_id, role)
  values
    (v_channel_id, v_user_id, 'owner'),
    (v_channel_id, p_other_user_id, 'member');

  return v_channel_id;
end;
$$;

grant execute on function public.find_or_create_dm_channel(uuid) to authenticated;
