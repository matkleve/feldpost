# Media Detail — Actions & Marker Sync

> **Parent spec:** [media-detail-view](media-detail-view.md)
> **Upload manager use cases:** [use-cases/upload-manager.md](../../../use-cases/upload-manager.md)
> **Map shell use cases:** [use-cases/map-shell.md](../../../use-cases/map-shell.md)

## What It Is

The actions section at the bottom of the Media Detail View and the marker synchronization system that keeps map markers up to date when media properties change. The same single-media action contract is available in the detail header 3-dot menu and via right-click on the detail thumbnail surface.

This surface consumes the canonical matrix actions `open_details_or_selection`, `open_in_media`, `zoom_house`, `zoom_street`, `assign_to_project`, `change_location_map`, `change_location_address`, `copy_address`, `copy_gps`, `open_google_maps`, `remove_from_project`, and `delete_media`.

## What It Looks Like

Actions use **`dd-item`** button styling — not bordered outline buttons. Each action is a full-width row with a leading Material icon (`1rem`, `--color-text-secondary`), label text (`0.8125rem`), `dd-item` hover (warm clay tint), and `--radius-sm` border radius. A `dd-divider` separates destructive actions from normal ones. The delete action uses `dd-item--danger` style (red icon + label).

```pseudo
┌─ [icon] Zoom to location    ─┐   ← dd-item style, clay hover
├─ 📁  Assign project          ─┤   ← dd-item style, clay hover
├─ 📋  Copy coordinates        ─┤   ← dd-item style, clay hover
├─ ⬇️  Download media          ─┤   ← dd-item style, clay hover
├──────────────────────────────-─┤   ← dd-divider
└─ 🗑️  Delete media            ─┘   ← dd-item--danger style
```

## Where It Lives

- **Parent**: `MediaDetailViewComponent` — ActionsSection at bottom of metadata column
- **Appears when**: Media detail view is open and media data is loaded

## Actions

| #   | User Action                        | System Response                                                     | Triggers            |
| --- | ---------------------------------- | ------------------------------------------------------------------- | ------------------- |
| 1   | Clicks "Open details"              | Keeps detail view open and confirms current context                 | Info toast          |
| 2   | Clicks "Zoom to location"          | Pans & zooms map to media coordinates, highlights marker with pulse | Map flyTo + marker  |
| 3   | Clicks "Assign project"            | Opens project membership picker (multi-select)                      | Project memberships |
| 4   | Clicks "Copy coordinates"          | Copies coordinates to clipboard, shows toast confirmation           | Clipboard + toast   |
| 5   | Clicks "Copy address"              | Copies resolved detail address text to clipboard                    | Clipboard + toast   |
| 6   | Clicks "Open in Google Maps"       | Opens a new browser tab with marker coordinates                     | Browser navigation  |
| 7   | Clicks "Change location (map)"     | Starts map-pick relocation flow in map shell                        | Map pick mode       |
| 8   | Clicks "Change location (address)" | Opens address-search inline editing in detail section               | Inline address edit |
| 9   | Clicks "Remove from project"       | Removes media from assigned projects                                | Project memberships |
| 10  | Clicks "Delete media"              | Shows delete confirmation dialog                                    | `showDeleteConfirm` |
| 11  | Confirms delete                    | Deletes media from DB and storage, returns to grid                  | Supabase delete     |
| 12  | Cancels delete                     | Dismisses dialog                                                    | Dialog dismissed    |

## Marker Sync — Live Updates

When the user makes changes in the detail view, the corresponding **media marker on the map must update** without a full viewport refresh:

| Change Type                | Channel                                  | Marker Effect                                        |
| -------------------------- | ---------------------------------------- | ---------------------------------------------------- |
| Media replaced             | `UploadManagerService.imageReplaced$`    | Marker DivIcon rebuilt with new thumbnail            |
| Media uploaded (row had no file yet) | `UploadManagerService.imageAttached$`    | Marker DivIcon updated: placeholder → real thumbnail |
| Coordinate correction      | Correction mode in MapShell (user drags) | Marker already at new position from drag             |
| Address / metadata edits   | DB update only                           | No marker update needed                              |

