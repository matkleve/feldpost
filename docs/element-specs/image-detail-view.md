# Image Detail View

> **Blueprint:** [implementation-blueprints/image-detail-view.md](../implementation-blueprints/image-detail-view.md)
> **Photo loading use cases:** [use-cases/photo-loading.md](../use-cases/photo-loading.md)
> **Editing use cases:** [use-cases/image-editing.md](../use-cases/image-editing.md)

## What It Is

The full detail view of a single photo or media-backed image record. It is the composition shell for the detail experience: it owns top-level layout, navigation, responsive placement, and the Quick Info Bar while delegating feature-specific behavior to child elements.

## Child Specs

Feature-specific behavior is owned by these child specs:

| Child Spec                                                    | Covers                                                |
| ------------------------------------------------------------- | ----------------------------------------------------- |
| [image-detail-photo-viewer](image-detail-photo-viewer.md)     | Progressive loading, lightbox, replace/upload photo   |
| [image-detail-inline-editing](image-detail-inline-editing.md) | Click-to-edit fields, address search, property rows   |
| [custom-metadata](custom-metadata.md)                         | Metadata CRUD, chip types, typeahead add flow         |
| [image-detail-actions](image-detail-actions.md)               | Actions section, delete, marker sync, correction mode |

The parent element coordinates shared state and section visibility only. Field-level editing, project membership management, location editing, photo interactions, metadata CRUD, and action-specific flows belong to the child specs above.

## What It Looks Like

### Toolbar Behavior

When the detail view is open, the **Workspace Toolbar** is hidden. The detail view fills the full content area below the pane header. The toolbar reappears when the user navigates back to the thumbnail grid.

### Layout Modes

**Wide pane (>= 640px):** Two-column layout with photo left and metadata right.

**Narrow pane (< 640px):** Single-column stack with photo on top and metadata below. On mobile this becomes a full-screen overlay.

The overall container is capped at `900px` max width and centered.

### Quick Info Bar

Immediately below the photo, a horizontal row of info chips provides at-a-glance context:

- **Projects chip**: folder icon plus project summary. Click opens project membership editing.
- **Date chip**: calendar icon plus formatted capture date. Click enters date edit mode.
- **GPS chip**: location icon plus GPS status. Click copies coordinates.

## Responsive Layout

The layout responds to the **workspace pane width**, not the browser viewport.

| Name   | Pane Width | Layout                         |
| ------ | ---------- | ------------------------------ |
| Narrow | < 480px    | Single column, compact spacing |
| Medium | 480-720px  | Single column, comfortable     |
| Wide   | > 720px    | Two columns: photo | metadata  |

## Where It Lives

- **Parent**: Workspace Pane
- **Appears when**: User opens a thumbnail or detail action from a map marker

## Actions

| #   | User Action                     | System Response                           |
| --- | ------------------------------- | ----------------------------------------- |
| 1   | Clicks back arrow               | Returns to previous workspace state       |
| 2   | Clicks close on mobile          | Closes overlay                            |
| 3   | Clicks quick-info projects chip | Opens project membership editing          |
| 4   | Clicks quick-info date chip     | Enters date edit mode                     |
| 5   | Clicks quick-info GPS chip      | Copies coordinates and shows a toast      |

## Component Hierarchy

```
ImageDetailView
|- ImageDetailHeader
|- ImageDetailPhotoViewer
|- QuickInfoBar
|- ImageDetailInlineSection
|- MetadataSection
`- ActionsSection
```

## State

| Name        | Type                  | Default | Controls                             |
| ----------- | --------------------- | ------- | ------------------------------------ |
| `image`     | `ImageRecord | null`  | `null`  | The displayed image record           |
| `loading`   | `boolean`             | `false` | Whether record loading is in flight  |
| `error`     | `string | null`       | `null`  | Error message if loading fails       |
| `paneWidth` | `number`              | `0`     | Width of the workspace pane in pixels |

## File Map

| File                                                                        | Purpose |
| --------------------------------------------------------------------------- | ------- |
| `features/map/workspace-pane/image-detail-view.component.ts`                | Parent coordinator: load record, own shared state, wire child events |
| `features/map/workspace-pane/image-detail-view.component.html`              | Composition shell for header, viewer, details, metadata, and actions |
| `features/map/workspace-pane/image-detail-header/*`                         | Header UI and context menu |
| `features/map/workspace-pane/image-detail-photo-viewer/*`                   | Photo/upload surface and lightbox |
| `features/map/workspace-pane/image-detail-inline-section/*`                 | Details and location editing UI |
| `features/map/workspace-pane/image-detail-project-membership.helper.ts`     | Project membership persistence rules |
| `features/map/workspace-pane/metadata-section/*`                            | Custom metadata section |
| `features/map/workspace-pane/detail-actions/*`                              | Actions section |

## Acceptance Criteria

- [x] Parent element focuses on composition, shared state, and navigation
- [x] Quick Info Bar remains directly under the photo surface
- [x] Child specs own feature-specific behavior
- [ ] Uses `ResizeObserver` on the host element to measure pane width
- [ ] Mobile overlay behavior matches the parent spec
