# Unified Selection Service

## What It Is

Application-wide **media id multi-select** facade. Map markers, `/media`, and the selected items panel (`download`) read and write the same `selectedMediaIds` set when `shellGridLayout` is on.

## What It Looks Like

No dedicated UI. Selection count and styling follow from consumers (map markers, media tiles, panel grid footer).

## Where It Lives

- **Runtime module:** `apps/web/src/app/core/unified-selection/`
- **Delegates to:** `WorkspaceSelectionService` (same signal store until PR 7 removes legacy naming)

## Actions

| # | Trigger | System response | Contract |
| --- | --- | --- | --- |
| 1 | Toggle with additive | Add/remove id | `toggle(id, { additive })` |
| 2 | Replace selection | Single id set | `setSingle(id)` |
| 3 | Select many | Replace with scope list | `selectAllInScope(scopeIds)` |
| 4 | Clear | Empty set | `clearSelection()` |
| 5 | Query membership | Boolean | `isSelected(id)` |
| 6 | Grid pointer | Shift/ctrl/meta semantics | `applyGridPointerSelection(...)` |

## Component Hierarchy

```text
UnifiedSelectionService (facade)
├── unified-selection.types.ts
└── delegates → WorkspaceSelectionService
```

## Data

| Field | Type | Notes |
| --- | --- | --- |
| selectedMediaIds | `ReadonlySignal<Set<string>>` | Single source of truth |
| selectedCount | `Computed<number>` | Size of set |

## State

**Idempotency:** `toggle`/`deselect` on absent id is a no-op. Terminal rest state is empty set.

## File Map

| File | Purpose |
| --- | --- |
| `unified-selection.service.ts` | Facade |
| `unified-selection.service.spec.ts` | Mirror contract tests |
| `docs/specs/service/unified-selection/unified-selection.md` | This contract |

## Acceptance Criteria

- [x] Facade delegates to one store; panel toggle updates map selection signal.
- [x] Red test documents forbidden dual-store divergence.
- [ ] PR 7: rename/remove `WorkspaceSelectionService` export surface when legacy path deleted.
