# Photo Marker

## What It Is

The map pin representing a single photo or a cluster of nearby photos. It's a square thumbnail with a pointer tail — never the default Leaflet blue pin. Clusters show a count number instead of a thumbnail. Markers carry visual indicators for correction status and upload state.

## What It Looks Like

**Single marker:** 3.5rem square body with rounded corners, 2px white border, drop shadow. Contains a thumbnail image. Below the body: a small CSS triangle tail (0.6rem) pointing to the exact coordinate. On hover: shows Direction Cone if camera bearing is available.

**Cluster marker:** Same square shape but `--color-clay` background with white count number instead of thumbnail. Triggered by proximity density (server-side `ST_SnapToGrid`), not by fixed zoom levels.

**Indicators:**

- Correction Indicator Dot — small `--color-accent` dot at top-right, visible only if marker has corrected coordinates
- Pending Upload Indicator — pulsing `--color-warning` ring around marker during upload

**All markers:** 2px white outline + `drop-shadow(0 1px 3px rgba(0,0,0,0.45))` for readability on any tile background.

## Where It Lives

- **Parent**: Map Zone (rendered by `MapAdapter`, not directly in Angular template)
- **Appears when**: Images are loaded for the current viewport

## Actions

| #   | User Action                    | System Response                                                    | Triggers                 |
| --- | ------------------------------ | ------------------------------------------------------------------ | ------------------------ |
| 1   | Clicks single marker           | Adds image to Active Selection, opens Workspace Pane               | Selection state          |
| 2   | Ctrl+clicks marker             | Adds image to Active Selection without clearing previous selection | Multi-select             |
| 3   | Clicks cluster marker          | Zooms in to expand cluster, or opens all images in selection       | `MapAdapter.setCenter()` |
| 4   | Hovers single marker           | Shows Direction Cone (if bearing available)                        | CSS/Leaflet popup        |
| 5   | Right-clicks marker            | Opens context menu (view detail, edit location, add to group)      | Context menu             |
| 6   | Drags marker (correction mode) | Moves marker to new position, stores corrected coordinates         | Correction flow          |

## Component Hierarchy

```
PhotoMarker                                ← Leaflet DivIcon, custom HTML, not an Angular component
├── MarkerBody                             ← 3.5rem square, rounded-md, overflow-hidden, 2px white border
│   ├── [single] ThumbnailImage            ← <img> with signed URL, object-fit cover
│   └── [cluster] CountLabel               ← white text, --color-clay background
├── MarkerTail                             ← CSS triangle, 0.6rem, points to coordinate
├── [corrected] CorrectionDot              ← 8px circle, --color-accent, top-right corner
├── [uploading] PendingRing                ← pulsing ring, --color-warning
└── [hover + bearing] DirectionCone        ← 30° semi-transparent cone showing camera direction
```

Note: Markers are Leaflet `DivIcon` elements managed by `MapAdapter`, not standalone Angular components. The HTML is generated as strings or via a utility function.

## Data

| Field          | Source                               | Type                          |
| -------------- | ------------------------------------ | ----------------------------- |
| Image data     | Viewport query via `SupabaseService` | `Image[]` from `images` table |
| Cluster groups | Server-side `ST_SnapToGrid`          | `{ lat, lng, count }[]`       |
| Thumbnails     | Supabase Storage signed URLs         | `string` (URL)                |

## State

Markers are stateless DOM elements. State (selected, correcting, uploading) is tracked in services and reflected via CSS classes on the marker HTML.

## File Map

| File                              | Purpose                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `core/map/marker-factory.ts`      | Utility to generate marker HTML for single/cluster variants |
| `core/map/leaflet-osm-adapter.ts` | `MapAdapter` implementation that manages markers on the map |

## Acceptance Criteria

- [ ] Never shows default Leaflet blue pin
- [ ] Single markers show 128px thumbnail
- [ ] Cluster markers show count on `--color-clay` background
- [ ] All markers have 2px white outline + drop shadow
- [ ] Tail points to exact coordinate
- [ ] Correction dot visible only for corrected markers
- [ ] Pending upload ring pulses during upload
- [ ] Direction cone appears on hover when bearing data exists
- [ ] Click selects image and opens workspace pane
- [ ] Cluster click zooms in or expands selection
- [ ] Readable on both light and dark map tiles
