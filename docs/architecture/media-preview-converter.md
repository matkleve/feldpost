# ADR: Media preview converter

**Status:** Accepted (2026-05-23), revised for thumbnail worker (2026-05-23)  
**Owner:** Matthias (product/infra)

## Decision

| Topic | Choice |
| --- | --- |
| **Converter** | LibreOffice headless (`libreoffice-nogui`) + **sharp** / libvips (poppler for PDF input) |
| **Worker** | Node.js service [`worker/thumbnail`](../../worker/thumbnail/) — `POST /generate`, `GET /health` |
| **Trigger** | Supabase **Database Webhook** on `media_items` INSERT (filter below); manual `POST /generate` for local dev |
| **Output** | WebP master raster in `media` bucket → `thumbnail_path`; `preview_generation_status` → `ready` \| `failed` |
| **Deprecated** | Edge Function `generate-media-preview` + Gotenberg — reference/fallback only; **do not** dual-write; removal is a separate task |

## Locked schema

| Column | Table | Type | Values | Notes |
| --- | --- | --- | --- | --- |
| `preview_generation_status` | `media_items` | `text` check | `'idle'`, `'pending'`, `'ready'`, `'failed'` | Migration `20260523180000_media_preview_generation_status.sql` |
| `thumbnail_path` | `media_items` | `text` | existing | Master raster; set when status → `ready` |

## Master raster (storage)

| Property | Value |
| --- | --- |
| Bucket | `media` |
| Path pattern | `{org_id}/{user_id}/{stem}_thumb.webp` — `stem` = filename without extension from `storage_path` |
| Document spec | First page / slide; long edge 512px, WebP quality ~80, `fit: inside` |
| Photo spec | Client 128×128 JPEG per glossary — **worker does not generate** (webhook excludes `image/*`) |

## Pipeline (thumbnail worker)

1. Webhook or manual `POST /generate` with `{ mediaId, storagePath, mimeType, organizationId, userId }`.
2. Worker returns **202** immediately; generation runs async.
3. Idempotency: if `thumbnail_path` already set → no-op success.
4. `preview_generation_status = 'pending'`.
5. Download `storage_path` from `media` bucket.
6. Office mime/extension → LibreOffice headless → PDF bytes.
7. PDF mime/extension → use source bytes directly.
8. `sharp(pdf, { page: 0 }).resize(512, 512, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 })`.
9. Upload to `{org}/{user}/{stem}_thumb.webp`; UPDATE `thumbnail_path` + `ready`.
10. On error → `failed` + structured log.

## Environment (worker)

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase API |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage + row updates (server only) |
| `MEDIA_BUCKET_NAME` | Default `media` |
| `PORT` | HTTP port (default `3001`) |

Local: build/run per [`worker/thumbnail/README.md`](../../worker/thumbnail/README.md). Webhook from Supabase container should target `http://host.docker.internal:3001/generate`.

## Deprecated path (Edge + Gotenberg)

`supabase/functions/generate-media-preview` — superseded by `worker/thumbnail`. Not deleted in this ADR revision. Client enqueue may still call Edge until a follow-up removes it; **webhook + idempotent thumb guard** avoid duplicate writes.

Gotenberg compose under `supabase/gotenberg/` remains for historical local experiments only.

## Delivery when `preview_generation_status` is set

| Status | Grid delivery (no thumb yet) |
| --- | --- |
| `pending` | `loading` |
| `failed` | `icon-only` immediately |
| `ready` + `thumbnail_path` | `loaded` when signed URL available |

### Video (v1)

Webhook filter excludes `video/%`. Worker never runs. `preview_generation_status` stays **`idle`** (default). Grid uses existing non-image delivery (`icon-only` without thumb) — not `pending` / `failed`.

## Database webhook (manual apply)

Do not auto-apply in migrations. Configure in Supabase Dashboard → Database Webhooks:

```sql
-- Webhook: trigger thumbnail worker on non-image media insert
-- Table: media_items
-- Event: INSERT
-- Filter: thumbnail_path IS NULL
--   AND mime_type IS NOT NULL
--   AND mime_type NOT LIKE 'image/%'
--   AND mime_type NOT LIKE 'video/%'  -- v1: no server preview for video; status stays idle
-- URL: http://thumbnail-worker:3001/generate
--       (local: http://host.docker.internal:3001/generate)
-- Payload fields: id (as mediaId), storage_path, mime_type, organization_id, user_id
```

JSON body mapping (example):

```json
{
  "mediaId": "{{ record.id }}",
  "storagePath": "{{ record.storage_path }}",
  "mimeType": "{{ record.mime_type }}",
  "organizationId": "{{ record.organization_id }}",
  "userId": "{{ record.user_id }}"
}
```

## Out of scope

- CloudConvert / paid SaaS
- Grid retry loop for `failed` (terminal `icon-only` per product matrix)
- LibreOffice or sharp inside Supabase Edge runtime
- Removing Edge function or Gotenberg compose in this delivery
