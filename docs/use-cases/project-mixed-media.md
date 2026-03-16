# Project Mixed Media - Use Cases

> Related specs: [projects-page](../element-specs/projects-page.md), [project-details-view](../element-specs/project-details-view.md), [upload-panel](../element-specs/upload-panel.md), [filter-panel](../element-specs/filter-panel.md)

## Overview

These scenarios define how Feldpost expands from photo-only into mixed media without breaking map-first workflows.

Core rule set:

- Every media item has exactly one `primary_project_id`.
- GPS media may be linked to multiple projects.
- No-GPS media must remain linked to exactly one project (the primary project).
- Project view always separates GPS media from project-only no-GPS media.

## Scenario Index

| ID     | Scenario                                            | Persona    |
| ------ | --------------------------------------------------- | ---------- |
| PMM-1  | Upload mixed files into one project                 | Technician |
| PMM-2  | Add GPS photo to additional project                 | Clerk      |
| PMM-3  | Keep no-GPS file single-project only                | Clerk      |
| PMM-4  | Block GPS assignment for locked file types          | Technician |
| PMM-5  | Map marker uses media-type aware thumbnail shapes   | Technician |
| PMM-6  | Filter by file type independent of operator filters | Clerk      |
| PMM-7  | Open fullscreen project view with GPS/no-GPS lanes  | Clerk      |
| PMM-8  | Organize project media with custom Sections         | Clerk      |
| PMM-9  | Remove project membership from multi-project media  | Clerk      |
| PMM-10 | Prevent removing last membership                    | Clerk      |
| PMM-11 | Change primary project for GPS media                | Clerk      |
| PMM-12 | Show shared-media badges in project views           | Clerk      |
| PMM-13 | Keep old photo workflows unchanged                  | Technician |
| PMM-14 | Enforce org and role security on membership actions | Admin      |

## PMM-1: Upload mixed files into one project

Goal: user can upload images, videos, and documents to a selected project in one flow.

1. User opens upload panel and selects target project.
2. User drops mixed MIME files.
3. System validates each file against type and size rules.
4. System creates media item and sets `primary_project_id` to the selected project.
5. System creates initial membership row in `media_projects` for the primary project.

Expected outcome:

- Batch can contain photos, videos, and documents.
- Invalid files are rejected without blocking valid files.
- Each accepted file has a primary project and at least one project membership.

## PMM-2: Add GPS photo to additional project

Goal: one GPS photo can be reused across projects.

1. User opens a GPS photo detail.
2. User adds the photo to a second project.
3. System inserts new `media_projects` membership.
4. Primary project remains unchanged unless user explicitly changes it.

Expected outcome:

- Same media appears in multiple project contexts.
- Original ownership context remains stable via `primary_project_id`.

## PMM-3: Keep no-GPS file single-project only

Goal: no-GPS items remain project-specific and cannot be spread across projects.

1. User opens a no-GPS media detail.
2. User attempts to add second project membership.
3. System rejects action with a clear message.

Expected outcome:

- No-GPS media always has exactly one membership.
- That membership always equals `primary_project_id`.

## PMM-4: Block GPS assignment for locked file types

Goal: prevent unsupported location assignment flows.

1. User opens a file type that is configured as GPS-locked (for example document).
2. User attempts "Place on map" or location assignment action.
3. UI disables the action and explains why.

Expected outcome:

- Locked file types cannot be manually promoted to GPS media.
- Item stays in project-only no-GPS lane.

## PMM-5: Map marker uses media-type aware thumbnail shapes

Goal: media type is immediately visible on map.

1. User zooms to individual markers.
2. System renders marker thumbnail by type:
   - Photo: square preview.
   - Document: portrait preview (taller than wide).
   - Video: square preview with play badge and optional duration chip.
3. Cluster markers stay type-agnostic until expanded.

Expected outcome:

- Document markers are distinguishable by silhouette alone.
- Marker hit targets remain accessible.

## PMM-6: Filter by file type independent of operator filters

Goal: include or exclude media families without changing existing operator behavior.

1. User toggles File Type strip (Photos, Videos, Documents).
2. System AND-composes file type predicate with existing filter operator output.

Expected outcome:

- File type filtering is additive.
- Existing filter dropdown contract remains unchanged.

## PMM-7: Open fullscreen project view with GPS/no-GPS lanes

Goal: no-GPS content is first-class and easy to review.

1. User opens fullscreen project view.
2. UI renders:
   - GPS lane: map-addressable media in this project.
   - Project-only lane: no-GPS media where primary project is this project.

Expected outcome:

- Project-only assets do not disappear from workflow.
- Map remains free from non-locatable noise.

## PMM-8: Organize project media with custom Sections

Goal: user-defined grouping in project context.

1. User creates section (for example "Invoices", "Phase 2").
2. User assigns media to one or more sections.
3. User can rename, reorder, archive, or delete sections.

Expected outcome:

- Section order is stable and persisted.
- Shared GPS media can appear in sections of each linked project.

## PMM-9: Remove project membership from multi-project media

Goal: remove one project relation without deleting media.

1. Media is linked to projects A and B.
2. User removes membership in project B.
3. System deletes membership row for B only.

Expected outcome:

- Media remains in project A.
- No storage object deletion happens.

## PMM-10: Prevent removing last membership

Goal: media never becomes orphaned.

1. User tries to remove the final remaining membership.
2. System blocks action and requests either delete media or choose another project.

Expected outcome:

- Every media item always has at least one project membership.

## PMM-11: Change primary project for GPS media

Goal: user can re-anchor ownership context.

1. Media has memberships in projects A and B and primary is A.
2. User sets primary to B.
3. System updates `primary_project_id = B`.

Expected outcome:

- Memberships remain unchanged.
- Derived labels and defaults switch to new primary project.

## PMM-12: Show shared-media badges in project views

Goal: avoid confusion when item is linked to multiple projects.

1. User browses project media list.
2. Shared items show badge (for example "Shared with 2 projects").
3. Clicking badge opens membership popover.

Expected outcome:

- Users understand why the same item appears across projects.

## PMM-13: Keep old photo workflows unchanged

Goal: avoid regressions.

1. User uploads only photos as before.
2. User uses map, workspace pane, active selection, and groups.

Expected outcome:

- Existing photo behavior remains unchanged unless new mixed-media controls are used.

## PMM-14: Enforce org and role security on membership actions

Goal: security boundary remains in database.

1. Viewer attempts membership add/remove.
2. Cross-org user attempts to reference foreign project.
3. System rejects both via RLS/integrity policies.

Expected outcome:

- Frontend cannot bypass org or role boundaries.

## Validation Checklist

- [ ] Every media item has `primary_project_id` and at least one project membership.
- [ ] GPS media can be linked to multiple projects.
- [ ] No-GPS media is constrained to exactly one project membership.
- [ ] Locked file types cannot receive manual GPS assignment.
- [ ] File Type filter remains separate from existing Filter operator.
- [ ] Fullscreen project view separates GPS and project-only no-GPS lanes.
- [ ] Project Sections remain user-defined, persisted, and reorderable.
- [ ] Legacy photo-only workflows stay backward compatible.
