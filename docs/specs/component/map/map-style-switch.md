# Map Style Switch

## What It Is

Vertical **two-segment** basemap control in the map zone: **street map** vs **satellite photo**. Implemented as `[hlmPillToggle]` + `[hlmToggleGroup]` / `[hlmToggleGroupItem]` in `MapShellComponent` (not a standalone Angular component file).

## What It Looks Like

Frosted pill track (top-left of map zone, `z-index: 200`). Each segment is a circular icon-only toggle (`map` / `satellite` Material icons). **On** segment uses **tertiary** nav ink (**violet**, `--interaction-nav-ink`) at rest — *which map view you are in*, same attention tier as sidebar route and settings section rail. **Off** segment is muted. **Hover / focus-visible** → **brand gold** (high attention while pointer is on the segment).

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
| Segment (`hlmToggleGroupItem`) | Tertiary `--interaction-nav-ink` + wash (violet; all themes) | Muted ink, transparent fill | **Brand gold** ink + gold wash; icon `color: inherit` | `_map-shell-style-switch.scss` pierce (overrides shared toggle CVA secondary) |

**Normative:** Resting **on** segment is **tertiary** (map view placement) — **violet**, not gold or blue. Generic `toggle-group-variants.ts` `data-[state=on]` secondary blue **does not apply** to `.map-style-switch`; feature SCSS must pierce with `emphasis.nav()` or equivalent. Multi-select / attention-selection patterns do **not** apply. Pointer over an **already-selected** segment uses the same gold hover as an off segment.

## Visual Behavior Contract

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Track shell | `[hlmToggleGroup]` in `.map-style-switch` | `.map-style-switch` | segment buttons | `.map-style-switch [hlmToggleGroup]` | 200 | Frosted column track |
| Segment chrome | `[hlmToggleGroupItem]` | segment button | segment button | `.map-style-switch__option` | content | 2.75rem circle |
| Hover emphasis | segment button | segment button | segment button | `:hover` / `:focus-visible` on item | states | Brand gold on on+off while hovered; resting on = violet only |
| Resting on emphasis | segment button | segment button | segment button | `data-[state=on]` on item | states | Violet (`emphasis.nav`); never gold or blue at rest |

## File Map

| File | Purpose |
| ---- | ------- |
| `features/map/map-shell/component/map-shell.component.html` | Markup (`.map-style-switch`) |
| `features/map/map-shell/scss/_map-shell-style-switch.scss` | Position + pierced toggle geometry |
| `shared/ui/toggle-group/toggle-group-variants.ts` | Shared segment hover/on CVA (secondary default; **overridden** in map shell pierce) |

## Documented exception

| Surface | Why |
| ------- | --- |
| Map style switch `data-state=on` | **Tertiary** — basemap choice is *where you are in the map view* (orientation), not toolbar filter context (blue) or list attention (gold). Pierced in `_map-shell-style-switch.scss`. |

## Acceptance Criteria

- [x] Two segments: street + satellite icons
- [x] Vertical frosted track, top-left placement
- [ ] **Given** any theme (light / dark / sandstone), **when** the active basemap segment is on at rest (not hovered), **then** icon ink is **violet** (`--interaction-nav-ink`) — not gold or blue.
- [ ] **Given** sandstone theme, **when** the active segment is on at rest, **then** ink remains **violet** — must not inherit sandstone `--primary` gold via shared toggle CVA.
- [x] Hover/focus on **on** segment shows **brand gold** ink (not blue deepening)
- [x] Hover/focus on **off** segment shows **brand gold** ink
- [x] Icon inherits host ink on hover (no blue icon + gold wash split)
