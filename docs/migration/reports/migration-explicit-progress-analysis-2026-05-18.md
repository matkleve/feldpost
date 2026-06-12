# Migration explicit progress analysis (2026-05-18; % re-audit **2026-05-27**)

## Executive truth

The heavy **code** migration tracks (template BEM, legacy token bridge, Phase 7 token unification, `::ng-deep` in app SCSS, Phase 11 spec drift checklist) are largely **shipped** or **closed** with grep/build-level proof in phase docs. What remains is disproportionately **human-in-the-loop** and **policy**: **Phase 10** interactive visual matrix, `styles` bundle monitoring, dead-selector hygiene on touch, product decisions on brand primary, and a **Wave P5** spec inventory audit. README **%** rows are **doc-derived rollups** (ambiguous ⇒ round down). **Phase 7 → 100% (2026-05-19)** per [phase-7 § Closure verification](../phase-7-token-migration.md#closure-verification-2026-05-19). Phase **9** is **blocked upstream** (Spartan helm + Tailwind v4 peers), not “forgotten work.”

## README % vs reality

- **Rule (from migration index):** Integers come from each phase doc’s **Status**, checklists, acceptance rows, and called-out blockers; **ambiguous ⇒ round down** (`docs/migration/README.md` — **% (progress)** paragraph).
- **Not effort-weighted:** A day of careful manual QA or a product workshop does **not** automatically change **%**; only **documented** checklist/state updates in the owning phase file do. Conversely, **hours** of token batch work can **stop moving** the headline **%** once the bridge is gone and remaining work is **parity on edit** (Phase 7) or **browser matrix** (Phase 10); Phase 7 §Risks theme QA is **closed (2026-05-19)** — schedule risk is Phase **10**, not unknown token debt.

## Per-phase explicit matrix

| Phase | README % | Track A (name from phase doc) | Status | Evidence |
|-------|----------|-------------------------------|--------|----------|
| 0 | 100 | Discovery & Planning | Done | `docs/migration/phase-0-discovery.md` — **Status:** Done |
| 1 | 30 | Spec Cleanup — umbrella / brand-primary | Blocked (product) | `docs/migration/phase-1-spec-cleanup.md` — **5/7** rows closed; umbrella + brand-primary open |
| 1 | 30 | Spec Cleanup — Wave P5 primitive-contract inventory | Done | Wave P5 + tab spec sync **closed 2026-05-19** per `phase-1-spec-cleanup.md` |
| 2 | 100 | Installation & Foundation | Done | `docs/migration/phase-2-foundation.md` — **Status:** Done |
| 3 | 92 | Component Migration (planned scope) | Done | `docs/migration/phase-3-components.md` — **Status:** Done; README row notes deferred SCSS/barrel items elsewhere |
| 4 | 88 | Cleanup & Build Verification | Done | `docs/migration/phase-4-cleanup.md` — **Status:** Done; deferred folder rows explicitly **deferred** |
| 5 | 93 | Callsite Migration & Legacy Removal | Done (code) | Groups **A–G + D** + `tailwind.config.js` alias cleanup **2026-05-19**; Phase **5** visual QA → Phase **10** |
| 6 | 100 | Template BEM sweep & toggles | Done | `docs/migration/phase-6-template-cleanup.md` — **Done (2026-05-17)** |
| 7 | 100 | Token system — phase closure | Done | `docs/migration/phase-7-token-migration.md` — **Status: Done (2026-05-19)** + §**Closure verification** |
| 7 | 100 | Token system — legacy bridge retired | Done | `rg 'legacy-design-tokens\|_legacy-design-tokens' apps/web` → **no matches** (exit **1** = zero hits) |
| 7 | 100 | Token system — Wave P2 (doc + automated gate table) | Done | §**Wave P2 closeout** + §**Closure verification (2026-05-19)** |
| 7 | 100 | Token system — §Risks / four-path manual theme QA | Done | §**Risks / QA** — **Browser sign-off (2026-05-19)** |
| 7 | 100 | Token system — edit-time spec / `tokens.md` parity | Deferred (Phase 11) | §**Remaining work (post-closure)** — hygiene on edit, not Phase 7 blocker |
| 8 | 95 | Global SCSS — §7 `styles/` tree inventory | Done | `phase-8` §7 + § **Closure verification (2026-05-27)** |
| 8 | 95 | Global SCSS — `::ng-deep` hygiene (`apps/web/src/app/**/*.scss`) | Done | `rg '::ng-deep' apps/web/src/app --glob '*.scss'` → **0** |
| 8 | 95 | Global SCSS — `styles` initial-chunk monitoring | Done (logged) | **`95.70 kB`** raw logged **2026-05-27** — ongoing monitor, not a blocker |
| 8 | 95 | Global SCSS — dead-selector hygiene (esp. map-shell on touch) | Spot-check OK | **2026-05-27** major leaflet classes have TS producers — touch on edit |
| 8 | 95 | Global SCSS — Phase 10 DoD: “global SCSS risk” sign-off | Open | Human Phase **10** checkbox only |
| 9 | 0 | Spartan package upgrade | Blocked (upstream) | `docs/migration/phase-9-spartan-upgrade.md` — **blocked** until `@spartan-ng` Tailwind v4–compatible helm peers |
| 10 | 25 | Visual QA — automated smoke / gap documentation | Done | Smoke report **2026-05-18**; gates re-pass **2026-05-27** |
| 10 | 25 | Visual QA — browser manual matrix + tight smoke | Open | **58** findings **2026-05-19**; phase doc **~25%**; three-theme matrix open |
| 11 | 100 | Specification sync — Wave P1 | Done | `docs/migration/phase-11-spec-sync.md` — **Wave P1 — closed (2026-05-18)** |

**Styles partial count (evidence):** seven `*.scss` files under `apps/web/src/styles/` — `_map-shell-keyframes.scss`, `map-leaflet-host.scss`, `reset.scss`, `layout/app.scss`, `layout/clamp.scss`, `_map-shell-leaflet-global.scss`, `_typography-baseline.scss` (no `_legacy-design-tokens.scss`).

## Next three moves

1. **Phase 10 interactive pass** — three-theme screen matrix + triage **58** logged findings — [`phase-10-visual-qa.md` § Screen checklist](../phase-10-visual-qa.md#screen-checklist).
2. **Phase 8 DoD tail** — Phase **10** human “global SCSS risk” sign-off (code **95%** — [`phase-8` § Closure verification](../phase-8-global-scss-elimination.md#closure-verification-2026-05-27)).
3. **Phase 1 product** — brand-primary decision (umbrella close) — [`phase-1-spec-cleanup.md`](../phase-1-spec-cleanup.md).
4. **Phase 11 spec hygiene on edit** — `tokens.md` parity when touching specs — Phase **7** § **Remaining work (post-closure)**.
