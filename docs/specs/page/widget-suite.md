# Widget suite

## What It Is

The widgets whose records combine a place on the map with media. Media stays on `media_items`.

## What It Looks Like

Each record has one place, a point or an area, and any number of media items. The map draws the place. The widget's own page lists the records. That page is not this spec. Placement of the page is open in [shell-widget-placement.md](../ui/shell/shell-widget-placement.md).

## Where It Lives

- **Directory:** listed from [widget-directory.md](widget-directory.md) once a route exists.
- **Not this shape:** Mitarbeiter and Organisation. They are widgets, and they join the bottom-left container.

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Opens an installed suite widget | Canvas lists that widget's records | route, not assigned |
| 2 | Opens one record | The place and its media are shown | record page, not assigned |

## Component Hierarchy

```text
suite widget page
└── record
    ├── place
    └── media items
```

## Data

No table is named. A migration waits on [widget-grants.md](../system/widget-grants.md).

| Widget | English | German |
| --- | --- | --- |
| Vehicles | Vehicles | — |
| Boats | Boats | — |
| Material | Material | — |
| Storage locations | Storage locations | Lagerorte |
| Buildings | Buildings | Gebäude |

Equipment, for machines that are not vehicles or boats, is a proposal in [STUDY-017](../../study/017-role-widget-grants.md). It is not in this catalog.

## State

| Name | Type | Default | Effect |
| --- | --- | --- | --- |
| `installed` | per widget | not installed | Absent from the rail until the organization adds it and a role allows it |

## File Map

| File | Purpose |
| --- | --- |
| `docs/specs/page/widget-suite.md` | This catalog |

## Wiring

The suite does not add a route, a map layer, or a media table.

## Acceptance Criteria

- [ ] The catalog is the five widgets in the table above.
- [ ] A suite record uses `media_items` for its media.
- [ ] No migration is added from this spec alone.
