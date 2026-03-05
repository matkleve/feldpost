# GPS Button

## What It Is

A small floating button that centers the map on the user's current GPS position. Positioned bottom-right of the Map Zone. Triggers the browser Geolocation API via `MapAdapter`, drops/moves the User Location Marker to the fix, and pans the map there.

## What It Looks Like

44px circle (desktop) / 48px circle (mobile). `--color-bg-surface` background, crosshair/location icon in `--color-text-primary`. Subtle shadow. Three visual states:

- **Idle**: Default icon, no highlight
- **Seeking**: Pulsing animation while waiting for GPS fix
- **Active**: Icon filled or highlighted to show map is tracking location

## Where It Lives

- **Parent**: Map Zone (floating, bottom-right cluster)
- **Position**: Below or beside Upload Button Zone

## Actions

| #   | User Action                     | System Response                                                    | Triggers                            |
| --- | ------------------------------- | ------------------------------------------------------------------ | ----------------------------------- |
| 1   | Clicks button (idle)            | Requests GPS fix → pans map to coords → drops User Location Marker | `MapAdapter.panTo()`, marker placed |
| 2   | Clicks button (active/tracking) | Stops tracking, marker stays                                       | Tracking off                        |
| 3   | GPS fix fails                   | Toast notification with error message                              | Toast shown                         |
| 4   | User pans away while tracking   | Tracking stops automatically (or stays — TBD per design decision)  | State update                        |

## Component Hierarchy

```
GpsButton                                  ← 44/48px circle, floating bottom-right
├── LocationIcon                           ← crosshair or location pin icon
└── [seeking] PulseRing                    ← CSS animation while awaiting fix
```

## State

| Name       | Type                              | Default  | Controls                       |
| ---------- | --------------------------------- | -------- | ------------------------------ |
| `gpsState` | `'idle' \| 'seeking' \| 'active'` | `'idle'` | Button appearance and behavior |

## File Map

| File                                              | Purpose                           |
| ------------------------------------------------- | --------------------------------- |
| `features/map/gps-button/gps-button.component.ts` | Button component                  |
| `core/map-adapter.ts`                             | `getCurrentPosition()`, `panTo()` |

## Acceptance Criteria

- [x] Floating bottom-right in Map Zone
- [ ] 44px desktop, 48px mobile tap target
- [ ] Pulse animation while seeking GPS
- [x] Pans map to user location on successful fix
- [ ] Shows toast on GPS failure
- [x] Places/updates User Location Marker
