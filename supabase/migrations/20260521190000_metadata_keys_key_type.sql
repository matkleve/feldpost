-- Add key_type to metadata_keys and enforce uniqueness on (organization_id, key_name, key_type).
-- @see docs/specs/service/metadata/metadata-service.md

alter table public.metadata_keys
  add column if not exists key_type text not null default 'text';

alter table public.metadata_keys
  drop constraint if exists metadata_keys_key_type_check;

alter table public.metadata_keys
  add constraint metadata_keys_key_type_check
  check (key_type in ('text', 'number', 'date', 'select', 'checkbox'));

update public.metadata_keys
set key_type = 'text'
where key_type is null or key_type = '';

alter table public.metadata_keys
  drop constraint if exists metadata_keys_org_key_name_unique;

alter table public.metadata_keys
  add constraint metadata_keys_org_key_name_key_type_unique
  unique (organization_id, key_name, key_type);
