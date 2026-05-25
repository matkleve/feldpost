# Media Page State Service

**Status:** Service contract  
**Code:** `apps/web/src/app/core/media-page-state/`  
**Page:** [media-page.md](../../page/media-page.md)

## What It Is

Root-scoped session cache for the `/media` gallery: one `WorkspaceMedia[]` snapshot per `querySignature` (user, project filter, sorts, groupings, filter rules).

## Upload invalidation (cross-shell)

`MediaPageStateService` subscribes in its constructor to `UploadManagerService` (`providedIn: 'root'`):

| Stream | Policy |
|--------|--------|
| `batchComplete$` | Debounced revalidate for active cache signature |
| `imageUploaded$` | Same |
| `imageReplaced$` | Same |
| `imageAttached$` | Same |

Uploads on `/map` (or any shell) update or refresh cache **before** the user returns to `/media`, so a cache hit is not stale.

Debounce: ~400ms; `revalidatingInProgress` prevents parallel revalidates for the same signature.

## Delete / auth

| Stream | Policy |
|--------|--------|
| `MediaDeleteUndoService.mediaDeleted$` | Remove ids from cached snapshot |
| `MediaDeleteUndoService.mediaRestored$` | Invalidate cache (safe miss) |
| `AuthService.session` → null | `clearAll()` |

## API

| Method | Purpose |
|--------|---------|
| `lookup(inputs)` | Cache hit/miss for current query |
| `writeCache(inputs, mediaItems)` | Store snapshot after load |
| `scheduleRevalidate(inputs)` | Background refresh (debounced) |
| `invalidateActiveCache()` | Force miss |
| `clearAll()` | Logout |

## Acceptance

- [ ] Service spec includes cross-shell upload → revalidate without `MediaComponent` mounted.
- [ ] `MediaComponent` does not wire cache-first until upload subscription is verified.
