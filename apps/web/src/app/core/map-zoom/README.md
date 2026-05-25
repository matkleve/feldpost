# map-zoom

**What it does:** Single orchestrator for “zoom the map to these coordinates” from any UI surface (tile map icon, detail location row, context menu, upload).

**Entry point:** `MapZoomOrchestratorService.requestZoom()`

**Delegates to:**

- Map route: `WorkspacePaneLayoutMapEffectsService` → `MapShellComponent.onZoomToLocation`
- `/media` or `/projects`: navigates to `/map`, then applies zoom after the map host is visible
- No map delegate: `router.navigate(['/map'], { state: { mapFocus } })`

**UI callers:** `media-item` (tile), `media-detail-view`, `authenticated-app-layout` (bubbles from workspace pane / media page).
