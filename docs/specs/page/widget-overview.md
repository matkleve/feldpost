# Widget overview

## What It Is

The empty canvas. The left-rail logo opens it. It explains the shell and lists each widget with a state.

## What It Looks Like

The page renders inside `app-shell-main-canvas`. One heading, one explanation, then one row per widget: name and state. Gap between rows is `var(--spacing-3)`. It does not add a second radius.

## Where It Lives

- **Route:** `/overview`
- **Trigger:** the logo in `app-shell-control-area` on the left rail.
- **Parent:** `app-shell-main-canvas`.
- **While Map stays on the rail:** `/` is still the map. The logo is the way to this page.

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Activates the logo | Canvas shows this page | route `/overview` |
| 2 | Reads a row | No navigation | display |

## Component Hierarchy

```text
app-shell-main-canvas
└── widget overview
    ├── heading
    ├── explanation
    └── widget row [name, state]
```

## Data

The page reads [widgets.md](../service/widgets/widgets.md). Fixed entries show "On the rail". Installable entries show "Not added".

## State

| Name | Type | Default | Effect |
| --- | --- | --- | --- |
| `on-rail` | row state | Map, Projects, Media | State text is "On the rail" |
| `not-added` | row state | the other widgets | State text is "Not added" |

## File Map

| File | Purpose |
| --- | --- |
| `features/widgets/widget-overview.page.ts` | This page |
| `layout/shell/shell-control-area.component.html` | Logo control |
| `layout/authenticated-app.routes.ts` | `/overview` |

## Wiring

`resolveAuthenticatedActiveShell('/overview')` is `overview`, so the map host hides and this page receives pointer events.

## Acceptance Criteria

- [ ] The logo navigates to `/overview`.
- [ ] The page shows the explanation and one state per widget in the list above.
- [ ] `/` still shows the map.
- [ ] No migration is added from this spec alone.

## Visual Behavior Contract

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Page column | `app-widget-overview` | `app-widget-overview` | logo, outside this page | `:host` | content `0` | heading, explanation, rows |
| Row | widget row | same | none | row | content `0` | name and state |
