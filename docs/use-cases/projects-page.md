# Projects Page — Use Cases & Interaction Scenarios

> **Primary spec anchor:** [projects-dropdown](../element-specs/projects-dropdown.md)
> **Related workspace behavior:** [workspace-view WV-7](workspace-view.md#wv-7-scope-to-projects)
> **Personas:** [Technician](../archive/use-cases-README.md#persona-technician), [Clerk](../archive/use-cases-README.md#persona-clerk), [Admin](../archive/use-cases-README.md#persona-admin)

---

## Overview

These scenarios define how users scope, switch, and create projects while staying in map-first workflows. The focus is fast narrowing of image context without losing map position or workspace state.

### Scenario Index

| ID   | Scenario                                             | Persona    |
| ---- | ---------------------------------------------------- | ---------- |
| PP-1 | Select one active project for on-site review         | Technician |
| PP-2 | Compare two projects for quote preparation           | Clerk      |
| PP-3 | Use tri-state "All projects" to reset scope quickly  | Clerk      |
| PP-4 | Search inside project list and recover from no-match | Clerk      |
| PP-5 | Create a new project inline from the project control | Admin      |
| PP-6 | Keep project scope while closing and reopening panel | Technician |
| PP-7 | Keep scoped context while switching map areas        | Clerk      |

---

## PP-1: Select One Active Project for On-Site Review

**Goal:** Narrow visible history to one construction job while standing on site.

1. Technician opens map and workspace.
2. Technician opens the Projects control.
3. Technician unchecks unrelated projects and leaves only one selected.
4. Workspace and markers update immediately to show only images from that project.
5. Technician taps markers to inspect prior work in the same contract context.

**Expected outcome:**

- Project scope is reduced to one project.
- Active Selection and map markers reflect only scoped images.
- No route change or disruptive reload occurs.

**Edge cases:**

- If network is weak, current visible data remains until scoped query returns.
- If selected project has no images in current viewport, map appears temporarily sparse but scope remains valid.

---

## PP-2: Compare Two Projects for Quote Preparation

**Goal:** Cross-check overlapping work history from two projects before drafting a quote.

1. Clerk opens Projects control from workspace toolbar.
2. Clerk checks exactly two projects.
3. Workspace re-filters to the union of images from both projects.
4. Clerk applies additional sort/filter/grouping to compare conditions.
5. Clerk opens image detail to validate material and condition assumptions.

**Expected outcome:**

- Multi-project scope is active.
- Combined result set is visible in map and workspace.
- Subsequent filters apply on top of the project scope.

**Edge cases:**

- If one project has zero matching images after other filters, only the other project contributes results.
- If both projects are dense, clustering still behaves normally and does not break scope boundaries.

---

## PP-3: Use Tri-State "All Projects" to Reset Scope Quickly

**Goal:** Return from scoped analysis to full organization context in one action.

1. Clerk has a partial project selection active.
2. Clerk clicks the All projects checkbox.
3. System interprets tri-state and switches to all-on state.
4. Workspace and map refresh to include the full project set.

**Expected outcome:**

- All project IDs are selected.
- Tri-state indicator changes from indeterminate to checked.
- Global (unscoped) exploration is restored quickly.

**Edge cases:**

- Clicking All projects again can switch to none-selected if implemented as toggle-all behavior.
- None-selected state is treated as no project filter only if product rules define it so; otherwise it is an explicit empty result state.

---

## PP-4: Search Inside Project List and Recover from No-Match

**Goal:** Find a specific project quickly in long org project lists.

1. Clerk opens Projects control.
2. Clerk types part of the project name in search input.
3. List filters live to matching project rows.
4. Clerk checks the intended project row.

**No-match path:**

1. Clerk types a term with no matching project.
2. UI shows empty state message: No matching projects.
3. Clerk clears or edits search term and sees rows again.

**Expected outcome:**

- Search is local, fast, and does not block interaction.
- Empty state is explicit and reversible.

---

## PP-5: Create a New Project Inline from the Project Control

**Goal:** Add a missing project context without leaving current map workflow.

1. Admin opens Projects control.
2. Admin clicks + New project.
3. Inline name input appears in the control.
4. Admin enters project name and confirms.
5. New project appears immediately in list and is selected by default.

**Expected outcome:**

- Project is persisted and immediately usable as a scope filter.
- User can continue current workflow without route changes.

**Edge cases:**

- Duplicate or invalid names return inline validation feedback.
- Canceling inline creation restores previous list unchanged.

---

## PP-6: Keep Project Scope While Closing and Reopening Panel

**Goal:** Prevent accidental context loss during fast map interactions.

1. Technician configures project scope.
2. Technician closes Projects control to free map space.
3. Technician pans/zooms and interacts with markers.
4. Technician reopens Projects control.

**Expected outcome:**

- Prior selections are preserved.
- Scope remains active across panel open/close cycles.
- Reopen shows consistent checkbox states.

---

## PP-7: Keep Scoped Context While Switching Map Areas

**Goal:** Explore multiple neighborhoods while preserving the same project lens.

1. Clerk selects project scope.
2. Clerk navigates map to a different area.
3. Data refresh runs for new viewport.
4. Results remain constrained to selected projects.

**Expected outcome:**

- Viewport changes do not clear project scope.
- Query model is intersection of viewport and selected project IDs.

---

## Validation Checklist

- [ ] Single-project scoping updates workspace and map immediately.
- [ ] Multi-project selection behaves as union of selected projects.
- [ ] All projects tri-state transitions are visually correct.
- [ ] Closing control preserves selection state.
- [ ] Empty search state uses "No matching projects" copy.
- [ ] New project creation is inline and appears immediately.
- [ ] Scoped context persists during map navigation.
