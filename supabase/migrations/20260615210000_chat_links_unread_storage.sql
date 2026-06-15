-- Chat entity links, unread counts RPC, and chat-attachments storage bucket.

-- =============================================================================
-- chat_message_links
-- =============================================================================
create table public.chat_message_links (
  id            uuid primary key default gen_random_uuid(),
  message_id    uuid not null references public.chat_messages (id) on delete cascade,
  entity_type   text not null check (entity_type in ('project', 'media', 'timespace')),
  entity_id     uuid not null,
  entity_label  text,
  created_at    timestamptz not null default now()
);

create index idx_chat_message_links_message on public.chat_message_links (message_id);

alter table public.chat_message_links enable row level security;

create policy "chat_message_links: channel member read"
  on public.chat_message_links for select to authenticated
  using (
    exists (
      select 1
      from public.chat_messages msg
      where msg.id = message_id
        and public.can_access_chat_channel(msg.channel_id)
    )
  );

create policy "chat_message_links: message author insert"
  on public.chat_message_links for insert to authenticated
  with check (
    exists (
      select 1
      from public.chat_messages msg
      where msg.id = message_id
        and msg.user_id = auth.uid()
        and public.can_access_chat_channel(msg.channel_id)
    )
  );

alter publication supabase_realtime add table public.chat_message_links;

-- =============================================================================
-- Unread counts RPC
-- =============================================================================
create or replace function public.get_chat_unread_counts(p_user_id uuid)
returns table (channel_id uuid, unread_count bigint)
language sql stable security definer
set search_path = public
as $$
  select
    c.id as channel_id,
    count(m.id)::bigint as unread_count
  from public.chat_channels c
  join public.chat_channel_members cm
    on cm.channel_id = c.id and cm.user_id = p_user_id
  left join public.chat_messages m
    on m.channel_id = c.id
    and m.deleted_at is null
    and m.parent_id is null
    and m.created_at > coalesce(cm.last_read_at, '1970-01-01'::timestamptz)
    and m.user_id <> p_user_id
  where c.archived_at is null
    and public.can_access_chat_channel(c.id)
  group by c.id
  having count(m.id) > 0;
$$;

-- =============================================================================
-- Storage bucket for chat attachments
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain']
)
on conflict (id) do nothing;

create policy "chat_attachments_storage: org member read"
  on storage.objects for select to authenticated
  using (bucket_id = 'chat-attachments');

create policy "chat_attachments_storage: org member upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = public.user_org_id()::text
  );

create policy "chat_attachments_storage: own delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
