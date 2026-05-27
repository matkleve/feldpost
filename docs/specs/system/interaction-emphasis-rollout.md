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
| `hlmBtn` secondary | same | **pending** | 2 callsites; olive fill — deprecate in favor of `outline` |
| Toggle group items | [`toggle-group-variants.ts`](../../../apps/web/src/app/shared/ui/toggle-group/toggle-group-variants.ts) | **done** | on = selected ink; on+hover = primary |
| Nav sidebar links | [`sidebar.md`](../component/workspace/sidebar.md) | **done** | |
| Menu rows | [`_option-menu-item-states.scss`](../../../apps/web/src/styles/_option-menu-item-states.scss) | **partial** | Hover primary; persistent selected row TBD |
| Dropdown toolbar triggers | [`dropdown-system.md`](../component/filters/dropdown-system.md) | **done** | Active = selected ink; hover = primary (`_toolbar-breakpoints.scss`) |
| Detail row ghost actions | [`media-detail` specs](../component/workspace/) | **partial** | Removed duplicate hover on `hlmBtn`; `--mdv-action-bg-hover` on inline `__primary` remains |
| Upload panel location row | [`upload-panel.md`](../component/upload/upload-panel.md) | **done** | `hlmBtn` ghost + geometry-only SCSS |
| Upload intake outline buttons | [`upload-panel.md`](../component/upload/upload-panel.md) | **done** | Uses `hlmBtn` outline |
| Map upload FAB | [`upload-button-zone.md`](../component/upload/upload-button-zone.md) | **done** | `hlmBtn` outline + `_map-shell-upload.scss`; progress ring primary when uploading |
| File-type chips | [`file-type-chips.md`](../component/media/file-type-chips.md) | **done** | **Exception** — category colors |
| Switches | spartan switch CVA | **done** | **Exception** — on/off uses `--primary` fill |
| Auth `btn-primary` | auth specs | **done** | `variant="default"` + layout-only `.btn-primary` |

## Grep hygiene

```bash
# Quiet buttons must not use accent hover in CVA
rg 'hover:bg-accent' apps/web/src/app/shared/ui/button/button-variants.ts

# Avoid new duplicate primary hover on hlmBtn hosts (audit after changes)
rg 'color-mix.*var\(--primary\).*10%' apps/web/src/app --glob '*.scss'
```
