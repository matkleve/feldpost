# Phase 11 — Specification sync (post-migration drift)

**Status:** **Wave P1 — highest** ([migration README](./README.md#next-wave-post-recovery-queue--2026-05-18)) — **P1 drift checklist closed (2026-05-18)** — see **Recent shipped / doc drift** below  
**Depends on:** Phases 6–7 materially complete (templates + tokens). Phase 10 visual QA is optional but recommended as ground truth before large batch spec edits.

## Priority stack (post-recovery — 2026-05-18)

**P1 (this wave, highest):** Close every **`[ ]`** row below in **Recent shipped / doc drift** in top-to-bottom order unless a PR only touches a subtree — then complete adjacent bullets in the same PR. **Merge gate:** `node scripts/lint-specs.mjs` → **0**. **Index:** [migration README — Next wave](./README.md#next-wave-post-recovery-queue--2026-05-18).

## Recent shipped / doc drift (specs must reflect)

- [x] **Phase 7 Batch 39b — shadow ladder + Layer C vocabulary (docs)** — **`tokens.md`**, **`token-layers.md`**, and overlay/menu/toast/map specs state that **`--shadow-md|lg|xl`** are **tweakcn `:root`** (Batch 39 removed duplicate legacy-bridge defs); removed Layer C bridge names (**`--menu-surface-bg`**, **`--section-bg`**, **`--state-warning-bg`**, **`--state-danger-bg`**, **`--menu-item-bg-active`**, **`--action-border-active`**) are not documented as active **`:root`** bridge rows — [phase-7-token-migration.md](./phase-7-token-migration.md) §Batch 39b + Sandstone QA note (**2026-05-17**).
- [x] **Phase 7 Batch 45 — `--shadow-sm` / `--shadow-focus` off the bridge (docs)** — **`tokens.md`** / **`token-layers.md`** / migration proof: **`--shadow-sm`** and the old composite **`--shadow-focus`** were removed from the **historical** **`_legacy-design-tokens.scss`** bridge (file **no longer in `apps/web`** after Batch **50**); physical **`--shadow-*`** live on tweakcn **`styles.scss`**; dark “lift + ring” uses explicit **`var(--shadow-sm), var(--interactive-focus-ring)`** stacks at callsites (see **`tokens.md`** §3.5 *Focus stacks*) — [phase-7-token-migration.md](./phase-7-token-migration.md) §Batch 45.
- [x] **Legacy bridge inventory parity (stale “stub on disk” + Figma pipeline, 2026-05-18)** — **`apps/web/src/styles/_legacy-design-tokens.scss` absent**; aligned **`docs/specs/README.md`**, **`docs/specs/component/README.md`**, **`dropdown-system.md`**, **`file-type-chips.md`**, **`docs/skills/feldpost-component/SKILL.md`**, **`website-building-blocks-catalog.md`**, **`tokens.md`** §Figma Bridge, **`docs/design/README.md`**; **`sync-tokens.mjs`** fails fast. **Still open on touch:** normative **`var(--…)`** tables that resurrect removed **`--*`** bridge names (spot-check when editing specs).
- [x] **Phase 10 — automated migration smoke (2026-05-18)** — `node scripts/lint-specs.mjs`, `cd apps/web && npx ng build`, `npm run design-system:check`, legacy-path **`rg`**, and `npm run sync-tokens` fail-fast recorded in [reports/phase-10-migration-smoke-gates-2026-05-18.md](./reports/phase-10-migration-smoke-gates-2026-05-18.md) — manual tight smoke remains open in [phase-10-visual-qa.md](./phase-10-visual-qa.md).
- [x] **Map-shell / Leaflet** — Leaflet globals hoisted to **`_map-shell-leaflet-global.scss`** scoped under **`app-map-shell`** (Phase 8 Path A); update any spec paths or “global map CSS” language that still imply pre-hoist **`styles.scss`** placement.
- [x] **`hlmPillToggle` / toggle-group retirement** — global **`hlm-toggle-group.scss`** removed; **`hlmPillToggle`** + CVA; registry **`registry.primitives-and-layout.supplement.md`**; purge normative **`hlm-toggle-group`** / old toggle-group shim wiring from specs.
- [x] **Legacy bridge — Batches 33–35** — removed `:root` rows + call-site inlining across **`nav`**, **`settings-overlay`**, **`media-display`**, **`grouping-dropdown`**, **`toast-container`**, **`_map-shell-leaflet-global`**; **`tokens.md`**, **`token-layers.md`**, **`motion.md`**, phase-7 batch proofs — specs must not resurrect deleted **`--*`** as the active build contract. *(Shadow **`md|lg|xl`** + Batch 39 removed Layer C names: doc/spec alignment closed in **Batch 39b** checklist item above.)*
- [x] **Toast z-index** — **`--z-toast`** dropped (Batch 35); **`toast-container`** uses inline **`z-index: 400`** — **`toast-system.md`** / layer tables must match shipped stacking.
- [x] **Settings overlay rail** — **`--overlay-rail-left-*`** bridge removed (Batch 34); rail ratios/clamps inlined in **`settings-overlay.component.scss`** — **`settings-overlay.md`** (and dependents) must describe inlined behavior, not removed variables.
- [x] **Upload panel** — Spec hierarchy reconciled to shipped **`upload-panel__*`** BEM + **`hlmPillToggle`** / toggle group (**2026-05-18**); triage/audit refs: [upload-panel.feedback-triage.md](../specs/component/upload/upload-panel.feedback-triage.md), [upload panel design audit](./reports/upload-panel-design-audit-2026-05-17.md).
- [x] **Stacking narratives in specs** — Normative stacking language matches shipped owners: [`dropdown-system.md`](../specs/component/filters/dropdown-system.md#open-time-stacking-owner-normative) (shell host as open-time owner) and map **`app-map-shell`** hoist story; Phase 10 QA anchor: [Stacking sanity](./phase-10-visual-qa.md#stacking-sanity).

### 2026-05-18 post-wave (Batch 49 + parallel docs)

- **Batch 49 — `--action-*` off bridge:** **`--action-*`** were removed from the **historical** **`_legacy-design-tokens.scss`** bridge (file **absent** after Batch **50**); **`tokens.md`**, **`token-layers.md`**, and any spec normative **`var(--…)`** tables must **not** treat removed **`--action-*`** rows as the active **`:root`** bridge contract — callsite stacks use tweakcn / semantic vars (see parallel design-doc edits in the same wave).
- **Parallel specs + design sweeps:** Diff **`docs/specs/**`** and **`docs/design/**`** together with the bridge shrink so agent prompts do not resurrect deleted **`--*`** names; registry supplements and component specs (**dropdowns**, **settings-overlay**, **project cards**, **media-detail / metadata**) should match the shipped class + token vocabulary after this batch.
- **QA cross-link:** Run the four **2026-05-18** tight-smoke bullets in [Phase 10 — 2026-05-18 post-wave](./phase-10-visual-qa.md#2026-05-18-post-wave-batch-49-and-docs) when spec edits touch those surfaces.

## Goal

Bring every element spec under `docs/specs/` in line with the shipped Spartan / CVA migration: directive names (`hlm*`, Brain / `Brn*` primitives where applicable), token vocabulary (tweakcn semantic CSS variables instead of documenting legacy `--color-*` except where explicitly historical), deprecated `ui-*` and legacy primitive language, Ownership Matrix rows that point at real selectors/classes in the tree, and links to Phase 10 acceptance where visuals are normative.

## Pre-flight scan

From repository root (record counts + representative paths in a short baseline note before editing):

```bash
rg "\bui-" docs/specs
rg "--color-|tokens\.scss|primitive" docs/specs
rg "segmented-switch|segmented_switch" docs/specs
```

Re-run after substantive edits; attach deltas to the phase PR or decisions log if naming choices change.

## Work items

1. **Component and UI specs** — For each migrated component area in `apps/web`, confirm a matching spec exists under `docs/specs/component/` or `docs/specs/ui/`, and that Acceptance Criteria describe Spartan `hlm*` directives and Brain primitives only (no normative dependency on deleted `ui-*` class contracts).
2. **Service specs** — Update cross-references that still name old UI primitives or legacy token / file names so agents do not reintroduce removed paths.
3. **Registry** — `docs/specs/component/registry.md` is the **index**; catalog rows live in `docs/specs/component/registry.*.supplement.md`. Those tables document local `hlm*` / helm shims versus future published `@spartan-ng/ui-*-helm` (see [phase-9-spartan-upgrade.md](./phase-9-spartan-upgrade.md)) so ownership of “where the directive lives” stays explicit.
4. **Lint gate** — Run `node scripts/lint-specs.mjs` and fix regressions before merge.

## Acceptance

- No normative spec text that depends on deleted primitives (for example `container.scss`, `row-shell`) unless clearly marked **historical** with a footnote pointing at the Phase 11 archive or migration doc that superseded it — never as the active build contract.
- `node scripts/lint-specs.mjs` exits **0**.

## Definition of done

- Acceptance bullets satisfied.
- Any glossary or registry drift fixed in the same session as the spec edits that caused it (repository `AGENTS.md` / `docs/AGENTS.md` cross-links remain accurate).
