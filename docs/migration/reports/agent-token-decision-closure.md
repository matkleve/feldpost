# Agent token decision closure (2026-05-19)

**Purpose:** Single status line for humans and agents on **token choice** (all layers) vs **layout geometry** work. Complements [legacy-token-deletion-status-2026-05-19.md](./legacy-token-deletion-status-2026-05-19.md) (bridge file deletion).

**Parent contract (all layers):** [agent-css-variable-contract.md](../../design/agent-css-variable-contract.md) — **MUST-read before any `apps/web` SCSS `var(--*)` edit.**

**Shell subsection:** [shell-layout-tokens.md](../../design/shell-layout-tokens.md) (forbidden/allowed shell names only; links parent).

---

## Executive status

| Workstream | Status | Agent rule |
| ---------- | ------ | ---------- |
| **Global contract** (decision tree, deleted names, Phase 7 `rg` gates) | **Normative 2026-05-19** | Read [agent-css-variable-contract.md](../../design/agent-css-variable-contract.md) **first** for every token edit |
| **Bridge tokens** (`_legacy-design-tokens.scss`, `--overlay-rail-*`, `--layout-sidebar-*`, `var(--color-*)` in app SCSS, `var(--fp-*)`) | **Done — Phase 7 (2026-05-19)** | Do not reintroduce bridge paths or removed names |
| **Layer A** (tweakcn `styles.scss`, `_typography-baseline.scss`, `@theme` `--color-*` / `--radius-*`) | **Canonical** | Pick layer per parent contract; no new ad-hoc `:root` aliases |
| **Layer C** (component `:host` vars per spec) | **Canonical on edit** | Name must appear in element spec; cite [token-layers.md](../../design/token-layers.md) |
| **Layout / shell local vars** (`--settings-overlay-*`, `--sidebar-width-*`, authenticated layout selectors) | **Rules effective 2026-05-19** — owner matrix in `workspace-pane.md`; geometry audits use handoff §3 | [shell-layout-tokens.md](../../design/shell-layout-tokens.md) + handoff §10; **no `--shell-*`** without spec row |
| **Ad-hoc `--shell-settings-overlay-left`** (reported agent confusion) | **Never shipped** — live `rg '--shell-' apps/web --glob '*.scss'` → **0** | Use `.settings-overlay` `left` + `--settings-overlay-left-width` per settings-overlay spec |

---

## Closure milestones

1. **Phase 7 Done** — Legacy global bridge absent; Batch 34 moved overlay **rail** metrics to `settings-overlay` `:host`; Batch 33 moved sidebar metrics to `nav` `:host`.
2. **2026-05-19 — Global agent CSS variable contract shipped** — [agent-css-variable-contract.md](../../design/agent-css-variable-contract.md); [shell-layout-tokens.md](../../design/shell-layout-tokens.md) (subsection); handoff [§10](./agent-handoff-authenticated-shell-layout-ownership.md#10-token-decision-rules-agents); this report + [migration README](../README.md) + root [AGENTS.md](../../../AGENTS.md#multi-agent-coordination-migration).
3. **Phase 10 (P4)** — Browser verification: settings overlay open/close, nav collapsed width, overlay `left` alignment (matrix row in [phase-10-visual-qa.md](../phase-10-visual-qa.md)).
4. **Optional future** — Shared `AppComponent` `:host` rail metric vars if product wants to dedupe `calc(0.25rem * 12)` between nav and settings-overlay; requires spec row in `settings-overlay.md` + geometry matrix (not scheduled).

**“Agent token improvisation” closes when:** agents use the parent decision tree (Phase 7 `rg` gates stay **0**) and Phase 10 signs off overlay/nav alignment.

---

## MUST-read before SCSS token edits

| Read first | When |
| ---------- | ---- |
| [docs/design/agent-css-variable-contract.md](../../design/agent-css-variable-contract.md) | **Any** `var(--*)` / token edit in `apps/web` |
| [docs/design/shell-layout-tokens.md](../../design/shell-layout-tokens.md) | Nav, settings overlay, authenticated layout, or “shell” positioning SCSS |
| [docs/design/token-layers.md](../../design/token-layers.md) | Global primitives, removed bridge names, Layer A/B/C |
| [docs/specs/ui/settings-overlay/settings-overlay.md](../../specs/ui/settings-overlay/settings-overlay.md) | Settings overlay geometry or rail |
| [docs/specs/ui/workspace/workspace-pane.md](../../specs/ui/workspace/workspace-pane.md) § Authenticated shell geometry ownership | Main column, map fill, layout host |
| [docs/migration/reports/agent-handoff-authenticated-shell-layout-ownership.md](./agent-handoff-authenticated-shell-layout-ownership.md) | Shell height chain / duplicate geometry audit |
| [docs/migration/reports/legacy-token-deletion-status-2026-05-19.md](./legacy-token-deletion-status-2026-05-19.md) | Bridge deletion truth vs Tailwind alias remainder |

---

## Related

- [phase-7-token-migration.md](../phase-7-token-migration.md) § Batch 33–34, § Closure verification
- [phase-11-spec-sync.md](../phase-11-spec-sync.md) — spec parity on edit
