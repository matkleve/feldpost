-- =============================================================================
-- Missing indexes on join/filter columns (audit: Data Integrity / Performance)
-- =============================================================================

-- Share-set creation joins media_items on source_image_id (legacy image id ->
-- migrated media item). Previously unindexed => sequential scan per share.
create index if not exists idx_media_items_source_image_id
  on public.media_items (source_image_id)
  where source_image_id is not null;

-- chat_channel_members PK is (channel_id, user_id); every membership probe and
-- "my channels" lookup filters by user_id alone and could not use the PK.
create index if not exists idx_chat_channel_members_user_id
  on public.chat_channel_members (user_id);

-- chat_attachments read policy joins on message_id (FK, was unindexed).
create index if not exists idx_chat_attachments_message_id
  on public.chat_attachments (message_id);

-- chat_messages author lookups / RLS author checks filter by user_id.
create index if not exists idx_chat_messages_user_id
  on public.chat_messages (user_id);

-- org_export_jobs filtered by organization_id (FK, was unindexed).
create index if not exists idx_org_export_jobs_org_id
  on public.org_export_jobs (organization_id);
