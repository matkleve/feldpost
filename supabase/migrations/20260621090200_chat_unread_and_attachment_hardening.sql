-- =============================================================================
-- Security hardening: chat unread-counts caller guard + attachment upload role
-- =============================================================================
-- Audit findings addressed:
--   1) get_chat_unread_counts(p_user_id) is SECURITY DEFINER and accepted any
--      user id. Per-channel access is still gated by can_access_chat_channel
--      (the caller's membership), but a caller could pass a colleague's id and
--      read that colleague's unread state for shared channels. Force the counts
--      to the calling user.
--   2) chat-attachments upload policy checked only the org folder, so a viewer
--      could upload attachments. Match the images/media buckets by requiring a
--      non-viewer role.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Unread counts: ignore the supplied id, always scope to the caller.
--    Signature is preserved (callers still pass auth.uid()); the parameter is
--    retained for compatibility but coalesced to auth.uid().
-- -----------------------------------------------------------------------------
create or replace function public.get_chat_unread_counts(p_user_id uuid)
returns table (channel_id uuid, unread_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as channel_id,
    count(m.id)::bigint as unread_count
  from public.chat_channels c
  join public.chat_channel_members cm
    on cm.channel_id = c.id and cm.user_id = auth.uid()
  left join public.chat_messages m
    on m.channel_id = c.id
    and m.deleted_at is null
    and m.parent_id is null
    and m.created_at > coalesce(cm.last_read_at, '1970-01-01'::timestamptz)
    and m.user_id <> auth.uid()
  where c.archived_at is null
    and public.can_access_chat_channel(c.id)
  group by c.id
  having count(m.id) > 0;
$$;

-- -----------------------------------------------------------------------------
-- 2) chat-attachments upload: require a non-viewer role (parity with media).
-- -----------------------------------------------------------------------------
drop policy if exists "chat_attachments_storage: org member upload" on storage.objects;
create policy "chat_attachments_storage: org member upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = (select public.user_org_id())::text
    and not (select public.is_viewer())
  );
