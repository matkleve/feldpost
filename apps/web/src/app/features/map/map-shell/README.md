# map-shell

Primary map route orchestrator (`MapShellComponent`) and map-zone wiring.

## Layout

| Subfolder | Responsibility |
| --- | --- |
| `component/` | `MapShellComponent`, `map-shell.state.ts`, helpers, main spec |
| `markers/` | Photo markers, reconcile, cluster, viewport query, zoom highlight |
| `radius/` | Radius selection visuals and actions |
| `workspace/` | Map context menus, project actions/dialogs, workspace action registry |
| `leaflet/` | Leaflet init, basemap, geolocation, deferred startup, preferences |
| `context-menu/` | Map context actions and focus payload |
| `scss/` | Co-located partials (`_map-shell-*.scss`) |

## Specs

- [`docs/specs/ui/workspace/`](../../../../../../../docs/specs/ui/workspace/README.md)
- [`docs/design/map-system.md`](../../../../../../../docs/design/map-system.md)
