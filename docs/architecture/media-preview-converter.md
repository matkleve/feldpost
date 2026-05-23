# ADR: Media preview converter

**Status:** Accepted (2026-05-23)  
**Owner:** Matthias (product/infra)

## Decision

| Topic | Choice |
| --- | --- |
| **Converter** | [Gotenberg](https://gotenberg.dev/) 8 (self-hosted HTTP API, LibreOffice inside Gotenberg — **not** bundled in Supabase Edge) |
| **Worker** | Supabase Edge Function `generate-media-preview` |
| **Trigger** | Client `POST` after upload finalize for Office types; grid enqueue when `idle` + no `thumbnail_path` |
| **Output** | PNG master raster in `media` bucket → `thumbnail_path`; `preview_generation_status` → `ready` \| `failed` |

## Locked schema

| Column | Table | Type | Values | Notes |
| --- | --- | --- | --- | --- |
| `preview_generation_status` | `media_items` | `text` check | `'idle'`, `'pending'`, `'ready'`, `'failed'` | Migration `20260523180000_media_preview_generation_status.sql` |
| `thumbnail_path` | `media_items` | `text` | existing | Master raster; set when status → `ready` |

## Master raster (storage)

| Property | Value |
| --- | --- |
| Bucket | `media` |
| Path pattern | `{org_id}/{user_id}/{uuid}_thumb.png` (Office server path; client PDF may use `.webp`) |
| Document spec | First page / slide; long edge 512px equivalent via Gotenberg PNG export |
| Photo spec | Unchanged: client 128×128 JPEG per glossary |

## Pipeline

1. Client sets `preview_generation_status = 'pending'` (org-scoped RLS update).
2. Edge Function verifies JWT + row access, downloads `storage_path`, calls Gotenberg:
   - `POST /forms/libreoffice/convert` → PDF (page 1 via `nativePageRanges=1`)
   - Gotenberg Chromium `screenshot/html` + pdf.js in-page → PNG (Edge has no native canvas)
3. Edge uploads PNG to `thumbnail_path`, sets `ready`.
4. On any error (missing `GOTENBERG_URL`, timeout, convert failure): `failed`.
5. Grid: Realtime + `MediaDownloadService.invalidate`; delivery matrix v2 rows.

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `GOTENBERG_URL` | Edge Function secret | e.g. `http://host.docker.internal:3000` local, internal URL in prod |
| `SUPABASE_SERVICE_ROLE_KEY` | Edge (auto) | Storage upload + status updates after auth check |

Local: `docker compose -f supabase/gotenberg/docker-compose.yml up -d` then  
`supabase secrets set GOTENBERG_URL=http://host.docker.internal:3000`

## Out of scope

- CloudConvert / paid SaaS (revisit if Gotenberg ops burden is too high)
- Grid retry loop for `failed` (terminal `icon-only` per product matrix)
- LibreOffice inside Edge runtime

## Delivery when `preview_generation_status` is set

| Status | Grid delivery (no thumb yet) |
| --- | --- |
| `pending` | `loading` |
| `failed` | `icon-only` immediately |
| `ready` + `thumbnail_path` | `loaded` when signed URL available |
