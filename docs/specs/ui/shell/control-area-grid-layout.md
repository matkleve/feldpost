# Control-area grid shell layout

> **Status:** Draft — owner decisions required before implementation (see [open questions](./control-area-grid-layout.open-questions.supplement.md)).  
> **Change class:** Sensitive (authenticated shell geometry, multi-surface orchestration, FSM-adjacent panel states).  
> **Reference mock:** [reference-mock supplement](./control-area-grid-layout.reference-mock.supplement.md) (owner screenshot 2026-09-22).  
> **Related:** [layout.md](../../../design/layout.md), [workspace-pane.md](../workspace/workspace-pane.md), [settings-overlay.md](../settings-overlay/settings-overlay.md), [nav-system.md](../nav/nav-system.md)

## What it is

A **grid-based authenticated shell**: thin **control areas** on the far left and right, a **map** (or route page) in the center-left, and a **content panel column** (Upload, Help, Settings, Profile, …) beside the map — matching the owner reference mock. Control options are icon-first with **minimum 44×44 px** hit areas; **~1 s hover** (long hover on tablet) expands **any** option on **either side** to show a label that **overlays** without blocking map interaction.

Slots and mapping: [slots supplement](./control-area-grid-layout.slots.supplement.md). Decisions: [open questions](./control-area-grid-layout.open-questions.supplement.md) (**8/20** locked 2026-09-22).

## What it looks like (baseline intent)

**Desktop / tablet:** `[ left rail | map | content panels | right rail ]` — see [reference mock](./control-area-grid-layout.reference-mock.supplement.md).

- **Rails:** fixed icon tracks; grouped containers with gap on the right.
- **Hover labels:** all L+R options; horizontal expansion; overlay (no layout push).
- **Map floats:** search **top-left**; theme **bottom-right**; zoom/scale/GPS as today.
- **Content panels:** large frosted panels toggled by rail icons (Upload, Help, Settings, Profile, …). **Settings overlay is retired** in favour of a Settings panel. **Profile is separate** from Settings.

## Where it lives

| Layer | Owner (target) | Today |
| --- | --- | --- |
| Shell grid | `AuthenticatedAppLayoutComponent` | Flex + nav spacer + workspace pane |
| Left / right control areas | `app-control-area-left`, `app-control-area-right` | `app-nav`; upload shell absolute |
| Map track | `app-map-shell` | Same |
| Content panel column | New shell host (TBD) | Workspace pane; settings overlay |
| Route pages | `app-page-grid`, etc. | Non-map routes unchanged scope |

## Actions

| # | User action | System response | Triggers |
| --- | --- | --- | --- |
| 1 | Activate route option | Navigate; mark active | Router |
| 2 | Activate Settings | Open **Settings content panel** in panel column | Shell panel FSM — not overlay |
| 3 | Activate Profile | Open **Profile content panel** (separate from Settings) | Shell panel FSM |
| 4 | Activate Upload / Help / … | Toggle matching content panel | Right rail + panel column |
| 5 | Hover option ~1 s (long hover tablet) | Label expands horizontally over canvas | All L+R options |
| 6 | Activate theme (map BR) | Cycle theme | `ThemeService` |
| 7 | Shared media / undo / … | TBD | STUDY-008–011 |

## Component Hierarchy

```text
AuthenticatedAppLayoutComponent
├── app-control-area-left
│   ├── ControlContainer (top) — logo, routes
│   └── ControlContainer (bottom) — profile, settings
├── RouteCanvas
│   ├── MapTrack — app-map-shell + floats (search TL, theme BR)
│   └── ContentPanelColumn — Upload, Help, Settings, Profile, …
├── app-control-area-right
│   ├── ControlContainer (top 1)
│   ├── GapRegion
│   ├── ControlContainer (top 2)
│   └── ControlContainer (bottom)
└── router-outlet (non-map routes — scope TBD)
```

## Visual Behavior Contract (partial)

| Behavior | Geometry owner | Notes |
| --- | --- | --- |
| Shell grid (4 tracks) | layout `:host` | OQ-03 must align with OQ-06-E |
| 44px options | `.control-option` | L+R |
| Hover label overlay | `.control-option__label` | `pointer-events: auto` on pill only |
| Content panel column | `.shell-content-panels` | Fixed width TBD |
| Inter-container gap (right) | `.control-area--right` | OQ-17 |

## Studies required before build

| ID | Title | Blocks |
| --- | --- | --- |
| STUDY-007 | Four-track grid + workspace/settings migration | Grid HTML |
| STUDY-008 | Option hover FSM + panel toggle FSM | All rails |
| STUDY-009 | Undo / history scope | Right container 2 |
| STUDY-010 | Shared media scope | Right container 1 |
| STUDY-011 | Help / tips panels | Right bottom |

## Transition overview

[transition-plan supplement](./control-area-grid-layout.transition-plan.supplement.md) — includes **settings overlay → Settings panel** and **workspace pane → content panel column** migration.

## Acceptance criteria (spec phase)

- [ ] 🔴 open questions answered (**8/20** locked 2026-09-22)
- [ ] Reference mock supplement reviewed by owner
- [ ] STUDY-007 … 011 filed
- [ ] Settings overlay retirement plan in settings-overlay.md
- [ ] Glossary + layout.md updated after spec lock

## Owner decisions still needed

**OQ-01**, **OQ-03**, **OQ-09**, **OQ-16**, **OQ-20**, plus 🟡 items. **Locked:** OQ-02, OQ-06, OQ-07, OQ-11, OQ-15, OQ-18.
