# UI Primitives — Dropdown trigger

## Migration status (2026-05-16)

The **`UiDropdownTriggerDirective`** and **`apps/web/src/styles/primitives/dropdown-trigger.scss`** were **removed** (Phase 5 Group D). Toolbar anchors use **`hlmBtn`** (`variant="outline"`, `size="sm"`) plus per-component classes **`media-toolbar__menu-trigger`**, **`projects-toolbar__menu-trigger`**, **`workspace-toolbar__menu-trigger`** with **`--open`** for chevron rotation; **`[data-dd-part]`** on inner spans is unchanged. **`DropdownShellComponent`** / **`StandardDropdownComponent`** remain the floating shell and list chrome.

The remainder of this file documents the **removed** directive contract for archive comparison until **`BrnMenu` / `BrnMenuTrigger`** replace **`DropdownShellComponent`**.

## What It Is (archived)

`UiDropdownTriggerDirective` styled **`button[uiDropdownTrigger]`** and **`a[uiDropdownTrigger]`** hosts that open a floating shell (popover/menu). The directive merged **menu-item surface tokens** (`menuItemVariants()`), **`ui-button`** size classes, and **dropdown modifiers** (`ui-dropdown-trigger`, `--open`, `--compact`, `--icon-only`). It did **not** render inner chrome — **callsites** supplied label/chevron (and optional leading icon) using **`data-dd-part`** so global SCSS could target geometry and open/collapse behavior without BEM `__chevron` / `__label` wrappers.

## What It Looks Like (archived)

- **Open:** host got `ui-dropdown-trigger--open`; chevron rotation was applied to **`[data-dd-part='chevron']`** (see removed SCSS).
- **Compact / icon-only:** modifiers hid **`[data-dd-part='label']`**; icon-only also hid the chevron and restored icon font metrics on **`.material-icons` / `[data-dd-part='icon']`** per removed `dropdown-trigger.scss`.

## Where It Lives (removed)

- **Directive (deleted):** ~~`apps/web/src/app/shared/dropdown-trigger/ui-dropdown-trigger.directive.ts`~~
- **Global SCSS (deleted):** ~~`apps/web/src/styles/primitives/dropdown-trigger.scss`~~
- **Button baseline:** superseded by **`hlmBtn`** / `button-variants.ts` (Phase 5)

## Toolbar reference callsites (inner DOM + Tailwind)

Patterns match across toolbars; label/chevron use **`data-dd-part`** and **Tailwind** on the inner spans (e.g. truncate, `material-icons` sizing); rotation/transform rules live in **per-toolbar component SCSS** (`*__menu-trigger--open`).

- `apps/web/src/app/features/media/media.component.html` — media pane toolbar dropdown triggers
- `apps/web/src/app/shared/workspace-pane/toolbar/workspace-toolbar/workspace-toolbar.component.html` — workspace toolbar
- `apps/web/src/app/features/projects/projects-toolbar.component.html` — projects toolbar

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Click trigger | Parent opens/closes panel |
| 2 | Parent sets open / collapse (archived) | Host modifier classes updated; SCSS updated chevron / visibility |

## Component hierarchy

```text
button [hlmBtn] + toolbar menu-trigger BEM class   ← hlmBtn outline + component SCSS
├── span [data-dd-part="label"]
├── (optional) leading icon / [data-dd-part="icon"]
└── span [data-dd-part="chevron"]   ← per-toolbar SCSS: --open rotates chevron
```

**Stacking / hit area:** the **host** is the single interactive control; inner spans are presentational (`aria-hidden` on chevron where used).

## API (removed directive — archive)

| Input | Type |
| ----- | ---- |
| `size` | `'sm' \| 'md' \| 'lg'` |
| `open` | `boolean` |
| `collapse` | `'compact' \| 'icon-only' \| null` |

**Current:** `hlmBtn` `size` / `variant` inputs; open chevron via **`[class.*__menu-trigger--open]`** on the host button.

## Visual Behavior Contract

### Ownership matrix (shipped: `hlmBtn` + toolbar classes)

| Behavior | Visual geometry owner | Stacking context owner | Interaction hit-area owner | Selector(s) | Layer | Test oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Open chevron rotation | `[data-dd-part='chevron']` | host (`button`) | host | `.*__menu-trigger--open [data-dd-part='chevron']` | content | Chevron rotates 180° when dropdown shell open |
| Active filter/grouping tint | host (`button`) | host | host | `button.*__menu-trigger[data-state='on']` | — | Accent fill when grouping/filter active |

### Ownership matrix (archived: `ui-dropdown-trigger*`)

| Behavior | Visual geometry owner | Stacking context owner | Interaction hit-area owner | Selector(s) | Layer | Test oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Open chevron rotation | `[data-dd-part='chevron']` | host (`button` / `a`) | host | `.ui-dropdown-trigger--open [data-dd-part='chevron']` | content | (removed) |
| Compact hide label | `[data-dd-part='label']` | host | host | `.ui-dropdown-trigger--compact [data-dd-part='label']` | — | (removed) |
| Icon-only chrome | `[data-dd-part='label']`, `[data-dd-part='chevron']` | host | host | `.ui-dropdown-trigger--icon-only` + part selectors | — | (removed) |

### Triad summary

| Behavior | Geometry owner | State owner | Visual owner | Same element? |
| --- | --- | --- | --- | --- |
| Chevron rotation | `[data-dd-part='chevron']` | host (`*__menu-trigger--open`) | `[data-dd-part='chevron']` | ⚠️ exception — open class on host, transform on part |
| Collapse visibility | (removed) | — | — | — |

## Acceptance Criteria

- [x] Toolbar triggers use **`hlmBtn`** + per-toolbar `*__menu-trigger` classes; **`uiDropdownTrigger`** cleared from templates (Phase 5 Group D, 2026-05-16).
- [x] Inner chrome uses **`data-dd-part`** (`label`, `chevron`, optional `icon`) — not removed BEM **`__label` / `__chevron`** class trees.
