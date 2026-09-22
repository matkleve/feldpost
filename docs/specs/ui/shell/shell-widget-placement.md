# Widget placement

## What It Is

Where a widget sits on the rails. The static list in the preview does not change because of this spec.

## What It Looks Like

The left rail has a top container and a bottom container, split by the leftover in [shell-control-area.md](shell-control-area.md). The right rail opens the panel column. A widget uses one or more of those places. It does not invent a new track.

## Where It Lives

- **Parent:** `app-shell-control-area` on `app-grid-shell`.
- **Today's list:** `LEFT_GROUPS` in `layout/shell/shell-control.types.ts`. Top: Map, Projects, Media, `+`. Bottom: Account, Settings.

## Actions

| # | User Action | System Response | Triggers |
| --- | --- | --- | --- |
| 1 | Activates a top-container option | Canvas shows that page | route |
| 2 | Activates a bottom-container option | Canvas shows that page | route or today's account and settings |
| 3 | Activates a right-rail panel option | Panel column opens that panel | [shell-layout.md](../../service/shell-layout/shell-layout.md) |

## Component Hierarchy

```text
app-shell-control-area
├── top container [pages]
├── leftover
└── bottom container [account, settings, workers, organisation]
```

## Data

No installed-widget query in this window. [shell-control-area.md](shell-control-area.md) still renders the static list.

| Place | What opens | Who |
| --- | --- | --- |
| Top-left | A canvas page | Map, Projects, Media, and page widgets once placed |
| Bottom-left | A canvas page | Account, Settings, Workers, Organisation |
| Right-rail panel | The panel column | A widget that declares a panel |
| Page and panel | Both | Allowed for one widget |
| Right rail only | A panel, no left option | Allowed. No widget is named for it |

Workers are Mitarbeiter. Workers and Organisation join the bottom container when they exist. They do not join the top container. The GPS-and-media suite in [widget-suite.md](../../page/widget-suite.md) has no container yet.

Logo, `+`, Account, and Settings stay. Map, Projects, and Media may leave as icons. The route still renders the page. The static list keeps those three icons until this spec names the canvas that shows when the Map icon is absent.

## State

| Name | Type | Default | Effect |
| --- | --- | --- | --- |
| `placement` | page, panel, or both | none until a widget declares it | Which containers gain an option |

## File Map

| File | Purpose |
| --- | --- |
| `layout/shell/shell-control.types.ts` | Static list, unchanged by this spec |
| `docs/specs/ui/shell/shell-widget-placement.md` | This contract |

## Wiring

The grid shell does not read this spec at runtime. A later change replaces the static list only after the Map-icon gate above is answered.

## Acceptance Criteria

- [ ] `LEFT_GROUPS` still lists Map, Projects, Media, `+`, Account, and Settings.
- [ ] Workers and Organisation are specified for the bottom container and are absent from the static list.
- [ ] Removing a Map, Projects, or Media icon does not remove its route.
- [ ] No widget route is added from this spec alone.
