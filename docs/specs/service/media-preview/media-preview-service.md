# Media Preview Service

## What It Is

Browser-only **local preview URL** factory for upload lanes: immediate **`blob:`** URLs for common images, **deferred** PDF first-page rasterization, **HEIC/HEIF** deferred (no object URL until conversion elsewhere). Never touches Supabase.

## What It Looks Like

Upload file rows show inline thumbnails when `createImmediatePreviewUrl` returns a string; PDFs and HEIC show placeholder until deferred path resolves.

## Where It Lives

- **Route:** upload panel / upload manager UI
- **Runtime module:** `apps/web/src/app/core/media-preview/`

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | Non-HEIC image file | `blob:` URL or undefined | `createImmediatePreviewUrl(file)` |
| 2 | PDF selected | WebP `blob:` from first page or undefined | `createDeferredPreviewUrl(file)` |
| 3 | HEIC/HEIF | undefined (immediate) | MIME + extension check |

## Component Hierarchy

```text
MediaPreviewService (stateless)
`- dynamic import pdfjs-dist for PDF path only
```

## Data

None (local `File` only).

## State

None.

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/media-preview/media-preview.service.ts` | Facade |
| `docs/specs/service/media-preview/media-preview-service.md` | This contract |

## Wiring

### Forbidden

- No storage signing; use **`MediaDownloadService`** for server-backed media.

## Acceptance Criteria

- [ ] HEIC does not receive premature object URLs.
- [ ] PDF path destroys document and handles canvas failures without throwing to consumers.
- [ ] Upload pipeline specs reference this service for preview tier only.
