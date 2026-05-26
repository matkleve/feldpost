# Upload shell (map)

> **Parent:** [upload-panel.md](./upload-panel.md)  
> **Related:** [upload-resolver-tray.md](./upload-resolver-tray.md), [upload-panel-system.md](../../ui/upload/upload-panel-system.md)

## What it is

Map-only meta container (`.upload-shell`) anchored top-right, **column stack**:

1. **Button zone** (`.upload-btn-zone`) — upload trigger only; `width: max-content` (~icon width). Does **not** reserve horizontal space from the centered search bar. Closed-state batch feedback is the trigger progress ring + spinner (see [upload-button-zone.md](./upload-button-zone.md)).
2. **Dock** (`.upload-shell__dock`) — single frosted mother container (same chrome as `upload-panel`):
   - `app-upload-panel` when the panel is open
   - `app-upload-resolver-tray` below the panel when disambiguation is active (or tray-only when panel closed)

Tray visibility is independent of panel open/closed (OD-6). Only the button column competes with the search bar top row.

## Geometry

| Element | Owner |
| --- | --- |
| Shell position | `position: absolute; top/right; z-index: 200` |
| Shell width | `min(420px, calc(100vw - var(--spacing-6)))` |
| Button | Fixed icon size inside shell, `align-self: flex-end` |

Embedded workspace upload (`media.component`) hosts `app-upload-panel` only — no shell/tray in MVP.

## Acceptance criteria

- [ ] Map shell wraps button, panel expand, and tray
- [ ] Panel and tray inherit shell width without per-component width math
- [ ] Tray renders when panel is collapsed
