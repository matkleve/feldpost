# Database Schema Documentation

This document describes the active Feldpost runtime schema (auth + public) after the media-era cutover.

- Detailed per-column audit (type/null/default/constraints/index/FK/source/gap): `docs/audits/schema-audit-2026-04-11.md`
- Security model and RLS boundary: `docs/security-boundaries.md`
- Role behavior: `docs/playbooks/security/role-permissions.md`

## Runtime Scope

Active runtime tables covered in this document:

- auth.users
- public.organizations
- public.profiles
- public.roles
- public.user_roles
- public.projects
- public.media_items
- public.media_projects
- public.project_sections
- public.project_section_items
- public.metadata_keys
- public.media_metadata
- public.coordinate_corrections
- public.dedup_hashes
- public.share_sets
- public.share_set_items
- public.qr_invites
- public.invite_share_events
- public.app_texts
- public.app_text_translations
- public.storage_cleanup_runs

Legacy image-era tables are removed from runtime schema:

- public.images
- public.image_projects
- public.saved_groups
- public.saved_group_images

## Column Catalog (Full Coverage)

### auth.users

| column     | type        | null/default           | spec reference(s)                                          |
| ---------- | ----------- | ---------------------- | ---------------------------------------------------------- |
| id         | uuid        | not null               | docs/specs/ui/settings-overlay/invite-only-registration.md |
| email      | text        | not null               | docs/specs/ui/settings-overlay/invite-only-registration.md |
| created_at | timestamptz | not null/default now() | docs/specs/ui/settings-overlay/invite-only-registration.md |

### public.organizations

| column     | type        | null/default                       | spec reference(s)                |
| ---------- | ----------- | ---------------------------------- | -------------------------------- |
| id         | uuid        | not null/default gen_random_uuid() | docs/specs/page/projects-page.md |
| name       | text        | not null                           | docs/specs/page/projects-page.md |
| created_at | timestamptz | not null/default now()             | docs/specs/page/projects-page.md |

### public.profiles

| column          | type        | null/default           | spec reference(s)                                          |
| --------------- | ----------- | ---------------------- | ---------------------------------------------------------- |
| id              | uuid        | not null               | docs/specs/ui/settings-overlay/invite-only-registration.md |
| organization_id | uuid        | not null               | docs/specs/ui/settings-overlay/invite-only-registration.md |
| full_name       | text        | nullable               | docs/specs/ui/settings-overlay/invite-only-registration.md |
| avatar_url      | text        | nullable               | docs/specs/ui/settings-overlay/invite-only-registration.md |
| created_at      | timestamptz | not null/default now() | docs/specs/ui/settings-overlay/invite-only-registration.md |
| updated_at      | timestamptz | not null/default now() | docs/specs/ui/settings-overlay/invite-only-registration.md |

### public.roles

| column | type | null/default                       | spec reference(s)                                          |
| ------ | ---- | ---------------------------------- | ---------------------------------------------------------- |
| id     | uuid | not null/default gen_random_uuid() | docs/specs/ui/settings-overlay/invite-only-registration.md |
| name   | text | not null                           | docs/specs/ui/settings-overlay/invite-only-registration.md |

### public.user_roles

| column  | type | null/default                       | spec reference(s)                                          |
| ------- | ---- | ---------------------------------- | ---------------------------------------------------------- |
| id      | uuid | not null/default gen_random_uuid() | docs/specs/ui/settings-overlay/invite-only-registration.md |
| user_id | uuid | not null                           | docs/specs/ui/settings-overlay/invite-only-registration.md |
| role_id | uuid | not null                           | docs/specs/ui/settings-overlay/invite-only-registration.md |

### public.projects

| column          | type        | null/default                       | spec reference(s)                |
| --------------- | ----------- | ---------------------------------- | -------------------------------- |
| id              | uuid        | not null/default gen_random_uuid() | docs/specs/page/projects-page.md |
| organization_id | uuid        | not null                           | docs/specs/page/projects-page.md |
| created_by      | uuid        | nullable                           | docs/specs/page/projects-page.md |
| name            | text        | not null                           | docs/specs/page/projects-page.md |
| description     | text        | nullable                           | docs/specs/page/projects-page.md |
| created_at      | timestamptz | not null/default now()             | docs/specs/page/projects-page.md |
| updated_at      | timestamptz | not null/default now()             | docs/specs/page/projects-page.md |
| archived_at     | timestamptz | nullable                           | docs/specs/page/projects-page.md |
| color_key       | text        | not null/default 'clay'            | docs/specs/page/projects-page.md |

