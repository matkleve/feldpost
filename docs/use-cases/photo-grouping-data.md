# Photo Grouping — Data Sources & Derivation

> **Related specs:** [grouping-dropdown](../element-specs/grouping-dropdown.md), [workspace-view-system](../element-specs/workspace-view-system.md), [workspace-toolbar](../element-specs/workspace-toolbar.md)
> **Related use cases:** [workspace-view WV-4, WV-5](workspace-view.md)

---

## Overview

Photos can be grouped by various properties. Some properties are stored directly on each image row, some are derived from other fields at query time or on the client, and some require external resolution (reverse geocoding). This document maps every grouping property to its data source, derivation logic, and fallback behaviour.

---

## Grouping Property Matrix

| Property     | DB Column(s)              | Source                     | Derivation                                      | Fallback Label       |
| ------------ | ------------------------- | -------------------------- | ----------------------------------------------- | -------------------- |
| **Date**     | `captured_at`             | EXIF extraction at upload  | `toLocaleDateString(full)`                      | `"Unknown date"`     |
| **Year**     | `captured_at`             | EXIF extraction at upload  | `getFullYear()`                                 | `"Unknown year"`     |
| **Month**    | `captured_at`             | EXIF extraction at upload  | `toLocaleDateString(year+month)` → "March 2026" | `"Unknown month"`    |
| **Project**  | `project_id` → `projects` | User assignment at upload  | JOIN project name                               | `"No project"`       |
| **City**     | `city`                    | Reverse geocoding from GPS | Stored directly after address resolution        | `"Unknown city"`     |
| **Country**  | `country`                 | Reverse geocoding from GPS | Stored directly after address resolution        | `"Unknown country"`  |
| **Street**   | `street`                  | Reverse geocoding from GPS | Stored directly after address resolution        | `"Unknown street"`   |
| **District** | `district`                | Reverse geocoding from GPS | Stored directly after address resolution        | `"Unknown district"` |
| **Address**  | `address_label`           | Reverse geocoding / manual | Full human-readable label                       | `"Unknown address"`  |
| **User**     | `user_id` → `profiles`    | Auth at upload             | JOIN profile full_name                          | `"Unknown user"`     |

---

## Data Flow: How Address Fields Get Populated

```mermaid
flowchart TD
    subgraph Upload["Photo Upload"]
        EXIF["Extract EXIF\n(GPS coords, timestamp)"]
        Store["Store image row\n(lat, lng, captured_at)"]
        EXIF --> Store
    end

    subgraph AddressResolution["Address Resolution (async)"]
        GPS["Image has GPS\n(latitude, longitude)"]
        Geocode["Reverse-geocode via\nNominatim / provider"]
        Parse["Parse structured response:\ncity, district, street,\ncountry, address_label"]
        Update["UPDATE images SET\ncity, district, street,\ncountry, address_label"]
        GPS --> Geocode --> Parse --> Update
    end

    subgraph ManualEntry["Manual Address Entry"]
        UserInput["User types address\nin upload panel"]
        Forward["Forward-geocode to\ncoordinates + structured"]
        ManualUpdate["UPDATE images SET\nlat, lng, city, street, ..."]
        UserInput --> Forward --> ManualUpdate
    end

    Store -->|"location_unresolved = true"| GPS
    Store -->|"no GPS"| UserInput

    subgraph Grouping["Client-side Grouping"]
        LoadRPC["cluster_images RPC\nreturns city, district,\nstreet, country, user_name"]
        ClientGroup["WorkspaceViewService\ngetGroupValue() reads\nstructured fields"]
        LoadRPC --> ClientGroup
    end

    Update --> LoadRPC
    ManualUpdate --> LoadRPC
```

---

## Data Flow: Date-Derived Groupings

```mermaid
flowchart LR
    subgraph Source["captured_at (EXIF timestamp)"]
        TS["2025-06-15T14:30:00Z"]
    end

    subgraph Derived["Client-side Derivation"]
        Date["Date: June 15, 2025"]
        Month["Month: June 2025"]
        Year["Year: 2025"]
    end

    TS --> Date
    TS --> Month
    TS --> Year
```

No extra DB columns needed — `captured_at` is parsed on the client into date, month, or year labels.

---

## Data Flow: User Grouping

```mermaid
flowchart LR
    subgraph DB["Database"]
        ImgRow["images.user_id"]
        Profile["profiles.full_name"]
    end

    subgraph RPC["cluster_images RPC"]
        Join["LEFT JOIN profiles\nON user_id = profiles.id"]
        Return["Return user_name\nin result set"]
    end

    ImgRow --> Join
    Profile --> Join
    Join --> Return
```

The `cluster_images` RPC joins `profiles` to return the uploader's name alongside each image.

---

## Use Cases

