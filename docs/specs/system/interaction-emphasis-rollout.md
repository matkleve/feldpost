# Interaction emphasis — rollout tracker

**Canonical contract:** [`docs/design/state-visuals.md`](../../design/state-visuals.md) § Interaction emphasis  
**Ink inheritance:** [`interaction-emphasis-ink-contract.md`](./interaction-emphasis-ink-contract.md)  
**Token:** `--interaction-selected-ink` in [`apps/web/src/styles.scss`](../../../apps/web/src/styles.scss)

When an interactive component spec is next edited, add **§ Interaction emphasis** (see [`element-spec-format.md`](../../agent-workflows/element-spec-format.md)) and either implement the contract or document an exception. Remove the pending note from this table when done.

## Status legend

| Status | Meaning |
| ------ | ------- |
| **done** | Implements contract or documented exception |
| **pending** | Not yet aligned; apply on next touch |
| **partial** | Shared primitive done; feature SCSS cleanup remains |

## Families

| Family | Owner / entry | Status | Notes |
| ------ | ------------- | ------ | ----- |
| `hlmBtn` outline/ghost | [`button-variants.ts`](../../../apps/web/src/app/shared/ui/button/button-variants.ts) | **partial** | CVA still `hover:text-primary`; align to gold + ink inherit |
| `hlmBtn` default/destructive | same | **done** | Filled CTAs — exception (solid fill) |
| `hlmBtn` secondary | same | **done** | No product call sites; use `outline` for quiet actions |
| Toggle group items | [`toggle-group-variants.ts`](../../../apps/web/src/app/shared/ui/toggle-group/toggle-group-variants.ts) | **done** | on+hover = gold |
| Map style switch | [`map-style-switch.md`](../component/map/map-style-switch.md) | **done** | via toggle-group CVA |
| Map photo markers | [`media-marker.md`](../ui/media-marker/media-marker.md) | **done** | gold hover outline |
| Media item grid tiles | [`media-item.md`](../component/media/media-item.md) | **done** | gold slot hover |
| Nav sidebar links | [`sidebar.md`](../component/workspace/sidebar.md) | **done** | tertiary `emphasis.nav()`; gold hover |
| Menu rows | [`_option-menu-item-states.scss`](../../../apps/web/src/styles/_option-menu-item-states.scss) | **partial** | Mixin fix in progress; verify all consumers |
| Dropdown toolbar triggers | [`dropdown-system.md`](../component/filters/dropdown-system.md) | **done** | `data-active` + hover = gold |
| Map filter toolbar | [`map-filter-toolbar.md`](../component/map/map-filter-toolbar.md) | **done** | `outline-control` + `toolbar-menu-trigger`; container-query icon-only |
| Page rail rows | [`page-rail.md`](../component/page-rail/page-rail.md) | **pending** | rail-detail-nav-item, rail-section child overrides |
| Settings overlay rail | [`settings-overlay.md`](../ui/settings-overlay/settings-overlay.md) | **done** | tertiary `nav-bordered`; gold hover |
| Tabs (`hlmTabsTrigger`) | [`tabs-variants.ts`](../../../apps/web/src/app/shared/ui/tabs/tabs-variants.ts), [`ui-primitives.tab.md`](../component/ui-primitives/ui-primitives.tab.md) | **done** | active+hover = gold |
| Upload resolver tray choices | [`upload-resolver-tray.md`](../component/upload/upload-resolver-tray.md) | **done** | via `selected-hover` mixin |
| Quiet-row SCSS mixin | [`_interaction-emphasis-quiet-row.scss`](../../../apps/web/src/styles/_interaction-emphasis-quiet-row.scss) | **done** | `selected-hover` aliases `hover` |
| Metadata / property pickers | media-detail picker specs | **pending** | `menu-item-hover` bg-only rows |
| Detail row ghost actions | [`media-detail` specs](../component/workspace/) | **partial** | Removed duplicate hover on `hlmBtn`; row center tint |
| Upload panel location row | [`upload-panel.md`](../component/upload/upload-panel.md) | **done** | `hlmBtn` ghost + geometry-only SCSS |
| Upload intake outline buttons | [`upload-panel.md`](../component/upload/upload-panel.md) | **done** | Uses `hlmBtn` outline |
| Map upload FAB | [`upload-button-zone.md`](../component/upload/upload-button-zone.md) | **done** | `hlmBtn` outline + `_map-shell-upload.scss`; progress ring primary when uploading |
| File-type chips | [`file-type-chips.md`](../component/media/file-type-chips.md) | **done** | **Exception** — category colors |
| Switches | spartan switch CVA | **done** | **Exception** — on/off uses `--primary` fill |
| Auth `btn-primary` | auth specs | **done** | `variant="default"` + layout-only `.btn-primary` |
| Project select dialog | [`project-select-dialog.md`](../component/project-select-dialog/project-select-dialog.md) | **partial** | Verify ink inherit |
| Upload panel file row selection | [`upload-panel.md`](../component/upload/upload-panel.md) | **done** | Embedded `--selected` |
| Projects dropdown picker rows | media-detail-inline-section spec | **done** | `--selected` in projects picker |
| Grouping dropdown multi-select | [`dropdown-system.md`](../component/filters/dropdown-system.md) | **done** | `.grouping-row--selected` |
| Filter dropdown rule rows | [`filter-dropdown.md`](../component/filters/filter-dropdown.md) | **done** | row hover gold; picker `data-selected` = primary `engaged` |
| Media detail inline `__option--selected` | media-detail-inline-section spec | **done** | Tag chips unchanged |
| Search / address typeahead rows | address-search, metadata pickers | **pending** | Align to ink contract |
| `hlmBtn` secondary call sites | [`ui-primitives.button.md`](../component/ui-primitives/ui-primitives.button.md) | **done** | Migrated to `outline` (projects retry, media-empty) |
| Captured-date calendar day | captured-date-editor | **done** | `--selected` uses selected ink; hover via mixin |

## Grep hygiene

```bash
# Quiet buttons must not use accent hover in CVA
rg 'hover:bg-accent' apps/web/src/app/shared/ui/button/button-variants.ts

# Child primary override after emphasis.hover on same host (audit)
rg -l 'emphasis\.hover' apps/web/src/app --glob '*.scss' | xargs rg 'color: var\(--primary\)'

# Foreground lock on frosted menu triggers
rg 'menu-trigger' apps/web/src/app --glob '*.scss' -A2 | rg 'color: var\(--foreground\)'
```

## Changelog

- **2026-06-17 (d)** — Three-tier budget: primary gold / secondary blue / tertiary violet (`--interaction-nav-ink`).
- **2026-06-17 (c)** — Brix: `selected-hover` → gold; map style switch, markers, media tiles, toolbar triggers implemented.
- **2026-06-17 (b)** — Contract change: selected+hover = gold.
