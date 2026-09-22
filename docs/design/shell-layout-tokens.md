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
| `--shell-*` | **Forbidden** (unless spec adds row) | — | No ad-hoc shell bridge globals |
| `--overlay-rail-*` | **Forbidden** (removed) | — | Batch 34 → `--settings-overlay-left-*` on overlay `:host` |
| `--layout-sidebar-*` | **Forbidden** (removed) | — | Batch 33 → nav `:host` / `--sidebar-width-*` |
| `--settings-overlay-left-width`, `--settings-overlay-left-ratio`, … | **Allowed** | `settings-overlay.component.scss` `:host` | In-panel **rail column** geometry only |
| `.settings-overlay` `left` / `transform` | **Allowed** (positioning) | `settings-overlay.component.scss` `.settings-overlay` | Fixed pane offset; spacing + collapsed rail literal |
| `--sidebar-width-collapsed`, `--sidebar-width-expanded` | **Allowed** | `nav.component.scss` `app-nav` `:host` | Nav rail only; not visible to overlay sibling |
| `--spacing-*`, `--container-radius-*`, tweakcn `--primary`, … | **Allowed** | Global layers | Parent contract + [token-layers.md](./token-layers.md) |

---

## Settings overlay: two different “left” concepts

| Concern | Correct token / selector | Wrong guess |
| ------- | ------------------------ | ----------- |
| **Panel fixed position** (gap after nav rail) | `.settings-overlay` → `left: calc(var(--spacing-3) + (0.25rem * 12) + var(--spacing-3))` | `var(--shell-settings-overlay-left)` |
| **Left column width inside panel** | `var(--settings-overlay-left-width)` on rail flex child | `var(--overlay-rail-left-min)` (removed) |

After nav or spacing changes, re-verify overlay alignment per [settings-overlay.md](../specs/ui/settings-overlay/settings-overlay.md) § Wiring (fixed `left` + `transform`).

---

## Cross-sibling positioning (nav vs settings overlay)

Both mount under `AppComponent`. **`:host` vars do not cross siblings.**

**Corrected 2026-09-22.** This section described a duplicated `calc(0.25rem * 12)` literal in
settings-overlay as the shipped mechanism, and a shared variable as unscheduled future work. The
code does the opposite, and has for some time: it ships the shared variable, and that `calc` does
not appear in the repository. An agent following the old text would have written the wrong thing
into the one file this document exists to govern. Measured at `87385f2`; see
[STUDY-015](../study/015-shell-grid-layout-change-plan.md) § 13.2.

**What actually ships:** a global custom property, written imperatively from a feature component.

| Step | Where |
| ---- | ----- |
| `NavComponent` effect writes `--feldpost-sidebar-width` on `document.documentElement` (`3rem` collapsed / `15rem` expanded) | `apps/web/src/app/features/nav/nav.component.ts` |
| Settings overlay reads it back: `left: calc(var(--feldpost-sidebar-width, 15rem) + var(--spacing-3))` | `apps/web/src/app/features/settings-overlay/settings-overlay.component.scss` |
| The layout reserves matching space with a third copy of the literal, because the real rail is `position: fixed` and outside the flex row | `apps/web/src/app/layout/authenticated-app-layout.component.scss` |

`--feldpost-sidebar-width` is specced — [sidebar.collapse.supplement.md](../specs/component/workspace/sidebar.collapse.supplement.md),
[sidebar.md](../specs/component/workspace/sidebar.md), [nav-system.md](../specs/ui/nav/nav-system.md) —
so it is **not** an ad-hoc name. It is a legitimate mechanism with a real cost: one geometric fact
lives in three places and is synchronised at runtime through the document element.

- **Shipped:** `--feldpost-sidebar-width` on `document.documentElement`, written by `NavComponent`, read by settings-overlay.
- **Forbidden:** `--shell-settings-overlay-left` and any other `--shell-*` bridge without a spec row + ownership matrix. Unchanged.
- **Do not** add a fourth reader of the rail width. If you need the rail width somewhere new, that is a sign the geometry wants an owner — see below.
- **Planned replacement:** [STUDY-015](../study/015-shell-grid-layout-change-plan.md) proposes a CSS Grid shell whose host owns every track width, which removes the writer, the reader and the spacer together. `proposed`, not accepted — do not build against it yet.

---

## Verification

Shell-specific gates are included in the parent contract § Phase 7 verification. Run from repo root after shell SCSS edits — see [agent-css-variable-contract.md](./agent-css-variable-contract.md).
