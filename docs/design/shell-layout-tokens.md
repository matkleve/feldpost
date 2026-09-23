# Shell and layout CSS custom properties — agent subsection

**Purpose:** Shell-only **forbidden/allowed names** and geometry matrix for authenticated layout, nav rail, and settings overlay. **Global** token rules (all layers) live in the parent contract — read that first.

**Parent (MUST-read first):** [agent-css-variable-contract.md](./agent-css-variable-contract.md)

**Related:** [token-layers.md](./token-layers.md), [tokens.md](./tokens.md), [settings-overlay.md](../specs/ui/settings-overlay/settings-overlay.md), [workspace-pane.md](../specs/ui/workspace/workspace-pane.md) § Authenticated shell geometry ownership, [agent-token-decision-closure.md](../migration/reports/agent-token-decision-closure.md), [agent-handoff-authenticated-shell-layout-ownership.md](../migration/reports/agent-handoff-authenticated-shell-layout-ownership.md) §10.

---

## Where we are (2026-05-19)

| Layer | Status |
| ----- | ------ |
| Legacy bridge (`_legacy-design-tokens.scss`, `--overlay-rail-*`, `--layout-sidebar-*`) | **Removed** — Phase 7 **Done** |
| Global primitives (`--spacing-*`, `--radius-*`, tweakcn semantics) | **Canonical** — see parent contract |
| Component `:host` geometry vars (`--settings-overlay-*`, `--sidebar-width-*`) | **Canonical** — owned per component spec |
| Ad-hoc `--shell-*` on `:root` or layout hosts | **Forbidden** — **0** live vars in repo |

**`--shell-settings-overlay-left` is not a shipped token.** Panel offset: **`.settings-overlay`** `left` in `settings-overlay.component.scss`. In-panel rail column: **`--settings-overlay-left-width`** on **`ss-settings-overlay` `:host`**.

---

## Forbidden / allowed / owner matrix (shell)

| Name pattern | Verdict | Owner | Notes |
| ------------ | ------- | ----- | ----- |
| `--layout-desk-background` | **Allowed** | `grid-shell.component.scss` `:host` | L0 desk — [`shell-surface-elevation.md`](../specs/ui/shell/shell-surface-elevation.md) |
| `--layout-desk-background-subtle` | **Allowed** | `grid-shell.component.scss` `:host` | Optional L0 gradient stop |
| `--layout-box-shadow` | **Allowed** | `@mixin shell-box` | L2 box shadow — canvas, panels, rail containers |
| `--shell-*` | **Forbidden** (unless spec adds row) | — | No ad-hoc shell bridge globals |
| `--overlay-rail-*` | **Forbidden** (removed) | — | Batch 34 → `--settings-overlay-left-*` on overlay `:host` |
| `--layout-sidebar-*` | **Forbidden** (removed) | — | Batch 33 → nav `:host` / `--sidebar-width-*` |
| `--settings-overlay-left-width`, `--settings-overlay-left-ratio`, … | **Allowed** | `settings-overlay.component.scss` `:host` | In-panel **rail column** geometry only |
| `.settings-overlay` inside the canvas | **Allowed** (positioning) | `settings-overlay.component.scss` `:host-context(app-shell-main-canvas)` | `absolute; inset: 0`. No sidebar offset. |
| `--sidebar-width-collapsed`, `--sidebar-width-expanded` | **Allowed** | `nav.component.scss` `app-nav` `:host` | Nav rail only; not visible to overlay sibling |
| `--spacing-*`, `--container-radius-*`, tweakcn `--primary`, … | **Allowed** | Global layers | Parent contract + [token-layers.md](./token-layers.md) |

---

## Settings overlay: two different “left” concepts

| Concern | Correct token / selector | Wrong guess |
| ------- | ------------------------ | ----------- |
| **Canvas fill** | Inside `app-shell-main-canvas`, `.settings-overlay` is `position: absolute; inset: 0`. Width and height vars are `100%`. | A sidebar `left` offset, `top: 50%`, or `translateY(-50%)` on that path |
| **Left column width inside panel** | `var(--settings-overlay-left-width)` on the rail flex child | `var(--overlay-rail-left-min)` (removed) |

The product mount is the canvas. Do not reintroduce a fixed pane offset from `--feldpost-sidebar-width`.

---

## Cross-sibling positioning (nav vs settings overlay)

Both mount under `AppComponent`. **`:host` vars do not cross siblings.**

**Corrected 2026-09-22.** This section described a duplicated `calc(0.25rem * 12)` literal in
settings-overlay as the shipped mechanism, and a shared variable as unscheduled future work. The
code does the opposite, and has for some time: it ships the shared variable, and that `calc` does
not appear in the repository. An agent following the old text would have written the wrong thing
into the one file this document exists to govern. Measured at `87385f2`; see
[STUDY-015](../study/015-shell-grid-layout-change-plan.md) § 13.2.

**What ships now (2026-09-23):** the grid shell owns the tracks. Settings fills the canvas and does not read a rail width. `grid-shell.component.ts` still writes `--feldpost-sidebar-width` because the unscoped `.settings-overlay` rule still contains the old `left` calc. The canvas override (`:host-context(app-shell-main-canvas)`) wins for the product mount. Do not add a new reader of that property.

- **Forbidden:** `--shell-settings-overlay-left` and any other `--shell-*` bridge without a spec row + ownership matrix.
- **Do not** offset the canvas settings surface with `--feldpost-sidebar-width`.

---

## Verification

Shell-specific gates are included in the parent contract § Phase 7 verification. Run from repo root after shell SCSS edits — see [agent-css-variable-contract.md](./agent-css-variable-contract.md).
