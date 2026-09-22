# Main canvas

## What It Is

The generic content track of the grid shell. It shows whatever route or widget is current. The map is one tenant, not the owner of the shell.

## What It Looks Like

A rounded page box in the `1fr` track. Every left-rail page (map, projects, media, and later pages) renders inside this one box. `@include shell-box` supplies the frost, the border, and `border-radius: var(--container-radius-panel)`. The grid host owns the gutter (`gap` and `padding`). This host has no margin. `overflow: hidden` clips the page to that radius.

## Where It Lives

- **Parent:** `app-grid-shell`, second track.
- **Appears when:** the grid shell is shown.

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Navigates to a canvas route | Projected content swaps | router outlet |
| 2 | Pans the map | Map handles the gesture | content, not this host |

## Component Hierarchy

```text
app-shell-main-canvas
└── ng-content / router-outlet
```

## Data

| Source | Contract | Operation |
| --- | --- | --- |
| Parent layout | routed component | Project |

This component does not read panel state or rail lists.

## State

| Name | Type | Default | Effect |
| --- | --- | --- | --- |
| none | — | — | Content owns its own state |

## File Map

| File | Purpose |
| --- | --- |
| `layout/shell/shell-main-canvas.component.ts` | Slot host |
| `layout/shell/shell-main-canvas.component.html` | Projection |
| `layout/shell/shell-main-canvas.component.scss` | Rounded page box |

## Wiring

`AuthenticatedAppLayoutComponent` places the existing router outlet and map host here. This component does not choose the route.

```mermaid
flowchart LR
  layout[AuthenticatedAppLayout] --> canvas[app-shell-main-canvas]
  canvas --> outlet[router-outlet]
```

## Visual Behavior Contract

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Page box | `app-shell-main-canvas` | `app-shell-main-canvas` | projected page | `:host` | content `0` | `shell-box`, radius `--container-radius-panel`, no margin |

`:host` is a grid child and declares `min-width: 0` and `min-height: 0`. The projected page does not paint its own outer radius.

## Acceptance Criteria

- [ ] `:host` includes `shell-box` and clips its page with `overflow: hidden`.
- [ ] Radius is `var(--container-radius-panel)`.
- [ ] The host has no margin. The gutter is the grid's `gap` and `padding`.
- [ ] Map, projects, and media all mount in this box. The canvas does not import Leaflet.
- [ ] `:host` sets `min-width: 0` and `min-height: 0`.
