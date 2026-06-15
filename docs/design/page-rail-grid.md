# Page rail grid

**Status:** Shipped on `/projects` (2026-06-14). Replaces per-page `content-clamp--wide` + flex split for multi-rail layouts.

## Model

Viewport-wide shell outlet hosts a **centered grid band** (`max-width: 90rem`). Outer columns are flexible gutters; optional left/right rails occupy fixed token widths; the center rail absorbs remaining space.

```text
| 1fr gutter | L-rail (17.5rem)? | CENTER (minmax 0 1fr) | R-rail (20rem)? | 1fr gutter |
```

| Mode | Columns | Use |
| --- | --- | --- |
| `single` | `1fr · center · 1fr` | Account, narrow pages (`leftRail=false`) |
| `split-left` | `1fr · left · center · 1fr` | Projects dashboard / detail without details panel |
| `split-both` | `1fr · left · center · right · 1fr` | Projects with details panel open |

Gutters grow first on wide screens; rail widths stay fixed; center grows until the band hits `90rem`.

## Component

- **Selector:** `app-page-grid`
- **Code:** `apps/web/src/app/shared/page-grid/`
- **Slots (projection):** `[pageGridLeft]`, `[pageGridCenter]`, `[pageGridRight]`

### Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `leftRail` | `true` | Mount left column in template |
| `rightRailOpen` | `false` | Mount right column |

Nav pill clearance (`padding-inline-start: 4.5rem`) lives on `app-page-grid` `:host`, not on feature pages.

## Ownership

| Concern | Owner |
| --- | --- |
| Grid geometry, gutters, rail widths | `page-grid.component.scss` |
| Center content max-width (e.g. 52rem detail) | Feature inner components (`project-detail-view`) |
| Map shell | Exempt — map-primary layout unchanged |

## Migration

1. `/projects` — done
2. `/media` — optional; keep `content-clamp--list` until second pass
3. Deprecate `content-clamp--wide` for split layouts (keep `content-clamp` for single-column pages)
