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
| `docs/element-specs/workspace-view-system.md`                                 | System-level orchestration contract        |
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

## 1. System Architecture

```mermaid
flowchart TB
    subgraph MapShell["MapShellComponent"]
        direction TB
        MapZone["Map Zone\n(Leaflet)"]
        WP["WorkspacePane"]
    end

    MarkerClick["Marker Click\n(single or cluster)"]
    MapZone -->|"handlePhotoMarkerClick(key)"| MarkerClick

    MarkerClick -->|"single (count=1)"| SingleFlow["Load Cluster Media\n+ Open Detail View"]
    MarkerClick -->|"cluster (count>1)"| ClusterLoad["Load Cluster Media"]

    SingleFlow -->|"query media in grid cell"| Supa["Supabase RPC\ncluster_images(lat, lng, zoom)"]
    ClusterLoad -->|"query media in grid cell"| Supa
    Supa -->|"media list"| WVS["WorkspaceViewService"]

    subgraph WVS_Inner["WorkspaceViewService"]
        direction TB
        Raw["Raw Media List"]
        Filter["Apply Filters\n(FilterService)"]
        Sort["Apply Sort"]
        Group["Apply Grouping"]
        Emit["Emit Grouped Sections"]
        Raw --> Filter --> Sort --> Group --> Emit
    end

    subgraph Toolbar["Workspace Toolbar"]
        BtnG["Grouping ▾"]
        BtnF["Filter ▾"]
        BtnS["Sort ▾"]
        BtnP["Projects ▾"]
    end

    BtnG -->|"groupingsChanged"| Group
    BtnF -->|"filtersChanged"| Filter
    BtnS -->|"sortChanged"| Sort
    BtnP -->|"projectsChanged"| Filter

    Emit --> Content["Workspace Content Area"]

    subgraph Content_Inner["Content Area"]
        direction TB
        GroupHeader["Group Header\n(collapsible)"]
        ThumbGrid["Thumbnail Grid\n(virtual scroll)"]
        GroupHeader --> ThumbGrid
    end
```

---

## 2. Cluster Click → Workspace Pane Flow

### Coordinate Mismatch (resolved)

`viewport_markers` returns `AVG(lat/lng)` for cluster positions (visually accurate), but the original `cluster_images` WHERE clause compared against grid-snapped values directly. Because `AVG(lat) ≠ ROUND(lat/cell_size)*cell_size`, the RPC returned 0 rows for every cluster click.

**Fix:** `cluster_images` now re-snaps incoming coordinates via a `snapped_input` CTE before comparing. The average position always falls within its source cell, so `ROUND(avg/cell_size)*cell_size` reliably recovers the correct grid cell.

### Solution: RPC `cluster_images`

A Supabase RPC that fetches all media rows within a specific grid cell. It takes the cluster's displayed coordinates (AVG) and zoom level, re-snaps them to the grid, and returns compatibility `image_id` plus canonical `media_item_id`.

```mermaid
sequenceDiagram
    participant U as User
    participant Map as Map (Leaflet)
    participant MS as MapShellComponent
    participant Supa as Supabase
    participant WVS as WorkspaceViewService
    participant WP as Workspace Content

    U->>Map: click marker (single or cluster)
    Map->>MS: handlePhotoMarkerClick(markerKey)
    MS->>MS: photoPanelOpen.set(true)
    MS->>Supa: rpc('cluster_images', {cluster_lat, cluster_lng, zoom})
    Note right of Supa: RPC re-snaps AVG coords<br/>to grid cell internally
    Supa-->>MS: [{id, thumbnail_path, captured_at, project_ids, ...}, ...]
    MS->>WVS: loadClusterImages() → rawImages.set(images)
    WVS->>WVS: apply filters → sort → group
    WVS->>WP: emit grouped media sections
    WP->>WP: render group headings + thumbnail grid
    alt count === 1 && mediaId
        MS->>MS: openDetailView(mediaId)
        Note right of MS: Grid is populated in background<br/>for back-navigation
    else count > 1 (cluster)
        MS->>MS: detailMediaId.set(null)
        Note right of MS: Clear any open detail view<br/>so thumbnail grid renders
    end
```

### New RPC: `cluster_images`

