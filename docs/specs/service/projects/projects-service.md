# Projects Service

## What It Is

**Project CRUD**, color, archive/restore/delete, **workspace image lists** scoped to a project, and **media ↔ project membership** mutations. All I/O via **`SupabaseService`** against `projects`, `media_projects`, and related selects.

## What It Looks Like

Projects page, project details, and workspace project dropdowns load list items, counts, and scoped media through this facade.

## Where It Lives

- **Route:** `/projects`, workspace project controls, map project context
- **Runtime module:** `apps/web/src/app/core/projects/`

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | Load project list | `ProjectListItem[]` | `loadProjects()` |
| 2 | Grouped search counts | `ProjectSearchCounts` | `loadGroupedSearchCounts(...)` |
| 3 | Create / rename / archive / restore / delete | booleans or row | CRUD methods |
| 4 | Set color | boolean | `setProjectColor` |
| 5 | Load workspace images for project | scoped DTOs | `loadProjectWorkspaceImages` |
| 6 | Membership queries / mutations | ids or boolean | `loadMediaProjectMemberships`, `addMediaToProject`, `removeMediaFromProject` |

## Component Hierarchy

```text
ProjectsService
|- projects.types.ts
|- projects.helpers.ts
`- adapters/ (reserved)
SupabaseService
```

## Data

| Tables | Notes |
| --- | --- |
| `projects`, `media_projects`, `media_items` | As used in service queries |

### Deprecated columns

| Column | Policy |
| --- | --- |
| `projects.location_required` | Retained in DB only. **Must not** be read or written by the frontend. Upload location policy is owned by the [upload panel](../../component/upload/upload-panel.md) (`locationRequirementMode`), not projects. See [deprecated-schema.md](../../../architecture/deprecated-schema.md). |

**Out of scope for this service:** upload location routing, geocoding, or Auto location toggle defaults.

## State

None on facade (async methods + pure helpers).

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/projects/projects.service.ts` | Facade |
| `docs/specs/service/projects/projects-service.md` | This contract |

## Wiring

### Injected services

- `SupabaseService`

## Acceptance Criteria

- [ ] Public method names match runtime service.
- [ ] Media ids in membership APIs are **media_items.id** semantics.
- [ ] `projects-page` / `project-details-view` specs link here for data orchestration.
