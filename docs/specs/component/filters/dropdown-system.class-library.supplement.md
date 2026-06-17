# Dropdown system — legacy `dd-*` name mapping

> Parent: [`dropdown-system.md`](./dropdown-system.md)

The historical **`dd-*`** composable class library described in early drafts **is not shipped** in `apps/web/src/styles.scss`. Use this table when reading older specs, audits, or comments. **Normative implementation** is in the parent spec (shell, menu body, option-menu rows).

## Class mapping (legacy → shipped)

| Legacy `dd-*` | Shipped equivalent |
| --- | --- |
| `.dd-search` | `app-menu-panel-search-row` / `.standard-dropdown__search` |
| `.dd-search__input` | `.standard-dropdown__search-field` |
| `.dd-search__action` | `.standard-dropdown__search-icon-btn` + `[dropdown-search-action]` slot |
| `.dd-items` | `.standard-dropdown__items` + `[dropdown-items]` projection |
| `.dd-item` | `hlmMenuItem` host class **`.option-menu-item`** (`menu-variants.ts`) |
| `.dd-item--active` | Feature modifiers (e.g. `.sort-dropdown__option--active`) + `interaction-selected-ink` |
| `.dd-item--danger` | `.option-menu-item.text-destructive` |
| `.dd-item__icon` | `.option-menu-item__icon` |
| `.dd-item__label` | Row label span (flex child) |
| `.dd-item__trailing` | Trailing slot (checkbox, sort direction, count) |
| `.dd-section-label` | `hlmMenuLabel` + `.option-menu-label` / `.dropdown-section` |
| `.dd-divider` | `hlmMenuSeparator` |
| `.dd-empty` | Empty copy in feature template (Tailwind utility classes) |
| `.dd-action-row` | `app-menu-panel-footer-action` / `standard-dropdown` footer `actionLabel` |
| `.dd-drag-handle` | `.grouping-dropdown__drag-handle` |

## Hover and geometry (shipped)

| Concern | Owner |
| --- | --- |
| Default row hover | `_option-menu-item-states.scss` — `emphasis.hover` + child `color: inherit` |
| Persistent sort selection | `sort-dropdown.component.scss` — **`var(--interaction-selected-ink)`** |
| Toolbar trigger hover ink | `_toolbar-menu-trigger.scss` + per-toolbar SCSS — no foreground lock on frosted hosts |
| Row padding / gap / radius | `_option-menu-list.scss` — `.option-menu-item` |
| List vertical gap (2px) | `_option-menu-surface.scss` on `.standard-dropdown__items` and `[dropdown-items]` |

Do **not** add new global `dd-*` classes; extend menu-panel primitives or feature SCSS with spec reference.
