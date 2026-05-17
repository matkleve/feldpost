# Feldpost → spartan/ui migration

Canonical **index and status** for the Angular + Spartan (`hlm*` / `brn*`) + Tailwind migration. Per-phase checklists and decisions live in the linked files below — do not duplicate long status blocks here and in phase docs.

**Agents — parallel streams:** [AGENTS.md — Multi-agent coordination (migration)](../../AGENTS.md#multi-agent-coordination-migration) (how to split independent migration work across agents; **no duplicate “next” list**—use this README’s Status + phase docs as the queue).

## Status (summary)

**Phase 6 — Done (2026-05-17)** per [phase-6-template-cleanup.md](./phase-6-template-cleanup.md): template BEM sweep + toggle/toolbar acceptance met; remaining `\bui-` in HTML is **comment-only** (`@see …/ui-primitives/…` paths). Closure verification (gates, build, design-system check) is in that doc §Closure verification; follow-ups stay in Phases 7–8 and 10 as scoped there.

- **Phase 4** cleanup done (2026-05-13).
- **Phase 5** — **Groups A–G + Group D done (2026-05-16).** **`ui-primitives.directive.ts`** and **`UiDropdownTriggerDirective`** / primitive **`dropdown-trigger.scss`** removed; toolbar triggers use **`hlmBtn`**. See [phase-5-callsite-migration.md](./phase-5-callsite-migration.md).
- **Next:** [Phase 7 — token migration](./phase-7-token-migration.md) **in progress** — **Batch 36** removed **seven** `:root` rows (**`--radius-xl`**, **`--border-selected`**, **`--interactive-border-muted`**, **`--interactive-surface-hover`**, **`--line-height-open`**, **`--motion-duration-base`**, **`--motion-ease-standard`**) — inlining into **`media-item`**, **`settings-overlay`**, **`_map-shell-context-menu`**, **`upload-panel`**, **`search-bar`**, **`projects-toolbar`**, **`workspace-pane-shell`**, **`panel-trigger`** + internal bridge rewires + **`tokens.md`** (proof §Batch 36). **Batch 35** removed **seven** `:root` rows (**`--overlay-width-medium-min`**, **`--overlay-width-large-min`**, **`--photo-marker-hit-size`**, **`--photo-marker-correction-dot-size`**, **`--photo-marker-selected-scale`**, **`--elevation-modal`**, **`--z-toast`**) — inlining into **`settings-overlay`**, **`_map-shell-leaflet-global`**, **`grouping-dropdown`**, **`toast-container`** + **`tokens.md`** / **`token-layers.md`** / **`toast-system.md`** (proof §Batch 35). **Batch 34** removed **seven** `:root` **`--overlay-rail-left-*`** rows (**`settings-overlay.component.scss`** inlines ratios and clamp bounds; proof §Batch 34). **Visual QA (high-risk merges):** compact spot-check → [phase-10 — High-risk migration spot-check](./phase-10-visual-qa.md#high-risk-migration-spot-check). **Batch 33** removed **nine** bridge rows (**seven** **`--layout-sidebar-*`**, **`--transition-reveal-delay`**, **`--font-size-3xl`**) — inlining into **`nav`**, **`settings-overlay`**, **`media-display`** + ladder fix; **`tokens.md`**, **`motion.md`**, **`media-display` / `project-item` specs**, **`feldpost-component` SKILL** (see phase-7 §Batch 33). **Batch 32** inlined six single-use bridge tokens (**`--z-map`**, **`--content-clamp-text`**, **`--font-weight-regular`**, **`--line-height-relaxed`**, **`--photo-marker-cluster-font-size`**, **`--layout-sidebar-icon-size`**) then dropped their **`_legacy-design-tokens.scss`** rows (see phase-7 §Batch 32; **`tokens.md`** + layout design docs). **Batch 31** removed **eight** bridge-only / unused Layer C rows (**`--section-border`**, **`--font-size-ratio`**, **`--spacing-unit`**, **`--ui-item-media-size-default`**, **`--shadow-focus-ring`**, **`--motion-ease-in`**, **`--transition-interactive`**, **`--transition-emphasis`**) with internal inlining + dark **`--interactive-focus-ring`** / **`--shadow-focus`**; design docs **`tokens.md`**, **`token-layers.md`**, **`motion.md`**, **`state-visuals.md`** + marker/drag-divider/FSM spec tables (see phase-7 §Batch 31). **Batch 30** removed eight zero-consumer bridge tokens (**`--line-height-dense`**, **`--radius-md-plus`**, **`--radius-lg-plus`**, **`--transition-panel`**, **`--container-radius-pill`**, **`--state-success-bg`**, **`--state-info-bg`**, **`--section-title`**) plus sandstone overrides; **`docs/design/tokens.md`** / **`token-layers.md`** / **`motion.md`** synced (see phase-7 §Batch 29 for prior **`--action-*`** cleanup; §Batch 28 metric **`--border-sm`…`--border-xl`**). Bridge still carries **motion primitives**, **active layout**, **`--border-hover` / `--border-selected`**, remaining **semantic** aliases, and the modular **`--font-size-*`** ladder. Remaining Phase 7: shrink **still-used** bridge where call sites migrate to tweakcn/Tailwind; **§Risks** follow-ups. Then Phases 8–11.
- **Last updated:** 2026-05-17 — Phase **6** closed; Phase **7** **Batch 36** (seven bridge rows — **`--radius-xl`**, **`--border-selected`**, **`--interactive-border-muted`**, **`--interactive-surface-hover`**, **`--line-height-open`**, **`--motion-duration-base`**, **`--motion-ease-standard`** + **`tokens.md`** §3.5/§3.6); **Batch 35** (seven bridge rows — overlay mins, photo-marker literals, **`--elevation-modal`** → **`var(--shadow-xl)`**, **`--z-toast`** → **`400`** + doc sync); **Batch 34** (seven **`--overlay-rail-left-*`** bridge rows + settings overlay inlining + phase-7 / README); **Batch 33** (nine bridge rows — sidebar aliases, **`--transition-reveal-delay`**, **`--font-size-3xl`** + doc/spec sync); **Batch 32** (six single-consumer bridge rows + **`tokens.md`** / layout design docs); **Batch 31** (bridge indirection + **`--section-border`** removal + doc/spec sync, including item-grid FSM choreography, phase-8 focus-ring prose, **`feldpost-component` SKILL**); **Batch 30**; **Batch 29** (**`--action-bg-active`** / **`--action-border-default`**); **Batch 28** (metric border scale removal + **`tokens.md`** §3.5); **Batch 27** (legacy bridge shrink + design doc sync); **Batch 26** (post–font **`LEGACY MAPPING`** rg audit); **Batch 25** (font alias block removed); Phase 5 Group D; **Phase 8 Path A** (map-shell Leaflet → **`_map-shell-leaflet-global.scss`** / **`app-map-shell`** scope — [phase-8 §7](./phase-8-global-scss-elimination.md#7-inventory-remaining-styles-tree)); [tokens.md §3.1a — Phase 7 handoff](../design/tokens.md#phase-7-handoff--deferred-md3-rows-tweakcn). **Phase 11 + spec gate:** [phase-11-spec-sync.md](./phase-11-spec-sync.md) — run **`node scripts/lint-specs.mjs`** (exit **0**) before merging spec drift work.

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
| 7 — Token system unification | [phase-7-token-migration.md](./phase-7-token-migration.md) | **In progress (2026-05-17)** — **`LEGACY MAPPING`** font-size aliases **removed (Batch 25)**; **Batch 36** removed **seven** `:root` rows (**`--radius-xl`**, **`--border-selected`**, **`--interactive-border-muted`**, **`--interactive-surface-hover`**, **`--line-height-open`**, **`--motion-duration-base`**, **`--motion-ease-standard`**) + **`tokens.md`** §3.5/§3.6 (see phase-7 §Batch 36). **Batch 35** removed **seven** `:root` rows (**overlay min widths**, **three** photo-marker metrics, **`--elevation-modal`**, **`--z-toast`**) + **`tokens.md`** / **`token-layers.md`** / **`toast-system.md`** (see phase-7 §Batch 35). **Batch 34** removed **seven** **`--overlay-rail-left-*`** `:root` rows (**`settings-overlay.component.scss`** inlines — proof §Batch 34). **Batch 33** removed **nine** bridge rows (**seven** **`--layout-sidebar-*`**, **`--transition-reveal-delay`**, **`--font-size-3xl`**) + **`tokens.md`** / **`motion.md`** / **`media-display` / `project-item` specs** / **`feldpost-component` SKILL** (see phase-7 §Batch 33). **Batch 32** removed **six** single-consumer bridge rows (**`--z-map`**, **`--content-clamp-text`**, **`--font-weight-regular`**, **`--line-height-relaxed`**, **`--photo-marker-cluster-font-size`**, **`--layout-sidebar-icon-size`**) + **`tokens.md`** / layout design docs (see phase-7 §Batch 32). **Batch 31** removed **eight** bridge-only / unused Layer C rows (**`--section-border`**, **`--font-size-ratio`**, **`--spacing-unit`**, **`--ui-item-media-size-default`**, **`--shadow-focus-ring`**, **`--motion-ease-in`**, **`--transition-interactive`**, **`--transition-emphasis`**) + doc/spec sync (see phase-7 §Batch 31). **Batch 30** eight zero-consumer rows + sandstone. **Batch 29** **`--action-bg-active`** / **`--action-border-default`**. **Batch 28** unused metric **`--border-sm`…`--border-xl`**. **Batch 27** dead bridge row removal. **Batch 26** rg/doc pass. Modular **`var(--font-size-*)`** (no **`--font-size-3xl`** on `:root` after Batch 33 — use **`calc(var(--font-size-2xl) * 1.13)`**) + motion/layout/semantic rows remain in **`_legacy-design-tokens.scss`**. Prior batches **1–5b**, **6**, **12**–**24** in phase-7 doc. Open: **13** (**§4 `hlm-toggle-group` / CVA**). **§Risks** (`dark:` vs semantic system dark). |
| 8 — Global SCSS elimination | [phase-8-global-scss-elimination.md](./phase-8-global-scss-elimination.md) | **In progress (2026-05-17)** — `styles/primitives/` gone; **Path A shipped** (map-shell Leaflet → **`_map-shell-leaflet-global.scss`** / **`app-map-shell`**). **§6 complete** (global **`hlm-toggle-group.scss`** removed; **`hlmPillToggle`** + CVA; registry: **`registry.primitives-and-layout.supplement.md`** — toggle-group shims). **Next:** §7 remaining **`styles.scss`** **`@use`** / **`load-css`** inventory + **`styles`** chunk monitoring; §8 final gates. **While bridge remains:** [tokens.md §3.1a — Phase 7 handoff](../design/tokens.md#phase-7-handoff--deferred-md3-rows-tweakcn). |
| 9 — Spartan package upgrade | [phase-9-spartan-upgrade.md](./phase-9-spartan-upgrade.md) | **Planned** — swap local `shared/ui/*` shims for published `@spartan-ng/ui-*-helm` when Tailwind v4 peers unblock. |
| 10 — Visual QA & polish | [phase-10-visual-qa.md](./phase-10-visual-qa.md) | **Planned** — cross-theme / cross-screen verification; no new `::ng-deep`; budget-clean `ng build`. |
| 11 — Specification sync | [phase-11-spec-sync.md](./phase-11-spec-sync.md) | **In progress (2026-05-17)** — drift checklist in doc; merge gate **`node scripts/lint-specs.mjs`** exit **0**. |

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
