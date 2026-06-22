# Map Filter Toolbar

## What It Is

Floating row of **three dropdown triggers** (Filter, Projects, Timespace) directly beneath the map search chrome. Reuses workspace toolbar trigger patterns (`toolbar-menu-trigger` SCSS) with map-specific frosted `outline-control` shells.

## What It Looks Like

Horizontal trigger row, left-aligned under `ss-search-bar` inside `.map-search-chrome`. Each trigger: **icon + label + chevron** in spacious mode (default at typical search-chrome widths up to `36rem`); **icon-only** below the map-specific container-query breakpoint (`22rem` on `map-filter-toolbar` container — three triggers, not workspace’s four-trigger `42.5rem` contract). Active filters / project / timespace set `data-active='true'` → **secondary** selected-ink at rest; hover → **primary** gold.

## Where It Lives

- **Parent:** [`search-bar.md`](../../ui/search-bar/search-bar.md) / `.map-search-chrome` in `MapShellComponent`
- **Component:** `apps/web/src/app/features/map/map-filter-toolbar/`
- **Dropdown panels:** `app-filter-dropdown`, `app-projects-dropdown`, `app-timespace-dropdown` via `app-toolbar-dropdown-stack`

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

**Normative:** Histogram brush uses **primary gold** only while `isDragging()`; committed range at rest uses **secondary** selected ink. Date range uses **one** `app-calendar-dropdown` `mode='range'` ([`calendar-dropdown.md`](../filters/calendar-dropdown.md) + [range supplement](../filters/calendar-dropdown.range-mode.supplement.md)) — gold on `:focus-within` per active field, body-portaled panel (no clip).

## File Map

| File | Purpose |
| ---- | ------- |
| `map-filter-toolbar.component.ts` | Trigger row + dropdown stack wiring |
| `map-filter-toolbar.component.html` | Three `hlmBtn` outline triggers |
| `map-filter-toolbar.component.scss` | Frosted shells + shared toolbar trigger mixins |
| `map-shell/scss/_map-shell-search-chrome.scss` | Column width + toolbar host sizing |

## Acceptance Criteria

- [x] Three triggers: Filter, Projects, Timespace with `data-dd-part` icon/label/chevron slots
- [x] Triggers use `toolbar-menu-trigger` gold hover + secondary `data-active` emphasis
- [x] Frosted `outline-control` shells in `@layer components`; hover states in `@layer states`
- [x] Spacious default shows icon + label + chevron on each trigger
- [x] Container query collapses to icon-only below `22rem` (aria-label + title on each button)
- [ ] Filter trigger shows active count badge when filters applied (workspace parity — future)
