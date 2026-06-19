# Interaction emphasis — ink inheritance contract

**Canonical design:** [`docs/design/state-visuals.md`](../../design/state-visuals.md) § Interaction emphasis  
**Mixin source:** [`apps/web/src/styles/_interaction-emphasis-quiet-row.scss`](../../../apps/web/src/styles/_interaction-emphasis-quiet-row.scss)  
**Rollout tracker:** [`interaction-emphasis-rollout.md`](./interaction-emphasis-rollout.md)

## What it is

Cross-component contract for **quiet interactive rows and triggers**: when the host enters hover, selected, or selected+hover, **background wash and ink must change together** on the host, and **every leading/trailing slot** (Material icon, label, chevron, badge text) must show the **same ink** as the host.

This is **not** a sidebar-only rule. It applies to every surface that uses interaction emphasis mixins or `--menu-item-hover` / `hlmBtn` quiet variants.

## Three-tier attention budget (normative)

Gold is **scarce** — one primary focal signal (pointer + in-panel engaged rows). Do not use gold for resting toolbar/filter/toggle state.

| Tier | Meaning | Ink token | At-rest mixin | + pointer |
| ---- | ------- | --------- | ------------- | --------- |
| **Primary** | Acting on this row *now* | `--brand-gold` | `emphasis.engaged()` | `emphasis.hover()` |
| **Secondary** | Context is set | `--interaction-selected-ink` | `emphasis.selected()` / `selected-bordered()` | `emphasis.hover()` |
| **Tertiary** | Where you are in the product | `--interaction-nav-ink` | `emphasis.nav()` / `nav-bordered()` | `emphasis.hover()` |

| Signal | Tier | Examples |
| ------ | ---- | -------- |
| Hover / focus-visible | **Primary** (always) | Any quiet row, any tier |
| Filter picker `data-selected` | **Primary** | Flyout list while choosing |
| Grouping multi-select row | **Primary** | `grouping-row--selected` |
| Toolbar `data-active` | **Secondary** | Filter/sort/projects triggers |
| Active sort row | **Secondary** | `sort-dropdown__option--active` |
| Toggle `data-state=on` | **Secondary** | Map style switch, size control, upload lanes |
| Nav active route | **Tertiary** | `.nav__link--active` |
| Settings section rail | **Tertiary** | `.settings-overlay__section-item--active` |
| Destructive quiet row | **Exception** | Destructive branch in menu states |

**Pointer always wins:** `:hover` / `:focus-visible` on any tier → `emphasis.hover()` (gold). `emphasis.selected-hover()` MUST delegate to `emphasis.hover()`.

List-row background-only token: `var(--menu-item-hover)` (= gold 8%). **Background-only hover without matching ink is a spec violation** unless a child spec documents an exception with a test oracle.

## Ink inheritance rule (blocker)

When the **host** sets interaction emphasis (`emphasis.hover`, `emphasis.selected`, `emphasis.nav`, `emphasis.engaged`, or equivalent CVA quiet hover):

1. Set **one** ink on the host (`color` on the interactive root).
2. Child slots **must** use `color: inherit` (or no separate `color` rule).
3. **Forbidden:** `@include emphasis.hover()` on the host **and** `color: var(--primary)` on `.material-icons`, `__icon`, `__label`, `[data-dd-part]`, etc.

Material Icons do not reliably inherit without an explicit inherit rule on the icon slot.

### Anti-patterns (reject in review)

| Pattern | Why it fails |
| ------- | ------------ |
| `background: var(--menu-item-hover)` only | Gold wash, muted ink — looks “broken” |
| Host gold + child `color: var(--primary)` | Gold label + blue icon (reported nav/dropdown bug) |
| Gold on toggle `on` at rest | Collapses attention budget — use secondary blue |
| Blue on nav active route at rest | Use tertiary violet (`emphasis.nav`) |
| `color: var(--foreground)` on `hlmBtn` host | Blocks emphasis ink while background still changes |
| Per-child primary override “for emphasis” | Duplicates host ink; drifts on theme change |

