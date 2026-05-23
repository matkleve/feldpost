# ADR: Media preview converter (stub)

**Status:** Stub — converter choice TBD at merge (owner: Matthias)  
**Blocks:** Phase 4 implementation only; Phase 1–2 use locked names below.

## Locked schema (not TBD)

| Column | Table | Type | Values | Notes |
| --- | --- | --- | --- | --- |
| `preview_generation_status` | `media_items` | `text` check or enum | `'idle'`, `'pending'`, `'ready'`, `'failed'` | v2 async preview lifecycle |
| `thumbnail_path` | `media_items` | `text` | existing | One master raster per item; set when status → `ready` |

**Migration target:** `supabase/migrations/YYYYMMDDHHMMSS_media_preview_generation_status.sql`

## Master raster (storage)

| Property | Value |
| --- | --- |
| Bucket | `media` |
| Path pattern | `{org_id}/{user_id}/{uuid}_thumb.{webp\|jpg}` |
| Document/PDF spec | 512px long edge, WebP ~0.85, `contain`, neutral background |
| Photo spec (until glossary aligned) | 128×128 JPEG cover per glossary |

## Delivery when `preview_generation_status` is set (v2)

| Status | Grid delivery (no thumb yet) |
| --- | --- |
| `pending` | `loading` |
| `failed` | `icon-only` immediately |
| `ready` + `thumbnail_path` | `loaded` when signed URL available |

## TBD at ADR merge

- Converter: Gotenberg (self-hosted) vs CloudConvert vs dedicated worker — **not** Supabase Edge + LibreOffice
- Worker trigger (queue / webhook / post-upload enqueue)
- Cost / ops
