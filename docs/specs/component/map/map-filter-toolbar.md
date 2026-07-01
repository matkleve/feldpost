# Map Filter Toolbar

## What It Is

Floating row of **three dropdown triggers** (Filter, Projects, Timespace) directly beneath the map search chrome. Reuses workspace toolbar trigger patterns (`toolbar-menu-trigger` SCSS) with map-specific frosted `outline-control` shells.

## What It Looks Like

Horizontal trigger row, left-aligned under `ss-search-bar` inside `.map-search-chrome`. Each trigger: **label + chevron only** (no icon) in spacious mode (default at typical search-chrome widths up to `36rem`); **icon-only** below the map-specific container-query breakpoint (`31.875rem` on `map-filter-toolbar` container — three triggers, proportional to workspace’s four-trigger `42.5rem` contract). Row MUST NOT wrap to a second line; collapse to icon-only instead. Active filters / project / timespace set `data-active='true'` → **secondary** selected-ink at rest; hover → **primary** gold.

## Where It Lives

- **Parent:** [`search-bar.md`](../../ui/search-bar/search-bar.md) / `.map-search-chrome` in `MapShellComponent`
- **Component:** `apps/web/src/app/features/map/map-filter-toolbar/`
- **Dropdown panels:** `app-filter-dropdown`, `app-projects-dropdown`, `app-timespace-dropdown` via `app-toolbar-dropdown-stack`

## Actions

| # | User action | System response |
| --- | --- | --- |
| 1 | Click trigger | Toggle matching dropdown panel via `app-toolbar-dropdown-stack` |
| 2 | Click outside / Escape | Close active panel |
| 3 | Apply filter / project / timespace | Parent sets `data-active='true'` on matching trigger |

## Component hierarchy

```
app-map-filter-toolbar
├── .map-filter-toolbar (3 × button.map-filter-toolbar__menu-trigger)
└── app-toolbar-dropdown-stack
    ├── app-filter-dropdown
    ├── app-projects-dropdown
    └── app-timespace-dropdown
```

## Interaction emphasis

- Canonical: [`state-visuals.md`](../../../design/state-visuals.md) § three-tier budget
- Ink: [`interaction-emphasis-ink-contract.md`](../../system/interaction-emphasis-ink-contract.md)
- Dropdown triggers: [`dropdown-system.md`](../filters/dropdown-system.md) § Toolbar triggers

| Surface | Tier | At rest | Hover / focus-visible | Owner |
| --- | --- | --- | --- | --- |
| `button.map-filter-toolbar__menu-trigger` idle | — | muted ink | primary gold | `_toolbar-menu-trigger.scss` |
| `button.map-filter-toolbar__menu-trigger[data-active]` | **Secondary** | selected-ink + bordered wash | primary gold | same |
| `[data-dd-part]` slots | — | `color: inherit` | inherit host ink | same |

**Container query:** `:host` declares `container-type: inline-size` + `container-name: map-filter-toolbar`; parent `.map-search-chrome > app-map-filter-toolbar` is `width: 100%` so icon-only collapse tracks search column width (see [`workspace-pane.md`](../../ui/workspace/workspace-pane.md) breakpoint contract).

### Timespace histogram (`app-timespace-dropdown`)

| Surface | Tier | At rest | Engaged (drag / focus) | Owner |
| --- | --- | --- | --- | --- |
| `.timespace-dropdown__selection--committed` | **Secondary** | selected-ink border + wash | — | `timespace-dropdown.component.scss` |
| `.timespace-dropdown__selection--engaged` | **Primary** | — | gold border + wash + outer ring | same |
| `.timespace-dropdown__chart--engaged` | **Primary** | — | gold track border during pointer drag | same |
| `app-calendar-dropdown` `:focus-within` | **Primary** | neutral border | gold border + focus ring | `calendar-dropdown.component.scss` |

**Normative:** Histogram brush uses **primary gold** only while `isDragging()`; committed range at rest uses **secondary** selected ink. Date range uses **one** `app-calendar-dropdown` `mode='range'` `layout='split'` `timeMode='optionalTime'` ([`calendar-dropdown.md`](../filters/calendar-dropdown.md) + [range supplement](../filters/calendar-dropdown.range-mode.supplement.md)) — row: From date + From time + center range icon + To date + To time; all shells `2.25rem`. Gold on `:focus-within` per active field; body-portaled panel (no clip). No range summary text line between fields and chart. Reset button: `hlmBtn variant="ghost" size="sm"` with `restart_alt` icon + translated "Reset" label.

**Map filter triggers (normative):** plain `<button class="map-filter-toolbar__menu-trigger">` with frosted `outline-control` — **not** `hlmBtn outline` (avoids hover stack conflict with map chrome).

## File Map

| File | Purpose |
| ---- | ------- |
| `map-filter-toolbar.component.ts` | Trigger row + dropdown stack wiring |
| `map-filter-toolbar.component.html` | Three plain frosted trigger buttons |
| `map-filter-toolbar.component.scss` | Frosted shells + shared toolbar trigger mixins |
| `map-shell/scss/_map-shell-search-chrome.scss` | Column width + toolbar host sizing |

## Acceptance Criteria

- [x] Three triggers: Filter, Projects, Timespace with `data-dd-part` icon/label/chevron slots
- [x] Triggers use `toolbar-menu-trigger` gold hover + secondary `data-active` emphasis
- [x] Frosted `outline-control` shells in `@layer components`; hover states in `@layer states`
- [x] Spacious default shows label + chevron only (icon hidden) on each trigger
- [x] Container query collapses to icon-only below `31.875rem` (aria-label + title on each button); row never wraps to a second line
- [ ] Filter trigger shows active count badge when filters applied (workspace parity — future)
