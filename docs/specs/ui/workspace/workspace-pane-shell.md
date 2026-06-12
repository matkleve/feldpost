# Workspace Pane Shell

> **Parent:** [workspace-pane.md](workspace-pane.md)

## What It Is

Layout wrapper around the workspace pane column: owns clip-path open animation, desktop height and overflow, and mobile bottom-sheet geometry relative to the nav. Does not own workspace business logic.

## What It Looks Like

Desktop: full-height column with subtle slide-in from the right (`clip-path`). Mobile: fixed bottom region (~40vh) above the bottom nav, sliding up with rounded top corners per layout tokens.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/workspace-pane-shell.component.ts`
- **Parent:** `AuthenticatedAppLayoutComponent` (canonical split host)

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Pane opens | Shell animates into view | `open` input true |
| 2 | Viewport crosses mobile breakpoint | Shell switches desktop vs mobile geometry | `matchMedia` / layout |

## Component Hierarchy

```
WorkspacePaneShell
└── ng-content (WorkspacePane and children)
```

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Shell column | `.workspace-pane-shell` | `.workspace-pane-shell` | n/a (non-interactive) | `@media` blocks | panel | clip animation runs |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| Open animation | `.workspace-pane-shell` | host open signal from parent | `.workspace-pane-shell` | yes |

## Data

None — layout-only; width/open come from parent inputs.

## State

| Input | Purpose |
| --- | --- |
| `open` | Visibility driver for shell |
| `currentWidth`, `minWidth`, `maxWidth`, `defaultWidth` | Passed through to drag divider sibling in layout |

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/workspace-pane/workspace-pane-shell.component.ts` | Component |
| `apps/web/src/app/shared/workspace-pane/workspace-pane-shell.component.scss` | Clip-path and responsive shell |

## Wiring

- Declared in authenticated layout next to `DragDividerComponent` and `WorkspacePaneComponent`.

## Acceptance Criteria

- [x] `display: contents` on `:host` where used so flex split remains on layout parent.
- [ ] Animation durations use design motion tokens (`--motion-duration-*`, `--motion-ease-*`).
- [ ] `prefers-reduced-motion` disables shell entrance animation.
