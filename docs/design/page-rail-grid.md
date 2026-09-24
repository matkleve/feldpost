# Page rail grid

**Status:** Shipped on `/projects` and `/media` (2026-06-14).

## Model

Product pages render inside `app-shell-main-canvas`. Host padding is `var(--spacing-6)` on every side. The map does not use this grid. See [shell-main-canvas.md](../specs/ui/shell/shell-main-canvas.md).

```text
[ host padding: spacing-6 ]

/media (no left rail)
| minmax(0, 1fr) title + toolbar + grid |

/projects (left rail, center expanded)
| max-content list | remaining width: dashboard or detail |
```

| Page | Inside the canvas |
| --- | --- |
| `/media` | One track. Title, toolbar, and grid fill the box. |
| `/projects` | Project list on the left (`--page-grid-left-width`, 17.5rem). The dashboard or detail uses the width beside it. |
| `/projects` with the details panel open | List, then a `52rem` center (`--page-grid-center-max`), then the details track. |

Outside the canvas the host still starts with `4.5rem` and three tracks (`1fr` | `52rem` | `1fr`). The authenticated layout always mounts the canvas, so `/media` and `/projects` use the table above.

## Component

- **Selector:** `app-page-grid`
- **Code:** `apps/web/src/app/shared/page-grid/`
- **Slots:** `[pageGridLeft]`, `[pageGridCenter]`, `[pageGridRight]`

### Left-rail composition (`app-page-rail`)

Feature sidebars project into `[pageGridLeft]` using **`app-page-rail`** and child primitives — see [`docs/specs/component/page-rail/page-rail.md`](../specs/component/page-rail/page-rail.md).

| Piece | Selector |
| --- | --- |
| Shell | `app-page-rail` |
| Title | `app-page-rail-title` |
| Primary nav | `app-rail-nav-button` |
| Search | `app-rail-search-field` |
| Collapsible section | `app-rail-section` |
| Group label | `app-rail-group-heading` |
| Select rows | `app-rail-select-list` (leading icon/avatar/dot, `secondaryLabel` subtitle, `size: normal \| large`) |
| Empty/loading | `app-rail-status` |

### Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `leftRail` | `true` | Mount left slot in gutter column 1 |
| `rightRailOpen` | `false` | Mount right slot in gutter column 3 |
| `centerExpanded` | `false` | When right rail is closed, span center across columns 2–3 (`/projects` without details) |

## Modes

| Mode | `centerExpanded` | `rightRailOpen` | Center width |
| --- | --- | --- | --- |
| `/media` inside the canvas | `false` | `false` | one `minmax(0, 1fr)` track, full box width |
| `/projects` dashboard / detail | `true` | `false` | width beside the left list |
| `/projects` with details | `false` | `true` | `52rem` center + details track |

## Ownership

| Concern | Owner |
| --- | --- |
| Grid tracks, gutter alignment, host padding | `page-grid.component.scss` |
| Page content | Projected center slot children |
| Map shell | Exempt |

## Anti-pattern

Outside the canvas, do **not** use a growing `1fr` center track — the center stays `52rem` so pages share one column. Inside `app-shell-main-canvas`, `/media` is the exception: no left rail, one full-width track. Do **not** add extra horizontal padding on dashboard/detail wrappers.