```sql
CREATE OR REPLACE FUNCTION public.cluster_images(
  p_cluster_lat numeric,
  p_cluster_lng numeric,
  p_zoom integer
)
RETURNS TABLE(
  image_id uuid,
  media_item_id uuid,
  latitude numeric,
  longitude numeric,
  thumbnail_path text,
  storage_path text,
  captured_at timestamptz,
  created_at timestamptz,
  project_id uuid,
  project_name text,
  project_ids uuid[],
  project_names text[],
  direction numeric,
  exif_latitude numeric,
  exif_longitude numeric,
  address_label text,
  city text,
  district text,
  street text,
  country text,
  user_name text
)
AS $$
  SELECT
    COALESCE(m.source_image_id, m.id) AS image_id,
    m.id AS media_item_id,
    m.latitude,
    m.longitude,
    m.thumbnail_path,
    m.storage_path,
    m.captured_at,
    m.created_at,
    mp.project_ids[1] AS project_id,
    mp.project_names[1] AS project_name,
    COALESCE(mp.project_ids, '{}'::uuid[]) AS project_ids,
    COALESCE(mp.project_names, '{}'::text[]) AS project_names,
    NULL::numeric AS direction,
    m.exif_latitude,
    m.exif_longitude,
    m.address_label,
    m.city,
    m.district,
    m.street,
    m.country,
    pr.full_name AS user_name
  FROM public.media_items m
  LEFT JOIN LATERAL (
    SELECT
      array_agg(p.id ORDER BY p.name) AS project_ids,
      array_agg(p.name ORDER BY p.name) AS project_names
    FROM public.media_projects mp
    JOIN public.projects p ON p.id = mp.project_id
    WHERE mp.media_item_id = m.id
  ) mp ON TRUE
  LEFT JOIN public.profiles pr ON pr.id = m.created_by
  WHERE m.organization_id = public.user_org_id();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## 3. WorkspaceViewService — Data Pipeline

```mermaid
flowchart LR
    subgraph Inputs["Input Signals"]
        Raw["rawImages\nsignal<Image[]>"]
        Filters["activeFilters\nfrom FilterService"]
        SortConfig["activeSort\nsignal<SortConfig>"]
        Groupings["activeGroupings\nsignal<PropertyRef[]>"]
        Projects["selectedProjects\nsignal<Set<string>>"]
    end

    subgraph Pipeline["Processing Pipeline (computed signals)"]
        direction TB
        P1["1. Project Filter\nimages where project_ids intersects selectedProjects"]
        P2["2. Filter Rules\napply FilterService predicates"]
        P3["3. Sort\nby activeSort.key + direction"]
        P4["4. Group\nby activeGroupings (multi-level)"]
    end

    Raw --> P1
    Projects --> P1
    P1 --> P2
    Filters --> P2
    P2 --> P3
    SortConfig --> P3
    P3 --> P4
    Groupings --> P4

    P4 --> Output["groupedSections\nsignal<GroupedSection[]>"]

    subgraph OutputType["GroupedSection Type"]
        GS["{\n  heading: string\n  headingLevel: number\n  imageCount: number\n  images: WorkspaceImage[]\n  subGroups?: GroupedSection[]\n}"]
    end

    Output --> OutputType
```

### Key Design Decisions

1. **Signals, not RxJS**: The entire pipeline uses Angular computed signals. When any input changes, the pipeline re-evaluates. This is efficient because Angular only recomputes what changed.

2. **Client-side grouping, not server-side**: Media items are loaded once (from cluster query or viewport query), then grouped/sorted/filtered in-memory. This avoids redundant server round-trips when the user drags properties up/down in the Grouping dropdown.

3. **Group headings are virtual**: They're data structures, not DOM elements. The thumbnail grid uses virtual scrolling and renders headings as part of the scroll stream.

---

## 4. Grouped Content Rendering

```mermaid
flowchart TD
    subgraph WVS["WorkspaceViewService Output"]
        GS1["GroupedSection: Zürich (4 media items)"]
        GS2["GroupedSection: Wien (3 media items)"]
        GS3["GroupedSection: No City (1 media item)"]
    end

    subgraph Render["Workspace Content Rendering"]
        direction TB
        H1["▼ Zürich — 4"]
        G1["🖼🖼🖼🖼"]
        H2["▼ Wien — 3"]
        G2["🖼🖼🖼"]
        H3["▼ No City — 1"]
        G3["🖼"]
    end

    GS1 --> H1 --> G1
    GS2 --> H2 --> G2
    GS3 --> H3 --> G3
