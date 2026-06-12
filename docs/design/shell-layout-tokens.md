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

- **Shipped:** duplicate the canonical collapsed-rail literal in settings-overlay (`calc(0.25rem * 12)` — same value as nav `--sidebar-width-collapsed`).
- **Forbidden:** `--shell-settings-overlay-left` without an `AppComponent` `:host` spec row.
- **Future (optional):** shared rail metrics on `AppComponent` `:host` — requires spec + matrix (not scheduled).

---

## Verification

Shell-specific gates are included in the parent contract § Phase 7 verification. Run from repo root after shell SCSS edits — see [agent-css-variable-contract.md](./agent-css-variable-contract.md).
