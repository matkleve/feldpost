# Sorting Controls (workspace)

> **Parent:** [workspace-toolbar.md](../../ui/workspace/workspace-toolbar.md)

## What It Is

Compact control in the workspace toolbar for choosing sort field and direction, feeding `WorkspaceViewService.activeSort`.

## What It Looks Like

Label or icon affordance with popover/dropdown pattern consistent with other toolbar ghost controls; shows current sort field and direction.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/sorting-controls.component.ts`
- **Parent:** `WorkspaceToolbarComponent`

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Changes sort field | Updates `activeSort` in `WorkspaceViewService` | UI change |
| 2 | Toggles direction | Flips asc/desc | Toggle |

## Component Hierarchy

```
SortingControls
└── (toolbar inline — triggers/dropdown per implementation)
```

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Control cluster | `:host` | `:host` | native buttons | `.sorting-controls` | content | sort updates service |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| Sort affordance | `:host` | activeSort binding | `:host` | yes |

## Data

| Source | Contract |
| --- | --- |
| `WorkspaceViewService` | Read/write `activeSort` |

## State

Signal-driven; single `[attr.data-state]` recommended (`idle` \| `open`) when dropdown pattern is used.

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/workspace-pane/sorting-controls.component.ts` | Component |
| `apps/web/src/app/shared/workspace-pane/sorting-controls.component.scss` | Styles |

## Wiring

- Embedded in workspace toolbar template alongside filter/group/project controls.

## Acceptance Criteria

- [ ] Changing sort recomputes pipeline output without reloading raw RPC results unnecessarily.
- [ ] Keyboard and screen-reader labels reference i18n keys (`workspace.*`).
