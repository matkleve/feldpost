# Media Query Service

## What It Is

Loads **current user’s media items** from **`media_items`** for gallery-style surfaces (pagination, optional total count, project name map). Uses **`SupabaseService.client.auth.getUser()`**; returns empty result when unauthenticated.

## What It Looks Like

`/media` page and similar grids receive rows mapped to the workspace **`ImageRecord`** / media DTO shape expected by grid components.

## Where It Lives

- **Route:** primarily `/media` and related consumers
- **Runtime module:** `apps/web/src/app/core/media-query/`

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | Consumer requests page of media | Rows + optional count + project names | `loadCurrentUserMedia(options?)` |

## Component Hierarchy

```text
MediaQueryService
|- (inline row types)
`- SupabaseService → media_items, projects
```

## Data

| Table | Operation |
| --- | --- |
| `media_items` | Select with offset/limit; optional count |
| `projects` | Names for joined display |

## State

None on service (stateless async API).

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/media-query/media-query.service.ts` | Facade |
| `docs/specs/service/media-query/media-query-service.md` | This contract |

## Wiring

### Injected services

- `SupabaseService`

### Notes

- `location_status` may include legacy values on read; consumers normalize per workspace pipeline spec.

## Acceptance Criteria

- [ ] Queries scoped to authenticated user / RLS as enforced by Supabase.
- [ ] Pagination defaults documented (`limit` floor, offset clamp).
- [ ] `media-page` spec links here for data loading.
