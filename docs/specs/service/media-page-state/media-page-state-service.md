# Media Page State Service

**Status:** Service contract  
**Code:** `apps/web/src/app/core/media-page-state/`  
**Page:** [media-page.md](../../page/media-page.md)

## What It Is

Root-scoped **facade** for the `/media` gallery: one `WorkspaceMedia[]` snapshot per `querySignature` (user, project filter, sorts, groupings, filter rules). Storage and cross-shell event dispatch are delegated to [`RouteSessionCacheService`](route-session-cache-service.md) (`shellKey: 'media'`).

## Upload invalidation (cross-shell)

`RouteSessionCacheService` dispatches upload events. This facade registers `registerUploadActivityHandler('media', …)` (incremental patch) and `registerRevalidateHandler` (full fetch).

| Stream | Policy |
|--------|--------|
| `imageUploaded$` | **Incremental patch** when cache entry exists, payload has `mediaId`, and cached `querySignature` has **no** project filter (`projectIds` empty). Handler returns `true` → no `scheduleRevalidate`. Otherwise full revalidate. |
| `batchComplete$` | Full debounced revalidate |
| `imageReplaced$` | Full revalidate |
| `imageAttached$` | Full revalidate |

Patch builds minimal `WorkspaceMedia` via `workspaceMediaFromUploadEvent` / `patchMediaCacheItems` in `media-page-state-upload-patch.helpers.ts` (prepend new id; replace if already present; signature unchanged).

**Gate 7:** project-scoped gallery (`projectIds` non-empty in signature) → patch forbidden unless event carries matching `projectId` subset — falls back to `loadAllCurrentUserWorkspaceMedia()`.

Uploads on `/map` (or any shell) update cache **before** the user returns to `/media`.

Debounce: ~400ms per shell; `revalidating` (global OR across shells) reflects any in-flight revalidate.

## Delete / auth

| Stream | Policy |
|--------|--------|
| `MediaDeleteUndoService.mediaDeleted$` | Remove ids from cached snapshot |
| `MediaDeleteUndoService.mediaRestored$` | Invalidate cache (safe miss) |
| `AuthService.session` → null | `RouteSessionCacheService.invalidateAll()` (all shells) |

## API

| Method | Purpose |
|--------|---------|
| `lookup(inputs)` | Cache hit/miss for current query |
| `writeCache(inputs, mediaItems)` | Store snapshot after load |
| `scheduleRevalidate(inputs)` | Background refresh (debounced) |
| `invalidateActiveCache()` | Force miss for current media shell key |
| `revalidating` | Readonly signal while background revalidate runs |

## Acceptance

- [x] Cross-shell `batchComplete$` → revalidate without `MediaComponent` mounted (`media-page-state.service.spec.ts`).
- [x] Cross-shell `imageUploaded$` → incremental patch without `loadAll` when gate 7 allows.
- [x] Project-scoped signature + upload without `projectId` → full revalidate (gate 7).
- [x] `MediaComponent` cache-first wiring with upload invalidation verified.
