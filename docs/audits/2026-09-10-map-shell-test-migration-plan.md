> **Audits:** Reference / investigation (**not normative**). Verify against current `docs/specs/` and `docs/design/` before acting. [How to read `docs/audits/`](README.md).

# `MapShellComponent` test migration — the API-drift mapping

**Date:** 2026-09-10
**Scope:** the last 64 test-bundle compile errors, all in 4 files under `apps/web/src/app/features/map/map-shell/component/`.
**Status:** mapping complete, one trivial rename already fixed, the rest **not yet rewritten** — see § 4 for why.

---

## 1. What happened

`MapShellComponent` used to hold GPS, placement, basemap and panel state directly — flat properties and methods on the component itself. At some point it was refactored into a thin orchestrator that **delegates to seven injected services**, each owning one slice of state as a `readonly` signal plus explicit mutator methods (the state-machine pattern `AGENTS.md` requires everywhere else in this codebase).

The four spec files below were never updated for that refactor. They still call the old flat API, so the whole test bundle fails to compile — which is why `npm test` has been failing for weeks and nobody could tell whether *any* test still passes.

| File | Errors | What it tests |
| --- | --- | --- |
| `map-shell.gps.spec.ts` | 27 | GPS button, tracking, geolocation |
| `map-shell.component.spec.ts` | 25 | placement mode, basemap, panels, marker selection |
| `map-shell.search.spec.ts` | 7 | search query context (2 of these already fixed — see § 3) |
| `map-shell.marker-interaction.spec.ts` | 5 | marker hover/select interaction |

---

## 2. The mapping table

Every old flat property/method, and exactly where it lives now. Found by reading the four services directly — not guessed.

| Old (flat on component) | New location | Kind |
| --- | --- | --- |
| `gpsTrackingActive` | `component.gpsService.gpsTrackingActive` | readonly signal |
| `gpsLocating` | `component.gpsService.gpsLocating` | readonly signal |
| `userPosition` | `component.gpsService.userPosition` | readonly signal |
| `goToUserPosition()` | `component.mapPlacementService.goToUserPosition()` | method, **same zero-arg signature** |
| `mapBasemap` | `component.basemapService.mapBasemap` | readonly signal |
| `mapViewMode` | `component.basemapService.mapViewMode` | readonly signal |
| `setMapViewMode(mode)` | `component.basemapService.setViewMode(mode, map)` | method, **renamed + gained a `map` param** |
| `enterPlacementMode(key)` | `component.mapPlacementService.enterPlacementMode(key)` | method, same signature |
| `cancelPlacement()` | `component.mapPlacementService.cancelPlacement()` | method, same signature |
| `onSearchMapCenterRequested(event)` | `component.mapPlacementService.onSearchMapCenterRequested(event)` | method, same signature |
| `onSearchClearRequested()` | `component.mapPlacementService.onSearchClearRequested()` | method, same signature |
| `onZoomToLocation(...)` | not on any injected-and-public service — see § 4, item 3 | — |
| `placementActive` | `component.state.placementActive` | readonly signal |
| `photoPanelOpen` | `component.state.photoPanelOpen` | readonly signal |
| `selectedMarkerKey` | `component.state.selectedMarkerKey` | readonly signal |
| `selectedMarkerKeys` | `component.state.selectedMarkerKeys` | readonly signal |
| `linkedHoveredWorkspaceMediaIds` | `component.state.linkedHoveredWorkspaceMediaIds` | readonly signal |
| `detailMediaId` | `component.state.detailMediaId` | readonly signal |
| `uploadPanelOpen` | `TestBed.inject(UploadShellUiService).uploadPanelOpen` | readonly signal, **not reachable via the component** (field is `private`) |
| `uploadPanelPinned` (old test poked the signal directly) | `TestBed.inject(UploadShellUiService).openUploadPanel()` / `.closeUploadPanel()` / `.toggleUploadPanel()` | **no longer a signal a test can reach at all** — see note below |
| `searchQueryContext()` | `component.searchContext.searchQueryContext()` | computed signal — **fixed already**, see § 3 |

`gpsService`, `mapPlacementService`, `basemapService`, `searchContext` and `state` are all `readonly` (not `private`) on `MapShellComponent` — `fixture.componentInstance.gpsService.X` or `fixture.componentInstance.state.X` works directly in a test, no new provider and no `TestBed.inject()` needed, just add the path segment.

`uploadShellUi` is the one exception: `private readonly uploadShellUi = inject(UploadShellUiService)`. Reading `uploadPanelOpen` needs `TestBed.inject(UploadShellUiService)` instead — `buildTestBed()` in the shared setup file already registers it as a real (non-mocked) instance, so injecting it gets the same instance the component holds internally.

**Note, added 2026-09-10:** the old test at `map-shell.component.spec.ts:166` did `fixture.componentInstance.uploadPanelPinned.set(true)` — reaching in and setting the panel-open signal directly. That signal is now `private` (`_uploadPanelPinned`) inside `UploadShellUiService`; it was a genuine encapsulation gap (the one place in 172 `@Injectable` services where a mutable signal was exposed unwrapped) and is fixed at the source rather than worked around in the test. See [`2026-09-10-spartan-and-state.md`](2026-09-10-spartan-and-state.md) § State. The rewritten test should call `openUploadPanel()` and assert `uploadPanelOpen()`, not touch the internal signal.