## Component scope

| Family | Tier (at rest) | Spec | Host selector(s) |
| ------ | -------------- | ---- | ---------------- |
| Main nav sidebar | Tertiary | [`sidebar.md`](../component/workspace/sidebar.md) | `.nav__link--active` |
| Settings overlay rail | Tertiary | [`settings-overlay.md`](../ui/settings-overlay/settings-overlay.md) | `.settings-overlay__section-item--active` |
| Menu / dropdown rows (hover) | Primary on pointer | [`dropdown-system.md`](../component/filters/dropdown-system.md) | `.option-menu-item` |
| Filter picker flyout selected | Primary | [`filter-dropdown.md`](../component/filters/filter-dropdown.md) | `.filter-rule__picker-option[data-selected]` |
| Sort active row | Secondary | [`dropdown-system.md`](../component/filters/dropdown-system.md) | `.sort-dropdown__option--active` |
| Grouping multi-select | Primary | [`dropdown-system.md`](../component/filters/dropdown-system.md) | `.grouping-row--selected` |
| Toolbar dropdown triggers `data-active` | Secondary | [`dropdown-system.md`](../component/filters/dropdown-system.md) | `button.*__menu-trigger` |
| Map filter toolbar | Secondary | same | `map-filter-toolbar__menu-trigger` |
| Toggle segments `on` | Secondary | [`map-style-switch.md`](../component/map/map-style-switch.md) | `[hlmToggleGroupItem]` |
| Map photo markers (hover) | Primary | [`media-marker.md`](../ui/media-marker/media-marker.md) | `.map-photo-marker` hover outline |
| Media item grid tiles (hover) | Primary | [`media-item.md`](../component/media/media-item.md) | `.media-item__slot:hover` |

**Avatar badge** on the nav account row remains the **filled primary** exception (not quiet-row emphasis).

## Implementation owners

Global: `_interaction-emphasis-quiet-row.scss`, `_option-menu-item-states.scss`, `button-variants.ts`, `_toolbar-menu-trigger.scss`.

Feature SCSS must not reintroduce child `primary` overrides after host `emphasis.hover`. See parent [`state-visuals.md`](../../design/state-visuals.md) implementation-owner list.

## Acceptance criteria

- [ ] **Given** a quiet row at idle, **when** the user hovers or focus-visible activates it, **then** host background and **all** icon/label/chevron slots show **gold** ink (`--brand-gold`) with no slot left muted or blue.
- [x] **Given** a **secondary** quiet row or toggle segment at rest, **when** the user hovers or focus-visible activates it, **then** host and all slots show **gold** ink with gold wash — **not** primary deepening.
- [ ] **Given** main nav or settings section rail at rest with active route/section, **when** not hovered, **then** host and slots show **violet** ink (`--interaction-nav-ink`).
- [x] **Given** a toolbar `hlmBtn` outline trigger on a frosted shell, **when** hovered, **then** icon, label, and chevron change ink together (no foreground lock on the host).
- [x] **Given** an `hlmMenuItem` row in any dropdown (filter, sort, grouping, timespace panel actions), **when** hovered, **then** leading icon and label match host gold ink.
- [ ] **Given** sandstone theme (`--primary` = gold), **when** hovering a non-selected row, **then** no blue/gold split appears on icon vs label.

## Changelog

- **2026-06-17 (d)** — **Three-tier attention budget:** primary gold / secondary blue / tertiary violet; `emphasis.nav()`, `--interaction-nav-ink`.
- **2026-06-17** — **Selected+hover = gold:** pointer over selected controls uses `emphasis.hover`, not primary deepening; scope adds map style switch, markers, media tiles.
- **2026-06-17** — Initial contract: ink inheritance rule + cross-component scope (fixes spec drift that treated hover as sidebar-only primary ink).
