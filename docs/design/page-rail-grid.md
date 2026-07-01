# Page rail grid

**Status:** Shipped on `/projects` and `/media` (2026-06-14).

## Model

The **center column is always `52rem`** (`content-clamp--list` width) in the same grid position on every page. Side rails sit in the outer gutter tracks and do **not** push the center column sideways.

```text
[ host padding: spacing-6 + nav 4.5rem start ]

| 1fr left gutter | 52rem CENTER | 1fr right gutter |

  [sidebar end-aligned]     [title + content]     [details start-aligned]
```

| Page | Left gutter | Center | Right gutter |
| --- | --- | --- | --- |
| `/media` | empty | header + grid | empty |
| `/projects` | project list | dashboard / detail | details panel (optional) |

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
| `/media` | `false` | `false` | fixed `52rem` (column 2) |
| `/projects` dashboard / detail | `true` | `false` | columns 2–3 (center + right gutter) |
| `/projects` with details | `false` | `true` | fixed `52rem` + details in column 3 |

## Ownership

| Concern | Owner |
| --- | --- |
| Grid tracks, gutter alignment, host padding | `page-grid.component.scss` |
| Page content | Projected center slot children |
| Map shell | Exempt |

## Anti-pattern

Do **not** use a growing `1fr` center track — it breaks alignment with `/media`. Do **not** add extra horizontal padding on dashboard/detail wrappers; host + fixed center define the title column.
