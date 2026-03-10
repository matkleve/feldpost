# Sort Dropdown

## What It Is

A dropdown for managing the sort order of images in the workspace pane. Supports **multi-sort** — multiple properties can be active simultaneously with priority ordering. Each sort property has a tri-state toggle cycling through ascending → descending → deactivated. When groupings are active, the sort list auto-promotes grouped properties to the top in grouping order, so that groups are also sorted by the same criteria.

## What It Looks Like

Floating dropdown anchored below the "Sort" toolbar button. Width: 15rem (240px). `--color-bg-elevated` background, `shadow-xl`, `rounded-lg` corners. Top: a compact search input (`--text-small`, `--color-border-strong` bottom border, no box outline — Notion-style inline search) with a clear (×) button when non-empty. Below: a list of sort options as `.ui-item` rows.

**Sort option rows** — each row contains:

- **Left**: Property icon (Material Icon) + property label
- **Right**: Tri-state direction button cycling: `↑` (ascending) → `↓` (descending) → `—` (deactivated)

Active sort options have `--color-primary` text. The direction button is always visible on active rows, and appears on hover for inactive rows. When groupings are active, the grouped properties appear in a "Sorted by grouping" section at the top, separated by a subtle border.

**Reset row**: When any non-default sort is active, a "Reset to default" row appears at the top with a `restart_alt` icon.

## Where It Lives

- **Parent**: `WorkspaceToolbarComponent`
- **Appears when**: User clicks the "Sort" toolbar button

## Actions

| #   | User Action                             | System Response                                               | Triggers               |
| --- | --------------------------------------- | ------------------------------------------------------------- | ---------------------- |
| 1   | Types in search input                   | Filters visible sort options                                  | `searchTerm` changes   |
| 2   | Clears search (× button)                | Shows all options again                                       | `searchTerm` cleared   |
| 3   | Clicks direction toggle on inactive row | Activates sort with default direction; adds to active sorts   | `activeSorts` updated  |
| 4   | Clicks direction toggle on active row   | Cycles: asc → desc → deactivated                              | `activeSorts` updated  |
| 5   | Clicks "Reset to default"               | Removes all custom sorts; returns to Date captured ↓          | `activeSorts` reset    |
| 6   | Clicks outside or Escape                | Closes dropdown                                               | Dropdown closes        |
| 7   | Activates a grouping (in GroupingDD)    | Grouped property auto-appears in "Sorted by grouping" section | Grouping syncs to sort |
| 8   | Removes a grouping                      | Property returns to normal sort list position                 | Grouping syncs to sort |

## Component Hierarchy

```
SortDropdown                               ← floating dropdown, --color-bg-elevated, shadow-xl, rounded-lg
├── SearchInput                            ← compact, placeholder "Search properties…", --text-small
│   └── [non-empty] ClearButton (×)        ← trailing, clears search term
├── [has custom sort] ResetRow             ← "Reset to default", restart_alt icon
├── [has groupings] GroupingSortSection     ← "Sorted by grouping" label
│   └── SortOptionRow × N (grouped)        ← mirror grouping order, direction toggle only
│       ├── PropertyIcon                   ← Material Icon
│       ├── PropertyLabel                  ← property name
│       └── DirectionToggle (↑/↓/—)       ← tri-state, always visible
├── [has groupings] Divider                ← 1px border separating sections
├── OptionsList                            ← scrollable, remaining sort properties
│   └── SortOptionRow × N                  ← .ui-item
│       ├── PropertyIcon                   ← Material Icon
│       ├── PropertyLabel                  ← property name
│       └── DirectionToggle (↑/↓/—)       ← tri-state, visible on hover or when active
└── [no results] EmptyHint                 ← "No matching properties"
```

### Sort Options (built-in)

| Property      | Default Direction | Icon            |
| ------------- | ----------------- | --------------- |
| Date captured | Descending (↓)    | `schedule`      |
| Date uploaded | Descending (↓)    | `cloud_upload`  |
| Name          | Ascending (↑)     | `sort_by_alpha` |
| Distance      | Ascending (↑)     | `straighten`    |
| Address       | Ascending (↑)     | `location_on`   |
| City          | Ascending (↑)     | `location_city` |
| Country       | Ascending (↑)     | `flag`          |
| Project       | Ascending (↑)     | `folder`        |

