-- =============================================================================
-- Security hardening: chat membership privacy, message integrity, branding writes
-- =============================================================================
-- Audit findings addressed:
--   1) chat_channel_members "self upsert" let ANY org member self-insert into
--      private/DM channels and then read the full history (can_access_chat_channel
--      returns true once a membership row exists). Restrict self-join to public
--      channels, channels the caller created, or channels the caller already
--      belongs to (the last clause keeps markChannelRead's upsert working).
--   2) chat_messages "author update" had no WITH CHECK: an author could move a
--      message into another channel, and delete_any holders were unconstrained.
--   3) chat_channel_members "self update" had no column guard: a plain member
--      could set their own role to 'owner'. Block role escalation via trigger.
--   4) org-branding storage writes only checked the org folder, letting any
--      member (incl. viewers) overwrite/delete the org logo. Gate on the
--      org.settings.edit permission, matching the org_branding table policy.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Membership self-join: SECURITY DEFINER probe avoids RLS recursion.
-- -----------------------------------------------------------------------------
create or replace function public.can_self_join_chat_channel(p_channel_id uuid)
returns boolean
language sql
stable
security definer
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
        or c.created_by = auth.uid()
        or exists (
          select 1
          from public.chat_channel_members m
          where m.channel_id = p_channel_id
            and m.user_id = auth.uid()
        )
      )
  );
$$;

grant execute on function public.can_self_join_chat_channel(uuid) to authenticated;

drop policy if exists "chat_channel_members: self upsert" on public.chat_channel_members;

create policy "chat_channel_members: self join allowed channels"
  on public.chat_channel_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_self_join_chat_channel(channel_id)
  );

-- -----------------------------------------------------------------------------
-- 2) chat_messages author update: constrain the resulting row.
-- -----------------------------------------------------------------------------
drop policy if exists "chat_messages: author update" on public.chat_messages;

create policy "chat_messages: author update"
  on public.chat_messages for update to authenticated
  using (
    user_id = auth.uid()
    or public.has_permission('chat.messages.delete_any')
  )
  with check (
    (
      user_id = auth.uid()
      or public.has_permission('chat.messages.delete_any')
    )
    and public.can_access_chat_channel(channel_id)
  );

-- -----------------------------------------------------------------------------
-- 3) Block channel-member role escalation via direct UPDATE.
--    Role changes must go through ownership / chat.channels.manage.
-- -----------------------------------------------------------------------------
create or replace function public.enforce_chat_member_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if not (
      public.has_permission('chat.channels.manage')
      or exists (
        select 1 from public.chat_channels c
        where c.id = new.channel_id and c.created_by = auth.uid()
      )
      or exists (
        select 1 from public.chat_channel_members m
        where m.channel_id = new.channel_id
          and m.user_id = auth.uid()
          and m.role = 'owner'
      )
    ) then
      raise exception 'Not allowed to change channel member role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_member_role_change on public.chat_channel_members;
create trigger trg_chat_member_role_change
  before update on public.chat_channel_members
  for each row execute function public.enforce_chat_member_role_change();

-- -----------------------------------------------------------------------------
-- 4) org-branding storage: writes require org.settings.edit (table-policy parity)
-- -----------------------------------------------------------------------------
drop policy if exists "org_branding_storage: org member upload" on storage.objects;
create policy "org_branding_storage: org member upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'org-branding'
    and (storage.foldername(name))[1] = public.user_org_id()::text
    and (public.has_permission('org.settings.edit') or public.is_admin())
  );

drop policy if exists "org_branding_storage: org member update" on storage.objects;
create policy "org_branding_storage: org member update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'org-branding'
    and (storage.foldername(name))[1] = public.user_org_id()::text
    and (public.has_permission('org.settings.edit') or public.is_admin())
  )
  with check (
    bucket_id = 'org-branding'
    and (storage.foldername(name))[1] = public.user_org_id()::text
    and (public.has_permission('org.settings.edit') or public.is_admin())
  );

drop policy if exists "org_branding_storage: org member delete" on storage.objects;
create policy "org_branding_storage: org member delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'org-branding'
    and (storage.foldername(name))[1] = public.user_org_id()::text
    and (public.has_permission('org.settings.edit') or public.is_admin())
  );
