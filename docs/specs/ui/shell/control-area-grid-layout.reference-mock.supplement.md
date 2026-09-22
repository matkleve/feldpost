# Control-area grid — reference mock (owner screenshot)

> **Parent:** [control-area-grid-layout.md](./control-area-grid-layout.md)  
> **Source:** Owner mock screenshot (2026-09-22 chat). German UI, light sandstone palette.

## What the mock shows (read left → right)

### 1. Left control rail (thin, fixed)

Two **containers**, icon-only, no labels visible at rest:

| Container | Icons (top → bottom) |
| --- | --- |
| **Top** | Logo (green triangle) · **Map** (active/highlighted) · Folder · Gallery/stack · Network/tree |
| **Bottom** | Profile (avatar circle) · Settings (gear) |

### 2. Map (large center)

Vienna (`Wien`) basemap with markers (green camera pins, red alert pin, blue GPS dot).

**Floats on the map (not in rails):**

| Element | Position |
| --- | --- |
| Search bar | **Top-left** — “Suche nach Adresse, Ort, Projekt…” |
| Filter chip | Below search — “Filter ▾” |
| Compass / north | Top-right of map |
| Scale bar | Bottom-left — “5 km” |
| Zoom +/− | Bottom-right |

### 3. Content panel column (beside map, between map and right rail)

Two **large rounded panels** stacked vertically — this is the **“big content area”** the owner refers to. Frosted/off-white `.ui-container` style, full panel chrome (header + body):

| Panel | Header | Body (summary) |
| --- | --- | --- |
| **Upload** (top) | Cloud icon + “Upload” | Drag-drop zone · tabs “Uploading (3) / Hochgeladen (12) / Fehler (1)” · file rows with thumbs, progress bars, cancel |
| **Hilfe / Help** (bottom) | ? icon + “Hilfe ▾” | Collapsible FAQ rows · “Weitere Hilfe & Tipps →” link |

**Owner intent:** **Settings** becomes a panel/page in this column (same pattern as Upload and Help) — **not** today’s fixed settings overlay. **Profile** is a **separate** panel/page, not a section inside Settings.

### 4. Right control rail (thin, fixed)

Three **containers** with a visible **gap** between upper groups:

| Container | Icons |
| --- | --- |
| **Top 1** | Notifications (bell) · Upload · Download · Shared |
| *(gap)* | Empty vertical band |
| **Top 2** | Undo · History · Redo |
| **Bottom** | Tips · Help (?) |

Icons mirror the panels — e.g. Upload icon toggles Upload panel; Help icon toggles Help panel.

## Grid implied by mock

```text
| left rail | map (flex) | content panels | right rail |
|  ~icon    |   1fr      |  fixed width   |  ~icon     |
```

Not a simple three-column `[rail | canvas | rail]` — the **content panel column** is a first-class track between map and right rail.

## Behaviours visible or stated by owner

| Behaviour | Mock / owner |
| --- | --- |
| Hover label expansion | **All** control options (left **and** right); ~1 s hover; **overlaps** map/panels without blocking interaction under the expanded pill |
| Tablet | Long hover shows labels (same expansion) |
| Theme switch | **Bottom-right** of map (owner 2026-09-22) — near zoom cluster |
| Settings | **Content panel** in column — replaces settings overlay |
| Profile | **Separate** from Settings — own panel/page |

## Not shown in mock (TBD)

- Notifications panel content
- Shared media panel
- Settings panel interior (reuse settings-overlay sections as page content?)
- Profile panel interior
- Workspace / selected-items pane (mock shows Upload + Help only)
- Mobile layout
