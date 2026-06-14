# Projects Dashboard (Proposal)

> **Status:** Design exploration — not yet implemented. Captures the design direction from the 2026-06-14 UX review of the `/projects-dashboard-preview` prototype. Supersedes nothing yet; see [Open Questions](#open-questions) for its relationship to [projects-page.md](projects-page.md).

## What It Is

A combined "projects + project dashboard" surface: a compact, searchable project list on the left and a per-project dashboard of summary widgets on the right. Selecting a project in the list updates the dashboard without navigation.

## What It Looks Like

A narrow left rail (~19rem) holds a search field, `Filter`/`Sort` controls, and a dense single-line project list (color dot, name, image count). The right side shows the selected project's name, status, location, and last-activity, followed by a dashboard area. The dashboard leads with **one larger "hero" module** (the map/location preview) and arranges secondary modules (activity, file types, upload timeline, storage, team) around it at lower visual weight — not a uniform grid of equal-size cards.

## Where It Lives

- **Prototype route (current)**: `/projects-dashboard-preview` (`apps/web/src/app/features/projects-dashboard-preview/`), static mock data only.
- **Target route**: TBD — see [Open Questions](#open-questions).

## Design Principles (from UX review)

1. **Calm over busy** — per [`docs/design/constitution.md`](../../design/constitution.md), avoid a uniform "admin dashboard" grid. One **hero module** (map/location preview) gets primary space; remaining modules are secondary and smaller. Secondary modules MAY be collapsed behind progressive disclosure (tabs/accordion/"show more") rather than always-visible.
2. **Visual hierarchy** — widgets are not equal weight. Hero module ≥ 2× the footprint of a secondary module.
3. **Real content over placeholders** — each widget must communicate its eventual content type (chart shape, list rows, mini-map) once implemented; striped placeholders are prototype-only.
4. **Touch targets** — list rows MUST be ≥ 2.75rem (44px) tall to meet field-use touch targets, even in a "little height" compact list.
5. **Status is never color-only** — status indicators MUST pair color with an icon and/or text label (accessibility for color-vision deficiency).
6. **Personalization is visible by default** — if widgets are user-configurable, the affordances (`+ Add widget`, remove/`×`, reorder) MUST be visible in the default state, not hidden behind a separate "edit mode" discovery step.
7. **Responsive collapse** — the left rail MUST collapse to a drawer/overlay below a defined breakpoint; it cannot remain a fixed 19rem column on narrow viewports.
8. **No redundant project browsers** — this page's relationship to the existing `/projects` management page (grid/list/map/board view modes) must be resolved before implementation (see Open Questions).

## Actions & Interactions

| #   | User Action                       | System Response                                                         | Triggers              |
| --- | ---------------------------------- | ------------------------------------------------------------------------ | --------------------- |
| 1   | Types in search field              | Filters left-rail project list by name/city                              | `searchQuery` state    |
| 2   | Clicks a project row               | Updates dashboard header + widgets to selected project                   | `selectedProjectId`    |
| 3   | Clicks `Filter` / `Sort`            | Opens project-level filter/sort controls (reuse Projects operator profile)| Toolbar dropdown state |
| 4   | Clicks `×` on a secondary widget    | Removes widget from dashboard, adds it to the "hidden widgets" list       | `hiddenWidgetIds`      |
| 5   | Clicks `+ Add widget`               | Opens a list of hidden widgets; selecting one restores it to the layout   | `hiddenWidgetIds`      |
| 6   | Viewport narrows below breakpoint   | Left rail collapses to a drawer toggled by a header button                | `isMobile`             |

## Component Hierarchy

```
ProjectsDashboardPage
├── ProjectsRail                       ← left, ~19rem, collapses to drawer on mobile
│   ├── ProjectSearchField
│   ├── ProjectsRailToolbar            ← Filter, Sort (reuses Projects operator profile)
│   └── ProjectsCompactList            ← rows ≥ 2.75rem, color dot + name + count
├── ProjectDashboard                   ← right, flexible width
│   ├── ProjectDashboardHeader         ← name, status (icon+color+text), location, last activity
│   ├── HeroWidget                     ← map/location preview, larger footprint
│   ├── SecondaryWidgetGrid            ← activity, file types, upload timeline, storage, team
│   │   └── SecondaryWidget × N        ← each with remove (`×`) action
│   └── AddWidgetControl               ← restores hidden widgets
```

## Data

| Field                  | Source                                                                 | Type                  |
| ----------------------- | ------------------------------------------------------------------------ | ---------------------- |
| Project list rows       | `ProjectsService.loadProjects()` aggregates (reuse `ProjectListItem`)     | `ProjectListItem[]`    |
| Hero widget (map)        | `media_items` / `locations` (lat/lng bounding box for selected project)  | TBD — needs bbox helper|
| Activity widget          | `app_events` filtered by `project_id`                                     | TBD                    |
| File types widget        | `ProjectListItem.fileTypeCounts`                                          | existing aggregate     |
| Storage widget           | `SUM(media_items.file_size_bytes)` per project                           | TBD — not yet aggregated|
| Team widget              | Project members/collaborators                                            | TBD — no table found   |
| Widget layout (visible/hidden, order) | New per-user config (e.g. `project_dashboard_widgets` table or `localStorage`) | TBD |

## State

| Name                | Type                | Default        | Controls                              |
| -------------------- | -------------------- | ---------------- | ---------------------------------------|
| `searchQuery`         | `string`              | `''`             | Left-rail list filtering               |
| `selectedProjectId`   | `string \| null`      | first project id | Dashboard content                      |
| `hiddenWidgetIds`     | `Set<string>`         | `new Set()`      | Which secondary widgets are visible    |
| `isMobile`            | `boolean`             | viewport-derived | Rail collapses to drawer               |

## File Map

| File                                                                                              | Purpose                                  |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `apps/web/src/app/features/projects-dashboard-preview/projects-dashboard-preview.component.ts`     | Prototype component (static mock data)    |
| `apps/web/src/app/features/projects-dashboard-preview/projects-dashboard-preview.component.html`   | Prototype template                        |
| `apps/web/src/app/features/projects-dashboard-preview/projects-dashboard-preview.component.scss`   | Prototype styles                          |

## Acceptance Criteria

- [ ] Left rail list rows are ≥ 2.75rem tall.
- [ ] Status indicators use icon + text in addition to color.
- [ ] Dashboard shows exactly one hero module sized ≥ 2× a secondary module.
- [ ] Secondary widgets can be removed (`×`) and restored (`+ Add widget`) without page reload.
- [ ] Left rail collapses to a drawer below the mobile breakpoint.
- [ ] Relationship to `/projects` (replace, supplement, or merge view-mode) is decided and documented here.
- [ ] Storage and Team widgets have a confirmed data source or are removed from scope.

## Open Questions

- **Relationship to `/projects`**: does this page replace `/projects`, become a new `dashboard` view mode alongside grid/list/map/board, or stay a separate route reachable from a project row's context menu?
- **Hero widget choice**: confirmed as the map/location preview, or should "Activity" be the hero for projects without geocoded media?
- **Team/members data**: no membership table was found during research — needs a data-model decision before the Team widget can ship.
- **Widget layout persistence**: per-user `localStorage`, or a shared per-project default with personal overrides in a new table?
