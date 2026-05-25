# Upload shell (map)

> **Parent:** [upload-panel.md](./upload-panel.md)  
> **Related:** [upload-resolver-tray.md](./upload-resolver-tray.md), [upload-panel-system.md](../../ui/upload/upload-panel-system.md)

## What it is

Map-only meta container (`.upload-shell`) that owns fixed top-right width and stacks three siblings:

1. Upload trigger button (`.map-upload-btn`)
2. Collapsible panel (`.upload-expand` → `app-upload-panel`)
3. Resolver tray (`app-upload-resolver-tray`)

Tray and panel both use `width: 100%` of the shell. Tray visibility is independent of panel open/closed (OD-6).

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
