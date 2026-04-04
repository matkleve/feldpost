# Projects Page Workspace Flow — Use Cases

> **Related specs:** [projects-page](../element-specs/projects-page.md), [project-details-view](../element-specs/project-details-view.md), [image-detail-view](../element-specs/media-detail/media-detail-view.md), [map-shell](../element-specs/map-shell.md)
> **Personas:** [Technician](../archive/use-cases-README.md#persona-technician), [Clerk](../archive/use-cases-README.md#persona-clerk)

---

## Overview

These scenarios define the expected cross-element behavior for the Projects page route and its in-page workspace pane. They lock down the handoff between project selection, project-scoped image browsing, image detail navigation, map focus, and state restoration.

### Scenario Index

| ID    | Scenario                                                                | Persona    |
| ----- | ----------------------------------------------------------------------- | ---------- |
| PPW-1 | Select project from list and stay on Projects page                      | Clerk      |
| PPW-2 | Open image details from project-scoped workspace thumbnails             | Technician |
| PPW-3 | Jump from image details to Map page and focus exact photo location      | Technician |
| PPW-4 | Close workspace pane and preserve Projects page search/filter/view mode | Clerk      |
| PPW-5 | Re-open same project and restore prior project-scoped browsing context  | Clerk      |

---

## PPW-1: Select Project From List and Stay on Projects Page

**Goal:** Open project-scoped workspace details without route churn.

1. User navigates to `/projects`.
2. User selects a project row/card in List or Cards view.
3. System sets `selectedProjectId` and opens the in-page workspace pane.
4. Route remains `/projects` and browser history does not add a `/map` transition.
5. Project list context remains visible/available in the same page session.

**Expected outcome:**

- Project selection opens workspace content in place.
- No full-page transition occurs.
- Search/filter/view mode context stays active.

**Edge cases:**

- Selecting a different project while pane is open switches scope in place.
- Opening via row click and via "Open in workspace" must resolve to identical pane behavior.

---

## PPW-2: Open Image Details From Project-Scoped Workspace Thumbnails

**Goal:** Inspect a specific photo while constrained to the selected project scope.

1. Workspace pane is open for a selected project.
2. User clicks a thumbnail in project-scoped results.
3. System opens Image Detail View for that image.
4. Detail content reflects the selected image while preserving project scope context.

**Expected outcome:**

- Image detail opens from project-scoped thumbnails.
- Back/close returns user to project-scoped thumbnail browsing state.

**Edge cases:**

- If the selected image becomes unavailable, a recoverable error state appears and user can return to the grid.
- If filters are active, only currently filtered thumbnails are navigable in this step.

---

## PPW-3: Jump From Image Details to Map Page and Focus Exact Photo Location

**Goal:** Move from project-scoped inspection to map verification at the precise photo point.

1. User is viewing an image in Image Detail View from the Projects page workspace pane.
2. User clicks the image-detail map action.
3. Router navigates to `/map`.
4. Map receives focus payload (`imageId`, `lat`, `lng`) and centers/zooms to the selected photo location.
5. Target image marker enters focused/active visual state.

**Expected outcome:**

- Navigation lands on `/map`.
- Focused location corresponds to the exact image coordinates.
- User can immediately continue map-based review from that point.

**Edge cases:**

- If coordinates are missing, map opens with a non-blocking fallback state and no false focus indicator.
- If marker clustering is active, the cluster expands/zooms so the target photo can be focused.

---

## PPW-4: Close Workspace Pane and Preserve Projects Page Search/Filter/View Mode

**Goal:** Exit detail context without losing current Projects page working set.

1. User has active Projects page state (search term, status filter, list/cards mode).
2. User closes workspace pane.
3. System hides pane and returns to projects list/cards surface.
4. Existing search/filter/view mode state remains unchanged.

**Expected outcome:**

- Pane closes cleanly.
- Project list/cards state is preserved.
- User can continue exactly where they left off.

**Edge cases:**

- Closing pane from image detail and from thumbnail grid yields the same preserved page state.
- State preservation holds across repeated open/close cycles in the same session.

---

## PPW-5: Re-open Same Project and Restore Prior Project-Scoped Browsing Context

**Goal:** Prevent disorientation when revisiting a project in the same workflow.

1. User opens project A in workspace pane and browses within its thumbnails/details.
2. User closes the pane.
3. User reopens project A.
4. System restores the previous project-scoped browsing context (for example prior subview and scroll position).

**Expected outcome:**

- Reopen behavior is explicit, mandatory, and consistent.
- Reopen path is predictable and testable.

---

## Validation Checklist

- [ ] Selecting a project on `/projects` opens workspace pane in place with no route change.
- [ ] Thumbnail click in project-scoped workspace opens Image Detail View for that scoped image.
- [ ] Image detail map action navigates to `/map` and focuses exact photo location when coordinates exist.
- [ ] Closing workspace pane preserves Projects page search/filter/view mode.
- [ ] Reopening the same project restores prior project-scoped browsing context (including prior subview and scroll position).
