# Feldpost → spartan/ui migration

Canonical **index and status** for the Angular + Spartan (`hlm*` / `brn*`) + Tailwind migration. Per-phase checklists and decisions live in the linked files below — do not duplicate long status blocks here and in phase docs.

**Agents — parallel streams:** [AGENTS.md — Multi-agent coordination (migration)](../../AGENTS.md#multi-agent-coordination-migration) (how to split independent migration work across agents; **no duplicate “next” list**—use this README’s Status + phase docs as the queue).

## Status (summary)

**Phase 6 — Done (2026-05-17)** per [phase-6-template-cleanup.md](./phase-6-template-cleanup.md): template BEM sweep + toggle/toolbar acceptance met; remaining `\bui-` in HTML is **comment-only** (`@see …/ui-primitives/…` paths). Closure verification (gates, build, design-system check) is in that doc §Closure verification; follow-ups stay in Phases 7–8 and 10 as scoped there.

- **Phase 4** cleanup done (2026-05-13).
- **Phase 5** — **Groups A–G + Group D done (2026-05-16).** **`ui-primitives.directive.ts`** and **`UiDropdownTriggerDirective`** / primitive **`dropdown-trigger.scss`** removed; toolbar triggers use **`hlmBtn`**. See [phase-5-callsite-migration.md](./phase-5-callsite-migration.md).
- **Next:** [Phase 7 — token migration](./phase-7-token-migration.md) **in progress** — **Batch 26** confirmed **0** deprecated font-size alias **`var()`** under **`apps/web`**; bridge still carries **motion**, **layout/overlay** tokens, **semantic surface** aliases (`--action-*`, `--menu-*`, …), and the **single** modular **`--font-size-*`** ladder (no removed **`LEGACY MAPPING`** font block). Remaining Phase 7: shrink **non–font-size** bridge + **§Risks** follow-ups. Then Phases 8–11.
- **Last updated:** 2026-05-17 — Phase **6** closed; Phase **7** **Batch 26** (post–font **`LEGACY MAPPING`** rg audit + doc sync); **Batch 25** (font alias block removed); Phase 5 Group D; [tokens.md §3.1a — Phase 7 handoff](../design/tokens.md#phase-7-handoff--deferred-md3-rows-tweakcn).

**Doc-only (2026-05-17):** Toolbar anchored UI audits and spec/code reconciliation are under [`docs/migration/reports/`](./reports/) — [deep analysis](./reports/dropdown-deep-analysis-2026-05-17.md) (entry point) and [structure audit](./reports/dropdown-component-structure-audit-2026-05-17.md); parallel documentation track, not a Phase 7 token batch (see [phase-7-token-migration.md](./phase-7-token-migration.md)).

---

## Where detail lives

| Resource | Link |
|----------|------|
| Decisions (dated table) | [decisions-log.md](./decisions-log.md) |
| Open questions / blockers | [open-questions.md](./open-questions.md) |
| Phase 5 wiring risks | [wiring-risks.md](./wiring-risks.md) |

---

## Phases (index)

| Phase | Doc | Summary |
|-------|-----|---------|
| 0 — Discovery & Planning | [phase-0-discovery.md](./phase-0-discovery.md) | Project setup, component inventory, shared DS table, gap analysis, token mapping, pattern → spartan mapping. **Done.** |
| 1 — Spec Cleanup | [phase-1-spec-cleanup.md](./phase-1-spec-cleanup.md) | Primary/tokens spec, `tokens.md` updates, CDK overlay decision, spec contracts for primitives. **In progress** (checklist items remain). |
| 2 — Installation & Foundation | [phase-2-foundation.md](./phase-2-foundation.md) | Tailwind v4, tweakcn variables, dark/sandstone themes, PostCSS JSON, baseline build. **Done.** |
| 3 — Components | [phase-3-components.md](./phase-3-components.md) | Atoms/molecules/organisms: brain + local CVA shims, dialogs, menus shim, tabs, toggle-group, toasts partial. **Done** for planned Phase 3 scope. |
| 4 — Cleanup & Build | [phase-4-cleanup.md](./phase-4-cleanup.md) | Hygiene, `design-system:check`, `ng build`, lint notes, deferred folder removals. **Done** (deferred items noted). |
| 5 — Callsite migration | [phase-5-callsite-migration.md](./phase-5-callsite-migration.md) | Groups A–G + **Group D (2026-05-16)** complete; **`ui-primitives.directive.ts`** + **`ui-dropdown-trigger.directive.ts`** removed. |
| 6 — Template BEM sweep & toggles | [phase-6-template-cleanup.md](./phase-6-template-cleanup.md) | **Done (2026-05-17)** — Matches phase-6 status: gates A/B + closure verification (`ng build`, design-system check); `\bui-` residual comment-only. Redirect: [phase-6-hlm-directive-conversion.md](./phase-6-hlm-directive-conversion.md). |
| 7 — Token system unification | [phase-7-token-migration.md](./phase-7-token-migration.md) | **In progress (2026-05-17)** — **`LEGACY MAPPING`** font-size aliases **removed (Batch 25)**; **Batch 26** rg/doc pass (no alias stragglers). Modular **`var(--font-size-*)`** + motion/layout/semantic rows remain in **`_legacy-design-tokens.scss`**. Prior batches **1–5b**, **6**, **12**–**24** in phase-7 doc. Open: **13** (**§4 `hlm-toggle-group` / CVA**). **§Risks** (`dark:` vs semantic system dark). |
| 8 — Global SCSS elimination | [phase-8-global-scss-elimination.md](./phase-8-global-scss-elimination.md) | **Planned** — empty `styles/primitives/`; drop `hlm-toggle-group.scss`; minimal `styles.scss` `@use` set. **While bridge remains:** deferred MD3 context — [tokens.md §3.1a — Phase 7 handoff](../design/tokens.md#phase-7-handoff--deferred-md3-rows-tweakcn). |
| 9 — Spartan package upgrade | [phase-9-spartan-upgrade.md](./phase-9-spartan-upgrade.md) | **Planned** — swap local `shared/ui/*` shims for published `@spartan-ng/ui-*-helm` when Tailwind v4 peers unblock. |
| 10 — Visual QA & polish | [phase-10-visual-qa.md](./phase-10-visual-qa.md) | **Planned** — cross-theme / cross-screen verification; no new `::ng-deep`; budget-clean `ng build`. |
| 11 — Specification sync | [phase-11-spec-sync.md](./phase-11-spec-sync.md) | **Planned** — reconcile `docs/specs/` with shipped `hlm*` / tokens / selectors; `lint-specs` green. |

---

## Quick links by concern

- **Shared UI reuse (selectors / variants):** [registry.md](../specs/component/registry.md) (index) + `registry.*.supplement.md` in the same folder
- **Inventory & npm reality:** [phase-0-discovery.md](./phase-0-discovery.md)
- **Execution checklists:** [phase-1-spec-cleanup.md](./phase-1-spec-cleanup.md) through [phase-5-callsite-migration.md](./phase-5-callsite-migration.md); legacy removal track [phase-6-template-cleanup.md](./phase-6-template-cleanup.md) → [phase-10-visual-qa.md](./phase-10-visual-qa.md) → [phase-11-spec-sync.md](./phase-11-spec-sync.md)
- **Cross-phase risks (Phase 5):** [wiring-risks.md](./wiring-risks.md)

---

## Anchored UI (toolbar menus)

Workspace and feature toolbars expose **Projects**, **Filter**, **Sort**, and **Grouping** as anchored patterns: a closed control opens a list of choices. Treat spacing and naming as a cross-cutting concern across those callsites.

**Naming (docs & tickets):** Prefer **toolbar menu** and **menu panel**; **“dropdown”** is informal shorthand. **Popover** is a **library primitive** name (Radix / shadcn stack), not required product vocabulary—use it when discussing the implementation primitive only. Canonical terms: [glossary.md § Toolbar menus & naming](../glossary.md#toolbar-menus--naming).

**Padding ownership (lesson learned):** Fixes must account for **two layers**: **(1) the closed trigger**—`hlmBtn` plus `*__menu-trigger` or `sorting-controls__btn` (trigger `padding-inline`); **(2) the open panel**—`StandardDropdown`, `hlmMenuContent`, and the scrollable list (panel insets / `--std-dropdown-padding-inline`). Visual QA prompts and bug reports should mention **both** when spacing looks wrong.

**Regression checklist (quick scan):**

- Trigger: `padding-inline` on the menu trigger (closed state).
- Panel: `--std-dropdown-padding-inline` (or equivalent content inset).
- Panel: `scrollbar-gutter` stable when lists scroll.
- Rows: `px-*` alignment between empty-state rows and list rows.

**Interaction inventory (single source):** [dropdown-system.md — Toolbar menu panels (anchored UI)](../specs/component/filters/dropdown-system.md#toolbar-menu-panels-anchored-ui) (search / reset / footer / scrollbar gutter / min-width policy / `hlmMenuItem`).

---

## Legacy entry path

[`docs/MIGRATION_PLAN.md`](../MIGRATION_PLAN.md) is a **short stub** only; it exists so older bookmarks and `@see docs/MIGRATION_PLAN.md` comments still resolve. **Update status in this file (`docs/migration/README.md`)** when the migration snapshot changes.
