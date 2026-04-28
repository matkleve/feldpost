# Dropdown system — class library reference

> Parent: [`dropdown-system.md`](./dropdown-system.md)

### Composable Class Library

| Class                | Purpose                            | Key tokens                                                                      |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| `.dd-search`         | Search input row                   | `padding: spacing-1 spacing-3`, `border-bottom: 1px solid color-border`         |
| `.dd-search__input`  | Text input inside search           | `0.8125rem`, no border, transparent bg                                          |
| `.dd-search__action` | Trailing icon button (clear, etc.) | `1.25rem` square, clay hover                                                    |
| `.dd-items`          | Items area wrapper                 | `padding: spacing-2`                                                            |
| `.dd-item`           | Base actionable row                | flex, `gap: spacing-2`, `padding: spacing-1 spacing-2`, `radius-sm`, clay hover |
| `.dd-item--active`   | Active/selected state              | `color: --color-clay`                                                           |
| `.dd-item--muted`    | Available/secondary row            | `color: --color-text-secondary`, primary on hover                               |
| `.dd-item--danger`   | Destructive action                 | `color: --color-danger` on label + icon                                         |
| `.dd-item__icon`     | Leading icon                       | `1rem`, `color-text-secondary`                                                  |
| `.dd-item__label`    | Label text                         | `flex: 1`, `text-align: left`                                                   |
| `.dd-item__trailing` | Trailing element                   | `margin-left: auto`                                                             |
| `.dd-section-label`  | Section header                     | `0.6875rem`, uppercase, `600` weight, `color-text-disabled`                     |
| `.dd-divider`        | Separator line                     | `1px`, `margin-block: spacing-1`, `color-border`                                |
| `.dd-empty`          | Empty state message                | centered, `spacing-3` padding, `color-text-disabled`                            |
| `.dd-action-row`     | Ghost "add" button                 | `margin: spacing-1 spacing-2`, clay hover                                       |
| `.dd-drag-handle`    | Drag handle icon                   | hidden, shows on `.dd-item:hover`                                               |

### Hover Color (canonical)

```scss
color-mix(in srgb, var(--color-clay) 8%, transparent)
```

This warm clay tint is used on **all** hover states — items, action rows, search clear buttons. No grey hover anywhere.

### Item Geometry

| Token          | Value                      |
| -------------- | -------------------------- |
| Padding-block  | `--spacing-1` (4px)        |
| Padding-inline | `--spacing-2` (8px)        |
| Gap            | `--spacing-2` (8px)        |
| Border-radius  | `--radius-sm` (4px)        |
| Font-size      | `0.8125rem` (13px)         |
| Icon size      | `1rem` (16px)              |
| Transition     | `background 80ms ease-out` |
