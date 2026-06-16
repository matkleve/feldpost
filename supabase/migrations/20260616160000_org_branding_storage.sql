-- Organization branding assets (logo) — public read, org-scoped write.
-- @see docs/specs/page/organization-page.md

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'org-branding',
  'org-branding',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "org_branding_storage: org member read"
  on storage.objects for select to authenticated
  using (bucket_id = 'org-branding');

create policy "org_branding_storage: org member upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'org-branding'
    and (storage.foldername(name))[1] = public.user_org_id()::text
  );

create policy "org_branding_storage: org member update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'org-branding'
    and (storage.foldername(name))[1] = public.user_org_id()::text
  )
  with check (
    bucket_id = 'org-branding'
    and (storage.foldername(name))[1] = public.user_org_id()::text
  );

create policy "org_branding_storage: org member delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'org-branding'
    and (storage.foldername(name))[1] = public.user_org_id()::text
  );
