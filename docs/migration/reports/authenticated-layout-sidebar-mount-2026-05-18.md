# Authenticated layout + sidebar mount — failure report (2026-05-18)

## Symptom

- Browser: black viewport, empty root `<router-outlet>`.
- DevTools: no `<app-authenticated-app-layout>`, no `<app-nav>`, no `<app-map-shell>`.
- Only `<app-root>` → `<router-outlet>` → `<ss-toast-container>`.

## Intended shell (target)

```
app-root
└── router-outlet
    └── app-authenticated-app-layout    ← authGuard + layout route
        ├── app-nav                     ← sidebar (fixed)
        ├── ss-settings-overlay         ← settings shell
        └── .authenticated-app-layout
            ├── .authenticated-app-layout__main → router-outlet → app-map-shell | media | …
            └── app-workspace-pane-shell (optional)
```

## Pipeline table — what should happen vs what went wrong

| Step | Layer | Expected | What you saw / failure mode | Owner file |
| --- | --- | --- | --- | --- |
| 1 | Bootstrap | `AppComponent` renders `router-outlet` | OK | `app.component.html` |
| 2 | `APP_INITIALIZER` | `AuthService.initialize()` finishes, `loading → false` | If stuck: **outlet stays empty** (guard never resolves) | `app.config.ts`, `auth.service.ts` |
| 3 | Router URL `/` | Match `path: ''` child of routes | OK (map worked before chrome move) | `app.routes.ts` |
| 4 | `authGuard` | Session → allow; no session → `/auth/login` | If redirect fails: **empty outlet** | `auth.guard.ts` |
| 5 | Layout route load | `AuthenticatedAppLayoutComponent` inserted **next to** root outlet | **Missing** — route component never mounted | `app.routes.ts` |
| 5a | *Was:* `loadComponent` lazy import | Load `authenticated-app-layout-component` chunk (~723kB → **~1.03MB** with nav+settings) | HMR partial edit → **compile ERROR** → browser reload on broken graph | Vite/ng serve log 21:35:08 |
| 5b | *HMR error window* | Template had `<app-nav>` before `imports: [NavComponent, …]` | `NG8001: app-nav is not a known element`, `settingsOverlayOpen` missing | `authenticated-app-layout.component.*` |
| 6 | Layout template | `app-nav` + `ss-settings-overlay` + flex main | Never reached if step 5 fails | `authenticated-app-layout.component.html` |
| 7 | Layout `:host` SCSS | `overflow: visible` so `position: fixed` sidebar not clipped | Earlier attempt: `overflow: hidden` on flex host **clips** fixed chrome (visibility, not DOM absence) | `authenticated-app-layout.component.scss` |
| 8 | Child outlet | `app-map-shell` under `__main` | Never reached | `map-shell.component` |
| 9 | Sidebar CSS | `.sidebar` `position: fixed; z-index: 201` | Irrelevant if step 5 fails | `nav.component.scss` |

## Root causes (ranked)

1. **Failed compile during HMR** (proven in terminal): layout HTML updated before TypeScript `imports` / bindings. Angular served a reload while the layout route was invalid → **no authenticated component in DOM**.
2. **Lazy layout chunk + large chrome**: Adding `NavComponent` + `SettingsOverlayComponent` to the layout lazy chunk increases size and coupling; combined with (1), easy to end on a bad chunk/hash in the browser.
3. **Not a “search in the wrong branch” issue**: When layout mounts, `app-nav` is a **sibling** of `.authenticated-app-layout`, not inside the map outlet tree — but that only matters **after** step 5 succeeds.

## What did *not* cause empty outlet

- `showNav()` on `AppComponent` (chrome moved off root; root template is only outlet + toasts).
- `NavComponent.visible()` (removed; auth routes do not load layout).
- Map shell / Leaflet (never reached).

## Fix applied (no revert to “nav on app-root”)

1. **Keep** `app-nav` + `ss-settings-overlay` in `AuthenticatedAppLayoutComponent` (auth-only by routing).
2. **Eager** `component: AuthenticatedAppLayoutComponent` in `app.routes.ts` instead of `loadComponent` lazy import — compile-time link, fewer HMR/chunk desync failures.
3. **Keep** layout `:host { overflow: visible }` and chrome **outside** `.authenticated-app-layout` overflow wrapper.

## Verify after pull

1. Stop `ng serve`, start fresh.
2. Hard refresh (`Ctrl+Shift+R`).
3. DevTools → `<app-root>` → must find `app-authenticated-app-layout` → `app-nav` → `nav.sidebar`.
4. Console: no red errors on load.

## Optional follow-up (not done here)

- Split `AuthenticatedChromeComponent` (nav + settings only) from map/pane flex layout to shrink module and clarify ownership.

**Wrapper collapse blocked:** merging `.authenticated-app-layout` into layout `:host` flex is **forbidden** until a Storybook nav-clipping harness exists — see `docs/specs/ui/workspace/workspace-pane.md` § Authenticated shell geometry ownership (Blocked refactor).
