---
id: STUDY-019
type: investigation
status: proposed
supersedes: none
corrected-by: none
---

# The map stays mounted when it is hidden

**Written:** 2026-09-24. **On:** `cursor/addable-apps-change-plan-cb0a`, by reading the authenticated layout, the shell helpers, and `MapZoomOrchestratorService`. No browser was opened. **Status `proposed`.** Not permission to unmount the map.

STUDY-017 Phase 5 says “installed” should control the map mount, and that Media’s zoom calls have to keep working. This study measures the mount that phase would touch.

## What the code does

`AuthenticatedAppLayoutComponent` always puts `<app-map-shell />` in the template `[A]` `apps/web/src/app/layout/authenticated-app-layout.component.html` lines 8–13. The same template always mounts `<app-upload-shell />` (line 6).

Visibility is a class, not `*ngIf`. `mapShellVisible()` is `resolveMapShellDisplayed` `[A]` `authenticated-app-layout.component.ts` lines 106–108. That function returns true only when the active shell, or the in-flight navigation target, is `'map'` `[A]` `authenticated-shell-active.helpers.ts` lines 40–48. On `/media` the map host is hidden and the component remains in the tree. `[A]` for the binding. `[C]` that Leaflet state survives a visit to Media; this study did not click through the app.

Zoom does not call Leaflet from Media. `MapZoomOrchestratorService.requestZoom` checks the active shell. When it is not `'map'`, it navigates to `/map` and then calls `onZoomToLocation` `[A]` `apps/web/src/app/core/map-zoom/map-zoom-orchestrator.service.ts` lines 55–79. The comment on line 55 says the shell stays mounted but is hidden on `/media` and `/projects`.

Callers that ask for that zoom include the workspace pane, media, and the upload shell `[A]`:

- `media.component.ts` lines 338–339 → `shellHost.onZoomToLocationRequested`
- `authenticated-app-layout.component.ts` lines 286–298 → `mapZoomOrchestrator.requestZoom`
- `upload-shell.component.ts` lines 79–80, same host method

`getMapEffects()` is how the layout reaches the mounted map. If the effect object is missing, zoom falls through to `router.navigate(['/map'])` `[A]` `map-zoom-orchestrator.service.ts` lines 83–96.

## What is fragile

Phase 4 (nav reads installs) can hide the Map row and still leave this host mounted. That matches the code. `[D]` STUDY-017 Phase 4.

Phase 5 is the break. Destroying `app-map-shell` when Map is not installed also destroys the object `getMapEffects()` returns. Zoom from Media would then navigate to `/map`. If that route is guarded because Map is not installed, the navigation fails and the orchestrator rejects with `navigation-failed` `[A]` lines 67–69. The user asked to zoom and nothing moves. `[C]` that this is the failure; the guard does not exist yet.

Upload is an add-on of Media `[D]` STUDY-017 current record. Its zoom uses the same host method `[A]` `upload-shell.component.ts` lines 79–80. Hiding Map while Media is installed strands that action the same way.

A temporary Map session from a shared link `[D]` STUDY-017 has to mount this same shell for the session. A second map instance would be a second Leaflet owner. This study did not find a second `app-map-shell` in the layout template. `[A]`

## What a later change has to keep true

- While Map is installed, zoom from Media and from Upload still ends in `onZoomToLocation` on the one mounted shell.
- While Map is not installed, those calls do not navigate to a route the guard will reject. They no-op. The page specs have to say that before the template loses the always-on host.
- Do not do that template change in the same change as the install migration. `[D]` STUDY-017 Phase 5.