### UC-G1: Grouping by City (address already resolved)

**Precondition:** Images have been reverse-geocoded; `city` column is populated.

```mermaid
sequenceDiagram
    actor User
    participant Toolbar as WorkspaceToolbar
    participant GroupDD as GroupingDropdown
    participant WVS as WorkspaceViewService
    participant Content as WorkspaceContent

    User->>Toolbar: Click "Grouping" button
    Toolbar->>GroupDD: Open dropdown
    User->>GroupDD: Click "City" in Available
    GroupDD->>WVS: groupingsChanged([{id: 'city'}])
    WVS->>WVS: getGroupValue(img, 'city') → img.city ?? "Unknown city"
    WVS-->>Content: GroupedSection[] by city
    Content->>Content: Headers: "Wien (180)", "Liesing (130)", etc.
```

### UC-G2: Grouping by Year

**Precondition:** Images have `captured_at` timestamps from EXIF.

```mermaid
sequenceDiagram
    actor User
    participant GroupDD as GroupingDropdown
    participant WVS as WorkspaceViewService
    participant Content as WorkspaceContent

    User->>GroupDD: Click "Year" in Available
    GroupDD->>WVS: groupingsChanged([{id: 'year'}])
    WVS->>WVS: getGroupValue(img, 'year') → new Date(img.capturedAt).getFullYear().toString()
    WVS-->>Content: GroupedSection[] by year
    Content->>Content: Headers: "2025 (1800)", "2026 (700)"
```

### UC-G3: Grouping by Street

**Precondition:** Images have been reverse-geocoded; `street` column is populated.

```mermaid
sequenceDiagram
    actor User
    participant GroupDD as GroupingDropdown
    participant WVS as WorkspaceViewService
    participant Content as WorkspaceContent

    User->>GroupDD: Click "Street" in Available
    GroupDD->>WVS: groupingsChanged([{id: 'street'}])
    WVS->>WVS: getGroupValue(img, 'street') → img.street ?? "Unknown street"
    WVS-->>Content: GroupedSection[] by street
    Content->>Content: Headers: "Seestadt-Straße (280)", "Nordbahnstraße (200)", ...
```

### UC-G4: Multi-level — Country → City → Project

```mermaid
flowchart TD
    subgraph Nested["Country → City → Project"]
        H_AT["▼ Austria — 2500 photos"]
        H_AT_W["  ▼ Wien — 2300 photos"]
        H_AT_W_P1["    ▸ Aspern Seestadt D12 — 440"]
        G1["    🖼 × 440"]
        H_AT_W_P2["    ▸ DC Tower 3 — 260"]
        G2["    🖼 × 260"]
        H_AT_W_P3["    ▸ Nordbahnviertel — 320"]
        G3["    🖼 × 320"]
        H_AT_L["  ▼ Liesing — 200 photos"]
        H_AT_L_P1["    ▸ Liesing Gewerbepark — 200"]
        G4["    🖼 × 200"]
    end
```

### UC-G5: Grouping by User

```mermaid
sequenceDiagram
    actor User
    participant GroupDD as GroupingDropdown
    participant WVS as WorkspaceViewService
    participant Content as WorkspaceContent

    User->>GroupDD: Click "User" in Available
    GroupDD->>WVS: groupingsChanged([{id: 'user'}])
    WVS->>WVS: getGroupValue(img, 'user') → img.userName ?? "Unknown user"
    WVS-->>Content: GroupedSection[] by user
    Content->>Content: Headers: "Markus Gruber (600)", "Anna Steiner (500)", ...
```

### UC-G6: Address Fields Not Yet Resolved

**Precondition:** Fresh upload, reverse geocoding hasn't run yet.

```mermaid
sequenceDiagram
    actor User
    participant GroupDD as GroupingDropdown
    participant WVS as WorkspaceViewService
    participant Content as WorkspaceContent

    User->>GroupDD: Click "City" in Available
    GroupDD->>WVS: groupingsChanged([{id: 'city'}])
    WVS->>WVS: getGroupValue(img, 'city') → img.city is null → "Unknown city"
    WVS-->>Content: Single section "Unknown city (40 photos)"
    Note over Content: All images in one bucket until geocoding completes
```

---

## Address Resolution Strategies

| Trigger              | Method                   | Fields Populated                                                                  |
| -------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| After upload (async) | Reverse geocode GPS→addr | `address_label`, `city`, `district`, `street`, `country`                          |
| Manual address entry | Forward geocode addr→GPS | `address_label`, `city`, `district`, `street`, `country`, `latitude`, `longitude` |
| Marker correction    | Reverse geocode new GPS  | Updates all address fields for new location                                       |
| Folder import        | Forward geocode filename | All address fields + coordinates                                                  |

All strategies ultimately populate the same structured columns on the `images` table.
