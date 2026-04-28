# Map Secondary-Click System

> **Use cases:** [use-cases/map-secondary-click-system.md](../use-cases/map-secondary-click-system.md)
> **Child specs:** [map-context-menu](component/map-context-menu.md), [media-marker-context-menu](media-marker/media-marker-context-menu.md), [radius-selection](component/radius-selection.md)
> **Action contract:** [action-context-matrix](action-context-matrix.md)

## What It Is

Secondary-click / long-press orchestration for map, marker, and radius targets (menus, precedence, action IDs → action-context-matrix); ordering matches upload panel (primary → secondary → destructive last).

## What It Looks Like

All secondary-click menus use the shared dropdown/action-sheet shell (`dd-*` rows, `--color-bg-elevated`, `--elevation-dropdown`, `--radius-lg`). Desktop menus anchor to cursor/marker/radius hit zone. Mobile uses bottom action sheets for touch reliability.

Map menu focuses creation/navigation utilities. Marker menu focuses item-level operations. Radius menu focuses project actions on in-radius result sets.

## Where It Lives

- **Route**: Global in map route `/`
- **Parent**: `MapShellComponent`
- **Scope**: Empty map targets, marker targets, active-radius targets

## Actions & Interactions

### Precedence Matrix

| Priority | Target / Gesture                                                             | Result                                    |
| -------- | ---------------------------------------------------------------------------- | ----------------------------------------- |
| 1        | Active radius + secondary click on target inside radius (map/marker/cluster) | Open Radius Context Menu                  |
| 2        | Active radius + secondary click on marker/cluster outside radius             | Close radius and open Marker Context Menu |
| 3        | Active radius + short secondary click outside radius (empty map path)        | Close radius (no map menu on same click)  |
| 4        | Empty map + secondary drag >= threshold                                      | Start/continue Radius Selection draw      |
| 5        | Empty map + short secondary click                                            | Open Map Context Menu                     |

### Map Context Menu Options

| Option                           | Effect                                             |
| -------------------------------- | -------------------------------------------------- |
| `Media Marker hier erstellen`    | Create draft marker, open workspace upload context |
| `Hierhin zoomen (Hausnaehe)`     | `setView(latlng, 19)`                              |
| `Hierhin zoomen (Strassennaehe)` | `setView(latlng, 17)`                              |
| `Adresse kopieren`               | Reverse geocode + copy address                     |
| `GPS kopieren`                   | Copy `lat,lng`                                     |
| `In Google Maps oeffnen`         | Open external map tab                              |

### Marker Context Menu Options

| Option                           | Availability             | Effect                        |
| -------------------------------- | ------------------------ | ----------------------------- |
| `Details oeffnen`                | Single marker            | Open detail view              |
| `Auswahl oeffnen`                | Cluster + multi          | Load selection into workspace |
| `Hierhin zoomen (Hausnaehe)`     | Single marker            | `setView(markerLatLng, 19)`   |
| `Hierhin zoomen (Strassennaehe)` | Single marker            | `setView(markerLatLng, 17)`   |
| `Assign project...`              | Single + cluster + multi | Open assign-to-project flow   |
| `Adresse kopieren`               | Single marker            | Reverse geocode + copy        |
| `GPS kopieren`                   | Single marker            | Copy `lat,lng`                |
| `In Google Maps oeffnen`         | Single marker            | Open external map tab         |
| `Aus Projekten entfernen`        | Single + cluster + multi | Remove memberships            |
| `Foto loeschen`                  | Single + cluster + multi | Confirm + delete              |

### Radius Context Menu Options

| Option                    | Effect                                   |
| ------------------------- | ---------------------------------------- |
| `Auswahl oeffnen`         | Keep/show selected radius result set     |
| `Projekt hinzufuegen...`  | Assign in-radius result set to project   |
| `Aus Projekten entfernen` | Remove project memberships for selection |
| `Foto loeschen`           | Confirm + delete selected radius media   |

## Component Hierarchy

```
MapShellComponent
├── MapContextMenuHost
│   └── MapContextMenu
├── MarkerContextMenuHost
│   └── PhotoMarkerContextMenu
└── RadiusContextMenuHost
    └── RadiusContextMenu
```

