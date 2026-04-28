# Media Detail Header

> **Parent:** [media-detail-view.md](media-detail-view.md)

## What It Is

Back navigation, inline title editing trigger, file-type hint, and overflow context menu for actions registered for single-media workspace context.

## What It Looks Like

Top row: back chevron, title (text or input), optional type chip, trailing overflow menu.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/media-detail-header/`
- **Parent:** `MediaDetailViewComponent`

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Clicks back | Returns to grid (`detailMediaId` cleared by parent) | Navigation |
| 2 | Edits title | Emits title commit | Inline edit |
| 3 | Opens overflow | Shows contextual actions | Menu |

## Component Hierarchy

```
MediaDetailHeader
├── Back button
├── Title surface
├── Type label
└── Overflow menu
```

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Header bar | `.detail-header` | `.detail-header` | buttons | BEM under header | content | one row |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| Title edit | title control | `editingTitle` | input/button | partial |

## Data

Inputs include `displayTitle`, `titleValue`, `mediaTypeLabel`, `contextActions`, booleans for edit/menu visibility.

## State

Consolidate `editingTitle`, `showContextMenu`, and loading sensitivity into a typed header visual state + `[attr.data-state]` (planned refactor).

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/workspace-pane/media-detail-header/media-detail-header.component.ts` | Component |
| `apps/web/src/app/shared/workspace-pane/media-detail-header/media-detail-header.component.html` | Template |
| `apps/web/src/app/shared/workspace-pane/media-detail-header/media-detail-header.component.scss` | Styles |

## Wiring

- Actions resolved via workspace detail action registry / action engine.

## Acceptance Criteria

- [ ] Overflow menu uses dropdown primitives; no nested buttons.
- [ ] All strings via `t()` with keys registered in translation workbench.
