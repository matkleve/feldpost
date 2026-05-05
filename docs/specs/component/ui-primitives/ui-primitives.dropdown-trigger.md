# UI Primitives — Dropdown trigger

## What It Is

Button or anchor that **opens** a dropdown panel elsewhere; composes `ui-button` + `ui-dropdown-trigger`.

## What It Looks Like

Chevron trailing rotation when open; compact/icon-only modes hide label per SCSS.

## Where It Lives

- **Styles:** `apps/web/src/styles/primitives/dropdown-trigger.scss`, `button.scss`
- **Code:** `apps/web/src/app/shared/dropdown-trigger/ui-dropdown-trigger.directive.ts`

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Click trigger | Parent opens/closes panel |
| 2 | Toggle `open` input | Chevron rotation class |

## Component Hierarchy

```text
button | a [dropdown trigger]
├── projected icon/label
└── .ui-dropdown-trigger__chevron (template)
```

## API

| Input | Type |
| ----- | ---- |
| `size` | `'sm' \| 'md' \| 'lg'` |
| `open` | `boolean` |
| `collapse` | `'compact' \| 'icon-only' \| null` |

## Visual Behavior Contract

Open state rotates `.ui-dropdown-trigger__chevron`; compact hides label; icon-only hides label and chevron per SCSS.

## Acceptance Criteria

- [ ] Toolbar and panel triggers stay visually consistent with dropdown SCSS.
