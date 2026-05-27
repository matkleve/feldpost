# Upload shell (authenticated layout)

> **Parent:** [upload-panel.md](./upload-panel.md)  
> **Related:** [upload-resolver-tray.md](./upload-resolver-tray.md), [upload-panel-system.md](../../ui/upload/upload-panel-system.md)  
> **Code:** `app-upload-shell` in `features/upload/`, mounted from `authenticated-app-layout.component.html`

## What it is

Global meta container (`.upload-shell`) anchored **top-right of the layout main column** (`authenticated-app-layout__main`) on every authenticated route — **not** viewport-fixed, so it does not cover the workspace pane when open. **Column stack**:

1. **Button zone** (`.upload-btn-zone`) — upload trigger only; `width: max-content` (~icon width). Does **not** reserve horizontal space from the centered search bar. Closed-state batch feedback is the trigger progress ring + spinner (see [upload-button-zone.md](./upload-button-zone.md)).
2. **Dock** (`.upload-shell__dock`) — layout-only column (`width` + `gap` between children; no background/border/shadow on the dock itself):
   - `app-upload-panel` when the panel is open (owns frosted chrome)
   - `app-upload-resolver-tray` below the panel when disambiguation is active (or tray-only when panel closed; each surface owns its own chrome)

Tray visibility is independent of panel open/closed (OD-6). Only the button column competes with the search bar top row.

## Geometry

| Element | Owner |
| --- | --- |
| Shell position | `app-upload-shell` inside `__main` — `position: absolute; top/right; z-index: 200` |
| Shell width | `min(420px, calc(100vw - var(--spacing-6)))` |
| Button | Fixed icon size inside shell, `align-self: flex-end` |

Embedded workspace upload tab still hosts `app-upload-panel` inside the workspace pane only (no second shell).

## Acceptance criteria

- [x] Layout mounts `app-upload-shell` for all authenticated routes (`authenticated-app-layout`)
- [x] Shell stays top-right of main column when navigating map, media, projects, etc.
- [x] Shell does not overlap workspace pane when pane is open
- [x] Panel and tray inherit shell width without per-component width math
- [x] Tray renders when panel is collapsed (OD-6; tray-only dock state)
