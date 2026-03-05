# Workspace Pane

## What It Is

The right-side panel that shows image groups, thumbnails, and detail views. It's the user's working area for reviewing and organizing photos. Desktop: slides in from the right. Mobile: becomes a bottom sheet with three snap points.

## What It Looks Like

**Desktop:** 320px wide by default, resizable 280–640px via Drag Divider. `--color-bg-surface` background. Slides in from the right edge when opened. Contains Group Tab Bar at top, content area below (thumbnail grid or image detail).

**Mobile:** Bottom Sheet with drag handle. Three snap points: minimized (64px, shows handle + group name), half-screen (50vh, shows thumbnails), full-screen (100vh, shows detail). Map stays interactive in minimized and half-screen states.

**Drag Divider:** 4px vertical bar between map and workspace pane. `cursor: col-resize`. Desktop only.

## Where It Lives

- **Parent**: `MapShellComponent` template
- **Appears when**: User clicks a marker, selects images, or opens a group tab

## Actions

| #   | User Action                                 | System Response                                       | Triggers                    |
| --- | ------------------------------------------- | ----------------------------------------------------- | --------------------------- |
| 1   | Clicks a photo marker on map                | Workspace pane opens with Active Selection tab        | `workspacePaneOpen` → true  |
| 2   | Drags the Drag Divider                      | Resizes workspace pane width (clamped 280–640px)      | CSS width change            |
| 3   | Clicks close button                         | Workspace pane slides out                             | `workspacePaneOpen` → false |
| 4   | Swipes down on bottom sheet handle (mobile) | Snaps to lower position or closes                     | Snap point logic            |
| 5   | Swipes up on bottom sheet handle (mobile)   | Snaps to higher position                              | Snap point logic            |
| 6   | Clicks a thumbnail in the grid              | Image Detail View replaces grid, back arrow to return | Detail view state           |
| 7   | Selects a group tab                         | Content switches to that group's thumbnails           | Active tab change           |

## Component Hierarchy

```
WorkspacePane                              ← right panel (desktop) or bottom sheet (mobile)
├── [desktop] DragDivider                  ← 4px vertical bar, cursor: col-resize
├── PaneHeader                             ← close button + group name
├── GroupTabBar                            ← scrollable horizontal tabs (see group-tab-bar spec)
├── SortingControls                        ← Date↓, Date↑, Distance, Name
└── ContentArea                            ← switches between:
    ├── ThumbnailGrid                      ← default view (see thumbnail-grid spec)
    └── [detail selected] ImageDetailView  ← replaces grid (see image-detail-view spec)
```

### Bottom Sheet (mobile variant)

```
BottomSheet                                ← fixed bottom, full width
├── DragHandle                             ← 40×4px pill at top center
├── [minimized] GroupNamePreview           ← tab name + image count
└── [half/full] same children as WorkspacePane above
```

## State

| Name              | Type                              | Default       | Controls                                 |
| ----------------- | --------------------------------- | ------------- | ---------------------------------------- |
| `isOpen`          | `boolean`                         | `false`       | Pane visibility                          |
| `width`           | `number`                          | `320`         | Desktop pane width in px                 |
| `activeTabId`     | `string`                          | `'selection'` | Which group tab is active                |
| `detailImageId`   | `string \| null`                  | `null`        | If set, show detail view instead of grid |
| `mobileSnapPoint` | `'minimized' \| 'half' \| 'full'` | `'minimized'` | Mobile bottom sheet position             |

## File Map

| File                                                        | Purpose                         |
| ----------------------------------------------------------- | ------------------------------- |
| `features/map/workspace-pane/workspace-pane.component.ts`   | Main pane component             |
| `features/map/workspace-pane/workspace-pane.component.html` | Template                        |
| `features/map/workspace-pane/workspace-pane.component.scss` | Styles + responsive behavior    |
| `features/map/workspace-pane/drag-divider.component.ts`     | Resize handle (inline template) |

## Wiring

- Imported in `MapShellComponent` template, placed after Map Zone
- Receives `activeTabId` and `detailImageId` from parent or via service
- Drag Divider emits width changes to parent for map reflow

## Acceptance Criteria

- [ ] Desktop: slides in from right with smooth transition
- [ ] Desktop: resizable via Drag Divider (280–640px range)
- [ ] Mobile: bottom sheet with 3 snap points (64px, 50vh, 100vh)
- [ ] Mobile: drag handle works for snapping
- [ ] Map stays interactive when pane is open
- [ ] Close button hides the pane
- [ ] Content switches between thumbnail grid and image detail
- [ ] Group Tab Bar is scrollable horizontally
