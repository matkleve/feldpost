# Feldpost – Map System

Load this file for any task involving map hierarchy, marker prominence, clustering, or proximity behavior.

**Leaflet pierced CSS (implementation):** Rules targeting Leaflet-injected marker / overlay DOM live in **`apps/web/src/styles/_map-shell-leaflet-global.scss`**, scoped under **`app-map-shell { … }`**, and are pulled into the global bundle via **`@use`** from **`apps/web/src/styles.scss`** (Phase 8 Path A — not ad-hoc blocks inside unrelated feature SCSS). See [`phase-8-global-scss-elimination.md`](../migration/phase-8-global-scss-elimination.md) §7 and [`phase-10-visual-qa.md`](../migration/phase-10-visual-qa.md#stacking-sanity).

## 3.7 Map Visual Hierarchy and Proximity Rules

A well-designed map has four distinct visual layers, each lower in visual weight than the layer above it. This hierarchy must be enforced via tile styling, z-index management, and proximity/collision logic:

```mermaid
block-beta
  columns 1
  block:l4:1
    columns 1
    A["Layer 4 — UI Chrome\nToolbar · Filter panel · Workspace pane\nMedium visual weight"]
  end
  block:l3:1
    columns 1
    B["Layer 3 — Interactive Elements\nRadius circle · Selection handles · Hover states\nMedium-high visual weight"]
  end
  block:l2:1
    columns 1
    C["Layer 2 — Data Layer (HIGHEST)\nPhoto markers · Clusters\nSquare body · border + drop shadow"]
  end
  block:l1:1
    columns 1
    D["Layer 1 — Base Map (LOWEST)\nRoads · Buildings · Water · Terrain\nMuted fills · Desaturated · No POI clutter"]
  end

  style l4 fill:#f0edea,stroke:#c8c1b8
  style l3 fill:#dbeafe,stroke:#2563eb
  style l2 fill:#2563eb,stroke:#1d4ed8,color:#fff
  style l1 fill:#e8e4de,stroke:#c8c1b8
```

| Layer                | Visual weight | Elements                                       | Design rule                                                                                             |
| -------------------- | ------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Base map             | Lowest        | Roads, buildings, water, terrain               | Muted — no POI clutter, desaturated fills, thin outlines                                                |
| Data layer           | **Highest**   | Photo markers, clusters                        | Most visually prominent element on the map. Square marker body (**no tail**); border + drop-shadow per [`media-marker.md`](../specs/ui/media-marker/media-marker.md) and **`_map-shell-leaflet-global.scss`** |
| Interactive elements | Medium-high   | Radius circle, selection handles, hover states | Clearly distinct from base, does not compete with markers                                               |
| UI chrome            | Medium        | Toolbar, filter panel, workspace pane          | Floats above map on `--color-bg-surface` background with shadow                                         |

Quoting Eleken's Head of Design: _"The challenge is balancing information density with readability. You need to decide what information is essential and how to present it without overwhelming the user."_

**Marker and cluster details:** See [media-marker.md](../specs/ui/media-marker/media-marker.md) for full marker anatomy, state diagram, clustering rules, and viewport lifecycle. Clustering is proximity-based, not tied to fixed city/street/address zoom bands.