```

### Group Header Component

```
GroupHeader                                ← sticky within scroll container
├── CollapseToggle (▼/▶)                   ← rotates 90° on collapse
├── GroupName                              ← e.g., "Zürich"
├── ImageCount                             ← e.g., "4 media items", --text-caption
└── .ui-spacer
```

- Group headers are **sticky** (`position: sticky; top: 0`) within the virtual scroll container
- Collapsible: clicking the header toggles visibility of the thumbnail grid below
- Multi-level grouping creates nested indentation (level 2 → `padding-left: 1.5rem`)

---

## 5. Service Architecture

```mermaid
classDiagram
    class WorkspaceViewService {
        +rawImages: WritableSignal~Image[]~
        +selectedProjectIds: WritableSignal~Set~string~~
        +activeSort: WritableSignal~SortConfig~
        +activeGroupings: WritableSignal~PropertyRef[]~
        +groupedSections: Signal~GroupedSection[]~
        +totalImageCount: Signal~number~
        +selectionActive: WritableSignal~boolean~
        +emptySelection: Signal~boolean~
        +loadClusterImages(lat, lng, zoom): Promise~void~
        +loadClusterImages(lat, lng, zoom): Promise~void~\n        +setActiveSelectionImages(images: Image[]): void
        +clearActiveSelection(): void
        -applyFilters(images: Image[]): Image[]
        -applySort(images: Image[]): Image[]
        -applyGrouping(images: Image[]): GroupedSection[]
    }

    class FilterService {
        +rules: WritableSignal~FilterRule[]~
        +activeCount: Signal~number~
        +addRule(): void
        +updateRule(id, patch): void
        +removeRule(id): void
        +clearAll(): void
        +matchesClientSide(image, rules): boolean
    }

    class MetadataService {
        +orgProperties: Signal~MetadataKeyWithType[]~
        +getOrgProperties(): Promise~MetadataKey[]~
        +getImageProperties(mediaId): Promise~ImageMetadata[]~
        +createProperty(name, type): Promise~MetadataKey~
        +deleteProperty(keyId): Promise~void~
        +setPropertyValue(mediaId, keyId, value): Promise~void~
        +removePropertyValue(mediaId, keyId): Promise~void~
    }

    WorkspaceViewService --> FilterService : reads filters
    WorkspaceViewService --> MetadataService : reads property defs
    FilterService --> MetadataService : custom property filters
```

---

## 6. Complete Interaction Map

```mermaid
flowchart TD
    subgraph UserActions["User Actions"]
        ClickMarker["Click Map Marker"]
        ClickGroup["Click 'Grouping'"]
        ClickSort["Click 'Sort'"]
        ClickFilter["Click 'Filter'"]
        ClickProjects["Click 'Projects'"]
        ClickThumb["Click Thumbnail"]
    end

    subgraph Effects["System Effects"]
        LoadImages["Load media\n(cluster_images RPC)"]
        ReGroup["Re-group\n(client-side)"]
        ReSort["Re-sort\n(client-side)"]
        ReFilter["Re-filter\n(client-side)"]
        ReRender["Re-render\nthumbnail grid"]
        OpenDetail["Open Detail View"]
    end

    ClickMarker -->|"count=1"| LoadAndDetail["Load media + Open Detail"]
    ClickMarker -->|"count>1"| ClusterFlow["Load media + Clear Detail"]
    LoadAndDetail --> ReFilter --> ReSort --> ReGroup --> ReRender
    LoadAndDetail --> OpenDetail
    ClusterFlow --> ClearDetail["detailMediaId.set(null)"]
    ClusterFlow --> ReFilter
    ClearDetail --> ReRender

    ClickGroup -->|"activate/deactivate/reorder"| ReGroup
    ClickSort -->|"change sort key/dir"| ReSort
    ClickFilter -->|"add/edit/remove rule"| ReFilter
    ClickProjects -->|"check/uncheck"| ReFilter

    ClickThumb --> OpenDetail

    ReGroup --> ReRender
    ReSort --> ReRender

    style LoadImages fill:#e3f2fd
    style ReFilter fill:#fff3e0
    style ReSort fill:#fff3e0
    style ReGroup fill:#fff3e0
    style ReRender fill:#e8f5e9