### public.media_items

| column                 | type                  | null/default                       | spec reference(s)                                                                                                           |
| ---------------------- | --------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| id                     | uuid                  | not null/default gen_random_uuid() | docs/specs/ui/workspace/workspace-view-system.md; docs/specs/service/media-upload-service/upload-manager-pipeline.md        |
| organization_id        | uuid                  | not null                           | docs/specs/ui/workspace/workspace-view-system.md                                                                            |
| created_by             | uuid                  | nullable                           | docs/specs/ui/workspace/workspace-view-system.md                                                                            |
| media_type             | text                  | not null                           | docs/specs/service/media-upload-service/upload-manager-pipeline.md                                                          |
| mime_type              | text                  | nullable                           | docs/specs/service/media-upload-service/upload-manager-pipeline.md                                                          |
| storage_path           | text                  | nullable                           | docs/specs/ui/media-detail/media-detail-media-viewer.md; docs/specs/service/media-upload-service/upload-manager-pipeline.md |
| thumbnail_path         | text                  | nullable                           | docs/specs/ui/media-detail/media-detail-media-viewer.md                                                                     |
| poster_path            | text                  | nullable                           | docs/specs/ui/media-detail/media-detail-media-viewer.md                                                                     |
| file_name              | text                  | nullable                           | docs/specs/service/media-upload-service/upload-manager-pipeline.md                                                          |
| file_size_bytes        | bigint                | nullable                           | docs/specs/service/media-upload-service/upload-manager-pipeline.md                                                          |
| captured_at            | timestamptz           | nullable                           | docs/specs/ui/workspace/workspace-view-system.md                                                                            |
| duration_ms            | integer               | nullable                           | docs/specs/service/media-upload-service/upload-manager-pipeline.md                                                          |
| page_count             | integer               | nullable                           | docs/specs/service/media-upload-service/upload-manager-pipeline.md                                                          |
| exif_latitude          | numeric(10,7)         | nullable                           | docs/specs/ui/media-marker/media-marker.md                                                                                  |
| exif_longitude         | numeric(11,7)         | nullable                           | docs/specs/ui/media-marker/media-marker.md                                                                                  |
| latitude               | numeric(10,7)         | nullable                           | docs/specs/ui/media-marker/media-marker.md                                                                                  |
| longitude              | numeric(11,7)         | nullable                           | docs/specs/ui/media-marker/media-marker.md                                                                                  |
| geog                   | geography(Point,4326) | nullable                           | docs/specs/ui/media-marker/media-marker.md                                                                                  |
| location_status        | text                  | not null                           | docs/specs/service/media-upload-service/upload-manager-pipeline.md                                                          |
| gps_assignment_allowed | boolean               | not null/default true              | docs/specs/service/media-upload-service/upload-manager-pipeline.md                                                          |
| source_image_id        | uuid                  | nullable                           | docs/specs/ui/workspace/workspace-view-system.md                                                                            |
| created_at             | timestamptz           | not null/default now()             | docs/specs/ui/workspace/workspace-view-system.md                                                                            |
| updated_at             | timestamptz           | not null/default now()             | docs/specs/ui/workspace/workspace-view-system.md                                                                            |
| address_label          | text                  | nullable                           | docs/specs/ui/search-bar/search-bar-data-and-service.md                                                                     |
| street                 | text                  | nullable                           | docs/specs/service/workspace-view/workspace-view-system.md                                                                  |
| city                   | text                  | nullable                           | docs/specs/service/workspace-view/workspace-view-system.md                                                                  |
| district               | text                  | nullable                           | docs/specs/service/workspace-view/workspace-view-system.md                                                                  |
| country                | text                  | nullable                           | docs/specs/service/workspace-view/workspace-view-system.md                                                                  |

#### location_status contract migration (spec-first)

- Canonical values (target): `pending` | `resolved` | `unresolvable`.
- Legacy values (deprecated): `gps` | `no_gps` | `unresolved`.
- Migration contract:
  - Existing rows with legacy values must be mapped before legacy removal.
  - New writes must use canonical values only.
  - Read models may temporarily normalize legacy values during rollout.
