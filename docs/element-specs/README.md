# Element Specs

Structured implementation contracts for every UI element in GeoSite.
These are the **source of truth** that agents implement from.

See [agent-workflows/element-spec-format.md](../agent-workflows/element-spec-format.md) for the template.

## How To Use

1. Pick an element from the list below
2. Write its spec using the template (or ask an agent to draft it from the glossary)
3. Use `#plan-before-build` prompt to get an implementation plan
4. Use `#implement-element` prompt to build it
5. Use `#review-against-spec` prompt to verify

## Elements (from Glossary)

Status: ✅ spec written | 🔲 needs spec

### Shell & Layout

- 🔲 `map-shell.md` — Map Shell (top-level host)
- 🔲 `map-zone.md` — Map Zone (flex container for map + floating controls)
- 🔲 `sidebar.md` — Sidebar navigation rail
- 🔲 `workspace-pane.md` — Right-side collapsible panel with group tabs

### Search

- ✅ `search-bar.md` — Search Bar (multi-intent search surface)

### Map Markers

- 🔲 `photo-marker.md` — Photo Marker (square thumbnail marker)
- 🔲 `count-marker.md` — Count Marker / Cluster
- 🔲 `user-location-marker.md` — GPS user location marker

### Upload

- 🔲 `upload-button.md` — Upload Button + Panel toggle
- 🔲 `upload-panel.md` — Upload Panel (drop zone + file list)
- 🔲 `placement-mode.md` — Placement Mode (banner + crosshair)

### Workspace & Groups

- 🔲 `group-tab-bar.md` — Group Tab Bar
- 🔲 `thumbnail-grid.md` — Thumbnail Grid (virtual scrolling gallery)
- 🔲 `thumbnail-card.md` — Thumbnail Card (128×128 with hover actions)

### Panels & Detail

- 🔲 `filter-panel.md` — Filter Panel (accordion filters)
- 🔲 `filter-chips.md` — Active Filter Chips Strip
- 🔲 `image-detail.md` — Image Detail View

### Pages

- 🔲 `photos-page.md` — Photos Page
- 🔲 `groups-page.md` — Groups Page
- 🔲 `settings-page.md` — Settings Page
- 🔲 `account-page.md` — Account Page

## Priority

Write specs for whatever you're building next. The search bar spec is the example to follow.