### Key Design Principle

The detail view **does not emit output events for marker sync**. Instead:

- **Media changes** → delegate to `UploadManagerService` → manager emits `imageReplaced$` / `imageAttached$` → `MapShellComponent` subscribes directly
- **Coordinate changes** → handled by correction mode in `MapShellComponent` (marker drag is a map-layer operation)
- **Metadata edits** → saved to DB; no immediate marker visual change needed

## Component Hierarchy

```
ActionsSection                         ← dd-section-label "Actions", dd-item styled rows
├── ZoomToLocationAction               ← dd-item: my_location icon + "Zoom to location"
├── AssignProjectAction                ← dd-item: folder_open icon + "Assign project"
├── CopyCoordinatesAction              ← dd-item: content_copy icon + "Copy coordinates"
├── DownloadAction                     ← dd-item: download icon + "Download media"
├── dd-divider
└── DeleteAction                       ← dd-item--danger: delete icon + "Delete media"

[confirm] DeleteConfirmDialog          ← modal with cancel/confirm
```

## State

| Name                | Type      | Default | Controls                              |
| ------------------- | --------- | ------- | ------------------------------------- |
| `showDeleteConfirm` | `boolean` | `false` | Delete confirmation dialog visibility |
| `showContextMenu`   | `boolean` | `false` | Context menu visibility               |

## Interaction Flow

```mermaid
flowchart TD
    A[User opens Media Detail] --> B[Actions section visible]
    B --> C{User clicks action}

    C -->|Zoom to location| E[Emit zoomToLocationRequested]
    E --> E1[MapShell calls map.flyTo coords, zoom 18]
    E1 --> E2[Marker highlighted with pulse animation]

    C -->|Assign project| F[Open project membership picker]
    F --> F1[User selects one or more projects]
    F1 --> F2[Upsert/delete links in media_projects]

    C -->|Copy coordinates| G[Write lat,lng to clipboard]
    G --> G1[Show toast confirmation]

    C -->|Download media| D1[Request storage download]
    D1 --> D2[Browser starts file download]

    C -->|Delete media| H[Show delete confirmation dialog]
    H --> H1{User confirms?}
    H1 -->|Yes| H2[Delete from DB + Storage]
    H2 --> H3[Return to grid]
    H1 -->|No| H4[Dismiss dialog]
```

## Acceptance Criteria

- [x] Actions use **dd-item** button styling (not bordered outline buttons)
- [x] Each action: leading icon + label text, `0.8125rem` font
- [x] Hover uses warm clay tint matching all dropdown items
- [x] Delete action uses `dd-item--danger` style (red icon + label)
- [x] `dd-divider` separates destructive actions from normal ones
- [x] Zoom to location pans & zooms map to media coordinates (flyTo, zoom 18)
- [x] Zoom to location highlights the target marker with a pulse animation
- [x] Zoom to location is disabled when media has no coordinates
- [x] Detail 3-dot menu exposes the full single-marker action contract
- [x] Right-click on detail thumbnail opens the same action menu as the 3-dot trigger
- [x] Change location actions (map/address) are available from detail context menu
- [x] Copy address and open Google Maps are available from detail context menu
- [ ] Assign project opens project membership picker (multi-select)
- [x] Copy coordinates writes to clipboard with toast confirmation
- [x] Delete confirmation dialog shown before removal
- [x] Replace media triggers marker thumbnail update via `UploadManagerService.imageReplaced$` (not direct output events)
- [x] Attaching a file to a **media row that had no file yet** triggers a marker update via `UploadManagerService.imageAttached$`
- [x] Coordinate edit handled by MapShell directly — marker already at new position from drag
- [x] No output events for marker sync — flows through service layer
- [x] Metadata edits saved to DB only — no immediate marker visual change needed
