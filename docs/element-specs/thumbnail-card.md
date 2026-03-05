# Thumbnail Card

## What It Is

A single 128×128px image thumbnail in the grid. Shows photo preview with overlaid metadata. Actions (checkbox, add to group, context menu) are hidden at rest and appear on hover (Quiet Actions pattern). On mobile, selection checkboxes become visible in bulk-select mode.

## What It Looks Like

128×128px rounded card. Photo thumbnail fills the card (`object-fit: cover`). Overlays at rest:

- Bottom-left: capture date (small, semi-transparent bg)
- Bottom-right: project badge (if assigned)
- Top-right: correction dot (if corrected) or metadata preview icon

On hover (desktop): fade-in at 80ms with no layout shift:

- Top-left: selection checkbox
- Top-right: "Add to group" icon button
- Bottom-right: context menu (⋯) button

## Where It Lives

- **Parent**: Thumbnail Grid
- **Component**: Inline within Thumbnail Grid or standalone component

## Actions

| #   | User Action                      | System Response                                    | Triggers            |
| --- | -------------------------------- | -------------------------------------------------- | ------------------- |
| 1   | Clicks card                      | Opens Image Detail View                            | `detailImageId` set |
| 2   | Hovers card (desktop)            | Reveals action buttons (checkbox, add-to-group, ⋯) | Opacity 0→1, 80ms   |
| 3   | Clicks checkbox                  | Toggles selection for this image                   | Selection state     |
| 4   | Clicks "Add to group"            | Opens group picker dropdown                        | Group selection     |
| 5   | Clicks ⋯ (context menu)          | Opens menu: View detail, Edit metadata, Delete     | Context menu        |
| 6   | Enters bulk-select mode (mobile) | Checkboxes become always visible                   | Bulk mode           |

## Component Hierarchy

```
ThumbnailCard                              ← 128×128, rounded, overflow-hidden, relative
├── ThumbnailImage                         ← <img> object-fit:cover, signed URL (_thumb.jpg)
├── DateOverlay                            ← bottom-left, text-xs, semi-transparent bg
├── [has project] ProjectBadge             ← bottom-right, small pill
├── [corrected] CorrectionDot             ← top-right, 6px, --color-accent
└── [hover] ActionOverlay                  ← opacity 0→1, 80ms, no layout shift
    ├── SelectionCheckbox                  ← top-left
    ├── AddToGroupButton                   ← top-right
    └── ContextMenuButton (⋯)             ← bottom-right
```

## Data

| Field           | Source                                      | Type             |
| --------------- | ------------------------------------------- | ---------------- |
| Image thumbnail | Supabase Storage signed URL                 | `string`         |
| Capture date    | `images.captured_at` or `images.created_at` | `Date`           |
| Project name    | `projects.name` via join                    | `string \| null` |
| Is corrected    | `images.corrected_lat IS NOT NULL`          | `boolean`        |

## State

| Name         | Type      | Default | Controls                            |
| ------------ | --------- | ------- | ----------------------------------- |
| `isSelected` | `boolean` | `false` | Checkbox state                      |
| `isHovered`  | `boolean` | `false` | Action overlay visibility (desktop) |

## File Map

| File                                                      | Purpose                           |
| --------------------------------------------------------- | --------------------------------- |
| `features/map/workspace-pane/thumbnail-card.component.ts` | Card component with hover actions |

## Acceptance Criteria

- [ ] 128×128px with rounded corners
- [ ] Thumbnail shows via signed URL
- [ ] Date overlay bottom-left, always visible
- [ ] Project badge bottom-right (when project assigned)
- [ ] Correction dot top-right (when corrected)
- [ ] Hover reveals checkbox, add-to-group, context menu (80ms, no layout shift)
- [ ] Mobile: checkboxes visible in bulk-select mode, hidden otherwise
- [ ] Click opens detail view
