# dropdown-trigger (shared)

Floating **dropdown shell**, toolbar stack, and domain toolbar panels. Visual chrome is **`option-menu-surface`** (`floating-panel-shell`); list rows use **`hlmMenuItem`** / `.option-menu-item`.

**Canonical spec:** [`docs/specs/component/filters/dropdown-system.md`](../../../../../../docs/specs/component/filters/dropdown-system.md)

## Composition

```text
app-toolbar-dropdown-stack          ← workspace / projects / media toolbars
  └── app-dropdown-shell            ← anchor, outside-close, Escape, width floors
        └── app-*-dropdown          ← sort | grouping | filter | projects
              └── app-standard-dropdown
                    ├── app-menu-panel-search-row (optional)
                    ├── `.standard-dropdown__items` host → `[dropdown-items]` (single `ng-content`; do not nest `app-menu-panel-scroll-region` — breaks projection)
                    └── app-menu-panel-footer-action (optional)
```

## Rules

- **Do not** add shell-level `padding` on feature panels — inset is on `.option-menu-surface` only.
- **Do not** duplicate `document:keydown.escape` on toolbar parents — shell emits `closeRequested`.
- Prefer **`scrollMode`** on `app-standard-dropdown` over raw `standard-dropdown__items--*` class strings.
- Toolbar standard width **18rem**; filter **32rem** floor — change only shell SCSS + `toolbar-menu-panel-layout.ts`.

## Menu panel primitives

Implemented under [`../menu-panel/`](../menu-panel/).
