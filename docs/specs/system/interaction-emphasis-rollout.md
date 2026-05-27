# Interaction emphasis — rollout tracker

**Canonical contract:** [`docs/design/state-visuals.md`](../../design/state-visuals.md) § Interaction emphasis  
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
| `hlmBtn` outline/ghost | [`button-variants.ts`](../../../apps/web/src/app/shared/ui/button/button-variants.ts) | **done** | Global quiet-button CVA |
| `hlmBtn` default/destructive | same | **done** | Filled CTAs — exception (solid fill) |
| `hlmBtn` secondary | same | **done** | No product call sites; use `outline` for quiet actions |
| Toggle group items | [`toggle-group-variants.ts`](../../../apps/web/src/app/shared/ui/toggle-group/toggle-group-variants.ts) | **done** | on = selected ink; on+hover = primary |
| Nav sidebar links | [`sidebar.md`](../component/workspace/sidebar.md) | **done** | |
| Menu rows | [`_option-menu-item-states.scss`](../../../apps/web/src/styles/_option-menu-item-states.scss) | **done** | Hover/highlight = primary; no persistent checked row in product menus |
| Dropdown toolbar triggers | [`dropdown-system.md`](../component/filters/dropdown-system.md) | **done** | Active = selected ink; hover = primary (`_toolbar-breakpoints.scss`) |
| Detail row ghost actions | [`media-detail` specs](../component/workspace/) | **partial** | Removed duplicate hover on `hlmBtn`; `--mdv-action-bg-hover` on inline `__primary` remains |
| Upload panel location row | [`upload-panel.md`](../component/upload/upload-panel.md) | **done** | `hlmBtn` ghost + geometry-only SCSS |
| Upload intake outline buttons | [`upload-panel.md`](../component/upload/upload-panel.md) | **done** | Uses `hlmBtn` outline |
| Map upload FAB | [`upload-button-zone.md`](../component/upload/upload-button-zone.md) | **done** | `hlmBtn` outline + `_map-shell-upload.scss`; progress ring primary when uploading |
| File-type chips | [`file-type-chips.md`](../component/media/file-type-chips.md) | **done** | **Exception** — category colors |
| Switches | spartan switch CVA | **done** | **Exception** — on/off uses `--primary` fill |
| Auth `btn-primary` | auth specs | **done** | `variant="default"` + layout-only `.btn-primary` |
| Tabs (`hlmTabsTrigger`) | [`tabs-variants.ts`](../../../apps/web/src/app/shared/ui/tabs/tabs-variants.ts), [`ui-primitives.tab.md`](../component/ui-primitives/ui-primitives.tab.md) | **done** | Active = selected ink; hover = primary |
| Upload resolver tray choices | [`upload-resolver-tray.md`](../component/upload/upload-resolver-tray.md) | **done** | `__choice--selected` + selected:hover |
| Settings overlay rail / TOC | [`settings-overlay.md`](../ui/settings-overlay/settings-overlay.md) | **done** | Rail + TOC + section icons |
| Project select dialog | [`project-select-dialog.md`](../component/project-select-dialog/project-select-dialog.md) | **done** | `--active` row |
| Upload panel file row selection | [`upload-panel.md`](../component/upload/upload-panel.md) | **done** | Embedded `--selected` |
| Projects dropdown picker rows | media-detail-inline-section spec | **done** | `--selected` in projects picker |
| Grouping dropdown multi-select | [`dropdown-system.md`](../component/filters/dropdown-system.md) | **done** | `.grouping-row--selected` |
| Media detail inline `__option--selected` | media-detail-inline-section spec | **done** | Tag chips unchanged |
| Search / address typeahead rows | address-search, metadata pickers | **done** | **Exception** — transient focus/hover stays primary |
| `hlmBtn` secondary call sites | [`ui-primitives.button.md`](../component/ui-primitives/ui-primitives.button.md) | **done** | Migrated to `outline` (projects retry, media-empty) |
| Captured-date calendar day | captured-date-editor | **done** | `--selected` uses selected ink |
| Quiet-row SCSS mixin | [`_interaction-emphasis-quiet-row.scss`](../../../apps/web/src/styles/_interaction-emphasis-quiet-row.scss) | **done** | Shared hover/selected/selected-hover |

## Grep hygiene

```bash
# Quiet buttons must not use accent hover in CVA
rg 'hover:bg-accent' apps/web/src/app/shared/ui/button/button-variants.ts

# Avoid new duplicate primary hover on hlmBtn hosts (audit after changes)
rg 'color-mix.*var\(--primary\).*10%' apps/web/src/app --glob '*.scss'
```
