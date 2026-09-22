# Control-area grid shell layout

> **Status:** Draft — owner decisions required before implementation (see [open questions](./control-area-grid-layout.open-questions.supplement.md)).  
> **Change class:** Sensitive (authenticated shell geometry, multi-surface orchestration, FSM-adjacent panel states).  
> **Related:** [layout.md](../../../design/layout.md), [page-rail-grid.md](../../../design/page-rail-grid.md), [workspace-pane.md](../workspace/workspace-pane.md), [nav-system.md](../nav/nav-system.md), [upload-shell.md](../../component/upload/upload-shell.md), [sidebar.md](../../component/workspace/sidebar.md)

## What it is

A **grid-based authenticated shell** where **control areas** sit on **opposing vertical edges** (desktop and tablet), and the **route canvas** fills the center. Each control area holds **containers** (grouped stacks) of **control options** — icon-first actions with **minimum 44×44 px** hit areas.

Baseline slot lists, canvas floats, and mapping: [slots supplement](./control-area-grid-layout.slots.supplement.md). Open questions: [open questions](./control-area-grid-layout.open-questions.supplement.md) (5 owner decisions locked 2026-09-22).

## What it looks like (baseline intent)

**Desktop / tablet (≥ 768px — breakpoint TBD):** three columns — left control area · route canvas · right control area. Each side stacks **top-aligned** and **bottom-aligned** containers; the right side adds an explicit **gap** between upper container groups (not one continuous stack).

**Left rail (decided):** fixed **icon-only** track; after **~1 s hover**, each control option **extends horizontally** to show its label (per-option — not whole-rail expand). No pinned collapse control.

**Route canvas floats (decided):** search bar **top-left** on map; **theme cycle** on map/content area (not in control containers). See [slots supplement](./control-area-grid-layout.slots.supplement.md).

Containers use frosted or flat grouped surfaces (OQ-19). Options are icon-first with optional badges.

## Where it lives

| Layer | Owner (target) | Today |
| --- | --- | --- |
| Shell grid | `AuthenticatedAppLayoutComponent` | Flex row: nav spacer + `__main` + workspace pane |
| Left control area | Evolved `app-nav` or `app-control-area-left` | Fixed sidebar ([`sidebar.md`](../../component/workspace/sidebar.md)) |
| Right control area | `app-control-area-right` (TBD) | Upload shell absolute; workspace pane; no unified rail |
| Route canvas | `app-map-shell`, `app-page-grid`, … | Same hosts; geometry refs change |

**Code:** `apps/web/src/app/layout/authenticated-app-layout.component.*`, `features/nav/`, `features/upload/upload-shell/`.

## Actions

Per-option behavior is **blocked on open questions**. Shell-level actions:

| # | User action | System response (target) | Triggers | Blocked by |
| --- | --- | --- | --- | --- |
| 1 | Activate route option (Map, Media, …) | Navigate; mark option active | `RouterLink` / shell router | OQ-05 |
| 2 | Activate Settings | Open settings overlay | `SettingsPaneService` | — |
| 2b | Activate Profile | Open profile / account surface | TBD route or overlay section | Profile entry TBD |
| 3 | Activate Upload | Open upload panel per dock model | `UploadShellUiService` | OQ-06, OQ-09 |
| 4 | Activate Download | Open export queue or selection export | Export services | OQ-10 |
| 4b | Activate Shared media | Open shared-media surface | TBD | STUDY-010 |
| 5 | Activate Help / Tips | Open help surface | TBD | OQ-14, STUDY-011 |
| 6 | Activate Undo / History / Redo | Command stack or history panel | TBD | OQ-13, STUDY-009 |
| 7 | Hover control option ~1 s | Option expands horizontally; label visible | CSS + pointer timing | STUDY-008 |
| 8 | Activate theme on map | Cycle theme | `ThemeService` | Float position TBD |
| 9 | Resize viewport across breakpoints | Reflow control areas per tablet/mobile policy | CSS + layout service | OQ-16 |

Detailed action tables MUST be added per control option after spec lock.

## Component Hierarchy

