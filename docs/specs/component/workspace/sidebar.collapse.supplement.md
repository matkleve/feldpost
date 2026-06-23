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

## NavRow contract (nothing changes on collapse)

Row CSS is **identical** in both states. The sidebar's `overflow: hidden` clips the label column naturally when the rail narrows.

```text
NavRow (expanded AND collapsed — same CSS)
├── MediaColumn   ← var(--sidebar-media-size) = var(--spacing-6) = 32px
└── LabelColumn   ← minmax(0, 1fr) — clipped by sidebar overflow:hidden when collapsed
```

Row height equals collapsed content width: `3rem` rail − `2 × spacing-2` panel padding = `spacing-6` (32px). Icons and logo use `spacing-4` (16px), centered in the media column (`spacing-2` inset on each side).

| Property | Expanded | Collapsed | Changes on toggle? |
| --- | --- | --- | --- |
| Panel `padding-inline` | `var(--spacing-2)` (8px) | same | **No** |
| Row `padding-inline` | `0` | same | **No** |
| Row `column-gap` | `var(--spacing-3)` (12px) | same | **No** |
| Row `min-height` | `32px` (`spacing-6`) | same | **No** |
| Media column width | 32px (`spacing-6`) | same | **No** |
| Icon / logo size | 16px (`spacing-4`) | same | **No** |
| Label visibility | opacity `1` | opacity `0`, `visibility: hidden` | **Yes** |
| Sidebar width | `15rem` | `3rem` | **Yes** |

### How clipping works

`overflow: hidden` is set on `.sidebar`. When the rail narrows to `3rem` (48px):

```text
3rem rail (48px)
├── panel padding-inline: 8px + 8px  → 16px
└── content box: 32px
    ├── grid col 1 (media): 32px  → fills content exactly
    └── grid gap (12px) + col 2 (label): overflow → clipped by sidebar
```

Icons stay in the **leading column** at a fixed X position. No CSS changes on the row.

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
  Note over N: Width narrows; overflow:hidden clips labels; row CSS unchanged
```

## Acceptance Criteria (collapse & geometry)

- [x] Panel `padding-inline` identical in collapsed and expanded desktop states
- [x] Row CSS (grid, column-gap, padding, min-height) unchanged across toggle
- [x] Sidebar `overflow: hidden` clips label column — no row CSS changes needed
- [x] Labels fade via opacity/visibility; layout handled by clipping
- [x] Collapse control persists across reload
- [x] Map `invalidateSize` runs on toggle, not on component init
- [ ] Hover-to-expand desktop rail (deferred — not implemented)