- Semantic mapping for transition period:
  - `gps` -> `resolved`
  - `no_gps` -> `pending`
  - `unresolved` -> `unresolvable`

### public.media_projects

| column        | type        | null/default           | spec reference(s)                                                                  |
| ------------- | ----------- | ---------------------- | ---------------------------------------------------------------------------------- |
| media_item_id | uuid        | not null               | docs/specs/page/projects-page.md; docs/specs/ui/workspace/workspace-actions-bar.md |
| project_id    | uuid        | not null               | docs/specs/page/projects-page.md; docs/specs/ui/workspace/workspace-actions-bar.md |
| created_at    | timestamptz | not null/default now() | docs/specs/page/projects-page.md                                                   |

### public.project_sections

| column          | type        | null/default                       | spec reference(s)                |
| --------------- | ----------- | ---------------------------------- | -------------------------------- |
| id              | uuid        | not null/default gen_random_uuid() | docs/specs/page/projects-page.md |
| organization_id | uuid        | not null                           | docs/specs/page/projects-page.md |
| project_id      | uuid        | not null                           | docs/specs/page/projects-page.md |
| name            | text        | not null                           | docs/specs/page/projects-page.md |
| sort_order      | integer     | not null/default 0                 | docs/specs/page/projects-page.md |
| archived_at     | timestamptz | nullable                           | docs/specs/page/projects-page.md |
| created_by      | uuid        | nullable                           | docs/specs/page/projects-page.md |
| created_at      | timestamptz | not null/default now()             | docs/specs/page/projects-page.md |
| updated_at      | timestamptz | not null/default now()             | docs/specs/page/projects-page.md |

### public.project_section_items

| column        | type        | null/default           | spec reference(s)                |
| ------------- | ----------- | ---------------------- | -------------------------------- |
| section_id    | uuid        | not null               | docs/specs/page/projects-page.md |
| media_item_id | uuid        | not null               | docs/specs/page/projects-page.md |
| sort_order    | integer     | not null/default 0     | docs/specs/page/projects-page.md |
| created_at    | timestamptz | not null/default now() | docs/specs/page/projects-page.md |

### public.metadata_keys

| column          | type        | null/default                       | spec reference(s)                      |
| --------------- | ----------- | ---------------------------------- | -------------------------------------- |
| id              | uuid        | not null/default gen_random_uuid() | docs/specs/service/metadata-service.md |
| organization_id | uuid        | not null                           | docs/specs/service/metadata-service.md |
| created_by      | uuid        | nullable                           | docs/specs/service/metadata-service.md |
| key_name        | text        | not null                           | docs/specs/service/metadata-service.md |
| created_at      | timestamptz | not null/default now()             | docs/specs/service/metadata-service.md |

### public.media_metadata

| column          | type        | null/default                       | spec reference(s)                      |
| --------------- | ----------- | ---------------------------------- | -------------------------------------- |
| id              | uuid        | not null/default gen_random_uuid() | docs/specs/service/metadata-service.md |
| media_item_id   | uuid        | not null                           | docs/specs/service/metadata-service.md |
| metadata_key_id | uuid        | not null                           | docs/specs/service/metadata-service.md |
| value_text      | text        | not null                           | docs/specs/service/metadata-service.md |
| created_at      | timestamptz | not null/default now()             | docs/specs/service/metadata-service.md |

### public.coordinate_corrections

| column        | type          | null/default                       | spec reference(s)                          |
| ------------- | ------------- | ---------------------------------- | ------------------------------------------ |
| id            | uuid          | not null/default gen_random_uuid() | docs/specs/ui/media-marker/media-marker.md |
| media_item_id | uuid          | not null                           | docs/specs/ui/media-marker/media-marker.md |
| corrected_by  | uuid          | nullable                           | docs/specs/ui/media-marker/media-marker.md |
| old_latitude  | numeric(10,7) | nullable                           | docs/specs/ui/media-marker/media-marker.md |
| old_longitude | numeric(11,7) | nullable                           | docs/specs/ui/media-marker/media-marker.md |
| new_latitude  | numeric(10,7) | not null                           | docs/specs/ui/media-marker/media-marker.md |
| new_longitude | numeric(11,7) | not null                           | docs/specs/ui/media-marker/media-marker.md |
| corrected_at  | timestamptz   | not null/default now()             | docs/specs/ui/media-marker/media-marker.md |