```text
AuthenticatedAppLayoutComponent (app-authenticated-app-layout)
├── app-control-area-left (evolved app-nav — TBD selector)
│   ├── ControlContainer (top) — logo, route options
│   └── ControlContainer (bottom) — settings, profile
├── RouteCanvas (.authenticated-app-layout__canvas)
│   ├── app-map-shell (map routes)
│   ├── router-outlet → page hosts (app-page-grid, …)
│   ├── [optional] app-workspace-pane + app-drag-divider (OQ-06)
│   └── Map zone floats
│       ├── SearchBar (top-left — OQ-18)
│       ├── ThemeCycle (map canvas — OQ-15)
│       └── GPS, basemap, scale, zoom (existing)
└── app-control-area-right (TBD)
    ├── ControlContainer (top 1) — notifications, upload, download, shared media
    ├── GapRegion (explicit — OQ-17)
    ├── ControlContainer (top 2) — undo, history, redo
    └── ControlContainer (bottom) — tips, help
```

Selectors and file paths are **TBD** until STUDY-007 and OQ-03 are decided.

## Terminology (proposed — OQ-01)

| Term | Definition |
| --- | --- |
| **Control area** | Full-height grid column for chrome |
| **Control container** | Grouped surface inside a control area |
| **Control option** | Single target; min 44×44 px hit box |
| **Route canvas** | Center track(s) for route content |
| **Gap (inter-container)** | Empty band between containers on one side |

## Baseline grid model (pick in OQ-03)

| Option | Summary |
| --- | --- |
| **A** | `grid-template-columns: [left] 1fr [right]` — recommended for discussion |
| **B** | Extend `app-page-grid` / [page-rail-grid.md](../../../design/page-rail-grid.md) to shell |
| **C** | Flex shell with fixed control columns |

Workspace pane placement: **undecided** (OQ-06).

## Visual Behavior Contract (partial)

| Behavior | Geometry owner | Hit-area owner | Blocked by |
| --- | --- | --- | --- |
| Shell grid tracks | layout `:host` | — | OQ-03 |
| 44px control options | `.control-option` | same | — |
| Hover label expansion (~1s) | `.control-option` | same | STUDY-008 |
| Inter-container gap | `.control-area--right` | — | OQ-17 |
| Active option | `[data-active]` on option | option | STUDY-008 |

Full matrix before HTML.

## Studies required before build

| ID | Title | Blocks |
| --- | --- | --- |
| STUDY-007 | Shell grid topology + workspace placement | Grid HTML |
| STUDY-008 | Control-option interaction model | FSM per option |
| STUDY-009 | Undo / change-history scope | Right container 2 |
| STUDY-010 | Notifications + shared items | Right container 1 |
| STUDY-011 | Help / tips surfaces | Right bottom |

File under `docs/study/` per [STUDY-FORMAT.md](../../../study/STUDY-FORMAT.md).

## Transition overview

[transition-plan supplement](./control-area-grid-layout.transition-plan.supplement.md): spec lock → grid scaffold → left area → right area → workspace/upload consolidation → page routes → tablet → legacy removal.

## Non-goals (v1)

- Replacing `app-page-grid` on `/media`, `/projects`, `/colleagues`.
- Mobile shell (unless OQ-16 adds it).
- Notification / global undo **services** in the scaffold pass.

## Acceptance criteria (spec phase)

- [ ] 🔴 open questions answered in decision log (**5/20** locked 2026-09-22)
- [ ] Glossary updated for chosen terms
- [ ] `layout.md` desktop § updated or superseded
- [ ] STUDY-007 … 011 filed
- [ ] Transition plan + feature flag agreed

## Owner decisions needed now

**Locked (2026-09-22):** OQ-02 (hover labels), OQ-07 (two buttons), OQ-11 (shared media), OQ-15 (theme on map), OQ-18 (search top-left).

Still needed: **OQ-01** (terms), **OQ-03** (grid), **OQ-06** (workspace pane), **OQ-09** (upload), **OQ-16** (mobile/tablet). Full set: [open questions](./control-area-grid-layout.open-questions.supplement.md).
