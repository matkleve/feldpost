-- =============================================================================
-- Security: make chat-attachments a private bucket (signed-URL access)
-- =============================================================================
-- The chat-attachments bucket was public:true, so any uploaded file was
-- readable over the internet by direct URL, cross-org, with no auth. Flip it to
-- private and serve via short-lived signed URLs (generated client-side at read
-- time, gated by the SELECT policy below). The app now persists the storage
-- path in chat_attachments.storage_path instead of a public URL.
--
-- Legacy rows keep their stored file_url as a non-authoritative fallback; those
-- public URLs will stop resolving once the bucket is private (acceptable for the
-- young chat feature — no backfill needed).
-- =============================================================================

-- Persist the storage object path (private bucket); file_url retained for legacy.
alter table public.chat_attachments
  add column if not exists storage_path text;

-- Flip the bucket to private. Signed URLs (createSignedUrl) now gate reads.
update storage.buckets set public = false where id = 'chat-attachments';

-- Tighten read access to the caller's org folder. Path layout is
-- `<org_id>/<user_id>/<uuid>.<ext>`, so foldername[1] is the org id. This
-- prevents a same-tenant signed URL from being minted for another org's object.
drop policy if exists "chat_attachments_storage: org member read" on storage.objects;
create policy "chat_attachments_storage: org member read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = (select public.user_org_id())::text
  );
