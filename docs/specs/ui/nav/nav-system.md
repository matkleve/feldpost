# App Navigation (sidebar)

## What It Is

Authenticated chrome: pinned desktop sidebar or mobile bottom tab bar. Coordinates routing, theme cycle, settings overlay, and sidebar width CSS var for shell layout.

**Full contract:** [`sidebar.md`](../../component/workspace/sidebar.md) · Collapse: [`sidebar.collapse.supplement.md`](../../component/workspace/sidebar.collapse.supplement.md)

## What It Looks Like

Frosted left rail (`15rem` / `3rem` via collapse control). Icon-first rows with fixed leading column; labels clip when collapsed. Theme row includes [cycle indicator dots](../../component/ui-primitives/cycle-indicator-dots.md). Settings via account row + overlay.

## Where It Lives

- **Code:** `apps/web/src/app/features/nav/` (`app-nav`)
- **Shell:** `AuthenticatedAppLayoutComponent` (layout spacer + fixed sidebar)

## Actions

| # | User Action | System Response |
| --- | --- | --- |
| 1 | Toggle collapse control | Width `3rem` ↔ `15rem`; persist; map reflow |
| 2 | Click nav link | Navigate |
| 3 | Click theme row | Cycle theme |
| 4 | Click account row | Open settings overlay |
| 5 | Click outside overlay | Close overlay |

## Component Hierarchy

```text
AuthenticatedAppLayoutComponent
└── app-nav (NavComponent)
    ├── nav__header (collapse control)
    ├── nav__list (route links)
    ├── nav__utility-row (theme + dots)
    └── account row → settings overlay
```

## State

| Name | Type | Effect |
| --- | --- | --- |
| `sidebarCollapsed` | signal | Rail width, `nav--collapsed`, `--feldpost-sidebar-width` |
| `settingsOverlayOpen` | from `SettingsPaneService` | Account row active |

## Acceptance Criteria

- [x] Documented in [`sidebar.acceptance-criteria.md`](../../component/workspace/sidebar.acceptance-criteria.md)
- [x] No duplicate ownership of workspace pane geometry
