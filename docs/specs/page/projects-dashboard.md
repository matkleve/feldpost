# Projects Page — Notion-Style Split Layout

> **Status:** Implementation contract for `/projects` redesign (2026-06-14). Supersedes the prior dashboard-preview proposal and replaces grid/list/board/map view modes on the projects page.

## What It Is

A split-layout projects surface: a narrow left rail lists projects as compact single-line rows; the right pane shows either an organization-level dashboard (widgets) or the selected project's detail view with media content and an optional push details panel.

## What It Looks Like

Full-height page grid inside the authenticated shell: `app-page-grid` owns nav clearance, centered band, and optional left/right rails. See [page-rail-grid.md](../../design/page-rail-grid.md).

**Right pane — Dashboard mode** (`/projects`, no project selected): widget grid with one hero module (map/location preview) and secondary modules (activity, file types, upload timeline, storage, team).

**Right pane — Project mode** (`/projects/:projectId`): project header (title, status badge with icon+text, city, last activity), a small **Details** toggle button, then a horizontal split: main media content (left, flexible) and optional details panel (~320px, push — shrinks content, not overlay). Media content is split vertically: **exclusive** media (only in this project) above **shared** media (also in other projects).

## Where It Lives

- **Route**: `/projects` (dashboard) and `/projects/:projectId` (project detail)
- **Parent**: `app-authenticated-app-layout`
- **Sidebar nav**: Projects icon → `/projects`

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Opens `/projects` | Loads projects; right pane shows dashboard widgets; no project row selected | Route |
| 2 | Clicks **Dashboard** in left rail | Navigates to `/projects`; dashboard widgets on right | Router |
| 3 | Clicks project row | Navigates to `/projects/:id`; right pane shows project detail | Router |
| 4 | Toggles **Archive** in left rail | List switches between active and archived projects | `showArchived` |
| 5 | Clicks **Details** under project header | Toggles push details panel; content area narrows | `detailsPanelOpen` |
| 6 | Clicks **New project** | Creates draft via dialog; selects new project | `ProjectsService` |
| 7 | Archive / restore / delete in details panel | Confirms and mutates project | `ProjectsService` |

## Component Hierarchy

```
ProjectsPageComponent (shell)
├── ProjectsSidebarComponent          ← left ~220px
│   ├── DashboardButton
│   ├── ArchiveToggle
│   ├── NewProjectButton
│   └── ProjectsCompactList           ← dot + name rows
├── ProjectDashboardViewComponent     ← right when selectedProjectId null
│   ├── HeroWidget
│   └── SecondaryWidgetGrid
└── ProjectDetailViewComponent        ← right when project selected
    ├── ProjectDetailHeader
    ├── DetailsToggleButton
    └── ProjectDetailBody (flex row)
        ├── ProjectMediaSectionComponent
        │   ├── ExclusiveMediaBlock
        │   └── SharedMediaBlock
        └── ProjectDetailsPanelComponent (push, optional)
```

## Data

| Field | Source | Type |
| --- | --- | --- |
| Project list | `ProjectsService.loadProjects()` | `ProjectListItem[]` |
| Selected project | URL `/projects/:id` or list lookup | `ProjectListItem \| null` |
| Exclusive media | `ProjectsService.loadProjectMediaSections(id).exclusive` | `ProjectMediaListItem[]` |
| Shared media | `ProjectsService.loadProjectMediaSections(id).shared` | `ProjectMediaListItem[]` |
| Dashboard widgets | Aggregates from `ProjectListItem` + future services | TBD per widget |

### Media exclusive vs shared

A media item linked to exactly one project via `media_projects` is **exclusive**. If `COUNT(project_id) > 1` for that `media_item_id`, it is **shared**.

## State

| Name | Type | Default | Controls |
| --- | --- | --- | --- |
| `selectedProjectId` | `string \| null` | from URL | Right pane mode |
| `showArchived` | `boolean` | `false` | Left rail list scope |
| `detailsPanelOpen` | `boolean` | `false` | Push panel visibility |

## File Map

| File | Purpose |
| --- | --- |
| `apps/web/src/app/features/projects/page/projects-page.component.*` | Split-layout shell |
| `apps/web/src/app/features/projects/sidebar/projects-sidebar.component.*` | Left rail |
| `apps/web/src/app/features/projects/dashboard/project-dashboard-view.component.*` | Dashboard widgets |
| `apps/web/src/app/features/projects/detail/project-detail-view.component.*` | Project header + body |
| `apps/web/src/app/features/projects/details-panel/project-details-panel.component.*` | Push properties panel |
| `apps/web/src/app/features/projects/media-section/project-media-section.component.*` | Exclusive/shared media |

## Acceptance Criteria

- [ ] Page host clears fixed nav pill (`padding-left: 4.5rem`).
- [ ] Left rail is ~220px; rows show color dot + name only.
- [ ] Archive toggle switches active/archived lists without navigation.
- [ ] `/projects` shows dashboard widgets; `/projects/:id` shows project detail.
- [ ] Details button toggles push panel (~320px); content shrinks, no overlay.
- [ ] Media sections split exclusive (top) and shared (bottom).
- [ ] Grid/list/board/map view modes removed from `/projects`.
- [ ] `/projects-dashboard-preview` route removed.

## Open Questions

- Widget layout persistence (localStorage vs DB) — deferred.
- Team widget data source — deferred until membership model exists.
