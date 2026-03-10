# Workspace View — Use Cases & Interaction Scenarios

> **Related specs:** [workspace-pane](../element-specs/workspace-pane.md), [workspace-view-system](../element-specs/workspace-view-system.md), [workspace-toolbar](../element-specs/workspace-toolbar.md), [thumbnail-grid](../element-specs/thumbnail-grid.md), [group-tab-bar](../element-specs/group-tab-bar.md), [filter-dropdown](../element-specs/filter-dropdown.md), [sort-dropdown](../element-specs/sort-dropdown.md), [grouping-dropdown](../element-specs/grouping-dropdown.md), [projects-dropdown](../element-specs/projects-dropdown.md)
> **Product use cases:** [UC1](../archive/use-cases-README.md#uc1--technician-on-site-view-history) §6–7, [UC2](../archive/use-cases-README.md#uc2--clerk-preparing-a-quote) §6–10
> **Related interaction scenarios:** [map-shell IS-2](map-shell.md#is-2-open-workspace-pane-via-marker-click)

---

## Overview

These scenarios describe what happens **inside the Active Selection view** after the workspace pane is already open and populated with images. They cover the full explore → curate → persist workflow: browsing thumbnails, applying filters/sorting/grouping/project scoping, reviewing detail, and saving to named groups.

### Scenario Index

| ID    | Scenario                                 | Persona    |
| ----- | ---------------------------------------- | ---------- |
| WV-1  | Cluster click populates Active Selection | Technician |
| WV-2  | Browse and scroll thumbnails             | Clerk      |
| WV-3  | Sort images by property (multi-sort)     | Clerk      |
| WV-3a | Tri-state direction toggle               | Clerk      |
| WV-3b | Sort + grouping sync                     | Clerk      |
| WV-3c | Reorder sort priority                    | Clerk      |
| WV-4  | Group images by property                 | Clerk      |
| WV-5  | Multi-level grouping                     | Clerk      |
| WV-6  | Filter images with rules                 | Clerk      |
| WV-7  | Scope to projects                        | Clerk      |
| WV-8  | Combined filter + sort + group           | Clerk      |
| WV-9  | Open image detail from thumbnail         | Technician |
| WV-10 | Save Active Selection to named group     | Clerk      |
| WV-11 | Switch between group tabs                | Clerk      |
| WV-12 | Clear all filters and grouping           | Clerk      |

---

## WV-1: Cluster Click Populates Active Selection

**Product context:** UC1 §6 — technician taps cluster marker. UC2 §6 — clerk clicks cluster.
**Related:** [map-shell IS-2](map-shell.md#is-2-open-workspace-pane-via-marker-click), [workspace-view-system §2](../element-specs/workspace-view-system.md)

```mermaid
sequenceDiagram
    actor User
    participant Map as Map (Leaflet)
    participant MS as MapShellComponent
    participant Supa as Supabase
    participant WVS as WorkspaceViewService
    participant WP as WorkspacePane
    participant Grid as ThumbnailGrid

    User->>Map: Click cluster marker (count=12)
    Map->>MS: handlePhotoMarkerClick(markerKey)
    MS->>MS: photoPanelOpen.set(true)
    MS->>WVS: loadClusterImages(cluster_lat, cluster_lng, zoom)
    WVS->>Supa: rpc('cluster_images', {cluster_lat, cluster_lng, zoom})
    Supa-->>WVS: [{id, thumbnail_path, captured_at, project_id, ...} × 12]
    WVS->>WVS: rawImages.set(images), apply pipeline
    WVS-->>WP: emit groupedSections
    WP->>WP: Activate "Selection" tab, show count "(12)"
    WP->>Grid: Render thumbnail grid
    Grid->>Grid: Batch-sign visible thumbnail URLs
    Grid-->>User: Thumbnails fade in progressively
```

**Expected state after:**

- `photoPanelOpen` = true
- `activeTabId` = `'selection'`
- Active Selection tab label shows "(12)"
- Toolbar visible: Grouping, Filter, Sort, Projects
- Thumbnail grid shows 12 images (default sort: Date captured ↓)
- No filters, no grouping, no project scope applied

---

## WV-2: Browse and Scroll Thumbnails

**Product context:** UC2 §6 — clerk reviews thumbnails to assess site condition.

```mermaid
sequenceDiagram
    actor User
    participant Grid as ThumbnailGrid
    participant VScroll as Virtual Scroll
    participant Storage as Supabase Storage

    User->>Grid: Scroll down in thumbnail grid
    Grid->>VScroll: New rows enter viewport
    VScroll->>Grid: Report newly-visible card indices
    Grid->>Grid: Collect cards without signedUrl
    Grid->>Storage: Batch createSignedUrl(paths[], 3600, {transform: 256×256})
    Storage-->>Grid: signedUrls[]
    Grid->>Grid: Assign URLs to cards, fade-in thumbnails

    User->>Grid: Hover over a thumbnail card
    Grid-->>User: Reveal quiet actions (checkbox, add-to-group, ⋯)

    User->>Grid: Continue scrolling
    Note over Grid: Previous off-screen cards retain signed URLs in memory
    Grid->>Storage: Batch-sign next page of thumbnails
    Storage-->>Grid: signedUrls[]
```

**Expected state during:**

- Virtual scroll renders only visible rows (~2–3 columns × visible height)
- Cards show CSS gradient placeholder until thumbnail loads
- Signed URLs are cached in memory — scrolling back up does not re-sign

---

## WV-3: Sort Images by Property (Multi-Sort)

**Product context:** UC2 §6 — clerk wants newest images first, then adds a secondary sort by address to break ties.

```mermaid
sequenceDiagram
    actor User
    participant Toolbar as WorkspaceToolbar
    participant SortDD as SortDropdown
    participant WVS as WorkspaceViewService
    participant Grid as ThumbnailGrid

    User->>Toolbar: Click "Sort" button
    Toolbar->>SortDD: Open sort dropdown
    Note over SortDD: Default: Date captured ↓ active

    User->>SortDD: Click toggle on "City" row (— → ↑)
    SortDD->>SortDD: activeSorts = [date-captured ↓, city ↑]
    SortDD->>WVS: sortChanged([{key:'date-captured',dir:'desc'}, {key:'city',dir:'asc'}])
    WVS->>WVS: Multi-key sort: date desc, then city asc for ties
    WVS-->>Grid: Emit re-sorted images
    Note over Toolbar: Sort button shows active dot (clay)

    User->>SortDD: Click toggle on "Name" row (— → ↑)
    SortDD->>SortDD: activeSorts = [date-captured ↓, city ↑, name ↑]
    SortDD->>WVS: sortChanged([...3 sort keys])
    WVS->>WVS: Multi-key sort: date → city → name
    WVS-->>Grid: Emit re-sorted images

    User->>SortDD: Click toggle on "City" (↑ → ↓ → —)
    SortDD->>SortDD: Cycle: city flips desc, then deactivates
    SortDD->>WVS: sortChanged([{key:'date-captured',dir:'desc'}, {key:'name',dir:'asc'}])
    WVS-->>Grid: Emit re-sorted images (city removed)

    User->>SortDD: Click "Reset to default"
    SortDD->>WVS: sortChanged([{key:'date-captured',dir:'desc'}])
    WVS-->>Grid: Emit default-sorted images
    Note over Toolbar: Sort dot disappears
```

```mermaid
stateDiagram-v2
    [*] --> DefaultSort

    state DefaultSort {
        [*]: activeSorts = [date_captured DESC]
        [*]: Sort button — no active dot
        [*]: Reset row hidden
    }

    state MultiSort {
        [*]: 1+ non-default sorts active
        [*]: Sort button — clay dot visible
        [*]: Reset row shown
        [*]: Active rows highlighted, direction visible
    }

    DefaultSort --> MultiSort: Activate any sort property
    MultiSort --> MultiSort: Toggle direction / add / remove sort
    MultiSort --> DefaultSort: "Reset to default"
    MultiSort --> DefaultSort: Deactivate all until only date_captured ↓ remains
```

**Expected state after multi-sort:**

- `activeSorts` contains ordered array of `{key, direction}` entries
- Images are sorted by first key, ties broken by second key, then third, etc.
- Toolbar sort dot appears when any sort differs from the default `[date-captured ↓]`
- Each active row shows its direction toggle (↑/↓) prominently
- Inactive rows show `—` on hover only

---

## WV-3a: Tri-State Direction Toggle

**Product context:** Clerk fine-tunes sort direction per property, or deactivates a sort without re-sorting by another property.

```mermaid
sequenceDiagram
    actor User
    participant SortDD as SortDropdown
    participant WVS as WorkspaceViewService

    Note over SortDD: "City" row currently —  (inactive)

    User->>SortDD: Click toggle on "City"
    SortDD->>SortDD: — → ↑ (ascending, default direction)
    SortDD->>WVS: sortChanged([..., {key: 'city', dir: 'asc'}])

    User->>SortDD: Click toggle on "City" again
    SortDD->>SortDD: ↑ → ↓ (descending)
    SortDD->>WVS: sortChanged([..., {key: 'city', dir: 'desc'}])

    User->>SortDD: Click toggle on "City" again
    SortDD->>SortDD: ↓ → — (deactivated, removed from activeSorts)
    SortDD->>WVS: sortChanged([... without city])
```

```mermaid
stateDiagram-v2
    [*] --> Inactive
    Inactive --> Ascending: click (activates with default dir)
    Ascending --> Descending: click
    Descending --> Inactive: click (deactivates)

    state Inactive {
        [*]: Display — (dash)
        [*]: Row text-secondary
        [*]: Toggle visible on hover only
    }
    state Ascending {
        [*]: Display ↑ (arrow up)
        [*]: Row text-primary
        [*]: Toggle always visible
    }
    state Descending {
        [*]: Display ↓ (arrow down)
        [*]: Row text-primary
        [*]: Toggle always visible
    }
```

---

## WV-3b: Sort + Grouping Sync

**Product context:** Clerk groups images by City and Project. The sort dropdown auto-promotes City and Project to the "Sorted by grouping" section, and the sort directions control group ordering.

```mermaid
sequenceDiagram
    actor User
    participant GroupDD as GroupingDropdown
    participant SortDD as SortDropdown
    participant WVS as WorkspaceViewService
    participant Content as WorkspaceContent

    Note over SortDD: Default: [date-captured ↓]

    User->>GroupDD: Activate grouping: City
    GroupDD->>WVS: groupingsChanged([{key:'city'}])
    WVS->>WVS: Sync: City auto-added to activeSorts at top if not present
    Note over SortDD: activeSorts = [{key:'city', dir:'asc'}, {key:'date-captured', dir:'desc'}]
    WVS->>Content: Groups sorted A→Z by city name, images sorted newest-first within groups

    User->>GroupDD: Also activate grouping: Project
    GroupDD->>WVS: groupingsChanged([{key:'city'}, {key:'project'}])
    WVS->>WVS: Sync: Project auto-added after City
    Note over SortDD: activeSorts = [city ↑, project ↑, date-captured ↓]
    WVS->>Content: Groups: City → Project, sorted alphabetically

    User->>SortDD: Open sort dropdown
    Note over SortDD: Layout shows:<br/>── Sorted by grouping ──<br/>🏙 City ↑<br/>📁 Project ↑<br/>─────────────<br/>🕐 Date captured ↓<br/>☁️ Date uploaded —<br/>🔤 Name —<br/>...

    User->>SortDD: Click toggle on "City" (↑ → ↓)
    SortDD->>WVS: sortChanged([city ↓, project ↑, date-captured ↓])
    WVS->>Content: City groups now sorted Z→A, project groups still A→Z
    Content->>Content: Re-render: Zürich before Wien before Berlin
```

```mermaid
flowchart TD
    subgraph GroupingDD["Grouping Dropdown"]
        GA["Active: City, Project"]
    end

    subgraph SortDD["Sort Dropdown"]
        direction TB
        Label1["── Sorted by grouping ──"]
        SC["🏙 City           ↑"]
        SP["📁 Project        ↑"]
        Div["─────────────────────"]
        S1["🕐 Date captured  ↓  (user-added)"]
        S2["☁️ Date uploaded  —"]
        S3["🔤 Name           —"]
        S4["📏 Distance       —"]
        S5["📍 Address        —"]
        S6["🏙 Country        —"]

        Label1 --- SC --- SP --- Div --- S1 --- S2 --- S3 --- S4 --- S5 --- S6
    end

    GroupingDD -->|"sync: grouped properties<br/>promoted to top"| SortDD

    subgraph Pipeline["Image Pipeline"]
        direction LR
        Raw["All images"]
        Sorted["Multi-sort:<br/>1. City ↑<br/>2. Project ↑<br/>3. Date captured ↓"]
        Grouped["Group by City → Project<br/>(groups ordered by sort dirs)"]
        Raw --> Sorted --> Grouped
    end

    SortDD -->|activeSorts| Pipeline
```

**Edge cases:**

- User removes a grouping → that property moves back from the grouping section to the normal sort list. If it was only active because of grouping sync, it becomes deactivated.
- User manually activates a sort property, then later adds it as a grouping → it moves to the grouping section but retains its direction from before.
- User changes direction of a grouped property in sort → group ordering updates immediately.

---

## WV-3c: Reorder Sort Priority

**Product context:** Clerk has multiple active sorts and wants to change which property takes priority.

```mermaid
sequenceDiagram
    actor User
    participant SortDD as SortDropdown
    participant WVS as WorkspaceViewService
    participant Grid as ThumbnailGrid

    Note over SortDD: activeSorts = [date-captured ↓, city ↑, name ↑]
    Note over SortDD: Sort priority: 1st Date captured, 2nd City, 3rd Name

    User->>SortDD: Deactivate "Date captured" (↓ → —)
    SortDD->>SortDD: activeSorts = [city ↑, name ↑]
    SortDD->>WVS: sortChanged([city ↑, name ↑])
    WVS-->>Grid: Sort by city, then name

    User->>SortDD: Reactivate "Date captured" (— → ↑)
    SortDD->>SortDD: activeSorts = [city ↑, name ↑, date-captured ↑]
    Note over SortDD: Date captured is now LAST priority (appended)
    SortDD->>WVS: sortChanged([city ↑, name ↑, date-captured ↑])
    WVS-->>Grid: Sort by city, then name, then date
```

**Key rules for sort priority:**

- New sorts are appended to the end of `activeSorts` (lowest priority)
- Grouped properties always occupy first positions (in grouping order)
- Deactivating and reactivating a sort moves it to the end
- "Reset to default" returns to `[date-captured ↓]` only

---

## WV-4: Group Images by Property

**Product context:** UC2 §7–9 — clerk groups images by city to compare site conditions across locations.

```mermaid
sequenceDiagram
    actor User
    participant Toolbar as WorkspaceToolbar
    participant GroupDD as GroupingDropdown
    participant WVS as WorkspaceViewService
    participant Content as WorkspaceContent

    User->>Toolbar: Click "Grouping" button
    Toolbar->>GroupDD: Open grouping dropdown

    Note over GroupDD: Active section: empty<br/>Available section: Address, City, Country, Date, Project, User

    User->>GroupDD: Click "City" in Available section
    GroupDD->>GroupDD: Move "City" from Available → Active
    GroupDD->>WVS: groupingsChanged([{key: 'city'}])
    WVS->>WVS: Group images by city value
    WVS-->>Content: Emit GroupedSection[] [{heading: "Zürich", images: [...]}, ...]

    Content->>Content: Render group headers + thumbnail grids per section
    Note over Toolbar: Grouping button shows active dot
```

```mermaid
flowchart TD
    subgraph Before["Before Grouping — Flat List"]
        direction LR
        I1["🖼 Zürich"]
        I2["🖼 Wien"]
        I3["🖼 Zürich"]
        I4["🖼 Wien"]
        I5["🖼 Berlin"]
    end

    subgraph After["After Grouping by City"]
        direction TB
        H1["▼ Berlin — 1 photo"]
        G1["🖼"]
        H2["▼ Wien — 2 photos"]
        G2["🖼 🖼"]
        H3["▼ Zürich — 2 photos"]
        G3["🖼 🖼"]
    end

    Before -->|"groupBy: City"| After
```

---

## WV-5: Multi-Level Grouping

**Product context:** UC2 §8 — clerk groups by City then by Project to see which projects have work in each city.

```mermaid
sequenceDiagram
    actor User
    participant GroupDD as GroupingDropdown
    participant WVS as WorkspaceViewService
    participant Content as WorkspaceContent

    Note over GroupDD: Active: [City]<br/>Available: Address, Country, Date, Project, User

    User->>GroupDD: Click "Project" in Available section
    GroupDD->>GroupDD: Move "Project" from Available → Active (after City)
    GroupDD->>WVS: groupingsChanged([{key: 'city'}, {key: 'project'}])

    WVS->>WVS: Group by City first, then by Project within each city
    WVS-->>Content: Emit nested GroupedSection[]

    Content->>Content: Render nested headings

    User->>GroupDD: Drag "Project" above "City" in Active section
    GroupDD->>WVS: groupingsChanged([{key: 'project'}, {key: 'city'}])
    WVS->>WVS: Regroup: Project first, then City within each project
    WVS-->>Content: Emit restructured GroupedSection[]
```

```mermaid
flowchart TD
    subgraph Level1["Grouped: City → Project"]
        direction TB
        H_Z["▼ Zürich — 4 photos"]
        H_ZP1["  ▸ Brücke Nord — 2"]
        G_ZP1["  🖼 🖼"]
        H_ZP2["  ▸ Sanierung Ost — 2"]
        G_ZP2["  🖼 🖼"]
        H_W["▼ Wien — 3 photos"]
        H_WP1["  ▸ Donaukanal — 3"]
        G_WP1["  🖼 🖼 🖼"]
    end

    subgraph Level2["Reordered: Project → City"]
        direction TB
        H_P1["▼ Brücke Nord — 2 photos"]
        H_P1C["  ▸ Zürich — 2"]
        G_P1C["  🖼 🖼"]
        H_P2["▼ Donaukanal — 3 photos"]
        H_P2C["  ▸ Wien — 3"]
        G_P2C["  🖼 🖼 🖼"]
        H_P3["▼ Sanierung Ost — 2 photos"]
        H_P3C["  ▸ Zürich — 2"]
        G_P3C["  🖼 🖼"]
    end

    Level1 -->|"drag Project above City"| Level2
```

---

## WV-6: Filter Images with Rules

**Product context:** UC2 §5 — clerk narrows results with metadata filters (e.g., "Material = Beton").

```mermaid
sequenceDiagram
    actor User
    participant Toolbar as WorkspaceToolbar
    participant FilterDD as FilterDropdown
    participant FS as FilterService
    participant WVS as WorkspaceViewService
    participant Grid as ThumbnailGrid

    User->>Toolbar: Click "Filter" button
    Toolbar->>FilterDD: Open filter dropdown
    Note over FilterDD: Empty state: "No filters applied"

    User->>FilterDD: Click "+ Add a filter"
    FilterDD->>FilterDD: New blank rule row appears

    User->>FilterDD: Select property "Date captured"
    FilterDD->>FilterDD: Operator list updates: is, is before, is after, is between

    User->>FilterDD: Select operator "is after"
    FilterDD->>FilterDD: Value input shows date picker

    User->>FilterDD: Select date "2025-01-01"
    FilterDD->>FS: addRule({property: 'captured_at', operator: 'is_after', value: '2025-01-01'})
    FS->>WVS: filtersChanged
    WVS->>WVS: Re-filter: keep images where captured_at > 2025-01-01
    WVS-->>Grid: Emit filtered images
    Grid->>Grid: Re-render (fewer thumbnails)
    Note over Toolbar: Filter button shows active dot

    User->>FilterDD: Click "+ Add a filter" again
    User->>FilterDD: Select "Address" → "contains" → "Burg"
    FilterDD->>FS: addRule({property: 'address', operator: 'contains', value: 'Burg'})
    FS->>WVS: filtersChanged
    WVS->>WVS: Re-filter: both rules applied (AND logic)
    WVS-->>Grid: Emit further-filtered images
```

```mermaid
flowchart TD
    subgraph Rules["Active Filter Rules"]
        R1["Where Date captured is after 2025-01-01"]
        R2["And Address contains 'Burg'"]
    end

    subgraph Pipeline["Filter Pipeline"]
        All["All 12 images"]
        F1["After date filter: 8 images"]
        F2["After address filter: 3 images"]
    end

    All --> F1
    R1 -->|"predicate"| F1
    F1 --> F2
    R2 -->|"predicate"| F2

    F2 --> Result["3 images shown in grid"]
```

---

## WV-7: Scope to Projects

**Product context:** UC2 §3 — clerk selects projects relevant to the quote.

```mermaid
sequenceDiagram
    actor User
    participant Toolbar as WorkspaceToolbar
    participant ProjDD as ProjectsDropdown
    participant WVS as WorkspaceViewService
    participant Grid as ThumbnailGrid

    User->>Toolbar: Click "Projects" button
    Toolbar->>ProjDD: Open projects dropdown
    Note over ProjDD: "All projects" ✓ (all checked by default)

    User->>ProjDD: Uncheck "All projects"
    ProjDD->>ProjDD: All project rows unchecked
    ProjDD->>WVS: projectFilterChanged(empty)
    WVS-->>Grid: Emit empty (no projects selected = no images)
    Note over Grid: Empty state: "No images match the current filters"

    User->>ProjDD: Check "Brücke Nord"
    ProjDD->>WVS: projectFilterChanged(Set['brücke-nord-id'])
    WVS->>WVS: Filter to images where project_id = 'brücke-nord-id'
    WVS-->>Grid: Emit filtered images

    User->>ProjDD: Also check "Sanierung Ost"
    ProjDD->>WVS: projectFilterChanged(Set['brücke-nord-id', 'sanierung-ost-id'])
    WVS-->>Grid: Emit images from both projects
    Note over ProjDD: "All projects" shows indeterminate (–) checkbox
    Note over Toolbar: Projects button shows active dot
```

```mermaid
stateDiagram-v2
    [*] --> AllSelected

    state AllSelected {
        [*]: All projects checked
        [*]: No project filter active
        [*]: Toolbar dot hidden
    }

    state SomeSelected {
        [*]: Subset checked
        [*]: "All projects" = indeterminate (–)
        [*]: Toolbar dot visible
    }

    state NoneSelected {
        [*]: No projects checked
        [*]: Grid shows empty state
        [*]: Toolbar dot visible
    }

    AllSelected --> SomeSelected: Uncheck one project
    SomeSelected --> AllSelected: Click "All projects" checkbox
    SomeSelected --> SomeSelected: Check/uncheck individual
    SomeSelected --> NoneSelected: Uncheck all remaining
    NoneSelected --> SomeSelected: Check one project
    NoneSelected --> AllSelected: Click "All projects"
```

---

## WV-8: Combined Filter + Sort + Group

**Product context:** UC2 §5–9 — clerk applies all controls together for a comprehensive workspace view.

```mermaid
sequenceDiagram
    actor User
    participant WVS as WorkspaceViewService
    participant Grid as ThumbnailGrid

    Note over User: Starting state: 45 images from cluster click

    User->>WVS: Projects → check "Brücke Nord" only
    WVS->>WVS: 45 → 18 images (project filter)

    User->>WVS: Filter → "Date captured is after 2025-06-01"
    WVS->>WVS: 18 → 9 images (date filter)

    User->>WVS: Sort → activate "Address ↑" + keep "Date captured ↓"
    WVS->>WVS: activeSorts = [date-captured ↓, address ↑]
    WVS->>WVS: 9 images: primary by date desc, ties by address asc

    User->>WVS: Group → activate "City"
    WVS->>WVS: Sync: City auto-promoted to top of activeSorts
    WVS->>WVS: activeSorts = [city ↑, date-captured ↓, address ↑]
    WVS->>WVS: 9 images grouped into sections by city, groups sorted A→Z

    WVS-->>Grid: Emit GroupedSection[] with sorted, filtered images
    Grid->>Grid: Render group headers + thumbnail grids
```

```mermaid
flowchart LR
    subgraph Input["Raw: 45 images"]
        direction TB
        A["All images from cluster"]
    end

    subgraph P1["Step 1: Project Filter"]
        B["18 images\n(Brücke Nord only)"]
    end

    subgraph P2["Step 2: Filter Rules"]
        C["9 images\n(after 2025-06-01)"]
    end

    subgraph P3["Step 3: Multi-Sort"]
        D["9 images\n1. City ↑ (from grouping)\n2. Date captured ↓\n3. Address ↑"]
    end

    subgraph P4["Step 4: Group by City"]
        E["GroupedSection[]\nBerlin (2) · Wien (3) · Zürich (4)\n(groups A→Z by city sort dir)"]
    end

    A --> B --> C --> D --> E
```

---

## WV-9: Open Image Detail from Thumbnail

**Product context:** UC1 §6 — technician taps thumbnail to see full image. UC2 §9 — clerk inspects detail.

```mermaid
sequenceDiagram
    actor User
    participant Grid as ThumbnailGrid
    participant WP as WorkspacePane
    participant Detail as ImageDetailView
    participant Storage as Supabase Storage

    User->>Grid: Click thumbnail card
    Grid->>WP: detailImageId.set(imageId)
    WP->>WP: Content switches from grid to detail view
    WP->>Detail: Render ImageDetailView for imageId

    Detail->>Detail: Show tier-2 thumbnail (256px) immediately as placeholder
    Detail->>Storage: createSignedUrl(storage_path, 3600) [full resolution]
    Storage-->>Detail: signedUrl (full-res)
    Detail->>Detail: Crossfade from thumbnail to full-res

    Note over Detail: Shows: full image, metadata, map pin, project, properties

    User->>Detail: Click back arrow (←)
    Detail->>WP: detailImageId.set(null)
    WP->>WP: Content switches back to grid
    Note over Grid: Scroll position preserved, filter/sort/group state unchanged
```

```mermaid
stateDiagram-v2
    [*] --> GridView

    state GridView {
        [*]: ThumbnailGrid visible
        [*]: Toolbar visible
        [*]: Group headers visible (if grouping active)
    }

    state DetailView {
        [*]: ImageDetailView replaces grid
        [*]: Back arrow in header
        [*]: Toolbar hidden
        [*]: Full image + metadata + map context
    }

    GridView --> DetailView: Click thumbnail card
    DetailView --> GridView: Click back arrow
    DetailView --> DetailView: Swipe / arrow to next image
```

---

## WV-10: Save Active Selection to Named Group

**Product context:** UC1 §7 — technician saves interesting images. UC2 §7 — clerk creates group for quote.

```mermaid
sequenceDiagram
    actor User
    participant TabBar as GroupTabBar
    participant WP as WorkspacePane
    participant Supa as Supabase
    participant TabBar2 as GroupTabBar (updated)

    Note over WP: Active Selection has 9 images (post-filter)

    User->>TabBar: Click "+" button
    TabBar->>TabBar: Show inline name input, auto-focus

    User->>TabBar: Type "Quote 2026-03 Zürich" + Enter
    TabBar->>Supa: INSERT INTO saved_groups (name, organization_id)
    Supa-->>TabBar: {id: 'new-group-id', name: 'Quote 2026-03 Zürich'}

    TabBar->>Supa: INSERT INTO saved_group_images (group_id, image_id) × 9
    Supa-->>TabBar: Success

    TabBar->>TabBar2: New tab appears: "Quote 2026-03 Zürich (9)"
    TabBar2->>WP: activeTabId.set('new-group-id')
    WP->>WP: Content switches to named group view
    Note over WP: Named group persists across sessions
```

```mermaid
flowchart TD
    subgraph ActiveSelection["Active Selection (ephemeral)"]
        AS["9 filtered images\nfrom cluster click"]
    end

    User["User clicks '+' → names group"]

    subgraph NamedGroup["Named Group (persistent)"]
        NG["'Quote 2026-03 Zürich'\n9 images saved to DB"]
    end

    ActiveSelection --> User --> NamedGroup

    subgraph TabBar["Group Tab Bar"]
        T1["Selection (9)"]
        T2["Quote 2026-03 Zürich (9)"]
    end

    NamedGroup --> T2
```

---

## WV-11: Switch Between Group Tabs

**Product context:** UC2 §8–9 — clerk switches between Active Selection and saved groups.

```mermaid
sequenceDiagram
    actor User
    participant TabBar as GroupTabBar
    participant WVS as WorkspaceViewService
    participant Grid as ThumbnailGrid

    Note over TabBar: Tabs: [Selection (12)] [Quote Zürich (9)] [Quote Wien (5)]

    User->>TabBar: Click "Quote Zürich" tab
    TabBar->>WVS: setActiveTab('quote-zurich-id')
    WVS->>WVS: Load saved group images (from DB)
    WVS->>WVS: Apply current filters + sort + group to group images
    WVS-->>Grid: Emit processed images for this group
    Grid->>Grid: Re-render with group's thumbnails

    User->>TabBar: Click "Selection" tab (back to Active Selection)
    TabBar->>WVS: setActiveTab('selection')
    WVS->>WVS: Restore Active Selection images
    WVS-->>Grid: Emit Active Selection images (with current filters/sort/group)
    Note over Grid: Toolbar controls apply equally to all tabs
```

---

## WV-12: Clear All Filters and Grouping

**Product context:** User wants to reset the workspace view to its default state.

```mermaid
sequenceDiagram
    actor User
    participant Toolbar as WorkspaceToolbar
    participant GroupDD as GroupingDropdown
    participant FilterDD as FilterDropdown
    participant FS as FilterService
    participant WVS as WorkspaceViewService
    participant Grid as ThumbnailGrid

    Note over Toolbar: Active state: 2 groupings, 3 filter rules, custom sort, 1 project selected

    User->>Toolbar: Click "Grouping" → click "Empty" button
    GroupDD->>WVS: groupingsChanged([])
    Note over Toolbar: Grouping dot disappears

    User->>Toolbar: Click "Filter" → remove each rule (or ×)
    FilterDD->>FS: clearAll()
    FS->>WVS: filtersChanged (empty)
    Note over Toolbar: Filter dot disappears

    User->>Toolbar: Click "Projects" → click "All projects" checkbox
    WVS->>WVS: projectFilterChanged(empty = all)
    Note over Toolbar: Projects dot disappears

    User->>Toolbar: Click "Sort" → click "Reset to default"
    WVS->>WVS: sortChanged([{key: 'captured_at', direction: 'desc'}])
    Note over Toolbar: Sort dot disappears

    WVS->>WVS: Pipeline runs with no filters, default sort, no grouping
    WVS-->>Grid: Emit all images, flat list, newest first
    Note over Grid: Back to initial state — all toolbar dots cleared
```

```mermaid
flowchart LR
    subgraph Filtered["Filtered State"]
        A["3 images\ngrouped by City\nsorted by Address\nproject: Brücke Nord\n3 filter rules"]
    end

    subgraph Reset["Reset State"]
        B["All 12 images\nflat list\nsorted by Date ↓\nall projects\nno filters"]
    end

    Filtered -->|"Clear grouping\nClear filters\nAll projects\nDefault sort"| Reset
```

---

## End-to-End Flow: Explore → Curate → Persist

This diagram shows the complete lifecycle of the Active Selection view across all scenarios.

```mermaid
flowchart TD
    subgraph Explore["1. Explore"]
        MarkerClick["Click cluster marker\non map"]
        RadiusSelect["Radius selection\n(long-press drag)"]
    end

    subgraph Populate["2. Populate Active Selection"]
        ClusterRPC["cluster_images RPC"]
        RadiusRPC["Viewport query\n(bounded radius)"]
        SetImages["WorkspaceViewService\n.loadClusterImages()"]
    end

    subgraph Curate["3. Curate (Workspace View)"]
        direction TB
        ProjectScope["Scope to projects"]
        Filter["Apply filter rules"]
        Sort["Sort by property"]
        Group["Group by property"]
        Browse["Browse thumbnails"]
        Detail["Inspect image detail"]
    end

    subgraph Persist["4. Persist"]
        SaveGroup["Save as named group"]
        SwitchTab["Switch to group tab\nfor later reference"]
    end

    MarkerClick --> ClusterRPC --> SetImages
    RadiusSelect --> RadiusRPC --> SetImages
    SetImages --> ProjectScope --> Filter --> Sort --> Group --> Browse
    Browse --> Detail
    Detail -->|"back"| Browse
    Browse --> SaveGroup --> SwitchTab
    SwitchTab -->|"switch back"| Browse

    style Explore fill:#e3f2fd
    style Curate fill:#fff3e0
    style Persist fill:#e8f5e9
```