### public.dedup_hashes

| column        | type        | null/default                       | spec reference(s)                                                  |
| ------------- | ----------- | ---------------------------------- | ------------------------------------------------------------------ |
| id            | uuid        | not null/default gen_random_uuid() | docs/specs/service/media-upload-service/upload-manager-pipeline.md |
| user_id       | uuid        | not null                           | docs/specs/service/media-upload-service/upload-manager-pipeline.md |
| media_item_id | uuid        | not null                           | docs/specs/service/media-upload-service/upload-manager-pipeline.md |
| content_hash  | text        | not null                           | docs/specs/service/media-upload-service/upload-manager-pipeline.md |
| created_at    | timestamptz | not null/default now()             | docs/specs/service/media-upload-service/upload-manager-pipeline.md |

### public.share_sets

| column          | type        | null/default                       | spec reference(s)                                |
| --------------- | ----------- | ---------------------------------- | ------------------------------------------------ |
| id              | uuid        | not null/default gen_random_uuid() | docs/specs/ui/workspace/workspace-actions-bar.md |
| organization_id | uuid        | not null                           | docs/specs/ui/workspace/workspace-actions-bar.md |
| created_by      | uuid        | nullable                           | docs/specs/ui/workspace/workspace-actions-bar.md |
| token_hash      | text        | not null                           | docs/specs/ui/workspace/workspace-actions-bar.md |
| token_hash_algo | text        | not null/default 'sha256'          | docs/specs/ui/workspace/workspace-actions-bar.md |
| token_prefix    | text        | not null                           | docs/specs/ui/workspace/workspace-actions-bar.md |
| fingerprint     | text        | not null                           | docs/specs/ui/workspace/workspace-actions-bar.md |
| expires_at      | timestamptz | nullable                           | docs/specs/ui/workspace/workspace-actions-bar.md |
| revoked_at      | timestamptz | nullable                           | docs/specs/ui/workspace/workspace-actions-bar.md |
| created_at      | timestamptz | not null/default now()             | docs/specs/ui/workspace/workspace-actions-bar.md |

### public.share_set_items

| column        | type        | null/default           | spec reference(s)                                |
| ------------- | ----------- | ---------------------- | ------------------------------------------------ |
| share_set_id  | uuid        | not null               | docs/specs/ui/workspace/workspace-actions-bar.md |
| media_item_id | uuid        | not null               | docs/specs/ui/workspace/workspace-actions-bar.md |
| item_order    | int         | not null               | docs/specs/ui/workspace/workspace-actions-bar.md |
| created_at    | timestamptz | not null/default now() | docs/specs/ui/workspace/workspace-actions-bar.md |

### public.qr_invites

| column           | type        | null/default                       | spec reference(s)                                          |
| ---------------- | ----------- | ---------------------------------- | ---------------------------------------------------------- |
| id               | uuid        | not null/default gen_random_uuid() | docs/specs/ui/settings-overlay/qr-invite-flow.md           |
| organization_id  | uuid        | not null                           | docs/specs/ui/settings-overlay/qr-invite-flow.md           |
| created_by       | uuid        | not null                           | docs/specs/ui/settings-overlay/qr-invite-flow.md           |
| target_role      | text        | not null                           | docs/specs/ui/settings-overlay/qr-invite-flow.md           |
| invite_url       | text        | not null                           | docs/specs/ui/settings-overlay/qr-invite-flow.md           |
| qr_payload       | text        | not null                           | docs/specs/ui/settings-overlay/qr-invite-flow.md           |
| token_hash       | text        | not null                           | docs/specs/ui/settings-overlay/qr-invite-flow.md           |
| status           | text        | not null/default 'active'          | docs/specs/ui/settings-overlay/qr-invite-flow.md           |
| expires_at       | timestamptz | not null/default now()+7d          | docs/specs/ui/settings-overlay/qr-invite-flow.md           |
| accepted_at      | timestamptz | nullable                           | docs/specs/ui/settings-overlay/invite-only-registration.md |
| accepted_user_id | uuid        | nullable                           | docs/specs/ui/settings-overlay/invite-only-registration.md |
| created_at       | timestamptz | not null/default now()             | docs/specs/ui/settings-overlay/qr-invite-flow.md           |
| updated_at       | timestamptz | not null/default now()             | docs/specs/ui/settings-overlay/qr-invite-flow.md           |

