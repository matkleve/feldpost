# Map Style Switch

## What It Is

Vertical **two-segment** basemap control in the map zone: **street map** vs **satellite photo**. Implemented as `[hlmPillToggle]` + `[hlmToggleGroup]` / `[hlmToggleGroupItem]` in `MapShellComponent` (not a standalone Angular component file).

## What It Looks Like

Frosted pill track (top-left of map zone, `z-index: 200`). Each segment is a circular icon-only toggle (`map` / `satellite` Material icons). **On** segment uses **secondary** context ink (cool blue) at rest — passive basemap mode, not a list-selection task. **Off** segment is muted. **Hover / focus-visible** → **brand gold** (high attention while pointer is on the segment).

## Where It Lives

- **Parent:** [`map-zone.md`](./map-zone.md) → `MapShellComponent` template
- **SCSS:** `apps/web/src/app/features/map/map-shell/scss/_map-shell-style-switch.scss`
- **CVA base:** `apps/web/src/app/shared/ui/toggle-group/toggle-group-variants.ts`

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Tap inactive segment | Basemap switches; segment becomes `data-state=on` |
| 2 | Hover / focus-visible any segment | **Brand gold** ink + gold wash on that segment only while focused (see Interaction emphasis) |
| 3 | Reload page | Last basemap restored from persistence (see `map-zone.md`) |

## Interaction emphasis

- Canonical: [`state-visuals.md`](../../../design/state-visuals.md) § Interaction emphasis
- Ink: [`interaction-emphasis-ink-contract.md`](../../system/interaction-emphasis-ink-contract.md)
- [x] This component implements the contract (or documented exception below)

| Surface | Rest (on) | Rest (off) | Hover / focus-visible (any segment, including already on) | Owner |
| --- | --- | --- | --- | --- |
| Segment (`hlmToggleGroupItem`) | Secondary `--interaction-selected-ink` + wash (cool blue; all themes) | Muted ink, transparent fill | **Brand gold** ink + gold wash; icon `color: inherit` | `toggle-group-variants.ts` + `_map-shell-style-switch.scss` pierce |

**Normative:** Resting **on** segment is **secondary** (passive mode) — cool blue, not gold. Multi-select / attention-selection patterns do **not** apply to this control. Pointer over an **already-selected** segment uses the same gold hover as an off segment.

## Visual Behavior Contract

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Track shell | `[hlmToggleGroup]` in `.map-style-switch` | `.map-style-switch` | segment buttons | `.map-style-switch [hlmToggleGroup]` | 200 | Frosted column track |
| Segment chrome | `[hlmToggleGroupItem]` | segment button | segment button | `.map-style-switch__option` | content | 2.75rem circle |
| Hover emphasis | segment button | segment button | segment button | `:hover` / `:focus-visible` on item | states | Brand gold on on+off while hovered; resting on = cool blue only |

## File Map

| File | Purpose |
| ---- | ------- |
| `features/map/map-shell/component/map-shell.component.html` | Markup (`.map-style-switch`) |
| `features/map/map-shell/scss/_map-shell-style-switch.scss` | Position + pierced toggle geometry |
| `shared/ui/toggle-group/toggle-group-variants.ts` | Segment hover/on CVA |

## Acceptance Criteria

- [x] Two segments: street + satellite icons
- [x] Vertical frosted track, top-left placement
- [ ] **Given** sandstone theme, **when** the active basemap segment is on at rest (passive mode, not hovered), **then** icon ink is **cool blue** — not gold.
- [x] Hover/focus on **on** segment shows **brand gold** ink (not blue deepening)
- [x] Hover/focus on **off** segment shows **brand gold** ink
- [x] Icon inherits host ink on hover (no blue icon + gold wash split)
