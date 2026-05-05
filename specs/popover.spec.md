# Popover (surface container)

## What It Is

A **presentational** floating surface: background, border, corner radius, box shadow, and z-index — plus **`ng-content`** for arbitrary body content. It does **not** define or style inner lists, forms, or filters. Position (`fixed` coordinates, CDK overlay, or inline placement) is owned by the **parent** or a dedicated positioning helper; this component is the **visual shell** only.

## What It Looks Like

Aligned with existing dropdown surfaces in the app (**`app-dropdown-shell`**, filter/sort dropdown specs): elevated warm white / dark-elevation surface using **`--color-bg-elevated`**, **1px** border **`--color-border`** (or **`--menu-surface-border`** where menu tokens are preferred — pick one canonical border token at implementation time and reference it here only), corner radius **`--radius-lg`**, shadow **`--elevation-dropdown`**, z-index **`--z-dropdown`**. No padding/margin opinions on the slot unless Figma adds an inner frame later; inner spacing belongs to **slotted content** components.

## Where It Lives

- **Code (planned):** `apps/web/src/app/shared/popover/popover.component.ts` (+ `.html`, `.scss`).
- **Use:** Wrapper for toolbar-attached panels (filter builder, grouping, sort, projects), and any feature that needs the same elevated shell without importing feature logic into the shell.

## Angular component

| | |
| --- | --- |
| **Selector** | `app-popover` |
| **Class** | `PopoverComponent` |
| **Files** | `apps/web/src/app/shared/popover/popover.component.ts`, `.html`, `.scss` |

## Props / Inputs

| Input | Type | Default | Notes |
| --- | --- | --- | --- |
| `panelClass` | `string` | `''` | Pass-through classes for width constraints from parent |
| `minWidth` | `number \| null` | `null` | Optional; pixel width floor |
| `maxWidth` | `number \| null` | `null` | Optional; pixel width cap |
| `scrollable` | `boolean` | `false` | When `true`, enable `overflow: auto` + `overscroll-behavior: contain` per variant |

**Outputs:** none required for chrome-only v1.

## Purpose and responsibility

| Owns | Does not own |
| --- | --- |
| `background`, `border`, `border-radius`, `box-shadow`, `z-index` on the host (or single inner “chrome” node if required for content clipping) | Any business UI inside the panel |
| Optional **`overflow: auto`** if spec’d for scrollable shells (default: **off** unless parent requires — document in implementation) | Trigger button (`PanelTrigger` is separate) |
| Single projection slot for content | `getBoundingClientRect`, anchor math, flip/shift logic |
| | Click-outside, Escape, focus trap, `aria-haspopup` / `aria-controls` wiring (parent or overlay service) |
| | Width/height **content**; optional **`minWidth` / `maxWidth`** inputs are sizing hints from parent, not “knowing” the content |

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

If clipping requires one inner node, structure may be:

```text
app-popover
└── .popover__chrome
    └── ng-content
```

Any extra wrapper MUST follow **intermediate wrapper rule** in `.cursor/rules/scss-ownership.mdc` (zero layout styling unless documented exception).

## Data

No domain data. **`top` / `left` / `position`** and overlay attachment are **parent-owned** (same split as `DropdownShellComponent` today: shell styles here, coordinates on a host or wrapper the parent controls).

## State

**No programmatic FSM** on this component: visibility and open/closed are parent-controlled (e.g. `*ngIf` / CDK). Pseudo-states (`:focus-within`) MAY be used later for focus ring forwarding — not required for v1.

If a future revision adds `data-state` for animation, that must be specified in a spec update with transition map.

## Variants

| Variant | Description |
| --- | --- |
| **default** | Token shell as in § What It Looks Like |
| **scrollable** (optional, if needed) | `overflow: auto` + `overscroll-behavior: contain` on host — only if parent contract requires; default **off** |

Start with **default** only unless a parent spec explicitly requests **scrollable**.

## Token references

| Concern | Token(s) |
| --- | --- |
| Surface background | `--color-bg-elevated` |
| Border | `1px solid var(--color-border)` **or** `var(--menu-surface-border)` — one chosen at implementation; both are valid tokens |
| Radius | `--radius-lg` |
| Elevation | `--elevation-dropdown` |
| Z-index | `--z-dropdown` |

## Visual Behavior Contract

### Ownership matrix

| Behavior | Visual geometry owner | Stacking context owner | Interaction hit-area owner | Selector(s) | Layer (z-index/token) | Test oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Shell rectangle | `:host` (or `.popover__chrome` if used) | `:host` | slotted interactive elements | `:host` | `--z-dropdown` | Box matches parent-given box; shadow visible |
| Border / radius | same as shell | same | — | `:host` | — | Border radius matches `--radius-lg` |
| Scrollable body (optional) | same as shell | same | slotted | `:host.popover--scrollable` | — | Scrollbar appears only when variant enabled |

### Ownership triad

| Behavior | Geometry owner | State owner | Visual owner | Same element? |
| --- | --- | --- | --- | --- |
| Elevated surface | `:host` | — (no FSM) | `:host` | ✅ |

## File Map

| Path | Role |
| --- | --- |
| `apps/web/src/app/shared/popover/popover.component.ts` | Optional width inputs, host bindings as decided with parent |
| `apps/web/src/app/shared/popover/popover.component.html` | `ng-content` |
| `apps/web/src/app/shared/popover/popover.component.scss` | `@layer components` only for shell geometry/visuals |

## Wiring

- **Relationship to `app-dropdown-shell`:** Today **`DropdownShellComponent`** combines chrome + fixed positioning + outside click. **Popover** is the **chrome-only** extraction. New features SHOULD prefer **`app-popover`** + parent/overlay for positioning when separating concerns; migrating **`DropdownShellComponent`** is optional follow-up work.
- **With `app-panel-trigger`:** Parent coordinates trigger `open` state with popover visibility.

## Acceptance Criteria

- [ ] Host (or single chrome child) applies **`--color-bg-elevated`**, **`--elevation-dropdown`**, **`--radius-lg`**, **`--z-dropdown`**, and a single border token — **no hex/rgb literals** in SCSS.
- [ ] **No default padding** on the host that would double-count feature panel padding unless a follow-up spec explicitly requires inner padding.
- [ ] Slotted content can be **any** component tree; **Popover** imports no feature modules.
- [ ] SCSS uses **`@layer components`**; no `@layer states` until a normative state is added.
- [ ] Document in parent spec who owns **dismiss** and **focus**.

## Canonical docs note

Mirror to **`docs/specs/component/ui-primitives/ui-primitives.popover.md`** when integrating with repo spec lint and `docs/specs/component/README.md` index.
