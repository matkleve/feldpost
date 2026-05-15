# Feldpost → spartan/ui migration

Canonical **index and status** for the Angular + Spartan (`hlm*` / `brn*`) + Tailwind migration. Per-phase checklists and decisions live in the linked files below — do not duplicate long status blocks here and in phase docs.

## Status (summary)

- **Phase 4** cleanup done (2026-05-13).
- **Phase 5** in progress — Groups A–C, E–G done; **Group D** (dropdowns / BrnMenu) and final barrel cleanup open. See [phase-5-callsite-migration.md](./phase-5-callsite-migration.md).
- **Phase 6** in progress — template `ui-*` removal, toggles; see [phase-6-template-cleanup.md](./phase-6-template-cleanup.md).
- **Next (planned):** [Phase 7 — token migration](./phase-7-token-migration.md), then 8–11 per table below.
- **Last updated:** 2026-05-15 (index moved from `docs/MIGRATION_PLAN.md`).

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
| 5 — Callsite migration | [phase-5-callsite-migration.md](./phase-5-callsite-migration.md) | Groups A–G, SCSS deletion, barrel removal, verification — **in progress**; Group D and final gates open. |
| 6 — Template BEM sweep & toggles | [phase-6-template-cleanup.md](./phase-6-template-cleanup.md) | **In progress** — zero `ui-*` in templates; `hlmToggleGroup` / `hlmToggleGroupItem`; toolbars → `hlmBtn`; delete `ui-primitives.directive.ts` when unused. Redirect: [phase-6-hlm-directive-conversion.md](./phase-6-hlm-directive-conversion.md). |
| 7 — Token system unification | [phase-7-token-migration.md](./phase-7-token-migration.md) | **Planned** — remove `tokens.scss` + legacy `var(--color-*\|fp-*)` from component SCSS; tweakcn-only semantics. |
| 8 — Global SCSS elimination | [phase-8-global-scss-elimination.md](./phase-8-global-scss-elimination.md) | **Planned** — empty `styles/primitives/`; drop `hlm-toggle-group.scss`; minimal `styles.scss` `@use` set. |
| 9 — Spartan package upgrade | [phase-9-spartan-upgrade.md](./phase-9-spartan-upgrade.md) | **Planned** — swap local `shared/ui/*` shims for published `@spartan-ng/ui-*-helm` when Tailwind v4 peers unblock. |
| 10 — Visual QA & polish | [phase-10-visual-qa.md](./phase-10-visual-qa.md) | **Planned** — cross-theme / cross-screen verification; no new `::ng-deep`; budget-clean `ng build`. |
| 11 — Specification sync | [phase-11-spec-sync.md](./phase-11-spec-sync.md) | **Planned** — reconcile `docs/specs/` with shipped `hlm*` / tokens / selectors; `lint-specs` green. |

---

## Quick links by concern

- **Inventory & npm reality:** [phase-0-discovery.md](./phase-0-discovery.md)
- **Execution checklists:** [phase-1-spec-cleanup.md](./phase-1-spec-cleanup.md) through [phase-5-callsite-migration.md](./phase-5-callsite-migration.md); legacy removal track [phase-6-template-cleanup.md](./phase-6-template-cleanup.md) → [phase-10-visual-qa.md](./phase-10-visual-qa.md) → [phase-11-spec-sync.md](./phase-11-spec-sync.md)
- **Cross-phase risks (Phase 5):** [wiring-risks.md](./wiring-risks.md)

---

## Legacy entry path

[`docs/MIGRATION_PLAN.md`](../MIGRATION_PLAN.md) is a **short stub** only; it exists so older bookmarks and `@see docs/MIGRATION_PLAN.md` comments still resolve. **Update status in this file (`docs/migration/README.md`)** when the migration snapshot changes.