```

---

## 7. File Map (all new files across features)

| File                                                                   | Purpose                             | Spec                 |
| ---------------------------------------------------------------------- | ----------------------------------- | -------------------- |
| `features/map/workspace-pane/workspace-toolbar.component.ts/html/scss` | Toolbar with 4 buttons              | workspace-toolbar.md |
| `features/map/workspace-pane/grouping-dropdown.component.ts/html/scss` | Grouping dropdown with drag-reorder | grouping-dropdown.md |
| `features/map/workspace-pane/sort-dropdown.component.ts/html/scss`     | Sort dropdown with search           | sort-dropdown.md     |
| `features/map/workspace-pane/filter-dropdown.component.ts/html/scss`   | Notion-style filter builder         | filter-dropdown.md   |
| `features/map/workspace-pane/filter-rule-row.component.ts`             | Single filter rule row              | filter-dropdown.md   |
| `features/map/workspace-pane/projects-dropdown.component.ts/html/scss` | Projects checklist dropdown         | projects-dropdown.md |
| `features/map/workspace-pane/group-header.component.ts`                | Collapsible group heading           | (this doc)           |
| `features/map/workspace-pane/property-picker.component.ts`             | Floating property picker            | metadata-service.md  |
| `features/settings/property-manager/property-manager.component.*`      | Settings page property CRUD         | metadata-service.md  |
| `core/workspace-view.service.ts`                                       | Media pipeline: filter→sort→group   | (this doc)           |
| `core/filter.service.ts`                                               | Filter rule state + query building  | filter-dropdown.md   |
| `core/metadata.service.ts`                                             | Property CRUD + value management    | metadata-service.md  |
| `supabase/migrations/XXXXX_cluster_images_rpc.sql`                     | New RPC for cluster media loading   | (this doc)           |
| `supabase/migrations/XXXXX_metadata_key_types.sql`                     | value_type + chip_options columns   | metadata-service.md  |

---

## 8. Implementation Priority

```mermaid
gantt
    title Implementation Order
    dateFormat  X
    axisFormat %s

    section Foundation
    cluster_images RPC                :crit, a1, 0, 1
    WorkspaceViewService              :crit, a2, 1, 2
    MetadataService                   :a3, 1, 2
    FilterService                     :a4, 1, 2

    section Workspace Pane
    Cluster click → load media        :crit, b1, 2, 3
    WorkspaceToolbar (4 buttons)      :b2, 2, 3
    ThumbnailGrid + ThumbnailCard     :b3, 3, 4
    GroupHeader (collapsible)          :b4, 4, 5

    section Dropdowns
    Sort Dropdown                     :c1, 3, 4
    Projects Dropdown                 :c2, 3, 4
    Grouping Dropdown (drag-reorder) :c3, 4, 5
    Filter Dropdown (Notion-style)    :c4, 5, 6

    section Properties
    DB migration (value_type + chip_options)  :d1, 5, 6
    Property Manager (Settings)        :d2, 6, 7
    Property Picker (Detail View)      :d3, 6, 7
```

### Phase 1 — Foundation (critical path)

1. `cluster_images` RPC migration
2. `WorkspaceViewService`, `FilterService`, `MetadataService`
3. Wire cluster click → load media → display in workspace

### Phase 2 — Workspace Pane

4. `WorkspaceToolbar` with 4 buttons
5. `ThumbnailGrid` + `ThumbnailCard` components
6. `GroupHeader` component

### Phase 3 — Dropdowns

7. `SortDropdown` (simplest)
8. `ProjectsDropdown` (checklist)
9. `GroupingDropdown` (drag-reorder, most complex dropdown)
10. `FilterDropdown` (Notion-style rules, most complex feature)

### Phase 4 — Custom Properties

11. DB migration for `value_type` + `chip_options`
12. `PropertyManager` in Settings page
13. `PropertyPicker` in Media Detail View
