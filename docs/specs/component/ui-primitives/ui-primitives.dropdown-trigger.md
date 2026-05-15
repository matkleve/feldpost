# UI Primitives — Dropdown trigger

## What It Is

`UiDropdownTriggerDirective` styles **`button[uiDropdownTrigger]`** and **`a[uiDropdownTrigger]`** hosts that open a floating shell (popover/menu). The directive merges **menu-item surface tokens** (`menuItemVariants()`), **`ui-button`** size classes, and **dropdown modifiers** (`ui-dropdown-trigger`, `--open`, `--compact`, `--icon-only`). It does **not** render inner chrome — **callsites** supply label/chevron (and optional leading icon) using **`data-dd-part`** so global SCSS can target geometry and open/collapse behavior without BEM `__chevron` / `__label` wrappers.

## What It Looks Like

- **Open:** host gets `ui-dropdown-trigger--open`; chevron rotation is applied to **`[data-dd-part='chevron']`** (see SCSS).
- **Compact / icon-only:** modifiers hide **`[data-dd-part='label']`**; icon-only also hides the chevron and restores icon font metrics on **`.material-icons` / `[data-dd-part='icon']`** per `dropdown-trigger.scss`.

## Where It Lives

- **Directive (host classes):** `apps/web/src/app/shared/dropdown-trigger/ui-dropdown-trigger.directive.ts`
- **Global SCSS (parts + modifiers):** `apps/web/src/styles/primitives/dropdown-trigger.scss` — selectors **`.ui-dropdown-trigger [data-dd-part='…']`**, **`.ui-dropdown-trigger--open`**, **`.ui-dropdown-trigger--compact`**, **`.ui-dropdown-trigger--icon-only`**
- **Button baseline:** `apps/web/src/styles/primitives/button.scss` (inherited `ui-button*` geometry)

## Toolbar reference callsites (inner DOM + Tailwind)

Patterns match across toolbars; label/chevron use **`data-dd-part`** and **Tailwind** on the inner spans (e.g. truncate, `material-icons` sizing); rotation/transform rules stay in **`dropdown-trigger.scss`**.

- `apps/web/src/app/features/media/media.component.html` — media pane toolbar dropdown triggers
- `apps/web/src/app/shared/workspace-pane/toolbar/workspace-toolbar/workspace-toolbar.component.html` — workspace toolbar
- `apps/web/src/app/features/projects/projects-toolbar.component.html` — projects toolbar

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Click trigger | Parent opens/closes panel |
| 2 | Parent sets `open` / collapse inputs | Host modifier classes update; SCSS updates chevron / visibility |

## Component hierarchy

```text
button | a [uiDropdownTrigger]     ← directive: ui-button + ui-dropdown-trigger + modifiers
├── span [data-dd-part="label"]   ← callsite content + Tailwind as needed
├── (optional) leading icon / [data-dd-part="icon"]
└── span [data-dd-part="chevron"] ← callsite + Tailwind; SCSS applies open rotation
```

**Stacking / hit area:** the **host** is the single interactive control; inner spans are presentational (`aria-hidden` on chevron where used).

## API

| Input | Type |
| ----- | ---- |
| `size` | `'sm' \| 'md' \| 'lg'` |
| `open` | `boolean` |
| `collapse` | `'compact' \| 'icon-only' \| null` |

## Visual Behavior Contract

### Ownership matrix

| Behavior | Visual geometry owner | Stacking context owner | Interaction hit-area owner | Selector(s) | Layer | Test oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Open chevron rotation | `[data-dd-part='chevron']` | host (`button` / `a`) | host | `.ui-dropdown-trigger--open [data-dd-part='chevron']` | content | Chevron rotates 180° when `open` true |
| Compact hide label | `[data-dd-part='label']` | host | host | `.ui-dropdown-trigger--compact [data-dd-part='label']` | — | Label not displayed |
| Icon-only chrome | `[data-dd-part='label']`, `[data-dd-part='chevron']` | host | host | `.ui-dropdown-trigger--icon-only` + part selectors | — | Only icon visible; icon font size restored |

### Triad summary

| Behavior | Geometry owner | State owner | Visual owner | Same element? |
| --- | --- | --- | --- | --- |
| Chevron rotation | `[data-dd-part='chevron']` | host (`ui-dropdown-trigger--open`) | `[data-dd-part='chevron']` | ⚠️ exception — open class on host, transform on part; documented in SCSS |
| Collapse visibility | `[data-dd-part='label']` / chevron | host (`--compact` / `--icon-only`) | same parts | ⚠️ same pattern |

## Acceptance Criteria

- [ ] Toolbar and panel triggers stay visually consistent with `dropdown-trigger.scss` and host `ui-button` sizing.
- [ ] New callsites use **`data-dd-part`** (`label`, `chevron`, optional `icon`) for any inner chrome the primitive SCSS must style — not removed BEM **`__label` / `__chevron`** class trees.