### public.invite_share_events

| column        | type        | null/default                       | spec reference(s)                                |
| ------------- | ----------- | ---------------------------------- | ------------------------------------------------ |
| id            | uuid        | not null/default gen_random_uuid() | docs/specs/ui/settings-overlay/qr-invite-flow.md |
| invite_id     | uuid        | not null                           | docs/specs/ui/settings-overlay/qr-invite-flow.md |
| actor_user_id | uuid        | not null                           | docs/specs/ui/settings-overlay/qr-invite-flow.md |
| channel       | text        | not null                           | docs/specs/ui/settings-overlay/qr-invite-flow.md |
| created_at    | timestamptz | not null/default now()             | docs/specs/ui/settings-overlay/qr-invite-flow.md |

### public.app_texts

| column          | type           | null/default                       | spec reference(s)                                          |
| --------------- | -------------- | ---------------------------------- | ---------------------------------------------------------- |
| id              | uuid           | not null/default gen_random_uuid() | docs/specs/ui/settings-overlay/language-locale-settings.md |
| organization_id | uuid           | nullable                           | docs/specs/ui/settings-overlay/language-locale-settings.md |
| key             | text           | not null                           | docs/specs/ui/settings-overlay/language-locale-settings.md |
| source_text     | text           | not null                           | docs/specs/ui/settings-overlay/language-locale-settings.md |
| source_lang     | text           | not null/default 'en'              | docs/specs/ui/settings-overlay/language-locale-settings.md |
| context         | text           | nullable                           | docs/specs/ui/settings-overlay/language-locale-settings.md |
| created_by      | uuid           | nullable                           | docs/specs/ui/settings-overlay/language-locale-settings.md |
| created_at      | timestamptz    | not null/default now()             | docs/specs/ui/settings-overlay/language-locale-settings.md |
| updated_at      | timestamptz    | not null/default now()             | docs/specs/ui/settings-overlay/language-locale-settings.md |
| scope_key       | generated text | generated stored                   | docs/specs/ui/settings-overlay/language-locale-settings.md |

### public.app_text_translations

| column          | type        | null/default                       | spec reference(s)                                          |
| --------------- | ----------- | ---------------------------------- | ---------------------------------------------------------- |
| id              | uuid        | not null/default gen_random_uuid() | docs/specs/ui/settings-overlay/language-locale-settings.md |
| app_text_id     | uuid        | not null                           | docs/specs/ui/settings-overlay/language-locale-settings.md |
| lang            | text        | not null                           | docs/specs/ui/settings-overlay/language-locale-settings.md |
| translated_text | text        | not null                           | docs/specs/ui/settings-overlay/language-locale-settings.md |
| status          | text        | not null/default 'published'       | docs/specs/ui/settings-overlay/language-locale-settings.md |
| created_by      | uuid        | nullable                           | docs/specs/ui/settings-overlay/language-locale-settings.md |
| created_at      | timestamptz | not null/default now()             | docs/specs/ui/settings-overlay/language-locale-settings.md |
| updated_at      | timestamptz | not null/default now()             | docs/specs/ui/settings-overlay/language-locale-settings.md |

### public.storage_cleanup_runs

| column        | type            | null/default               | spec reference(s)                                                  |
| ------------- | --------------- | -------------------------- | ------------------------------------------------------------------ |
| id            | bigint identity | not null/generated always  | docs/specs/service/media-upload-service/upload-manager-pipeline.md |
| started_at    | timestamptz     | not null/default now()     | docs/specs/service/media-upload-service/upload-manager-pipeline.md |
| finished_at   | timestamptz     | nullable                   | docs/specs/service/media-upload-service/upload-manager-pipeline.md |
| deleted_count | int             | not null/default 0         | docs/specs/service/media-upload-service/upload-manager-pipeline.md |
| status        | text            | not null/default 'started' | docs/specs/service/media-upload-service/upload-manager-pipeline.md |
| error_message | text            | nullable                   | docs/specs/service/media-upload-service/upload-manager-pipeline.md |

## Legacy Contract Notes

- `media_items.source_image_id` remains a compatibility column.
- RPC payload fields such as `image_id` are still emitted by selected compatibility RPCs and are not treated as blockers.
- Old image-era table names in archive files are archive-only references and out of runtime scope.
