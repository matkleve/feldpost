# Project Mixed Media - Use Cases

> Related specs: [projects-page](../element-specs/projects-page.md), [project-details-view](../element-specs/project-details-view.md), [upload-panel](../element-specs/upload-panel.md), [filter-panel](../element-specs/filter-panel.md)

## Overview

These scenarios define how Feldpost expands from photo-only into mixed media without breaking map-first workflows.

Core rule: any media with valid coordinates can participate in map flows. Media without coordinates stays project-scoped and is discoverable in a fullscreen project view.

## Scenario Index

| ID    | Scenario                                            | Persona    |
| ----- | --------------------------------------------------- | ---------- |
| PMM-1 | Upload mixed files into one project                 | Technician |
| PMM-2 | Map marker uses media-type aware thumbnail shapes   | Technician |
| PMM-3 | Filter by file type independent of operator filters | Clerk      |
| PMM-4 | Open fullscreen project view for non-GPS media      | Clerk      |
| PMM-5 | Organize project media with custom Sections         | Clerk      |
| PMM-6 | Keep old photo workflows unchanged                  | Technician |

## PMM-1: Upload mixed files into one project

Goal: user can upload images, videos, and documents to a project in one flow.

1. User opens upload panel and selects project target.
2. User drops files with mixed MIME types.
3. System validates each file against allowed type+size rules.
4. System creates media items and per-file upload jobs.
5. GPS-capable files (photos/videos with coordinates or placed manually) receive map coordinates.
6. Non-GPS files are persisted as project-scoped items with `location_status = no_gps`.

Expected outcome:

- Mixed upload can complete as one batch.
- Rejected files do not block valid files.
- Every accepted file is visible either on map (has GPS) or in fullscreen project media (no GPS).

## PMM-2: Map marker uses media-type aware thumbnail shapes

Goal: media type is immediately visible on map.

1. User zooms into map where individual media markers are visible.
2. System renders marker thumbnail by type:
   - Photo: square preview.
   - Document: portrait preview (taller than wide) to signal paper-like asset.
   - Video: square preview with play badge and optional duration chip.
3. Cluster markers remain type-agnostic count badges until expanded.

Expected outcome:

- Document markers are visually distinguishable by silhouette alone.
- Marker hit targets remain accessible despite shape differences.

## PMM-3: Filter by file type independent of operator filters

Goal: user can include/exclude media families quickly without changing existing filter operators.

1. User opens map or project workspace.
2. User toggles a dedicated File Type filter strip (Photos, Videos, Documents).
3. System applies file type predicate before existing operator pipeline output is rendered.
4. Existing Filter operator (date/project/metadata/distance) continues unchanged.

Expected outcome:

- File type filtering is additive and composable with existing filters.
- Existing filter dropdown contract is not broken.

## PMM-4: Open fullscreen project view for non-GPS media

Goal: project files without coordinates are first-class, not hidden.

1. User opens a project and enters fullscreen project view.
2. UI shows two top-level areas:
   - GPS media area (photos/videos/documents with coordinates).
   - Project-only area (photos/videos/documents without coordinates).
3. User can search, filter, sort, and open details in both areas.
4. If item later gets coordinates, it moves from project-only area to GPS area automatically.

Expected outcome:

- Non-GPS content is always reachable from project context.
- Map remains clean from non-locatable noise.

## PMM-5: Organize project media with custom Sections

Goal: user can create custom named sections in each project.

1. User clicks Add Section in fullscreen project view.
2. User enters a free-text section name (for example "Invoices", "Site A", "Week 14").
3. User assigns media items to one or multiple sections.
4. User can rename, reorder, archive, and delete sections (with confirmation if not empty).

Expected outcome:

- Sections are project-scoped and user-defined.
- Section ordering is stable and persisted.

## PMM-6: Keep old photo workflows unchanged

Goal: avoid regressions and keep MVP stable.

1. User uploads only photos as before.
2. User uses map, workspace pane, active selection, and groups.
3. System behavior matches existing photo-only contract unless file type filters are explicitly changed.

Expected outcome:

- Existing photo markers, clustering, and image detail flows are unchanged by default.
- No mandatory migration steps for users who never upload videos/documents.

## Validation Checklist

- [ ] Mixed upload supports photo, video, and document files in one batch.
- [ ] Document markers are portrait-oriented and remain touch-accessible.
- [ ] File Type filter is separate from existing Filter operator.
- [ ] Fullscreen project view cleanly separates GPS and no-GPS areas.
- [ ] Project Sections are user-defined, persisted, and reorderable.
- [ ] Legacy photo-only workflows stay backward compatible.
