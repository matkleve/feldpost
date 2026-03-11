# Image Detail — Actions & Marker Sync

> **Parent spec:** [image-detail-view](image-detail-view.md)
> **Upload manager use cases:** [use-cases/upload-manager.md](../use-cases/upload-manager.md)
> **Map shell use cases:** [use-cases/map-shell.md](../use-cases/map-shell.md)

## What It Is

The actions section at the bottom of the Image Detail View and the marker synchronization system that keeps map markers up to date when image properties change. Actions include editing location (correction mode), project assignment, coordinate copying, and image deletion.

## What It Looks Like

Actions use **`dd-item`** button styling — not bordered outline buttons. Each action is a full-width row with a leading Material icon (`1rem`, `--color-text-secondary`), label text (`0.8125rem`), `dd-item` hover (warm clay tint), and `--radius-sm` border radius. A `dd-divider` separates destructive actions from normal ones. The delete action uses `dd-item--danger` style (red icon + label).

```pseudo
┌─ 🗺️  Edit location          ─┐   ← dd-item style, clay hover
├─ 📁  Add to project          ─┤   ← dd-item style, clay hover
├─ 📋  Copy coordinates        ─┤   ← dd-item style, clay hover
├──────────────────────────────-─┤   ← dd-divider
└─ 🗑️  Delete image            ─┘   ← dd-item--danger style
```

## Where It Lives

- **Parent**: `ImageDetailViewComponent` — ActionsSection at bottom of metadata column
- **Appears when**: Image detail view is open and image data is loaded

## Actions

| #   | User Action               | System Response                                           | Triggers            |
| --- | ------------------------- | --------------------------------------------------------- | ------------------- |
| 1   | Clicks "Edit location"    | Enters correction mode (drag marker on map)               | Correction flow     |
| 2   | Clicks "Add to project"   | Opens project picker                                      | Project assignment  |
| 3   | Clicks "Copy coordinates" | Copies coordinates to clipboard, shows toast confirmation | Clipboard + toast   |
| 4   | Clicks "Delete image"     | Shows delete confirmation dialog                          | `showDeleteConfirm` |
| 5   | Confirms delete           | Deletes image from DB and storage, returns to grid        | Supabase delete     |
| 6   | Cancels delete            | Dismisses dialog                                          | Dialog dismissed    |

## Marker Sync — Live Updates

When the user makes changes in the detail view, the corresponding **photo marker on the map must update** without a full viewport refresh:

| Change Type                | Channel                                  | Marker Effect                                        |
| -------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| Photo replaced             | `UploadManagerService.imageReplaced$`    | Marker DivIcon rebuilt with new thumbnail            |
| Photo uploaded (photoless) | `UploadManagerService.imageAttached$`    | Marker DivIcon updated: placeholder → real thumbnail |
| Coordinate correction      | Correction mode in MapShell (user drags) | Marker already at new position from drag             |
| Address / metadata edits   | DB update only                           | No marker update needed                              |

### Key Design Principle

The detail view **does not emit output events for marker sync**. Instead:

- **Photo changes** → delegate to `UploadManagerService` → manager emits `imageReplaced$` / `imageAttached$` → `MapShellComponent` subscribes directly
- **Coordinate changes** → handled by correction mode in `MapShellComponent` (marker drag is a map-layer operation)
- **Metadata edits** → saved to DB; no immediate marker visual change needed

### Correction Mode Integration

1. Detail emits `(editLocationRequested)` with the imageId
2. Map Shell enters correction mode — marker becomes draggable
3. User drags marker to new position and confirms
4. Map Shell writes the correction to `coordinate_corrections` and updates `images.latitude` / `images.longitude`
5. Map Shell emits new coords back to Detail via shared signal or callback
6. Detail refreshes its `image` signal to show updated GPS row
7. Marker is already at new position from the drag

## Component Hierarchy

```
ActionsSection                         ← dd-section-label "Actions", dd-item styled rows
├── EditLocationAction                 ← dd-item: edit_location icon + "Edit location"
├── AddToProjectAction                 ← dd-item: folder_open icon + "Add to project"
├── CopyCoordinatesAction              ← dd-item: content_copy icon + "Copy coordinates"
├── dd-divider
└── DeleteAction                       ← dd-item--danger: delete icon + "Delete image"

[confirm] DeleteConfirmDialog          ← modal with cancel/confirm
```

## State

| Name                | Type      | Default | Controls                              |
| ------------------- | --------- | ------- | ------------------------------------- |
| `showDeleteConfirm` | `boolean` | `false` | Delete confirmation dialog visibility |
| `showContextMenu`   | `boolean` | `false` | Context menu visibility               |

## Acceptance Criteria

- [ ] Actions use **dd-item** button styling (not bordered outline buttons)
- [ ] Each action: leading icon + label text, `0.8125rem` font
- [ ] Hover uses warm clay tint matching all dropdown items
- [ ] Delete action uses `dd-item--danger` style (red icon + label)
- [ ] `dd-divider` separates destructive actions from normal ones
- [ ] Edit location button starts marker correction mode
- [ ] Add to project opens project picker
- [ ] Copy coordinates writes to clipboard with toast confirmation
- [ ] Delete confirmation dialog shown before removal
- [ ] Replace Photo triggers marker thumbnail update via `UploadManagerService.imageReplaced$` (not direct output events)
- [ ] Photo upload to photoless row triggers marker update via `UploadManagerService.imageAttached$`
- [ ] Coordinate edit handled by MapShell directly — marker already at new position from drag
- [ ] No output events for marker sync — flows through service layer
- [ ] Metadata edits saved to DB only — no immediate marker visual change needed
