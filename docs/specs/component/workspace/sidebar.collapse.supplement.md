# Sidebar — Pinned collapse & NavRow geometry

Parent: [`sidebar.md`](sidebar.md)

## Desktop collapse model (normative)

Desktop width is **pinned** by an explicit collapse control — **not** hover-to-expand.

| State | Width | Trigger |
| --- | --- | --- |
| Expanded | `15rem` | Default; user clicks collapse control |
| Collapsed | `3rem` | User clicks collapse control |

- Signal: `sidebarCollapsed` on `NavComponent`
- Persistence: `localStorage` key `feldpost.ui.sidebarCollapsed`
- Host class: `nav--collapsed` on `app-nav`
- CSS variable: `--feldpost-sidebar-width` on `document.documentElement` (`3rem` / `15rem`)
- Transition: sidebar width `180ms ease-out` only

**Deferred (not shipped):** hover/focus-within auto-expand in Actions #1–2 / #7–8 of legacy sidebar drafts. Do not reintroduce without a spec amendment.

## NavRow contract (no sideways jump)

Every desktop row keeps the **same grid shell** in both widths:

```text
NavRow
├── MediaColumn   ← var(--sidebar-media-size) = var(--spacing-6) = 32px
└── LabelColumn   ← minmax(0, 1fr); clipped when collapsed
```

| Property | Expanded | Collapsed | Changes on toggle? |
| --- | --- | --- | --- |
| Panel `padding-inline` | `var(--spacing-1)` (4px) | same | **No** |
| Row `padding-inline` | `0` | same | **No** |
| Row `display` | `grid` | same | **No** |
| Row `column-gap` | `var(--spacing-3)` | `0` | **Yes** |
| Media column width | 32px | same | **No** |
| Label column width | `minmax(0, 1fr)` | `0fr` (mounted, clipped) | **Yes** |
| Nav link `min-height` | row height token | `32px` (square hit target) | **Yes** |
| Label visibility | opacity `1` | opacity `0`, `visibility: hidden` | **Yes** |
| Sidebar width | `15rem` | `3rem` | **Yes** |

Horizontal inset for icons = panel padding only (**4px** from rail edge). Row padding MUST NOT add a second inset. When collapsed, row `column-gap` MUST be **0** — a non-zero gap plus the 32px media column overflows a narrow rail and clips the avatar circle.

### Collapsed rail math

```text
3rem rail (48px)
├── padding-inline spacing-1 × 2  → 8px
└── content (40px)
    └── NavRow grid: [ 32px media | 0fr label ], gap 0  → 32×32px square hit target
        └── 4px slack on trailing edge inside content box
```

Icons stay in the **leading column**; they are not re-centered with flex/`margin: auto` on collapse.

## Header row

Expanded header uses the same leading grid as nav rows plus a trailing control column:

```text
[ logo 32px | title flex | collapse btn 32px ]
```

Collapsed: logo and title hidden; header grid collapses to a single 32px column; collapse button occupies column 1 (same X as nav icons).

Header `padding-inline`: **0** — panel padding is the only horizontal inset (matches nav rows).

## Map layout side effect

When `sidebarCollapsed` changes (after init), `NavComponent` calls `WorkspacePaneLayoutMapEffectsService.getMapEffects()?.invalidateMapSize()` immediately, on the next tick, and after `200ms` so Leaflet reflows after the width transition.

## Theme utility row

Theme cycle button uses the same NavRow grid. Indicator dots: [`cycle-indicator-dots.md`](../ui-primitives/cycle-indicator-dots.md).

## Wiring (collapse)

```mermaid
sequenceDiagram
  participant U as User
  participant N as NavComponent
  participant D as documentElement
  participant M as MapShellBasemapEffects

  U->>N: Click collapse control
  N->>N: sidebarCollapsed.toggle + localStorage
  N->>D: --feldpost-sidebar-width
  N->>M: invalidateMapSize (debounced)
  Note over N: Labels opacity/visibility only; grid unchanged
```

## Acceptance Criteria (collapse & geometry)

- [x] Panel `padding-inline` identical in collapsed and expanded desktop states
- [x] Row shell (grid, media width, row padding) unchanged across toggle
- [x] Labels hidden via opacity/visibility; remain mounted
- [x] Collapse control persists across reload
- [x] Map `invalidateSize` runs on toggle, not on component init
- [ ] Hover-to-expand desktop rail (deferred — not implemented)
