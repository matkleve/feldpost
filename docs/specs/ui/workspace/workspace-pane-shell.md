# Workspace Pane Shell

> **Parent:** [workspace-pane.md](workspace-pane.md)

## What It Is

Layout wrapper around the workspace pane column: owns clip-path open animation, desktop height and overflow, and mobile bottom-sheet geometry relative to the nav. Shell geometry merged into `WorkspacePaneComponent` (2026-05 workspace-pane restructure); there is no separate `app-workspace-pane-shell` component.

## What It Looks Like

Desktop: full-height column with subtle slide-in from the right (`clip-path`). Mobile: fixed bottom region (~40vh) above the bottom nav, sliding up with rounded top corners per layout tokens.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/shell/workspace-pane.component.ts` (+ `.scss`)
- **Layout host:** `apps/web/src/app/layout/authenticated-app-layout.component.ts` (split row + `WorkspacePaneShellHost` token)

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Pane opens | Shell animates into view | `open` input true |
| 2 | Viewport crosses mobile breakpoint | Shell switches desktop vs mobile geometry | `matchMedia` / layout |

## Component Hierarchy

```
WorkspacePaneComponent (shell + content)
└── ng-content regions (toolbar, grid, detail, footer)
```

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Shell column | `.workspace-pane` host / shell SCSS | pane host | n/a (non-interactive) | `@media` blocks | panel | clip animation runs |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| Open animation | `app-workspace-pane` host | layout open signal from parent | `workspace-pane.component.scss` | yes |

## Data

None — layout-only; width/open come from parent inputs on `WorkspacePaneComponent`.

## State

| Input | Purpose |
| --- | --- |
| `open` | Visibility driver for shell (layout host) |
| `currentWidth`, `minWidth`, `maxWidth`, `defaultWidth` | Passed through to drag divider sibling in layout |

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/workspace-pane/shell/workspace-pane.component.ts` | Pane host (includes former shell inputs) |
| `apps/web/src/app/shared/workspace-pane/shell/workspace-pane.component.scss` | Clip-path and responsive shell geometry |

## Wiring

- Declared in authenticated layout next to `DragDividerComponent` and `WorkspacePaneComponent`.

## Acceptance Criteria

- [x] Pane width driven by layout host + drag divider; shell SCSS on `WorkspacePaneComponent`.
- [ ] Animation durations use design motion tokens (`--motion-duration-*`, `--motion-ease-*`).
- [ ] `prefers-reduced-motion` disables shell entrance animation.
