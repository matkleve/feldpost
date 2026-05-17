# Popover (surface container)

<!-- @no-figma: Implemented without a dedicated Figma node. -->
<!-- Approved by user as chrome-only companion to PanelTrigger (2026-05-06). -->
<!-- No creative visual decisions — all values come from existing elevation / border tokens -->
<!-- already used by DropdownShellComponent, which this mirrors as chrome-only extraction. -->

## What It Is

A **presentational** floating surface: background, border, corner radius, box shadow, and z-index — plus **`ng-content`** for arbitrary body content. It does **not** define or style inner lists, forms, or filters. Position (`fixed` coordinates, CDK overlay, or inline placement) is owned by the **parent** or a dedicated positioning helper; this component is the **visual shell** only.

## What It Looks Like

Matches the existing elevated dropdown surfaces in the app (`app-dropdown-shell`, filter/sort dropdown specs): warm white / dark-elevation surface using **`--color-bg-elevated`**, **1px** border **`--color-border`**, corner radius **`--radius-lg`** (**`styles.scss` `@theme inline`** — **Batch 44**), shadow **`var(--shadow-lg)`** (**tweakcn `:root`** — **Batch 39** removed duplicate **`--shadow-*`** rows from **`_legacy-design-tokens.scss`**; see [`docs/design/tokens.md`](../../../design/tokens.md) §3.5), **`z-index: 300`** (dropdown plane — **Phase 7 Batch 43**). No default padding — inner spacing belongs to slotted content components.

## Where It Lives

- **Code:** `apps/web/src/app/shared/popover/popover.component.ts` (+ `.html`, `.scss`).
- **Use:** Wrapper for toolbar-attached panels (filter builder, grouping, sort, projects) and any feature that needs the same elevated shell without importing feature logic into the shell.

## Angular component

| | |
| --- | --- |
| **Selector** | `app-popover` |
| **Class** | `PopoverComponent` |
| **Files** | `apps/web/src/app/shared/popover/popover.component.ts`, `.html`, `.scss` |

## Props / Inputs

| Input | Type | Default | Notes |
| --- | --- | --- | --- |
| `panelClass` | `string` | `''` | Pass-through classes from parent (e.g. width constraints) |
| `minWidth` | `number \| null` | `null` | Pixel width floor; parent-supplied |
| `maxWidth` | `number \| null` | `null` | Pixel width cap; parent-supplied |
| `scrollable` | `boolean` | `false` | When `true`, enables `overflow: auto` + `overscroll-behavior: contain` |

**Outputs:** none for chrome-only v1.

## Purpose and responsibility

| Owns | Does not own |
| --- | --- |
| `background`, `border`, `border-radius`, `box-shadow`, `z-index` on the host | Any business UI inside the panel |
| Optional scroll containment via `scrollable` input | Trigger button (`PanelTrigger` is separate) |
| Single `ng-content` projection slot | `getBoundingClientRect`, anchor math, flip/shift logic |
| | Click-outside, Escape, focus trap, `aria-haspopup` / `aria-controls` wiring |
| | Width/height decisions; `minWidth` / `maxWidth` are parent hints only |

## Actions

| # | User action | System response |
| --- | --- | --- |
| 1 | Parent renders popover | Surface paints with tokenized shell styles |
| 2 | User interacts with slotted content | Handled entirely by child components |
| 3 | Parent removes popover from DOM | Surface unmounts — no internal persistence |

## Component Hierarchy

```text
app-popover
└── ng-content (anonymous)  ← arbitrary panel content
```

If clipping requires one inner node:

```text
app-popover
└── .popover__chrome
    └── ng-content
```

Any extra wrapper MUST follow the **intermediate wrapper rule** in `.cursor/rules/scss-ownership.mdc` (zero layout styling unless documented exception).

## Data

No domain data. `top` / `left` / `position` and overlay attachment are **parent-owned**.

## State

**No programmatic FSM** — visibility is parent-controlled (e.g. `@if` / CDK). If a future revision adds `data-state` for animation, that must be specified in a spec update with a transition map.

## Variants

| Variant | Description |
| --- | --- |
| **default** | Token shell only — no scroll |
| **scrollable** | `overflow: auto` + `overscroll-behavior: contain`; only on parent request |

## Token references

| Concern | Token(s) |
| --- | --- |
| Surface background | `--color-bg-elevated` |
| Border | `1px solid var(--color-border)` |
| Radius | `--radius-lg` |
| Elevation | `var(--shadow-lg)` (tweakcn ladder — not a legacy-bridge row) |
| Z-index | literal **`300`** (`docs/design/tokens.md` §3.5) |

## Visual Behavior Contract

### Ownership matrix

| Behavior | Visual geometry owner | Stacking context owner | Interaction hit-area owner | Selector(s) | Layer (z-index/token) | Test oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Shell rectangle | `:host` | `:host` | slotted interactive elements | `:host` | **`300`** | Box matches parent-given box; shadow visible |
| Border / radius | `:host` | `:host` | — | `:host` | — | Border radius matches `--radius-lg` |
| Scrollable body | `:host` | `:host` | slotted | `:host.popover--scrollable` | — | Scrollbar appears only when variant enabled |

### Ownership triad

| Behavior | Geometry owner | State owner | Visual owner | Same element? |
| --- | --- | --- | --- | --- |
| Elevated surface | `:host` | — (no FSM) | `:host` | ✅ |

## File Map

| Path | Role |
| --- | --- |
| `apps/web/src/app/shared/popover/popover.component.ts` | Width inputs, host class binding |
| `apps/web/src/app/shared/popover/popover.component.html` | `ng-content` |
| `apps/web/src/app/shared/popover/popover.component.scss` | `@layer fp-components`; token-only shell |

## Wiring

- **Relationship to `app-dropdown-shell`:** `DropdownShellComponent` combines chrome + fixed positioning + outside click. `app-popover` is the chrome-only extraction — use it when the parent or an overlay service owns positioning. Migrating `DropdownShellComponent` is optional follow-up work.
- **With `app-panel-trigger`:** Parent coordinates `panelState` ↔ popover visibility.

## Acceptance Criteria

- [ ] Host applies **`--color-bg-elevated`**, **`var(--shadow-lg)`** (tweakcn **`--shadow-*`**), **`--radius-lg`**, **`z-index: 300`**, and **`--color-border`** — no hex/rgb literals in SCSS.
- [ ] No default padding on the host.
- [ ] Slotted content can be any component tree; `PopoverComponent` imports no feature modules.
- [ ] SCSS uses `@layer fp-components`; no `@layer fp-states` until a normative state is specified.
- [ ] Parent spec documents who owns **dismiss** and **focus**.
