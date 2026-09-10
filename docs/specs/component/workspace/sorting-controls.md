# Sorting Controls (workspace)

> **Parent:** [workspace-toolbar.md](../../ui/workspace/workspace-toolbar.md)

## What It Is

Compact control in the workspace toolbar for choosing sort field and direction, feeding `WorkspaceViewService.activeSort`. Implemented by `SortDropdownComponent` embedded in `WorkspaceToolbarComponent` (standalone `SortingControlsComponent` removed 2026-05).

## What It Looks Like

Label or icon affordance with popover/dropdown pattern consistent with other toolbar ghost controls; shows current sort field and direction.

## Where It Lives

- **Code:** `apps/web/src/app/shared/dropdown-trigger/sort/sort-dropdown.component.ts`
- **Parent:** `WorkspaceToolbarComponent`

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Changes sort field | Updates `activeSort` in `WorkspaceViewService` | UI change |
| 2 | Toggles direction | Flips asc/desc | Toggle |

## Component Hierarchy

```
WorkspaceToolbar
└── SortDropdownComponent
```

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Control cluster | `app-sort-dropdown` host | dropdown shell | trigger + menu items | sort dropdown BEM | content | sort updates service |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| Sort affordance | trigger | activeSort binding | trigger + menu | partial |

## Data

| Source | Contract |
| --- | --- |
| `WorkspaceViewService` | Read/write `activeSort` / `activeSorts` |

## State

Signal-driven; dropdown open state owned by `SortDropdownComponent` + toolbar `activeDropdown`.

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/dropdown-trigger/sort/sort-dropdown.component.ts` | Sort dropdown component |
| `apps/web/src/app/shared/dropdown-trigger/sort/sort-dropdown.component.scss` | Styles |

## Wiring

- Embedded in workspace toolbar template alongside filter/group/project controls.

## Acceptance Criteria

- [ ] Changing sort recomputes pipeline output without reloading raw RPC results unnecessarily.
- [ ] Keyboard and screen-reader labels reference i18n keys (`workspace.*`).
