# Migration explicit progress analysis (2026-05-18)

## Executive truth

The heavy **code** migration tracks (template BEM, legacy token bridge, `::ng-deep` in app SCSS, Phase 11 spec drift checklist) are largely **shipped** or **closed** with grep/build-level proof in phase docs. What remains is disproportionately **human-in-the-loop** and **policy**: three-path theme QA, interactive visual matrix sign-off, `styles` bundle monitoring, dead-selector hygiene on touch, product decisions on brand primary, and a **Wave P5** spec inventory audit. README **%** rows are **doc-derived rollups** (ambiguous ⇒ round down); finishing large doc or automation slices can leave **78% / 76% / 18%** unchanged until a phase author updates the integer after explicit checklist movement. Phase **9** is **blocked upstream** (Spartan helm + Tailwind v4 peers), not “forgotten work.”

## README % vs reality

- **Rule (from migration index):** Integers come from each phase doc’s **Status**, checklists, acceptance rows, and called-out blockers; **ambiguous ⇒ round down** (`docs/migration/README.md` — **% (progress)** paragraph).
- **Not effort-weighted:** A day of careful manual QA or a product workshop does **not** automatically change **%**; only **documented** checklist/state updates in the owning phase file do. Conversely, **hours** of token batch work can **stop moving** the headline **%** once the bridge is gone and remaining work is **manual QA + parity on edit** (Phase 7) or **browser matrix** (Phase 10), which the README already calls schedule risk, not unknown debt.

## Per-phase explicit matrix

| Phase | README % | Track A (name from phase doc) | Status | Evidence |
|-------|----------|-------------------------------|--------|----------|
| 0 | 100 | Discovery & Planning | Done | `docs/migration/phase-0-discovery.md` — **Status:** Done |
| 1 | 22 | Spec Cleanup — umbrella / brand-primary | Blocked (product) | `docs/migration/phase-1-spec-cleanup.md` L9–L10 — **needs product decision**; umbrella checkbox open |
| 1 | 22 | Spec Cleanup — Wave P5 primitive-contract inventory | Open | `docs/migration/phase-1-spec-cleanup.md` §**Wave P5** — audit-only table; README **P5** queue |
| 2 | 100 | Installation & Foundation | Done | `docs/migration/phase-2-foundation.md` — **Status:** Done |
| 3 | 92 | Component Migration (planned scope) | Done | `docs/migration/phase-3-components.md` — **Status:** Done; README row notes deferred SCSS/barrel items elsewhere |
| 4 | 88 | Cleanup & Build Verification | Done | `docs/migration/phase-4-cleanup.md` — **Status:** Done; deferred folder rows explicitly **deferred** |
| 5 | 88 | Callsite Migration & Legacy Removal | Open | `docs/migration/phase-5-callsite-migration.md` — **Status:** In Progress; **legacy alias / `tokens.scss` removal still open** |
| 6 | 100 | Template BEM sweep & toggles | Done | `docs/migration/phase-6-template-cleanup.md` — **Done (2026-05-17)** |
| 7 | 78 | Token system — legacy bridge retired | Done | `rg 'legacy-design-tokens\|_legacy-design-tokens' apps/web` → **no matches** (exit **1** = zero hits); `docs/migration/phase-7-token-migration.md` opening **Status** |
| 7 | 78 | Token system — Wave P2 (doc + automated gate table) | Done | `docs/migration/phase-7-token-migration.md` — **Wave P2 (2026-05-18): Shipped** + §**Wave P2 closeout** |
| 7 | 78 | Token system — §Risks / three-path manual theme QA | Open | `docs/migration/phase-7-token-migration.md` §**Risks / QA** — manual; routed to Phase 10 in phase-7 **Status** |
| 7 | 78 | Token system — edit-time spec / `tokens.md` parity | Open | `docs/migration/phase-7-token-migration.md` — **Token / consumer + doc parity** — ongoing when editing |
| 8 | 76 | Global SCSS — §7 `styles/` tree inventory | Done | `docs/migration/phase-8-global-scss-elimination.md` §**7. Inventory** — **seven** partials; `find apps/web/src/styles -name '*.scss' \| wc -l` → **7** |
| 8 | 76 | Global SCSS — `::ng-deep` hygiene (`apps/web/src/app/**/*.scss`) | Done | `rg '::ng-deep' apps/web/src/app --glob '*.scss'` → **0** matches (matching file count **0**) |
| 8 | 76 | Global SCSS — `styles` initial-chunk monitoring | Open | `docs/migration/phase-8-global-scss-elimination.md` §**Open (remaining weight)** — `ng build` scrape runbook + logged row |
| 8 | 76 | Global SCSS — dead-selector hygiene (esp. map-shell on touch) | Open | Same §**Open** — **Ongoing** dead-selector `rg` when touching map SCSS |
| 8 | 76 | Global SCSS — Phase 10 DoD: “global SCSS risk” sign-off | Open | `docs/migration/phase-8-global-scss-elimination.md` §**Definition of done** — `[ ]` Phase 10 checklist line |
| 9 | 0 | Spartan package upgrade | Blocked (upstream) | `docs/migration/phase-9-spartan-upgrade.md` — **blocked** until `@spartan-ng` Tailwind v4–compatible helm peers |
| 10 | 18 | Visual QA — automated smoke / gap documentation | Done | `docs/migration/reports/phase-10-migration-smoke-gates-2026-05-18.md`; `docs/migration/phase-10-visual-qa.md` **Status** |
| 10 | 18 | Visual QA — browser manual matrix + tight smoke | Open | `docs/migration/reports/phase-10-manual-visual-matrix-gap-2026-05-18.md`; phase-10 **do not** Pass from CI alone |
| 11 | 100 | Specification sync — Wave P1 | Done | `docs/migration/phase-11-spec-sync.md` — **Wave P1 — closed (2026-05-18)** |

**Styles partial count (evidence):** seven `*.scss` files under `apps/web/src/styles/` — `_map-shell-keyframes.scss`, `map-leaflet-host.scss`, `reset.scss`, `layout/app.scss`, `layout/clamp.scss`, `_map-shell-leaflet-global.scss`, `_typography-baseline.scss` (no `_legacy-design-tokens.scss`).

## Next three moves

1. **Run Phase 7 §Risks three-path theme QA** when a human has a browser block — canonical anchor: [`docs/migration/phase-7-token-migration.md` § Risks / QA](../phase-7-token-migration.md#risks--qa).
2. **Phase 8 tail** — `styles` row monitoring + dead-selector hygiene on touched map-shell SCSS; unblock Phase 8 DoD’s Phase 10 hook when ready — canonical anchor: [`docs/migration/phase-8-global-scss-elimination.md` § Open (remaining weight)](../phase-8-global-scss-elimination.md#open-remaining-weight).
3. **Phase 10 interactive pass** — tight smoke + screen matrix (not satisfied by smoke docs alone) — canonical anchor: [`docs/migration/phase-10-visual-qa.md` § Screen checklist](../phase-10-visual-qa.md#screen-checklist) (browser Pass required per acceptance).

*(Fourth in queue, not in the three moves: **P5** — Phase 1 Wave P5 inventory audit only — [`docs/migration/README.md` § Next wave](../README.md#next-wave-post-recovery-queue--2026-05-18).)*
