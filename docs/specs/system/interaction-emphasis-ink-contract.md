# Interaction emphasis — ink inheritance contract

**Canonical design:** [`docs/design/state-visuals.md`](../../design/state-visuals.md) § Interaction emphasis  
**Mixin source:** [`apps/web/src/styles/_interaction-emphasis-quiet-row.scss`](../../../apps/web/src/styles/_interaction-emphasis-quiet-row.scss)  
**Rollout tracker:** [`interaction-emphasis-rollout.md`](./interaction-emphasis-rollout.md)

## What it is

Cross-component contract for **quiet interactive rows and triggers**: when the host enters hover, selected, or selected+hover, **background wash and ink must change together** on the host, and **every leading/trailing slot** (Material icon, label, chevron, badge text) must show the **same ink** as the host.

This is **not** a sidebar-only rule. It applies to every surface that uses interaction emphasis mixins or `--menu-item-hover` / `hlmBtn` quiet variants.

## Semantic model (normative)

| Signal | Meaning | Ink | Background | Mixin |
| ------ | ------- | --- | ---------- | ----- |
| **Idle** | Rest, not selected | `--muted-foreground` (or `--foreground` on filled shells) | transparent / shell fill | — |
| **Hover / focus-visible** | Transient invitation | `--brand-gold` | gold ~10% mix | `@include emphasis.hover(X%)` |
| **Selected / on** | Persistent choice (route, filter active, sort on) | `--interaction-selected-ink` (= `--primary` in default theme) | selected-ink ~10% mix | `@include emphasis.selected(X%)` |
| **Selected + hover** | Pointer over an already-selected row | `--primary` | primary ~10% mix | `@include emphasis.selected-hover(X%)` |
| **Destructive quiet row** | Irreversible action row | `--destructive` | destructive 10% / 15% (`:active`) | destructive branch in menu states |

**Hover = warm gold. Selected = cool blue. Selected+hover = primary wins.** Do not use `--primary` ink on plain hover when the host uses `emphasis.hover()`.

List-row background-only token: `var(--menu-item-hover)` (= gold 8%). **Background-only hover without matching ink is a spec violation** unless a child spec documents an exception with a test oracle.

## Ink inheritance rule (blocker)

When the **host** sets interaction emphasis (`emphasis.hover`, `emphasis.selected`, `emphasis.selected-hover`, or equivalent CVA quiet hover):

1. Set **one** ink on the host (`color` on the interactive root).
2. Child slots **must** use `color: inherit` (or no separate `color` rule).
3. **Forbidden:** `@include emphasis.hover()` on the host **and** `color: var(--primary)` on `.material-icons`, `__icon`, `__label`, `[data-dd-part]`, etc.

Material Icons do not reliably inherit without an explicit inherit rule on the icon slot.

### Anti-patterns (reject in review)

| Pattern | Why it fails |
| ------- | ------------ |
| `background: var(--menu-item-hover)` only | Gold wash, muted ink — looks “broken” |
| Host gold + child `color: var(--primary)` | Gold label + blue icon (reported nav/dropdown bug) |
| `color: var(--foreground)` on `hlmBtn` host | Blocks `hover:text-*` / emphasis ink while background still changes |
| Per-child primary override “for emphasis” | Duplicates host ink; drifts on theme change |

## Component scope

| Family | Spec | Host selector(s) | Child slots that must inherit |
| ------ | ---- | ---------------- | ------------------------------ |
| Main nav sidebar | [`sidebar.md`](../component/workspace/sidebar.md) | `.nav__link` | `.nav__icon`, `.nav__label` |
| Menu / dropdown rows | [`dropdown-system.md`](../component/filters/dropdown-system.md) | `.option-menu-item` | `.option-menu-item__icon`, row label |
| Toolbar dropdown triggers | [`dropdown-system.md`](../component/filters/dropdown-system.md), [`ui-primitives.dropdown-trigger.md`](../component/ui-primitives/ui-primitives.dropdown-trigger.md) | `button.*__menu-trigger`, `map-filter-toolbar__menu-trigger` | `[data-dd-part='icon'|'label'|'chevron']` |
| Map filter toolbar | [`dropdown-system.md`](../component/filters/dropdown-system.md) § Toolbar triggers | `map-filter-toolbar__menu-trigger` | same `data-dd-part` slots |
| Page rail | [`page-rail.md`](../component/page-rail/page-rail.md) | `.rail-nav-button`, `.rail-detail-nav-item`, `.rail-section__heading` | media icon, chevron, label |
| Rail select list | [`page-rail.md`](../component/page-rail/page-rail.md) | `.rail-select-list__row-wrap` | row icon, label, badges |
| Settings overlay rail | [`settings-overlay.md`](../ui/settings-overlay/settings-overlay.md) | `.settings-overlay__section-item` | `.settings-overlay__section-media`, chevron, label |
| Metadata / property pickers | media-detail picker specs | `*__result-item`, combobox options | `*__result-icon`, `*__result-label` |
| Detail rows | media-detail row specs | `.detail-row` hover center | icon, label, value |
| Quiet buttons (`hlmBtn`) | [`ui-primitives.button.md`](../component/ui-primitives/ui-primitives.button.md) | `button[hlmBtn]` outline/ghost | `.material-icons`, projected label |
| Search dropdown rows | search-bar item spec | `.search-dropdown-item` | icon, primary label (secondary meta may soften) |

**Avatar badge** on the nav account row remains the **filled primary** exception (not quiet-row emphasis).

## Implementation owners

Global: `_interaction-emphasis-quiet-row.scss`, `_option-menu-item-states.scss`, `button-variants.ts`, `_toolbar-menu-trigger.scss`.

Feature SCSS must not reintroduce child `primary` overrides after host `emphasis.hover`. See parent [`state-visuals.md`](../../design/state-visuals.md) implementation-owner list.

## Acceptance criteria

- [ ] **Given** a quiet row at idle, **when** the user hovers or focus-visible activates it, **then** host background and **all** icon/label/chevron slots show **gold** ink (`--brand-gold`) with no slot left muted or blue unless the row is **selected**.
- [ ] **Given** a selected quiet row, **when** the user hovers it, **then** host and all slots show **primary** ink with selected-hover wash.
- [ ] **Given** a toolbar `hlmBtn` outline trigger on a frosted shell, **when** hovered, **then** icon, label, and chevron change ink together (no foreground lock on the host).
- [ ] **Given** an `hlmMenuItem` row in any dropdown (filter, sort, grouping, timespace panel actions), **when** hovered, **then** leading icon and label match host gold ink.
- [ ] **Given** sandstone theme (`--primary` = gold), **when** hovering a non-selected row, **then** no blue/gold split appears on icon vs label.

## Changelog

- **2026-06-17** — Initial contract: ink inheritance rule + cross-component scope (fixes spec drift that treated hover as sidebar-only primary ink).
