# Workspace Selection Service

## What It Is

In-memory **multi-select** of **media ids** for workspace bulk actions (share, export, etc.). Supports additive toggle vs single-select replacement, clear, and select-all-in-scope.

## What It Looks Like

Selected rows show check counts in the workspace actions bar; map and grid keep selection in sync by calling the same service.

## Where It Lives

- **Route:** map + workspace + `/media` where bulk actions exist
- **Runtime module:** `apps/web/src/app/core/workspace-selection/`

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | Toggle with additive | Add/remove id from set | `toggle(id, { additive })` |
| 2 | Replace selection | Single id set | `setSingle(id)` |
| 3 | Select many | Replace with scope list | `selectAllInScope(scopeIds)` |
| 4 | Clear | Empty set | `clearSelection()` |
| 5 | Query membership | Boolean | `isSelected(id)` |

## Component Hierarchy

```text
WorkspaceSelectionService
|- workspace-selection.types.ts
`- adapters/ (reserved)
```

## Data

None persisted (transient UI state only).

## State

| Name | Type | Notes |
| --- | --- | --- |
| selectedMediaIds | `WritableSignal<Set<string>>` | Canonical selection |
| selectedCount | `Computed` | Size of set |

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/core/workspace-selection/workspace-selection.service.ts` | Facade |
| `docs/specs/service/workspace-selection/workspace-selection-service.md` | This contract |

## Wiring

None (leaf state service).

## Acceptance Criteria

- [ ] Additive toggle matches map multi-select UX contract.
- [ ] Non-additive toggle replaces selection per `toggle` implementation.
- [ ] Share/export flows read from this service only for selection ids.