### Direction Toggle — Tri-State

| State       | Display | Meaning       | Next Click  |
| ----------- | ------- | ------------- | ----------- |
| Ascending   | ↑       | A→Z / Old→New | Descending  |
| Descending  | ↓       | Z→A / New→Old | Deactivated |
| Deactivated | —       | Not sorting   | Ascending   |

## Data

| Field               | Source                                   | Type            |
| ------------------- | ---------------------------------------- | --------------- |
| Built-in properties | Hardcoded list                           | `SortOption[]`  |
| Active groupings    | `WorkspaceViewService.activeGroupings()` | `PropertyRef[]` |

## State

| Name           | Type                                                 | Default                                         | Controls                      |
| -------------- | ---------------------------------------------------- | ----------------------------------------------- | ----------------------------- |
| `searchTerm`   | `string`                                             | `''`                                            | Filters visible sort options  |
| `activeSorts`  | `Array<{ key: string; direction: 'asc' \| 'desc' }>` | `[{ key: 'date-captured', direction: 'desc' }]` | Ordered list of active sorts  |
| `groupingKeys` | `string[]`                                           | `[]`                                            | Derived from active groupings |

## File Map

| File                                                       | Purpose                   |
| ---------------------------------------------------------- | ------------------------- |
| `features/map/workspace-pane/sort-dropdown.component.ts`   | Sort dropdown with search |
| `features/map/workspace-pane/sort-dropdown.component.scss` | Styles                    |

## Wiring

- Rendered inside `WorkspaceToolbarComponent` via `@if (activeDropdown() === 'sort')`
- Emits `sortChanged` to `WorkspaceViewService` with full `SortConfig[]` array
- `WorkspaceViewService` sorts images using multi-key comparator
- When groupings are active, group ordering uses the same sort directions
- `WorkspaceViewService.activeGroupings()` is read to determine which properties appear in the grouping section

## Acceptance Criteria

- [ ] Multi-sort: multiple properties can be active simultaneously
- [ ] Tri-state direction toggle per row: ascending → descending → deactivated
- [ ] Active groupings auto-promoted to "Sorted by grouping" section at top
- [ ] Grouping section mirrors grouping order and applies sort direction to group ordering
- [ ] "Reset to default" row when any custom sort is active
- [ ] Search input with clear (×) button
- [x] Dropdown uses `position: fixed` to escape overflow
- [x] Row hover: clay 8% background tint
- [ ] Direction toggle always visible on active rows, on-hover for inactive
- [ ] Empty state "No matching properties" when search has no results
- [ ] Sort state persists across dropdown open/close (reads from WorkspaceViewService)

---

## Sort Flow — Multi-Sort

```mermaid
sequenceDiagram
    actor User
    participant TB as Toolbar "Sort" Button
    participant SD as SortDropdown
    participant WVS as WorkspaceViewService
    participant WP as Workspace Content

    User->>TB: click
    TB->>SD: open dropdown
    Note over SD: Default state: Date captured ↓ (active)

    User->>SD: click ↑ on "City" row
    SD->>SD: activeSorts = [{key: 'date-captured', dir: 'desc'}, {key: 'city', dir: 'asc'}]
    SD->>WVS: sortChanged([{key: 'date-captured', dir: 'desc'}, {key: 'city', dir: 'asc'}])
    WVS->>WVS: sort by date-captured desc, then city asc
    WVS->>WP: emit re-sorted images

    User->>SD: click toggle on "City" (↑ → ↓)
    SD->>SD: city direction flips to desc
    SD->>WVS: sortChanged([{key: 'date-captured', dir: 'desc'}, {key: 'city', dir: 'desc'}])
    WVS->>WP: emit re-sorted images

    User->>SD: click toggle on "City" (↓ → —)
    SD->>SD: city deactivated; activeSorts = [{key: 'date-captured', dir: 'desc'}]
    SD->>WVS: sortChanged([{key: 'date-captured', dir: 'desc'}])
    WVS->>WP: emit re-sorted images
```