**Forcing a value, not just reading one:** every `MapShellState` signal above has a matching public setter (`state.setPlacementActive(true)`, `state.setDetailMediaId('img-1')`, `state.setSelectedMarkerKeys(new Set(['a']))`, …) — call the setter, never assign to the readonly signal. `gpsService` and `basemapService` have **no direct setters**; their signals only change through the real flow (`goTo(...)`, `setViewMode(...)`), which is exactly the GPS-mocking question in § 5.

---

## 3. Already fixed, safe to ship now

Two call sites in `map-shell.search.spec.ts` used `component.searchQueryContext()` where the real path is `component.searchContext.searchQueryContext()` (the property name itself didn't change — only where it sits). Same mechanical category as the 26 fixes in the previous commit (`4945614`), so it's already applied and reduces this cluster from 64 to 62 errors (verified: `npx ng test --watch=false`). Nothing else in this doc has been touched yet.

---

## 4. Why the rest is a plan, not a diff

Three things make this **not** a mechanical find-and-replace, unlike everything fixed so far:

1. **Read-only signals can't be `.set()` from a test anymore.** The old tests drove state directly — `fixture.componentInstance.gpsLocating.set(true)`. The new signals are `.asReadonly()`. A test that wants `gpsLocating` to read `true` now has to *earn* it: call `goToUserPosition()` and let a mocked `MapGeolocationService` resolve a position, the same way the real app does. That means checking, for every assertion, whether the shared `buildTestBed()` setup (`map-shell.spec-setup.ts`) needs a new provider — **it currently does not mock `MapGeolocationService` at all**, so any test that needs GPS to actually resolve a position needs that provider added, and every other test in the shared suite would then also get it (or not — needs a decision, see § 5).

2. **`onZoomToLocation` isn't on a component-reachable service.** It only shows up inside `map-shell-init.service.ts`, called on `mapViewFlyService` — a service that's wired into a callback closure passed to `initOnFirstRender(...)`, not exposed as a public, injectable, testable seam from the component. Testing it means either exporting `MapViewFlyService` as a public readonly field somewhere reachable, or restructuring the test to trigger it through the closure indirectly. That's a design decision, not a rename.

3. **Volume and blast radius.** 62 remaining call sites across 4 files, all touching the same shared `buildTestBed()`. A wrong assumption in the shared setup breaks all four files at once, silently (they'd compile, then fail at runtime with no clear signal pointing back here). This is exactly the class of change `AGENTS.md`'s Sensitive-class rules exist for: stateful UI, red-test-first, and — because this is genuinely unclear terrain — a live check rather than a guess.

---

## 5. Recommended approach (not started)

1. **Decide the GPS-mocking strategy first**, since it gates everything in `map-shell.gps.spec.ts` (27 of the 62 remaining errors). Two options:
   - **(a)** Add a `MapGeolocationService` mock to `buildTestBed()`, parameterized per test (some tests want `onSuccess`, some want `onError`, some want no callback fired at all). Matches how `GeocodingService` and `AuthService` are already mocked in the same file.
   - **(b)** Leave `MapGeolocationService` unmocked and only test the properties that don't require actual geolocation to resolve (defaults, `.does not throw`). This loses coverage of the actual tracking flow, which is unfortunately most of what this file is for.
   - Recommendation: **(a)** — it's the established pattern in this exact file and the tests were clearly written to assert real tracking behavior (spinner during locating, position after resolve, stop-on-second-call).
2. **Rewrite `map-shell.gps.spec.ts` first**, using the mapping table in § 2. Every `.gpsLocating()`/`.gpsTrackingActive()`/`.userPosition()` read becomes `.gpsService.X()`; every `.set(true)` becomes driving it through the (now-mocked) geolocation flow; `goToUserPosition()` becomes `mapPlacementService.goToUserPosition()` with no signature change.
3. **Then `map-shell.component.spec.ts`** (25 errors) — mostly path-prefix fixes (`state.X`, `basemapService.X`) plus the one `TestBed.inject(UploadShellUiService)` case for the two upload-panel assertions.
4. **Then `map-shell.marker-interaction.spec.ts`** (5 errors) — all `state.X` path fixes, no state-mocking decisions needed.
5. **`onZoomToLocation`** — resolve as its own small design question (make `MapViewFlyService` reachable, or restructure the assertion) before touching whichever test references it.
6. **Red-test-first**: since this is Sensitive-class (stateful UI, per `AGENTS.md`), after each file compiles, run it and confirm each rewritten assertion actually exercises the behavior it claims to — a rewritten test that always passes regardless of the code under test is worse than a compile error, because it looks like coverage.
7. Promote `test` from soft to hard in `scripts/verify.mjs` once this is done and `npm test` is fully green — not just compiling.

Estimated size: a few hours of careful work per file for (2)-(4), not a quick pass — this is genuinely a small feature's worth of test-writing, done four times.
