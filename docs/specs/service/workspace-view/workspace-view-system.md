# Workspace View System — Architecture Overview

> **Spec type:** System architecture (cross-cutting). This is NOT a standard element spec — it describes the data-flow and service orchestration across multiple components. For the standard element spec sections, see [workspace-pane.md](workspace-pane.md), [workspace-toolbar.md](workspace-toolbar.md), and [thumbnail-grid.md](thumbnail-grid.md).

This document describes the complete data flow and component interaction for the Workspace Pane's view system: how media items are loaded, grouped, sorted, filtered, and displayed. It covers the cluster-click flow, the toolbar controls, and the `WorkspaceViewService` that orchestrates everything.

## What It Is

The Workspace View System is the orchestration layer that transforms raw media data into the rendered workspace content model (sections, groups, and ordered thumbnails). It coordinates map-originated media loading with toolbar-driven grouping, sorting, and filtering.

## What It Looks Like

Users experience this system as a responsive workspace pane that immediately opens with media content after marker interactions. Group headers, thumbnail sections, and detail-view transitions reflect a deterministic pipeline: load raw media items, apply filters, apply sort, apply grouping, then render. Toolbar controls update the same underlying model, so visible content stays consistent across single-item and cluster flows.

## Where It Lives

- Route: `/`
- Parent: `MapShellComponent` and `WorkspacePane`
- Core orchestrator: `WorkspaceViewService`
- Triggered by: marker clicks, toolbar state changes, and active project/filter context

## Actions

| #   | Trigger                    | System Response                                                      | Notes                             |
| --- | -------------------------- | -------------------------------------------------------------------- | --------------------------------- |
| 1   | User clicks marker/cluster | Loads cluster media via RPC and sets raw media list                  | Single and cluster share pipeline |
| 2   | Raw list updates           | Applies filter, sort, and grouping pipeline                          | Deterministic order               |
| 3   | Toolbar control changes    | Recomputes output sections without reloading unchanged raw data      | Reactive updates                  |
| 4   | Single media click path    | Opens detail view and still maintains grid state for back navigation | No state loss                     |
| 5   | Cluster path               | Clears detail selection and renders grouped thumbnail content        | Grid-first display                |

## Component Hierarchy

```
MapShellComponent
├── Map Zone
├── WorkspacePane
│   ├── WorkspaceToolbar
│   │   ├── GroupingDropdown
│   │   ├── FilterDropdown
│   │   ├── SortDropdown
│   │   └── ProjectsDropdown
│   └── WorkspaceContent
│       ├── GroupHeader(s)
│       └── ThumbnailGrid
└── WorkspaceViewService (orchestration)
    ├── Raw media state
    ├── FilterService integration
    ├── Sorting stage
    └── Grouping stage
```

## Data

| Source                           | Contract                                                                 | Operation                          |
| -------------------------------- | ------------------------------------------------------------------------ | ---------------------------------- |
| Cluster/single marker result set | `cluster_images` RPC payload (`media_items` rows + compatibility fields) | Load raw workspace media list      |
| Filter state                     | `FilterService` active filters + project selection                       | Transform pipeline stage           |
| Sort state                       | Toolbar sort configuration                                               | Transform pipeline stage           |
| Grouping state                   | Toolbar grouping configuration                                           | Transform pipeline stage           |
| Output model                     | `groupedSections` view model                                             | Emit to workspace content renderer |

Compatibility note: `image_id` remains a compatibility field in some RPCs; canonical persistence identity is `media_item_id`.

Location status compatibility note:

- Canonical frontend union for `location_status`: `pending` | `resolved` | `unresolvable`.
- Transitional normalization for pre-canonical backend values during migration:
  - `gps` -> `resolved`
  - `no_gps` -> `pending`
  - `unresolved` -> `unresolvable`
- New frontend writes and emitted DTO contracts must use canonical values only.

## State

| Name               | Type               | Default                | Controls                               |
| ------------------ | ------------------ | ---------------------- | -------------------------------------- |
| `rawImages`        | `WorkspaceMedia[]` | `[]`                   | Source list before pipeline transforms |
| `activeFilters`    | `FilterRule[]`     | `[]`                   | Predicate stage inputs                 |
| `activeSort`       | `SortConfig`       | implementation default | Sort order stage                       |
| `activeGroupings`  | `PropertyRef[]`    | `[]`                   | Grouping stage                         |
| `selectedProjects` | `Set<string>`      | empty set              | Project-based include/exclude scope    |
| `groupedSections`  | `GroupedSection[]` | `[]`                   | Render-ready output model              |

## File Map

| File                                                                          | Purpose                                    |
| ----------------------------------------------------------------------------- | ------------------------------------------ |
| `docs/specs/service/workspace-view/workspace-view-system.md`                                 | System-level orchestration contract        |
| `docs/specs/service/workspace-view/workspace-view-system.deep-dive.md`                        | Mermaid + extended architecture (lint: supplement only) |
| `docs/specs/ui/workspace/workspace-view-system.md`                              | UI navigation entry; links to this file only |
| `apps/web/src/app/features/map/workspace-pane/workspace-view.service.ts`      | Pipeline orchestration (filter/sort/group) |
| `apps/web/src/app/features/map/workspace-pane/workspace-pane.component.ts`    | Parent host integration with map shell     |
| `apps/web/src/app/features/map/workspace-pane/workspace-toolbar.component.ts` | Toolbar control signals feeding pipeline   |
| `apps/web/src/app/features/map/workspace-pane/thumbnail-grid.component.ts`    | Section/grid render consumer               |

## Wiring

### Injected Services

- `WorkspaceViewService` - central orchestration for workspace model derivation.
- `FilterService` - active filter state and radius/project constraints.
- `MapShell`/map marker interaction layer - entrypoint for raw media loading triggers.

### Inputs / Outputs

- Inputs: marker interaction payload, toolbar grouping/sort/filter selections, project context.
- Outputs: grouped workspace sections and detail-vs-grid mode decisions.

### Subscriptions

- Reactive recomputation on raw list, filters, sort config, grouping config, and selected projects changes.
- Workspace content area subscribes to grouped output model signal.

### Supabase Calls

- `cluster_images` RPC for marker/cluster-originated list loading.
- No direct persistence mutations in this system spec; write operations are delegated to child feature flows.

## Acceptance Criteria

- [ ] Marker and cluster interactions always produce a valid workspace content model.
- [ ] Pipeline order remains filter -> sort -> group before render.
- [ ] Toolbar changes update workspace output consistently without full app reload.
- [ ] Single-item and cluster flows preserve deterministic behavior across back-navigation.

---

## Deep dive

Sections **1–8** (system architecture, cluster click flow, service pipeline, grouped rendering, service architecture diagram, interaction map, extended file map, implementation priority) live in **[workspace-view-system.deep-dive.md](./workspace-view-system.deep-dive.md)** so this overview stays within the spec line budget.
