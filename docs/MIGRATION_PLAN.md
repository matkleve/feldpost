# Feldpost → spartan/ui Migration Plan

## Status

- **Migration complete — Phase 4 cleanup done (2026-05-13)**
- **Current phase:** Phase 5 in progress — Group A (partial) + **Groups C, E, F, G done (2026-05-13)** — dialogs cleaned to `HLM_*` imports; badges/chips → `hlmBadge`; selects → `hlmSelect`; settings toggles → `hlmSwitch`. **Phase 6 in progress (2026-05-14)** — template `ui-*` removal + toggle unification; see [phase-6-template-cleanup.md](./migration/phase-6-template-cleanup.md) (old filename: [phase-6-hlm-directive-conversion.md](./migration/phase-6-hlm-directive-conversion.md) redirect). **Next (planned):** [Phase 11 — spec sync](./migration/phase-11-spec-sync.md) after Phases 6–7 (and ideally Phase 10) stabilize shipped UI.
- **Last updated:** 2026-05-14
- **Phase 3 complete — all planned molecules and organisms migrated** (within Phase 3 scope: Button ✅, Badge ✅, Input ✅, Label ✅, Card ✅, Select ✅, **Confirm dialog** ✅, **Text input dialog** ✅, **Project select dialog** ✅, **Share link audience dialog** ✅, **Projects confirm dialog** ✅, **DropdownShell** ✅ — local **`hlmMenuContent`** on host (`shared/ui/menu/`); prior `hlmPopover` on shell superseded for panel chrome; rename to `app-popover-shell` deferred)

---

## Where detail lives

| Resource | Link |
|----------|------|
| Decisions (dated table) | [decisions-log.md](./migration/decisions-log.md) |
| Open questions / blockers | [open-questions.md](./migration/open-questions.md) |
| Phase 5 wiring risks | [wiring-risks.md](./migration/wiring-risks.md) |

---

## Phases (index)

| Phase | Doc | Summary |
|-------|-----|---------|
| 0 — Discovery & Planning | [phase-0-discovery.md](./migration/phase-0-discovery.md) | Project setup, component inventory, shared DS table, gap analysis, token mapping, pattern → spartan mapping. **Done.** |
| 1 — Spec Cleanup | [phase-1-spec-cleanup.md](./migration/phase-1-spec-cleanup.md) | Primary/tokens spec, `tokens.md` updates, CDK overlay decision, spec contracts for primitives. **In progress** (checklist items remain). |
| 2 — Installation & Foundation | [phase-2-foundation.md](./migration/phase-2-foundation.md) | Tailwind v4, tweakcn variables, dark/sandstone themes, PostCSS JSON, baseline build. **Done.** |
| 3 — Components | [phase-3-components.md](./migration/phase-3-components.md) | Atoms/molecules/organisms: brain + local CVA shims, dialogs, menus shim, tabs, toggle-group, toasts partial. **Done** for planned Phase 3 scope. |
| 4 — Cleanup & Build | [phase-4-cleanup.md](./migration/phase-4-cleanup.md) | Hygiene, `design-system:check`, `ng build`, lint notes, deferred folder removals. **Done** (deferred items noted). |
| 5 — Callsite migration | [phase-5-callsite-migration.md](./migration/phase-5-callsite-migration.md) | Groups A–G, SCSS deletion, barrel removal, verification — **in progress**; Group D and final gates open. Full checklist + status in file. |
| 6 — Template BEM sweep & toggles | [phase-6-template-cleanup.md](./migration/phase-6-template-cleanup.md) | **In progress** — Zero `ui-*` in templates; `hlmToggleGroup` / `hlmToggleGroupItem`; toolbars → `hlmBtn`; delete `ui-primitives.directive.ts`. Redirect: [phase-6-hlm-directive-conversion.md](./migration/phase-6-hlm-directive-conversion.md). |
| 7 — Token system unification | [phase-7-token-migration.md](./migration/phase-7-token-migration.md) | **Planned** — Remove `tokens.scss` + legacy `var(--color-*|fp-*)` from component SCSS; tweakcn-only semantics. |
| 8 — Global SCSS elimination | [phase-8-global-scss-elimination.md](./migration/phase-8-global-scss-elimination.md) | **Planned** — Empty `styles/primitives/`; drop `hlm-toggle-group.scss`; minimal `styles.scss` `@use` set. |
| 9 — Spartan package upgrade | [phase-9-spartan-upgrade.md](./migration/phase-9-spartan-upgrade.md) | **Planned** — Swap local `shared/ui/*` shims for published `@spartan-ng/ui-*-helm` when Tailwind v4 peers unblock. |
| 10 — Visual QA & polish | [phase-10-visual-qa.md](./migration/phase-10-visual-qa.md) | **Planned** — Cross-theme / cross-screen verification; no new `::ng-deep`; budget-clean `ng build`. |
| 11 — Specification sync | [phase-11-spec-sync.md](./migration/phase-11-spec-sync.md) | **Planned** — Reconcile `docs/specs/` with shipped `hlm*` / tokens / selectors; `lint-specs` green. |

---

## Quick links by concern

- **Inventory & npm reality:** [phase-0-discovery.md](./migration/phase-0-discovery.md) (Component Inventory, Gap Analysis, Design Token Mapping, spartan/ui Mapping)
- **Execution checklists:** [phase-1-spec-cleanup.md](./migration/phase-1-spec-cleanup.md) through [phase-5-callsite-migration.md](./migration/phase-5-callsite-migration.md); legacy removal track [phase-6-template-cleanup.md](./migration/phase-6-template-cleanup.md) → [phase-10-visual-qa.md](./migration/phase-10-visual-qa.md) → [phase-11-spec-sync.md](./migration/phase-11-spec-sync.md)
- **Cross-phase risks (Phase 5):** [wiring-risks.md](./migration/wiring-risks.md)