## Sort + Grouping Sync

```mermaid
flowchart TD
    subgraph GroupingDD["Grouping Dropdown"]
        G1["Active: City, Project"]
    end

    subgraph SortDD["Sort Dropdown"]
        direction TB
        Section1["── Sorted by grouping ──"]
        S1["🏙 City         ↑"]
        S2["📁 Project      ↑"]
        Divider["────────────────"]
        S3["🕐 Date captured ↓  (active)"]
        S4["☁️ Date uploaded —"]
        S5["🔤 Name         —"]
        S6["📏 Distance     —"]

        Section1 --> S1 --> S2 --> Divider --> S3 --> S4 --> S5 --> S6
    end

    GroupingDD -->|"sync grouping order"| SortDD

    subgraph Pipeline["Image Pipeline"]
        direction LR
        Raw["Raw images"]
        Sorted["Multi-sort:\n1. City ↑\n2. Project ↑\n3. Date captured ↓"]
        Grouped["Group by City → Project\n(groups ordered by sort)"]
        Raw --> Sorted --> Grouped
    end

    SortDD -->|"activeSorts[]"| Pipeline
```

## Sort Dropdown — State Machine

```mermaid
stateDiagram-v2
    [*] --> DefaultSort

    state DefaultSort {
        [*]: activeSorts = [date_captured DESC]\nToolbar dot hidden\nReset row hidden
    }

    state CustomSort {
        [*]: One or more non-default sorts active\nToolbar dot visible (clay)\nReset row shown\nActive rows highlighted
    }

    state GroupingSync {
        [*]: Grouping properties promoted\nGrouping section visible\nSort directions applied to group order
    }

    state Searching {
        [*]: searchTerm non-empty\nOptions filtered by name\nGrouping section also filtered
    }

    state EmptySearch {
        [*]: No options match search\n"No matching properties" shown
    }

    DefaultSort --> CustomSort: activate a sort property
    CustomSort --> CustomSort: toggle direction / activate another
    CustomSort --> DefaultSort: "Reset to default"
    DefaultSort --> GroupingSync: grouping activated externally
    CustomSort --> GroupingSync: grouping activated externally
    GroupingSync --> GroupingSync: change sort direction on grouped property
    GroupingSync --> DefaultSort: all groupings + custom sorts removed
    DefaultSort --> Searching: type in search
    CustomSort --> Searching: type in search
    GroupingSync --> Searching: type in search
    Searching --> EmptySearch: no matches
    EmptySearch --> Searching: edit search term
```

## Direction Toggle — Tri-State Cycle

```mermaid
stateDiagram-v2
    [*] --> Deactivated

    state Deactivated {
        [*]: — (dash)\nNo sort applied\nRow text-secondary
    }
    state Ascending {
        [*]: ↑ arrow\nA→Z / oldest first\nRow text-primary
    }
    state Descending {
        [*]: ↓ arrow\nZ→A / newest first\nRow text-primary
    }

    Deactivated --> Ascending: click toggle
    Ascending --> Descending: click toggle
    Descending --> Deactivated: click toggle
```

## Multi-Sort Priority Example

```mermaid
flowchart TD
    subgraph SortOrder["Active Sorts (priority order)"]
        direction TB
        P1["1. City ↑"]
        P2["2. Date captured ↓"]
    end

    subgraph Result["Sorted Image List"]
        direction TB
        R1["Berlin · 2026-03-07"]
        R2["Berlin · 2026-02-15"]
        R3["Wien · 2026-03-05"]
        R4["Wien · 2026-01-10"]
        R5["Zürich · 2026-03-08"]
        R6["Zürich · 2026-02-20"]
    end

    SortOrder --> Result
    Note1["Primary: City ascending (Berlin → Wien → Zürich)\nSecondary: Date descending within each city (newest first)"]
```

```

```
