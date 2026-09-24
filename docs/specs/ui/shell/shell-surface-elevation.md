# Shell surface elevation (desk ladder)

> **Owner decision:** User feedback 2026-09-23 — in **light** and **sandstone** themes, the area behind rails, gutters, and canvas reads too flat; frosted boxes need a **darker desk** behind them with visible **stepped levels**.  
> **Change class:** Standard — tokens + two host backgrounds; no feature wiring.  
> **Status:** Implemented (tokens + `app-grid-shell` desk background).

## Does this make sense?

**Yes.** The grid shell already has three visual roles:

| Role | Element | Today |
| --- | --- | --- |
| **Desk** | Gap + padding behind tracks | Same `var(--background)` as page — rails and boxes barely separate |
| **Void** | Left/right rail columns | Transparent (correct) |
| **Elevated box** | `shell-box` — canvas, panels, rail containers | `--chrome-surface` frosted card |

Without a darker **desk**, light themes collapse into one cream plane (see screenshot: logo capsule, rail container, and page field are indistinguishable). A **step ladder** (not random per-component greys) keeps hierarchy readable and matches the ownership model: **one desk owner**, **one box mixin**.

**Not in scope:** literal multi-stop gradients on every box — use **flat semantic steps** derived from one ramp; optional **single** desk gradient is allowed if it does not break token gates.

## Elevation ladder

```text
L0  DESK     app-grid-shell :host (+ authenticated layout when grid flag on)
              └── visible in track gaps and padding (between L2 boxes)

L1  VOID     app-shell-control-area :host (transparent — shows L0)

L2  BOX      shell-box surfaces
              ├── app-shell-main-canvas
              ├── app-shell-panel-surface
              └── app-shell-control-container

L3  INSET    Panel body / map content (unchanged — feature-owned; not part of this spec)
```

### Light + sandstone target (visual)

| Level | Read | Relative to `--background` |
| --- | --- | --- |
| L0 Desk | Warm neutral **darker** than page background | ~4–8% foreground mix (theme-specific table below) |
| L1 Void | Shows L0 | transparent |
| L2 Box | Lightest frosted card | existing `--chrome-surface` / `shell-box` — shadow **`--layout-box-shadow`** (shared) |

Dark theme: optional small desk step or `L0 === --background` — verify contrast; do not lighten the desk in dark mode.

## Token proposal (shipped)

Defined in `apps/web/src/styles.scss` (and [`docs/design/tokens.md`](../../../design/tokens.md) § Layout surfaces) — **not** `--shell-*` names:

| Token | Level | Light | Sandstone override | Dark |
| --- | --- | --- | --- | --- |
| `--layout-desk-background` | L0 | `color-mix(in srgb, var(--foreground) 6%, var(--background))` | `color-mix(in srgb, var(--sandstone-text-dark) 5%, var(--background))` | `var(--background)` |
| `--layout-desk-background-subtle` | L0 gradient stop | `color-mix(in srgb, var(--foreground) 4%, var(--background))` | `color-mix(in srgb, var(--sandstone-text-dark) 3%, var(--background))` | `var(--background)` |

**Forbidden:** ad-hoc `--shell-desk-*` without matrix row — see [`shell-layout-tokens.md`](../../../design/shell-layout-tokens.md).

**L2** uses `--chrome-surface` via `@mixin shell-box`, and **one** shadow: `--layout-box-shadow` (short, stronger than `--shadow-md`). Rail containers, `app-shell-main-canvas`, and `app-shell-panel-surface` must not set their own `box-shadow`.

### Optional desk gradient (L0 only)

If a gradient is used, it applies **only** on the desk owner:

```scss
// Draft — implement in grid-shell.component.scss @layer components
background:
  linear-gradient(
    180deg,
    var(--layout-desk-background) 0%,
    var(--layout-desk-background-subtle) 100%
  );
```

Boxes (L2) stay flat — the step contrast comes from desk vs box, not gradient-on-gradient.

## Visual Behavior Contract

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| --- | --- | --- | --- | --- | --- | --- |
| Desk background | `app-grid-shell` | `app-grid-shell` | none | `:host` | content `0` | gaps darker than `--background` in light |
| Rail void | `app-shell-control-area` | rail host | options | `:host` | content `0` | transparent; L0 visible between groups |
| Elevated box | each `shell-box` host | same host | content | `shell-box` mixin | content `0` | lighter than L0 desk |
| Legacy nav path | `authenticated-app-layout` `:host` | layout host | — | `:host:not(:has(app-grid-shell))` | content `0` | unchanged until flag default |

## Where it lives (implementation)

| File | Change |
| --- | --- |
| `apps/web/src/styles.scss` | Define `--layout-desk-background` (+ optional subtle stop) per theme |
| `layout/shell/grid-shell.component.scss` | `background` on `:host` @layer components |
| `layout/authenticated-app-layout.component.scss` | When `app-grid-shell` present, desk on grid host only — avoid double-fill on `:host` |
| `docs/design/tokens.md` | Document ladder + theme table |

**Do not** set desk background on `app-shell-control-area`, `app-shell-main-canvas`, or panel column — that duplicates ownership.

## Theme matrix (acceptance)

| Theme | L0 desk vs page `--background` | L2 box vs L0 | Pass |
| --- | --- | --- | --- |
| `light` | visibly darker | visibly lighter | required |
| `sandstone` | visibly darker | visibly lighter | required |
| `dark` | equal or ≤1 step darker | unchanged frosted read | verify, no regression |

## Acceptance Criteria

- [x] Light theme: gutter between left rail container and main canvas reads as a **darker field**, not same cream as boxes.
- [x] Sandstone theme: same hierarchy; uses sandstone ink tokens, not inline hex.
- [x] Rail columns remain transparent; only **containers** use `shell-box`.
- [x] No new `--shell-*` globals; tokens registered in `tokens.md` + shell-layout matrix.
- [x] Dark theme: desk equals `--background` (no washed-out grey desk).
- [ ] `npm run verify` green after token + SCSS change (run before step 9 / flag default).

## LIVE CHECK

1. `?ff=shellGridLayout` — light theme — squint test: logo pill → rail container → **dark gap** → canvas box — four readable layers.
2. Toggle sandstone — same hierarchy.
3. Toggle dark — no contrast regression on map tiles at box edge.

## Related

- [grid-shell.md](./grid-shell.md) — track geometry
- [shell-control-area.md](./shell-control-area.md) — transparent rail
- [STUDY-015 §2.2](../../../study/015-shell-grid-layout-change-plan.md) — shared surface contract
- [workspace-pane-retirement.md](./workspace-pane-retirement.md) — build step 7d
