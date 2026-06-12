-- =============================================================================
-- Storage: initialize `media` bucket with mirrored policies from `images`
-- =============================================================================
-- Purpose:
--   1) Introduce `media` bucket as migration target without cutting over reads/writes.
--   2) Mirror security posture of `images` bucket (private + org/user prefix controls).
--   3) Keep current runtime behavior unchanged until app-side cutover phases.
--
-- Notes:
--   - This migration is intentionally additive and low-risk.
--   - Object data move is handled separately (API/script), not via SQL metadata copy.
-- =============================================================================

-- ── Bucket ────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  false,
  26214400,
  array[
    -- photos
    'image/jpeg',
    'image/png',
    'image/heic',
    'image/heif',
    'image/webp',
    'image/tiff',

    -- videos
    'video/mp4',
    'video/quicktime',
    'video/webm',

    -- documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.graphics',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',

    -- text and csv
    'text/plain',
    'text/csv',
    'application/csv'
  ]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ── Mirrored storage policies ────────────────────────────────────────────────

drop policy if exists "media: org members can upload" on storage.objects;
create policy "media: org members can upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = public.user_org_id()::text
  and (storage.foldername(name))[2] = auth.uid()::text
  and not public.is_viewer()
);

drop policy if exists "media: org members can read" on storage.objects;
create policy "media: org members can read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = public.user_org_id()::text
);

drop policy if exists "media: owner or admin can delete" on storage.objects;
create policy "media: owner or admin can delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = public.user_org_id()::text
  and (
    (storage.foldername(name))[2] = auth.uid()::text
    or public.is_admin()
  )
);
