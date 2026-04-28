# Media Query Service

## What It Is

Loads **current user’s media items** from **`media_items`** for gallery-style surfaces (pagination, optional total count, project name map). Uses **`SupabaseService.client.auth.getUser()`**; returns empty result when unauthenticated.

## What It Looks Like

`/media` page and similar grids receive rows as **`ImageRecord`** (canonical list/grid DTO; see [List query DTO](#list-query-dto-imagerecord) below). Workspace detail UI re-exports the same type from feature types for convenience; the normative definition lives in **`apps/web/src/app/core/media-query/media-query.types.ts`**.

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
|- media-query.types.ts (ImageRecord + query row mapping)
`- SupabaseService → media_items, projects
```

## Data

| Table | Operation |
| --- | --- |
| `media_items` | Select with offset/limit; optional count |
| `projects` | Names for joined display (reserved for future name joins; `projectNameById` may be empty today) |

### List query DTO (`ImageRecord`)

Normative TypeScript: `apps/web/src/app/core/media-query/media-query.types.ts`. This is the shared row shape for **list-style** media queries (`loadCurrentUserMedia`) and grid/detail consumers; it is not the file-type registry (see [media types and file registry](../media/media-types-and-file-registry.md) for MIME/renderer contracts only).

| Field | Type | Nullability / notes |
| --- | --- | --- |
| `id` | string | Always set from row `id`. |
| `user_id` | string | From `created_by`; empty string when DB null. |
| `organization_id` | string \| null | From row. |
| `project_id` | string \| null | Not populated by list query today (`null`). |
| `project_ids` | string[] (optional) | Omitted by list query unless populated elsewhere. |
| `storage_path` | string \| null | From row. |
| `thumbnail_path` | string \| null | From row. |
| `latitude`, `longitude` | number \| null | From row. |
| `exif_latitude`, `exif_longitude` | number \| null | From row. |
| `captured_at` | string \| null | ISO from row. |
| `has_time` | boolean | `true` when `captured_at` is non-null. |
| `created_at` | string | ISO from row. |
| `address_label`, `street`, `city`, `district`, `country` | string \| null | Not populated by list query (`null`). |
| `direction` | number \| null | Not populated by list query (`null`). |
| `location_unresolved` | boolean \| null | Derived: `true` when `location_status` is `pending` or `no_gps`; otherwise `false` from mapper (see service). |

**`location_status` (read path):** Selected from `media_items` for mapping only; not part of `ImageRecord`. Legacy or extended enum values may appear on read; list mapper treats unknowns as not-unresolved except the branches above.

## State

None on service (stateless async API).

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/media-query/media-query.service.ts` | Facade |
| `apps/web/src/app/core/media-query/media-query.types.ts` | `ImageRecord` + canonical list DTO |
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