## Data Requirements

### System Flow (Mermaid)

```mermaid
flowchart TD
  U[Secondary click / long-press] --> T{Hit target}
  T -->|marker| MM[Marker Context Menu]
  T -->|inside active radius| RM[Radius Context Menu]
  T -->|outside active radius| RC[Close Radius]
  T -->|empty map| G{Gesture}
  G -->|drag >= threshold| RS[Radius Selection Draw]
  G -->|short click| MAPM[Map Context Menu]
  MAPM --> MAPA[Map actions]
  MM --> MMA[Marker actions]
  RM --> RMA[Radius project actions]
```

| Field              | Source                 | Type                                                             |
| ------------------ | ---------------------- | ---------------------------------------------------------------- |
| `targetKind`       | hit-test result        | `'marker' \| 'inside-radius' \| 'outside-radius' \| 'empty-map'` |
| `anchorLatLng`     | map event              | `{ lat: number; lng: number }`                                   |
| `anchorScreen`     | pointer event          | `{ x: number; y: number }`                                       |
| `radiusActive`     | radius selection state | `boolean`                                                        |
| `secondaryMovedPx` | gesture tracker        | `number`                                                         |

## State

| Name                    | TypeScript Type                                 | Default | What it controls       |
| ----------------------- | ----------------------------------------------- | ------- | ---------------------- |
| `mapContextMenuOpen`    | `boolean`                                       | `false` | Map menu visibility    |
| `markerContextMenuOpen` | `boolean`                                       | `false` | Marker menu visibility |
| `radiusContextMenuOpen` | `boolean`                                       | `false` | Radius menu visibility |
| `pendingSecondaryPress` | `{ startPoint; startLatLng; additive } \| null` | `null`  | Gesture arbitration    |
| `radiusDrawActive`      | `boolean`                                       | `false` | Radius drawing mode    |

## File Map

| File                                                               | Purpose                                        |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| `apps/web/src/app/features/map/map-shell/map-shell.component.ts`   | Secondary-click precedence and action dispatch |
| `apps/web/src/app/features/map/map-shell/map-shell.component.html` | Render all context menu surfaces               |
| `docs/specs/component/map-context-menu.md`                           | Map menu details                               |
| `docs/specs/ui/media-marker/media-marker-context-menu.md`                  | Marker menu details                            |
| `docs/specs/component/radius-selection.md`                           | Radius draw + radius menu details              |
| `docs/use-cases/map-secondary-click-system.md`                     | End-to-end interaction scenarios               |

## Wiring

### Precedence Sequence (Mermaid)

```mermaid
sequenceDiagram
  participant U as User
  participant MA as MapAdapter
  participant MS as MapShell
  participant MCM as MapMenu
  participant PCM as MarkerMenu
  participant RCM as RadiusMenu
  participant RS as RadiusSelection

  U->>MA: secondary click / long-press
  MA->>MS: contextIntent(payload)
  alt marker hit
    MS->>PCM: open marker menu
  else inside active radius
    MS->>RCM: open radius menu
  else outside active radius
    MS->>RS: close active radius
  else empty-map + drag >= threshold
    MS->>RS: start/continue draw
  else empty-map + short click
    MS->>MCM: open map menu
  end
```

- Exactly one context menu may be visible at a time.
- Radius has target precedence over empty-map menu while active.
- Drag threshold always wins over short-click menu opening.

## Acceptance Criteria

- [ ] Secondary-click precedence is deterministic across marker, radius, and empty-map targets.
- [ ] Marker target opens marker menu and never map menu.
- [ ] Active-radius inside-click opens radius menu.
- [ ] Active-radius outside-click closes radius on first click without opening map menu on same click.
- [ ] Empty-map short secondary click opens map menu.
- [ ] Empty-map secondary drag starts radius draw, not menu.
- [ ] Map menu includes: create marker, two zoom levels, copy address, copy GPS, open Google Maps.
- [ ] Marker menu includes: details/selection, two zoom levels, project assignment, copy address/GPS, open Google Maps, single-only delete.
- [ ] Radius menu includes: create project from radius and assign to existing project.
