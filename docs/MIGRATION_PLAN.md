# Feldpost → spartan/ui Migration Plan

## Status

- **Migration complete — Phase 4 cleanup done (2026-05-13)**
- **Current phase:** Phase 5 in progress — Group A (partial) + **Groups C, E, F, G done (2026-05-13)** — dialogs cleaned to `HLM_*` imports; badges/chips → `hlmBadge`; selects → `hlmSelect`; settings toggles → `hlmSwitch`
- **Last updated:** 2026-05-13
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
| 6 — HLM directive conversion | [phase-6-hlm-directive-conversion.md](./migration/phase-6-hlm-directive-conversion.md) | Move atom visuals to host/CVA + Tailwind; drop companion SCSS. **Planning.** |

---

## Quick links by concern

- **Inventory & npm reality:** [phase-0-discovery.md](./migration/phase-0-discovery.md) (Component Inventory, Gap Analysis, Design Token Mapping, spartan/ui Mapping)
- **Execution checklists:** [phase-1-spec-cleanup.md](./migration/phase-1-spec-cleanup.md) through [phase-5-callsite-migration.md](./migration/phase-5-callsite-migration.md)
- **Cross-phase risks (Phase 5):** [wiring-risks.md](./migration/wiring-risks.md)
