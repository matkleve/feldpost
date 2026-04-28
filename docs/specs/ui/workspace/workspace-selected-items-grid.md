# Workspace Selected Items Grid

> **Parent:** [workspace-pane.md](workspace-pane.md)  
> **Grid primitive:** [item-grid.md](../../component/item-grid/item-grid.md)

## What It Is

Host component for the Selected Items tab: wires `WorkspaceViewService` output to `ItemGridComponent` with `MediaItemComponent` tiles, empty and loading states, grouping headers, context menus, and map-linked hover. It is the canonical runtime surface for workspace grid behavior (legacy thumbnail-grid hosts were removed).

## What It Looks Like

Scrollable column filling space below the workspace toolbar. When media exists, an item grid with responsive modes; when empty, centered empty or filter-empty states; while loading, skeleton placeholders. Group headers appear when grouping is active. Selection checkboxes follow the quiet-actions pattern on tiles.

## Where It Lives

- **Code:** `apps/web/src/app/shared/workspace-pane/workspace-selected-items-grid.component.ts`
- **Parent:** `WorkspacePaneComponent` when `activeTab === 'selected-items'` and `detailMediaId === null`

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Scrolls grid | Virtual range updates; signed URLs for newly visible items | Viewport change |
| 2 | Clicks tile | Opens media detail (parent sets `detailMediaId`) | Click |
| 3 | Toggles selection checkbox | Updates `WorkspaceSelectionService` | Toggle |
| 4 | Opens row context menu | Emits context actions per action matrix | Menu |

## Component Hierarchy

```
WorkspaceSelectedItemsGrid
├── WorkspaceToolbar (sibling in pane — hosted by parent; grid sits below in pane stack)
├── Group headers (when grouped)
├── ItemGrid
│   └── MediaItem × N (projected)
└── Dialogs / overlays (export helpers, project/address prompts as wired)
```

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Grid scroll region | `.thumbnail-grid` / item grid host | `:host` | `app-item-grid` | `.workspace-pane` nested scroll | content | scroll clips to pane |
| Empty state | empty state block | `:host` | primary CTA | `.thumbnail-grid__empty` (legacy BEM; rename tracked) | content | message visible |
| Linked hover | item surface | `MediaItem` | tile root | item selected/hover classes | surface/hover | map marker highlight sync |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| --- | --- | --- | --- | --- |
| Tile selection ring | media frame | media item | media frame | yes |

## Data

| Source | Contract |
| --- | --- |
| `WorkspaceViewService` | `groupedSections`, `rawImages`, pipeline flags |
| `WorkspaceSelectionService` | `selectedMediaIds` |
| `MediaDownloadService` | Signed URLs for tiles |

## State

Programmatic UI states include loading, empty, filter-empty, grouped vs flat; expose `[attr.data-state]` on the component root after FSM consolidation (see implementation checklist).

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/shared/workspace-pane/workspace-selected-items-grid.component.ts` | Logic, signals, grid wiring |
| `apps/web/src/app/shared/workspace-pane/workspace-selected-items-grid.component.html` | Template |
| `apps/web/src/app/shared/workspace-pane/workspace-selected-items-grid.component.scss` | Layout and region styles |
| `apps/web/src/app/core/workspace-view/workspace-media-mapper.ts` | `WorkspaceMedia` → `ImageRecord` |

## Wiring

- Consumes `WorkspaceViewService`, `WorkspaceSelectionService`, `MediaDownloadService`, and pane observer hooks as injected by parent routes.
- Projects `MediaItemComponent` into `ItemGridComponent` per item-grid spec.

## Acceptance Criteria

- [x] Uses `ItemGridComponent` and `MediaItemComponent` for tiles (no legacy thumbnail-card host).
- [ ] Root exposes a single typed visual state driver `[attr.data-state]` aligned with FSM when programmatic states apply.
- [ ] Legacy class prefix `thumbnail-grid__*` and i18n keys `workspace.thumbnailGrid.*` renamed in a coordinated pass (spec-first).
