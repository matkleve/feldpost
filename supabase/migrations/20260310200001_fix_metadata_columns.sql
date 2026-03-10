-- Fix metadata table column names to match application code and docs.
-- Renames: metadata_keys.name → key_name, image_metadata.key_id → metadata_key_id,
-- image_metadata.value → value_text.
-- Adds missing UNIQUE constraint and UPDATE RLS policy.

-- ── Rename columns ────────────────────────────────────────────────────────────

alter table public.metadata_keys
  rename column name to key_name;

alter table public.image_metadata
  rename column key_id to metadata_key_id;

alter table public.image_metadata
  rename column value to value_text;

-- ── Add unique constraint on organization + key_name ──────────────────────────

alter table public.metadata_keys
  add constraint metadata_keys_org_key_name_unique
  unique (organization_id, key_name);

-- ── Add missing UPDATE policy for image_metadata ──────────────────────────────

create policy "image_metadata: org update"
  on public.image_metadata for update
  using (
    not public.is_viewer()
    and exists (
      select 1 from public.images i
      where i.id = image_id
        and i.organization_id = public.user_org_id()
    )
  )
  with check (
    not public.is_viewer()
    and exists (
      select 1 from public.images i
      where i.id = image_id
        and i.organization_id = public.user_org_id()
    )
  );
