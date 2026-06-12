# Pane Header (workspace chrome)

> **Parent:** [workspace-pane.md](workspace-pane.md)

## What It Is

Title and chrome for the workspace pane: optional project color control, editable title, and close control. `WorkspacePaneHeaderComponent` is a thin standalone wrapper that forwards inputs/outputs to `PaneHeaderComponent`.

## What It Looks Like

Leading optional color button (swatch + palette icon), centered title or inline edit field, trailing close button. Compact row aligned to pane top padding tokens.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/pane-header.component.ts` (inline template), `workspace-pane-header/workspace-pane-header.component.ts` (wrapper)

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Clicks close | Emits `close` | Close button |
| 2 | Clicks color | Emits `colorPickerRequested` | Color enabled |
| 3 | Edits title | Emits `editSubmitted` / `editValueChange` | Title edit mode |

## Component Hierarchy

```
WorkspacePaneHeader (optional wrapper)
└── PaneHeader
    ├── Leading color button
    ├── Title / input
    └── Close
```

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Header row | `.pane-header` | `.pane-header` | buttons/input | `.pane-header__*` | content | one row |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| Title edit | `.pane-header__title-input` | editable signal | input | yes |

## Data

Inputs: `title`, `editable`, `editEnabled`, `editValue`, color-related inputs. Outputs: `close`, `editSubmitted`, `colorPickerRequested`, etc.

## State

Boolean inputs (`editable`, `editEnabled`, `colorPickerOpen`) compose edit and picker visibility; consolidate to a typed header visual state + `[attr.data-state]` in a follow-up refactor.

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/workspace-pane/pane-header.component.ts` | Header implementation |
| `apps/web/src/app/shared/workspace-pane/pane-header.component.scss` | Styles |
| `apps/web/src/app/shared/workspace-pane/workspace-pane-header/workspace-pane-header.component.ts` | Wrapper |
| `apps/web/src/app/shared/workspace-pane/workspace-pane-header/workspace-pane-header.component.scss` | Wrapper (if any) |

## Wiring

- Used by `WorkspacePaneComponent` for tabbed pane chrome.

## Acceptance Criteria

- [x] Close affordance emits to layout host to collapse pane.
- [ ] Optional: merge wrapper into single component if duplication adds no behavior.
