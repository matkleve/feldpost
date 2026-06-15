# Page rail grid

**Status:** Shipped on `/projects` (2026-06-14). Replaces per-page `content-clamp--wide` + flex split for multi-rail layouts.

## Model

Viewport-wide shell outlet hosts a **centered grid band** (`max-width: 90rem`). Host padding is the outer gutter; optional left/right rails use fixed widths; the **center rail is the only flexible track** and absorbs remaining band width (dashboard widgets use full center; project detail may cap inner content at `52rem`).

```text
[ host padding = outer gutter ]

| L-rail (17.5rem)? | CENTER (1fr — grows) | R-rail (20rem)? |

[ band max 90rem, centered in outlet ]
```

| Mode | Columns | Use |
| --- | --- | --- |
| `single` | `1fr` (band capped `52rem`) | Account, media-like pages (`leftRail=false`) |
| `split-left` | `left · center` | Projects dashboard / detail without details panel |
| `split-both` | `left · center · right` | Projects with details panel open |

Do **not** add extra `1fr` gutter columns inside the band — they steal width from the center track (three-way `1fr` split made the dashboard too narrow).

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
