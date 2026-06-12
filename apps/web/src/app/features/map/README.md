# map feature

Route-level **map shell** and **workspace** composition: primary field screen, map zone, and workspace panes. This folder owns feature wiring; core services and shared components implement cross-cutting behavior.

## map-shell layout

`map-shell/` is split by domain: `component/`, `markers/`, `radius/`, `workspace/`, `leaflet/`, `context-menu/`, `scss/`. See [`map-shell/README.md`](map-shell/README.md).

**Canonical UI contracts:** [`docs/specs/ui/workspace/`](../../../../../../docs/specs/ui/workspace/README.md) (index and linked child specs).

**Service facades (examples):** [`docs/specs/service/workspace-view/`](../../../../../../docs/specs/service/workspace-view/README.md), [`docs/specs/service/workspace-selection/`](../../../../../../docs/specs/service/workspace-selection/README.md).
